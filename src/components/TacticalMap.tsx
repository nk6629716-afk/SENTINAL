import React, { useState, useRef, useEffect } from 'react';
import {
  IncidentReport,
  TelemetryTrack,
  RestrictedAirspaceZone,
  RoadHazardEdge,
  EvacuationNode,
  CalculatedRoute,
} from '@shared/types';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Radio,
  Eye,
  Crosshair,
  ShieldAlert,
  Activity,
  Maximize2,
} from 'lucide-react';

interface TacticalMapProps {
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
  height = '520px',
  showRadarSweep = true,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [sweepActive, setSweepActive] = useState(showRadarSweep);
  const [radarMode, setRadarMode] = useState<'ppi' | 'flir' | 'topo'>('ppi');
  const [mouseCoord, setMouseCoord] = useState<{ lat: string; lng: string; elev: string }>({
    lat: '34.0600° N',
    lng: '118.2450° W',
    elev: '84m MSL',
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
  const [hoveredEntity, setHoveredEntity] = useState<any | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Center coordinate around Los Angeles Tactical Sector Demo: ~34.060, -118.245
  const centerLat = 34.060;
  const centerLng = -118.245;
  const scale = 9500 * zoom;

  const project = (lat: number, lng: number) => {
    const x = 400 + (lng - centerLng) * scale + pan.x;
    const y = 300 - (lat - centerLat) * scale + pan.y;
    return { x, y };
  };

  const unproject = (x: number, y: number) => {
    const lng = centerLng + (x - 400 - pan.x) / scale;
    const lat = centerLat - (y - 300 - pan.y) / scale;
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
      const svgX = ((e.clientX - rect.left) / rect.width) * 800;
      const svgY = ((e.clientY - rect.top) / rect.height) * 600;
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

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const centerPt = { x: 400 + pan.x, y: 300 + pan.y };
  const scopeRadius = 265 * zoom;

  // Generate SVG path for an angular phosphor sweep wedge (angle in degrees)
  const createSweepWedgePath = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const x2 = cx - Math.sin(rad) * r;
    const y2 = cy - Math.cos(rad) * r;
    return `M ${cx},${cy} L ${cx},${cy - r} A ${r},${r} 0 0,0 ${x2},${y2} Z`;
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height,
        width: '100%',
        backgroundColor: '#04070D',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'inset 0 0 50px rgba(0, 0, 0, 0.85), 0 8px 30px rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
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
      {/* 1. Tactical HUD Header Telemetry Bar (Top) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 25,
          padding: '8px 16px',
          background: 'linear-gradient(180deg, rgba(4, 7, 13, 0.95) 0%, rgba(4, 7, 13, 0.7) 70%, transparent 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          color: '#94A3B8',
          borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00F2FE', fontWeight: 800 }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00F2FE', boxShadow: '0 0 8px #00F2FE' }} />
            <span>RADAR SCOPE // AN/TPS-77 3D C4ISR</span>
          </div>
          <span style={{ color: '#64748B' }}>•</span>
          <span>FREQ: 9.41 GHz [X-BAND]</span>
          <span style={{ color: '#64748B' }}>•</span>
          <span>PRF: 1200 Hz</span>
          <span style={{ color: '#64748B' }}>•</span>
          <span>RPM: 15.0</span>
          <span style={{ color: '#64748B' }}>•</span>
          <span style={{ color: '#10B981', fontWeight: 700 }}>STC/FTC: ACTIVE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#E2E8F0', fontWeight: 700 }}>
            POS: <span style={{ color: '#00F2FE' }}>{mouseCoord.lat} {mouseCoord.lng}</span>
          </span>
          <span style={{ color: '#E2E8F0', fontWeight: 700 }}>
            ELEV: <span style={{ color: '#F59E0B' }}>{mouseCoord.elev}</span>
          </span>
        </div>
      </div>

      {/* 2. Interactive Tactical Controls Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '16px',
          right: '16px',
          zIndex: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Layer Filters Strip */}
        <div
          style={{
            background: 'rgba(9, 14, 24, 0.92)',
            backdropFilter: 'blur(10px)',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            padding: '5px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.72rem',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, color: '#00F2FE' }}>
            <Layers size={13} />
            <span>LAYERS:</span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#F1F5F9' }}>
            <input
              type="checkbox"
              checked={activeLayers.airspace}
              onChange={() => toggleLayer('airspace')}
              style={{ accentColor: '#00F2FE', cursor: 'pointer' }}
            />
            Air ({tracks.length})
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#F1F5F9' }}>
            <input
              type="checkbox"
              checked={activeLayers.incidents}
              onChange={() => toggleLayer('incidents')}
              style={{ accentColor: '#00F2FE', cursor: 'pointer' }}
            />
            Ground ({incidents.length})
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#F1F5F9' }}>
            <input
              type="checkbox"
              checked={activeLayers.routes}
              onChange={() => toggleLayer('routes')}
              style={{ accentColor: '#00F2FE', cursor: 'pointer' }}
            />
            Corridors ({nodes.length})
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#F1F5F9' }}>
            <input
              type="checkbox"
              checked={activeLayers.zones}
              onChange={() => toggleLayer('zones')}
              style={{ accentColor: '#00F2FE', cursor: 'pointer' }}
            />
            Geofences ({zones.length})
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#F1F5F9' }}>
            <input
              type="checkbox"
              checked={sweepActive}
              onChange={(e) => setSweepActive(e.target.checked)}
              style={{ accentColor: '#00F2FE', cursor: 'pointer' }}
            />
            Radar Sweep
          </label>
        </div>

        {/* View Mode & Zoom Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
          {/* Radar Mode Selector */}
          <div
            style={{
              background: 'rgba(9, 14, 24, 0.92)',
              backdropFilter: 'blur(10px)',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              padding: '3px 4px',
              display: 'flex',
              gap: '2px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
            }}
          >
            <button
              onClick={() => setRadarMode('ppi')}
              style={{
                background: radarMode === 'ppi' ? 'rgba(0, 242, 254, 0.25)' : 'transparent',
                color: radarMode === 'ppi' ? '#00F2FE' : '#94A3B8',
                border: radarMode === 'ppi' ? '1px solid #00F2FE' : '1px solid transparent',
                borderRadius: 'var(--radius-pill)',
                padding: '3px 10px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              PPI SCOPE
            </button>
            <button
              onClick={() => setRadarMode('flir')}
              style={{
                background: radarMode === 'flir' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                color: radarMode === 'flir' ? '#EF4444' : '#94A3B8',
                border: radarMode === 'flir' ? '1px solid #EF4444' : '1px solid transparent',
                borderRadius: 'var(--radius-pill)',
                padding: '3px 10px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              IR / FLIR
            </button>
            <button
              onClick={() => setRadarMode('topo')}
              style={{
                background: radarMode === 'topo' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                color: radarMode === 'topo' ? '#10B981' : '#94A3B8',
                border: radarMode === 'topo' ? '1px solid #10B981' : '1px solid transparent',
                borderRadius: 'var(--radius-pill)',
                padding: '3px 10px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              TERRAIN
            </button>
          </div>

          {/* Zoom Buttons */}
          <div
            style={{
              background: 'rgba(9, 14, 24, 0.92)',
              backdropFilter: 'blur(10px)',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              padding: '3px 6px',
              display: 'flex',
              gap: '4px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
            }}
          >
            <button
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Zoom In"
              onClick={() => setZoom((z) => Math.min(z * 1.25, 3.5))}
            >
              <ZoomIn size={13} />
            </button>
            <button
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Zoom Out"
              onClick={() => setZoom((z) => Math.max(z * 0.8, 0.5))}
            >
              <ZoomOut size={13} />
            </button>
            <button
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Center Radar Scope"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Authentic Plan Position Indicator (PPI) SVG Canvas */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        style={{ display: 'block', flex: 1 }}
      >
        <defs>
          {/* Tactical Phosphor Glow Filters */}
          <filter id="radar-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="radar-glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="radar-glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* CRT Scope Glass Radial Vignette */}
          <radialGradient id="crt-glass-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0B1C28" stopOpacity={radarMode === 'flir' ? 0.35 : 0.85} />
            <stop offset="65%" stopColor="#06121C" stopOpacity={radarMode === 'flir' ? 0.6 : 0.95} />
            <stop offset="95%" stopColor="#02070D" stopOpacity="1" />
            <stop offset="100%" stopColor="#010306" stopOpacity="1" />
          </radialGradient>

          {/* FLIR Thermal Overlay Gradient */}
          <radialGradient id="flir-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2A0B0B" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#150505" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#050101" stopOpacity="1" />
          </radialGradient>

          {/* CRT Horizontal Scanlines */}
          <pattern id="radar-scanlines" width="100" height="4" patternUnits="userSpaceOnUse">
            <line x1="0" y1="2" x2="100" y2="2" stroke="rgba(0, 242, 254, 0.04)" strokeWidth="0.8" />
          </pattern>

          {/* Mil-Spec Coordinate Grid */}
          <pattern id="radar-drafting-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <line x1="0" y1="40" x2="40" y2="40" stroke="rgba(0, 242, 254, 0.05)" strokeWidth="0.6" />
            <line x1="40" y1="0" x2="40" y2="40" stroke="rgba(0, 242, 254, 0.05)" strokeWidth="0.6" />
            <circle cx="40" cy="40" r="0.8" fill="rgba(0, 242, 254, 0.2)" />
          </pattern>

          {/* Clipping path keeping all radar sweep and imagery strictly within the circular scope */}
          <clipPath id="radar-scope-circular-aperture">
            <circle cx={centerPt.x} cy={centerPt.y} r={scopeRadius} />
          </clipPath>
        </defs>

        {/* 4. Scope Outer Housing Bezel & Instrument Rim */}
        <g pointerEvents="none">
          {/* Subtle Outer Enclosure Frame */}
          <rect width="800" height="600" fill="url(#radar-drafting-grid)" />

          {/* Dark Matte Scope Bezel Housing Ring */}
          <circle
            cx={centerPt.x}
            cy={centerPt.y}
            r={scopeRadius + 14}
            fill="#090E17"
            stroke="rgba(56, 189, 248, 0.3)"
            strokeWidth="3"
          />

          {/* 360-Degree Azimuth Compass Dial Around Circumference */}
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

          {/* Azimuth Bearing Degree Labels (000°, 030°, 060°, ... 330°) */}
          {Array.from({ length: 12 }).map((_, i) => {
            const deg = i * 30;
            const rad = (deg * Math.PI) / 180;
            const labelR = scopeRadius + 26;
            const x = centerPt.x + Math.sin(rad) * labelR;
            const y = centerPt.y - Math.cos(rad) * labelR + 3.5;

            let label = `${deg.toString().padStart(3, '0')}°`;
            let isCardinal = false;
            let color = '#94A3B8';

            if (deg === 0) {
              label = 'N 000°';
              isCardinal = true;
              color = '#00F2FE';
            } else if (deg === 90) {
              label = 'E 090°';
              isCardinal = true;
              color = '#00F2FE';
            } else if (deg === 180) {
              label = 'S 180°';
              isCardinal = true;
              color = '#00F2FE';
            } else if (deg === 270) {
              label = 'W 270°';
              isCardinal = true;
              color = '#00F2FE';
            }

            return (
              <text
                key={`az-deg-${deg}`}
                x={x}
                y={y}
                fill={color}
                fontSize={isCardinal ? '9.5' : '7.5'}
                fontFamily="var(--font-mono)"
                fontWeight={isCardinal ? '800' : '600'}
                textAnchor="middle"
              >
                {label}
              </text>
            );
          })}
        </g>

        {/* 5. Inside the Circular Radar Aperture (Masked to Scope) */}
        <g clipPath="url(#radar-scope-circular-aperture)">
          {/* CRT Glass Surface Fill */}
          <circle
            cx={centerPt.x}
            cy={centerPt.y}
            r={scopeRadius}
            fill={radarMode === 'flir' ? 'url(#flir-gradient)' : 'url(#crt-glass-gradient)'}
          />

          {/* CRT Horizontal Scanlines Overlay */}
          <rect
            x={centerPt.x - scopeRadius}
            y={centerPt.y - scopeRadius}
            width={scopeRadius * 2}
            height={scopeRadius * 2}
            fill="url(#radar-scanlines)"
            pointerEvents="none"
          />

          {/* Realistic Tactical Topography & Shoreline Contours */}
          {activeLayers.terrain && (
            <g opacity={radarMode === 'flir' ? 0.25 : 0.16} pointerEvents="none">
              {/* Regional River / Ridge Topo Contours */}
              <path
                d="M 120,380 Q 240,320 380,340 T 540,280 T 680,260 T 790,290"
                fill="none"
                stroke={radarMode === 'flir' ? '#EF4444' : '#00F2FE'}
                strokeWidth="1.2"
                strokeDasharray="6,4"
              />
              <path
                d="M 80,450 Q 220,410 390,440 T 580,380 T 760,420"
                fill="none"
                stroke={radarMode === 'flir' ? '#EF4444' : '#00F2FE'}
                strokeWidth="1"
                strokeDasharray="4,6"
              />
              <path
                d="M 220,160 Q 340,120 480,150 T 680,130"
                fill="none"
                stroke={radarMode === 'flir' ? '#EF4444' : '#00F2FE'}
                strokeWidth="0.8"
                strokeDasharray="3,5"
              />
            </g>
          )}

          {/* 6. Calibrated Concentric Range Rings & Mil-Dot Graticule */}
          {activeLayers.rangeRings && (
            <g pointerEvents="none">
              {/* Concentric Calibrated Range Circles (5K, 10K, 15K, 20K) */}
              {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                const r = scopeRadius * ratio;
                const km = (idx + 1) * 5;
                const nm = ((idx + 1) * 2.7).toFixed(1);

                return (
                  <g key={`ring-${idx}`}>
                    <circle
                      cx={centerPt.x}
                      cy={centerPt.y}
                      r={r}
                      fill="none"
                      stroke={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 242, 254, 0.22)'}
                      strokeWidth={ratio === 1.0 ? '1.5' : '1'}
                      strokeDasharray={ratio === 1.0 ? undefined : '4,6'}
                    />

                    {/* Range Etching along East Axis */}
                    <text
                      x={centerPt.x + r + 5}
                      y={centerPt.y - 4}
                      fill={radarMode === 'flir' ? '#FCA5A5' : '#7DD3FC'}
                      fontSize="8"
                      fontFamily="var(--font-mono)"
                      fontWeight="700"
                    >
                      {km}KM / {nm}NM
                    </text>

                    {/* Range Etching along West Axis */}
                    <text
                      x={centerPt.x - r - 5}
                      y={centerPt.y - 4}
                      fill={radarMode === 'flir' ? '#FCA5A5' : '#7DD3FC'}
                      fontSize="8"
                      fontFamily="var(--font-mono)"
                      fontWeight="700"
                      textAnchor="end"
                    >
                      {km}KM
                    </text>
                  </g>
                );
              })}

              {/* Orthogonal Major Crosshairs with Graduation Ticks */}
              <line
                x1={centerPt.x - scopeRadius}
                y1={centerPt.y}
                x2={centerPt.x + scopeRadius}
                y2={centerPt.y}
                stroke={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 242, 254, 0.28)'}
                strokeWidth="1"
              />
              <line
                x1={centerPt.x}
                y1={centerPt.y - scopeRadius}
                x2={centerPt.x}
                y2={centerPt.y + scopeRadius}
                stroke={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 242, 254, 0.28)'}
                strokeWidth="1"
              />

              {/* Mil-Dot Graduation Ticks along Axes */}
              {[-200, -150, -100, -50, 50, 100, 150, 200].map((offset) => (
                <g key={`mil-${offset}`}>
                  <line
                    x1={centerPt.x + offset}
                    y1={centerPt.y - 3}
                    x2={centerPt.x + offset}
                    y2={centerPt.y + 3}
                    stroke="rgba(0, 242, 254, 0.5)"
                    strokeWidth="1"
                  />
                  <line
                    x1={centerPt.x - 3}
                    y1={centerPt.y + offset}
                    x2={centerPt.x + 3}
                    y2={centerPt.y + offset}
                    stroke="rgba(0, 242, 254, 0.5)"
                    strokeWidth="1"
                  />
                </g>
              ))}

              {/* Radial Spokes every 30 degrees */}
              {Array.from({ length: 12 }).map((_, i) => {
                const deg = i * 30;
                if (deg % 90 === 0) return null; // Skip main axes
                const rad = (deg * Math.PI) / 180;
                return (
                  <line
                    key={`rad-spoke-${deg}`}
                    x1={centerPt.x}
                    y1={centerPt.y}
                    x2={centerPt.x + Math.sin(rad) * scopeRadius}
                    y2={centerPt.y - Math.cos(rad) * scopeRadius}
                    stroke="rgba(0, 242, 254, 0.12)"
                    strokeWidth="0.8"
                    strokeDasharray="2,6"
                  />
                );
              })}
            </g>
          )}

          {/* 7. Restricted Airspace Zones (No-Fly Geofences) */}
          {activeLayers.zones &&
            zones.map((zone) => {
              const pos = project(zone.center.lat, zone.center.lng);
              const radiusPx = zone.radiusKm * 40 * zoom;
              const isNoFly = zone.type === 'no_fly';

              return (
                <g key={zone.id}>
                  {/* Zone Area Shading */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radiusPx}
                    fill={isNoFly ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 242, 254, 0.08)'}
                    stroke={isNoFly ? '#EF4444' : '#00F2FE'}
                    strokeWidth="1.8"
                    strokeDasharray="6,4"
                    filter={isNoFly ? 'url(#radar-glow-red)' : 'url(#radar-glow-cyan)'}
                  />

                  {/* Geofence Perimeter Warning Text */}
                  <text
                    x={pos.x}
                    y={pos.y - radiusPx - 6}
                    fill={isNoFly ? '#FCA5A5' : '#7DD3FC'}
                    fontSize="8"
                    fontFamily="var(--font-mono)"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {isNoFly ? 'RESTRICTED AIRSPACE (NFZ)' : 'CONTROLLED AIRSPACE'} [{zone.ceilingMeters}m MSL]
                  </text>
                </g>
              );
            })}

          {/* 8. Evacuation Highway Corridors & Road Hazards (MediRoute) */}
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
                  {/* Highway Vector Line */}
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={
                      edge.blocked
                        ? '#EF4444'
                        : isRouteEdge
                        ? '#10B981'
                        : 'rgba(148, 163, 184, 0.55)'
                    }
                    strokeWidth={isRouteEdge ? 3.5 : edge.blocked ? 2.5 : 1.8}
                    strokeDasharray={edge.blocked ? '6,4' : undefined}
                    className={isRouteEdge ? 'route-active-glow' : undefined}
                  />

                  {/* Hazard Barricade Beacon */}
                  {edge.blocked && (
                    <g transform={`translate(${(p1.x + p2.x) / 2 - 12}, ${(p1.y + p2.y) / 2 - 12})`}>
                      <rect
                        x="0"
                        y="0"
                        width="24"
                        height="24"
                        rx="4"
                        fill="#DC2626"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        filter="url(#radar-glow-red)"
                      />
                      <text x="12" y="16" fill="#FFFFFF" fontSize="12" textAnchor="middle" fontWeight="bold">✕</text>
                    </g>
                  )}
                </g>
              );
            })}

          {/* 9. Evacuation Facilities & CCP Nodes */}
          {activeLayers.routes &&
            nodes.map((node) => {
              const pos = project(node.coordinates.lat, node.coordinates.lng);
              const isSelected = selectedEntityId === node.id;
              const isHospital = node.type === 'hospital';
              const isCCP = node.type === 'casualty_pickup';

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEntity?.({ type: 'node', id: node.id, raw: node });
                  }}
                  onMouseEnter={() =>
                    setHoveredEntity({
                      type: 'Evacuation Node',
                      title: node.name,
                      subtitle: `Type: ${node.type.toUpperCase()}`,
                    })
                  }
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Outer Pulsing Beacon */}
                  <circle
                    r="13"
                    fill="rgba(9, 14, 24, 0.95)"
                    stroke={isHospital ? '#10B981' : isCCP ? '#EF4444' : '#38BDF8'}
                    strokeWidth={isSelected ? 3 : 2}
                    filter={isHospital ? 'url(#radar-glow-cyan)' : undefined}
                  />
                  <text
                    y="4"
                    fill={isHospital ? '#6EE7B7' : isCCP ? '#FCA5A5' : '#BAE6FD'}
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {isHospital ? 'H' : isCCP ? 'C' : 'A'}
                  </text>

                  {/* Node Name Tag */}
                  <g transform="translate(16, -6)">
                    <rect
                      x="0"
                      y="0"
                      width="68"
                      height="15"
                      rx="3"
                      fill="rgba(9, 14, 24, 0.85)"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="0.8"
                    />
                    <text
                      x="34"
                      y="11"
                      fill="#E2E8F0"
                      fontSize="7.5"
                      fontFamily="var(--font-mono)"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {node.name.split(' ')[0]}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* 10. FieldLink Ground Incidents (Tactical Diamonds & Leader Blocks) */}
          {activeLayers.incidents &&
            incidents.map((inc) => {
              const pos = project(inc.location.lat, inc.location.lng);
              const isSelected = selectedEntityId === inc.id;
              const isCritical = inc.priority === 'critical';

              return (
                <g
                  key={inc.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEntity?.({ type: 'incident', id: inc.id, raw: inc });
                  }}
                  onMouseEnter={() =>
                    setHoveredEntity({
                      type: `Incident [${inc.priority.toUpperCase()}]`,
                      title: inc.title,
                      subtitle: `${inc.location.name} • Status: ${inc.status}`,
                    })
                  }
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Pulsing Tactical Ring for Critical Incidents */}
                  {isCritical && (
                    <circle
                      r="19"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="1.5"
                      className="radar-blip-pulse"
                      opacity="0.85"
                    />
                  )}

                  {/* Tactical Incident Diamond */}
                  <polygon
                    points="0,-10 10,0 0,10 -10,0"
                    fill={isCritical ? '#DC2626' : '#D97706'}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter={isCritical ? 'url(#radar-glow-red)' : 'url(#radar-glow-amber)'}
                  />

                  {/* High-Contrast Offset Data Tag with Fine Leader Line */}
                  <line x1="8" y1="-8" x2="22" y2="-18" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
                  <rect
                    x="22"
                    y="-27"
                    width="70"
                    height="18"
                    rx="3"
                    fill="rgba(9, 14, 24, 0.95)"
                    stroke={isCritical ? '#EF4444' : '#F59E0B'}
                    strokeWidth="1.2"
                  />
                  <text
                    x="57"
                    y="-15"
                    fill="#FFFFFF"
                    fontSize="8.5"
                    fontFamily="var(--font-mono)"
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {inc.id}
                  </text>
                </g>
              );
            })}

