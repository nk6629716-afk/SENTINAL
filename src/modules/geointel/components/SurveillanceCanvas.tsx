import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Compass,
  Sliders,
  Layers,
  Crosshair,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  Satellite,
  Eye,
  Activity,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import {
  ComparisonViewMode,
  EnrichedChangeCandidate,
  SensorMetadata,
} from '../types';
import { convertToMGRS, formatTacticalTimestamp } from '../utils/geoUtils';

interface SurveillanceCanvasProps {
  viewMode: ComparisonViewMode;
  onViewModeChange: (mode: ComparisonViewMode) => void;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  baselineSensor: SensorMetadata;
  surveillanceSensor: SensorMetadata;
  candidates: EnrichedChangeCandidate[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidateId: string) => void;
  targetZoneName: string;
  centerCoordinates: { lat: number; lng: number };
  showOverlays: boolean;
  onToggleOverlays: () => void;
}

export const SurveillanceCanvas: React.FC<SurveillanceCanvasProps> = ({
  viewMode,
  onViewModeChange,
  beforeImageUrl,
  afterImageUrl,
  baselineSensor,
  surveillanceSensor,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  targetZoneName,
  centerCoordinates,
  showOverlays,
  onToggleOverlays,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // 0 to 100 percentage
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoverCoords, setHoverCoords] = useState<{
    lat: number;
    lng: number;
    mgrs: string;
    pixelX: number;
    pixelY: number;
  }>({
    lat: centerCoordinates.lat,
    lng: centerCoordinates.lng,
    mgrs: convertToMGRS(centerCoordinates.lat, centerCoordinates.lng),
    pixelX: 0,
    pixelY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [beforeLoadFailed, setBeforeLoadFailed] = useState(false);
  const [afterLoadFailed, setAfterLoadFailed] = useState(false);

  // Compute slider position from clientX with container bounding rect
  const updateSliderFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSliderPosition(Number(pct.toFixed(1)));
  }, []);

  // Pointer drag event handlers with pointer capture
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateSliderFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateSliderFromClientX(e.clientX);
    }

    // Update real-time crosshair HUD coordinates based on cursor offset
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      // Calculate approximate localized geodetic delta around target epicenter (+/- 0.01 deg AOI)
      const lat = centerCoordinates.lat + (0.5 - relY) * 0.018;
      const lng = centerCoordinates.lng + (relX - 0.5) * 0.024;
      const mgrs = convertToMGRS(lat, lng);

      setHoverCoords({
        lat,
        lng,
        mgrs,
        pixelX: Math.round(relX * 1280),
        pixelY: Math.round(relY * 720),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);
  };

  // Keyboard navigation for slider precision
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition((prev) => Math.max(0, prev - 2));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition((prev) => Math.min(100, prev + 2));
    } else if (e.key === 'Home') {
      setSliderPosition(0);
    } else if (e.key === 'End') {
      setSliderPosition(100);
    }
  };

  // Fallback high-tech vector satellite terrain generator if images are missing or offline
  const renderFallbackVectorMap = (isSurveillance: boolean) => (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1000 600"
      preserveAspectRatio="none"
      style={{
        display: 'block',
        background: isSurveillance ? '#0E1726' : '#0B101D',
      }}
    >
      <defs>
        <pattern id={`tactical-grid-${isSurveillance ? 'after' : 'before'}`} width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke={isSurveillance ? 'rgba(0, 240, 255, 0.08)' : 'rgba(148, 163, 184, 0.08)'} strokeWidth="1" />
          <circle cx="50" cy="50" r="1.5" fill={isSurveillance ? 'rgba(0, 240, 255, 0.2)' : 'rgba(148, 163, 184, 0.15)'} />
        </pattern>
      </defs>

      <rect width="1000" height="600" fill={`url(#tactical-grid-${isSurveillance ? 'after' : 'before'})`} />

      {/* Main road / river arterial */}
      <path
        d="M 120 580 C 280 440, 360 380, 500 320 C 640 260, 720 180, 880 40"
        fill="none"
        stroke={isSurveillance ? '#1E293B' : '#1F2937'}
        strokeWidth="28"
      />
      <path
        d="M 120 580 C 280 440, 360 380, 500 320 C 640 260, 720 180, 880 40"
        fill="none"
        stroke={isSurveillance ? '#334155' : '#374151'}
        strokeWidth="14"
        strokeDasharray="10 8"
      />

      {/* Secondary logistics spur */}
      <path d="M 500 320 L 780 460" fill="none" stroke="#1E293B" strokeWidth="16" />

      {/* Military compound / logistics footprints */}
      <rect x="260" y="160" width="140" height="110" rx="4" fill="#172033" stroke="#2D3B55" strokeWidth="2" />
      <rect x="290" y="185" width="45" height="30" fill="#243047" />
      <rect x="345" y="185" width="45" height="30" fill="#243047" />

      {/* Staging Area Delta */}
      <rect x="580" y="340" width="180" height="140" rx="4" fill="#141C2B" stroke="#243247" strokeWidth="2" />

      {/* Alterations visible ONLY on Surveillance side */}
      {isSurveillance && (
        <g>
          {/* Excavated earthen crater & berms */}
          <ellipse cx="330" cy="215" rx="38" ry="26" fill="rgba(239, 68, 68, 0.28)" stroke="#EF4444" strokeWidth="2" strokeDasharray="4 2" />
          <path d="M 315 200 L 345 230 M 345 200 L 315 230" stroke="#EF4444" strokeWidth="2" />

          {/* Heavy Transport Vehicles cluster */}
          <rect x="630" y="380" width="28" height="14" rx="2" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5" />
          <rect x="668" y="385" width="28" height="14" rx="2" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5" />
          <rect x="650" y="415" width="28" height="14" rx="2" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5" />

          {/* Defoliated forest spur */}
          <path d="M 460 480 Q 480 440 500 400" fill="none" stroke="#10B981" strokeWidth="8" strokeDasharray="6 4" />
        </g>
      )}

      {/* Tactical Coordinate Reticle Corners */}
      <path d="M 20 50 L 20 20 L 50 20" fill="none" stroke="#00F0FF" strokeWidth="2" />
      <path d="M 980 50 L 980 20 L 950 20" fill="none" stroke="#00F0FF" strokeWidth="2" />
      <path d="M 20 550 L 20 580 L 50 580" fill="none" stroke="#00F0FF" strokeWidth="2" />
      <path d="M 980 550 L 980 580 L 950 580" fill="none" stroke="#00F0FF" strokeWidth="2" />

      {/* Compass rose center mark */}
      <circle cx="500" cy="300" r="40" fill="none" stroke="rgba(0, 240, 255, 0.12)" strokeWidth="1" strokeDasharray="4 4" />
      <path d="M 500 250 L 500 350 M 450 300 L 550 300" stroke="rgba(0, 240, 255, 0.15)" strokeWidth="1" />
    </svg>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
      }}
    >
      {/* 1. Tactical Canvas Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          background: 'rgba(11, 15, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '8px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Satellite size={16} color="#00F0FF" />
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '0.04em' }}>
              SURVEILLANCE HUB: <span style={{ color: '#00F0FF' }}>{targetZoneName.toUpperCase()}</span>
            </span>
          </div>

          <div
            style={{
              height: '16px',
              width: '1px',
              background: 'rgba(255, 255, 255, 0.15)',
            }}
          />

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '2px',
            }}
          >
            <button
              onClick={() => onViewModeChange('swipe')}
              style={{
                background: viewMode === 'swipe' ? '#0284C7' : 'transparent',
                color: viewMode === 'swipe' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <Sliders size={13} />
              <span>SWIPE SPLIT</span>
            </button>

            <button
              onClick={() => onViewModeChange('side-by-side')}
              style={{
                background: viewMode === 'side-by-side' ? '#0284C7' : 'transparent',
                color: viewMode === 'side-by-side' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={13} />
              <span>SIDE-BY-SIDE</span>
            </button>

            <button
              onClick={() => onViewModeChange('heatmap')}
              style={{
                background: viewMode === 'heatmap' ? '#DC2626' : 'transparent',
                color: viewMode === 'heatmap' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <Activity size={13} />
              <span>OPTICAL DIFF</span>
            </button>
          </div>
        </div>

        {/* View Controls & Overlays Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onToggleOverlays}
            style={{
              background: showOverlays ? 'rgba(0, 240, 255, 0.12)' : 'rgba(0, 0, 0, 0.4)',
              border: `1px solid ${showOverlays ? '#00F0FF' : 'rgba(255, 255, 255, 0.1)'}`,
              color: showOverlays ? '#00F0FF' : '#94A3B8',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Eye size={13} />
            <span>OVERLAYS: {showOverlays ? 'ACTIVE' : 'MUTED'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              title="Zoom Out"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                borderRadius: '4px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#94A3B8', padding: '0 4px' }}>
              {(zoomLevel * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              title="Zoom In"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                borderRadius: '4px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              title="Reset Viewport"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                borderRadius: '4px',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginLeft: '4px',
              }}
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Central High-Precision Imagery Canvas */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        style={{
          position: 'relative',
          width: '100%',
          height: '520px',
          background: '#070B12',
          border: '1px solid #1E293B',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 100px rgba(0, 0, 0, 0.8)',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {/* VIEW MODE A: SWIPE SPLIT SLIDER */}
        {viewMode === 'swipe' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              cursor: isDragging ? 'ew-resize' : 'crosshair',
            }}
            onClick={(e) => {
              if (!isDragging) updateSliderFromClientX(e.clientX);
            }}
          >
            {/* 1. Underlying Layer: Surveillance (Post-Incident) Image */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.2s ease',
              }}
            >
              {afterImageUrl && !afterLoadFailed ? (
                <img
                  src={afterImageUrl}
                  alt="Surveillance Satellite Imagery"
                  onError={() => setAfterLoadFailed(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'contrast(1.08) brightness(0.96)',
                  }}
                />
              ) : (
                renderFallbackVectorMap(true)
              )}
            </div>

            {/* 2. Top Clamped Layer: Baseline (Pre-Incident) Image with Dynamic Inset Clip */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.2s ease',
                clipPath: `inset(0 calc(100% - ${sliderPosition}%) 0 0)`,
                WebkitClipPath: `inset(0 calc(100% - ${sliderPosition}%) 0 0)`,
                pointerEvents: 'none',
              }}
            >
              {beforeImageUrl && !beforeLoadFailed ? (
                <img
                  src={beforeImageUrl}
                  alt="Baseline Satellite Imagery"
                  onError={() => setBeforeLoadFailed(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'contrast(1.05) brightness(0.94)',
                  }}
                />
              ) : (
                renderFallbackVectorMap(false)
              )}
            </div>

            {/* 3. Candidate Bounding Boxes Overlaid on Imagery */}
            {showOverlays && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  pointerEvents: 'none',
                }}
              >
                {candidates.map((can) => {
                  const isSelected = selectedCandidateId === can.id;
                  const { x, y, width, height } = can.boundingBox;

                  let borderCol = '#F59E0B'; // Amber pending
                  let bgTint = 'rgba(245, 158, 11, 0.15)';
                  if (can.decision === 'confirmed_threat') {
                    borderCol = '#EF4444'; // Red alert
                    bgTint = 'rgba(239, 68, 68, 0.22)';
                  } else if (can.decision === 'benign_false_positive') {
                    borderCol = '#10B981'; // Green benign
                    bgTint = 'rgba(16, 185, 129, 0.15)';
                  }

                  return (
                    <div
                      key={can.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCandidate(can.id);
                      }}
                      style={{
                        position: 'absolute',
                        left: `${x}%`,
                        top: `${y}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                        border: `2px solid ${borderCol}`,
                        background: isSelected ? 'rgba(0, 240, 255, 0.35)' : bgTint,
                        boxShadow: isSelected ? `0 0 16px ${borderCol}, inset 0 0 10px rgba(0, 240, 255, 0.4)` : 'none',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        transition: 'all 0.15s ease',
                        zIndex: isSelected ? 30 : 20,
                      }}
                    >
                      {/* Tactical Reticle Corner Marks */}
                      <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '8px', height: '8px', borderTop: `2px solid ${borderCol}`, borderLeft: `2px solid ${borderCol}` }} />
                      <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderTop: `2px solid ${borderCol}`, borderRight: `2px solid ${borderCol}` }} />
                      <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '8px', height: '8px', borderBottom: `2px solid ${borderCol}`, borderLeft: `2px solid ${borderCol}` }} />
                      <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '8px', height: '8px', borderBottom: `2px solid ${borderCol}`, borderRight: `2px solid ${borderCol}` }} />

                      {/* Header Badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-24px',
                          left: '-2px',
                          background: borderCol,
                          color: '#FFFFFF',
                          padding: '2px 6px',
                          fontSize: '0.66rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          borderRadius: '3px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{can.id}</span>
                        <span>•</span>
                        <span>{(can.differenceScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. The Interactive High-Precision Divider Slider */}
            <div
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              role="slider"
              aria-valuenow={sliderPosition}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Before and After Imagery Split Slider"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${sliderPosition}%`,
                width: '12px',
                transform: 'translateX(-50%)',
                cursor: 'ew-resize',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'none',
              }}
            >
              {/* Neon Divider Line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: '#00F0FF',
                  boxShadow: '0 0 12px #00F0FF, 0 0 24px rgba(0, 240, 255, 0.4)',
                }}
              />

              {/* Tactical Diamond Reticle Handle */}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(11, 15, 23, 0.95)',
                  border: '2px solid #00F0FF',
                  boxShadow: '0 0 14px rgba(0, 240, 255, 0.6), inset 0 0 8px rgba(0, 240, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00F0FF',
                  fontSize: '13px',
                  fontWeight: 900,
                  transition: 'transform 0.1s ease',
                  transform: isDragging ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                ⇄
              </div>

              {/* Floating Percentage Indicator */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  background: 'rgba(11, 15, 23, 0.92)',
                  border: '1px solid #00F0FF',
                  color: '#00F0FF',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                {sliderPosition.toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE B: SIDE-BY-SIDE SYNCHRONIZED SPLIT */}
        {viewMode === 'side-by-side' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2px',
              background: '#1E293B',
            }}
          >
            {/* Left Column: Baseline */}
            <div style={{ position: 'relative', overflow: 'hidden', background: '#070B12' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
              >
                {beforeImageUrl && !beforeLoadFailed ? (
                  <img
                    src={beforeImageUrl}
                    alt="Baseline"
                    onError={() => setBeforeLoadFailed(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  renderFallbackVectorMap(false)
                )}
              </div>
            </div>

            {/* Right Column: Surveillance with Candidates */}
            <div style={{ position: 'relative', overflow: 'hidden', background: '#070B12' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
              >
                {afterImageUrl && !afterLoadFailed ? (
                  <img
                    src={afterImageUrl}
                    alt="Surveillance"
                    onError={() => setAfterLoadFailed(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  renderFallbackVectorMap(true)
                )}

                {/* Overlaid bounding boxes */}
                {showOverlays &&
                  candidates.map((can) => {
                    const isSelected = selectedCandidateId === can.id;
                    const { x, y, width, height } = can.boundingBox;
                    const col = can.decision === 'confirmed_threat' ? '#EF4444' : can.decision === 'benign_false_positive' ? '#10B981' : '#F59E0B';

                    return (
                      <div
                        key={can.id}
                        onClick={() => onSelectCandidate(can.id)}
                        style={{
                          position: 'absolute',
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          border: `2px solid ${col}`,
                          background: isSelected ? 'rgba(0, 240, 255, 0.3)' : 'rgba(245, 158, 11, 0.15)',
                          cursor: 'pointer',
                          zIndex: 20,
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE C: OPTICAL DIFF HEATMAP */}
        {viewMode === 'heatmap' && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}>
              {afterImageUrl && !afterLoadFailed ? (
                <img
                  src={afterImageUrl}
                  alt="Heatmap Base"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'grayscale(0.85) contrast(1.4) brightness(0.6)',
                  }}
                />
              ) : (
                renderFallbackVectorMap(true)
              )}

              {/* Glowing thermal heat signature overlay */}
              {candidates.map((can) => {
                const { x, y, width, height } = can.boundingBox;
                return (
                  <div
                    key={can.id}
                    onClick={() => onSelectCandidate(can.id)}
                    style={{
                      position: 'absolute',
                      left: `${x - 2}%`,
                      top: `${y - 2}%`,
                      width: `${width + 4}%`,
                      height: `${height + 4}%`,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(239, 68, 68, 0.85) 0%, rgba(245, 158, 11, 0.6) 40%, rgba(0, 240, 255, 0.2) 75%, transparent 100%)',
                      filter: 'blur(8px)',
                      mixBlendMode: 'screen',
                      cursor: 'pointer',
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 5. TACTICAL HUD METADATA OVERLAYS (Clipped over the canvas) */}
        {/* Top-Left: Baseline Imagery Metadata Chip */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(11, 15, 23, 0.88)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: '#94A3B8',
            pointerEvents: 'none',
            zIndex: 35,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#F1F5F9' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94A3B8' }} />
            <span>BASELINE PASS</span>
            <span style={{ color: '#00F0FF' }}>[{baselineSensor.platform}]</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '3px', fontSize: '0.66rem' }}>
            <span>DATE: {formatTacticalTimestamp(baselineSensor.captureTimestamp)}</span>
            <span>•</span>
            <span>GSD: {baselineSensor.resolutionGsd}</span>
            <span>•</span>
            <span>CLOUD: {baselineSensor.cloudCoverPct}%</span>
          </div>
        </div>

        {/* Top-Right: Surveillance Imagery Metadata Chip */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(11, 15, 23, 0.88)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: '#94A3B8',
            pointerEvents: 'none',
            zIndex: 35,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            textAlign: 'right',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', fontWeight: 800, color: '#00F0FF' }}>
            <span>SURVEILLANCE PASS</span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F0FF', boxShadow: '0 0 6px #00F0FF' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '3px', fontSize: '0.66rem', justifyContent: 'flex-end' }}>
            <span>DATE: {formatTacticalTimestamp(surveillanceSensor.captureTimestamp)}</span>
            <span>•</span>
            <span>SENSOR: {surveillanceSensor.sensorId}</span>
            <span>•</span>
            <span>GSD: {surveillanceSensor.resolutionGsd}</span>
          </div>
        </div>

        {/* Bottom HUD: Real-time Cursor Coordinates & Military Grid Status */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'rgba(11, 15, 23, 0.88)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'none',
            zIndex: 35,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#00F0FF', fontWeight: 700 }}>
            <Crosshair size={13} />
            <span>MGRS: {hoverCoords.mgrs}</span>
          </div>
          <span>•</span>
          <span>LAT: {hoverCoords.lat.toFixed(5)}°N</span>
          <span>LNG: {hoverCoords.lng.toFixed(5)}°W</span>
          <span>•</span>
          <span style={{ color: '#64748B' }}>PIXEL: [{hoverCoords.pixelX}, {hoverCoords.pixelY}]</span>
        </div>
      </div>
    </div>
  );
};
