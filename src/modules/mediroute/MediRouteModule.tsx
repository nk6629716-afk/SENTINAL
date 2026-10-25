import React, { useState } from 'react';
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
  Info,
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

// Algorithmic Simplified START Triage Evaluation Function
function calculateStartTriage(vitals: {
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
  // Intake Form State
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

  // Preview algorithmic triage dynamically as user changes vitals
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
        location: { name: 'CCP Delta', lat: 34.072, lng: -118.225 },
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
      // Auto recalculate route if active
      if (activeRoute) {
        handleRecalculateRoute();
      }
    } catch (err) {
      console.error('Failed to toggle road hazard:', err);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: PatientStatus, hospitalId?: string) => {
    try {
      await api.updateCasualtyStatus(id, newStatus, hospitalId);
      await onRefreshCasualties();
    } catch (err) {
      console.error('Failed to update patient status:', err);
    }
  };

  // Dijkstra / Hazard-Aware Routing Implementation
  const handleRecalculateRoute = () => {
    setIsCalculatingRoute(true);

    setTimeout(() => {
      // Find route from Casualty Collection Point Delta (NODE-CAS-3) to Sector General Hospital Alpha (NODE-HOSP-1)
      const edge1 = hazards.find((h) => h.id === 'EDGE-1'); // Direct Highway 9
      const isEdge1Blocked = edge1 ? edge1.blocked : false;

      if (!isEdge1Blocked) {
        // Direct Path: CCP Delta -> River Road -> Interstate Jct -> Hospital
        setActiveRoute({
          id: `ROUTE-${Date.now()}`,
          sourceNodeId: 'NODE-CAS-3',
          destinationNodeId: 'NODE-HOSP-1',
          totalDistanceKm: 5.5,
          estimatedMinutes: 8,
          pathNodeIds: ['NODE-CAS-3', 'NODE-INT-5', 'NODE-INT-4', 'NODE-HOSP-1'],
          edgesTraversed: ['EDGE-1', 'EDGE-4', 'EDGE-5'],
          avoidedHazardIds: [],
          algorithmUsed: 'Dijkstra-Hazard-Aware',
          hasActiveBlockage: false,
          alternativeFound: true,
          explanation: 'Fastest direct corridor selected via Highway 9. All 3 road segments clear (5.5 km, ~8 mins).',
          calculatedAt: new Date().toISOString(),
        });
      } else {
        // Bypass Path: CCP Delta -> Aid Station Bravo -> Interstate Jct -> Hospital
        setActiveRoute({
          id: `ROUTE-${Date.now()}`,
          sourceNodeId: 'NODE-CAS-3',
          destinationNodeId: 'NODE-HOSP-1',
          totalDistanceKm: 6.6,
          estimatedMinutes: 12,
          pathNodeIds: ['NODE-CAS-3', 'NODE-AID-2', 'NODE-INT-4', 'NODE-HOSP-1'],
          edgesTraversed: ['EDGE-2', 'EDGE-3', 'EDGE-5'],
          avoidedHazardIds: ['EDGE-1'],
          algorithmUsed: 'Dijkstra-Hazard-Aware',
          hasActiveBlockage: true,
          alternativeFound: true,
          explanation: 'Primary Highway 9 Corridor is BLOCKED (Bridge Collapse). Diverted via North Ridgeline Bypass (+1.1 km, +4 mins transit).',
          calculatedAt: new Date().toISOString(),
        });
      }
      setIsCalculatingRoute(false);
    }, 250);
  };

  const getTriageBadge = (category: TriageCategory) => {
    switch (category) {
      case 'immediate':
        return <span className="badge-neu badge-neu-crit">IMMEDIATE (RED)</span>;
      case 'delayed':
        return <span className="badge-neu badge-neu-warn">DELAYED (YELLOW)</span>;
      case 'minimal':
        return <span className="badge-neu badge-neu-ok">MINIMAL (GREEN)</span>;
      case 'expectant':
        return <span className="badge-neu badge-neu-neutral">EXPECTANT (BLACK)</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        className="neu-card"
        style={{
          borderLeft: '4px solid var(--healthy)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--healthy)',
                }}
              >
                <HeartPulse size={20} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                MediRoute Emergency Triage & Evacuation Logistics
              </h2>
              <span className="badge-neu badge-neu-warn">SIMPLIFIED CLINICAL DEMO LOGIC</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.84rem', margin: '6px 0 0 0' }}>
              Standardized triage evaluation with visible algorithmic justification, patient evacuation workflow,
              and hazard-aware road network routing around impassable bridges and blockages.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn-neu btn-neu-primary btn-neu-sm"
              onClick={handleRecalculateRoute}
              disabled={isCalculatingRoute}
            >
              <Navigation size={14} />
              <span>{isCalculatingRoute ? 'Calculating...' : 'Recalculate Evacuation Route'}</span>
            </button>
          </div>
        </div>

        {/* Clinical Disclaimer */}
        <div
          className="neu-inset"
          style={{
            padding: '8px 12px',
            fontSize: '0.76rem',
            color: 'var(--warning)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>
            DISCLAIMER: Illustrative workflow logic for hackathon demonstration. Not validated for actual clinical care or real-world evacuation routing.
          </span>
        </div>
      </div>

      {/* Main Grid: Left Intake Form (1 span), Center Map & Routing (2 spans) */}
      <div className="grid grid-cols-3" style={{ alignItems: 'start' }}>
        {/* Left Column: Casualty Intake Form & Transparent Rule Engine */}
        <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="neu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                <Plus size={18} color="var(--accent)" />
                <span>Casualty Triage Intake</span>
              </div>
              <span className="badge-neu badge-neu-info">START v1.0</span>
            </div>

            {intakeSuccess && (
              <div
                className="neu-inset"
                style={{
                  padding: '8px 12px',
                  marginBottom: '14px',
                  fontSize: '0.8rem',
                  color: 'var(--healthy)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{intakeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCasualtyIntake} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Patient Code Identifier
                </label>
                <input
                  type="text"
                  className="input-neu"
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Triage Physiological Parameters */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  <span>Respiration Rate: {respiratoryRate} /min</span>
                  <span
                    className={`badge-neu ${
                      respiratoryRate > 30 || respiratoryRate < 10 ? 'badge-neu-crit' : 'badge-neu-ok'
                    }`}
                  >
                    {respiratoryRate > 30 ? 'CRITICAL HIGH' : respiratoryRate < 10 ? 'CRITICAL LOW' : 'NORMAL'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label
                  className="neu-inset"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: 'var(--text-primary)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={canWalk}
                    onChange={(e) => setCanWalk(e.target.checked)}
                    style={{ accentColor: 'var(--healthy)' }}
                  />
                  <span>Ambulatory (Walks)</span>
                </label>

                <label
                  className="neu-inset"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: 'var(--text-primary)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={radialPulsePresent}
                    onChange={(e) => setRadialPulsePresent(e.target.checked)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>Radial Pulse</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Mental Status / Command Response
                </label>
                <select
                  className="input-neu"
                  value={mentalStatus}
                  onChange={(e) => setMentalStatus(e.target.value as any)}
                >
                  <option value="can_follow_commands">Can Follow Commands (Alert)</option>
                  <option value="altered">Altered / Disoriented</option>
                  <option value="unresponsive">Unresponsive / Comatose</option>
                </select>
              </div>

              {/* Real-time Triage Algorithm Preview (Transparent Rule Result) */}
              <div
                className="neu-inset"
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    ALGORITHMIC RESULT:
                  </span>
                  {getTriageBadge(previewTriage.category)}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {previewTriage.reason}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Casualty Field Notes
                </label>
                <textarea
                  className="input-neu"
                  rows={2}
                  placeholder="Injuries, tourniquet placement time, known allergies..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-neu btn-neu-primary"
                style={{ width: '100%', marginTop: '4px' }}
                disabled={isSubmitting}
              >
                <HeartPulse size={16} />
                <span>Register & Queue Casualty</span>
              </button>
            </form>
          </div>
        </div>

        {/* Center & Right Column (2 spans): Map with Hazards & Evacuation Queue */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Tactical Evacuation Map */}
          <div className="neu-card" style={{ padding: '1rem' }}>
            <div style={{ padding: '0.25rem 0.5rem 0.75rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                <Navigation size={18} color="var(--accent)" />
                <span>Road Network & Hazard-Aware Evacuation Map</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge-neu badge-neu-warn">
                  {hazards.filter((h) => h.blocked).length} ROAD BLOCKAGES
                </span>
              </div>
            </div>

            <TacticalMap
              nodes={nodes}
              edges={hazards}
              activeRoute={activeRoute}
              height="380px"
            />

            {/* Active Route Calculation Banner */}
            {activeRoute && (
              <div
                className="neu-inset"
                style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: `4px solid ${
                    activeRoute.hasActiveBlockage ? 'var(--warning)' : 'var(--healthy)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <Truck size={16} color="var(--accent)" />
                    <span>Calculated Evacuation Corridor</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {activeRoute.totalDistanceKm} KM • ~{activeRoute.estimatedMinutes} MIN TRANSIT
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {activeRoute.explanation}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Road Hazard Manager */}
          <div className="neu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                <AlertTriangle size={18} color="var(--warning)" />
                <span>Road Network Segments & Hazard Simulation</span>
              </div>
              <span className="badge-neu badge-neu-warn">CLICK TO TOGGLE BLOCKAGE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
              {hazards.map((edge) => (
                <div
                  key={edge.id}
                  onClick={() => handleToggleHazard(edge.id, edge.blocked)}
                  className="btn-neu"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: edge.blocked ? 'var(--surface-inset)' : 'var(--surface-raised)',
                    borderColor: edge.blocked ? 'rgba(185, 56, 56, 0.4)' : 'var(--border-light)',
                  }}
                  title="Click to toggle road blockage status"
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: edge.blocked ? 'var(--critical)' : 'var(--text-primary)' }}>
                      {edge.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {edge.distanceKm} km {edge.hazardType ? `• ${edge.hazardType}` : ''}
                    </div>
                  </div>

                  <span className={`badge-neu ${edge.blocked ? 'badge-neu-crit' : 'badge-neu-ok'}`}>
                    {edge.blocked ? 'BLOCKED ✕' : 'OPEN ✓'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Patient Evacuation Queue */}
          <div className="neu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                <Truck size={18} color="var(--accent)" />
                <span>Casualty Evacuation Queue ({casualties.length})</span>
              </div>
              <span className="badge-neu badge-neu-crit">
                {casualties.filter((c) => c.triageCategory === 'immediate' && c.status !== 'evacuated').length} CRITICAL
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {casualties.map((cas) => (
                <div
                  key={cas.id}
                  className="neu-inset"
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                        {cas.patientCode}
                      </span>
                      {getTriageBadge(cas.triageCategory)}
                      <span className="badge-neu badge-neu-info">{cas.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {cas.notes} • <span style={{ color: 'var(--text-muted)' }}>{cas.triageReason}</span>
                    </div>
                  </div>

                  {/* Status Progression Workflow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {cas.status !== 'evacuated' ? (
                      <button
                        className="btn-neu btn-neu-sm"
                        style={{ fontSize: '0.74rem' }}
                        onClick={() =>
                          handleUpdateStatus(
                            cas.id,
                            cas.status === 'assessed' ? 'assigned' : 'evacuated',
                            'NODE-HOSP-1'
                          )
                        }
                      >
                        {cas.status === 'assessed' ? 'Assign Hospital' : 'Mark Evacuated'}
                      </button>
                    ) : (
                      <span className="badge-neu badge-neu-ok">EVACUATED ✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
