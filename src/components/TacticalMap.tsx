import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';

interface TacticalMapProps {
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
}

interface StaticRadarScopeBezelProps {
  centerPt: { x: number; y: number };
  scopeRadius: number;
  radarMode: 'ppi' | 'flir' | 'topo';
  showTerrain: boolean;
  showRangeRings: boolean;
}

const StaticRadarScopeBezel = React.memo<StaticRadarScopeBezelProps>(({
  centerPt,
  scopeRadius,
  radarMode,
  showTerrain,
  showRangeRings,
}) => {
  return (
    <>
      {/* Scope Outer Housing Bezel & Instrument Rim */}
      <g pointerEvents="none">
        <rect width="1000" height="680" fill="url(#radar-drafting-grid)" />
        <circle
          cx={centerPt.x}
          cy={centerPt.y}
          r={scopeRadius + 14}
          fill="#090E17"
          stroke="rgba(56, 189, 248, 0.3)"
          strokeWidth="3"
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
              stroke={isMajor ? '#00F2FE' : isMedium ? 'rgba(0, 242, 254, 0.7)' : 'rgba(0, 242, 254, 0.3)'}
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
          let label = `${deg.toString().padStart(3, '0')}°`;
          let isCardinal = false;
          let color = '#94A3B8';
          if (deg === 0) { label = 'N 000°'; isCardinal = true; color = '#00F2FE'; }
          else if (deg === 90) { label = 'E 090°'; isCardinal = true; color = '#00F2FE'; }
          else if (deg === 180) { label = 'S 180°'; isCardinal = true; color = '#00F2FE'; }
          else if (deg === 270) { label = 'W 270°'; isCardinal = true; color = '#00F2FE'; }
          return (
            <text
              key={`az-deg-${deg}`}
              x={x}
              y={y}
              fill={color}
              fontSize={isCardinal ? '10' : '8'}
              fontFamily="var(--font-mono)"
              fontWeight={isCardinal ? '800' : '600'}
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
        fill={radarMode === 'flir' ? 'url(#flir-gradient)' : 'url(#crt-glass-gradient)'}
      />
      <rect
        x={centerPt.x - scopeRadius}
        y={centerPt.y - scopeRadius}
        width={scopeRadius * 2}
        height={scopeRadius * 2}
        fill="url(#radar-scanlines)"
        pointerEvents="none"
      />
      {showTerrain && (
        <g opacity={radarMode === 'flir' ? 0.25 : 0.16} pointerEvents="none">
          <path d="M 160,420 Q 320,360 480,380 T 680,320 T 840,300 T 960,330" fill="none" stroke={radarMode === 'flir' ? '#EF4444' : '#00F2FE'} strokeWidth="1.2" strokeDasharray="6,4" />
          <path d="M 120,500 Q 300,450 510,480 T 740,420 T 920,460" fill="none" stroke={radarMode === 'flir' ? '#EF4444' : '#00F2FE'} strokeWidth="1" strokeDasharray="4,6" />
          <path d="M 280,200 Q 440,150 620,180 T 840,160" fill="none" stroke={radarMode === 'flir' ? '#EF4444' : '#00F2FE'} strokeWidth="0.8" strokeDasharray="3,5" />
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
                <circle cx={centerPt.x} cy={centerPt.y} r={r} fill="none" stroke={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 242, 254, 0.22)'} strokeWidth={ratio === 1.0 ? '1.5' : '1'} strokeDasharray={ratio === 1.0 ? undefined : '4,6'} />
                <text x={centerPt.x + r + 5} y={centerPt.y - 4} fill={radarMode === 'flir' ? '#FCA5A5' : '#7DD3FC'} fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="700">
                  {km}KM / {nm}NM
                </text>
                <text x={centerPt.x - r - 5} y={centerPt.y - 4} fill={radarMode === 'flir' ? '#FCA5A5' : '#7DD3FC'} fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="700" textAnchor="end">
                  {km}KM
                </text>
              </g>
            );
          })}
          <line x1={centerPt.x - scopeRadius} y1={centerPt.y} x2={centerPt.x + scopeRadius} y2={centerPt.y} stroke={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 242, 254, 0.28)'} strokeWidth="1" />
          <line x1={centerPt.x} y1={centerPt.y - scopeRadius} x2={centerPt.x} y2={centerPt.y + scopeRadius} stroke={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 242, 254, 0.28)'} strokeWidth="1" />
          {[-220, -165, -110, -55, 55, 110, 165, 220].map((offset) => (
            <g key={`mil-${offset}`}>
              <line x1={centerPt.x + offset} y1={centerPt.y - 3} x2={centerPt.x + offset} y2={centerPt.y + 3} stroke="rgba(0, 242, 254, 0.5)" strokeWidth="1" />
              <line x1={centerPt.x - 3} y1={centerPt.y + offset} x2={centerPt.x + 3} y2={centerPt.y + offset} stroke="rgba(0, 242, 254, 0.5)" strokeWidth="1" />
            </g>
          ))}
          {Array.from({ length: 12 }).map((_, i) => {
            const deg = i * 30;
            if (deg % 90 === 0) return null;
            const rad = (deg * Math.PI) / 180;
            return (
              <line key={`rad-spoke-${deg}`} x1={centerPt.x} y1={centerPt.y} x2={centerPt.x + Math.sin(rad) * scopeRadius} y2={centerPt.y - Math.cos(rad) * scopeRadius} stroke="rgba(0, 242, 254, 0.12)" strokeWidth="0.8" strokeDasharray="2,6" />
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
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [sweepActive, setSweepActive] = useState(showRadarSweep);
  const [radarMode, setRadarMode] = useState<'topo' | 'ppi' | 'flir'>(
    initialMode === 'radar' ? 'ppi' : initialMode === 'thermal' ? 'flir' : 'topo'
  );
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

  // Center coordinate around Los Angeles Tactical Sector Demo: ~34.060, -118.245
  const centerLat = 34.060;
  const centerLng = -118.245;
  const scale = 11000 * zoom;

  const project = (lat: number, lng: number) => {
    const x = 500 + (lng - centerLng) * scale + pan.x;
    const y = 350 - (lat - centerLat) * scale + pan.y;
    return { x, y };
  };

  const unproject = (x: number, y: number) => {
    const lng = centerLng + (x - 500 - pan.x) / scale;
    const lat = centerLat - (y - 350 - pan.y) / scale;
    return { lat, lng };
  };

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

  // Generate SVG path for angular phosphor sweep wedge (angle in degrees)
  const createSweepWedgePath = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const x2 = cx - Math.sin(rad) * r;
    const y2 = cy - Math.cos(rad) * r;
    return `M ${cx},${cy} L ${cx},${cy - r} A ${r},${r} 0 0,0 ${x2},${y2} Z`;
  };

  const computedHeight = isFullscreen ? '100vh' : height;

  return (
    <div
      ref={containerRef}
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
        borderRight: 'var(--border-width, 1.2px) solid var(--color-edge)',
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
      {/* 1. Mode Segmented Switch (Chart / Radar / Thermal) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          border: 'var(--border-width, 1.2px) solid var(--color-edge)',
          boxShadow: 'var(--shadow-flat-sm)',
          background: 'var(--color-sheet)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setRadarMode('topo')}
          style={{
            background: radarMode === 'topo' ? 'var(--color-strip)' : 'transparent',
            color: radarMode === 'topo' ? '#FFFFFF' : 'var(--text-primary)',
            border: 'none',
            padding: '5px 16px',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Chart
        </button>
        <button
          type="button"
          onClick={() => setRadarMode('ppi')}
          style={{
            background: radarMode === 'ppi' ? 'var(--color-strip)' : 'transparent',
            color: radarMode === 'ppi' ? '#FFFFFF' : 'var(--text-primary)',
            border: 'none',
            padding: '5px 16px',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            cursor: 'pointer',
            borderLeft: '1px solid var(--color-edge)',
            borderRight: '1px solid var(--color-edge)',
          }}
        >
          Radar
        </button>
        <button
          type="button"
          onClick={() => setRadarMode('flir')}
          style={{
            background: radarMode === 'flir' ? 'var(--color-strip)' : 'transparent',
            color: radarMode === 'flir' ? '#FFFFFF' : 'var(--text-primary)',
            border: 'none',
            padding: '5px 16px',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Thermal
        </button>
      </div>

      {/* 2. Floating Layers Panel (Bottom-Left) */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          left: '16px',
          zIndex: 20,
          background: 'var(--color-sheet)',
          border: 'var(--border-width, 1.2px) solid var(--color-edge)',
          boxShadow: 'var(--shadow-flat)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          width: '135px',
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: '0.85rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '6px',
          }}
        >
          Layers
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem' }}>
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

      {/* 3. Coordinate Readout (Bottom-Left, below layers panel) */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '16px',
          zIndex: 20,
          fontSize: '0.74rem',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-primary)',
          letterSpacing: '0.02em',
          pointerEvents: 'none',
        }}
      >
        {mouseCoord.lat} {mouseCoord.lng} {mouseCoord.elev}
      </div>

      {/* 4. Zoom Controls Stack (Bottom-Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: '60px',
          right: '16px',
          zIndex: 20,
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

      {/* 5. Main SVG Canvas */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1000 680"
        style={{ display: 'block', flex: 1 }}
      >
        <defs>
          <clipPath id="radar-scope-circle">
            <circle cx={centerPt.x} cy={centerPt.y} r={scopeRadius} />
          </clipPath>
        </defs>

        {/* Tactical Grid (Letters A-E and Numbers 31-37) */}
        {activeLayers.grid && (
          <g opacity={0.65}>
            {/* Horizontal Grid Lines */}
            {[130, 240, 350, 460, 570].map((y, i) => (
              <g key={`grid-h-${i}`}>
                <line x1="0" y1={y} x2="1000" y2={y} stroke="var(--color-grid)" strokeWidth="0.8" strokeDasharray="3 3" />
                <text x="8" y={y + 12} fill="var(--color-grid)" fontSize="9" fontWeight="700">
                  {String.fromCharCode(65 + i)}
                </text>
              </g>
            ))}
            {/* Vertical Grid Lines */}
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

        {/* Natural Topography / Water / Forest (Chart mode) */}
        {radarMode === 'topo' && (
          <g>
            {/* River / Water body */}
            <path
              d="M 0,520 Q 200,500 400,530 T 700,480 T 1000,510 L 1000,560 Q 700,530 400,580 T 0,570 Z"
              fill="var(--color-water)"
              stroke="#A2C8DC"
              strokeWidth="1.2"
            />
            {/* Forest patch Alpha */}
            <path
              d="M 160,590 Q 240,550 320,590 T 360,670 T 200,680 Z"
              fill="var(--color-forest)"
              opacity="0.75"
            />
            {/* Contour lines */}
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
            {/* Dark Scope Background */}
            <circle
              cx={centerPt.x}
              cy={centerPt.y}
              r={scopeRadius + 16}
              fill="#0E0505"
              stroke="var(--color-edge)"
              strokeWidth="2"
            />

            {/* 360-Degree Azimuth Tick Marks */}
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

            {/* Azimuth Bearing Labels (000, 030, 060, ... 330) */}
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
                  fontFamily="var(--font-body)"
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
        <g clipPath={(radarMode === 'ppi' || radarMode === 'flir') ? 'url(#radar-scope-circle)' : undefined}>
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
                      fontFamily="var(--font-body)"
                      fontWeight="700"
                    >
                      {km} km
                    </text>
                  </g>
                );
              })}

              {/* Scope Crosshairs */}
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

          {/* Restricted Airspace Zones */}
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
                  {/* Zone Tag */}
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
                      {zone.name || 'Restricted R-2'}
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
                        ? 'var(--color-crit)'
                        : isRouteEdge
                        ? 'var(--color-ok)'
                        : '#C3CCC1'
                    }
                    strokeWidth={isRouteEdge ? 3.5 : edge.blocked ? 2.5 : 1.6}
                    strokeDasharray={edge.blocked ? '6 3' : undefined}
                  />

                  {/* Red Cross Barricade for Blocked Road */}
                  {edge.blocked && (
                    <g transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2})`}>
                      <line x1="-8" y1="-8" x2="8" y2="8" stroke="var(--color-crit)" strokeWidth="3" />
                      <line x1="-8" y1="8" x2="8" y2="-8" stroke="var(--color-crit)" strokeWidth="3" />
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
                  {isHospital ? (
                    /* Hospital: White square with green cross (Spec 09) */
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
                    /* Aid Station / Collection Point Node */
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

          {/* FieldLink Ground Incidents (Spec: Concentric Rings) */}
          {activeLayers.incidents &&
            incidents.map((inc) => {
              const pos = project(inc.location.lat, inc.location.lng);
              const isSelected = selectedEntityId === inc.id;

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
                  {/* Outer Ring */}
                  <circle
                    r="14"
                    fill="none"
                    stroke="var(--color-crit)"
                    strokeWidth="1.2"
                  />
                  {/* Inner Ring */}
                  <circle
                    r="9"
                    fill="none"
                    stroke="var(--color-crit)"
                    strokeWidth="0.8"
                  />
                  {/* Solid Center Pip */}
                  <circle
                    r="4.5"
                    fill="var(--color-crit)"
                  />

                  {/* FDB Callout Tag for Incidents */}
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

          {/* SkyWatch Airspace Telemetry Tracks */}
          {activeLayers.airspace &&
            tracks.map((track) => {
              const pos = project(track.lat, track.lng);
              const isSelected = selectedEntityId === track.id;
              const isHostile = track.status === 'hostile' || track.status === 'suspicious';
              const isFriendly = track.type === 'friendly_uav' || (track.status as string) === 'friendly';
              const isNeutral = track.type === 'commercial_fixed_wing' || (track.status as string) === 'neutral';
              const isUnknown = !isHostile && !isNeutral && !isFriendly;

              return (
                <g key={track.id}>
                  {/* History Trail Dots */}
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

                  {/* Trajectory Prediction: 60-second forward projected path as dotted line */}
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

                  <g
                    transform={`translate(${pos.x}, ${pos.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEntity?.({ type: 'track', id: track.id, raw: track });
                    }}
                  >
                    {/* Entity Symbol Shape (Spec 09) */}
                    {isHostile ? (
                      /* Hostile: Diamond with X inside */
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
                      /* Friendly: Rectangle with Triangle inside */
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
                      /* Neutral: Square with Triangle inside */
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
                      /* Unknown: Clover/Cloud */
                      <g>
                        <circle cx="-5" cy="0" r="5" fill="var(--entity-unknown-fill)" stroke="var(--entity-unknown-stroke)" strokeWidth="1.2" />
                        <circle cx="5" cy="0" r="5" fill="var(--entity-unknown-fill)" stroke="var(--entity-unknown-stroke)" strokeWidth="1.2" />
                        <circle cx="0" cy="-5" r="5" fill="var(--entity-unknown-fill)" stroke="var(--entity-unknown-stroke)" strokeWidth="1.2" />
                        <circle cx="0" cy="5" r="5" fill="var(--entity-unknown-fill)" stroke="var(--entity-unknown-stroke)" strokeWidth="1.2" />
                        <circle cx="0" cy="0" r="4" fill="var(--entity-unknown-fill)" />
                      </g>
                    )}

                    {/* Flight Data Block (FDB) Callout */}
                    <g transform="translate(18, -20)">
                      <line x1="-12" y1="14" x2="0" y2="0" stroke="var(--color-edge)" strokeWidth="1" />
                      <rect
                        x="0"
                        y="-12"
                        width="95"
                        height="26"
                        fill="var(--color-sheet)"
                        stroke="var(--color-edge)"
                        strokeWidth="1"
                      />
                      <text
                        x="6"
                        y="-1"
                        fill="var(--text-primary)"
                        fontSize="8.5"
                        fontFamily="var(--font-heading)"
                        fontWeight="700"
                      >
                        {track.callsign}
                      </text>
                      <text
                        x="6"
                        y="9.5"
                        fill="var(--text-secondary)"
                        fontSize="7"
                        fontFamily="var(--font-body)"
                      >
                        {track.altitude} m, {track.speed} km/h
                      </text>
                    </g>
                  </g>
                </g>
              );
            })}

          {/* Continuous Rotating Radar Sweep Beam (Radar / PPI mode) */}
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

              {/* Trailing Phosphor Wedges */}
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

              {/* Leading Laser Line */}
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

          {/* Shared Tactical Map Markers (FieldLink Mesh Sync) */}
          {(markers || []).map((marker) => {
            const pos = project(marker.location.lat, marker.location.lng);
            const isRally = marker.type === 'rally_point';
            const isContact = marker.type === 'contact';
            const color = isRally ? '#10B981' : isContact ? '#EF4444' : '#F59E0B';

            return (
              <g
                key={marker.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEntity?.({ type: 'marker', id: marker.id, raw: marker });
                }}
              >
                <title>{`Tactical Marker [${marker.type.toUpperCase()}]: ${marker.label} • Node ${marker.createdByNode}`}</title>
                <circle r="10" fill="rgba(9, 14, 24, 0.95)" stroke={color} strokeWidth="2" filter="url(#radar-glow-cyan)" />
                <text y="3.5" fill={color} fontSize="9" fontFamily="var(--font-mono)" fontWeight="800" textAnchor="middle">
                  {isRally ? '⚑' : isContact ? '✕' : '▲'}
                </text>
                <g transform="translate(13, -7)">
                  <rect x="0" y="0" width="84" height="15" rx="3" fill="rgba(9, 14, 24, 0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
                  <text x="42" y="11" fill="#E2E8F0" fontSize="7.5" fontFamily="var(--font-mono)" fontWeight="700" textAnchor="middle">
                    {marker.label.substring(0, 14)}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Central Radar Transmitter Antenna Node */}
          <circle cx={centerPt.x} cy={centerPt.y} r="3.5" fill="#00F2FE" />
          <circle cx={centerPt.x} cy={centerPt.y} r="8" fill="none" stroke="#00F2FE" strokeWidth="1.2" opacity="0.75" />
          <circle cx={centerPt.x} cy={centerPt.y} r="14" fill="none" stroke="#00F2FE" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.45" />
        </g>
      </svg>
    </div>
  );
};
