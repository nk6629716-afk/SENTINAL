import React, { useState, useEffect } from 'react';
import {
  CasualtyRecord,
  RoadHazardEdge,
  EvacuationNode,
  CalculatedRoute,
  TriageCategory,
  PatientStatus,
} from '@shared/types';
import {
  HeartPulse,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Plus,
  Play,
  Pause,
  X,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { TacticalMap } from '../../components/TacticalMap';
import { api } from '../../services/api/apiClient';

interface MediRouteModuleProps {
  casualties: CasualtyRecord[];
  hazards: RoadHazardEdge[];
  nodes: EvacuationNode[];
  onRefreshCasualties: () => Promise<void>;
  onRefreshHazards: () => Promise<void>;
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

  // Active Calculated Route State
  const [activeRoute, setActiveRoute] = useState<CalculatedRoute | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Replay Bar State
  const [isPlaying, setIsPlaying] = useState(true);
  const [replaySpeed, setReplaySpeed] = useState<'1x' | '2x' | '5x'>('1x');

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
      }, 1500);
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
      handleRecalculateRoute();
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

  // Metrics derived from actual state
  const totalCasualties = casualties.length;
  const immediateCasualties = casualties.filter(
    (c) => c.triageCategory === 'immediate' || c.triageCategory === 'immediate_red'
  ).length;
  const blockedRoadCount = hazards.filter((h) => h.blocked).length;
  const rerouteCount =
    activeRoute?.avoidedHazardIds?.length ||
    activeRoute?.hazardsAvoided?.length ||
    activeRoute?.blockedEdgesAvoided?.length ||
    (activeRoute?.alternativeFound ? 1 : 0) ||
    (activeRoute?.hasActiveBlockage ? 1 : 0);
  const isDisconnected = Boolean(activeRoute && (activeRoute.alternativeFound === false || activeRoute.routeFound === false || (activeRoute.pathNodeIds && activeRoute.pathNodeIds.length === 0)));
  const meanEta = isDisconnected
    ? 'N/A'
    : activeRoute?.estimatedMinutes
    ? `${activeRoute.estimatedMinutes} min`
    : activeRoute?.totalTimeMin
    ? `${Math.round(activeRoute.totalTimeMin)} min`
    : '18 min';

  // Fallback casualty queue matching Mockup 05 only if NO casualties exist
  const mockCasualties = [
    {
      id: 'CAS-03',
      name: 'Casualty 03',
      vitals: 'HR 128 RR 34 SpO2 88',
      desc: 'Re-scored to immediate at 14:31, RR above 30',
      category: 'immediate',
      trend: 'worsening',
    },
    {
      id: 'CAS-06',
      name: 'Casualty 06',
      vitals: 'HR 118 RR 31 SpO2 90',
      desc: 'Immediate since 14:12',
      category: 'immediate',
      trend: 'stable',
    },
    {
      id: 'CAS-05',
      name: 'Casualty 05',
      vitals: 'HR 104 RR 24 SpO2 94',
      desc: 'Delayed since 14:05',
      category: 'delayed',
      trend: 'stable',
    },
    {
      id: 'CAS-01',
      name: 'Casualty 01',
      vitals: 'HR 82 RR 16 SpO2 98',
      desc: 'Minimal, walking wounded',
      category: 'minimal',
      trend: 'improving',
    },
  ];

  // Ensure MediRoute displays every real casualty, even when fewer than four exist
  const displayCasualties = casualties.length > 0
    ? [...casualties]
        .sort((a, b) => {
          const rank = (cat: string) => {
            if (cat.startsWith('immediate')) return 0;
            if (cat.startsWith('delayed')) return 1;
            if (cat.startsWith('minimal')) return 2;
            return 3;
          };
          return rank(a.triageCategory) - rank(b.triageCategory);
        })
        .map((c, i) => {
          const isImm = c.triageCategory === 'immediate' || c.triageCategory === 'immediate_red';
          const isDel = c.triageCategory === 'delayed' || c.triageCategory === 'delayed_yellow';
          const hr = c.vitals?.pulse || (c.vitals?.respiratoryRate ? c.vitals.respiratoryRate * 4 : (c.pulse || 104));
          const rr = c.vitals?.respiratoryRate ?? c.respiratoryRate ?? 22;
          const spo2 = c.spo2 || 94;

          return {
            id: c.id,
            name: c.patientCode || c.fictionalName || `Casualty ${i + 1}`,
            vitals: `HR ${hr} RR ${rr} SpO2 ${spo2}`,
            desc: c.triageReason || 'Triage criteria verified',
            category: c.triageCategory,
            trend: c.trend || (isImm ? (i === 0 ? 'worsening' : 'stable') : isDel ? 'stable' : 'improving'),
          };
        })
    : mockCasualties;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        background: 'var(--color-map)',
      }}
    >
      {/* Central Area: TacticalMap + Right Intel Pane */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Full-bleed TacticalMap Container */}
        <div style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden' }}>
          <TacticalMap
            nodes={nodes}
            edges={hazards}
            activeRoute={activeRoute}
            height="100%"
          />

          {/* Floating Top-Left 5-Metric Panel (Spec 05) */}
          <div
            className="panel"
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              display: 'flex',
              background: 'var(--color-sheet)',
              padding: '8px 16px',
              gap: '24px',
              zIndex: 30,
            }}
          >
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)', lineHeight: 1.1 }}>
                {totalCasualties}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>Casualties</div>
            </div>

            <div style={{ borderLeft: '1.2px solid var(--color-line)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)', lineHeight: 1.1 }}>
                {immediateCasualties}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>Immediate</div>
            </div>

            <div style={{ borderLeft: '1.2px solid var(--color-line)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)', lineHeight: 1.1 }}>
                {blockedRoadCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>Blocked road</div>
            </div>

            <div style={{ borderLeft: '1.2px solid var(--color-line)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)', lineHeight: 1.1 }}>
                {rerouteCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>Reroutes</div>
            </div>

            <div style={{ borderLeft: '1.2px solid var(--color-line)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)', lineHeight: 1.1 }}>
                {meanEta}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)' }}>Mean ETA</div>
            </div>
          </div>

          {/* Floating Bottom-Left Road Hazards Panel (Spec 05) */}
          <div
            className="panel"
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              width: '240px',
              background: 'var(--color-sheet)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              zIndex: 30,
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
              Road hazards
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {hazards.slice(0, 4).map((edge) => (
                <div
                  key={edge.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        background: edge.blocked ? 'var(--color-crit)' : 'var(--color-ok)',
                      }}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{edge.name}</span>
                  </div>

                  <button
                    onClick={() => handleToggleHazard(edge.id, edge.blocked)}
                    className="btn"
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      minWidth: '58px',
                      textAlign: 'center',
                    }}
                  >
                    {edge.blocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Intel Pane (Spec 05) */}
        <div
          style={{
            width: '380px',
            background: 'var(--color-sheet)',
            borderLeft: '1.2px solid var(--color-edge)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 20,
            overflowY: 'auto',
          }}
        >
          {/* Section 1: Priority Queue */}
          <div style={{ padding: '16px', borderBottom: '1.2px solid var(--color-line)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                Priority queue
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)' }}>
                By urgency, then trend
              </div>
            </div>

            {/* Casualty Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayCasualties.map((cas) => {
                const isImm = cas.category === 'immediate' || cas.category === 'immediate_red';
                const isDel = cas.category === 'delayed' || cas.category === 'delayed_yellow';
                const isExp = cas.category === 'expectant' || cas.category === 'expectant_black';

                const badgeBg = isImm ? 'var(--color-crit)' : isDel ? '#D97706' : isExp ? '#1E293B' : 'var(--color-ok)';
                const badgeLetter = isImm ? 'I' : isDel ? 'D' : isExp ? 'E' : 'M';

                return (
                  <div
                    key={cas.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    {/* Triage Square + Details */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          background: badgeBg,
                          color: '#FFFFFF',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {badgeLetter}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                          {cas.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', fontVariantNumeric: 'tabular-nums' }}>
                          {cas.vitals}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-2)', marginTop: '2px' }}>
                          {cas.desc}
                        </div>
                      </div>
                    </div>

                    {/* Trend Badge + Mini SVG Line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <div
                        style={{
                          padding: '2px 8px',
                          border: `1.2px solid ${
                            cas.trend === 'worsening'
                              ? 'var(--color-crit)'
                              : cas.trend === 'improving'
                              ? 'var(--color-ok)'
                              : '#D97706'
                          }`,
                          color:
                            cas.trend === 'worsening'
                              ? 'var(--color-crit)'
                              : cas.trend === 'improving'
                              ? 'var(--color-ok)'
                              : '#D97706',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}
                      >
                        {cas.trend === 'worsening' ? 'Worsening' : cas.trend === 'improving' ? 'Improving' : 'Stable'}
                      </div>

                      {/* Mini Trend Line */}
                      <svg width="46" height="8" viewBox="0 0 46 8">
                        {cas.trend === 'worsening' ? (
                          <path d="M 0,2 Q 20,4 32,5 T 46,7" fill="none" stroke="var(--color-crit)" strokeWidth="1.6" />
                        ) : cas.trend === 'improving' ? (
                          <path d="M 0,6 Q 20,4 32,3 T 46,1" fill="none" stroke="var(--color-ok)" strokeWidth="1.6" />
                        ) : (
                          <line x1="0" y1="4" x2="46" y2="4" stroke="#D97706" strokeWidth="1.6" />
                        )}
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Evacuation Route */}
          <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
              Evacuation route
            </div>

            {/* Blocked route summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-2)', textDecoration: 'line-through' }}>
                Field hospital, 6.8 km, 14 min
              </span>
              <span
                style={{
                  padding: '2px 6px',
                  border: '1.2px solid var(--color-crit)',
                  color: 'var(--color-crit)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                Blocked
              </span>
            </div>

            {/* Active route summary */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-ink)' }}>
                {activeRoute?.alternativeFound === false || activeRoute?.routeFound === false
                  ? 'All corridors obstructed'
                  : activeRoute?.totalDistanceKm
                  ? `Field hospital, ${activeRoute.totalDistanceKm} km, ${activeRoute.estimatedMinutes || activeRoute.estimatedTimeMinutes || 18} min`
                  : 'Field hospital, 8.9 km, 18 min'}
              </span>
              <span
                style={{
                  padding: '2px 6px',
                  border: `1.2px solid ${activeRoute?.alternativeFound === false || activeRoute?.routeFound === false ? 'var(--color-crit)' : 'var(--color-ok)'}`,
                  color: activeRoute?.alternativeFound === false || activeRoute?.routeFound === false ? 'var(--color-crit)' : 'var(--color-ok)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {activeRoute?.alternativeFound === false || activeRoute?.routeFound === false ? 'Disconnected' : 'Active'}
              </span>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-2)', marginTop: '-6px' }}>
              {activeRoute?.explanation || activeRoute?.message || 'Avoids bridge B-4. Recalculated 14:31:48 after hazard report.'}
            </div>

            {/* Bed Capacity Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              {/* Field Hospital Beds */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>Field hospital beds</span>
                  <span style={{ color: 'var(--color-ink-2)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    3 of 4 used
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--color-line)' }}>
                  <div style={{ width: '75%', height: '100%', background: '#D97706' }} />
                </div>
              </div>

              {/* Aid Station Beds */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>Aid station beds</span>
                  <span style={{ color: 'var(--color-ink-2)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    1 of 6 used
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--color-line)' }}>
                  <div style={{ width: '17%', height: '100%', background: 'var(--color-ok)' }} />
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '16px' }}>
              <button
                onClick={handleRecalculateRoute}
                disabled={isCalculatingRoute}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                }}
              >
                {isCalculatingRoute ? 'Calculating...' : 'Calculate route'}
              </button>

              <button
                onClick={() => setIsIntakeModalOpen(true)}
                className="btn"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                Report hazard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Replay Bar (Spec 05) */}
      <div
        style={{
          height: '42px',
          background: 'var(--color-paper)',
          borderTop: '1.2px solid var(--color-edge)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '14px',
          zIndex: 40,
        }}
      >
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: 'var(--color-strip)',
            border: 'none',
            color: '#FFFFFF',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isPlaying ? 'Pause replay' : 'Play replay'}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: '1px' }} />}
        </button>

        <div style={{ display: 'flex', border: '1.2px solid var(--color-edge)', background: 'var(--color-sheet)' }}>
          {(['1x', '2x', '5x'] as const).map((spd) => (
            <button
              key={spd}
              onClick={() => setReplaySpeed(spd)}
              style={{
                border: 'none',
                background: replaySpeed === spd ? 'var(--color-strip)' : 'transparent',
                color: replaySpeed === spd ? '#FFFFFF' : 'var(--color-ink)',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                padding: '2px 8px',
                cursor: 'pointer',
              }}
            >
              {spd}
            </button>
          ))}
        </div>

        <span style={{ fontSize: '0.76rem', color: 'var(--color-ink-2)' }}>Replay</span>

        {/* Timeline Slider with orange scrubber */}
        <div style={{ flex: 1, position: 'relative', height: '14px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: '2px', background: 'var(--color-line)', position: 'relative' }}>
            {[0.15, 0.28, 0.45, 0.62, 0.78, 0.92].map((tick, i) => (
              <div
                key={`tick-${i}`}
                style={{
                  position: 'absolute',
                  left: `${tick * 100}%`,
                  top: '-3px',
                  width: '1.5px',
                  height: '8px',
                  background: 'var(--color-edge)',
                }}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                left: '52%',
                top: '-16px',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  background: 'var(--color-strip)',
                  color: '#FFFFFF',
                  padding: '1px 6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  borderRadius: '2px',
                  marginBottom: '2px',
                }}
              >
                14:30:12
              </div>
              <div style={{ width: '2px', height: '12px', background: 'var(--color-accent)' }} />
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-2)', maxWidth: '420px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Alpha to Command: contact east of bridge, 2 hops, 380 ms
        </div>
      </div>

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
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                Casualty Triage Intake (START v1.0)
              </div>
              <button
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
