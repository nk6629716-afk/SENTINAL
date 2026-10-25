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
  RotateCcw,
  Eye,
  Info,
  Calendar,
  MapPin,
  ChevronRight,
  Maximize2,
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
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          borderLeft: '4px solid var(--accent-cyan)',
          background: 'linear-gradient(90deg, rgba(14, 20, 36, 0.9) 0%, rgba(10, 16, 28, 0.8) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={22} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.25rem' }}>GeoIntel Geospatial Reconnaissance & Change Detection</h2>
              <span className="badge badge-simulated">SYNTHETIC SATELLITE IMAGERY</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}>
              Multi-temporal reconnaissance imagery comparison with candidate change detection, anomaly classification,
              and analyst review workflow. Outputs are candidate regions requiring analyst confirmation.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setComparisonMode(comparisonMode === 'slider' ? 'side-by-side' : 'slider')}
            >
              <Layers size={14} />
              <span>Mode: {comparisonMode === 'slider' ? 'Swipe Split' : 'Side-by-Side'}</span>
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
            >
              <Play size={14} />
              <span>{isAnalyzing ? `Analyzing (${analysisProgress}%)` : 'Run Image Difference'}</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
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
            style={{
              marginTop: '0.75rem',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--status-nominal)',
              color: '#86efac',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle size={14} />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left Viewer (2 spans), Right Candidate Inspector (1 span) */}
      <div className="grid grid-cols-3">
        {/* Left Column: Image Comparison Viewer */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            {/* Viewer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: '#ffffff' }}>{currentObs.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="var(--accent-cyan)" />
                    {currentObs.zoneName}
                  </span>
                  <span>•</span>
                  <span>Resolution: {currentObs.resolutionMeters}m/pixel</span>
                  <span>•</span>
                  <span style={{ color: currentObs.reviewStatus === 'reviewed' ? 'var(--status-nominal)' : 'var(--status-warning)' }}>
                    Status: {currentObs.reviewStatus.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Sensitivity Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                <Sliders size={14} color="var(--accent-cyan)" />
                <span style={{ color: 'var(--text-secondary)' }}>Threshold: {sensitivity}%</span>
                <input
                  type="range"
                  min="30"
                  max="90"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  style={{ width: '80px', accentColor: '#00f2fe' }}
                />
              </div>
            </div>

            {/* Analysis Progress Bar */}
            {isAnalyzing && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  <span>ALIGNING MULTI-SPECTRAL BANDS & RUNNING CONVOLUTION DIFFERENCE...</span>
                  <span>{analysisProgress}%</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${analysisProgress}%`, background: 'var(--accent-cyan)', transition: 'width 0.15s ease' }} />
                </div>
              </div>
            )}

            {/* Interactive Image Split / Comparison Container */}
            {comparisonMode === 'slider' ? (
              <div
                style={{
                  position: 'relative',
                  height: '420px',
                  width: '100%',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                  background: '#070a12',
                }}
              >
                {/* Background Layer: After Image */}
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
                      background: 'rgba(10, 16, 28, 0.85)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-cyan)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    SURVEILLANCE: {new Date(currentObs.captureDateAfter).toLocaleDateString()}
                  </div>
                </div>

                {/* Foreground Layer: Before Image (Clipped by slider position) */}
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
                      background: 'rgba(10, 16, 28, 0.85)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    BASELINE: {new Date(currentObs.captureDateBefore).toLocaleDateString()}
                  </div>
                </div>

                {/* Vertical Divider Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${sliderPosition}%`,
                    width: '3px',
                    background: 'var(--accent-cyan)',
                    boxShadow: '0 0 12px var(--accent-cyan)',
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
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#070a12',
                      fontSize: '11px',
                      fontWeight: 800,
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
                        border: isSelected ? '2px solid var(--accent-cyan)' : '2px dashed #f59e0b',
                        background: isSelected ? 'rgba(0, 242, 254, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                        cursor: 'pointer',
                        zIndex: 15,
                        transition: 'all 0.15s ease',
                      }}
                      title={`${candidate.label} (${(candidate.differenceScore * 100).toFixed(0)}% diff)`}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-20px',
                          left: 0,
                          background: isSelected ? 'var(--accent-cyan)' : '#f59e0b',
                          color: '#070a12',
                          padding: '1px 6px',
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          borderRadius: '2px',
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
                    accentColor: '#00f2fe',
                    zIndex: 25,
                    cursor: 'ew-resize',
                  }}
                />
              </div>
            ) : (
              /* Side-by-Side Mode */
              <div className="grid grid-cols-2" style={{ height: '420px' }}>
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-subtle)',
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
                      background: 'rgba(10, 16, 28, 0.85)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    BASELINE: {new Date(currentObs.captureDateBefore).toLocaleDateString()}
                  </div>
                </div>

                <div
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-subtle)',
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
                      background: 'rgba(10, 16, 28, 0.85)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-cyan)',
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
                          border: isSelected ? '2px solid var(--accent-cyan)' : '2px dashed #f59e0b',
                          background: isSelected ? 'rgba(0, 242, 254, 0.2)' : 'rgba(245, 158, 11, 0.15)',
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
              style={{
                marginTop: '12px',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Info size={14} color="var(--accent-cyan)" />
              <span>
                Pixel differences may stem from lighting changes, atmospheric distortion, shadows, or sensor angle.
                Detections are candidate anomalies requiring human verification.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Candidate Inspector & Analyst Review Drawer */}
        <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Eye size={18} color="var(--accent-cyan)" />
                <span>Candidate Inspector</span>
              </div>
              <span className="badge badge-warning">
                {currentObs.candidates.filter((c) => !c.reviewed).length} UNREVIEWED
              </span>
            </div>

            {/* Candidate Selector Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto' }}>
              {currentObs.candidates.map((can) => {
                const isSelected = activeCandidate?.id === can.id;
                return (
                  <button
                    key={can.id}
                    onClick={() => setSelectedCandidateId(can.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--accent-cyan)' : 'rgba(21, 30, 52, 0.8)',
                      color: isSelected ? '#070a12' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {can.id} {can.reviewed ? '✓' : ''}
                  </button>
                );
              })}
            </div>

            {activeCandidate ? (
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                    {activeCandidate.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-cyan)', textTransform: 'uppercase', marginTop: '2px' }}>
                    Type: {activeCandidate.anomalyType.replace('_', ' ')}
                  </div>
                </div>

                {/* Score & Confidence Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div style={{ padding: '8px', background: 'rgba(7, 10, 18, 0.7)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>DIFF SCORE</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b' }}>
                      {(activeCandidate.differenceScore * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div style={{ padding: '8px', background: 'rgba(7, 10, 18, 0.7)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>CONFIDENCE</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {(activeCandidate.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div style={{ marginBottom: '12px' }}>
                  <div className="form-label">Algorithm Explanation</div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {activeCandidate.explanation}
                  </p>
                </div>

                {/* Analyst Notes Field */}
                <div className="form-group">
                  <label className="form-label">Analyst Assessment Notes</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Enter tactical confirmation notes, verification sources, or escalation requests..."
                    value={analystNotes}
                    onChange={(e) => setAnalystNotes(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`btn btn-sm ${activeCandidate.reviewed ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleCandidateReview(activeCandidate.id, !activeCandidate.reviewed)}
                  >
                    <CheckCircle size={14} />
                    <span>{activeCandidate.reviewed ? 'Mark Unreviewed' : 'Confirm & Review'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1.5rem' }}>
                Select a candidate bounding box above to inspect anomaly details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
