import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  IncidentReport,
  TelemetryTrack,
  RestrictedAirspaceZone,
  RoadHazardEdge,
  EvacuationNode,
  CalculatedRoute,
  SharedMapMarker,
} from '@shared/types';
import {
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  Crosshair,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { themeService, ResolvedTheme } from '../services/theme/themeService';
import { classifyTrack, TRACK_CLASSIFICATION_LABELS } from '../utils/trackClassification';
import { formatAltitude, formatSpeed } from '../utils/units';

export interface TacticalMapProps {
  incidents?: IncidentReport[];
  tracks?: TelemetryTrack[];
  zones?: RestrictedAirspaceZone[];
  nodes?: EvacuationNode[];
  edges?: RoadHazardEdge[];
  markers?: SharedMapMarker[];
  activeRoute?: CalculatedRoute | null;
  selectedEntityId?: string | null;
  onSelectEntity?: (entity: { type: string; id: string; raw: any }) => void;
  height?: string;
  showRadarSweep?: boolean;
  initialMode?: 'chart' | 'radar' | 'thermal';
  topLeftContent?: React.ReactNode;
  bottomLeftContent?: React.ReactNode;
  topRightContent?: React.ReactNode;
  activeMode?: 'chart' | 'radar' | 'thermal';
  onModeChange?: (mode: 'chart' | 'radar' | 'thermal') => void;
}

/**
 * Calculates dynamic callout box offset and leader anchor.
 * If target position is within 15% of the outer radar/map radius,
 * flips or offsets its text callout box inward toward the center point.
 */
function calculateCalloutPosition(
  pos: { x: number; y: number },
  center: { x: number; y: number },
  radius: number,
  boxW: number,
  boxH: number
) {
  const dx = pos.x - center.x;
  const dy = pos.y - center.y;
  const dist = Math.hypot(dx, dy);

  // Check if within 15% of outer radar radius or near SVG canvas boundaries
  const threshold = 0.85 * radius;
  const isNearEdge =
    dist >= threshold ||
    pos.x < 110 ||
    pos.x > 890 ||
    pos.y < 80 ||
    pos.y > 600;

  if (isNearEdge && dist > 1) {
    // Inward flip toward center point
    const flipLeft = dx > 0;
    const flipTop = dy > 0;

    const offsetX = flipLeft ? -boxW - 14 : 14;
    const offsetY = flipTop ? -boxH - 8 : 12;
    const anchorX = flipLeft ? boxW : 0;
    const anchorY = flipTop ? boxH : 0;

    return {
      offsetX,
      offsetY,
      anchorX,
      anchorY,
      isClamped: true,
    };
  }

  // Standard military FDB offset (top-right callout)
  return {
    offsetX: 16,
    offsetY: -22,
    anchorX: -8,
    anchorY: 16,
    isClamped: false,
  };
}

interface StaticRadarScopeBezelProps {
  centerPt: { x: number; y: number };
  scopeRadius: number;
  radarMode: 'ppi' | 'flir' | 'topo';
  showTerrain: boolean;
  showRangeRings: boolean;
  isLight?: boolean;
}

const StaticRadarScopeBezel = React.memo<StaticRadarScopeBezelProps>(({
  centerPt,
  scopeRadius,
  radarMode,
  showTerrain,
  showRangeRings,
  isLight = false,
}) => {
  return (
    <>
      {/* Scope Outer Housing Bezel & Instrument Rim */}
      <g pointerEvents="none">
        <rect width="1000" height="680" fill={isLight ? '#EBF0E8' : 'url(#radar-drafting-grid)'} />
        <circle
          cx={centerPt.x}
          cy={centerPt.y}
          r={scopeRadius + 14}
          fill={isLight ? '#DFE7DC' : '#090E17'}
          stroke={isLight ? 'rgba(11, 93, 130, 0.4)' : 'rgba(56, 189, 248, 0.3)'}
          strokeWidth="2.5"
        />
        {Array.from({ length: 24 }).map((_, i) => {
          const deg = i * 15;
          const isMajor = deg % 30 === 0;
          const rad = (deg * Math.PI) / 180;
          const rInner = scopeRadius + (isMajor ? 4 : 8);
          const rOuter = scopeRadius + 14;
          const x1 = centerPt.x + Math.sin(rad) * rInner;
          const y1 = centerPt.y - Math.cos(rad) * rInner;
          const x2 = centerPt.x + Math.sin(rad) * rOuter;
          const y2 = centerPt.y - Math.cos(rad) * rOuter;
          return (
            <line
              key={`tick-${deg}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={
                isMajor
                  ? (isLight ? '#0B5D82' : '#00F2FE')
                  : (isLight ? 'rgba(11, 93, 130, 0.35)' : 'rgba(0, 242, 254, 0.3)')
              }
              strokeWidth={isMajor ? 1.5 : 0.8}
            />
          );
        })}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const labelR = scopeRadius + 26;
          const x = centerPt.x + Math.sin(rad) * labelR;
          const y = centerPt.y - Math.cos(rad) * labelR + 3.5;
          const label = deg === 0 ? 'N 000°' : deg === 90 ? 'E 090°' : deg === 180 ? 'S 180°' : 'W 270°';
          const color = isLight ? '#0B5D82' : '#00F2FE';
          return (
            <text
              key={`az-deg-${deg}`}
              x={x}
              y={y}
              fill={color}
              fontSize="9"
              fontFamily="var(--font-mono, monospace)"
              fontWeight="800"
              textAnchor="middle"
            >
              {label}
            </text>
          );
        })}
      </g>
      <circle
        cx={centerPt.x}
        cy={centerPt.y}
        r={scopeRadius}
        fill={radarMode === 'flir' ? 'url(#flir-gradient)' : isLight ? 'url(#crt-glass-gradient-light)' : 'url(#crt-glass-gradient)'}
      />
      {!isLight && (
        <rect
          x={centerPt.x - scopeRadius}
          y={centerPt.y - scopeRadius}
          width={scopeRadius * 2}
          height={scopeRadius * 2}
          fill="url(#radar-scanlines)"
          pointerEvents="none"
        />
      )}
      {showTerrain && (
        <g opacity={radarMode === 'flir' ? 0.25 : isLight ? 0.28 : 0.16} pointerEvents="none">
          <path d="M 160,420 Q 320,360 480,380 T 680,320 T 840,300 T 960,330" fill="none" stroke={radarMode === 'flir' ? '#EF4444' : isLight ? '#0284C7' : '#00F2FE'} strokeWidth="1.2" strokeDasharray="6,4" />
          <path d="M 120,500 Q 300,450 510,480 T 740,420 T 920,460" fill="none" stroke={radarMode === 'flir' ? '#EF4444' : isLight ? '#0284C7' : '#00F2FE'} strokeWidth="1" strokeDasharray="4,6" />
          <path d="M 280,200 Q 440,150 620,180 T 840,160" fill="none" stroke={radarMode === 'flir' ? '#EF4444' : isLight ? '#0284C7' : '#00F2FE'} strokeWidth="0.8" strokeDasharray="3,5" />
        </g>
      )}
      {showRangeRings && (
        <g pointerEvents="none">
          {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
            const r = scopeRadius * ratio;
            const km = (idx + 1) * 5;
            const nm = ((idx + 1) * 2.7).toFixed(1);
            return (
              <g key={`ring-${idx}`}>
                <circle cx={centerPt.x} cy={centerPt.y} r={r} fill="none" stroke={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.25)' : isLight ? 'rgba(11, 93, 130, 0.45)' : 'rgba(0, 242, 254, 0.22)'} strokeWidth={ratio === 1.0 ? '1.5' : '1'} strokeDasharray={ratio === 1.0 ? undefined : '4,6'} />
                <text x={centerPt.x + r + 5} y={centerPt.y - 4} fill={radarMode === 'flir' ? '#FCA5A5' : isLight ? '#0B5D82' : '#7DD3FC'} fontSize="8.5" fontFamily="var(--font-mono, monospace)" fontWeight="700">
                  {km}KM / {nm}NM
                </text>
                <text x={centerPt.x - r - 5} y={centerPt.y - 4} fill={radarMode === 'flir' ? '#FCA5A5' : isLight ? '#0B5D82' : '#7DD3FC'} fontSize="8.5" fontFamily="var(--font-mono, monospace)" fontWeight="700" textAnchor="end">
                  {km}KM
                </text>
              </g>
            );
          })}
          <line x1={centerPt.x - scopeRadius} y1={centerPt.y} x2={centerPt.x + scopeRadius} y2={centerPt.y} stroke={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.35)' : isLight ? 'rgba(11, 93, 130, 0.45)' : 'rgba(0, 242, 254, 0.28)'} strokeWidth="1" />
          <line x1={centerPt.x} y1={centerPt.y - scopeRadius} x2={centerPt.x} y2={centerPt.y + scopeRadius} stroke={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.35)' : isLight ? 'rgba(11, 93, 130, 0.45)' : 'rgba(0, 242, 254, 0.28)'} strokeWidth="1" />
          {[-220, -165, -110, -55, 55, 110, 165, 220].map((offset) => (
            <g key={`mil-${offset}`}>
              <line x1={centerPt.x + offset} y1={centerPt.y - 3} x2={centerPt.x + offset} y2={centerPt.y + 3} stroke={isLight ? 'rgba(11, 93, 130, 0.5)' : 'rgba(0, 242, 254, 0.5)'} strokeWidth="1" />
              <line x1={centerPt.x - 3} y1={centerPt.y + offset} x2={centerPt.x + 3} y2={centerPt.y + offset} stroke={isLight ? 'rgba(11, 93, 130, 0.5)' : 'rgba(0, 242, 254, 0.5)'} strokeWidth="1" />
            </g>
          ))}
          {Array.from({ length: 12 }).map((_, i) => {
            const deg = i * 30;
            if (deg % 90 === 0) return null;
            const rad = (deg * Math.PI) / 180;
            return (
              <line key={`rad-spoke-${deg}`} x1={centerPt.x} y1={centerPt.y} x2={centerPt.x + Math.sin(rad) * scopeRadius} y2={centerPt.y - Math.cos(rad) * scopeRadius} stroke={isLight ? 'rgba(11, 93, 130, 0.18)' : 'rgba(0, 242, 254, 0.12)'} strokeWidth="0.8" strokeDasharray="2,6" />
            );
          })}
        </g>
      )}
    </>
  );
});

export const TacticalMap: React.FC<TacticalMapProps> = ({
  incidents = [],
  tracks = [],
  zones = [],
  nodes = [],
  edges = [],
  markers = [],
  activeRoute = null,
  selectedEntityId = null,
  onSelectEntity,
  height = '100%',
  showRadarSweep = true,
  initialMode = 'chart',
  topLeftContent,
  bottomLeftContent,
  topRightContent,
  activeMode,
  onModeChange,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [sweepActive] = useState(showRadarSweep);

  const [internalMode, setInternalMode] = useState<'topo' | 'ppi' | 'flir'>(
    initialMode === 'radar' ? 'ppi' : initialMode === 'thermal' ? 'flir' : 'topo'
  );

  const radarMode = activeMode
    ? activeMode === 'radar'
      ? 'ppi'
      : activeMode === 'thermal'
      ? 'flir'
      : 'topo'
    : internalMode;

  const handleSetMode = (mode: 'topo' | 'ppi' | 'flir') => {
    setInternalMode(mode);
    if (onModeChange) {
      onModeChange(mode === 'ppi' ? 'radar' : mode === 'flir' ? 'thermal' : 'chart');
    }
  };

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mouseCoord, setMouseCoord] = useState<{ lat: string; lng: string; elev: string }>({
    lat: '34.0832° N',
    lng: '118.2050° W',
    elev: '87m MSL',
  });

  const [activeLayers, setActiveLayers] = useState({
    incidents: true,
    airspace: true,
    zones: true,
    routes: true,
    grid: true,
    rangeRings: true,
    terrain: true,
  });

  // Collapsible Layers dropdown state (expands upward)
  const [isLayersOpen, setIsLayersOpen] = useState(false);

  // Appearance & Theme Subscription (Light / Dark tactical scope)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => themeService.getResolvedTheme());

  useEffect(() => {
    return themeService.subscribe((_mode, resolved) => {
      setResolvedTheme(resolved);
    });
  }, []);

  const isLight = resolvedTheme === 'light';

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Wheel Scrolling Zoom Handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.14 : 0.88;
      setZoom((z) => Math.min(Math.max(Number((z * zoomFactor).toFixed(3)), 0.4), 4.5));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Map and radar resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    let rAFId: number;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(() => {});
    });

    observer.observe(container);

    const handleTransitionEnd = () => {
      cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(() => {});
    };

    window.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rAFId);
      window.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, []);

  // Center coordinate around Los Angeles Tactical Sector Demo: ~34.060, -118.245
  const centerLat = 34.060;
  const centerLng = -118.245;
  const scale = 11000 * zoom;

  const project = useCallback(
    (lat: number, lng: number) => {
      const x = 500 + (lng - centerLng) * scale + pan.x;
      const y = 350 - (lat - centerLat) * scale + pan.y;
      return { x, y };
    },
    [scale, pan.x, pan.y]
  );

  const unproject = useCallback(
    (x: number, y: number) => {
      const lng = centerLng + (x - 500 - pan.x) / scale;
      const lat = centerLat - (y - 350 - pan.y) / scale;
      return { lat, lng };
    },
    [scale, pan.x, pan.y]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = svgRef.current || containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * 1000;
      const svgY = ((e.clientY - rect.top) / rect.height) * 680;
      const geo = unproject(svgX, svgY);
      setMouseCoord({
        lat: `${geo.lat.toFixed(4)}° N`,
        lng: `${Math.abs(geo.lng).toFixed(4)}° W`,
        elev: `${Math.round(75 + Math.sin(geo.lat * 100) * 40)}m MSL`,
      });
    }

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch Support: One-finger pan & Two-finger pinch zoom
  const touchStateRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStateRef.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStateRef.current = { x: pan.x, y: pan.y, dist: Math.hypot(dx, dy) };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setPan({
        x: t.clientX - touchStateRef.current.x,
        y: t.clientY - touchStateRef.current.y,
      });
    } else if (e.touches.length === 2 && touchStateRef.current.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scaleFactor = dist / touchStateRef.current.dist;
      touchStateRef.current.dist = dist;
      setZoom((z) => Math.min(Math.max(Number((z * scaleFactor).toFixed(3)), 0.4), 4.5));
    }
  };

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const centerPt = { x: 500 + pan.x, y: 350 + pan.y };
  const scopeRadius = 275 * zoom;

  // Radar sweep wedge geometry calculation
  const createSweepWedgePath = (cx: number, cy: number, r: number, startAngleDeg: number, sweepAngleDeg: number) => {
    const rad1 = (startAngleDeg * Math.PI) / 180;
    const rad2 = ((startAngleDeg + sweepAngleDeg) * Math.PI) / 180;
    const x1 = cx - Math.sin(rad1) * r;
    const y1 = cy - Math.cos(rad1) * r;
    const x2 = cx - Math.sin(rad2) * r;
    const y2 = cy - Math.cos(rad2) * r;
    return `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 0,0 ${x2},${y2} Z`;
  };

  const computedHeight = isFullscreen ? '100vh' : height;

  return (
    <div
      ref={containerRef}
      className="map-container"
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 0 : undefined,
        bottom: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : 1,
        height: computedHeight,
        width: '100%',
        backgroundColor: isLight
          ? (radarMode === 'ppi' ? '#EBF0E8' : '#F1F5ED')
          : (radarMode === 'ppi' ? '#040202' : '#080D1A'),
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.25s ease',
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => {}}
    >
      {/* 4-Region Map Grid Overlay Layer */}
      <div className="map-overlay-layer">
        {/* Top-Left: Metrics & Mode Switch in ONE Unified Flex Toolbar */}
        <div className="map-overlay-tl">
          {topLeftContent}

          {/* Mode Switcher Segmented Control (Chart and Radar ONLY) */}
          <div
            style={{
              display: 'inline-flex',
              border: 'var(--border-width, 1.2px) solid var(--color-edge)',
              boxShadow: 'var(--shadow-flat-sm)',
              background: 'var(--color-sheet)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              pointerEvents: 'auto',
              flexShrink: 0,
            }}
            onClick={(e) => e.stopPropagation()}
            role="group"
            aria-label="Map Display Modes"
          >
            <button
              type="button"
              onClick={() => handleSetMode('topo')}
              style={{
                background: radarMode === 'topo' ? 'var(--color-strip)' : 'transparent',
                color: radarMode === 'topo' ? '#FFFFFF' : 'var(--text-primary)',
                border: 'none',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Cartographic Tactical Terrain Chart"
            >
              Chart
            </button>
            <button
              type="button"
              onClick={() => handleSetMode('ppi')}
              style={{
                background: radarMode === 'ppi' ? 'var(--color-strip)' : 'transparent',
                color: radarMode === 'ppi' ? '#FFFFFF' : 'var(--text-primary)',
                border: 'none',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                cursor: 'pointer',
                borderLeft: '1px solid var(--color-edge)',
              }}
              title="Plan Position Indicator (PPI) Radar Scope"
            >
              Radar
            </button>
          </div>
        </div>

        {/* Top-Right Region */}
        <div className="map-overlay-tr">
          {topRightContent}
        </div>

        {/* Bottom-Left Region: Unified Non-Overlapping Vertical Stack */}
        <div className="map-overlay-bl tactical-bottom-left-stack">
          {bottomLeftContent && (
            <div style={{ pointerEvents: 'auto', marginBottom: '2px' }}>
              {bottomLeftContent}
            </div>
          )}

          {/* 1. TOP CONTAINER: Collapsible Layers Panel (Expands upward) */}
          <div style={{ position: 'relative', pointerEvents: 'auto' }}>
            {isLayersOpen && (
              <div
                className="tactical-layers-dropdown"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: '8px',
                  width: '185px',
                  background: isLight ? 'rgba(246, 248, 243, 0.96)' : 'rgba(9, 14, 23, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: isLight ? '1px solid rgba(141, 154, 143, 0.5)' : '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  boxShadow: isLight ? '0 8px 24px rgba(0, 0, 0, 0.12)' : '0 8px 24px rgba(0, 0, 0, 0.65), 0 0 12px rgba(56, 189, 248, 0.15)',
                  transformOrigin: 'bottom left',
                  zIndex: 60,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    paddingBottom: '6px',
                    borderBottom: isLight ? '1px solid rgba(141, 154, 143, 0.3)' : '1px solid rgba(56, 189, 248, 0.2)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                      color: isLight ? '#0B5D82' : '#00F2FE',
                      letterSpacing: '0.05em',
                    }}
                  >
                    MAP LAYERS
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLayersOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isLight ? '#556270' : '#94A3B8',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Close layers panel"
                    aria-label="Close layers panel"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
                  {(
                    [
                      ['incidents', 'Incidents'],
                      ['airspace', 'Airspace'],
                      ['zones', 'Zones'],
                      ['routes', 'Routes'],
                      ['grid', 'Grid'],
                      ['rangeRings', 'Range rings'],
                      ['terrain', 'Terrain'],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        color: activeLayers[key] ? (isLight ? '#16202E' : '#E2E8F0') : (isLight ? '#8D9A8F' : '#64748B'),
                        userSelect: 'none',
                        fontFamily: 'var(--font-heading, sans-serif)',
                        fontWeight: activeLayers[key] ? 600 : 400,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={activeLayers[key]}
                        onChange={() => toggleLayer(key)}
                        style={{
                          accentColor: isLight ? '#0B5D82' : '#00F2FE',
                          cursor: 'pointer',
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="overlay-chip-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsLayersOpen(!isLayersOpen);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                background: isLight
                  ? (isLayersOpen ? 'rgba(11, 93, 130, 0.15)' : 'rgba(246, 248, 243, 0.92)')
                  : (isLayersOpen ? 'rgba(56, 189, 248, 0.25)' : 'rgba(9, 14, 23, 0.88)'),
                backdropFilter: 'blur(8px)',
                border: isLight ? '1px solid rgba(141, 154, 143, 0.45)' : '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 'var(--radius-sm, 4px)',
                color: isLight ? '#0B5D82' : (isLayersOpen ? '#00F2FE' : '#E2E8F0'),
                cursor: 'pointer',
                boxShadow: isLight ? '0 2px 6px rgba(0, 0, 0, 0.08)' : '0 2px 6px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.15s ease',
              }}
              title={isLayersOpen ? 'Collapse layers' : 'Expand layers'}
            >
              <Layers size={13} color={isLight ? '#0B5D82' : '#00F2FE'} />
              <span>Layers</span>
              {isLayersOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>
          </div>

          {/* 2. MIDDLE CONTAINER: Nodes Legend Badge */}
          <div
            className="tactical-nodes-legend"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 600,
              background: isLight ? 'rgba(246, 248, 243, 0.92)' : 'rgba(9, 14, 23, 0.88)',
              backdropFilter: 'blur(8px)',
              border: isLight ? '1px solid rgba(141, 154, 143, 0.45)' : '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 'var(--radius-sm, 4px)',
              color: isLight ? '#556270' : '#94A3B8',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto',
              boxShadow: isLight ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.4)',
            }}
            title="Evacuation Network Node Key"
          >
            <span style={{ color: isLight ? '#0B5D82' : '#00F2FE' }}><strong>I:</strong> Intake</span>
            <span style={{ color: isLight ? 'rgba(85, 98, 112, 0.4)' : 'rgba(148, 163, 184, 0.35)' }}>|</span>
            <span style={{ color: isLight ? '#2D7A33' : '#10B981' }}><strong>F:</strong> Hospital</span>
            <span style={{ color: isLight ? 'rgba(85, 98, 112, 0.4)' : 'rgba(148, 163, 184, 0.35)' }}>|</span>
            <span style={{ color: isLight ? '#0284C7' : '#38BDF8' }}><strong>R:</strong> Ridgeline</span>
            <span style={{ color: isLight ? 'rgba(85, 98, 112, 0.4)' : 'rgba(148, 163, 184, 0.35)' }}>|</span>
            <span style={{ color: isLight ? '#B77700' : '#F59E0B' }}><strong>C:</strong> Hub</span>
          </div>

          {/* 3. BOTTOM CONTAINER: Coordinate Pill */}
          <div
            className="tactical-coord-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              fontSize: '0.70rem',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              background: isLight ? 'rgba(246, 248, 243, 0.92)' : 'rgba(9, 14, 23, 0.88)',
              backdropFilter: 'blur(8px)',
              border: isLight ? '1px solid rgba(141, 154, 143, 0.45)' : '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '9999px',
              color: isLight ? '#0B5D82' : '#38BDF8',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
              pointerEvents: 'auto',
              boxShadow: isLight ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.4)',
            }}
            title="Real-Time Tactical Position"
          >
            <Crosshair size={12} style={{ color: isLight ? '#0B5D82' : '#00F2FE', flexShrink: 0 }} />
            <span>{mouseCoord.lat}, {mouseCoord.lng} | {mouseCoord.elev}</span>
          </div>
        </div>

        {/* Bottom-Right Region: Zoom / Controls Stack */}
        <div className="map-overlay-br">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn btn-sm"
              style={{ width: '32px', height: '32px', minWidth: '32px', padding: 0 }}
              title="Zoom in"
              onClick={() => setZoom((z) => Math.min(Number((z * 1.25).toFixed(3)), 4.5))}
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ width: '32px', height: '32px', minWidth: '32px', padding: 0 }}
              title="Zoom out"
              onClick={() => setZoom((z) => Math.max(Number((z * 0.8).toFixed(3)), 0.4))}
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ width: '32px', height: '32px', minWidth: '32px', padding: 0 }}
              title="Recenter"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <Crosshair size={15} />
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ width: '32px', height: '32px', minWidth: '32px', padding: 0 }}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Tactical Canvas Container: Centered Flexbox with Dynamic Responsive Scaling min(80vw, 80vh) */}
      <div
        className="tactical-canvas-center-wrapper"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1000 680"
          style={{
            display: 'block',
            width: 'min(80vw, 80vh)',
            maxHeight: '100%',
            aspectRatio: '1000 / 680',
            overflow: 'visible',
            filter: radarMode === 'ppi' ? 'drop-shadow(0 0 24px rgba(0, 242, 254, 0.12))' : undefined,
          }}
        >
          <defs>
            {/* Circular Scope Clip Path for PPI Radar mode */}
            <clipPath id="radar-scope-circle">
              <circle cx={centerPt.x} cy={centerPt.y} r={scopeRadius} />
            </clipPath>

            {/* CRT Radar Glass Gradient */}
            <radialGradient id="crt-glass-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0B1320" />
              <stop offset="65%" stopColor="#070C15" />
              <stop offset="100%" stopColor="#03070E" />
            </radialGradient>

            {/* FLIR Infrared Gradient (Backwards-compatible) */}
            <radialGradient id="flir-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2A0B08" />
              <stop offset="70%" stopColor="#180504" />
              <stop offset="100%" stopColor="#0A0202" />
            </radialGradient>

            {/* Drafting Grid Pattern */}
            <pattern id="radar-drafting-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="0.8" />
            </pattern>

            {/* CRT Horizontal Scanlines */}
            <pattern id="radar-scanlines" width="100" height="4" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(0, 0, 0, 0.28)" strokeWidth="1.2" />
            </pattern>

            {/* Glowing Shoreline Filter for Chart Mode */}
            <filter id="shoreline-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Intense Phosphor Cyan Bloom Filter */}
            <filter id="radar-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Target Ping Wave Bloom */}
            <filter id="radar-ping-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* High-Contrast Water Gradient for Chart Mode (Dark) */}
            <linearGradient id="tactical-water-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#061826" />
              <stop offset="50%" stopColor="#0A243A" />
              <stop offset="100%" stopColor="#04121F" />
            </linearGradient>

            {/* CRT Radar Glass Gradient (Light Mode) */}
            <radialGradient id="crt-glass-gradient-light" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EAF1E7" />
              <stop offset="65%" stopColor="#DFE7DC" />
              <stop offset="100%" stopColor="#D2DDD0" />
            </radialGradient>

            {/* Drafting Grid Pattern (Light Mode) */}
            <pattern id="radar-drafting-grid-light" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(100, 116, 139, 0.12)" strokeWidth="0.8" />
            </pattern>

            {/* Tactical Water Gradient (Light Mode) */}
            <linearGradient id="tactical-water-grad-light" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C8E2EF" />
              <stop offset="50%" stopColor="#B6D9EC" />
              <stop offset="100%" stopColor="#A3CEE4" />
            </linearGradient>
          </defs>

          {/* Tactical Coordinate Grid (Letters A-E and Numbers 31-37) */}
          {activeLayers.grid && (
            <g opacity={isLight ? 0.8 : 0.65} pointerEvents="none">
              {[130, 240, 350, 460, 570].map((y, i) => (
                <g key={`grid-h-${i}`}>
                  <line x1="0" y1={y} x2="1000" y2={y} stroke={isLight ? 'rgba(100, 116, 139, 0.22)' : 'rgba(56, 189, 248, 0.15)'} strokeWidth="0.8" strokeDasharray="3 3" />
                  <text x="8" y={y + 12} fill={isLight ? '#475569' : 'rgba(56, 189, 248, 0.7)'} fontSize="9" fontFamily="var(--font-mono, monospace)" fontWeight="700">
                    {String.fromCharCode(65 + i)}
                  </text>
                </g>
              ))}
              {[140, 280, 420, 560, 700, 840].map((x, i) => (
                <g key={`grid-v-${i}`}>
                  <line x1={x} y1="0" x2={x} y2="680" stroke={isLight ? 'rgba(100, 116, 139, 0.22)' : 'rgba(56, 189, 248, 0.15)'} strokeWidth="0.8" strokeDasharray="3 3" />
                  <text x={x + 4} y="16" fill={isLight ? '#475569' : 'rgba(56, 189, 248, 0.7)'} fontSize="9" fontFamily="var(--font-mono, monospace)" fontWeight="700">
                    {31 + i}
                  </text>
                </g>
              ))}
              {/* Intersection Coordinate Crosses */}
              {[130, 240, 350, 460, 570].map((y, yi) =>
                [140, 280, 420, 560, 700, 840].map((x, xi) => (
                  <g key={`cross-${yi}-${xi}`} opacity={isLight ? 0.6 : 0.4}>
                    <line x1={x - 4} y1={y} x2={x + 4} y2={y} stroke={isLight ? '#0B5D82' : '#00F2FE'} strokeWidth="0.8" />
                    <line x1={x} y1={y - 4} x2={x} y2={y + 4} stroke={isLight ? '#0B5D82' : '#00F2FE'} strokeWidth="0.8" />
                  </g>
                ))
              )}
            </g>
          )}

          {/* Tactical Chart Mode: Clean Topography, Vegetation & Water Boundaries */}
          {radarMode === 'topo' && (
            <g pointerEvents="none">
              {/* Land/Water Boundaries */}
              <g>
                <path
                  d="M 0,520 Q 200,500 400,530 T 700,480 T 1000,510 L 1000,570 Q 700,540 400,590 T 0,580 Z"
                  fill={isLight ? 'url(#tactical-water-grad-light)' : 'url(#tactical-water-grad)'}
                  stroke={isLight ? '#0284C7' : '#00F2FE'}
                  strokeWidth="1.6"
                  opacity={isLight ? '0.95' : '0.9'}
                />
                <path
                  d="M 680,480 Q 750,420 830,440 T 960,390 L 980,430 Q 860,470 780,450 Z"
                  fill={isLight ? 'url(#tactical-water-grad-light)' : 'url(#tactical-water-grad)'}
                  stroke={isLight ? '#0284C7' : '#38BDF8'}
                  strokeWidth="1.2"
                  opacity={isLight ? '0.9' : '0.85'}
                />
              </g>

              {/* Tactical Sector Forest Zone */}
              <g>
                <path
                  d="M 140,580 Q 230,540 330,580 T 380,670 T 180,680 Z"
                  fill={isLight ? 'rgba(34, 197, 94, 0.12)' : 'rgba(16, 185, 129, 0.08)'}
                  stroke={isLight ? '#16A34A' : '#10B981'}
                  strokeWidth="1"
                  strokeDasharray="4,3"
                  opacity="0.8"
                />
              </g>

              {/* Topographic Elevation Contours */}
              {activeLayers.terrain && (
                <g opacity={0.75}>
                  <path
                    d="M 220,310 Q 390,250 560,270 T 780,230 T 980,250"
                    fill="none"
                    stroke={isLight ? '#8C7355' : '#00F2FE'}
                    strokeWidth="1.2"
                    opacity={isLight ? '0.7' : '0.55'}
                  />
                  <path
                    d="M 260,350 Q 410,290 580,310 T 770,280"
                    fill="none"
                    stroke={isLight ? '#64748B' : '#38BDF8'}
                    strokeWidth="0.9"
                    strokeDasharray="5,3"
                    opacity={isLight ? '0.6' : '0.4'}
                  />
                </g>
              )}
            </g>
          )}

          {/* PPI Radar Mode Scope Bezel, Glass, & Compass Rim */}
          {(radarMode === 'ppi' || radarMode === 'flir') && (
            <StaticRadarScopeBezel
              centerPt={centerPt}
              scopeRadius={scopeRadius}
              radarMode={radarMode}
              showTerrain={activeLayers.terrain}
              showRangeRings={activeLayers.rangeRings}
              isLight={isLight}
            />
          )}

          {/* Inner Radar Scope Area (Sweep Beam & Calibrated Rings) */}
          <g clipPath={radarMode === 'ppi' || radarMode === 'flir' ? 'url(#radar-scope-circle)' : undefined}>
            {/* Smooth Rotating Radar Sweep Cone with Animated Alpha Gradient Falloff */}
            {(radarMode === 'ppi' || radarMode === 'flir') && sweepActive && (
              <g pointerEvents="none">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 ${centerPt.x} ${centerPt.y}`}
                  to={`360 ${centerPt.x} ${centerPt.y}`}
                  dur="4s"
                  repeatCount="indefinite"
                />

                {/* 10-Slice Alpha Gradient Falloff Cone */}
                <path d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 0, 3)} fill={isLight ? 'rgba(14, 116, 144, 0.28)' : 'rgba(0, 242, 254, 0.38)'} />
                <path d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 3, 4)} fill={isLight ? 'rgba(14, 116, 144, 0.22)' : 'rgba(0, 242, 254, 0.28)'} />
                <path d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 7, 5)} fill={isLight ? 'rgba(14, 116, 144, 0.16)' : 'rgba(0, 242, 254, 0.20)'} />
                <path d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 12, 6)} fill={isLight ? 'rgba(14, 116, 144, 0.11)' : 'rgba(0, 242, 254, 0.14)'} />
                <path d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 18, 7)} fill={isLight ? 'rgba(14, 116, 144, 0.07)' : 'rgba(0, 242, 254, 0.09)'} />
                <path d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 25, 8)} fill={isLight ? 'rgba(14, 116, 144, 0.045)' : 'rgba(0, 242, 254, 0.055)'} />
                <path d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 33, 9)} fill={isLight ? 'rgba(14, 116, 144, 0.025)' : 'rgba(0, 242, 254, 0.03)'} />
                <path d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 42, 10)} fill={isLight ? 'rgba(14, 116, 144, 0.012)' : 'rgba(0, 242, 254, 0.015)'} />
                <path d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 52, 10)} fill={isLight ? 'rgba(14, 116, 144, 0.005)' : 'rgba(0, 242, 254, 0.005)'} />

                {/* Leading Glowing Phosphor Vector Beam Line */}
                <line
                  x1={centerPt.x}
                  y1={centerPt.y}
                  x2={centerPt.x}
                  y2={centerPt.y - scopeRadius}
                  stroke={isLight ? '#0284C7' : '#00F2FE'}
                  strokeWidth="2.2"
                  filter={isLight ? undefined : 'url(#radar-glow-cyan)'}
                />
              </g>
            )}
          </g>

          {/* =========================================================================
              TARGET MARKER OVERLAY CONTAINER (overflow: visible, Zero Label Truncation)
              Labels Flip Inward Toward Center When Near Perimeter
             ========================================================================= */}
          <g className="target-marker-overlay-container" style={{ overflow: 'visible' }}>
            {/* Restricted Airspace Zones */}
            {activeLayers.zones &&
              zones.map((zone) => {
                const pos = project(zone.center.lat, zone.center.lng);
                const radiusPx = zone.radiusKm * 40 * zoom;
                const boxW = Math.max(90, zone.name.length * 7.5 + 18);

                return (
                  <g key={zone.id} style={{ overflow: 'visible' }}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radiusPx}
                      fill={radarMode === 'ppi' ? 'rgba(255, 90, 60, 0.20)' : 'rgba(166, 27, 27, 0.12)'}
                      stroke="var(--color-crit)"
                      strokeWidth="1.5"
                      strokeDasharray="5 3"
                    />
                    {/* Zone Tag on top edge */}
                    <g transform={`translate(${pos.x - boxW / 2}, ${pos.y - radiusPx - 8})`} style={{ overflow: 'visible' }}>
                      <rect
                        x="0"
                        y="0"
                        width={boxW}
                        height="16"
                        fill={isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(9, 14, 23, 0.94)'}
                        stroke="var(--color-crit)"
                        strokeWidth="1"
                        rx="2"
                      />
                      <text
                        x={boxW / 2}
                        y="11.5"
                        fill="var(--color-crit)"
                        fontSize="8"
                        fontFamily="var(--font-heading)"
                        fontWeight="700"
                        textAnchor="middle"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {zone.name}
                      </text>
                    </g>
                  </g>
                );
              })}

            {/* Road Network Corridors & Hazards (MediRoute) */}
            {activeLayers.routes &&
              edges.map((edge) => {
                const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
                const toNode = nodes.find((n) => n.id === edge.toNodeId);
                if (!fromNode || !toNode) return null;

                const p1 = project(fromNode.coordinates.lat, fromNode.coordinates.lng);
                const p2 = project(toNode.coordinates.lat, toNode.coordinates.lng);
                const isRouteEdge = activeRoute?.edgesTraversed.includes(edge.id);

                return (
                  <g key={edge.id} style={{ overflow: 'visible' }}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={
                        edge.blocked
                          ? 'rgba(220, 38, 38, 0.75)'
                          : isRouteEdge
                          ? '#10B981'
                          : 'rgba(56, 189, 248, 0.45)'
                      }
                      strokeWidth={isRouteEdge ? 3.5 : edge.blocked ? 2 : 1.6}
                      strokeDasharray={edge.blocked ? '6 3' : undefined}
                    />

                    {/* Red Cross Barricade for Blocked Road */}
                    {edge.blocked && (
                      <g transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2})`}>
                        <circle r="9" fill={isLight ? '#FFFFFF' : 'rgba(9, 14, 23, 0.9)'} stroke="var(--color-crit)" strokeWidth="1" />
                        <line x1="-5" y1="-5" x2="5" y2="5" stroke="var(--color-crit)" strokeWidth="2" />
                        <line x1="-5" y1="5" x2="5" y2="-5" stroke="var(--color-crit)" strokeWidth="2" />
                      </g>
                    )}
                  </g>
                );
              })}

            {/* Evacuation Nodes & Medical Facilities */}
            {activeLayers.routes &&
              nodes.map((node) => {
                const pos = project(node.coordinates.lat, node.coordinates.lng);
                const isHospital = node.type === 'hospital';
                const boxW = Math.max(95, node.name.length * 7.5 + 16);
                const boxH = 18;

                const callout = calculateCalloutPosition(pos, centerPt, scopeRadius, boxW, boxH);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    style={{ cursor: 'pointer', overflow: 'visible' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEntity?.({ type: 'node', id: node.id, raw: node });
                    }}
                  >
                    <title>{node.name} ({node.type})</title>
                    {isHospital ? (
                      <g transform="translate(-10, -10)">
                        <rect
                          x="0"
                          y="0"
                          width="20"
                          height="20"
                          fill={isLight ? '#FFFFFF' : '#09141F'}
                          stroke="#10B981"
                          strokeWidth="1.5"
                          rx="3"
                        />
                        <rect x="8" y="3" width="4" height="14" fill="#10B981" />
                        <rect x="3" y="8" width="14" height="4" fill="#10B981" />
                      </g>
                    ) : (
                      <g>
                        <circle
                          r="10"
                          fill={isLight ? '#FFFFFF' : '#09141F'}
                          stroke="#38BDF8"
                          strokeWidth="1.5"
                        />
                        <text
                          y="3.5"
                          fill="#38BDF8"
                          fontSize="9"
                          fontFamily="var(--font-heading)"
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          {node.name.charAt(0)}
                        </text>
                      </g>
                    )}

                    {/* Node Callout Label (e.g. Field Hospital) with Zero Ellipsis */}
                    <g transform={`translate(${callout.offsetX}, ${callout.offsetY})`} style={{ overflow: 'visible' }}>
                      <line
                        x1={callout.anchorX}
                        y1={callout.anchorY}
                        x2={0}
                        y2={0}
                        stroke={isHospital ? '#10B981' : '#38BDF8'}
                        strokeWidth="0.8"
                        strokeDasharray={callout.isClamped ? '2,2' : undefined}
                      />
                      <rect
                        x="0"
                        y="-10"
                        width={boxW}
                        height={boxH}
                        fill={isLight ? 'rgba(248, 250, 246, 0.96)' : 'rgba(9, 14, 23, 0.92)'}
                        stroke={isHospital ? (isLight ? '#15803D' : '#10B981') : (isLight ? '#0B5D82' : '#38BDF8')}
                        strokeWidth="1"
                        rx="2"
                      />
                      <text
                        x="7"
                        y="2.5"
                        fill={isHospital ? (isLight ? '#15803D' : '#10B981') : (isLight ? '#0B5D82' : '#38BDF8')}
                        fontSize="8"
                        fontFamily="var(--font-mono, monospace)"
                        fontWeight="700"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {node.name}
                      </text>
                    </g>
                  </g>
                );
              })}

            {/* FieldLink Ground Incidents */}
            {activeLayers.incidents &&
              incidents.map((inc) => {
                const pos = project(inc.location.lat, inc.location.lng);
                const incHeader = `${inc.priority === 'critical' ? 'CRITICAL' : 'INCIDENT'}, ${inc.id}`;
                const boxW = Math.max(160, Math.max(incHeader.length * 8.2, inc.title.length * 7.5) + 20);
                const boxH = 32;

                const callout = calculateCalloutPosition(pos, centerPt, scopeRadius, boxW, boxH);

                return (
                  <g
                    key={inc.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    style={{ cursor: 'pointer', overflow: 'visible' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEntity?.({ type: 'incident', id: inc.id, raw: inc });
                    }}
                  >
                    <title>{inc.title}</title>
                    <circle r="14" fill="none" stroke="var(--color-crit)" strokeWidth="1.2" />
                    <circle r="9" fill="none" stroke="var(--color-crit)" strokeWidth="0.8" />
                    <circle r="4.5" fill="var(--color-crit)" />

                    <g transform={`translate(${callout.offsetX}, ${callout.offsetY})`} style={{ overflow: 'visible' }}>
                      <line
                        x1={callout.anchorX}
                        y1={callout.anchorY}
                        x2={0}
                        y2={0}
                        stroke="var(--color-crit)"
                        strokeWidth="1"
                        strokeDasharray={callout.isClamped ? '2,2' : undefined}
                      />
                      <rect
                        x="0"
                        y="-14"
                        width={boxW}
                        height={boxH}
                        fill={isLight ? 'rgba(248, 250, 246, 0.96)' : 'rgba(9, 14, 23, 0.94)'}
                        stroke="var(--color-crit)"
                        strokeWidth="1.2"
                        rx="3"
                      />
                      <text
                        x="8"
                        y="-2"
                        fill="var(--color-crit)"
                        fontSize="8.5"
                        fontFamily="var(--font-heading)"
                        fontWeight="700"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {inc.priority === 'critical' ? 'Critical' : 'Incident'}, {inc.id}
                      </text>
                      <text
                        x="8"
                        y="10"
                        fill={isLight ? '#1E293B' : '#E2E8F0'}
                        fontSize="7.5"
                        fontFamily="var(--font-body)"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {inc.title}
                      </text>
                    </g>
                  </g>
                );
              })}

            {/* SkyWatch Airspace Telemetry Tracks */}
            {activeLayers.airspace &&
              tracks.map((track) => {
                const pos = project(track.lat, track.lng);
                const trackClass = classifyTrack(track as any);
                const isHostile = trackClass === 'HOSTILE';
                const isFriendly = trackClass === 'FRIENDLY';
                const isNeutral = trackClass === 'CIVILIAN';

                // Dynamically size box without ellipsis truncation: e.g. "SWARM-LEAD-A"
                const boxW = Math.max(115, track.callsign.length * 8.5 + 18);
                const boxH = 28;

                const callout = calculateCalloutPosition(pos, centerPt, scopeRadius, boxW, boxH);

                return (
                  <g key={track.id} style={{ overflow: 'visible' }}>
                    {/* Persistent Target Ping Trails & History in Radar Mode */}
                    {radarMode === 'ppi' && (
                      <g pointerEvents="none">
                        {/* Animated Radial Ping Wave Ring */}
                        <circle cx={pos.x} cy={pos.y} r="6" fill="none" stroke={isHostile ? '#EF4444' : '#00F2FE'} strokeWidth="1.5">
                          <animate attributeName="r" values="4; 26" dur="2.8s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.85; 0" dur="2.8s" repeatCount="indefinite" />
                        </circle>

                        {/* Connecting Phosphor History Trail Line */}
                        {track.flightHistory && track.flightHistory.length > 0 && (
                          <polyline
                            points={[...track.flightHistory.slice(-5), { lat: track.lat, lng: track.lng }]
                              .map((h) => {
                                const hp = project(h.lat, h.lng);
                                return `${hp.x},${hp.y}`;
                              })
                              .join(' ')}
                            fill="none"
                            stroke={isHostile ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 242, 254, 0.4)'}
                            strokeWidth="1.5"
                            strokeDasharray="2,3"
                          />
                        )}

                        {/* Decaying Phosphor Ping Dots */}
                        {track.flightHistory &&
                          track.flightHistory.slice(-5).map((hist, hIdx, arr) => {
                            const hp = project(hist.lat, hist.lng);
                            const progress = (hIdx + 1) / arr.length;
                            const dotRadius = 1.8 + progress * 1.5;
                            const dotOpacity = 0.15 + progress * 0.6;

                            return (
                              <circle
                                key={`ping-trail-${track.id}-${hIdx}`}
                                cx={hp.x}
                                cy={hp.y}
                                r={dotRadius}
                                fill={isHostile ? '#EF4444' : '#00F2FE'}
                                opacity={dotOpacity}
                                filter={progress > 0.6 ? 'url(#radar-glow-cyan)' : undefined}
                              />
                            );
                          })}
                      </g>
                    )}

                    {/* Chart Mode Flight History Dots */}
                    {radarMode !== 'ppi' &&
                      track.flightHistory.slice(-4, -1).map((hist, hIdx) => {
                        const hPos = project(hist.lat, hist.lng);
                        return (
                          <circle
                            key={`h-${hIdx}`}
                            cx={hPos.x}
                            cy={hPos.y}
                            r="2.5"
                            fill="var(--color-ink-2)"
                            opacity={0.3 + hIdx * 0.2}
                          />
                        );
                      })}

                    {/* Trajectory Prediction Path (60-second forward projected) */}
                    {track.predictedPath && track.predictedPath.length > 0 && (
                      <polyline
                        points={`${pos.x},${pos.y} ` + track.predictedPath.map((p) => {
                          const pr = project(p.lat, p.lng);
                          return `${pr.x},${pr.y}`;
                        }).join(' ')}
                        fill="none"
                        stroke={isHostile ? '#EF4444' : '#00F2FE'}
                        strokeWidth="1.6"
                        strokeDasharray="4,4"
                        opacity="0.65"
                      />
                    )}

                    {/* Target Icon & Full Callout Box with Inward Flip Perimeter Clamping */}
                    <g
                      transform={`translate(${pos.x}, ${pos.y})`}
                      style={{ cursor: 'pointer', overflow: 'visible' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEntity?.({ type: 'track', id: track.id, raw: track });
                      }}
                    >
                      <title>{`${track.callsign} [${TRACK_CLASSIFICATION_LABELS[trackClass]}] (${track.status}) - ${formatAltitude(track.altitude)}, ${formatSpeed(track.speed)}`}</title>

                      {/* Symbol Shape */}
                      {isHostile ? (
                        <g>
                          <polygon
                            points="0,-12 12,0 0,12 -12,0"
                            fill="var(--entity-hostile-fill)"
                            stroke="var(--entity-hostile-stroke)"
                            strokeWidth="1.5"
                          />
                          <line x1="-4" y1="-4" x2="4" y2="4" stroke="var(--entity-hostile-stroke)" strokeWidth="1.5" />
                          <line x1="-4" y1="4" x2="4" y2="-4" stroke="var(--entity-hostile-stroke)" strokeWidth="1.5" />
                        </g>
                      ) : isFriendly ? (
                        <g>
                          <rect
                            x="-10"
                            y="-8"
                            width="20"
                            height="16"
                            fill="var(--entity-friendly-fill)"
                            stroke="var(--entity-friendly-stroke)"
                            strokeWidth="1.5"
                          />
                          <polygon points="0,-4 5,4 -5,4" fill="var(--entity-friendly-stroke)" />
                        </g>
                      ) : isNeutral ? (
                        <g>
                          <rect
                            x="-9"
                            y="-9"
                            width="18"
                            height="18"
                            fill="var(--entity-neutral-fill)"
                            stroke="var(--entity-neutral-stroke)"
                            strokeWidth="1.5"
                          />
                          <polygon points="0,-4 4,4 -4,4" fill="var(--entity-neutral-stroke)" />
                        </g>
                      ) : (
                        <g>
                          <circle cx="-5" cy="0" r="5" fill="var(--entity-unknown-fill)" stroke="var(--entity-unknown-stroke)" strokeWidth="1.2" />
                          <circle cx="5" cy="0" r="5" fill="var(--entity-unknown-fill)" stroke="var(--entity-unknown-stroke)" strokeWidth="1.2" />
                          <circle cx="0" cy="-5" r="5" fill="var(--entity-unknown-fill)" stroke="var(--entity-unknown-stroke)" strokeWidth="1.2" />
                          <circle cx="0" cy="5" r="5" fill="var(--entity-unknown-fill)" stroke="var(--entity-unknown-stroke)" strokeWidth="1.2" />
                          <circle cx="0" cy="0" r="4" fill="var(--entity-unknown-fill)" />
                        </g>
                      )}

                      {/* Flight Data Block: Full Callout with Zero Ellipsis */}
                      <g transform={`translate(${callout.offsetX}, ${callout.offsetY})`} style={{ overflow: 'visible' }}>
                        <line
                          x1={callout.anchorX}
                          y1={callout.anchorY}
                          x2={0}
                          y2={0}
                          stroke={isLight ? 'rgba(11, 93, 130, 0.45)' : 'rgba(56, 189, 248, 0.5)'}
                          strokeWidth="1"
                          strokeDasharray={callout.isClamped ? '2,2' : undefined}
                        />
                        <rect
                          x="0"
                          y="-12"
                          width={boxW}
                          height={boxH}
                          fill={isLight ? 'rgba(248, 250, 246, 0.96)' : 'rgba(9, 14, 23, 0.94)'}
                          stroke={isHostile ? (isLight ? '#DC2626' : '#EF4444') : (isLight ? '#0B5D82' : 'rgba(56, 189, 248, 0.45)')}
                          strokeWidth="1"
                          rx="3"
                        />
                        <text
                          x="6"
                          y="-1"
                          fill={isHostile ? (isLight ? '#B91C1C' : '#FCA5A5') : (isLight ? '#0B5D82' : '#00F2FE')}
                          fontSize="8.5"
                          fontFamily="var(--font-heading)"
                          fontWeight="700"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {track.callsign}
                        </text>
                        <text
                          x="6"
                          y="10"
                          fill={isLight ? '#475569' : 'var(--text-secondary)'}
                          fontSize="7"
                          fontFamily="var(--font-mono, monospace)"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {formatAltitude(track.altitude)} {formatSpeed(track.speed)}
                        </text>
                      </g>
                    </g>
                  </g>
                );
              })}

            {/* Shared Tactical Map Markers (FieldLink Mesh Sync) */}
            {(markers || []).map((marker) => {
              const pos = project(marker.location.lat, marker.location.lng);
              const isRally = marker.type === 'rally_point';
              const isContact = marker.type === 'contact';
              const color = isRally ? '#10B981' : isContact ? '#EF4444' : '#F59E0B';
              const boxW = Math.max(90, marker.label.length * 7.8 + 18);
              const boxH = 16;
              const callout = calculateCalloutPosition(pos, centerPt, scopeRadius, boxW, boxH);

              return (
                <g
                  key={marker.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer', overflow: 'visible' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEntity?.({ type: 'marker', id: marker.id, raw: marker });
                  }}
                >
                  <title>{`Tactical Marker [${marker.type.toUpperCase()}]: ${marker.label} • Node ${marker.createdByNode}`}</title>
                  <circle r="10" fill={isLight ? '#FFFFFF' : 'rgba(9, 14, 24, 0.95)'} stroke={color} strokeWidth="2" filter={isLight ? undefined : 'url(#radar-glow-cyan)'} />
                  <text y="3.5" fill={color} fontSize="9" fontFamily="var(--font-mono, monospace)" fontWeight="800" textAnchor="middle">
                    {isRally ? '⚑' : isContact ? '✕' : '▲'}
                  </text>
                  <g transform={`translate(${callout.offsetX}, ${callout.offsetY})`} style={{ overflow: 'visible' }}>
                    <rect x="0" y="0" width={boxW} height={boxH} rx="3" fill={isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(9, 14, 24, 0.92)'} stroke={color} strokeWidth="0.8" />
                    <text x={boxW / 2} y="11.5" fill={isLight ? '#0F172A' : '#E2E8F0'} fontSize="7.5" fontFamily="var(--font-mono, monospace)" fontWeight="700" textAnchor="middle" style={{ whiteSpace: 'nowrap' }}>
                      {marker.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Central Radar Transmitter Antenna Node */}
            <circle cx={centerPt.x} cy={centerPt.y} r="3.5" fill={isLight ? '#0B5D82' : '#00F2FE'} />
            <circle cx={centerPt.x} cy={centerPt.y} r="8" fill="none" stroke={isLight ? 'rgba(11, 93, 130, 0.45)' : '#00F2FE'} strokeWidth="1.2" opacity="0.75" />
            <circle cx={centerPt.x} cy={centerPt.y} r="14" fill="none" stroke={isLight ? 'rgba(11, 93, 130, 0.25)' : '#00F2FE'} strokeWidth="0.8" strokeDasharray="3,3" opacity="0.45" />
          </g>
        </svg>
      </div>
    </div>
  );
};
