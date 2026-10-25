import React, { useState, useEffect } from 'react';
import {
  CasualtyRecord,
  RoadHazardEdge,
  EvacuationNode,
  CalculatedRoute,
  TriageCategory,
} from '@shared/types';
import {
  HeartPulse,
  AlertTriangle,
  Play,
  Pause,
  X,
  ChevronDown,
  FilePlus,
  Route as RouteIcon,
  CheckCircle,
  RotateCw,
} from 'lucide-react';
import { TacticalMap } from '../../components/TacticalMap';
import { api } from '../../services/api/apiClient';
import {
  selectCasualties,
  selectImmediateCasualties,
  selectBlockedHazards,
  selectActiveRouteEta,
  selectRerouteCount,
} from '../../selectors';
import { formatIST } from '../../utils/time';

interface MediRouteModuleProps {
  casualties: CasualtyRecord[];
  hazards: RoadHazardEdge[];
  nodes: EvacuationNode[];
  onRefreshCasualties: () => Promise<void>;
  onRefreshHazards: () => Promise<void>;
  onToggleSimulationPause?: () => void;
  isSimPaused?: boolean;
}

// Algorithmic Simplified START Triage Evaluation Function (Preserved exactly)
export function calculateStartTriage(vitals: {
  canWalk: boolean;
  respiratoryRate: number;
  radialPulsePresent: boolean;
  mentalStatus: 'can_follow_commands' | 'unresponsive' | 'altered';
  severeBleedingControlled: boolean;
}): { category: TriageCategory; reason: string } {
  // Step 1: Minor (Walking Wounded)
  if (vitals.canWalk) {
    return {
      category: 'minimal',
      reason: 'Rule 1: Ambulatory patient capable of walking. Minor injuries requiring delayed holding.',
    };
  }

  // Step 2: Respiration check
  if (vitals.respiratoryRate === 0) {
    return {
      category: 'expectant',
      reason: 'Rule 2: Apneic (respiratory rate 0) after airway positioning. Expectant / non-survivable in field triage.',
    };
  }

  if (vitals.respiratoryRate > 30 || vitals.respiratoryRate < 10) {
    return {
      category: 'immediate',
      reason: `Rule 3: Respiratory distress detected (RR: ${vitals.respiratoryRate}/min outside 10-30 normal range). Immediate airway stabilization needed.`,
    };
  }

  // Step 3: Perfusion check (Radial Pulse or Bleeding)
  if (!vitals.radialPulsePresent || !vitals.severeBleedingControlled) {
    return {
      category: 'immediate',
      reason: 'Rule 4: Hemodynamic compromise (absent radial pulse or uncontrolled severe hemorrhage). High risk of hypovolemic shock.',
    };
  }

  // Step 4: Mental Status check
  if (vitals.mentalStatus !== 'can_follow_commands') {
    return {
      category: 'immediate',
      reason: 'Rule 5: Altered neurological status / inability to follow simple verbal commands. Potential intracranial injury.',
    };
  }

  // Otherwise: Delayed
  return {
    category: 'delayed',
    reason: 'Rule 6: Stable vital signs and perfusion present, non-ambulatory with serious systemic trauma.',
  };
}

