import React, { useState, useMemo } from 'react';
import {
  MedicalFacility,
  ExtendedCasualtyRecord,
  TransportUnit,
} from '../medirouteTypes';
import { RoadHazardEdge, EvacuationNode } from '@shared/types';
import { MediRouteGraphRouter } from '../../../algorithms/mediroute/graphRouter';
import {
  Route as RouteIcon,
  AlertTriangle,
  Building2,
  Ambulance,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

interface EvacuationRoutingTabProps {
  casualties: ExtendedCasualtyRecord[];
  facilities: MedicalFacility[];
  transportUnits: TransportUnit[];
  hazards: RoadHazardEdge[];
  nodes: EvacuationNode[];
  onToggleHazardBlock: (edgeId: string, isBlocked: boolean, reason?: string) => void;
  onDispatchTransport?: (
    casualtyId: string,
    facilityId: string,
    transportUnitId: string,
    distanceKm: number,
    etaMin: number
  ) => void;
}

export const EvacuationRoutingTab: React.FC<EvacuationRoutingTabProps> = ({
  casualties,
  facilities,
  transportUnits,
  hazards,
  nodes,
  onToggleHazardBlock,
  onDispatchTransport,
}) => {
  const [selectedCasualtyId, setSelectedCasualtyId] = useState<string>(
    casualties[0]?.id || ''
  );
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    facilities[0]?.id || ''
  );
  const avoidBlockedEdges = true;

  // Initialize router instance
  const router = useMemo(() => {
    const r = new MediRouteGraphRouter();
    // Synchronize hazards into graph
    hazards.forEach((h) => {
      r.setEdgeBlockage(h.edgeId || h.id, h.blocked, h.hazardType || h.name || 'Hazard Blocked');
    });
    return r;
  }, [hazards]);

  const activeCasualty = casualties.find((c) => c.id === selectedCasualtyId);
  const activeFacility = facilities.find((f) => f.id === selectedFacilityId);

  // Map casualty/facility to graph nodes
  const originNodeId = 'CAS-01'; // Default pickup site
  const destNodeId = 'HOSP-01'; // Default hospital destination

  // Calculate route using Dijkstra
  const routeCalculation = useMemo(() => {
    try {
      return router.calculateRoute(originNodeId, destNodeId, avoidBlockedEdges);
    } catch (err: any) {
      return {
        originNodeId,
        destinationNodeId: destNodeId,
        pathNodeIds: [],
        pathEdges: [],
        totalDistanceKm: 0,
        totalTimeMin: 0,
        blockedEdgesAvoided: [],
        hasRoute: false,
        message: err?.message || 'No viable route could be found in network.',
      };
    }
  }, [router, originNodeId, destNodeId, avoidBlockedEdges]);

  // Calculate alternative comparison (unconstrained)
  const directRouteCalculation = useMemo(() => {
    try {
      return router.calculateRoute(originNodeId, destNodeId, false);
    } catch {
      return null;
    }
  }, [router, originNodeId, destNodeId]);

  const isDetour =
    routeCalculation.hasRoute &&
    directRouteCalculation &&
    routeCalculation.totalDistanceKm > directRouteCalculation.totalDistanceKm;

  const detourDifferenceKm = isDetour
    ? Number((routeCalculation.totalDistanceKm - directRouteCalculation!.totalDistanceKm).toFixed(1))
    : 0;

  const currentGraph = router.getGraph();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Main Grid: Left Route Setup & Recalculation / Right Network Edges & Hazards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Left Column: Route Planner Configuration & Dijkstra Output */}
        <div
          style={{
            background: 'var(--bg-card, #181d1a)',
            border: '1px solid var(--border-card, rgba(115, 138, 101, 0.20))',
            borderRadius: 'var(--radius-sm, 6px)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RouteIcon size={16} color="var(--accent-sage, #738a65)" />
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-heading)' }}>
              Evacuation Route Calculation
            </h3>
          </div>

          {/* Select Casualty Pickup */}
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary, #94a192)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              1. Casualty & Pickup Point
            </label>
            <select
              value={selectedCasualtyId}
              onChange={(e) => setSelectedCasualtyId(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '0.75rem',
                background: 'var(--bg-control, #161c18)',
                border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))',
                borderRadius: '4px',
                color: 'var(--text-primary, #e9ece9)',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {casualties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.patientCode || c.id} &bull; {c.triageCategory?.toUpperCase() || 'TRIAGE'} &bull; {c.location?.name || 'Field'}
                </option>
              ))}
            </select>
          </div>

          {/* Select Destination Medical Facility */}
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary, #94a192)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              2. Destination Medical Facility
            </label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '0.75rem',
                background: 'var(--bg-control, #161c18)',
                border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))',
                borderRadius: '4px',
                color: 'var(--text-primary, #e9ece9)',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.type}) &bull; {f.availableBeds} beds available &bull; {f.status.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Route Result Card */}
          <div
            style={{
              padding: '14px',
              borderRadius: '4px',
              background: routeCalculation.hasRoute
                ? 'var(--bg-elevated, #1f2622)'
                : 'rgba(200, 90, 83, 0.12)',
              border: routeCalculation.hasRoute
                ? '1px solid var(--border-grid, rgba(115, 138, 101, 0.15))'
                : '1px solid rgba(200, 90, 83, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {routeCalculation.hasRoute ? (
                  <CheckCircle2 size={16} color="var(--status-safe, #588157)" />
                ) : (
                  <XCircle size={16} color="var(--status-critical, #c85a53)" />
                )}
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: routeCalculation.hasRoute ? 'var(--text-primary, #e9ece9)' : 'var(--status-critical, #c85a53)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {routeCalculation.hasRoute ? 'Viable Route Cleared' : 'NO SAFE ROUTE AVAILABLE'}
                </span>
              </div>

              {routeCalculation.hasRoute && (
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-primary, #e9ece9)', fontWeight: 700 }}>
                    {routeCalculation.totalDistanceKm} km
                  </span>
                  <span style={{ color: 'var(--accent-sage, #738a65)', fontWeight: 700 }}>
                    {routeCalculation.totalTimeMin} min ETA
                  </span>
                </div>
              )}
            </div>

            {/* Explanation / Detour Reason */}
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a192)', lineHeight: 1.4 }}>
              {routeCalculation.message}
            </div>

            {isDetour && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 8px',
                  borderRadius: '3px',
                  background: 'rgba(212, 163, 115, 0.12)',
                  border: '1px solid rgba(212, 163, 115, 0.3)',
                  fontSize: '0.66rem',
                  color: 'var(--status-warning, #d4a373)',
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={12} />
                <span>Detour active: +{detourDifferenceKm} km added to avoid blocked hazardous road segments.</span>
              </div>
            )}

            {/* Path Nodes sequence */}
            {routeCalculation.hasRoute && routeCalculation.pathNodeIds.length > 0 && (
              <div>
                <div style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--text-muted, #667564)', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                  Waypoints Sequence ({routeCalculation.pathNodeIds.length} nodes)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                  {routeCalculation.pathNodeIds.map((nodeId, idx) => (
                    <React.Fragment key={nodeId}>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 6px',
                          background: 'var(--bg-control, #161c18)',
                          border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))',
                          borderRadius: '3px',
                          color: 'var(--text-primary, #e9ece9)',
                        }}
                      >
                        {nodeId}
                      </span>
                      {idx < routeCalculation.pathNodeIds.length - 1 && (
                        <ArrowRight size={10} color="var(--text-muted, #667564)" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Road Hazards & Blockage Toggles */}
        <div
          style={{
            background: 'var(--bg-card, #181d1a)',
            border: '1px solid var(--border-card, rgba(115, 138, 101, 0.20))',
            borderRadius: 'var(--radius-sm, 6px)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="var(--status-warning, #d4a373)" />
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-heading)' }}>
                Road Segment Hazard Controls
              </h3>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #667564)', fontFamily: 'var(--font-mono)' }}>
              Interactive Toggles
            </span>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a192)' }}>
            Toggle road blockage on any network segment below to observe instantaneous Dijkstra recalculation and automated alternate detouring.
          </div>

          {/* Road Network Edges List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentGraph.edges.map((edge) => {
              const isBlocked = !!edge.isBlocked;
              return (
                <div
                  key={edge.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    background: isBlocked ? 'rgba(200, 90, 83, 0.10)' : 'var(--bg-elevated, #1f2622)',
                    border: isBlocked ? '1px solid rgba(200, 90, 83, 0.3)' : '1px solid var(--border-grid, rgba(115, 138, 101, 0.12))',
                    borderRadius: '4px',
                    transition: 'all 0.15s',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-mono)' }}>
                        {edge.id}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary, #94a192)', fontFamily: 'var(--font-mono)' }}>
                        ({edge.fromNodeId} &harr; {edge.toNodeId})
                      </span>
                      {isBlocked && (
                        <span
                          style={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '2px',
                            background: 'rgba(200, 90, 83, 0.25)',
                            color: 'var(--status-critical, #c85a53)',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-muted, #667564)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                      Distance: {edge.distanceKm} km &bull; Normal travel time: {edge.baseTravelTimeMin} mins
                    </div>
                    {isBlocked && edge.blockageReason && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--status-warning, #d4a373)', marginTop: '2px' }}>
                        Hazard: {edge.blockageReason}
                      </div>
                    )}
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() =>
                      onToggleHazardBlock(
                        edge.id,
                        !isBlocked,
                        !isBlocked ? 'Structural bridge damage / blast crater reported' : undefined
                      )
                    }
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      background: isBlocked ? 'rgba(88, 129, 87, 0.2)' : 'rgba(200, 90, 83, 0.2)',
                      color: isBlocked ? 'var(--status-safe, #588157)' : 'var(--status-critical, #c85a53)',
                      border: `1px solid ${isBlocked ? 'rgba(88, 129, 87, 0.4)' : 'rgba(200, 90, 83, 0.4)'}`,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {isBlocked ? 'Unblock Road' : 'Block Road'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
