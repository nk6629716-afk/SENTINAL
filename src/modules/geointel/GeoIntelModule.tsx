import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GeoIntelObservation,
} from '@shared/types';
import {
  Play,
  Pause,
  Layers,
  Sliders,
  FileDown,
  Eye,
  MapPin,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../services/api/apiClient';
import {
  EnrichedChangeCandidate,
  CandidateReviewDecision,
  SensorMetadata,
  AnalysisState,
  IntelligenceReportPayload,
} from './types';
import { convertToMGRS } from './utils/geoUtils';
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
  const [viewMode, setViewMode] = useState<'swipe' | 'side-by-side'>('swipe');
  const [swipePos, setSwipePos] = useState(50); // percentage 0 - 100
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>('C1');
  const [isDraggingSwipe, setIsDraggingSwipe] = useState(false);

  // Analysis parameters
  const [sensitivity, setSensitivity] = useState(34);
  const [minArea, setMinArea] = useState(12);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Replay bar state
  const [isPlaying, setIsPlaying] = useState(true);
  const [replaySpeed, setReplaySpeed] = useState<'1x' | '2x' | '5x'>('1x');

  const activeObs = observations[selectedObsIdx] || observations[0];
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  // Sensor Metadata
  const baselineSensor: SensorMetadata = useMemo(
    () => ({
      sensorId: activeObs?.beforeImageId || 'MSI-B02',
      platform: 'SENTINEL-2B OPTICAL',
      resolutionGsd: '0.3m',
      cloudCoverPct: 1.8,
      sunElevationDeg: 48.2,
      sunAzimuthDeg: 134.2,
      spectralBands: ['B02-Blue', 'B03-Green', 'B04-Red', 'B08-NIR'],
      captureTimestamp: activeObs?.captureDateBefore || '2026-10-06T08:00:00Z',
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
      captureTimestamp: activeObs?.captureDateAfter || '2026-10-24T07:45:00Z',
    }),
    [activeObs?.id, activeObs?.captureDateAfter]
  );

  // Candidates state
  const [enrichedCandidates, setEnrichedCandidates] = useState<EnrichedChangeCandidate[]>([]);

  useEffect(() => {
    if (!activeObs) return;

    const baseLat = activeObs.coordinates?.lat || 34.0588;
    const baseLng = activeObs.coordinates?.lng || -118.2391;

    // Default mock positions matching image 04 if fewer than 4 candidates
    const defaultData = [
      { id: 'C1', label: 'New road', diff: 0.86, conf: 0.86, lat: 34.0588, lng: -118.2391, status: 'unreviewed' },
      { id: 'C2', label: 'Cleared area', diff: 0.74, conf: 0.79, lat: 34.0631, lng: -118.2402, status: 'unreviewed' },
      { id: 'C3', label: 'Vehicles moved', diff: 0.58, conf: 0.66, lat: 34.0610, lng: -118.2377, status: 'confirmed_threat' },
      { id: 'C4', label: 'Structure', diff: 0.41, conf: 0.48, lat: 34.0574, lng: -118.2415, status: 'benign_false_positive' },
    ];

    const rawCandidates = activeObs.candidates && activeObs.candidates.length > 0 ? activeObs.candidates : [];

    const hydrated: EnrichedChangeCandidate[] = defaultData.map((d, index) => {
      const match = rawCandidates[index];
      const lat = match ? Number((baseLat + ((50 - match.boundingBox.y) / 100) * 0.012).toFixed(5)) : d.lat;
      const lng = match ? Number((baseLng + ((match.boundingBox.x - 50) / 100) * 0.016).toFixed(5)) : d.lng;
      const mgrs = convertToMGRS(lat, lng);

      let decision: CandidateReviewDecision = (d.status as CandidateReviewDecision) || 'unreviewed';
      if (match) {
        decision = match.reviewed ? 'confirmed_threat' : 'unreviewed';
      }

      return {
        id: match ? match.id : d.id,
        label: match ? match.label : d.label,
        anomalyType: match ? match.anomalyType : (d.label.toLowerCase().includes('road') ? 'terrain_disturbance' : 'structure_alteration'),
        differenceScore: match ? match.differenceScore : d.diff,
        confidence: match ? match.confidence : d.conf,
        boundingBox: match ? match.boundingBox : { x: 40 + index * 10, y: 35 + index * 10, width: 20, height: 15 },
        reviewed: decision === 'confirmed_threat' || decision === 'benign_false_positive',
        decision,
        explanation: match ? match.explanation : `Detected alteration in surface morphology with high spectral divergence.`,
        latLng: { lat, lng },
        mgrsCoordinate: mgrs,
        detectedAt: activeObs.createdAt || '2026-10-24T14:30:00Z',
        auditTrail: [
          {
            timestamp: activeObs.createdAt || '2026-10-24T14:30:00Z',
            analyst: 'Automated Neural Pipeline (YOLOv8-GEO)',
            action: 'INITIAL_CANDIDATE_DETECTION',
            notes: `Candidate identified with ${((match?.confidence || d.conf) * 100).toFixed(1)}% confidence`,
          },
        ],
      };
    });

    setEnrichedCandidates(hydrated);
    if (hydrated.length > 0 && !selectedCandidateId) {
      setSelectedCandidateId(hydrated[0].id);
    }
  }, [activeObs?.id, activeObs?.candidates]);

  // Handle Swipe Dragging
  const handleMouseDown = () => setIsDraggingSwipe(true);
  const handleMouseUp = () => setIsDraggingSwipe(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSwipe || !swipeContainerRef.current) return;
    const rect = swipeContainerRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(rect.width - 5, e.clientX - rect.left));
    setSwipePos(Math.round((x / rect.width) * 100));
  };

  // Run change detection
  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          setStatusNotification(`Change detection analysis finished for pair (${enrichedCandidates.length} regions evaluated).`);
          setTimeout(() => setStatusNotification(null), 4000);
          return 100;
        }
        return prev + 20;
      });
    }, 120);
  };

  // Candidate Decision
  const handleUpdateDecision = async (candidateId: string, decision: CandidateReviewDecision) => {
    const timestamp = new Date().toISOString();
    const analyst = 'Watch Officer 1';

    setEnrichedCandidates((prev) =>
      prev.map((c) => {
        if (c.id === candidateId) {
          return {
            ...c,
            decision,
            reviewed: decision === 'confirmed_threat' || decision === 'benign_false_positive',
            auditTrail: [
              ...c.auditTrail,
              {
                timestamp,
                analyst,
                action: `DECISION_${decision.toUpperCase()}`,
              },
            ],
          };
        }
        return c;
      })
    );

    try {
      const isReviewed = decision === 'confirmed_threat' || decision === 'benign_false_positive';
      await api.updateGeoCandidateReview(activeObs.id, candidateId, isReviewed);
      await onRefreshObservations();
      setStatusNotification(`Candidate ${candidateId} marked as ${decision === 'confirmed_threat' ? 'Accepted' : 'Rejected'}.`);
      setTimeout(() => setStatusNotification(null), 3000);
    } catch (err) {
      console.error('Failed to update candidate review:', err);
    }
  };

  // Report payload
  const reportPayload: IntelligenceReportPayload = useMemo(() => {
    const confirmedCount = enrichedCandidates.filter((c) => c.decision === 'confirmed_threat').length;
    const benignCount = enrichedCandidates.filter((c) => c.decision === 'benign_false_positive').length;
    const secondaryCount = enrichedCandidates.filter((c) => c.decision === 'secondary_pass_required').length;
    const unreviewedCount = enrichedCandidates.filter((c) => c.decision === 'unreviewed').length;

    const lat = activeObs?.coordinates?.lat || 34.0588;
    const lng = activeObs?.coordinates?.lng || -118.2391;

    return {
      reportId: `IR-2026-014`,
      classification: 'UNCLASSIFIED // EXERCISE SENTINEL // REL TO NATO',
      generatedAt: new Date().toISOString(),
      analystCallsign: 'Watch Officer Alpha-6 (C4ISR Division)',
      targetZone: activeObs?.zoneName || 'Sector 34 Logistics Hub',
      aoiBoundingBox: {
        northLat: lat + 0.015,
        southLat: lat - 0.015,
        eastLng: lng + 0.02,
        westLng: lng - 0.02,
      },
      observation: {
        id: activeObs?.id || 'GEO-OBS-01',
        title: activeObs?.title || 'Sector 34 Surveillance',
        baselineCaptureDate: baselineSensor.captureTimestamp,
        surveillanceCaptureDate: surveillanceSensor.captureTimestamp,
        baselineSensor,
        surveillanceSensor,
      },
      analysisConfiguration: {
        sensitivityThreshold: sensitivity,
        kernelSize: '5x5',
        noiseSuppression: true,
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
      overallAnalystAssessment: 'Verified against satellite optical baseline. No critical civil infrastructure breaches detected.',
      limitationDisclaimer: 'DISCLAIMER: Multi-temporal radiometric pixel differences indicate potential alterations in ground morphology.',
    };
  }, [activeObs, enrichedCandidates, baselineSensor, surveillanceSensor, sensitivity]);

  const confirmedCount = enrichedCandidates.filter((c) => c.decision === 'confirmed_threat').length;
  const rejectedCount = enrichedCandidates.filter((c) => c.decision === 'benign_false_positive').length;
  const unreviewedCount = enrichedCandidates.filter((c) => c.decision === 'unreviewed').length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: 'var(--color-paper)',
      }}
    >
      {/* Toast Notification */}
      {statusNotification && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
            right: '24px',
            background: 'var(--color-sheet)',
            border: '1.2px solid var(--color-ok)',
            padding: '8px 14px',
            boxShadow: 'var(--shadow-hard)',
            zIndex: 1000,
            fontSize: '0.8rem',
            color: 'var(--color-ok)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={15} />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Main Grid: Left Column (Imagery & Map) and Right Column (Controls & Review) */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(380px, 1fr)',
          gap: '16px',
          padding: '16px',
          overflowY: 'auto',
        }}
      >
        {/* Left Column: Stacked Panels per Spec 04 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Top Panel: Imagery Comparison */}
          <div
            className="panel"
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--color-sheet)',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                  Imagery comparison
                </span>
                <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                  Sector 34, pair 3 of 5
                </span>
              </div>

              {/* Segmented control: Swipe / Side by side */}
              <div
                style={{
                  display: 'flex',
                  border: '1.2px solid var(--color-edge)',
                  background: 'var(--color-paper)',
                }}
              >
                <button
                  onClick={() => setViewMode('swipe')}
                  style={{
                    padding: '4px 14px',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'swipe' ? 'var(--color-strip)' : 'transparent',
                    color: viewMode === 'swipe' ? '#FFFFFF' : 'var(--color-ink)',
                  }}
                >
                  Swipe
                </button>
                <button
                  onClick={() => setViewMode('side-by-side')}
                  style={{
                    padding: '4px 14px',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    border: 'none',
                    borderLeft: '1.2px solid var(--color-edge)',
                    cursor: 'pointer',
                    background: viewMode === 'side-by-side' ? 'var(--color-strip)' : 'transparent',
                    color: viewMode === 'side-by-side' ? '#FFFFFF' : 'var(--color-ink)',
                  }}
                >
                  Side by side
                </button>
              </div>
            </div>

            {/* Interactive Image Canvas Area */}
            <div
              ref={swipeContainerRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseMove={handleMouseMove}
              style={{
                position: 'relative',
                height: '340px',
                width: '100%',
                background: 'var(--color-map)',
                border: '1.2px solid var(--color-line)',
                overflow: 'hidden',
                cursor: viewMode === 'swipe' ? 'ew-resize' : 'default',
                userSelect: 'none',
              }}
            >
              {/* Badges */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'var(--color-strip)',
                  color: '#FFFFFF',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  zIndex: 20,
                  boxShadow: 'var(--shadow-hard)',
                }}
              >
                Before, 06 Oct
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'var(--color-accent)',
                  color: '#FFFFFF',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  zIndex: 20,
                  boxShadow: 'var(--shadow-hard)',
                }}
              >
                After, 24 Oct
              </div>

              {/* Base SVG Map Texture & Terrain */}
              <svg width="100%" height="100%" viewBox="0 0 700 340" style={{ position: 'absolute', inset: 0 }}>
                {/* Tactical Grid Lines */}
                {[70, 140, 210, 280].map((y, i) => (
                  <line key={`h-${i}`} x1="0" y1={y} x2="700" y2={y} stroke="var(--color-grid)" strokeWidth="0.8" strokeDasharray="3 3" opacity={0.5} />
                ))}
                {[140, 280, 420, 560].map((x, i) => (
                  <line key={`v-${i}`} x1={x} y1="0" x2={x} y2="340" stroke="var(--color-grid)" strokeWidth="0.8" strokeDasharray="3 3" opacity={0.5} />
                ))}

                {/* River */}
                <path
                  d="M 0,260 Q 200,240 380,260 T 700,230"
                  fill="none"
                  stroke="var(--color-water)"
                  strokeWidth="24"
                />

                {/* Topographic Contours */}
                <path d="M 120,120 Q 180,80 240,110 T 320,150 Q 280,200 200,190 Z" fill="none" stroke="var(--color-contour)" strokeWidth="1.2" opacity={0.7} />
                <path d="M 140,125 Q 180,95 230,120 T 300,150 Q 260,185 200,180 Z" fill="none" stroke="var(--color-contour)" strokeWidth="1" opacity={0.8} />

                {/* Second Hill Contours */}
                <path d="M 280,110 Q 360,70 420,100 T 500,140 Q 460,190 380,180 Z" fill="none" stroke="var(--color-contour)" strokeWidth="1.2" opacity={0.7} />

                {/* Foliage / Forest Patches */}
                <ellipse cx="160" cy="240" rx="40" ry="25" fill="var(--color-forest)" opacity={0.5} />
                <ellipse cx="460" cy="250" rx="50" ry="30" fill="var(--color-forest)" opacity={0.5} />
              </svg>

              {/* Bounding Boxes with Labels (Amber dashed boxes per 04-geointel-day.png) */}
              <svg width="100%" height="100%" viewBox="0 0 700 340" style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                {/* Candidate C2: Cleared area */}
                <g
                  onClick={() => setSelectedCandidateId('C2')}
                  style={{ cursor: 'pointer' }}
                >
                  <polygon
                    points="320,60 420,50 460,110 440,150 340,155 310,110"
                    fill="rgba(232, 89, 12, 0.12)"
                    stroke="var(--color-accent)"
                    strokeWidth="1.6"
                    strokeDasharray="4 3"
                  />
                  {/* Tag label */}
                  <rect x="330" y="32" width="125" height="18" fill="var(--color-accent)" />
                  <text x="392" y="44" fill="#FFFFFF" fontSize="10.5" fontFamily="var(--font-heading)" fontWeight="800" textAnchor="middle">
                    C2 cleared area, 0.74
                  </text>
                </g>

                {/* Candidate C3: Vehicles */}
                <g
                  onClick={() => setSelectedCandidateId('C3')}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x="420"
                    y="160"
                    width="60"
                    height="35"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="1.6"
                    strokeDasharray="4 3"
                  />
                  {/* Small dots representing vehicles */}
                  <rect x="432" y="168" width="5" height="5" fill="var(--color-ink)" />
                  <rect x="444" y="168" width="5" height="5" fill="var(--color-ink)" />
                  <rect x="438" y="178" width="5" height="5" fill="var(--color-ink)" />

                  <rect x="490" y="162" width="105" height="18" fill="var(--color-accent)" />
                  <text x="542" y="174" fill="#FFFFFF" fontSize="10.5" fontFamily="var(--font-heading)" fontWeight="800" textAnchor="middle">
                    C3 vehicles, 0.58
                  </text>
                </g>

                {/* Candidate C1: New road */}
                <g
                  onClick={() => setSelectedCandidateId('C1')}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x="370"
                    y="210"
                    width="160"
                    height="90"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="1.6"
                    strokeDasharray="4 3"
                  />
                  {/* Road line inside C1 */}
                  <line x1="375" y1="290" x2="520" y2="220" stroke="#C2AE86" strokeWidth="6" strokeLinecap="round" opacity={0.8} />

                  <rect x="380" y="196" width="115" height="18" fill="var(--color-accent)" />
                  <text x="437" y="208" fill="#FFFFFF" fontSize="10.5" fontFamily="var(--font-heading)" fontWeight="800" textAnchor="middle">
                    C1 new road, 0.86
                  </text>
                </g>
              </svg>

              {/* Swipe Vertical Line & Center Handle */}
              {viewMode === 'swipe' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${swipePos}%`,
                    width: '2px',
                    background: 'var(--color-ink)',
                    zIndex: 30,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--color-sheet)',
                      border: '1.5px solid var(--color-ink)',
                      boxShadow: 'var(--shadow-hard)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--color-ink)',
                    }}
                  >
                    {'⟨ ⟩'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Panel: Observations on the map */}
          <div
            className="panel"
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--color-sheet)',
              minHeight: '260px',
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                Observations on the map
              </span>
            </div>

            {/* Tactical Canvas for observations */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                minHeight: '200px',
                background: 'var(--color-map)',
                border: '1.2px solid var(--color-line)',
                overflow: 'hidden',
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 700 220" style={{ position: 'absolute', inset: 0 }}>
                {/* Horizontal Grid */}
                {[44, 88, 132, 176].map((y, i) => (
                  <g key={`obs-h-${i}`}>
                    <line x1="0" y1={y} x2="700" y2={y} stroke="var(--color-grid)" strokeWidth="0.8" strokeDasharray="3 3" opacity={0.5} />
                    <text x="8" y={y + 12} fill="var(--color-grid)" fontSize="8.5" fontWeight="700">
                      {String.fromCharCode(65 + i)}
                    </text>
                  </g>
                ))}

                {/* Vertical Grid */}
                {[100, 200, 300, 400, 500, 600].map((x, i) => (
                  <g key={`obs-v-${i}`}>
                    <line x1={x} y1="0" x2={x} y2="220" stroke="var(--color-grid)" strokeWidth="0.8" strokeDasharray="3 3" opacity={0.5} />
                    <text x={x + 4} y="14" fill="var(--color-grid)" fontSize="8.5" fontWeight="700">
                      {31 + i}
                    </text>
                  </g>
                ))}

                {/* River */}
                <path
                  d="M 0,165 Q 180,150 360,170 T 700,155"
                  fill="none"
                  stroke="var(--color-water)"
                  strokeWidth="16"
                />

                {/* Contours */}
                <ellipse cx="230" cy="140" rx="45" ry="30" fill="none" stroke="var(--color-contour)" strokeWidth="1.2" opacity={0.7} />
                <ellipse cx="320" cy="140" rx="40" ry="25" fill="none" stroke="var(--color-contour)" strokeWidth="1.2" opacity={0.7} />
                <ellipse cx="330" cy="80" rx="30" ry="20" fill="var(--color-forest)" opacity={0.4} />

                {/* Numbered Marker 1: C1 new road */}
                <g
                  onClick={() => setSelectedCandidateId('C1')}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx="210" cy="145" r="11" fill="var(--color-accent)" />
                  <text x="210" y="149" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                    1
                  </text>
                  <rect x="228" y="137" width="76" height="17" fill="#FFFFFF" stroke="var(--color-ink)" strokeWidth="1.2" />
                  <text x="266" y="149" fill="var(--color-ink)" fontSize="9.5" fontWeight="800" textAnchor="middle">
                    C1 new road
                  </text>
                </g>

                {/* Numbered Marker 2: C2 cleared area */}
                <g
                  onClick={() => setSelectedCandidateId('C2')}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx="360" cy="160" r="11" fill="var(--color-accent)" />
                  <text x="360" y="164" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                    2
                  </text>
                  <rect x="378" y="152" width="94" height="17" fill="#FFFFFF" stroke="var(--color-ink)" strokeWidth="1.2" />
                  <text x="425" y="164" fill="var(--color-ink)" fontSize="9.5" fontWeight="800" textAnchor="middle">
                    C2 cleared area
                  </text>
                </g>

                {/* Numbered Marker 3: C3 vehicles */}
                <g
                  onClick={() => setSelectedCandidateId('C3')}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx="450" cy="110" r="11" fill="var(--color-accent)" />
                  <text x="450" y="114" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                    3
                  </text>
                  <rect x="468" y="102" width="76" height="17" fill="#FFFFFF" stroke="var(--color-ink)" strokeWidth="1.2" />
                  <text x="506" y="114" fill="var(--color-ink)" fontSize="9.5" fontWeight="800" textAnchor="middle">
                    C3 vehicles
                  </text>
                </g>

                {/* Numbered Marker 4: C4 structure */}
                <g
                  onClick={() => setSelectedCandidateId('C4')}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx="280" cy="190" r="11" fill="var(--color-accent)" />
                  <text x="280" y="194" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle">
                    4
                  </text>
                  <rect x="298" y="182" width="80" height="17" fill="#FFFFFF" stroke="var(--color-ink)" strokeWidth="1.2" />
                  <text x="338" y="194" fill="var(--color-ink)" fontSize="9.5" fontWeight="800" textAnchor="middle">
                    C4 structure
                  </text>
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: Controls, Candidates & Intelligence Report */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* Section 1: Change Detection Parameters */}
          <div
            className="panel"
            style={{
              padding: '16px',
              background: 'var(--color-sheet)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                Change detection
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-2)' }}>
                Pixel difference, then threshold, then grouped into regions.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Sensitivity Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '85px', fontSize: '0.8rem', color: 'var(--color-ink)', fontWeight: 600 }}>
                    Sensitivity
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--color-strip)', cursor: 'pointer' }}
                  />
                  <span style={{ width: '30px', fontSize: '0.82rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                    {sensitivity}
                  </span>
                </div>

                {/* Minimum Area Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '85px', fontSize: '0.8rem', color: 'var(--color-ink)', fontWeight: 600 }}>
                    Minimum area
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={minArea}
                    onChange={(e) => setMinArea(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--color-strip)', cursor: 'pointer' }}
                  />
                  <span style={{ width: '40px', fontSize: '0.82rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                    {minArea} px
                  </span>
                </div>
              </div>

              {/* Run on new pair Button */}
              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="btn btn-primary"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  height: '42px',
                }}
              >
                {isAnalyzing ? `Running ${analysisProgress}%` : 'Run on new pair'}
              </button>
            </div>
          </div>

          {/* Section 2: Change Candidates List */}
          <div
            className="panel"
            style={{
              padding: '16px',
              background: 'var(--color-sheet)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
              Change candidates {enrichedCandidates.length}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {enrichedCandidates.map((c, index) => {
                const isSelected = selectedCandidateId === c.id;
                const isAccepted = c.decision === 'confirmed_threat';
                const isRejected = c.decision === 'benign_false_positive';

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCandidateId(c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: isSelected ? 'var(--color-paper)' : 'transparent',
                      border: isSelected ? '1.2px solid var(--color-edge)' : '1.2px solid transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Badge C1/C2/C3/C4 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          background: 'var(--color-strip)',
                          color: '#FFFFFF',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {c.id}
                      </div>

                      {/* Candidate Name & Coordinates */}
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                          {c.label}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                          {c.latLng.lat.toFixed(4)} N, {Math.abs(c.latLng.lng).toFixed(4)} W
                        </div>
                      </div>
                    </div>

                    {/* Change score progress bar + numeric value */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)' }}>Change score</span>
                          <div
                            style={{
                              width: '54px',
                              height: '5px',
                              background: 'var(--color-line)',
                              position: 'relative',
                            }}
                          >
                            <div
                              style={{
                                width: `${c.differenceScore * 100}%`,
                                height: '100%',
                                background: 'var(--color-accent)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', width: '28px', textAlign: 'right' }}>
                            {c.differenceScore.toFixed(2)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)' }}>Confidence</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', width: '28px', textAlign: 'right' }}>
                            {c.confidence.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Decision Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '120px', justifyContent: 'flex-end' }}>
                        {isAccepted ? (
                          <span
                            style={{
                              padding: '4px 10px',
                              border: '1.2px solid var(--color-ok)',
                              color: 'var(--color-ok)',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                            }}
                          >
                            Accepted
                          </span>
                        ) : isRejected ? (
                          <span
                            style={{
                              padding: '4px 10px',
                              border: '1.2px solid var(--color-crit)',
                              color: 'var(--color-crit)',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                            }}
                          >
                            Rejected
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateDecision(c.id, 'confirmed_threat');
                              }}
                              className="btn btn-primary"
                              style={{
                                padding: '3px 10px',
                                fontSize: '0.75rem',
                              }}
                            >
                              Accept
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateDecision(c.id, 'benign_false_positive');
                              }}
                              className="btn"
                              style={{
                                padding: '3px 10px',
                                fontSize: '0.75rem',
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Intelligence Report Summary Table */}
          <div
            className="panel"
            style={{
              padding: '16px',
              background: 'var(--color-sheet)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                Intelligence report
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)', marginTop: '4px' }}>
                IR-2026-014, sector 34
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-2)' }}>
                Period 06 to 24 Oct. {enrichedCandidates.length} changes detected, {confirmedCount} confirmed, {rejectedCount} rejected, {unreviewedCount} awaiting review.
              </div>
            </div>

            {/* Table */}
            <div style={{ border: '1.2px solid var(--color-line)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-paper)', borderBottom: '1.2px solid var(--color-line)', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Finding</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Coordinates</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Confidence</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedCandidates.slice(0, 4).map((c) => (
                    <tr key={`row-${c.id}`} style={{ borderBottom: '1px solid var(--color-line)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{c.id} {c.label.toLowerCase()}</td>
                      <td style={{ padding: '6px 8px', fontVariantNumeric: 'tabular-nums', color: 'var(--color-ink-2)' }}>
                        {c.latLng.lat.toFixed(4)} N, {Math.abs(c.latLng.lng).toFixed(4)} W
                      </td>
                      <td style={{ padding: '6px 8px', fontVariantNumeric: 'tabular-nums' }}>
                        {c.confidence.toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {c.decision === 'confirmed_threat' ? (
                          <span style={{ color: 'var(--color-ok)', fontWeight: 700 }}>Accepted</span>
                        ) : c.decision === 'benign_false_positive' ? (
                          <span style={{ color: 'var(--color-crit)', fontWeight: 700 }}>Rejected</span>
                        ) : (
                          <span style={{ color: 'var(--color-ink-2)' }}>Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                }}
              >
                Generate report
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="btn"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                Export HTML
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="btn"
                style={{
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Replay Bar (Standard across mockups) */}
      <div
        style={{
          height: '42px',
          background: 'var(--color-paper)',
          borderTop: '1.2px solid var(--color-edge)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '14px',
          zIndex: 40,
        }}
      >
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: 'var(--color-strip)',
            border: 'none',
            color: '#FFFFFF',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isPlaying ? 'Pause replay' : 'Play replay'}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: '1px' }} />}
        </button>

        <div style={{ display: 'flex', border: '1.2px solid var(--color-edge)', background: 'var(--color-sheet)' }}>
          {(['1x', '2x', '5x'] as const).map((spd) => (
            <button
              key={spd}
              onClick={() => setReplaySpeed(spd)}
              style={{
                border: 'none',
                background: replaySpeed === spd ? 'var(--color-strip)' : 'transparent',
                color: replaySpeed === spd ? '#FFFFFF' : 'var(--color-ink)',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              {spd}
            </button>
          ))}
        </div>

        <span style={{ fontSize: '0.76rem', color: 'var(--color-ink-2)' }}>Replay</span>

        {/* Timeline Slider with orange scrubber */}
        <div style={{ flex: 1, position: 'relative', height: '14px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: '2px', background: 'var(--color-line)', position: 'relative' }}>
            {[0.15, 0.28, 0.45, 0.62, 0.78, 0.92].map((tick, i) => (
              <div
                key={`tick-${i}`}
                style={{
                  position: 'absolute',
                  left: `${tick * 100}%`,
                  top: '-3px',
                  width: '1.5px',
                  height: '8px',
                  background: 'var(--color-edge)',
                }}
              />
            ))}
            {/* Scrubber marker with timestamp */}
            <div
              style={{
                position: 'absolute',
                left: '52%',
                top: '-16px',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  background: 'var(--color-strip)',
                  color: '#FFFFFF',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  borderRadius: '2px',
                  marginBottom: '2px',
                }}
              >
                14:30:12
              </div>
              <div style={{ width: '2px', height: '12px', background: 'var(--color-accent)' }} />
            </div>
          </div>
        </div>

        {/* Ticker message */}
        <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', maxWidth: '420px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Alpha to Command: contact east of bridge, 2 hops, 380 ms
        </div>
      </div>

      {/* Intelligence Report Modal */}
      <IntelligenceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportPayload={reportPayload}
      />
    </div>
  );
};
