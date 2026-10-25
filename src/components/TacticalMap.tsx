import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  IncidentReport,
  TelemetryTrack,
  RestrictedAirspaceZone,
  RoadHazardEdge,
  EvacuationNode,
  CalculatedRoute,
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

export interface TacticalMapProps {
  incidents?: IncidentReport[];
  tracks?: TelemetryTrack[];
  zones?: RestrictedAirspaceZone[];
  nodes?: EvacuationNode[];
  edges?: RoadHazardEdge[];
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

interface BoundingBox2D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function boxesIntersect(a: BoundingBox2D, b: BoundingBox2D): boolean {
  return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  incidents = [],
  tracks = [],
  zones = [],
  nodes = [],
  edges = [],
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
    lat: '34.0600 N',
    lng: '118.2450 W',
    elev: '84 m MSL',
  });

  const [activeLayers, setActiveLayers] = useState({
    incidents: true,
    airspace: true,
    zones: true,
    routes: true,
    grid: true,
    rangeRings: true,
    terrain: false,
  });

  // Collapsible Layers panel (collapsed by default below 1100px width or 700px height)
  const [isLayersCollapsed, setIsLayersCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1100 || window.innerHeight < 700;
    }
    return false;
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Wheel Scrolling Zoom Handler (Smooth zooming on mouse wheel centered on cursor)
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

  // Map and radar resize observer: recompute viewport size and maintain scope centering
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    let rAFId: number;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(() => {
        // Preserves zoom & pan while syncing measured dimensions
      });
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
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * 1000;
      const svgY = ((e.clientY - rect.top) / rect.height) * 680;
      const geo = unproject(svgX, svgY);
      setMouseCoord({
        lat: `${geo.lat.toFixed(4)} N`,
        lng: `${Math.abs(geo.lng).toFixed(4)} W`,
        elev: `${Math.round(75 + Math.sin(geo.lat * 100) * 40)} m MSL`,
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

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const centerPt = { x: 500 + pan.x, y: 350 + pan.y };
  const scopeRadius = 275 * zoom;

  const createSweepWedgePath = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const x2 = cx - Math.sin(rad) * r;
    const y2 = cy - Math.cos(rad) * r;
    return `M ${cx},${cy} L ${cx},${cy - r} A ${r},${r} 0 0,0 ${x2},${y2} Z`;
  };

  const computedHeight = isFullscreen ? '100vh' : height;

  // Map label declutter with 8-candidate offsets & leader line
  const CANDIDATE_OFFSETS = useMemo(
    () => [
      { dx: 18, dy: -20, anchorX: -12, anchorY: 14 },  // 1: Top-Right (default aviation FDB)
      { dx: 18, dy: 6, anchorX: -12, anchorY: 2 },     // 2: Bottom-Right
      { dx: 18, dy: -8, anchorX: -12, anchorY: 0 },    // 3: Mid-Right
      { dx: -110, dy: -20, anchorX: 100, anchorY: 14 }, // 4: Top-Left
      { dx: -110, dy: 6, anchorX: 100, anchorY: 2 },   // 5: Bottom-Left
      { dx: -110, dy: -8, anchorX: 100, anchorY: 0 },  // 6: Mid-Left
      { dx: -45, dy: -36, anchorX: 0, anchorY: 26 },   // 7: Top-Center
      { dx: -45, dy: 22, anchorX: 0, anchorY: -10 },   // 8: Bottom-Center
    ],
    []
  );

  const computedTrackLayouts = useMemo(() => {
    const placedBoxes: BoundingBox2D[] = [];
    const layouts = new Map<
      string,
      { offset: (typeof CANDIDATE_OFFSETS)[0]; collapsed: boolean; boxW: number; boxH: number }
    >();

    // Prioritize selected first, then hostile/critical, then others
    const sortedTracks = [...tracks].sort((a, b) => {
      if (a.id === selectedEntityId) return -1;
      if (b.id === selectedEntityId) return 1;
      const aCrit = a.status === 'hostile' || a.status === 'suspicious' ? 1 : 0;
      const bCrit = b.status === 'hostile' || b.status === 'suspicious' ? 1 : 0;
      return bCrit - aCrit;
    });

    for (const track of sortedTracks) {
      const pos = project(track.lat, track.lng);
      const isSelected = track.id === selectedEntityId;
      const isHostile = track.status === 'hostile' || track.status === 'suspicious';
      const boxW = 95;
      const boxH = 26;

      let chosenOffset = CANDIDATE_OFFSETS[0];
      let collided = true;

      for (const off of CANDIDATE_OFFSETS) {
        const box: BoundingBox2D = {
          x1: pos.x + off.dx,
          y1: pos.y + off.dy - 12,
          x2: pos.x + off.dx + boxW,
          y2: pos.y + off.dy - 12 + boxH,
        };

        const hasCollision = placedBoxes.some((b) => boxesIntersect(box, b));
        if (!hasCollision) {
          chosenOffset = off;
          collided = false;
          placedBoxes.push(box);
          break;
        }
      }

      if (collided) {
        // High priority keeps chosen offset anyway, lower priority collapses to callsign only
        const collapse = !isSelected && !isHostile;
        layouts.set(track.id, {
          offset: chosenOffset,
          collapsed: collapse,
          boxW: collapse ? 65 : boxW,
          boxH: collapse ? 16 : boxH,
        });
        if (!collapse) {
          placedBoxes.push({
            x1: pos.x + chosenOffset.dx,
            y1: pos.y + chosenOffset.dy - 12,
            x2: pos.x + chosenOffset.dx + boxW,
            y2: pos.y + chosenOffset.dy - 12 + boxH,
          });
        }
      } else {
        layouts.set(track.id, {
          offset: chosenOffset,
          collapsed: false,
          boxW,
          boxH,
        });
      }
    }

    return layouts;
  }, [tracks, selectedEntityId, project, CANDIDATE_OFFSETS]);

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
        backgroundColor: radarMode === 'ppi' ? '#040202' : 'var(--color-map)',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 4-Region Map Grid Overlay Layer */}
      <div className="map-overlay-layer">
        {/* Top-Left: Metrics & Mode Switch in ONE Unified Flex Toolbar */}
        <div className="map-overlay-tl">
          {topLeftContent}

          {/* Mode Switcher Segmented Control */}
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
              title="Cartographic Terrain Chart"
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
                borderRight: '1px solid var(--color-edge)',
              }}
              title="Plan Position Indicator (PPI) Radar Scope"
            >
              Radar
            </button>
            <button
              type="button"
              onClick={() => handleSetMode('flir')}
              style={{
                background: radarMode === 'flir' ? 'var(--color-strip)' : 'transparent',
                color: radarMode === 'flir' ? '#FFFFFF' : 'var(--text-primary)',
                border: 'none',
                padding: '6px 14px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Forward Looking Infrared (FLIR) Thermal Sensor"
            >
              Thermal
            </button>
          </div>
        </div>

        {/* Top-Right Region */}
        <div className="map-overlay-tr">
          {topRightContent}
        </div>

        {/* Bottom-Left Region: Stack of Collapsible Panels */}
        <div className="map-overlay-bl">
          {/* Coordinates Readout */}
          <div
            className="coord-value"
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '0.02em',
              pointerEvents: 'none',
              padding: '2px 0',
            }}
          >
            {mouseCoord.lat} {mouseCoord.lng} {mouseCoord.elev}
          </div>

          {/* Module-Specific Bottom-Left Panels (e.g. New Incident Report, Road Hazards) */}
          {bottomLeftContent}

          {/* Collapsible Layers Panel */}
          {isLayersCollapsed ? (
            <button
              type="button"
              className="overlay-chip-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsLayersCollapsed(false);
              }}
              title="Expand Layers panel"
            >
              <Layers size={13} color="var(--accent)" />
              <span>Layers</span>
              <ChevronUp size={12} />
            </button>
          ) : (
            <div
              className="overlay-collapsible-panel"
              style={{ width: '150px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Layers
                </span>
                <button
                  type="button"
                  onClick={() => setIsLayersCollapsed(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Collapse Layers"
                  aria-label="Collapse Layers"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.74rem' }}>
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
                      gap: '6px',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={activeLayers[key]}
                      onChange={() => toggleLayer(key)}
                      style={{
                        accentColor: 'var(--accent)',
                        cursor: 'pointer',
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
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

      {/* Main SVG Tactical Canvas */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1000 680"
        style={{ display: 'block', flex: 1 }}
      >
        <defs>
          {/* Circular Scope Clip Path for PPI & FLIR Radar modes */}
          <clipPath id="radar-scope-circle">
            <circle cx={centerPt.x} cy={centerPt.y} r={scopeRadius} />
          </clipPath>
        </defs>

        {/* Tactical Grid (Letters A-E and Numbers 31-37) */}
        {activeLayers.grid && (
          <g opacity={0.65}>
            {[130, 240, 350, 460, 570].map((y, i) => (
              <g key={`grid-h-${i}`}>
                <line x1="0" y1={y} x2="1000" y2={y} stroke="var(--color-grid)" strokeWidth="0.8" strokeDasharray="3 3" />
                <text x="8" y={y + 12} fill="var(--color-grid)" fontSize="9" fontWeight="700">
                  {String.fromCharCode(65 + i)}
                </text>
              </g>
            ))}
            {[140, 280, 420, 560, 700, 840].map((x, i) => (
              <g key={`grid-v-${i}`}>
                <line x1={x} y1="0" x2={x} y2="680" stroke="var(--color-grid)" strokeWidth="0.8" strokeDasharray="3 3" />
                <text x={x + 4} y="16" fill="var(--color-grid)" fontSize="9" fontWeight="700">
                  {31 + i}
                </text>
              </g>
            ))}
          </g>
        )}

        {/* Natural Topography & Rivers (Chart mode) */}
        {radarMode === 'topo' && (
          <g>
            <path
              d="M 0,520 Q 200,500 400,530 T 700,480 T 1000,510 L 1000,560 Q 700,530 400,580 T 0,570 Z"
              fill="var(--color-water)"
              stroke="#A2C8DC"
              strokeWidth="1.2"
            />
            <path
              d="M 160,590 Q 240,550 320,590 T 360,670 T 200,680 Z"
              fill="var(--color-forest)"
              opacity="0.75"
            />
            <path
              d="M 240,320 Q 400,260 560,280 T 780,240 T 960,260"
              fill="none"
              stroke="var(--color-contour)"
              strokeWidth="1.2"
            />
            <path
              d="M 280,360 Q 420,300 580,320 T 760,290"
              fill="none"
              stroke="var(--color-contour)"
              strokeWidth="1"
            />
            <path
              d="M 320,390 Q 440,340 580,360"
              fill="none"
              stroke="var(--color-contour)"
              strokeWidth="0.8"
            />
          </g>
        )}

        {/* PPI / Thermal CRT Bezel & Azimuth Compass Dial */}
        {(radarMode === 'ppi' || radarMode === 'flir') && (
          <g pointerEvents="none">
            <circle
              cx={centerPt.x}
              cy={centerPt.y}
              r={scopeRadius + 16}
              fill="#0E0505"
              stroke="var(--color-edge)"
              strokeWidth="2"
            />

            {Array.from({ length: 72 }).map((_, i) => {
              const deg = i * 5;
              const isMajor = deg % 30 === 0;
              const isMedium = deg % 10 === 0 && !isMajor;
              const rad = (deg * Math.PI) / 180;
              const rInner = scopeRadius + (isMajor ? 4 : isMedium ? 8 : 10);
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
                  stroke={isMajor ? 'var(--color-ink)' : 'var(--color-edge)'}
                  strokeWidth={isMajor ? 1.5 : 0.8}
                />
              );
            })}

            {Array.from({ length: 12 }).map((_, i) => {
              const deg = i * 30;
              const rad = (deg * Math.PI) / 180;
              const labelR = scopeRadius + 26;
              const x = centerPt.x + Math.sin(rad) * labelR;
              const y = centerPt.y - Math.cos(rad) * labelR + 3.5;
              const label = deg.toString().padStart(3, '0');

              return (
                <text
                  key={`az-num-${deg}`}
                  x={x}
                  y={y}
                  fill="var(--color-ink)"
                  fontSize="8.5"
                  fontFamily="var(--font-heading)"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {label}
                </text>
              );
            })}
          </g>
        )}

        {/* Content Inside Radar Scope or Chart Canvas */}
        <g clipPath={radarMode === 'ppi' || radarMode === 'flir' ? 'url(#radar-scope-circle)' : undefined}>
          {/* Calibrated Concentric Range Rings */}
          {activeLayers.rangeRings && (
            <g pointerEvents="none">
              {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                const r = scopeRadius * ratio;
                const km = (idx + 1) * 5;

                return (
                  <g key={`ring-${idx}`}>
                    <circle
                      cx={centerPt.x}
                      cy={centerPt.y}
                      r={r}
                      fill="none"
                      stroke={radarMode === 'ppi' ? 'rgba(255, 90, 60, 0.28)' : 'rgba(141, 154, 143, 0.4)'}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={centerPt.x + 4}
                      y={centerPt.y - r + 12}
                      fill={radarMode === 'ppi' ? 'var(--color-ink-2)' : 'var(--color-ink-2)'}
                      fontSize="8"
                      fontFamily="var(--font-heading)"
                      fontWeight="700"
                    >
                      {km} km
                    </text>
                  </g>
                );
              })}

              <line
                x1={centerPt.x - scopeRadius}
                y1={centerPt.y}
                x2={centerPt.x + scopeRadius}
                y2={centerPt.y}
                stroke={radarMode === 'ppi' ? 'rgba(255, 90, 60, 0.2)' : 'rgba(141, 154, 143, 0.3)'}
                strokeWidth="0.8"
              />
              <line
                x1={centerPt.x}
                y1={centerPt.y - scopeRadius}
                x2={centerPt.x}
                y2={centerPt.y + scopeRadius}
                stroke={radarMode === 'ppi' ? 'rgba(255, 90, 60, 0.2)' : 'rgba(141, 154, 143, 0.3)'}
                strokeWidth="0.8"
              />
            </g>
          )}

          {/* Restricted Airspace Zones (clean circular clipping & edge labels) */}
          {activeLayers.zones &&
            zones.map((zone) => {
              const pos = project(zone.center.lat, zone.center.lng);
              const radiusPx = zone.radiusKm * 40 * zoom;

              return (
                <g key={zone.id}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radiusPx}
                    fill={radarMode === 'ppi' ? 'rgba(255, 90, 60, 0.25)' : 'rgba(166, 27, 27, 0.12)'}
                    stroke="var(--color-crit)"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                  />
                  {/* Zone Tag on top edge */}
                  <g transform={`translate(${pos.x - 42}, ${pos.y - radiusPx - 8})`}>
                    <rect
                      x="0"
                      y="0"
                      width="84"
                      height="16"
                      fill="var(--color-sheet)"
                      stroke="var(--color-crit)"
                      strokeWidth="1"
                    />
                    <text
                      x="42"
                      y="11.5"
                      fill="var(--color-crit)"
                      fontSize="8"
                      fontFamily="var(--font-heading)"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {zone.name.length > 16 ? zone.name.substring(0, 15) + '…' : zone.name}
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
                <g key={edge.id}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={
                      edge.blocked
                        ? 'rgba(220, 38, 38, 0.65)'
                        : isRouteEdge
                        ? 'var(--color-ok)'
                        : '#C3CCC1'
                    }
                    strokeWidth={isRouteEdge ? 3.5 : edge.blocked ? 2 : 1.6}
                    strokeDasharray={edge.blocked ? '6 3' : undefined}
                  />

                  {/* Red Cross Barricade for Blocked Road */}
                  {edge.blocked && (
                    <g transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2})`}>
                      <line x1="-7" y1="-7" x2="7" y2="7" stroke="var(--color-crit)" strokeWidth="2.5" />
                      <line x1="-7" y1="7" x2="7" y2="-7" stroke="var(--color-crit)" strokeWidth="2.5" />
                    </g>
                  )}
                </g>
              );
            })}

          {/* Evacuation Nodes & Medical Facilities with hover names and legend */}
          {activeLayers.routes &&
            nodes.map((node) => {
              const pos = project(node.coordinates.lat, node.coordinates.lng);
              const isHospital = node.type === 'hospital';

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer' }}
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
                        fill="#FFFFFF"
                        stroke="var(--color-ok)"
                        strokeWidth="1.5"
                      />
                      <rect x="8" y="3" width="4" height="14" fill="var(--color-ok)" />
                      <rect x="3" y="8" width="14" height="4" fill="var(--color-ok)" />
                    </g>
                  ) : (
                    <g>
                      <circle
                        r="10"
                        fill="#FFFFFF"
                        stroke="var(--color-info)"
                        strokeWidth="1.5"
                      />
                      <text
                        y="3.5"
                        fill="var(--color-info)"
                        fontSize="9"
                        fontFamily="var(--font-heading)"
                        fontWeight="800"
                        textAnchor="middle"
                      >
                        {node.name.charAt(0)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

          {/* FieldLink Ground Incidents */}
          {activeLayers.incidents &&
            incidents.map((inc) => {
              const pos = project(inc.location.lat, inc.location.lng);

              return (
                <g
                  key={inc.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEntity?.({ type: 'incident', id: inc.id, raw: inc });
                  }}
                >
                  <title>{inc.title}</title>
                  <circle r="14" fill="none" stroke="var(--color-crit)" strokeWidth="1.2" />
                  <circle r="9" fill="none" stroke="var(--color-crit)" strokeWidth="0.8" />
                  <circle r="4.5" fill="var(--color-crit)" />

                  <g transform="translate(18, -24)">
                    <line x1="-12" y1="18" x2="0" y2="0" stroke="var(--color-crit)" strokeWidth="1" />
                    <rect
                      x="0"
                      y="-14"
                      width="135"
                      height="28"
                      fill="var(--color-sheet)"
                      stroke="var(--color-crit)"
                      strokeWidth="1.2"
                    />
                    <text
                      x="6"
                      y="-3"
                      fill="var(--color-crit)"
                      fontSize="8.5"
                      fontFamily="var(--font-heading)"
                      fontWeight="700"
                    >
                      {inc.priority === 'critical' ? 'Critical' : 'Incident'}, {inc.id}
                    </text>
                    <text
                      x="6"
                      y="8"
                      fill="var(--text-primary)"
                      fontSize="7.5"
                      fontFamily="var(--font-body)"
                    >
                      {inc.title.length > 20 ? inc.title.substring(0, 19) + '…' : inc.title}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* SkyWatch Airspace Telemetry Tracks with 8-Offset Declutter Algorithm */}
          {activeLayers.airspace &&
            tracks.map((track) => {
              const pos = project(track.lat, track.lng);
              const isHostile = track.status === 'hostile' || track.status === 'suspicious';
              const isFriendly = track.type === 'friendly_uav' || (track.status as string) === 'friendly';
              const isNeutral = track.type === 'commercial_fixed_wing' || (track.status as string) === 'neutral';

              const layout = computedTrackLayouts.get(track.id) || {
                offset: CANDIDATE_OFFSETS[0],
                collapsed: false,
                boxW: 95,
                boxH: 26,
              };

              return (
                <g key={track.id}>
                  {/* Flight History Dots */}
                  {track.flightHistory.slice(-4, -1).map((hist, hIdx) => {
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

                  <g
                    transform={`translate(${pos.x}, ${pos.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEntity?.({ type: 'track', id: track.id, raw: track });
                    }}
                  >
                    <title>{`${track.callsign} (${track.status}) - ${track.altitude}m, ${Math.round(track.speed)} km/h`}</title>

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

                    {/* Flight Data Block with Leader Line */}
                    <g transform={`translate(${layout.offset.dx}, ${layout.offset.dy})`}>
                      <line
                        x1={layout.offset.anchorX}
                        y1={layout.offset.anchorY}
                        x2={0}
                        y2={0}
                        stroke="var(--color-edge)"
                        strokeWidth="1"
                      />
                      <rect
                        x="0"
                        y="-12"
                        width={layout.boxW}
                        height={layout.boxH}
                        fill="var(--color-sheet)"
                        stroke="var(--color-edge)"
                        strokeWidth="1"
                      />
                      <text
                        x="5"
                        y={layout.collapsed ? 0 : -1}
                        fill="var(--text-primary)"
                        fontSize="8"
                        fontFamily="var(--font-heading)"
                        fontWeight="700"
                      >
                        {track.callsign.length > 14 ? track.callsign.substring(0, 13) + '…' : track.callsign}
                      </text>
                      {!layout.collapsed && (
                        <text
                          x="5"
                          y="9.5"
                          fill="var(--text-secondary)"
                          fontSize="7"
                          fontFamily="var(--font-heading)"
                          data-numeral="true"
                        >
                          {track.altitude}m {Math.round(track.speed)}km/h
                        </text>
                      )}
                    </g>
                  </g>
                </g>
              );
            })}

          {/* Continuous Rotating Radar Sweep Beam */}
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
              <path
                d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 12)}
                fill="rgba(255, 90, 60, 0.28)"
              />
              <path
                d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 28)}
                fill="rgba(255, 90, 60, 0.16)"
              />
              <path
                d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 46)}
                fill="rgba(255, 90, 60, 0.08)"
              />
              <path
                d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 64)}
                fill="rgba(255, 90, 60, 0.03)"
              />
              <line
                x1={centerPt.x}
                y1={centerPt.y}
                x2={centerPt.x}
                y2={centerPt.y - scopeRadius}
                stroke="var(--color-accent)"
                strokeWidth="2"
              />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
