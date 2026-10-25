import React, { useState } from 'react';
import {
  GeoIntelObservation,
  ChangeCandidate,
} from '@shared/types';
import {
  Compass,
  Layers,
  Sliders,
  CheckCircle,
  AlertTriangle,
  FileDown,
  Play,
  Eye,
  Info,
  MapPin,
} from 'lucide-react';
import { api } from '../../services/api/apiClient';

interface GeoIntelModuleProps {
  observations: GeoIntelObservation[];
  onRefreshObservations: () => Promise<void>;
}

export const GeoIntelModule: React.FC<GeoIntelModuleProps> = ({
  observations,
  onRefreshObservations,
}) => {
  const [selectedObsIdx, setSelectedObsIdx] = useState(0);
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'side-by-side'>('slider');
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0-100
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [sensitivity, setSensitivity] = useState(65);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [analystNotes, setAnalystNotes] = useState('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const currentObs = observations[selectedObsIdx] || observations[0];

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const step = 20;
    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          return 100;
        }
        return prev + step;
      });
    }, 150);
  };

  const handleCandidateReview = async (candidateId: string, reviewed: boolean) => {
    try {
      await api.updateGeoCandidateReview(currentObs.id, candidateId, reviewed, analystNotes);
      await onRefreshObservations();
    } catch (err) {
      console.error('Failed to update candidate review:', err);
    }
  };

  const handleExportReport = () => {
    const reportText = `
================================================================================
SENTINEL GEOSPATIAL INTELLIGENCE (GeoIntel) TACTICAL DEBRIEF
Observation: ${currentObs.title} [${currentObs.id}]
Target Zone: ${currentObs.zoneName} (${currentObs.coordinates.lat}, ${currentObs.coordinates.lng})
Baseline Image Date: ${currentObs.captureDateBefore}
Surveillance Image Date: ${currentObs.captureDateAfter}
Sensitivity Configuration: ${sensitivity}% • Noise Suppression: ACTIVE
Status: ${currentObs.reviewStatus.toUpperCase()}
Generated: ${new Date().toISOString()}
================================================================================

EXECUTIVE SUMMARY:
Automated image-difference extraction identified ${currentObs.candidates.length} candidate structural anomalies.

DETECTED CANDIDATE ANOMALIES:
${currentObs.candidates
  .map(
    (c, idx) => `
[${idx + 1}] ID: ${c.id} | Label: ${c.label}
    - Anomaly Category: ${c.anomalyType}
    - Difference Score: ${(c.differenceScore * 100).toFixed(0)}% (Confidence: ${(c.confidence * 100).toFixed(0)}%)
    - Bounding Box (Normalized): X:${c.boundingBox.x}%, Y:${c.boundingBox.y}%, W:${c.boundingBox.width}%, H:${c.boundingBox.height}%
    - Description: ${c.explanation}
    - Analyst Review Status: ${c.reviewed ? 'REVIEWED & VERIFIED' : 'PENDING REVIEW'}
    - Analyst Operational Notes: ${c.analystNotes || 'None entered'}
`
  )
  .join('')}

ANALYST OVERALL ASSESSMENT:
${currentObs.analystNotes || 'Preliminary imagery analysis complete. Awaiting ground verification.'}

LIMITATION NOTICE:
Data is synthetic and simulated for hackathon evaluation. Pixel differential highlights reflect candidate anomalies
and do not constitute validated combat identification or clinical/legal evidence.
================================================================================
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GeoIntel_Report_${currentObs.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setExportNotice(`Report exported: GeoIntel_Report_${currentObs.id}.txt`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const activeCandidate = currentObs?.candidates.find((c) => c.id === selectedCandidateId) || currentObs?.candidates[0];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        className="neu-card"
        style={{
          borderLeft: '4px solid var(--informational)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--informational)',
                }}
              >
                <Compass size={20} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                GeoIntel Reconnaissance & Change Detection
              </h2>
              <span className="badge-neu badge-neu-warn">SYNTHETIC SATELLITE IMAGERY</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.84rem', margin: '6px 0 0 0' }}>
              Multi-temporal reconnaissance imagery comparison with candidate change detection, anomaly classification,
              and analyst review workflow. Outputs are candidate regions requiring analyst confirmation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn-neu btn-neu-sm"
              onClick={() => setComparisonMode(comparisonMode === 'slider' ? 'side-by-side' : 'slider')}
              title="Toggle split view mode"
            >
              <Layers size={14} />
              <span>Mode: {comparisonMode === 'slider' ? 'Swipe Split' : 'Side-by-Side'}</span>
            </button>

            <button
              className="btn-neu btn-neu-primary btn-neu-sm"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
            >
              <Play size={14} />
              <span>{isAnalyzing ? `Analyzing (${analysisProgress}%)` : 'Run Image Difference'}</span>
            </button>

            <button
              className="btn-neu btn-neu-sm"
              onClick={handleExportReport}
              title="Export structured intelligence debrief"
            >
              <FileDown size={14} />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {exportNotice && (
          <div
            className="neu-inset"
            style={{
              padding: '8px 14px',
              color: 'var(--healthy)',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle size={15} />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left Viewer (2 spans), Right Candidate Inspector (1 span) */}
      <div className="grid grid-cols-3" style={{ alignItems: 'start' }}>
        {/* Left Column: Image Comparison Viewer */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="neu-card" style={{ padding: '1.25rem' }}>
            {/* Viewer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {currentObs.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--accent)' }}>
                    <MapPin size={13} />
                    {currentObs.zoneName}
                  </span>
                  <span>•</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>Res: {currentObs.resolutionMeters}m/px</span>
                  <span>•</span>
                  <span className={`badge-neu ${currentObs.reviewStatus === 'reviewed' ? 'badge-neu-ok' : 'badge-neu-warn'}`}>
                    {currentObs.reviewStatus.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Sensitivity Slider */}
              <div
                className="neu-inset"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.76rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <Sliders size={14} color="var(--accent)" />
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Threshold: {sensitivity}%</span>
                <input
                  type="range"
                  min="30"
                  max="90"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  style={{ width: '85px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Analysis Progress Bar */}
            {isAnalyzing && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '4px' }}>
                  <span>ALIGNING MULTI-SPECTRAL BANDS & RUNNING CONVOLUTION DIFFERENCE...</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{analysisProgress}%</span>
                </div>
                <div className="neu-inset" style={{ height: '8px', padding: '1px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${analysisProgress}%`,
                      background: 'var(--accent)',
                      borderRadius: 'var(--radius-pill)',
                      transition: 'width 0.15s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Interactive Image Split / Comparison Container */}
            {comparisonMode === 'slider' ? (
              <div
                className="neu-inset"
                style={{
                  position: 'relative',
                  height: '440px',
                  width: '100%',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  background: '#1A202C',
                }}
              >
                {/* Background Layer: Surveillance Image */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${currentObs.afterImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--border-subtle)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      boxShadow: 'var(--shadow-raised-sm)',
                    }}
                  >
                    SURVEILLANCE: {new Date(currentObs.captureDateAfter).toLocaleDateString()}
                  </div>
                </div>

                {/* Foreground Layer: Baseline Image (Clipped by slider position) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${currentObs.beforeImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--border-subtle)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      boxShadow: 'var(--shadow-raised-sm)',
                    }}
                  >
                    BASELINE: {new Date(currentObs.captureDateBefore).toLocaleDateString()}
                  </div>
                </div>

                {/* Vertical Divider Line with Tactile Neumorphic Handle */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${sliderPosition}%`,
                    width: '3px',
                    background: 'var(--accent)',
                    boxShadow: '0 0 10px rgba(70, 105, 168, 0.6)',
                    cursor: 'ew-resize',
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--surface-raised)',
                      boxShadow: 'var(--shadow-raised)',
                      border: '2px solid var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                      fontSize: '12px',
                      fontWeight: 800,
                      userSelect: 'none',
                    }}
                  >
                    ⇄
                  </div>
                </div>

                {/* Candidate Bounding Boxes Overlaid on Surveillance Side */}
                {currentObs.candidates.map((candidate) => {
                  const isSelected = selectedCandidateId === candidate.id;
                  const { x, y, width, height } = candidate.boundingBox;

                  return (
                    <div
                      key={candidate.id}
                      onClick={() => setSelectedCandidateId(candidate.id)}
                      style={{
                        position: 'absolute',
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        border: isSelected ? '2px solid #4669A8' : '2px dashed #A86B12',
                        background: isSelected ? 'rgba(70, 105, 168, 0.3)' : 'rgba(168, 107, 18, 0.2)',
                        cursor: 'pointer',
                        zIndex: 15,
                        transition: 'all 0.15s ease',
                      }}
                      title={`${candidate.label} (${(candidate.differenceScore * 100).toFixed(0)}% diff)`}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-22px',
                          left: 0,
                          background: isSelected ? 'var(--accent)' : 'var(--warning)',
                          color: '#FFFFFF',
                          padding: '1px 6px',
                          fontSize: '0.66rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          borderRadius: 'var(--radius-sm)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                        }}
                      >
                        {candidate.id} [{(candidate.differenceScore * 100).toFixed(0)}%]
                      </div>
                    </div>
                  );
                })}

                {/* Slider input control overlay */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '20%',
                    width: '60%',
                    accentColor: 'var(--accent)',
                    zIndex: 25,
                    cursor: 'ew-resize',
                  }}
                />
              </div>
            ) : (
              /* Side-by-Side Mode */
              <div className="grid grid-cols-2" style={{ height: '440px', gap: '12px' }}>
                <div
                  className="neu-inset"
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    backgroundImage: `url(${currentObs.beforeImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--border-subtle)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      boxShadow: 'var(--shadow-raised-sm)',
                    }}
                  >
                    BASELINE: {new Date(currentObs.captureDateBefore).toLocaleDateString()}
                  </div>
                </div>

                <div
                  className="neu-inset"
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    backgroundImage: `url(${currentObs.afterImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--border-subtle)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      boxShadow: 'var(--shadow-raised-sm)',
                    }}
                  >
                    SURVEILLANCE: {new Date(currentObs.captureDateAfter).toLocaleDateString()}
                  </div>

                  {/* Overlaid bounding boxes */}
                  {currentObs.candidates.map((candidate) => {
                    const isSelected = selectedCandidateId === candidate.id;
                    const { x, y, width, height } = candidate.boundingBox;
                    return (
                      <div
                        key={candidate.id}
                        onClick={() => setSelectedCandidateId(candidate.id)}
                        style={{
                          position: 'absolute',
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          border: isSelected ? '2px solid #4669A8' : '2px dashed #A86B12',
                          background: isSelected ? 'rgba(70, 105, 168, 0.3)' : 'rgba(168, 107, 18, 0.2)',
                          cursor: 'pointer',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Explanatory Disclaimer footer */}
            <div
              className="neu-inset"
              style={{
                marginTop: '14px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.76rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Info size={16} color="var(--informational)" style={{ flexShrink: 0 }} />
              <span>
                Pixel differences may stem from lighting changes, atmospheric distortion, shadows, or sensor angle.
                Detections are candidate anomalies requiring human analyst confirmation.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Candidate Inspector & Analyst Review Drawer */}
        <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="neu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                <Eye size={18} color="var(--accent)" />
                <span>Candidate Inspector</span>
              </div>
              <span className="badge-neu badge-neu-warn">
                {currentObs.candidates.filter((c) => !c.reviewed).length} UNREVIEWED
              </span>
            </div>

            {/* Candidate Selector Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
              {currentObs.candidates.map((can) => {
                const isSelected = activeCandidate?.id === can.id;
                return (
                  <button
                    key={can.id}
                    onClick={() => setSelectedCandidateId(can.id)}
                    className={`btn-neu btn-neu-sm ${isSelected ? 'btn-neu-primary' : ''}`}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                    }}
                  >
                    {can.id} {can.reviewed ? '✓' : ''}
                  </button>
                );
              })}
            </div>

            {activeCandidate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {activeCandidate.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', marginTop: '2px', fontWeight: 600 }}>
                    Type: {activeCandidate.anomalyType.replace('_', ' ')}
                  </div>
                </div>

                {/* Score & Confidence Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div className="neu-inset" style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>DIFF SCORE</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--warning)', marginTop: '2px' }}>
                      {(activeCandidate.differenceScore * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="neu-inset" style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CONFIDENCE</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)', marginTop: '2px' }}>
                      {(activeCandidate.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Algorithm Explanation
                  </div>
                  <div
                    className="neu-inset"
                    style={{
                      padding: '10px 12px',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                    }}
                  >
                    {activeCandidate.explanation}
                  </div>
                </div>

                {/* Analyst Notes Field */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Analyst Assessment Notes
                  </label>
                  <textarea
                    className="input-neu"
                    rows={3}
                    placeholder="Enter tactical confirmation notes, verification sources, or escalation requests..."
                    value={analystNotes}
                    onChange={(e) => setAnalystNotes(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`btn-neu ${activeCandidate.reviewed ? '' : 'btn-neu-primary'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleCandidateReview(activeCandidate.id, !activeCandidate.reviewed)}
                  >
                    <CheckCircle size={15} />
                    <span>{activeCandidate.reviewed ? 'Mark Unreviewed' : 'Confirm & Review'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem' }}>
                Select a candidate bounding box above to inspect anomaly details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
