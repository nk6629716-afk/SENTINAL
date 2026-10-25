import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Info,
  Check,
  X,
  Clock,
  Sparkles,
  Download,
  AlertOctagon,
  HelpCircle,
  ShieldAlert,
  Search,
} from 'lucide-react';
import { api } from '../../services/api/apiClient';
import {
  EnrichedChangeCandidate,
  CandidateReviewDecision,
  SensorMetadata,
  AnalysisState,
  IntelligenceReportPayload,
} from './types';
import { convertToMGRS, formatTacticalTimestamp } from './utils/geoUtils';
import { IntelligenceReportModal } from './components/IntelligenceReportModal';
import {
  BUNDLED_SAMPLE_PAIRS,
  SamplePair,
  SECTOR_34_PAIR,
} from './utils/samplePairs';
import {
  GeoIntelImageDiff,
  ImageMatrix,
  DiffAlgorithmSettings,
} from '../../algorithms/geointel/imageDiff';

interface GeoIntelModuleProps {
  observations: GeoIntelObservation[];
  onRefreshObservations: () => Promise<void>;
}

export const GeoIntelModule: React.FC<GeoIntelModuleProps> = ({
  observations,
  onRefreshObservations,
}) => {
  // Theme Detection (Day / Night)
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateTheme = () => {
      const themeAttr = document.documentElement.getAttribute('data-theme');
      if (themeAttr === 'dark') {
        setCurrentTheme('dark');
      } else {
        setCurrentTheme('light');
      }
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Selected Sample Pair
  const [selectedPairId, setSelectedPairId] = useState<string>(SECTOR_34_PAIR.id);
  const activePair: SamplePair = useMemo(() => {
    return BUNDLED_SAMPLE_PAIRS.find((p) => p.id === selectedPairId) || SECTOR_34_PAIR;
  }, [selectedPairId]);

  // View Mode: side-by-side or swipe
  const [viewMode, setViewMode] = useState<'side-by-side' | 'swipe'>('side-by-side');
  const [swipePos, setSwipePos] = useState<number>(50); // percentage 0 - 100
  const [isDraggingSwipe, setIsDraggingSwipe] = useState(false);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  // Algorithm Parameters
  const [threshold, setThreshold] = useState<number>(35); // Delta threshold [1..255]
  const [minRegionSize, setMinRegionSize] = useState<number>(4); // Minimum cluster size in pixels

  // Analysis State & Candidates
  const [hasRunAnalysis, setHasRunAnalysis] = useState<boolean>(true); // default true with initial run
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [executionTimeMs, setExecutionTimeMs] = useState<number>(2.4);
  const [candidates, setCandidates] = useState<EnrichedChangeCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Analyst Editing in Inspector
  const [analystNoteDraft, setAnalystNoteDraft] = useState<string>('');
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Replay bar state
  const [isPlaying, setIsPlaying] = useState(true);
  const [replaySpeed, setReplaySpeed] = useState<'1x' | '2x' | '5x'>('1x');

  // Associated Server Observation
  const activeObs = observations[0];

  // =========================================================================
  // Deterministic Analysis Execution via Person 3's GeoIntelImageDiff
  // =========================================================================
  const runComparison = useCallback(
    (customThreshold?: number, customMinArea?: number) => {
      const activeThresh = customThreshold !== undefined ? customThreshold : threshold;
      const activeArea = customMinArea !== undefined ? customMinArea : minRegionSize;

      setIsAnalyzing(true);
      const startTime = performance.now();

      try {
        const beforeMatrix = activePair.getBeforeMatrix();
        const afterMatrix = activePair.getAfterMatrix();

        // Instantiate pure Person 3 algorithm
        const diffEngine = new GeoIntelImageDiff({
          threshold: activeThresh,
          minRegionSize: activeArea,
        });

        const rawRegions = diffEngine.analyze(beforeMatrix, afterMatrix);
        const elapsed = Number((performance.now() - startTime).toFixed(1));
        setExecutionTimeMs(Math.max(0.5, elapsed));

        const baseLat = activePair.centerCoordinates?.lat || 34.0588;
        const baseLng = activePair.centerCoordinates?.lng || -118.2391;

        // Label mappings for realistic tactical comprehension
        const labelPresets: Record<string, { label: string; anomalyType: any }> = {
          'CAN-100': { label: 'Roadway Surface Alteration', anomalyType: 'terrain_disturbance' },
          'CAN-101': { label: 'Cleared Compound Apron', anomalyType: 'vegetation_clearing' },
          'CAN-102': { label: 'Staged Vehicle Convoy', anomalyType: 'vehicle_movement' },
          'CAN-103': { label: 'Reinforced Structure Profile', anomalyType: 'structure_alteration' },
        };

        const enriched: EnrichedChangeCandidate[] = rawRegions.map((region, idx) => {
          const preset = labelPresets[region.id] || {
            label: `Candidate Ground Anomaly #${idx + 1}`,
            anomalyType: idx % 2 === 0 ? 'terrain_disturbance' : 'structure_alteration',
          };

          // Honest pixel-to-geographic projection anchor
          const lat = Number((baseLat + ((region.bbox.y / activePair.height) - 0.5) * -0.015).toFixed(5));
          const lng = Number((baseLng + ((region.bbox.x / activePair.width) - 0.5) * 0.02).toFixed(5));
          const mgrs = convertToMGRS(lat, lng);

          return {
            id: region.id,
            label: preset.label,
            anomalyType: preset.anomalyType,
            differenceScore: region.differenceScore,
            confidence: Number(Math.min(0.99, region.differenceScore * 1.15).toFixed(2)),
            bbox: region.bbox,
            boundingBox: region.bbox,
            areaPixels: region.areaPixels,
            algorithmSettings: region.algorithmSettings,
            explanation: region.explanation,
            reviewed: false,
            decision: 'unreviewed',
            analystNotes: '',
            latLng: { lat, lng },
            mgrsCoordinate: mgrs,
            detectedAt: new Date().toISOString(),
            auditTrail: [
              {
                timestamp: new Date().toISOString(),
                analyst: 'GeoIntelImageDiff v1.0 (BFS Cluster)',
                action: 'INITIAL_CANDIDATE_EXTRACTION',
                notes: `Flagged ${region.areaPixels} connected pixels at [${region.bbox.x}, ${region.bbox.y}]. Score: ${(region.differenceScore * 100).toFixed(1)}%`,
              },
            ],
          };
        });

        setCandidates(enriched);
        setHasRunAnalysis(true);
        if (enriched.length > 0) {
          setSelectedCandidateId(enriched[0].id);
          setAnalystNoteDraft('');
        } else {
          setSelectedCandidateId(null);
          setAnalystNoteDraft('');
        }

        setStatusNotification(
          `Analysis finished: ${enriched.length} candidate region${enriched.length === 1 ? '' : 's'} identified.`
        );
        setTimeout(() => setStatusNotification(null), 3500);
      } catch (err: any) {
        console.error('GeoIntel analysis error:', err);
        setStatusNotification(`Analysis failed: ${err.message || 'Unknown error'}`);
        setTimeout(() => setStatusNotification(null), 5000);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [activePair, threshold, minRegionSize]
  );

  // Initial Run on Pair Selection Change
  useEffect(() => {
    runComparison();
  }, [selectedPairId]);

  // Sync active candidate note draft when candidate selection changes
  const activeCandidate = useMemo(() => {
    return candidates.find((c) => c.id === selectedCandidateId) || null;
  }, [candidates, selectedCandidateId]);

  useEffect(() => {
    if (activeCandidate) {
      setAnalystNoteDraft(activeCandidate.analystNotes || '');
    }
  }, [activeCandidate?.id]);

  // Handle Swipe dragging
  const handleMouseDown = () => setIsDraggingSwipe(true);
  const handleMouseUp = () => setIsDraggingSwipe(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingSwipe || !swipeContainerRef.current) return;
    const rect = swipeContainerRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(rect.width - 2, e.clientX - rect.left));
    setSwipePos(Math.round((x / rect.width) * 100));
  };

  // Review Status Decision Updates
  const handleUpdateDecision = async (
    candidateId: string,
    decision: CandidateReviewDecision,
    customNotes?: string
  ) => {
    const timestamp = new Date().toISOString();
    const notesToSave = customNotes !== undefined ? customNotes : analystNoteDraft;
    const isReviewed = decision === 'confirmed_threat' || decision === 'benign_false_positive';

    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id === candidateId) {
          return {
            ...c,
            decision,
            reviewed: isReviewed,
            analystNotes: notesToSave,
            auditTrail: [
              ...c.auditTrail,
              {
                timestamp,
                analyst: 'Duty Intelligence Officer',
                action: `DECISION_${decision.toUpperCase()}`,
                notes: notesToSave,
              },
            ],
          };
        }
        return c;
      })
    );

    setIsSavingReview(true);
    try {
      if (activeObs) {
        await api.updateGeoCandidateReview(activeObs.id, candidateId, isReviewed, notesToSave);
        await onRefreshObservations();
      }
      setSaveSuccessMsg(`Review saved: Candidate marked as ${decision === 'confirmed_threat' ? 'Accepted' : decision === 'benign_false_positive' ? 'Rejected' : 'Unreviewed'}.`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.warn('Could not persist review to server, cached locally:', err);
      setSaveSuccessMsg('Review updated locally (server offline)');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } finally {
      setIsSavingReview(false);
    }
  };

  // Quick Action Buttons on Candidate Row
  const handleQuickDecision = (e: React.MouseEvent, candidateId: string, decision: CandidateReviewDecision) => {
    e.stopPropagation();
    handleUpdateDecision(candidateId, decision);
  };

  // Sensor Metadata
  const baselineSensor: SensorMetadata = useMemo(
    () => ({
      sensorId: activePair.beforeImageId,
      platform: 'SENTINEL-2B MULTISPECTRAL',
      resolutionGsd: '0.3m',
      cloudCoverPct: 1.2,
      sunElevationDeg: 48.2,
      sunAzimuthDeg: 134.2,
      spectralBands: ['B02-Blue', 'B03-Green', 'B04-Red', 'B08-NIR'],
      captureTimestamp: '2026-10-06T08:00:00Z',
    }),
    [activePair.beforeImageId]
  );

  const surveillanceSensor: SensorMetadata = useMemo(
    () => ({
      sensorId: activePair.afterImageId,
      platform: 'WORLDVIEW-3 TACTICAL RECON',
      resolutionGsd: '0.3m',
      cloudCoverPct: 0.8,
      sunElevationDeg: 51.6,
      sunAzimuthDeg: 142.6,
      spectralBands: ['Panchromatic', 'VNIR', 'SWIR-1'],
      captureTimestamp: '2026-10-24T07:45:00Z',
    }),
    [activePair.afterImageId]
  );

  // Report Payload Computation
  const reportPayload: IntelligenceReportPayload = useMemo(() => {
    const confirmedCount = candidates.filter((c) => c.decision === 'confirmed_threat').length;
    const benignCount = candidates.filter((c) => c.decision === 'benign_false_positive').length;
    const secondaryCount = candidates.filter((c) => c.decision === 'secondary_pass_required').length;
    const unreviewedCount = candidates.filter((c) => c.decision === 'unreviewed').length;

    const baseLat = activePair.centerCoordinates?.lat || 34.0588;
    const baseLng = activePair.centerCoordinates?.lng || -118.2391;

    return {
      reportId: `IR-2026-${activePair.id.replace('pair-', '').toUpperCase()}`,
      classification: 'UNCLASSIFIED // EXERCISE SENTINEL // REL TO NATO',
      generatedAt: new Date().toISOString(),
      analystCallsign: 'Watch Officer Alpha-6 (C4ISR Division)',
      targetZone: activePair.zoneName,
      aoiBoundingBox: {
        northLat: baseLat + 0.015,
        southLat: baseLat - 0.015,
        eastLng: baseLng + 0.02,
        westLng: baseLng - 0.02,
      },
      observation: {
        id: activeObs?.id || 'GEO-OBS-01',
        title: activePair.title,
        baselineCaptureDate: baselineSensor.captureTimestamp,
        surveillanceCaptureDate: surveillanceSensor.captureTimestamp,
        baselineSensor,
        surveillanceSensor,
      },
      analysisConfiguration: {
        algorithmName: 'GeoIntelImageDiff v1.0 (Connected-Component BFS)',
        sensitivityThreshold: threshold,
        minRegionSize: minRegionSize,
        executionTimeMs: executionTimeMs,
      },
      summaryStats: {
        totalCandidates: candidates.length,
        confirmedThreats: confirmedCount,
        benignFalsePositives: benignCount,
        secondaryPassRequired: secondaryCount,
        unreviewed: unreviewedCount,
      },
      candidates: candidates.map((c) => ({
        id: c.id,
        label: c.label,
        type: c.anomalyType,
        confidencePct: c.confidence * 100,
        diffScorePct: c.differenceScore * 100,
        pixelBox: {
          x: c.bbox.x,
          y: c.bbox.y,
          width: c.bbox.width,
          height: c.bbox.height,
        },
        areaPixels: c.areaPixels,
        mgrs: c.mgrsCoordinate,
        latLng: c.latLng,
        decision: c.decision,
        analystNotes: c.analystNotes || '',
        explanation: c.explanation,
      })),
      overallAnalystAssessment:
        candidates.length === 0
          ? 'Baseline verification complete: No anomalous radiometric delta detected across scanned perimeter.'
          : `${candidates.length} visual change candidate(s) isolated. Multi-temporal verification required for prioritized tactical anomalies.`,
      limitationDisclaimer:
        'DISCLAIMER: Algorithmic image difference scores represent candidate radiometric changes. Differences may stem from sun angles, shadows, cloud cover, camera alignment, or lossy compression rather than physical ground activity. Analyst ground-truth verification is required.',
      isSynthetic: true,
    };
  }, [
    activePair,
    activeObs,
    candidates,
    threshold,
    minRegionSize,
    executionTimeMs,
    baselineSensor,
    surveillanceSensor,
  ]);

  const confirmedCount = candidates.filter((c) => c.decision === 'confirmed_threat').length;
  const rejectedCount = candidates.filter((c) => c.decision === 'benign_false_positive').length;
  const unreviewedCount = candidates.filter((c) => c.decision === 'unreviewed').length;

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

      {/* Top Comprehension Banner & Comparison Pair Selector */}
      <div
        style={{
          background: 'var(--color-sheet)',
          borderBottom: '1.2px solid var(--color-edge)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '2px 8px',
              background: 'var(--color-strip)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '0.75rem',
              letterSpacing: '0.04em',
            }}
          >
            GEOINTEL RECON
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-ink)', fontWeight: 600 }}>
            Compare two images of the same area to highlight visual differences for analyst review.
          </span>
        </div>

        {/* Pair Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label
            htmlFor="pair-selector"
            style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-ink-2)', whiteSpace: 'nowrap' }}
          >
            COMPARE IMAGES:
          </label>
          <select
            id="pair-selector"
            value={selectedPairId}
            onChange={(e) => setSelectedPairId(e.target.value)}
            style={{
              background: 'var(--color-paper)',
              color: 'var(--color-ink)',
              border: '1.2px solid var(--color-edge)',
              padding: '4px 10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              fontFamily: 'var(--font-heading)',
              cursor: 'pointer',
              outline: 'none',
              maxWidth: '320px',
            }}
          >
            {BUNDLED_SAMPLE_PAIRS.map((pair) => (
              <option key={pair.id} value={pair.id}>
                {pair.title}
              </option>
            ))}
          </select>

          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--color-ink-2)',
              background: 'var(--color-paper)',
              border: '1px solid var(--color-line)',
              padding: '2px 6px',
              fontWeight: 700,
            }}
            title="All imagery is synthetic demo simulation data."
          >
            SYNTHETIC DATA
          </span>
        </div>
      </div>

      {/* Main Grid: Left Column (Imagery & Inspection) and Right Column (Controls & Candidates) */}
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--color-ink)',
                  }}
                >
                  Imagery comparison
                </span>
                <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                  {activePair.subtitle}
                </span>
              </div>

              {/* Segmented control: Side by side / Swipe */}
              <div
                style={{
                  display: 'flex',
                  border: '1.2px solid var(--color-edge)',
                  background: 'var(--color-paper)',
                }}
              >
                <button
                  onClick={() => setViewMode('side-by-side')}
                  style={{
                    padding: '4px 14px',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'side-by-side' ? 'var(--color-strip)' : 'transparent',
                    color: viewMode === 'side-by-side' ? '#FFFFFF' : 'var(--color-ink)',
                  }}
                >
                  Side by side
                </button>
                <button
                  onClick={() => setViewMode('swipe')}
                  style={{
                    padding: '4px 14px',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    border: 'none',
                    borderLeft: '1.2px solid var(--color-edge)',
                    cursor: 'pointer',
                    background: viewMode === 'swipe' ? 'var(--color-strip)' : 'transparent',
                    color: viewMode === 'swipe' ? '#FFFFFF' : 'var(--color-ink)',
                  }}
                >
                  Swipe
                </button>
              </div>
            </div>

            {/* Display View: Side-by-Side vs Swipe */}
            {viewMode === 'side-by-side' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  width: '100%',
                }}
              >
                {/* Before Image Box */}
                <div
                  style={{
                    position: 'relative',
                    height: '320px',
                    background: 'var(--color-map)',
                    border: '1.2px solid var(--color-line)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: 'var(--color-strip)',
                      color: '#FFFFFF',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-heading)',
                      zIndex: 20,
                      boxShadow: 'var(--shadow-hard)',
                    }}
                  >
                    {activePair.beforeLabel}
                  </div>

                  {/* Rendered Before SVG preserving aspect ratio */}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: activePair.getBeforeSvg(currentTheme),
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                </div>

                {/* After Image Box with Bounding Overlays */}
                <div
                  style={{
                    position: 'relative',
                    height: '320px',
                    background: 'var(--color-map)',
                    border: '1.2px solid var(--color-line)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'var(--color-accent)',
                      color: '#FFFFFF',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      fontFamily: 'var(--font-heading)',
                      zIndex: 20,
                      boxShadow: 'var(--shadow-hard)',
                    }}
                  >
                    {activePair.afterLabel}
                  </div>

                  {/* Rendered After SVG */}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: activePair.getAfterSvg(currentTheme),
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />

                  {/* Overlay Candidate Bounding Boxes */}
                  {candidates.map((c) => {
                    const isSelected = selectedCandidateId === c.id;
                    const leftPct = (c.bbox.x / activePair.width) * 100;
                    const topPct = (c.bbox.y / activePair.height) * 100;
                    const widthPct = (c.bbox.width / activePair.width) * 100;
                    const heightPct = (c.bbox.height / activePair.height) * 100;

                    return (
                      <div
                        key={`overlay-sbs-${c.id}`}
                        onClick={() => setSelectedCandidateId(c.id)}
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${widthPct}%`,
                          height: `${heightPct}%`,
                          border: isSelected
                            ? '2.2px solid var(--color-strip)'
                            : '1.8px dashed var(--color-accent)',
                          background: isSelected
                            ? 'rgba(232, 89, 12, 0.22)'
                            : 'rgba(232, 89, 12, 0.12)',
                          boxShadow: isSelected ? '0 0 0 1.5px #FFFFFF' : 'none',
                          cursor: 'pointer',
                          zIndex: isSelected ? 25 : 15,
                          transition: 'all 0.15s ease',
                        }}
                        title={`${c.id}: ${c.label} (${(c.differenceScore * 100).toFixed(1)}% change)`}
                      >
                        {/* Candidate Tag Pill */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '-20px',
                            left: '0',
                            background: isSelected ? 'var(--color-strip)' : 'var(--color-accent)',
                            color: '#FFFFFF',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            fontFamily: 'var(--font-heading)',
                            padding: '1px 6px',
                            whiteSpace: 'nowrap',
                            boxShadow: 'var(--shadow-hard)',
                          }}
                        >
                          {c.id} {c.label.split(' ')[0].toLowerCase()}, {c.differenceScore.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Swipe View Mode */
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
                  cursor: 'ew-resize',
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
                  {activePair.beforeLabel}
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
                  {activePair.afterLabel}
                </div>

                {/* Base Layer: Before SVG */}
                <div
                  dangerouslySetInnerHTML={{
                    __html: activePair.getBeforeSvg(currentTheme),
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                  }}
                />

                {/* Top Layer: After SVG with clip-path matching swipe divider */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: `polygon(${swipePos}% 0, 100% 0, 100% 100%, ${swipePos}% 100%)`,
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: activePair.getAfterSvg(currentTheme),
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                    }}
                  />

                  {/* Overlays visible on After portion */}
                  {candidates.map((c) => {
                    const isSelected = selectedCandidateId === c.id;
                    const leftPct = (c.bbox.x / activePair.width) * 100;
                    const topPct = (c.bbox.y / activePair.height) * 100;
                    const widthPct = (c.bbox.width / activePair.width) * 100;
                    const heightPct = (c.bbox.height / activePair.height) * 100;

                    return (
                      <div
                        key={`overlay-swipe-${c.id}`}
                        onClick={() => setSelectedCandidateId(c.id)}
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${widthPct}%`,
                          height: `${heightPct}%`,
                          border: isSelected
                            ? '2.2px solid var(--color-strip)'
                            : '1.8px dashed var(--color-accent)',
                          background: isSelected
                            ? 'rgba(232, 89, 12, 0.22)'
                            : 'rgba(232, 89, 12, 0.12)',
                          boxShadow: isSelected ? '0 0 0 1.5px #FFFFFF' : 'none',
                          cursor: 'pointer',
                          zIndex: 25,
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '-20px',
                            left: '0',
                            background: isSelected ? 'var(--color-strip)' : 'var(--color-accent)',
                            color: '#FFFFFF',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            fontFamily: 'var(--font-heading)',
                            padding: '1px 6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.id} {c.label.split(' ')[0].toLowerCase()}, {c.differenceScore.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vertical Divider Line with Grab Handle */}
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
              </div>
            )}
          </div>

          {/* Bottom Panel: Candidate Details & Analyst Review */}
          <div
            className="panel"
            style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--color-sheet)',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--color-ink)',
                  }}
                >
                  Candidate details
                </span>
                <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'var(--color-ink-2)' }}>
                  {activeCandidate ? `Inspect region ${activeCandidate.id}` : 'Select a candidate region to review'}
                </span>
              </div>

              {saveSuccessMsg && (
                <div
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--color-ok)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle size={14} />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}
            </div>

            {activeCandidate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Metric Summary Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '8px',
                    background: 'var(--color-paper)',
                    padding: '10px',
                    border: '1.2px solid var(--color-line)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)' }}>IMAGE PIXEL BOX</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                      [{activeCandidate.bbox.x}, {activeCandidate.bbox.y}, {activeCandidate.bbox.width}×{activeCandidate.bbox.height}]
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)' }}>CLUSTER AREA</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                      {activeCandidate.areaPixels} pixels
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)' }}>DIFFERENCE SCORE</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                      {(activeCandidate.differenceScore * 100).toFixed(1)}% (Δ {activeCandidate.differenceScore.toFixed(3)})
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)' }}>REVIEW STATUS</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                      {activeCandidate.decision === 'confirmed_threat' ? (
                        <span style={{ color: 'var(--color-ok)' }}>Accepted</span>
                      ) : activeCandidate.decision === 'benign_false_positive' ? (
                        <span style={{ color: 'var(--color-crit)' }}>Rejected</span>
                      ) : (
                        <span style={{ color: 'var(--color-warn)' }}>Unreviewed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Plain-Language Explanation */}
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-ink)',
                    background: 'var(--color-sheet)',
                    borderLeft: '3px solid var(--color-strip)',
                    padding: '8px 12px',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Algorithm finding:</strong> {activeCandidate.explanation}
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)', marginTop: '4px' }}>
                    Note: Coordinates represent image pixel space. Projected center anchor ~{activeCandidate.latLng.lat.toFixed(4)}°N, {Math.abs(activeCandidate.latLng.lng).toFixed(4)}°W ({activeCandidate.mgrsCoordinate}).
                  </div>
                </div>

                {/* Analyst Review Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label
                      htmlFor="analyst-notes"
                      style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-ink)' }}
                    >
                      Analyst notes
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleUpdateDecision(activeCandidate.id, 'confirmed_threat')}
                        className="btn btn-primary"
                        style={{
                          padding: '3px 10px',
                          fontSize: '0.75rem',
                          background: activeCandidate.decision === 'confirmed_threat' ? 'var(--color-ok)' : undefined,
                        }}
                      >
                        Accept (Confirm)
                      </button>
                      <button
                        onClick={() => handleUpdateDecision(activeCandidate.id, 'benign_false_positive')}
                        className="btn"
                        style={{
                          padding: '3px 10px',
                          fontSize: '0.75rem',
                          borderColor: activeCandidate.decision === 'benign_false_positive' ? 'var(--color-crit)' : undefined,
                          color: activeCandidate.decision === 'benign_false_positive' ? 'var(--color-crit)' : undefined,
                        }}
                      >
                        Reject (Dismiss)
                      </button>
                      <button
                        onClick={() => handleUpdateDecision(activeCandidate.id, 'unreviewed')}
                        className="btn"
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="analyst-notes"
                      type="text"
                      value={analystNoteDraft}
                      onChange={(e) => setAnalystNoteDraft(e.target.value)}
                      placeholder="Add analyst observation notes or ground-truth assessment..."
                      style={{
                        flex: 1,
                        background: 'var(--color-paper)',
                        border: '1.2px solid var(--color-edge)',
                        padding: '6px 10px',
                        fontSize: '0.8rem',
                        color: 'var(--color-ink)',
                        fontFamily: 'var(--font-body)',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleUpdateDecision(activeCandidate.id, activeCandidate.decision, analystNoteDraft)}
                      disabled={isSavingReview}
                      className="btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Save note
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--color-ink-2)',
                  fontSize: '0.82rem',
                }}
              >
                {candidates.length === 0
                  ? 'No candidate changes available for inspection. (0 regions detected at current threshold)'
                  : 'Click on any candidate region in the image or list to inspect coordinates and record review status.'}
              </div>
            )}
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
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-ink)',
                }}
              >
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
                  <span
                    style={{ width: '85px', fontSize: '0.8rem', color: 'var(--color-ink)', fontWeight: 600 }}
                    title="Minimum pixel intensity delta (1..255) to flag change. Lower = more sensitive."
                  >
                    Sensitivity
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="180"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--color-strip)', cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      width: '30px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'right',
                    }}
                  >
                    {threshold}
                  </span>
                </div>

                {/* Minimum Area Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{ width: '85px', fontSize: '0.8rem', color: 'var(--color-ink)', fontWeight: 600 }}
                    title="Minimum connected cluster size in pixels. Filters out smaller noise."
                  >
                    Minimum area
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={minRegionSize}
                    onChange={(e) => setMinRegionSize(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--color-strip)', cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      width: '40px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      textAlign: 'right',
                    }}
                  >
                    {minRegionSize} px
                  </span>
                </div>
              </div>

              {/* Run comparison Button */}
              <button
                onClick={() => runComparison()}
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
                {isAnalyzing ? 'Computing...' : 'Run comparison'}
              </button>
            </div>

            {/* Computation Status Line */}
            <div
              style={{
                fontSize: '0.73rem',
                color: 'var(--color-ink-2)',
                borderTop: '1px solid var(--color-line)',
                paddingTop: '6px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Algorithm: GeoIntelImageDiff (BFS)</span>
              <span>{executionTimeMs} ms • {candidates.length} candidate(s) above threshold</span>
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
            <div
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-ink)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Candidate changes {candidates.length}</span>
              {candidates.length > 0 && (
                <span style={{ fontSize: '0.74rem', color: 'var(--color-ink-2)', fontWeight: 500 }}>
                  Click row to inspect
                </span>
              )}
            </div>

            {candidates.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {candidates.map((c) => {
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
                        transition: 'background 0.1s ease',
                      }}
                    >
                      {/* Badge CAN-100 / CAN-101 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            minWidth: '32px',
                            height: '28px',
                            padding: '0 6px',
                            background: isSelected ? 'var(--color-strip)' : 'var(--color-accent)',
                            color: '#FFFFFF',
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {c.id}
                        </div>

                        {/* Candidate Name & Pixel Coordinates */}
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                            {c.label}
                          </div>
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--color-ink-2)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            Pixel [{c.bbox.x}, {c.bbox.y}, {c.bbox.width}×{c.bbox.height}] • {c.areaPixels} px
                          </div>
                        </div>
                      </div>

                      {/* Change score progress bar + quick action */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)' }}>Score</span>
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
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums',
                                width: '28px',
                                textAlign: 'right',
                              }}
                            >
                              {c.differenceScore.toFixed(2)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-2)' }}>Conf</span>
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums',
                                width: '28px',
                                textAlign: 'right',
                              }}
                            >
                              {c.confidence.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Decision Quick Action Buttons */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            minWidth: '105px',
                            justifyContent: 'flex-end',
                          }}
                        >
                          {isAccepted ? (
                            <span
                              style={{
                                padding: '3px 8px',
                                border: '1.2px solid var(--color-ok)',
                                color: 'var(--color-ok)',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                              }}
                            >
                              Accepted
                            </span>
                          ) : isRejected ? (
                            <span
                              style={{
                                padding: '3px 8px',
                                border: '1.2px solid var(--color-crit)',
                                color: 'var(--color-crit)',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                              }}
                            >
                              Rejected
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={(e) => handleQuickDecision(e, c.id, 'confirmed_threat')}
                                className="btn btn-primary"
                                style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                                title="Accept / confirm this candidate anomaly"
                              >
                                Accept
                              </button>
                              <button
                                onClick={(e) => handleQuickDecision(e, c.id, 'benign_false_positive')}
                                className="btn"
                                style={{ padding: '2px 8px', fontSize: '0.74rem' }}
                                title="Reject as false positive / benign"
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
            ) : (
              /* Honest zero-change state */
              <div
                style={{
                  padding: '24px 16px',
                  background: 'var(--color-paper)',
                  border: '1.2px dashed var(--color-edge)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Info size={22} color="var(--color-ink-2)" />
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                  No significant pixel differences detected at this threshold
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-ink-2)', maxWidth: '380px' }}>
                  Both imagery matrices are visually identical or pixel intensity deltas fall below threshold {threshold}. Lower sensitivity threshold or select a different comparison pair.
                </div>
              </div>
            )}
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
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-ink)',
                }}
              >
                Intelligence report
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)', marginTop: '4px' }}>
                {reportPayload.reportId}, {activePair.zoneName}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-2)' }}>
                {candidates.length} changes detected, {confirmedCount} confirmed, {rejectedCount} rejected, {unreviewedCount} awaiting review.
              </div>
            </div>

            {/* Findings Table */}
            <div style={{ border: '1.2px solid var(--color-line)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--color-paper)',
                      borderBottom: '1.2px solid var(--color-line)',
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Finding</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Pixel bbox</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Score</th>
                    <th style={{ padding: '6px 8px', fontWeight: 700 }}>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.length > 0 ? (
                    candidates.slice(0, 4).map((c) => (
                      <tr key={`row-${c.id}`} style={{ borderBottom: '1px solid var(--color-line)' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                          {c.id} {c.label.toLowerCase()}
                        </td>
                        <td
                          style={{
                            padding: '6px 8px',
                            fontVariantNumeric: 'tabular-nums',
                            color: 'var(--color-ink-2)',
                          }}
                        >
                          [{c.bbox.x}, {c.bbox.y}, {c.bbox.width}×{c.bbox.height}]
                        </td>
                        <td style={{ padding: '6px 8px', fontVariantNumeric: 'tabular-nums' }}>
                          {c.differenceScore.toFixed(2)}
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--color-ink-2)' }}>
                        No candidate findings in current comparison.
                      </td>
                    </tr>
                  )}
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
                onClick={() => {
                  const blob = new Blob([JSON.stringify(reportPayload, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${reportPayload.reportId}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
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
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-ink-2)',
            maxWidth: '420px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          GeoIntel Recon: multi-temporal radiometric diffing active on {activePair.title}
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
