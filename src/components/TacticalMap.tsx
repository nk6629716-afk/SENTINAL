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
  height = '500px',
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

  // Center coordinate around Los Angeles Sector Demo: ~34.060, -118.245
  const centerLat = 34.060;
  const centerLng = -118.245;
  const scale = 9500 * zoom;

  const project = (lat: number, lng: number) => {
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
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height,
        width: '100%',
        backgroundColor: '#E2E6ED', // Soft slate canvas
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-inset-sm)',
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
      {/* Map Control Toolbar (Tactile Neumorphic Buttons) */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="btn-neu btn-neu-sm"
          style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--radius-pill)' }}
          title="Zoom In"
          onClick={() => setZoom((z) => Math.min(z * 1.25, 3))}
        >
          <ZoomIn size={14} color="var(--text-primary)" />
        </button>
        <button
          className="btn-neu btn-neu-sm"
          style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--radius-pill)' }}
          title="Zoom Out"
          onClick={() => setZoom((z) => Math.max(z * 0.8, 0.6))}
        >
          <ZoomOut size={14} color="var(--text-primary)" />
        </button>
        <button
          className="btn-neu btn-neu-sm"
          style={{ width: '32px', height: '32px', padding: 0, borderRadius: 'var(--radius-pill)' }}
          title="Reset Center"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <RotateCcw size={13} color="var(--text-primary)" />
        </button>
      </div>

      {/* Layer Toggles (Recessed Pill Bar) */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          zIndex: 10,
          background: 'var(--surface-raised)',
          borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-raised-sm)',
          border: '1px solid var(--border-light)',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '0.74rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: 'var(--accent)' }}>
          <Layers size={13} />
          <span>LAYERS:</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)' }}>
          <input
            type="checkbox"
            checked={activeLayers.incidents}
            onChange={() => toggleLayer('incidents')}
            style={{ accentColor: '#4669A8' }}
          />
          Incidents ({incidents.length})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)' }}>
          <input
            type="checkbox"
            checked={activeLayers.airspace}
            onChange={() => toggleLayer('airspace')}
            style={{ accentColor: '#4669A8' }}
          />
          Airspace ({tracks.length})
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)' }}>
          <input
            type="checkbox"
            checked={activeLayers.routes}
            onChange={() => toggleLayer('routes')}
            style={{ accentColor: '#4669A8' }}
          />
          Evacuation ({nodes.length})
        </label>
      </div>

      {/* Map SVG Canvas */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        style={{ display: 'block' }}
      >
        <defs>
          <filter id="neu-marker-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="2" stdDeviation="2.5" floodColor="#8F9CAE" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. Subtle Drafting Grid */}
        {activeLayers.grid && (
          <g opacity="0.35">
            {Array.from({ length: 17 }).map((_, i) => (
              <line key={`gx-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="600" stroke="#B0BAC9" strokeWidth="0.8" strokeDasharray="3,4" />
            ))}
            {Array.from({ length: 13 }).map((_, i) => (
              <line key={`gy-${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="#B0BAC9" strokeWidth="0.8" strokeDasharray="3,4" />
            ))}
          </g>
        )}

        {/* 2. Concentric Range Marks */}
        {showRadarSweep && (
          <g opacity="0.45" pointerEvents="none">
            <circle cx={400 + pan.x} cy={300 + pan.y} r={90 * zoom} fill="none" stroke="#9AA8BC" strokeWidth="1" strokeDasharray="4,4" />
            <circle cx={400 + pan.x} cy={300 + pan.y} r={180 * zoom} fill="none" stroke="#9AA8BC" strokeWidth="1" strokeDasharray="4,4" />
            <circle cx={400 + pan.x} cy={300 + pan.y} r={270 * zoom} fill="none" stroke="#9AA8BC" strokeWidth="1" strokeDasharray="4,4" />
            <line x1={400 + pan.x - 300 * zoom} y1={300 + pan.y} x2={400 + pan.x + 300 * zoom} y2={300 + pan.y} stroke="#9AA8BC" strokeWidth="0.8" />
            <line x1={400 + pan.x} y1={300 + pan.y - 300 * zoom} x2={400 + pan.x} y2={300 + pan.y + 300 * zoom} stroke="#9AA8BC" strokeWidth="0.8" />
            <text x={400 + pan.x + 95 * zoom} y={300 + pan.y - 6} fill="#667085" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">5 KM</text>
            <text x={400 + pan.x + 185 * zoom} y={300 + pan.y - 6} fill="#667085" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">10 KM</text>
            <text x={400 + pan.x + 275 * zoom} y={300 + pan.y - 6} fill="#667085" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">15 KM</text>
          </g>
        )}

        {/* 3. Restricted Airspace Zones (NFZ) */}
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
                  fill={zone.type === 'no_fly' ? 'rgba(185, 56, 56, 0.08)' : 'rgba(53, 107, 140, 0.06)'}
                  stroke={zone.type === 'no_fly' ? '#B93838' : '#356B8C'}
                  strokeWidth="1.5"
                  strokeDasharray="5,4"
                />
                <text
                  x={pos.x}
                  y={pos.y - radiusPx - 6}
                  fill={zone.type === 'no_fly' ? '#B93838' : '#356B8C'}
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {zone.name} [MAX {zone.ceilingMeters}m]
                </text>
              </g>
            );
          })}

        {/* 4. MediRoute Road Edges */}
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
                      ? '#B93838'
                      : isRouteEdge
                      ? '#397653'
                      : '#8392A7'
                  }
                  strokeWidth={isRouteEdge ? 4 : edge.blocked ? 3 : 2}
                  strokeDasharray={edge.blocked ? '6,4' : undefined}
                />
                {edge.blocked && (
                  <g transform={`translate(${(p1.x + p2.x) / 2 - 10}, ${(p1.y + p2.y) / 2 - 10})`}>
                    <rect x="0" y="0" width="20" height="20" rx="4" fill="#B93838" stroke="#FFFFFF" strokeWidth="1.5" filter="url(#neu-marker-shadow)" />
                    <text x="10" y="14" fill="#FFFFFF" fontSize="11" textAnchor="middle" fontWeight="bold">✕</text>
                  </g>
                )}
              </g>
            );
          })}

        {/* 5. MediRoute Nodes (Rounded Square Markers) */}
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
                onMouseEnter={() => setHoveredEntity({ type: 'Evacuation Node', title: node.name, subtitle: `Type: ${node.type}` })}
                onMouseLeave={() => setHoveredEntity(null)}
              >
                <rect
                  x="-11"
                  y="-11"
                  width="22"
                  height="22"
                  rx="6"
                  fill={node.type === 'hospital' ? '#397653' : node.type === 'casualty_pickup' ? '#B93838' : '#4669A8'}
                  stroke="#FFFFFF"
                  strokeWidth={isSelected ? 3 : 1.5}
                  filter="url(#neu-marker-shadow)"
                />
                <text
                  y="4"
                  fill="#FFFFFF"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {node.type === 'hospital' ? 'H' : node.type === 'casualty_pickup' ? 'C' : 'A'}
                </text>
                <text
                  y="22"
                  fill="#202936"
                  fontSize="10"
                  fontFamily="var(--font-sans)"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {node.name.split(' ')[0]}
                </text>
              </g>
            );
          })}

        {/* 6. FieldLink Incident Markers (Rounded Diamonds) */}
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
                onMouseEnter={() =>
                  setHoveredEntity({
                    type: `Incident [${inc.priority.toUpperCase()}]`,
                    title: inc.title,
                    subtitle: `${inc.location.name} • Status: ${inc.status}`,
                  })
                }
                onMouseLeave={() => setHoveredEntity(null)}
              >
                <polygon
                  points="0,-12 11,0 0,12 -11,0"
                  fill={
                    inc.priority === 'critical'
                      ? '#B93838'
                      : inc.priority === 'high'
                      ? '#A86B12'
                      : '#4669A8'
                  }
                  stroke="#FFFFFF"
                  strokeWidth={isSelected ? 3 : 1.5}
                  filter="url(#neu-marker-shadow)"
                />
                <text
                  x="14"
                  y="4"
                  fill="#202936"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fontWeight="700"
                >
                  {inc.id}
                </text>
              </g>
            );
          })}

        {/* 7. SkyWatch Drone Tracks */}
        {activeLayers.airspace &&
          tracks.map((track) => {
            const pos = project(track.lat, track.lng);
            const isSelected = selectedEntityId === track.id;
            const isHostile = track.status === 'hostile' || track.status === 'suspicious';

            const historyPath = track.flightHistory
              .map((pt) => {
                const p = project(pt.lat, pt.lng);
                return `${p.x},${p.y}`;
              })
              .join(' ');

            return (
              <g key={track.id}>
                {track.flightHistory.length > 1 && (
                  <polyline
                    points={historyPath}
                    fill="none"
                    stroke={isHostile ? '#B93838' : '#4669A8'}
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                    opacity="0.6"
                  />
                )}

                <g
                  transform={`translate(${pos.x}, ${pos.y}) rotate(${track.heading})`}
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
                  <circle
                    r="10"
                    fill="var(--surface-raised)"
                    stroke={isHostile ? '#B93838' : '#4669A8'}
                    strokeWidth={isSelected ? 3 : 2}
                    filter="url(#neu-marker-shadow)"
                  />
                  <line x1="0" y1="0" x2="0" y2="-18" stroke={isHostile ? '#B93838' : '#4669A8'} strokeWidth="2" />
                  <polygon points="0,-20 -3,-14 3,-14" fill={isHostile ? '#B93838' : '#4669A8'} />
                </g>

                <g transform={`translate(${pos.x + 14}, ${pos.y - 6})`} pointerEvents="none">
                  <text fill={isHostile ? '#B93838' : '#202936'} fontSize="9" fontFamily="var(--font-mono)" fontWeight="700">
                    {track.callsign}
                  </text>
                  <text fill="#667085" fontSize="8" fontFamily="var(--font-mono)" y="9">
                    {track.altitude}M • {track.speed}M/S
                  </text>
                </g>
              </g>
            );
          })}
      </svg>

      {/* Floating Hover Card (Soft Neumorphic Card) */}
      {hoveredEntity && (
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            left: '14px',
            background: 'var(--surface-raised)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-raised)',
            border: '1px solid var(--border-light)',
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 20,
            maxWidth: '300px',
          }}
        >
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            {hoveredEntity.type}
          </div>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
            {hoveredEntity.title}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {hoveredEntity.subtitle}
          </div>
        </div>
      )}

      {/* Scale & Coordinate Stamp */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '14px',
          background: 'var(--surface-raised)',
          borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-raised-sm)',
          border: '1px solid var(--border-light)',
          padding: '4px 10px',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          display: 'flex',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        <span>CENTER: 34.060N 118.245W</span>
        <span>•</span>
        <span>SCALE: 1:{(10000 / zoom).toFixed(0)}</span>
      </div>
    </div>
  );
};