export const MediRouteModule: React.FC<MediRouteModuleProps> = ({
  casualties,
  hazards,
  nodes,
  onRefreshCasualties,
  onRefreshHazards,
  onToggleSimulationPause,
  isSimPaused = false,
}) => {
  // Intake Form Modal State
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [patientCode, setPatientCode] = useState(`CAS-${Math.floor(Math.random() * 8000 + 1000)}`);
  const [canWalk, setCanWalk] = useState(false);
  const [respiratoryRate, setRespiratoryRate] = useState(24);
  const [radialPulsePresent, setRadialPulsePresent] = useState(true);
  const [mentalStatus, setMentalStatus] = useState<'can_follow_commands' | 'unresponsive' | 'altered'>('can_follow_commands');
  const [severeBleedingControlled, setSevereBleedingControlled] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [intakeSuccess, setIntakeSuccess] = useState<string | null>(null);

  // Hazard Report Modal State
  const [isHazardModalOpen, setIsHazardModalOpen] = useState(false);
  const [selectedHazardEdgeId, setSelectedHazardEdgeId] = useState<string>('');
  const [hazardAction, setHazardAction] = useState<'block' | 'unblock'>('block');

  // Active Calculated Route State
  const [activeRoute, setActiveRoute] = useState<CalculatedRoute | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [rerouteCounter, setRerouteCounter] = useState(0);

  // Simulation Replay Bar State
  const [simElapsedSeconds, setSimElapsedSeconds] = useState(18);
  const [isHazardsPanelCollapsed, setIsHazardsPanelCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1100 || window.innerHeight < 700;
    }
    return false;
  });

  // Resize listener for default collapsed state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1100 || window.innerHeight < 700) {
        setIsHazardsPanelCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer for elapsed sim seconds
  useEffect(() => {
    if (isSimPaused) return;
    const interval = setInterval(() => {
      setSimElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isSimPaused]);

  // Initial Route Calculation on mount
  useEffect(() => {
    handleRecalculateRoute();
  }, []);

  // Algorithmic Triage Preview
  const previewTriage = calculateStartTriage({
    canWalk,
    respiratoryRate,
    radialPulsePresent,
    mentalStatus,
    severeBleedingControlled,
  });

  const handleCasualtyIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIntakeSuccess(null);

    try {
      const triage = calculateStartTriage({
        canWalk,
        respiratoryRate,
        radialPulsePresent,
        mentalStatus,
        severeBleedingControlled,
      });

      const newCasualty: CasualtyRecord = {
        id: patientCode,
        patientCode,
        location: { name: 'Collection Point A', lat: 34.055, lng: -118.255 },
        vitals: {
          canWalk,
          respiratoryRate,
          radialPulsePresent,
          mentalStatus,
          severeBleedingControlled,
        },
        triageCategory: triage.category,
        ruleVersion: 'START_TACTICAL_DEMO_v1.0',
        triageReason: triage.reason,
        status: 'assessed',
        notes: notes || 'Field intake registered by triage team.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSimulated: true,
      };

      await api.createCasualty(newCasualty);
      await onRefreshCasualties();

      setIntakeSuccess(`Casualty ${patientCode} registered as ${triage.category.toUpperCase()}.`);
      setPatientCode(`CAS-${Math.floor(Math.random() * 8000 + 1000)}`);
      setNotes('');
      setTimeout(() => {
        setIsIntakeModalOpen(false);
        setIntakeSuccess(null);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to submit casualty:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleHazard = async (edgeId: string, currentBlocked: boolean) => {
    try {
      await api.toggleRoadBlockage(edgeId, !currentBlocked);
      await onRefreshHazards();
      setRerouteCounter((c) => c + 1);
      await handleRecalculateRoute();
    } catch (err) {
      console.error('Failed to toggle road hazard:', err);
    }
  };

  const handleRecalculateRoute = async () => {
    setIsCalculatingRoute(true);
    try {
      const route = await api.calculateRoute('NODE-CAS-3', 'NODE-HOSP-1', true);
      setActiveRoute(route);
    } catch (err) {
      console.error('Failed to compute route via engine:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleApplyHazardModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const edge = hazards.find((h) => h.id === selectedHazardEdgeId);
    if (!edge) return;

    try {
      const shouldBlock = hazardAction === 'block';
      await api.toggleRoadBlockage(edge.id, shouldBlock);
      await onRefreshHazards();
      setRerouteCounter((c) => c + 1);
      await handleRecalculateRoute();
      setIsHazardModalOpen(false);
    } catch (err) {
      console.error('Failed to update road hazard:', err);
    }
  };

  // Metrics from Single Source of Truth
  const realCasualties = selectCasualties(casualties);
  const immediateCasualtiesCount = selectImmediateCasualties(casualties).length;
  const blockedRoadCount = selectBlockedHazards(hazards).length;
  const etaMinutes = selectActiveRouteEta(activeRoute);
  const rerouteCount = selectRerouteCount(activeRoute, rerouteCounter);

  const latestActivity = activeRoute ? {
    module: 'MEDIROUTE',
    description: `${activeRoute.explanation} (${formatIST(activeRoute.calculatedAt, { seconds: false })})`,
  } : null;

  const getNodeLabel = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) return node.name;
    if (nodeId === 'NODE-CAS-3') return 'Casualty Hub Delta';
    if (nodeId === 'NODE-HOSP-1') return 'Hospital Alpha';
    if (nodeId === 'NODE-AID-2') return 'Aid Station Bravo';
    if (nodeId === 'NODE-INT-4' || nodeId === 'NODE-INT-5') return `Junction ${nodeId.slice(-1)}`;
    return nodeId;
  };

  // Top-left Metrics Toolbar Content (paired with Mode Switch)
  const topLeftMetrics = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--color-sheet)',
        border: 'var(--border-width, 1.2px) solid var(--color-edge)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 14px',
        gap: '20px',
        boxShadow: 'var(--shadow-flat)',
      }}
    >
      <div>
        <div
          className="numeral"
          style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-numerals)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            color: 'var(--color-ink)',
            lineHeight: 1,
          }}
        >
          {realCasualties.length}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', marginTop: '2px' }}>
          Casualties
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '16px' }}>
        <div
          className="numeral"
          style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-numerals)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            color: immediateCasualtiesCount > 0 ? 'var(--color-crit)' : 'var(--color-ink)',
            lineHeight: 1,
          }}
        >
          {immediateCasualtiesCount}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', marginTop: '2px' }}>
          Immediate
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '16px' }}>
        <div
          className="numeral"
          style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-numerals)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            color: blockedRoadCount > 0 ? 'var(--color-warn)' : 'var(--color-ink)',
            lineHeight: 1,
          }}
        >
          {blockedRoadCount}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', marginTop: '2px' }}>
          Blocked road
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '16px' }}>
        <div
          className="numeral"
          style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-numerals)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            color: 'var(--color-ink)',
            lineHeight: 1,
          }}
        >
          {rerouteCount}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', marginTop: '2px' }}>
          Reroutes
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '16px' }}>
        <div
          className="numeral"
          style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-numerals)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            color: 'var(--color-ink)',
            lineHeight: 1,
          }}
        >
          {etaMinutes ? `${etaMinutes}m` : '--'}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--color-ink-2)', marginTop: '2px' }}>
          Mean ETA
        </div>
      </div>
    </div>
  );

  // Bottom-left Collapsible Road Hazards Panel
  const bottomLeftHazards = isHazardsPanelCollapsed ? (
    <button
      type="button"
      className="overlay-chip-btn"
      onClick={() => setIsHazardsPanelCollapsed(false)}
      title="Open Road hazards panel"
    >
      <AlertTriangle size={13} />
      <span>Road Hazards ({blockedRoadCount})</span>
    </button>
  ) : (
    <div
      className="overlay-collapsible-panel"
      style={{
        width: '280px',
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          paddingBottom: '4px',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.85rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              color: 'var(--color-ink)',
            }}
          >
            Road hazards
          </span>
          <span
            className="numeral"
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '2px',
              background: blockedRoadCount > 0 ? 'var(--color-crit)' : 'var(--color-paper)',
              color: blockedRoadCount > 0 ? '#FFFFFF' : 'var(--color-ink-2)',
              fontFamily: 'var(--font-numerals)',
            }}
          >
            {blockedRoadCount} blocked
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsHazardsPanelCollapsed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-ink-2)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Collapse road hazards panel"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {hazards.map((edge) => (
          <div
            key={edge.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '4px 6px',
              border: '1px solid var(--color-line)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-paper)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: edge.blocked ? 'var(--color-crit)' : 'var(--color-ok)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                }}
              >
                {edge.name}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleToggleHazard(edge.id, edge.blocked)}
              className="btn btn-sm"
              style={{
                padding: '2px 8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                flexShrink: 0,
                minWidth: '58px',
                textAlign: 'center',
                color: edge.blocked ? 'var(--color-ok)' : 'var(--color-crit)',
                borderColor: edge.blocked ? 'var(--color-ok)' : 'var(--color-crit)',
              }}
            >
              {edge.blocked ? 'Unblock' : 'Block'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, position: 'relative' }}>
        {/* Full TacticalMap Area */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, minHeight: 0, height: '100%' }}>
          <TacticalMap
            nodes={nodes}
            edges={hazards}
            activeRoute={activeRoute}
            height="100%"
            topLeftContent={topLeftMetrics}
            bottomLeftContent={bottomLeftHazards}
          />
        </div>

        {/* Right Intel Pane: Fixed width clamp, sticky header, internal scroll */}
        <aside
          style={{
            width: 'clamp(320px, 28vw, 440px)',
            background: 'var(--color-sheet)',
            borderLeft: 'var(--border-width, 1.2px) solid var(--color-edge)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
            flexShrink: 0,
            height: '100%',
            minHeight: 0,
            zIndex: 20,
          }}
          aria-label="Medical triage and evacuation pane"
        >
          {/* Section 1: Priority Queue */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: 'var(--border-width, 1.2px) solid var(--color-line)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                Triage Priority Queue
              </div>
              <div
                className="numeral"
                style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)', fontFamily: 'var(--font-numerals)' }}
              >
                {realCasualties.length} assessed
              </div>
            </div>

            {/* Casualty Cards List */}
            {realCasualties.length === 0 ? (
              <div
                style={{
                  padding: '16px 12px',
                  textAlign: 'center',
                  background: 'var(--color-paper)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-line)',
                  color: 'var(--color-ink-2)',
                  fontSize: '0.78rem',
                }}
              >
                No active casualties logged in sector.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {realCasualties.map((cas) => {
                  const isImm = cas.triageCategory === 'immediate';
                  const isDel = cas.triageCategory === 'delayed';
                  const isMin = cas.triageCategory === 'minimal';

                  const badgeBg = isImm
                    ? 'var(--color-crit)'
                    : isDel
                    ? '#D97706'
                    : isMin
                    ? 'var(--color-ok)'
                    : '#64748B';
                  const badgeLetter = isImm ? 'I' : isDel ? 'D' : isMin ? 'M' : 'E';

                  return (
                    <div
                      key={cas.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '8px 10px',
                        background: 'var(--color-paper)',
                        border: '1px solid var(--color-line)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {/* Triage Letter Square */}
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          background: badgeBg,
                          color: '#FFFFFF',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          borderRadius: '2px',
                          marginTop: '2px',
                        }}
                      >
                        {badgeLetter}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                            {cas.patientCode}
                          </span>
                          <span
                            className="numeral"
                            style={{
                              fontSize: '0.66rem',
                              color: 'var(--color-ink-2)',
                              fontFamily: 'var(--font-numerals)',
                            }}
                          >
                            {formatIST(cas.createdAt)}
                          </span>
                        </div>

                        <div
                          className="numeral"
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--color-ink-2)',
                            fontFamily: 'var(--font-numerals)',
                            fontVariantNumeric: 'tabular-nums',
                            marginTop: '1px',
                          }}
                        >
                          {cas.vitals
                            ? `RR: ${cas.vitals.respiratoryRate}/min | Pulse: ${cas.vitals.radialPulsePresent ? 'Present' : 'Absent'} | Walks: ${cas.vitals.canWalk ? 'Yes' : 'No'}`
                            : 'Field vitals pending'}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)', marginTop: '3px' }}>
                          {cas.triageReason}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsIntakeModalOpen(true)}
              className="btn btn-primary"
              style={{
                padding: '7px 12px',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <HeartPulse size={13} />
              <span>Register field triage (START)</span>
            </button>
          </div>

          {/* Section 2: Evacuation Route */}
          <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                Dijkstra Evacuation Route
              </div>
              {activeRoute && (
                <span
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '2px',
                    border: `1px solid ${activeRoute.hasActiveBlockage ? 'var(--color-warn)' : 'var(--color-ok)'}`,
                    color: activeRoute.hasActiveBlockage ? 'var(--color-warn)' : 'var(--color-ok)',
                  }}
                >
                  {activeRoute.hasActiveBlockage ? 'Diverted' : 'Optimal'}
                </span>
              )}
            </div>

            {activeRoute ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '10px 12px',
                  background: 'var(--color-paper)',
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                    {((activeRoute as any)?.alternativeFound === false || (activeRoute as any)?.routeFound === false)
                      ? 'All corridors obstructed'
                      : `Destination: ${getNodeLabel(activeRoute.destinationNodeId)}`}
                  </span>
                  <span
                    className="numeral"
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      color: ((activeRoute as any)?.alternativeFound === false || (activeRoute as any)?.routeFound === false) ? 'var(--color-crit)' : 'var(--color-ink)',
                      fontFamily: 'var(--font-numerals)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {((activeRoute as any)?.alternativeFound === false || (activeRoute as any)?.routeFound === false)
                      ? 'Disconnected'
                      : `${activeRoute.totalDistanceKm} km (${activeRoute.estimatedMinutes} min)`}
                  </span>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>
                  Corridor:{' '}
                  <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                    {activeRoute.pathNodeIds.map((id) => getNodeLabel(id)).join(' → ')}
                  </span>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>
                  {activeRoute.explanation}
                </div>

                <div
                  className="numeral"
                  style={{
                    fontSize: '0.66rem',
                    color: 'var(--color-ink-2)',
                    fontFamily: 'var(--font-numerals)',
                    marginTop: '2px',
                  }}
                >
                  Calculated: {formatIST(activeRoute.calculatedAt)}
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px', color: 'var(--color-ink-2)', fontSize: '0.76rem' }}>
                Computing shortest path corridor...
              </div>
            )}

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={handleRecalculateRoute}
                disabled={isCalculatingRoute}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <RotateCw size={12} className={isCalculatingRoute ? 'spin' : ''} />
                <span>{isCalculatingRoute ? 'Calculating...' : 'Recalculate route'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedHazardEdgeId(hazards[0]?.id || '');
                  setIsHazardModalOpen(true);
                }}
                className="btn"
                style={{
                  padding: '7px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertTriangle size={12} />
                <span>Report hazard</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Replay / Live Bar */}
      <footer
        style={{
          height: '36px',
          minHeight: '36px',
          borderTop: 'var(--border-width, 1.2px) solid var(--color-edge)',
          background: 'var(--color-sheet)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          fontSize: '0.74rem',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onToggleSimulationPause}
            style={{ width: '24px', height: '24px', minWidth: '24px', padding: 0 }}
            title={isSimPaused ? 'Resume simulation' : 'Pause simulation'}
          >
            {isSimPaused ? <Play size={12} /> : <Pause size={12} />}
          </button>

          {/* LIVE indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isSimPaused ? 'var(--color-warn)' : 'var(--color-crit)',
                boxShadow: isSimPaused ? 'none' : '0 0 6px var(--color-crit)',
              }}
            />
            <span style={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.04em', color: 'var(--color-ink)' }}>
              {isSimPaused ? 'PAUSED' : 'LIVE'}
            </span>
          </div>

          <div
            className="numeral"
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-ink-2)',
              fontFamily: 'var(--font-numerals)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            T+{Math.floor(simElapsedSeconds / 60).toString().padStart(2, '0')}:{(simElapsedSeconds % 60).toString().padStart(2, '0')}
          </div>
        </div>

        {/* Dynamic Activity Ticker */}
        {latestActivity && (
          <div
            style={{
              color: 'var(--color-ink-2)',
              fontSize: '0.72rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '500px',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--color-ink)', marginRight: '6px' }}>
              [{latestActivity.module.toUpperCase()}]
            </span>
            <span>{latestActivity.description}</span>
          </div>
        )}
      </footer>

      {/* Report Road Hazard Modal */}
      {isHazardModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(22, 32, 46, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsHazardModalOpen(false)}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              background: 'var(--color-sheet)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                Report Road Hazard
              </div>
              <button
                type="button"
                onClick={() => setIsHazardModalOpen(false)}
                className="btn"
                style={{ padding: '4px 6px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleApplyHazardModal} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                  Target Road Segment
                </label>
                <select
                  className="form-input"
                  value={selectedHazardEdgeId}
                  onChange={(e) => setSelectedHazardEdgeId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {hazards.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} — ({h.blocked ? 'Currently Blocked' : 'Clear'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                  Action
                </label>
                <div style={{ display: 'flex', border: '1px solid var(--color-edge)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setHazardAction('block')}
                    style={{
                      flex: 1,
                      background: hazardAction === 'block' ? 'var(--color-crit)' : 'transparent',
                      color: hazardAction === 'block' ? '#FFFFFF' : 'var(--color-ink)',
                      border: 'none',
                      padding: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Mark as Blocked
                  </button>
                  <button
                    type="button"
                    onClick={() => setHazardAction('unblock')}
                    style={{
                      flex: 1,
                      background: hazardAction === 'unblock' ? 'var(--color-ok)' : 'transparent',
                      color: hazardAction === 'unblock' ? '#FFFFFF' : 'var(--color-ink)',
                      border: 'none',
                      padding: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Mark as Clear
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsHazardModalOpen(false)}
                  className="btn"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '6px 16px', fontSize: '0.78rem', fontWeight: 800 }}
                >
                  Apply Hazard Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Casualty Intake & START Triage Modal */}
      {isIntakeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(22, 32, 46, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsIntakeModalOpen(false)}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'var(--color-sheet)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                Casualty Triage Intake (START v1.0)
              </div>
              <button
                type="button"
                onClick={() => setIsIntakeModalOpen(false)}
                className="btn"
                style={{ padding: '4px 6px' }}
              >
                <X size={16} />
              </button>
            </div>

            {intakeSuccess && (
              <div style={{ padding: '8px 12px', background: 'var(--color-paper)', border: '1.2px solid var(--color-ok)', color: 'var(--color-ok)', fontSize: '0.8rem', fontWeight: 700 }}>
                {intakeSuccess}
              </div>
            )}

            <form onSubmit={handleCasualtyIntake} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                  Patient Identifier
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '4px' }}>
                  <span>Respiration Rate: {respiratoryRate} /min</span>
                  <span style={{ color: respiratoryRate > 30 || respiratoryRate < 10 ? 'var(--color-crit)' : 'var(--color-ok)' }}>
                    {respiratoryRate > 30 ? 'Critical high' : respiratoryRate < 10 ? 'Critical low' : 'Normal'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-accent)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={canWalk}
                    onChange={(e) => setCanWalk(e.target.checked)}
                    style={{ accentColor: 'var(--color-ok)' }}
                  />
                  <span>Ambulatory (Walks)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={radialPulsePresent}
                    onChange={(e) => setRadialPulsePresent(e.target.checked)}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span>Radial Pulse</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                  Mental Status
                </label>
                <select
                  className="form-input"
                  value={mentalStatus}
                  onChange={(e) => setMentalStatus(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="can_follow_commands">Can Follow Commands (Alert)</option>
                  <option value="altered">Altered / Disoriented</option>
                  <option value="unresponsive">Unresponsive / Comatose</option>
                </select>
              </div>

              {/* Algorithmic preview result */}
              <div style={{ padding: '8px 12px', background: 'var(--color-paper)', border: '1.2px solid var(--color-line)', fontSize: '0.76rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--color-accent)', marginBottom: '2px' }}>
                  Triage Category: {previewTriage.category.toUpperCase()}
                </div>
                <div style={{ color: 'var(--color-ink-2)' }}>{previewTriage.reason}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '4px' }}>
                  Field Notes
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Injuries, tourniquet time..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsIntakeModalOpen(false)}
                  className="btn"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '6px 16px', fontSize: '0.78rem', fontWeight: 800 }}
                >
                  Register casualty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