          {/* 11. SkyWatch Airspace Targets (Aviation Chevrons, History Trails, Velocity Sticks, Target Data Blocks) */}
          {activeLayers.airspace &&
            tracks.map((track) => {
              const pos = project(track.lat, track.lng);
              const isSelected = selectedEntityId === track.id;
              const isHostile = track.status === 'hostile' || track.status === 'suspicious';

              // Velocity Vector Line projecting 30 seconds ahead
              const vectorLength = Math.max(18, track.speed * 0.45 * zoom);
              const headingRad = (track.heading * Math.PI) / 180;
              const vectorX = Math.sin(headingRad) * vectorLength;
              const vectorY = -Math.cos(headingRad) * vectorLength;

              return (
                <g key={track.id}>
                  {/* Historical Phosphor Trail Dots (Decaying in Opacity) */}
                  {track.flightHistory.slice(-4, -1).map((hist, hIdx) => {
                    const hPos = project(hist.lat, hist.lng);
                    return (
                      <circle
                        key={`hist-${hIdx}`}
                        cx={hPos.x}
                        cy={hPos.y}
                        r="2.2"
                        fill={isHostile ? '#EF4444' : '#00F2FE'}
                        opacity={0.2 + hIdx * 0.22}
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
                    onMouseEnter={() =>
                      setHoveredEntity({
                        type: `UAV Track [${(track.type || 'uav').toUpperCase()}]`,
                        title: track.callsign,
                        subtitle: `Alt: ${track.altitude}m | Spd: ${track.speed}m/s | Hdg: ${track.heading}° | Status: ${track.status.toUpperCase()}`,
                      })
                    }
                    onMouseLeave={() => setHoveredEntity(null)}
                  >
                    {/* Hostile Target Acquisition Reticle Brackets */}
                    {isHostile && (
                      <g filter="url(#radar-glow-red)">
                        <circle r="18" fill="none" stroke="#EF4444" strokeWidth="1.2" strokeDasharray="4,4" className="radar-blip-pulse" />
                        {/* 4 Corner Acquisition Brackets */}
                        <path d="M -16,-10 L -16,-16 L -10,-16" fill="none" stroke="#EF4444" strokeWidth="1.8" />
                        <path d="M 16,-10 L 16,-16 L 10,-16" fill="none" stroke="#EF4444" strokeWidth="1.8" />
                        <path d="M -16,10 L -16,16 L -10,16" fill="none" stroke="#EF4444" strokeWidth="1.8" />
                        <path d="M 16,10 L 16,16 L 10,16" fill="none" stroke="#EF4444" strokeWidth="1.8" />
                      </g>
                    )}

                    {/* Velocity Vector Stick */}
                    <line
                      x1="0"
                      y1="0"
                      x2={vectorX}
                      y2={vectorY}
                      stroke={isHostile ? '#EF4444' : '#00F2FE'}
                      strokeWidth="1.8"
                      strokeDasharray="3,2"
                    />

                    {/* Swept Aircraft Delta Symbol Oriented to True Heading */}
                    <g transform={`rotate(${track.heading})`}>
                      <polygon
                        points="0,-11 7,7 0,3.5 -7,7"
                        fill={isHostile ? '#EF4444' : '#00F2FE'}
                        stroke="#FFFFFF"
                        strokeWidth={isSelected ? 2 : 1}
                        filter={isHostile ? 'url(#radar-glow-red)' : 'url(#radar-glow-cyan)'}
                      />
                    </g>

                    {/* Standard Military/ATC Target Data Block (FDB) with 45° Leader Dogleg */}
                    <line x1="8" y1="-8" x2="20" y2="-20" stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" />
                    <line x1="20" y1="-20" x2="30" y2="-20" stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" />

                    <g transform="translate(30, -32)">
                      <rect
                        x="0"
                        y="0"
                        width="92"
                        height="26"
                        rx="3"
                        fill="rgba(9, 14, 24, 0.95)"
                        stroke={isHostile ? '#EF4444' : '#00F2FE'}
                        strokeWidth="1.2"
                      />
                      {/* Row 1: Callsign */}
                      <text
                        x="6"
                        y="10"
                        fill={isHostile ? '#FCA5A5' : '#7DD3FC'}
                        fontSize="8.5"
                        fontFamily="var(--font-mono)"
                        fontWeight="800"
                      >
                        {track.callsign.replace('DRONE-', '')}
                      </text>
                      {/* Row 2: Altitude + Speed */}
                      <text
                        x="6"
                        y="20"
                        fill="#CBD5E1"
                        fontSize="7"
                        fontFamily="var(--font-mono)"
                        fontWeight="600"
                      >
                        FL{Math.round(track.altitude / 30)} • {track.speed}KT • {track.heading}°
                      </text>
                    </g>
                  </g>
                </g>
              );
            })}

          {/* 12. Continuous 360° Rotating Radar Sweep Beam (Hardware-Accelerated SVG Animation) */}
          {sweepActive && (
            <g pointerEvents="none">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 ${centerPt.x} ${centerPt.y}`}
                to={`360 ${centerPt.x} ${centerPt.y}`}
                dur="4s"
                repeatCount="indefinite"
              />

              {/* Multi-tier Phosphor Decay Persistence Tail (Real Analog CRT Decay) */}
              <path
                d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 10)}
                fill={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.32)' : 'rgba(0, 242, 254, 0.32)'}
              />
              <path
                d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 22)}
                fill={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(0, 242, 254, 0.18)'}
              />
              <path
                d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 38)}
                fill={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0, 242, 254, 0.08)'}
              />
              <path
                d={createSweepWedgePath(centerPt.x, centerPt.y, scopeRadius, 54)}
                fill={radarMode === 'flir' ? 'rgba(239, 68, 68, 0.03)' : 'rgba(0, 242, 254, 0.03)'}
              />

              {/* Ultra-Bright Leading Laser Sweep Line */}
              <line
                x1={centerPt.x}
                y1={centerPt.y}
                x2={centerPt.x}
                y2={centerPt.y - scopeRadius}
                stroke={radarMode === 'flir' ? '#EF4444' : '#00F2FE'}
                strokeWidth="2.5"
                filter={radarMode === 'flir' ? 'url(#radar-glow-red)' : 'url(#radar-glow-cyan)'}
              />

              {/* Illuminated Sweep Apex Pulse */}
              <circle
                cx={centerPt.x}
                cy={centerPt.y - scopeRadius}
                r="3.5"
                fill="#FFFFFF"
                filter={radarMode === 'flir' ? 'url(#radar-glow-red)' : 'url(#radar-glow-cyan)'}
              />
            </g>
          )}

          {/* Central Radar Transmitter Antenna Node */}
          <circle cx={centerPt.x} cy={centerPt.y} r="3.5" fill="#00F2FE" />
          <circle cx={centerPt.x} cy={centerPt.y} r="8" fill="none" stroke="#00F2FE" strokeWidth="1.2" opacity="0.75" />
          <circle cx={centerPt.x} cy={centerPt.y} r="14" fill="none" stroke="#00F2FE" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.45" />
        </g>
      </svg>

      {/* 13. Bottom Tactical Status & Telemetry Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 25,
          padding: '7px 16px',
          background: 'linear-gradient(0deg, rgba(4, 7, 13, 0.95) 0%, rgba(4, 7, 13, 0.7) 70%, transparent 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          color: '#94A3B8',
          borderTop: '1px solid rgba(56, 189, 248, 0.15)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>CONTACTS: <strong style={{ color: '#00F2FE' }}>{tracks.length} AIR</strong> / <strong style={{ color: '#F59E0B' }}>{incidents.length} GROUND</strong></span>
          <span style={{ color: '#64748B' }}>•</span>
          <span style={{ color: activeRoute?.hasActiveBlockage ? '#EF4444' : '#10B981', fontWeight: 700 }}>
            CORRIDOR: {activeRoute?.hasActiveBlockage ? 'HAZARD DIVERTED' : 'ALL PATHS OPEN'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>RANGE SCALE: <strong style={{ color: '#E2E8F0' }}>20 KM / 10.8 NM</strong></span>
          <span style={{ color: '#64748B' }}>•</span>
          <span style={{ color: '#00F2FE', fontWeight: 800 }}>ZOOM: {zoom.toFixed(2)}x</span>
        </div>
      </div>

      {/* 14. Hover Entity Floating HUD Tooltip */}
      {hoveredEntity && (
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '16px',
            zIndex: 35,
            padding: '10px 16px',
            background: 'rgba(9, 14, 24, 0.95)',
            border: '1px solid #00F2FE',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), 0 0 12px rgba(0, 242, 254, 0.3)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#00F2FE', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {hoveredEntity.type}
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
            {hoveredEntity.title}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '3px' }}>
            {hoveredEntity.subtitle}
          </div>
        </div>
      )}
    </div>
  );
};
