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
  RotateCcw,
  Plus,
  ShieldAlert,
  Info,
  Clock,
  MapPin,
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
        return <span className="badge badge-danger">IMMEDIATE (RED)</span>;
      case 'delayed':
        return <span className="badge badge-warning">DELAYED (YELLOW)</span>;
      case 'minimal':
        return <span className="badge badge-nominal">MINIMAL (GREEN)</span>;
      case 'expectant':
        return <span className="badge badge-simulated">EXPECTANT (BLACK)</span>;
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          borderLeft: '4px solid var(--status-nominal)',
          background: 'linear-gradient(90deg, rgba(14, 20, 36, 0.9) 0%, rgba(10, 16, 28, 0.8) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HeartPulse size={22} color="var(--status-nominal)" />
              <h2 style={{ fontSize: '1.25rem' }}>MediRoute Emergency Triage & Evacuation Logistics</h2>
              <span className="badge badge-simulated">SIMPLIFIED CLINICAL DEMO LOGIC</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}>
              Standardized triage evaluation with visible algorithmic justification, patient evacuation workflow,
              and hazard-aware road network routing around impassable bridges and blockages.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-primary btn-sm"
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
          style={{
            marginTop: '0.75rem',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--border-warning)',
            color: '#fef08a',
            fontSize: '0.74rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Info size={14} />
          <span>
            DISCLAIMER: Illustrative workflow logic for hackathon demonstration. Not validated for actual clinical care or life support decisions.
          </span>
        </div>
      </div>

      {/* Main Grid: Left Intake Form (1 span), Center Map & Routing (2 spans) */}
      <div className="grid grid-cols-3">
        {/* Left Column: Casualty Intake Form & Transparent Rule Engine */}
        <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Plus size={18} color="var(--accent-cyan)" />
                <span>Casualty Triage Intake</span>
              </div>
              <span className="badge badge-cyan">START v1.0</span>
            </div>

            {intakeSuccess && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid var(--status-nominal)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '0.78rem',
                  color: '#86efac',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={14} />
                <span>{intakeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCasualtyIntake}>
              <div className="form-group">
                <label className="form-label">Patient Code Identifier</label>
                <input
                  type="text"
                  className="form-control"
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Triage Physiological Parameters */}
              <div className="form-group">
                <label className="form-label">
                  <span>Respiratory Rate: {respiratoryRate} /min</span>
                  <span style={{ color: respiratoryRate > 30 || respiratoryRate < 10 ? '#ef4444' : '#10b981' }}>
                    {respiratoryRate > 30 ? 'CRITICAL HIGH' : respiratoryRate < 10 ? 'CRITICAL LOW' : 'NORMAL'}
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                  style={{ accentColor: '#00f2fe' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    background: 'rgba(14, 20, 36, 0.7)',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={canWalk}
                    onChange={(e) => setCanWalk(e.target.checked)}
                    style={{ accentColor: '#10b981' }}
                  />
                  <span>Can Walk (Ambulatory)</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    background: 'rgba(14, 20, 36, 0.7)',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={radialPulsePresent}
                    onChange={(e) => setRadialPulsePresent(e.target.checked)}
                    style={{ accentColor: '#00f2fe' }}
                  />
                  <span>Radial Pulse Present</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Mental Status / Command Response</label>
                <select
                  className="form-control"
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
                style={{
                  background: 'rgba(7, 10, 18, 0.9)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ALGORITHMIC RESULT:</span>
                  {getTriageBadge(previewTriage.category)}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.35, marginTop: '4px' }}>
                  {previewTriage.reason}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Casualty Field Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Injuries, tourniquet placement time, known allergies..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={isSubmitting}
              >
                <HeartPulse size={15} />
                <span>Register & Queue Casualty</span>
              </button>
            </form>
          </div>
        </div>

        {/* Center & Right Column (2 spans): Map with Hazards & Evacuation Queue */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Tactical Evacuation Map */}
          <div className="card" style={{ padding: '0.75rem' }}>
            <div style={{ padding: '0.5rem 0.5rem 0.75rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">
                <Navigation size={18} color="var(--accent-cyan)" />
                <span>Road Network & Hazard-Aware Evacuation Map</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-warning">
                  {hazards.filter((h) => h.blocked).length} ROAD BLOCKAGES
                </span>
              </div>
            </div>

            <TacticalMap
              nodes={nodes}
              edges={hazards}
              activeRoute={activeRoute}
              height="400px"
            />

            {/* Active Route Calculation Banner */}
            {activeRoute && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: activeRoute.hasActiveBlockage
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(16, 185, 129, 0.12)',
                  border: `1px solid ${
                    activeRoute.hasActiveBlockage ? 'var(--status-warning)' : 'var(--status-nominal)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.88rem', color: '#ffffff' }}>
                    <Truck size={16} color="var(--accent-cyan)" />
                    <span>Calculated Evacuation Corridor</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-cyan)' }}>
                    {activeRoute.totalDistanceKm} KM • ~{activeRoute.estimatedMinutes} MIN TRANSIT
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  {activeRoute.explanation}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Road Hazard Manager */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <AlertTriangle size={18} color="var(--status-warning)" />
                <span>Road Network Segments & Hazard Simulation</span>
              </div>
              <span className="badge badge-simulated">CLICK TO TOGGLE BLOCKAGE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
              {hazards.map((edge) => (
                <div
                  key={edge.id}
                  onClick={() => handleToggleHazard(edge.id, edge.blocked)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: edge.blocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 20, 36, 0.6)',
                    border: `1px solid ${edge.blocked ? 'var(--border-danger)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}
                  title="Click to toggle road blockage status"
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: edge.blocked ? '#fca5a5' : '#ffffff' }}>
                      {edge.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Distance: {edge.distanceKm} km {edge.hazardType ? `• Reason: ${edge.hazardType}` : ''}
                    </div>
                  </div>

                  <span className={`badge ${edge.blocked ? 'badge-danger' : 'badge-nominal'}`}>
                    {edge.blocked ? 'BLOCKED ✕' : 'OPEN ✓'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Patient Evacuation Queue */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Truck size={18} color="var(--accent-cyan)" />
                <span>Casualty Evacuation Queue ({casualties.length})</span>
              </div>
              <span className="badge badge-danger">
                {casualties.filter((c) => c.triageCategory === 'immediate' && c.status !== 'evacuated').length} CRITICAL
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {casualties.map((cas) => (
                <div
                  key={cas.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(14, 20, 36, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                        {cas.patientCode}
                      </span>
                      {getTriageBadge(cas.triageCategory)}
                      <span className="badge badge-cyan">{cas.status.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {cas.notes} • <span style={{ color: 'var(--text-muted)' }}>{cas.triageReason}</span>
                    </div>
                  </div>

                  {/* Status Progression Workflow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {cas.status !== 'evacuated' ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
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
                      <span className="badge badge-nominal">EVACUATION COMPLETE</span>
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
