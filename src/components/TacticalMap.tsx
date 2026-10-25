import React, { useState, useRef } from 'react';
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
  ShieldAlert,
  Radio,
  Crosshair,
  Truck,
  AlertTriangle,
  Info,
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
  const [activeLayers, setActiveLayers] = useState({
    incidents: true,
    airspace: true,
    zones: true,
    routes: true,
    grid: true,
  });
  const [hoveredEntity, setHoveredEntity] = useState<any | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Tactical coordinate projection (centered around Los Angeles Sector Demo: ~34.058, -118.245)
  const centerLat = 34.060;
  const centerLng = -118.245;
  const scale = 9500 * zoom;

  const project = (lat: number, lng: number) => {
    // 800x600 viewBox basis
    const x = 400 + (lng - centerLng) * scale + pan.x;
    const y = 300 - (lat - centerLat) * scale + pan.y;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev [layer] }));
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height,
        width: '100%',
        backgroundColor: '#070b14',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Map Control Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: '32px', height: '32px', padding: 0 }}
          title="Zoom In"
          onClick={() => setZoom((z) => Math.min(z * 1.25, 3))}
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: '32px', height: '32px', padding: 0 }}
          title="Zoom Out"
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.6))}
        >
          <ZoomOut size={16} />
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{ width: '32px', height: '32px', padding: 0 }}
          title="Reset Center"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Layer Toggles */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          background: 'rgba(10, 16, 28, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '6px 10px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.72rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-cyan)', fontWeight: 700 }}>
          <Layers size={14} />
          <span>LAYERS:</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: activeLayers.incidents ? '#38bdf8' : '#64748b' }}>
          <input
            type="checkbox"
            checked={activeLayers.incidents}
            onChange={() => toggleLayer('incidents')}
            style={{ accentColor: '#00f2fe' }}
          />
          FieldLink ({incidents.length})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: activeLayers.airspace ? '#c084fc' : '#64748b' }}>
          <input
            type="checkbox"
            checked={activeLayers.airspace}
            onChange={() => toggleLayer('airspace')}
            style={{ accentColor: '#a855f7' }}
          />
          SkyWatch ({tracks.length})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: activeLayers.routes ? '#10b981' : '#64748b' }}>
          <input
            type="checkbox"
            checked={activeLayers.routes}
            onChange={() => toggleLayer('routes')}
            style={{ accentColor: '#10b981' }}
          />
          MediRoute ({nodes.length})
        </label>
      </div>

      {/* Tactical Canvas SVG */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        style={{ display: 'block' }}
      >
        <defs>
          {/* Cyan Glow Filter */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Danger Red Glow */}
          <filter id="glow-danger" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Striped pattern for blocked roads */}
          <pattern id="hazard-stripe" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="4" />
            <line x1="4" y1="0" x2="4" y2="8" stroke="#f59e0b" strokeWidth="4" />
          </pattern>
        </defs>

        {/* 1. Tactical Coordinate Grid */}
        {activeLayers.grid && (
          <g opacity="0.15">
            {Array.from({ length: 17 }).map((_, i) => (
              <line key={`gx-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="600" stroke="#00f2fe" strokeWidth="0.8" strokeDasharray="3,6" />
            ))}
            {Array.from({ length: 13 }).map((_, i) => (
              <line key={`gy-${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="#00f2fe" strokeWidth="0.8" strokeDasharray="3,6" />
            ))}
          </g>
        )}

        {/* 2. Radar Range Rings (Centered at Ops Base: ~400, 300) */}
        {showRadarSweep && (
          <g opacity="0.22" pointerEvents="none">
            <circle cx={400 + pan.x} cy={300 + pan.y} r={90 * zoom} fill="none" stroke="#00f2fe" strokeWidth="1" strokeDasharray="4,4" />
            <circle cx={400 + pan.x} cy={300 + pan.y} r={180 * zoom} fill="none" stroke="#00f2fe" strokeWidth="1" strokeDasharray="4,4" />
            <circle cx={400 + pan.x} cy={300 + pan.y} r={270 * zoom} fill="none" stroke="#00f2fe" strokeWidth="1" strokeDasharray="4,4" />
            <line x1={400 + pan.x - 300 * zoom} y1={300 + pan.y} x2={400 + pan.x + 300 * zoom} y2={300 + pan.y} stroke="#00f2fe" strokeWidth="0.8" />
            <line x1={400 + pan.x} y1={300 + pan.y - 300 * zoom} x2={400 + pan.x} y2={300 + pan.y + 300 * zoom} stroke="#00f2fe" strokeWidth="0.8" />
            <text x={400 + pan.x + 95 * zoom} y={300 + pan.y - 6} fill="#38bdf8" fontSize="10" fontFamily="var(--font-mono)">5 KM</text>
            <text x={400 + pan.x + 185 * zoom} y={300 + pan.y - 6} fill="#38bdf8" fontSize="10" fontFamily="var(--font-mono)">10 KM</text>
            <text x={400 + pan.x + 275 * zoom} y={300 + pan.y - 6} fill="#38bdf8" fontSize="10" fontFamily="var(--font-mono)">15 KM</text>
          </g>
        )}

        {/* 3. Restricted Airspace Zones (SkyWatch NFZ) */}
        {activeLayers.zones &&
          zones.map((zone) => {
            const pos = project(zone.center.lat, zone.center.lng);
            const radiusPx = zone.radiusKm * 40 * zoom;
            return (
              <g key={zone.id} opacity="0.85">
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radiusPx}
                  fill={zone.type === 'no_fly' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(56, 189, 248, 0.06)'}
                  stroke={zone.type === 'no_fly' ? '#ef4444' : '#38bdf8'}
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                />
                <text
                  x={pos.x}
                  y={pos.y - radiusPx - 6}
                  fill={zone.type === 'no_fly' ? '#f87171' : '#38bdf8'}
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {zone.name} [MAX {zone.ceilingMeters}m]
                </text>
              </g>
            );
          })}

        {/* 4. MediRoute Road Network Edges */}
        {activeLayers.routes &&
          edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
            const toNode = nodes.find((n) => n.id === edge.toNodeId);
            if (!fromNode || !toNode) return null;

            const p1 = project(fromNode.coordinates.lat, fromNode.coordinates.lng);
            const p2 = project(toNode.coordinates.lat, toNode.coordinates.lng);

            // Is this edge part of the active calculated route?
            const isRouteEdge = activeRoute?.edgesTraversed.includes(edge.id);

            return (
              <g key={edge.id}>
                {/* Background path line */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={
                    edge.blocked
                      ? '#ef4444'
                      : isRouteEdge
                      ? '#10b981'
                      : '#334155'
                  }
                  strokeWidth={isRouteEdge ? 4 : edge.blocked ? 3 : 2}
                  strokeDasharray={edge.blocked ? '6,4' : undefined}
                />
                {/* Blocked Road Warning Icon */}
                {edge.blocked && (
                  <g transform={`translate(${(p1.x + p2.x) / 2 - 10}, ${(p1.y + p2.y) / 2 - 10})`}>
                    <rect x="0" y="0" width="20" height="20" rx="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1" />
                    <text x="10" y="14" fill="#fee2e2" fontSize="11" textAnchor="middle" fontWeight="bold">✕</text>
                  </g>
                )}
              </g>
            );
          })}

        {/* 5. MediRoute Nodes (Hospitals, Aid Stations, Pickup points) */}
        {activeLayers.routes &&
          nodes.map((node) => {
            const pos = project(node.coordinates.lat, node.coordinates.lng);
            const isSelected = selectedEntityId === node.id;
            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEntity?.({ type: 'node', id: node.id, raw: node });
                }}
                onMouseEnter={() => setHoveredEntity({ type: 'Evac Node', title: node.name, subtitle: `Type: ${node.type}` })}
                onMouseLeave={() => setHoveredEntity(null)}
              >
                <circle
                  r={isSelected ? 14 : 10}
                  fill={node.type === 'hospital' ? '#047857' : node.type === 'casualty_pickup' ? '#b91c1c' : '#1e293b'}
                  stroke={node.type === 'hospital' ? '#10b981' : node.type === 'casualty_pickup' ? '#ef4444' : '#64748b'}
                  strokeWidth={isSelected ? 3 : 2}
                  filter={isSelected ? 'url(#glow-cyan)' : undefined}
                />
                <text
                  y="4"
                  fill="#ffffff"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {node.type === 'hospital' ? 'H' : node.type === 'casualty_pickup' ? 'C' : 'A'}
                </text>
                <text
                  y="22"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="var(--font-sans)"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {node.name.split(' ')[0]}
                </text>
              </g>
            );
          })}

        {/* 6. FieldLink Incidents */}
        {activeLayers.incidents &&
          incidents.map((inc) => {
            const pos = project(inc.location.lat, inc.location.lng);
            const isSelected = selectedEntityId === inc.id;
            const isCritical = inc.priority === 'critical' || inc.priority === 'high';

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
                    type: `FieldLink Incident (${inc.priority.toUpperCase()})`,
                    title: inc.title,
                    subtitle: `${inc.location.name} • Status: ${inc.status}`,
                  })
                }
                onMouseLeave={() => setHoveredEntity(null)}
              >
                {/* Radar pulse for active/critical incidents */}
                {isCritical && (
                  <circle
                    r="18"
                    fill="none"
                    stroke={inc.priority === 'critical' ? '#ef4444' : '#f59e0b'}
                    strokeWidth="1.5"
                    opacity="0.6"
                  >
                    <animate attributeName="r" from="10" to="26" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Marker diamond */}
                <polygon
                  points="0,-12 10,0 0,12 -10,0"
                  fill={
                    inc.priority === 'critical'
                      ? '#ef4444'
                      : inc.priority === 'high'
                      ? '#f59e0b'
                      : '#38bdf8'
                  }
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 2.5 : 1}
                  filter={isSelected ? 'url(#glow-cyan)' : undefined}
                />
                <text
                  x="14"
                  y="4"
                  fill="#f8fafc"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fontWeight="600"
                >
                  {inc.id}
                </text>
              </g>
            );
          })}

        {/* 7. SkyWatch Drone & UAV Telemetry Tracks */}
        {activeLayers.airspace &&
          tracks.map((track) => {
            const pos = project(track.lat, track.lng);
            const isSelected = selectedEntityId === track.id;
            const isHostile = track.status === 'hostile' || track.status === 'suspicious';

            // Calculate flight history breadcrumbs
            const historyPath = track.flightHistory
              .map((pt) => {
                const p = project(pt.lat, pt.lng);
                return `${p.x},${p.y}`;
              })
              .join(' ');

            return (
              <g key={track.id}>
                {/* Flight history trail */}
                {track.flightHistory.length > 1 && (
                  <polyline
                    points={historyPath}
                    fill="none"
                    stroke={isHostile ? '#ef4444' : '#a855f7'}
                    strokeWidth="1.5"
                    strokeDasharray="2,3"
                    opacity="0.5"
                  />
                )}

                {/* Drone Symbol with Heading Direction Vector */}
                <g
                  transform={`translate(${pos.x}, ${pos.y}) rotate(${track.heading})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEntity?.({ type: 'track', id: track.id, raw: track });
                  }}
                  onMouseEnter={() =>
                    setHoveredEntity({
                      type: `Airspace Track (${track.type})`,
                      title: track.callsign,
                      subtitle: `Alt: ${track.altitude}m | Spd: ${track.speed}m/s | Hdg: ${track.heading}°`,
                    })
                  }
                  onMouseLeave={() => setHoveredEntity(null)}
                >
                  {/* Outer target bracket */}
                  <circle
                    r={isSelected ? 16 : 12}
                    fill="none"
                    stroke={isHostile ? '#ef4444' : '#00f2fe'}
                    strokeWidth="1.5"
                    filter={isHostile ? 'url(#glow-danger)' : 'url(#glow-cyan)'}
                  />
                  {/* Heading Vector Arrow */}
                  <line x1="0" y1="0" x2="0" y2="-22" stroke={isHostile ? '#ef4444' : '#00f2fe'} strokeWidth="2" />
                  <polygon points="0,-24 -4,-18 4,-18" fill={isHostile ? '#ef4444' : '#00f2fe'} />
                </g>

                {/* Track Callout Tag */}
                <g transform={`translate(${pos.x + 16}, ${pos.y - 10})`} pointerEvents="none">
                  <text fill={isHostile ? '#f87171' : '#38bdf8'} fontSize="10" fontFamily="var(--font-mono)" fontWeight="bold">
                    {track.callsign}
                  </text>
                  <text fill="#94a3b8" fontSize="8" fontFamily="var(--font-mono)" y="10">
                    ALT: {track.altitude}m • {track.speed} m/s
                  </text>
                </g>
              </g>
            );
          })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredEntity && (
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            left: '14px',
            background: 'rgba(14, 20, 36, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--accent-cyan)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-glow-cyan)',
            pointerEvents: 'none',
            zIndex: 20,
            maxWidth: '320px',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {hoveredEntity.type}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 600, marginTop: '2px' }}>
            {hoveredEntity.title}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {hoveredEntity.subtitle}
          </div>
        </div>
      )}

      {/* Compass / Scale Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '14px',
          background: 'rgba(10, 16, 28, 0.8)',
          border: '1px solid var(--border-subtle)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <span>CENTER: 34.060° N, 118.245° W</span>
        <span>•</span>
        <span>SCALE: 1:{(10000 / zoom).toFixed(0)}</span>
      </div>
    </div>
  );
};
