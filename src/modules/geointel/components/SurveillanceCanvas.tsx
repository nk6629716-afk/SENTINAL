import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Activity,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  MapPin,
  Flame,
  Layers,
  Satellite,
  Compass,
} from 'lucide-react';
import { EnrichedChangeCandidate, SensorMetadata } from '../types';
import { convertToMGRS } from '../utils/geoUtils';

interface SurveillanceCanvasProps {
  isOpticalDiff: boolean;
  onToggleOpticalDiff: () => void;
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
  isOpticalDiff,
  onToggleOpticalDiff,
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
  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialPanX: number; initialPanY: number }>({
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Crosshair coordinate tracking
  const [cursorGeo, setCursorGeo] = useState<{
    lat: number;
    lng: number;
    mgrs: string;
    pixelX: number;
    pixelY: number;
  }>({
    lat: centerCoordinates.lat,
    lng: centerCoordinates.lng,
    mgrs: convertToMGRS(centerCoordinates.lat, centerCoordinates.lng),
    pixelX: 640,
    pixelY: 360,
  });

  // Clamp pan so scaled image never exposes empty background
  const getClampedPan = useCallback(
    (targetX: number, targetY: number, currentZoom: number) => {
      if (currentZoom <= 1 || !containerRef.current) {
        return { x: 0, y: 0 };
      }
      const rect = containerRef.current.getBoundingClientRect();
      const maxPanX = (rect.width * (currentZoom - 1)) / 2;
      const maxPanY = (rect.height * (currentZoom - 1)) / 2;

      const clampedX = Math.max(-maxPanX, Math.min(maxPanX, targetX));
      const clampedY = Math.max(-maxPanY, Math.min(maxPanY, targetY));
      return { x: clampedX, y: clampedY };
    },
    []
  );

  // Reset pan whenever zoom is returned to 1x
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(1, Math.min(4, Number(newZoom.toFixed(2))));
    setZoom(clampedZoom);
    if (clampedZoom === 1) {
      setPan({ x: 0, y: 0 });
    } else {
      setPan((prev) => getClampedPan(prev.x, prev.y, clampedZoom));
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom handling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    handleZoomChange(zoom + delta);
  };

  // Pointer drag panning (only active when zoom > 1)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return; // Drag disabled at default scale
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // If dragging at zoom > 1, update pan
    if (isPanning && zoom > 1) {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;
      const nextX = dragStartRef.current.initialPanX + deltaX;
      const nextY = dragStartRef.current.initialPanY + deltaY;
      setPan(getClampedPan(nextX, nextY, zoom));
    }

    // Update crosshair coordinates
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      const lat = centerCoordinates.lat + (0.5 - relY) * 0.018;
      const lng = centerCoordinates.lng + (relX - 0.5) * 0.024;
      const mgrs = convertToMGRS(lat, lng);

      setCursorGeo({
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
    setIsPanning(false);
  };

  // Keep pan clamped if container resizes
  useEffect(() => {
    const handleResize = () => {
      setPan((prev) => getClampedPan(prev.x, prev.y, zoom));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoom, getClampedPan]);

  const activeImageSrc = isOpticalDiff ? '/assets/terrain-blue.png' : '/assets/terrain-default.png';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
      }}
    >
      {/* 1. Tactical Command Header & Mode Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--bg-shell, #0D1412)',
          border: '1px solid var(--border-card, #263D37)',
          borderRadius: '10px',
          padding: '8px 16px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Left: Zone & Primary Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Satellite size={17} color="#00E676" />
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#F0FDF4', letterSpacing: '0.04em' }}>
              RECON SCOPE: <span style={{ color: '#00E676' }}>{targetZoneName.toUpperCase()}</span>
            </span>
          </div>

          <div style={{ height: '16px', width: '1px', background: 'var(--border-card, #263D37)' }} />

          {/* Mode Pill Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: isOpticalDiff ? 'rgba(255, 59, 92, 0.15)' : 'rgba(0, 230, 118, 0.15)',
              border: `1px solid ${isOpticalDiff ? '#FF3B5C' : '#00E676'}`,
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              color: isOpticalDiff ? '#FF3B5C' : '#00E676',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isOpticalDiff ? '#FF3B5C' : '#00E676',
                boxShadow: isOpticalDiff ? '0 0 8px #FF3B5C' : '0 0 8px #00E676',
              }}
            />
            <span>{isOpticalDiff ? 'OPTICAL DIFF (SAR HEATMAP ACTIVE)' : 'PRIMARY TERRAIN (DEFAULT TAN)'}</span>
          </div>
        </div>

        {/* Right: Optical Diff Toggle, Overlays, and Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Optical Diff / Heatmap Toggle Button */}
          <button
            onClick={onToggleOpticalDiff}
            style={{
              background: isOpticalDiff
                ? 'linear-gradient(135deg, #FF3B5C 0%, #D81B43 100%)'
                : 'rgba(255, 59, 92, 0.12)',
              border: `1px solid ${isOpticalDiff ? '#FF3B5C' : 'rgba(255, 59, 92, 0.35)'}`,
              color: isOpticalDiff ? '#060A09' : '#FF3B5C',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: isOpticalDiff ? '0 0 16px rgba(255, 59, 92, 0.45)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Flame size={15} />
            <span>OPTICAL DIFF: {isOpticalDiff ? 'ACTIVE' : 'OFF'}</span>
          </button>

          {/* Tactical Overlays Toggle */}
          <button
            onClick={onToggleOverlays}
            style={{
              background: showOverlays ? 'rgba(0, 230, 118, 0.15)' : 'var(--bg-control, #172622)',
              border: `1px solid ${showOverlays ? '#00E676' : 'var(--border-card, #263D37)'}`,
              color: showOverlays ? '#00E676' : 'var(--text-secondary, #869E96)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Eye size={14} />
            <span>OVERLAYS: {showOverlays ? 'ON' : 'OFF'}</span>
          </button>

          {/* Zoom Buttons & Readout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              background: 'var(--bg-control, #172622)',
              border: '1px solid var(--border-card, #263D37)',
              borderRadius: '6px',
              padding: '3px 6px',
            }}
          >
            <button
              onClick={() => handleZoomChange(zoom - 0.25)}
              disabled={zoom <= 1}
              title="Zoom Out"
              style={{
                background: 'transparent',
                border: 'none',
                color: zoom <= 1 ? '#546E66' : '#F0FDF4',
                cursor: zoom <= 1 ? 'not-allowed' : 'pointer',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ZoomOut size={15} />
            </button>

            <span
              style={{
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                color: zoom > 1 ? '#00E676' : '#F0FDF4',
                fontWeight: 800,
                padding: '0 6px',
                minWidth: '42px',
                textAlign: 'center',
              }}
            >
              {zoom.toFixed(1)}x
            </span>

            <button
              onClick={() => handleZoomChange(zoom + 0.25)}
              disabled={zoom >= 4}
              title="Zoom In"
              style={{
                background: 'transparent',
                border: 'none',
                color: zoom >= 4 ? '#546E66' : '#F0FDF4',
                cursor: zoom >= 4 ? 'not-allowed' : 'pointer',
                padding: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ZoomIn size={15} />
            </button>

            <button
              onClick={handleResetView}
              title="Reset Zoom to 1.0x & Center Viewport"
              style={{
                background: zoom > 1 ? 'rgba(0, 230, 118, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: zoom > 1 ? '#00E676' : '#546E66',
                cursor: 'pointer',
                padding: '3px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                marginLeft: '4px',
              }}
            >
              <Maximize2 size={12} />
              <span>1x</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Single 1280x720 Viewport Container with Clamped Pan & Heatmap Overlay Layer */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: '720px',
          background: 'var(--bg-canvas, #060A09)',
          border: '1px solid var(--border-card, #263D37)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), inset 0 0 80px rgba(0, 0, 0, 0.85)',
          userSelect: 'none',
          touchAction: 'none',
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'crosshair',
        }}
      >
        {/* UNIFIED TRANSFORM CONTAINER: Holds BOTH terrain image and heatmap overlay layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            transformOrigin: 'center center',
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
            transition: isPanning ? 'none' : 'transform 0.12s ease-out',
            willChange: 'transform',
          }}
        >
          {/* Base Terrain Image (Tan default OR Dark-Blue in Optical Diff mode) */}
          <img
            src={activeImageSrc}
            alt={isOpticalDiff ? 'Surveillance SAR Dark-Blue Terrain' : 'Baseline Tan Optical Terrain'}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              userSelect: 'none',
              WebkitUserDrag: 'none',
              filter: isOpticalDiff ? 'contrast(1.1) brightness(0.98)' : 'contrast(1.05) brightness(1.0)',
              pointerEvents: 'none',
            } as React.CSSProperties}
          />

          {/* Optical Diff / Thermal Heatmap Anomaly Overlay Layer (Active when isOpticalDiff is TRUE) */}
          {isOpticalDiff && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
              }}
            >
              {candidates.map((can) => {
                const { x, y, width, height } = can.boundingBox;
                // Center coordinate for the radial thermal blob
                const centerX = x + width / 2;
                const centerY = y + height / 2;

                return (
                  <div
                    key={`heat-${can.id}`}
                    style={{
                      position: 'absolute',
                      left: `${centerX}%`,
                      top: `${centerY}%`,
                      width: `${Math.max(14, width * 1.8)}%`,
                      aspectRatio: '1 / 1',
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle, rgba(239, 68, 68, 0.95) 0%, rgba(245, 158, 11, 0.8) 32%, rgba(234, 179, 8, 0.5) 55%, rgba(0, 240, 255, 0.2) 78%, transparent 100%)',
                      filter: 'blur(10px)',
                      mixBlendMode: 'screen',
                      pointerEvents: 'none',
                      animation: 'radar-blip-pulse 2.2s infinite ease-in-out',
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Interactive Candidate Bounding Boxes & Tags (Locked to terrain coordinates) */}
          {showOverlays && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
              }}
            >
              {candidates.map((can) => {
                const isSelected = selectedCandidateId === can.id;
                const { x, y, width, height } = can.boundingBox;

                let borderCol = '#FFB300'; // Amber default
                let bgTint = 'rgba(255, 179, 0, 0.18)';
                if (can.decision === 'confirmed_threat') {
                  borderCol = '#FF3B5C';
                  bgTint = 'rgba(255, 59, 92, 0.25)';
                } else if (can.decision === 'benign_false_positive') {
                  borderCol = '#00E676';
                  bgTint = 'rgba(0, 230, 118, 0.18)';
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
                      boxShadow: isSelected ? `0 0 18px ${borderCol}, inset 0 0 12px rgba(0, 240, 255, 0.4)` : `0 0 8px ${borderCol}`,
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

                    {/* Candidate Tag Header */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-24px',
                        left: '-2px',
                        background: borderCol,
                        color: '#FFFFFF',
                        padding: '2px 7px',
                        fontSize: '0.66rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 900,
                        letterSpacing: '0.04em',
                        borderRadius: '3px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
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
        </div>

        {/* 3. TACTICAL HUD OVERLAYS (Fixed to the Viewport) */}
        {/* Top-Left: Active Layer Metadata Chip */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'var(--bg-elevated, #1A2925)',
            backdropFilter: 'blur(6px)',
            border: `1px solid ${isOpticalDiff ? 'rgba(255, 59, 92, 0.4)' : 'var(--border-strong, #35544C)'}`,
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: '#869E96',
            pointerEvents: 'none',
            zIndex: 40,
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: isOpticalDiff ? '#FF3B5C' : '#F0FDF4' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isOpticalDiff ? '#FF3B5C' : '#00E676',
                boxShadow: isOpticalDiff ? '0 0 8px #FF3B5C' : '0 0 8px #00E676',
              }}
            />
            <span>{isOpticalDiff ? 'SAR HEATMAP PASS' : 'OPTICAL RECON BASELINE'}</span>
            <span style={{ color: isOpticalDiff ? '#FF3B5C' : '#00E676' }}>
              [{isOpticalDiff ? 'DARK-BLUE THERMAL' : 'DEFAULT TAN'}]
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '3px', fontSize: '0.66rem' }}>
            <span>GSD: 0.30m</span>
            <span>•</span>
            <span>SPECTRAL: {isOpticalDiff ? 'SWIR / RADIOMETRIC' : 'VNIR / OPTICAL'}</span>
            <span>•</span>
            <span>ANOMALIES: {candidates.length}</span>
          </div>
        </div>

        {/* Top-Right: Pan / Zoom HUD Status */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'var(--bg-elevated, #1A2925)',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--border-strong, #35544C)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            color: '#869E96',
            pointerEvents: 'none',
            zIndex: 40,
            textAlign: 'right',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', color: '#F0FDF4', fontWeight: 700 }}>
            <span>VIEWPORT:</span>
            <span style={{ color: zoom > 1 ? '#00E676' : '#869E96' }}>{zoom.toFixed(1)}x SCALE</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: '#546E66', marginTop: '2px' }}>
            {zoom > 1 ? (
              <span style={{ color: '#2DD4BF' }}>DRAG TO PAN • CLAMPED</span>
            ) : (
              <span>ZOOM IN TO PAN (WHEEL / BUTTONS)</span>
            )}
          </div>
        </div>

        {/* Bottom HUD: Real-time Cursor Coordinates & Military Grid Status */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'var(--bg-elevated, #1A2925)',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--border-strong, #35544C)',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            color: '#869E96',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'none',
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#00E676', fontWeight: 800 }}>
            <Crosshair size={13} />
            <span>MGRS: {cursorGeo.mgrs}</span>
          </div>
          <span>•</span>
          <span>LAT: {cursorGeo.lat.toFixed(5)}°N</span>
          <span>LNG: {cursorGeo.lng.toFixed(5)}°W</span>
          <span>•</span>
          <span style={{ color: '#546E66' }}>PIXEL: [{cursorGeo.pixelX}, {cursorGeo.pixelY}]</span>
        </div>
      </div>
    </div>
  );
};
