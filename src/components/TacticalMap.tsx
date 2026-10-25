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
  const [mouseCoord, setMouseCoord] = useState<{ lat: string; lng: string }>({
    lat: '34.0600° N',
    lng: '118.2450° W',
  });

  const [activeLayers, setActiveLayers] = useState({
    incidents: true,
    airspace: true,
    zones: true,
    routes: true,
    grid: true,
    rangeRings: true,
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
  const scopeRadius = 280 * zoom;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height,
        width: '100%',
        backgroundColor: 'var(--map-canvas)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.7), 0 8px 24px rgba(0, 0, 0, 0.35)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        transition: 'background-color 0.2s ease',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 1. Tactical HUD Header Bar (Top) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 15,
          padding: '8px 16px',
          background: 'linear-gradient(180deg, rgba(10, 14, 20, 0.85) 0%, rgba(10, 14, 20, 0.2) 80%, transparent 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent)', fontWeight: 700 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00F2FE', boxShadow: '0 0 6px #00F2FE' }} />
            RADAR SCOPE // AN/TPS-75 3D
          </span>
          <span>MODE: PSR/SSR INTERROGATOR</span>
          <span>SWEEP: 360° / 24 RPM</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>CURSOR: {mouseCoord.lat} {mouseCoord.lng}</span>
          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>ELEV: 240 FT</span>
        </div>
      </div>

      {/* 2. Tactical Layer Bar & Controls */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          left: '16px',
          zIndex: 20,
          background: 'rgba(16, 22, 32, 0.88)',
          backdropFilter: 'blur(8px)',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border-subtle)',
          padding: '5px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.72rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, color: 'var(--accent)' }}>
          <Layers size={13} />
          <span>FILTER:</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#EDF1F4' }}>
          <input
            type="checkbox"
            checked={activeLayers.incidents}
            onChange={() => toggleLayer('incidents')}
            style={{ accentColor: '#00F2FE' }}
          />
          Ground ({incidents.length})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#EDF1F4' }}>
          <input
            type="checkbox"
            checked={activeLayers.airspace}
            onChange={() => toggleLayer('airspace')}
            style={{ accentColor: '#00F2FE' }}
          />
          Air ({tracks.length})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#EDF1F4' }}>
          <input
            type="checkbox"
            checked={activeLayers.routes}
            onChange={() => toggleLayer('routes')}
            style={{ accentColor: '#00F2FE' }}
          />
          Corridors ({nodes.length})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: '#EDF1F4' }}>
          <input
            type="checkbox"
            checked={sweepActive}
            onChange={(e) => setSweepActive(e.target.checked)}
            style={{ accentColor: '#00F2FE' }}
          />
          Sweep Beam
        </label>
      </div>

      {/* 3. Zoom / Reset Controls (Tactile Buttons) */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          right: '16px',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-neu btn-neu-sm"
          style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--radius-pill)', background: 'rgba(20,28,40,0.85)' }}
          title="Zoom In"
          onClick={() => setZoom((z) => Math.min(z * 1.25, 3))}
        >
          <ZoomIn size={14} color="#EDF1F4" />
        </button>
        <button
          className="btn-neu btn-neu-sm"
          style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--radius-pill)', background: 'rgba(20,28,40,0.85)' }}
          title="Zoom Out"
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.6))}
        >
          <ZoomOut size={14} color="#EDF1F4" />
        </button>
        <button
          className="btn-neu btn-neu-sm"
          style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--radius-pill)', background: 'rgba(20,28,40,0.85)' }}
          title="Center Scope"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <RotateCcw size={13} color="#EDF1F4" />
        </button>
      </div>

      {/* 4. Realistic Radar Scope SVG Rendering */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Tactical Glow Filters */}
          <filter id="radar-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="radar-glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="radar-glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* CRT Scanline / Tactical Grid Pattern */}
          <pattern id="radar-grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <line x1="0" y1="40" x2="40" y2="40" stroke="rgba(0, 242, 254, 0.05)" strokeWidth="0.8" />
            <line x1="40" y1="0" x2="40" y2="40" stroke="rgba(0, 242, 254, 0.05)" strokeWidth="0.8" />
            <circle cx="40" cy="40" r="1" fill="rgba(0, 242, 254, 0.15)" />
          </pattern>

          {/* Rotating Beam Phosphor Sweep Gradient */}
          <linearGradient id="sweep-tail-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#00F2FE" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#00F2FE" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Tactical Drafting Grid Background */}
        <rect width="800" height="600" fill="url(#radar-grid-pattern)" />

        {/* Simulated Sector Landmass Contours (Geographic Context) */}
        <g opacity="0.18" pointerEvents="none">
          <path
            d="M 50,220 Q 180,180 320,240 T 560,200 T 780,260 L 780,580 L 50,580 Z"
            fill="none"
            stroke="var(--radar-beam)"
            strokeWidth="1.2"
            strokeDasharray="4,6"
          />
          <path
            d="M 220,120 Q 360,90 490,140 T 740,110"
            fill="none"
            stroke="var(--radar-beam)"
            strokeWidth="0.8"
            strokeDasharray="2,4"
          />
        </g>

        {/* 5. Concentric Radar PPI Range Rings & Azimuth Spoke Graticule */}
        {activeLayers.rangeRings && (
          <g pointerEvents="none">
            {/* Outer PPI Scope Border Ring with Graduation Marks */}
            <circle
              cx={centerPt.x}
              cy={centerPt.y}
              r={scopeRadius}
              fill="none"
              stroke="var(--radar-ring)"
              strokeWidth="2"
            />

            {/* Inner Concentric Rings: 5km, 10km, 15km, 20km */}
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
                    stroke="var(--radar-ring)"
                    strokeWidth="1"
                    strokeDasharray={ratio === 1.0 ? undefined : '3,5'}
                  />
                  {/* Distance Labels along East & West Axes */}
                  <text
                    x={centerPt.x + r + 4}
                    y={centerPt.y - 4}
                    fill="var(--radar-beam)"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                    opacity="0.8"
                  >
                    {km}K
                  </text>
                  <text
                    x={centerPt.x - r - 22}
                    y={centerPt.y - 4}
                    fill="var(--radar-beam)"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    fontWeight="700"
                    opacity="0.8"
                  >
                    {km}K
                  </text>
                </g>
              );
            })}

            {/* 12 Radial Azimuth Spokes (every 30 degrees) */}
            {Array.from({ length: 12 }).map((_, i) => {
              const deg = i * 30;
              const rad = (deg * Math.PI) / 180;
              const x2 = centerPt.x + Math.sin(rad) * scopeRadius;
              const y2 = centerPt.y - Math.cos(rad) * scopeRadius;
              const labelX = centerPt.x + Math.sin(rad) * (scopeRadius + 14);
              const labelY = centerPt.y - Math.cos(rad) * (scopeRadius + 14) + 3;

              let cardinal = '';
              if (deg === 0) cardinal = 'N 000°';
              else if (deg === 90) cardinal = 'E 090°';
              else if (deg === 180) cardinal = 'S 180°';
              else if (deg === 270) cardinal = 'W 270°';
              else cardinal = `${deg.toString().padStart(3, '0')}°`;

              return (
                <g key={`spoke-${deg}`}>
                  <line
                    x1={centerPt.x}
                    y1={centerPt.y}
                    x2={x2}
                    y2={y2}
                    stroke="var(--radar-grid)"
                    strokeWidth="0.8"
                    strokeDasharray={deg % 90 === 0 ? undefined : '2,4'}
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    fill={deg % 90 === 0 ? 'var(--radar-beam)' : 'var(--text-muted)'}
                    fontSize={deg % 90 === 0 ? '9' : '8'}
                    fontFamily="var(--font-mono)"
                    fontWeight={deg % 90 === 0 ? '800' : '600'}
                    textAnchor="middle"
                  >
                    {cardinal}
                  </text>
                </g>
              );
            })}

            {/* Radar Center Antenna Transmitter Node */}
            <circle cx={centerPt.x} cy={centerPt.y} r="3" fill="#00F2FE" />
            <circle cx={centerPt.x} cy={centerPt.y} r="8" fill="none" stroke="#00F2FE" strokeWidth="1" opacity="0.6" />
          </g>
        )}

        {/* 6. Rotating PPI Radar Sweep Beam (True 360° Real-time Radar Scan) */}
        {sweepActive && (
          <g
            className="radar-sweep-beam"
            style={{
              transformOrigin: `${centerPt.x}px ${centerPt.y}px`,
            }}
          >
            {/* Trailing Phosphor Wedge (40° spread) */}
            <path
              d={`M ${centerPt.x},${centerPt.y} L ${centerPt.x},${centerPt.y - scopeRadius} A ${scopeRadius},${scopeRadius} 0 0,0 ${
                centerPt.x - Math.sin((40 * Math.PI) / 180) * scopeRadius
              },${centerPt.y - Math.cos((40 * Math.PI) / 180) * scopeRadius} Z`}
              fill="url(#sweep-tail-gradient)"
            />

            {/* Bright Leading Sweep Line */}
            <line
              x1={centerPt.x}
              y1={centerPt.y}
              x2={centerPt.x}
              y2={centerPt.y - scopeRadius}
              stroke="var(--radar-beam)"
              strokeWidth="2"
              filter="url(#radar-glow-cyan)"
            />
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
                {/* Zone Area Fill & Perimeter */}
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

                {/* Zone Title Tag */}
                <rect
                  x={pos.x - 70}
                  y={pos.y - radiusPx - 18}
                  width="140"
                  height="16"
                  rx="3"
                  fill="rgba(10, 14, 20, 0.9)"
                  stroke={isNoFly ? '#EF4444' : '#00F2FE'}
                  strokeWidth="1"
                />
                <text
                  x={pos.x}
                  y={pos.y - radiusPx - 6}
                  fill={isNoFly ? '#FCA5A5' : '#7DD3FC'}
                  fontSize="8.5"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                  fontWeight="800"
                >
                  {isNoFly ? 'NFZ: ' : 'ZONE: '}{zone.name}
                </text>
              </g>
            );
          })}

        {/* 8. Road Network Segments & Hazards (MediRoute) */}
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
                {/* Road Base Vector */}
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
                      : 'rgba(148, 163, 184, 0.5)'
                  }
                  strokeWidth={isRouteEdge ? 4 : edge.blocked ? 3 : 2}
                  strokeDasharray={edge.blocked ? '6,4' : undefined}
                  className={isRouteEdge ? 'route-active-glow' : undefined}
                />

                {/* Blocked Barrier Warning Beacon */}
                {edge.blocked && (
                  <g transform={`translate(${(p1.x + p2.x) / 2 - 12}, ${(p1.y + p2.y) / 2 - 12})`}>
                    <rect x="0" y="0" width="24" height="24" rx="4" fill="#B91C1C" stroke="#FFFFFF" strokeWidth="1.5" filter="url(#radar-glow-red)" />
                    <text x="12" y="16" fill="#FFFFFF" fontSize="13" textAnchor="middle" fontWeight="bold">✕</text>
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
                onMouseEnter={() => setHoveredEntity({ type: 'Evacuation Node', title: node.name, subtitle: `Type: ${node.type}` })}
                onMouseLeave={() => setHoveredEntity(null)}
              >
                {/* Facility Beacon Icon */}
                <circle
                  r="12"
                  fill="rgba(10, 16, 26, 0.95)"
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

                {/* Offset Facility Callout */}
                <rect
                  x="-35"
                  y="16"
                  width="70"
                  height="14"
                  rx="3"
                  fill="rgba(10, 14, 20, 0.85)"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="0.8"
                />
                <text
                  y="26"
                  fill="#E2E8F0"
                  fontSize="8"
                  fontFamily="var(--font-mono)"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {node.name.split(' ')[0]}
                </text>
              </g>
            );
          })}

        {/* 10. FieldLink Ground Incidents (Pulsing Diamond Symbology) */}
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
                    r="18"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    className="radar-blip-pulse"
                    opacity="0.8"
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

                {/* Offset Tactical Data Tag with Fine Leader Line (Prevents Overlap!) */}
                <line x1="8" y1="-8" x2="20" y2="-16" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
                <rect
                  x="20"
                  y="-24"
                  width="65"
                  height="16"
                  rx="3"
                  fill="rgba(10, 14, 20, 0.9)"
                  stroke={isCritical ? '#EF4444' : '#F59E0B'}
                  strokeWidth="1"
                />
                <text
                  x="52"
                  y="-13"
                  fill="#FFFFFF"
                  fontSize="8"
                  fontFamily="var(--font-mono)"
                  fontWeight="800"
                  textAnchor="middle"
                >
                  {inc.id}
                </text>
              </g>
            );
          })}

        {/* 11. SkyWatch Airspace Radar Targets (Aviation Chevron & Velocity Vector) */}
        {activeLayers.airspace &&
          tracks.map((track) => {
            const pos = project(track.lat, track.lng);
            const isSelected = selectedEntityId === track.id;
            const isHostile = track.status === 'hostile' || track.status === 'suspicious';

            // Velocity Vector Line projecting 30 seconds ahead
            const vectorLength = Math.max(16, track.speed * 0.45 * zoom);
            const headingRad = (track.heading * Math.PI) / 180;
            const vectorX = Math.sin(headingRad) * vectorLength;
            const vectorY = -Math.cos(headingRad) * vectorLength;

            return (
              <g key={track.id}>
                {/* Historical Phosphor Trail Dots */}
                {track.flightHistory.slice(-4, -1).map((hist, hIdx) => {
                  const hPos = project(hist.lat, hist.lng);
                  return (
                    <circle
                      key={`hist-${hIdx}`}
                      cx={hPos.x}
                      cy={hPos.y}
                      r="2"
                      fill={isHostile ? '#EF4444' : '#00F2FE'}
                      opacity={0.25 + hIdx * 0.2}
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
                      type: `UAV Track [${track.type}]`,
                      title: track.callsign,
                      subtitle: `Alt: ${track.altitude}m | Spd: ${track.speed}m/s | Hdg: ${track.heading}°`,
                    })
                  }
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Hostile Target Acquisition Bracket */}
                  {isHostile && (
                    <g filter="url(#radar-glow-red)">
                      <circle r="16" fill="none" stroke="#EF4444" strokeWidth="1.2" strokeDasharray="4,4" className="radar-blip-pulse" />
                      <rect x="-14" y="-14" width="28" height="28" fill="none" stroke="#EF4444" strokeWidth="1" />
                    </g>
                  )}

                  {/* Velocity Vector Leader Stick */}
                  <line
                    x1="0"
                    y1="0"
                    x2={vectorX}
                    y2={vectorY}
                    stroke={isHostile ? '#EF4444' : '#00F2FE'}
                    strokeWidth="1.5"
                    strokeDasharray="3,2"
                  />

                  {/* Swept Aircraft Delta Symbol oriented to Heading */}
                  <g transform={`rotate(${track.heading})`}>
                    <polygon
                      points="0,-10 6,6 0,3 -6,6"
                      fill={isHostile ? '#EF4444' : '#00F2FE'}
                      stroke="#FFFFFF"
                      strokeWidth={isSelected ? 2 : 1}
                      filter={isHostile ? 'url(#radar-glow-red)' : 'url(#radar-glow-cyan)'}
                    />
                  </g>

                  {/* Aviation Standard Radar Target Data Block (Callsign + Alt + Speed) */}
                  <g transform="translate(14, -20)">
                    <rect
                      x="0"
                      y="0"
                      width="88"
                      height="24"
                      rx="3"
                      fill="rgba(10, 14, 20, 0.9)"
                      stroke={isHostile ? '#EF4444' : '#00F2FE'}
                      strokeWidth="1"
                    />
                    <text
                      x="6"
                      y="10"
                      fill={isHostile ? '#FCA5A5' : '#7DD3FC'}
                      fontSize="8"
                      fontFamily="var(--font-mono)"
                      fontWeight="800"
                    >
                      {track.callsign.replace('DRONE-', '')}
                    </text>
                    <text
                      x="6"
                      y="19"
                      fill="#94A3B8"
                      fontSize="7"
                      fontFamily="var(--font-mono)"
                    >
                      A{track.altitude}m • {track.speed}kt
                    </text>
                  </g>
                </g>
              </g>
            );
          })}
      </svg>

      {/* 12. Bottom Tactical Telemetry Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 15,
          padding: '6px 16px',
          background: 'linear-gradient(0deg, rgba(10, 14, 20, 0.9) 0%, rgba(10, 14, 20, 0.3) 80%, transparent 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>TARGETS: {tracks.length} AIR / {incidents.length} GROUND</span>
          <span style={{ color: activeRoute?.hasActiveBlockage ? '#EF4444' : '#10B981' }}>
            CORRIDOR: {activeRoute?.hasActiveBlockage ? 'HAZARD DIVERT' : 'OPEN'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>SCALE: 15 KM / 8.1 NM</span>
          <span style={{ color: '#00F2FE', fontWeight: 700 }}>ZOOM: {zoom.toFixed(2)}x</span>
        </div>
      </div>

      {/* 13. Hover Entity HUD Tooltip */}
      {hoveredEntity && (
        <div
          className="neu-card-sm"
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '16px',
            zIndex: 25,
            padding: '8px 14px',
            background: 'rgba(12, 18, 28, 0.95)',
            border: '1px solid var(--accent)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>
            {hoveredEntity.type}
          </div>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF' }}>
            {hoveredEntity.title}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>
            {hoveredEntity.subtitle}
          </div>
        </div>
      )}
    </div>
  );
};
