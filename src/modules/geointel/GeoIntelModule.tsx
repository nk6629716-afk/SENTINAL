import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GeoIntelObservation,
} from '@shared/types';
import {
  Compass,
  Layers,
  Sliders,
  FileDown,
  Play,
  Eye,
  MapPin,
  Satellite,
  Shield,
  Activity,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api/apiClient';
import {
  ComparisonViewMode,
  EnrichedChangeCandidate,
  CandidateReviewDecision,
  SensorMetadata,
  AnalysisState,
  IntelligenceReportPayload,
} from './types';
import { convertToMGRS, formatTacticalTimestamp } from './utils/geoUtils';
import { SurveillanceCanvas } from './components/SurveillanceCanvas';
import { RunAnalysisBar } from './components/RunAnalysisBar';
import { CandidateInspector } from './components/CandidateInspector';
import { IntelligenceReportModal } from './components/IntelligenceReportModal';

interface GeoIntelModuleProps {
  observations: GeoIntelObservation[];
  onRefreshObservations: () => Promise<void>;
}

export const GeoIntelModule: React.FC<GeoIntelModuleProps> = ({
  observations,
  onRefreshObservations,
}) => {
  const [selectedObsIdx, setSelectedObsIdx] = useState(0);
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('swipe');
  const [showOverlays, setShowOverlays] = useState(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [overallAnalystNotes, setOverallAnalystNotes] = useState(
    'Multi-temporal satellite reconnaissance completed for Sector Alpha. Candidate structural excavations and vehicle concentrations verified against SAR radar ground-truth.'
  );

  // Analysis Engine Parameters & State
  const [sensitivity, setSensitivity] = useState(65);
  const [kernelSize, setKernelSize] = useState('5x5');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    status: 'idle',
    progressPct: 0,
    currentStage: 'RADAR & CONVOLUTION ENGINE READY',
  });

  // Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const activeObs = observations[selectedObsIdx] || observations[0];
  const analysisTimerRef = useRef<any>(null);

  // High-fidelity Sensor Metadata for Baseline & Surveillance Passes
  const baselineSensor: SensorMetadata = useMemo(
    () => ({
      sensorId: activeObs?.beforeImageId || 'MSI-B02',
      platform: 'SENTINEL-2B OPTICAL',
      resolutionGsd: '0.3m',
      cloudCoverPct: 1.8,
      sunElevationDeg: 48.2,
      sunAzimuthDeg: 134.2,
      spectralBands: ['B02-Blue', 'B03-Green', 'B04-Red', 'B08-NIR'],
      captureTimestamp: activeObs?.captureDateBefore || '2026-10-18T08:00:00Z',
    }),
    [activeObs?.id, activeObs?.captureDateBefore]
  );

  const surveillanceSensor: SensorMetadata = useMemo(
    () => ({
      sensorId: activeObs?.afterImageId || 'WV3-SWIR',
      platform: 'WORLDVIEW-3 TACTICAL',
      resolutionGsd: '0.3m',
      cloudCoverPct: 0.9,
      sunElevationDeg: 51.6,
      sunAzimuthDeg: 142.6,
      spectralBands: ['Panchromatic', 'VNIR', 'SWIR-1'],
      captureTimestamp: activeObs?.captureDateAfter || '2026-10-25T07:45:00Z',
    }),
    [activeObs?.id, activeObs?.captureDateAfter]
  );

  // Hydrate & Maintain Enriched Candidates State
  const [enrichedCandidates, setEnrichedCandidates] = useState<EnrichedChangeCandidate[]>([]);

  useEffect(() => {
    if (!activeObs) return;

    const baseLat = activeObs.coordinates?.lat || 34.058;
    const baseLng = activeObs.coordinates?.lng || -118.252;

    const hydrated: EnrichedChangeCandidate[] = (activeObs.candidates || []).map((c, index) => {
      // Calculate realistic localized geodetic coordinate offset for each bounding box
      const latOffset = ((50 - c.boundingBox.y) / 100) * 0.012;
      const lngOffset = ((c.boundingBox.x - 50) / 100) * 0.016;
      const lat = Number((baseLat + latOffset).toFixed(5));
      const lng = Number((baseLng + lngOffset).toFixed(5));
      const mgrs = convertToMGRS(lat, lng);

      // Map initial decision state from backend
      let decision: CandidateReviewDecision = 'unreviewed';
      if (c.reviewed) {
        decision = 'confirmed_threat';
      }

      return {
        ...c,
        decision,
        latLng: { lat, lng },
        mgrsCoordinate: mgrs,
        detectedAt: activeObs.createdAt || new Date().toISOString(),
        auditTrail: [
          {
            timestamp: activeObs.createdAt || new Date().toISOString(),
            analyst: 'Automated Neural Pipeline (YOLOv8-GEO)',
            action: 'INITIAL_CANDIDATE_DETECTION',
            notes: `Candidate identified with ${(c.confidence * 100).toFixed(1)}% confidence`,
          },
        ],
      };
    });

    setEnrichedCandidates(hydrated);
    if (hydrated.length > 0 && !selectedCandidateId) {
      setSelectedCandidateId(hydrated[0].id);
    }
  }, [activeObs?.id, activeObs?.candidates]);

  // Handle Multi-Stage AI Change Detection
  const handleStartAnalysis = () => {
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);

    setAnalysisState({
      status: 'processing',
      progressPct: 0,
      currentStage: 'Aligning SAR Orthorectified & Optical Bands...',
    });

    const startTime = Date.now();
    let currentPct = 0;

    analysisTimerRef.current = setInterval(() => {
      currentPct += 5;

      let stage = 'Aligning SAR Orthorectified & Optical Bands...';
      if (currentPct >= 25 && currentPct < 55) {
        stage = 'Computing Radiometric Convolutional Difference Matrix...';
      } else if (currentPct >= 55 && currentPct < 85) {
        stage = 'Clustering Connected Candidate Anomalies (BFS Kernel)...';
      } else if (currentPct >= 85) {
        stage = 'Synthesizing MGRS Geolocation & Confidence Scores...';
      }

      if (currentPct >= 100) {
        clearInterval(analysisTimerRef.current);
        const executionTimeMs = Date.now() - startTime;

        setAnalysisState({
          status: 'completed',
          progressPct: 100,
          currentStage: 'Analysis Pipeline Complete',
          executionTimeMs,
          candidatesDetected: enrichedCandidates.length,
        });

        setStatusNotification(`AI Change Detection Complete: ${enrichedCandidates.length} candidate anomalies indexed in ${executionTimeMs}ms.`);
        setTimeout(() => setStatusNotification(null), 5000);
      } else {
        setAnalysisState({
          status: 'processing',
          progressPct: currentPct,
          currentStage: stage,
        });
      }
    }, 90);
  };

  const handleCancelAnalysis = () => {
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    setAnalysisState({
      status: 'cancelled',
      progressPct: 0,
      currentStage: 'Analysis Cancelled by User',
    });
  };

  // Handle Candidate Triage Decision Update
  const handleUpdateDecision = async (
    candidateId: string,
    decision: CandidateReviewDecision,
    notes: string
  ) => {
    const timestamp = new Date().toISOString();
    const analyst = 'Tactical Watch Officer 1';

    setEnrichedCandidates((prev) =>
      prev.map((c) => {
        if (c.id === candidateId) {
          const isConfirmed = decision === 'confirmed_threat';
          const isBenign = decision === 'benign_false_positive';

          return {
            ...c,
            decision,
            reviewed: isConfirmed || isBenign,
            analystNotes: notes,
            auditTrail: [
              ...c.auditTrail,
              {
                timestamp,
                analyst,
                action: `DECISION_${decision.toUpperCase()}`,
                notes: notes || undefined,
              },
            ],
          };
        }
        return c;
      })
    );

    // Persist via backend API
    try {
      const isReviewed = decision === 'confirmed_threat' || decision === 'benign_false_positive';
      await api.updateGeoCandidateReview(activeObs.id, candidateId, isReviewed, notes);
      await onRefreshObservations();
      setStatusNotification(`Candidate ${candidateId} updated: ${decision.replace('_', ' ').toUpperCase()}`);
      setTimeout(() => setStatusNotification(null), 3000);
    } catch (err) {
      console.error('Failed to sync review decision with backend:', err);
    }
  };

  // Build Truth-Based Intelligence Report Payload
  const reportPayload: IntelligenceReportPayload = useMemo(() => {
    const confirmedCount = enrichedCandidates.filter((c) => c.decision === 'confirmed_threat').length;
    const benignCount = enrichedCandidates.filter((c) => c.decision === 'benign_false_positive').length;
    const secondaryCount = enrichedCandidates.filter((c) => c.decision === 'secondary_pass_required').length;
    const unreviewedCount = enrichedCandidates.filter((c) => c.decision === 'unreviewed').length;

    const lat = activeObs?.coordinates?.lat || 34.058;
    const lng = activeObs?.coordinates?.lng || -118.252;

    return {
      reportId: `GEOINT-DEBRIEF-${activeObs?.id || '2026'}-${Date.now().toString().slice(-4)}`,
      classification: 'UNCLASSIFIED // EXERCISE SENTINEL // REL TO NATO',
      generatedAt: new Date().toISOString(),
      analystCallsign: 'Watch Officer Alpha-6 (C4ISR Division)',
      targetZone: activeObs?.zoneName || 'Sector Alpha Logistics Hub',
      aoiBoundingBox: {
        northLat: lat + 0.015,
        southLat: lat - 0.015,
        eastLng: lng + 0.02,
        westLng: lng - 0.02,
      },
      observation: {
        id: activeObs?.id || 'GEO-OBS-01',
        title: activeObs?.title || 'Sector Logistics Hub Surveillance',
        baselineCaptureDate: baselineSensor.captureTimestamp,
        surveillanceCaptureDate: surveillanceSensor.captureTimestamp,
        baselineSensor,
        surveillanceSensor,
      },
      analysisConfiguration: {
        sensitivityThreshold: sensitivity,
        kernelSize,
        noiseSuppression,
      },
      summaryStats: {
        totalCandidates: enrichedCandidates.length,
        confirmedThreats: confirmedCount,
        benignFalsePositives: benignCount,
        secondaryPassRequired: secondaryCount,
        unreviewed: unreviewedCount,
      },
      candidates: enrichedCandidates.map((c) => ({
        id: c.id,
        label: c.label,
        type: c.anomalyType,
        confidencePct: c.confidence * 100,
        diffScorePct: c.differenceScore * 100,
        mgrs: c.mgrsCoordinate,
        latLng: c.latLng,
        decision: c.decision,
        analystNotes: c.analystNotes || '',
        explanation: c.explanation,
      })),
      overallAnalystAssessment: overallAnalystNotes,
      limitationDisclaimer:
        'DISCLAIMER: Multi-temporal radiometric pixel differences indicate potential alterations in ground morphology. Differences may stem from sun elevation angles (48.2° vs 51.6°), shadow shifts, or atmospheric attenuation. Candidate anomalies must be confirmed by authorized geospatial analysts before military deployment.',
    };
  }, [
    activeObs,
    enrichedCandidates,
    baselineSensor,
    surveillanceSensor,
    sensitivity,
    kernelSize,
    noiseSuppression,
    overallAnalystNotes,
  ]);

  return (
    <div
      style={{
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* 1. Tactical Header Banner */}
      <div
        style={{
          background: 'rgba(11, 15, 23, 0.95)',
          border: '1px solid rgba(0, 240, 255, 0.25)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'rgba(0, 240, 255, 0.12)',
              border: '1px solid #00F0FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00F0FF',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
            }}
          >
            <Compass size={24} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#F1F5F9', margin: 0, letterSpacing: '0.04em' }}>
                GEOINTEL RECONNAISSANCE & SURVEILLANCE HUB
              </h1>
              <span
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #EF4444',
                  color: '#F87171',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                }}
              >
                C4ISR SATELLITE DIFF
              </span>
              <span
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid #F59E0B',
                  color: '#FBBF24',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                }}
              >
                SYNTHETIC SENSORS
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
              High-resolution multi-temporal satellite comparison, AI change candidate extraction, MGRS geolocations, and truth-based intelligence debriefing.
            </p>
          </div>
        </div>

        {/* Observation Selector & Report Export Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {observations.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>TARGET AOI:</span>
              <select
                value={selectedObsIdx}
                onChange={(e) => setSelectedObsIdx(Number(e.target.value))}
                style={{
                  background: '#111827',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#F1F5F9',
                  padding: '6px 10px',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {observations.map((obs, idx) => (
                  <option key={obs.id} value={idx}>
                    {obs.zoneName || obs.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setIsReportModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: '1px solid #34D399',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            <FileDown size={15} />
            <span>EXPORT INTELLIGENCE REPORT</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {statusNotification && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10B981',
            color: '#34D399',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <CheckCircle size={16} />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* 2. Action & Sensitivity Control Bar */}
      <RunAnalysisBar
        analysisState={analysisState}
        onStartAnalysis={handleStartAnalysis}
        onCancelAnalysis={handleCancelAnalysis}
        sensitivity={sensitivity}
        onSensitivityChange={setSensitivity}
        kernelSize={kernelSize}
        onKernelSizeChange={setKernelSize}
        noiseSuppression={noiseSuppression}
        onToggleNoiseSuppression={() => setNoiseSuppression(!noiseSuppression)}
        candidateCount={enrichedCandidates.length}
      />

      {/* 3. Main Geospatial Intelligence Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.9fr) minmax(360px, 1.1fr)',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Surveillance Comparison Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SurveillanceCanvas
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            beforeImageUrl={activeObs?.beforeImageUrl}
            afterImageUrl={activeObs?.afterImageUrl}
            baselineSensor={baselineSensor}
            surveillanceSensor={surveillanceSensor}
            candidates={enrichedCandidates}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={setSelectedCandidateId}
            targetZoneName={activeObs?.zoneName || 'Sector Alpha Logistics'}
            centerCoordinates={activeObs?.coordinates || { lat: 34.058, lng: -118.252 }}
            showOverlays={showOverlays}
            onToggleOverlays={() => setShowOverlays(!showOverlays)}
          />

          {/* Environmental Conditions & Sensor Geometry Drawer */}
          <div
            style={{
              background: 'rgba(11, 15, 23, 0.88)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '12px 18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div>
              <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>SUN ELEVATION / AZIMUTH</span>
              <span style={{ color: '#F1F5F9', fontWeight: 700 }}>48.2° / 134.2° AZ</span>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>GROUND RESOLUTION (GSD)</span>
              <span style={{ color: '#00F0FF', fontWeight: 700 }}>0.30 METERS / PX</span>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>SPECTRAL CO-REGISTRATION</span>
              <span style={{ color: '#10B981', fontWeight: 700 }}>SUB-PIXEL RMSE (0.12)</span>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>ATMOSPHERIC ATTENUATION</span>
              <span style={{ color: '#F59E0B', fontWeight: 700 }}>LOW SCATTER (AOD 0.08)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Candidate Inspector & Review Controls */}
        <div>
          <CandidateInspector
            candidates={enrichedCandidates}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={setSelectedCandidateId}
            onUpdateDecision={handleUpdateDecision}
            overallAnalystNotes={overallAnalystNotes}
            onUpdateOverallNotes={setOverallAnalystNotes}
          />
        </div>
      </div>

      {/* 4. Intelligence Report Export Modal */}
      <IntelligenceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportPayload={reportPayload}
      />
    </div>
  );
};
