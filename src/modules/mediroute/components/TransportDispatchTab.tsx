import React, { useState } from 'react';
import {
  TransportUnit,
  EvacuationTask,
  MedicalFacility,
  ExtendedCasualtyRecord,
} from '../medirouteTypes';
import {
  Ambulance,
  Plane,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Check,
  XCircle,
  X,
} from 'lucide-react';

interface TransportDispatchTabProps {
  transportUnits: TransportUnit[];
  evacuationTasks: EvacuationTask[];
  facilities: MedicalFacility[];
  casualties: ExtendedCasualtyRecord[];
  onDispatchUnit: (
    transportUnitId: string,
    casualtyId: string,
    destinationFacilityId: string,
    routeDistanceKm: number,
    etaMinutes: number
  ) => void;
  onCompleteEvacuationTask: (taskId: string) => void;
  onCancelEvacuationTask: (taskId: string) => void;
}

export const TransportDispatchTab: React.FC<TransportDispatchTabProps> = ({
  transportUnits,
  evacuationTasks,
  facilities,
  casualties,
  onDispatchUnit,
  onCompleteEvacuationTask,
  onCancelEvacuationTask,
}) => {
  const [isCreatingDispatch, setIsCreatingDispatch] = useState(false);
  const [selectedCasualtyId, setSelectedCasualtyId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Casualties needing transport (unassigned or awaiting transit)
  const casualtiesNeedingTransport = casualties.filter(
    (c) =>
      c.status !== 'evacuated' &&
      !evacuationTasks.some((t) => t.casualtyId === c.id && (t.status === 'dispatched' || t.status === 'in_transit'))
  );

  // Available units
  const availableUnits = transportUnits.filter((u) => u.status === 'available');

  const startCreateDispatch = (preselectedCasualtyId?: string) => {
    const casualty = casualtiesNeedingTransport.find((c) => c.id === preselectedCasualtyId) || casualtiesNeedingTransport[0];
    setSelectedCasualtyId(casualty ? casualty.id : '');

    // Recommendation logic:
    // If casualty is Immediate, prefer Air Medevac if available
    let recommendedUnit: TransportUnit | undefined;
    if (casualty?.triageCategory === 'immediate') {
      recommendedUnit = availableUnits.find((u) => u.type === 'air_medevac') || availableUnits[0];
    } else {
      recommendedUnit = availableUnits.find((u) => u.type === 'ground_ambulance') || availableUnits[0];
    }
    setSelectedUnitId(recommendedUnit ? recommendedUnit.id : '');

    // Recommended facility with available capacity
    const recommendedFacility = facilities.find((f) => f.availableBeds > 0 && f.status !== 'full') || facilities[0];
    setSelectedFacilityId(recommendedFacility ? recommendedFacility.id : '');

    setDispatchError(null);
    setIsCreatingDispatch(true);
  };

  const handleConfirmDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCasualtyId || !selectedUnitId || !selectedFacilityId) {
      setDispatchError('All dispatch parameters (Casualty, Transport Unit, Destination) are required.');
      return;
    }

    const unit = transportUnits.find((u) => u.id === selectedUnitId);
    if (unit && unit.status !== 'available') {
      setDispatchError(`Unit ${unit.callsign} is not available (Current status: ${unit.status}).`);
      return;
    }

    const facility = facilities.find((f) => f.id === selectedFacilityId);
    if (facility && (facility.status === 'full' || facility.availableBeds <= 0)) {
      setDispatchError(`Destination facility ${facility.name} has no available bed capacity.`);
      return;
    }

    // Deterministic distance & ETA estimates
    const distanceKm = unit?.type === 'air_medevac' ? 5.2 : 6.8;
    const etaMin = unit?.type === 'air_medevac' ? 5 : 12;

    onDispatchUnit(selectedUnitId, selectedCasualtyId, selectedFacilityId, distanceKm, etaMin);
    setIsCreatingDispatch(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '10px 16px',
          background: 'var(--bg-card, #181d1a)',
          border: '1px solid var(--border-card, rgba(115, 138, 101, 0.20))',
          borderRadius: 'var(--radius-sm, 6px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Ambulance size={17} color="var(--accent-sage, #738a65)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-heading)' }}>
            Ground Ambulance & Air Evacuation Dispatch
          </span>
        </div>

        <button
          type="button"
          className="btn btn-sm"
          onClick={() => startCreateDispatch()}
          disabled={availableUnits.length === 0 || casualtiesNeedingTransport.length === 0}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            background: 'var(--accent-sage, #738a65)',
            color: '#000',
            border: 'none',
            opacity: availableUnits.length === 0 || casualtiesNeedingTransport.length === 0 ? 0.5 : 1,
            fontFamily: 'var(--font-mono)',
          }}
        >
          <Send size={13} />
          <span>Create Evac Dispatch</span>
        </button>
      </div>

      {/* Transport Fleet Status Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
        }}
      >
        {transportUnits.map((unit) => {
          const isAir = unit.type === 'air_medevac';
          const isAvail = unit.status === 'available';
          const isDispatched = unit.status === 'dispatched' || unit.status === 'in_transit';

          return (
            <div
              key={unit.id}
              style={{
                background: 'var(--bg-card, #181d1a)',
                border: isDispatched
                  ? '1px solid var(--accent-sage, #738a65)'
                  : isAvail
                  ? '1px solid var(--border-card, rgba(115, 138, 101, 0.20))'
                  : '1px solid var(--border-grid, rgba(115, 138, 101, 0.12))',
                borderRadius: 'var(--radius-sm, 6px)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isAir ? <Plane size={16} color="var(--accent-sage, #738a65)" /> : <Ambulance size={16} color="var(--status-safe, #588157)" />}
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-mono)' }}>
                      {unit.callsign}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-secondary, #94a192)' }}>
                      Station: {unit.stationName}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono)',
                    background: isAvail
                      ? 'rgba(88, 129, 87, 0.2)'
                      : isDispatched
                      ? 'rgba(115, 138, 101, 0.2)'
                      : 'rgba(200, 90, 83, 0.2)',
                    color: isAvail ? 'var(--status-safe, #588157)' : isDispatched ? 'var(--accent-sage, #738a65)' : 'var(--status-critical, #c85a53)',
                  }}
                >
                  {unit.status}
                </span>
              </div>

              {/* Assignment details if active */}
              {isDispatched && unit.assignedCasualtyId && (
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    background: 'var(--bg-elevated, #1f2622)',
                    border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.25))',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <div style={{ color: 'var(--text-primary, #e9ece9)', fontWeight: 600 }}>
                    Evacuation in Progress: {unit.assignedCasualtyId}
                  </div>
                  <div style={{ color: 'var(--text-secondary, #94a192)', marginTop: '2px' }}>
                    Dest: {unit.destinationFacilityId} &bull; ETA: {unit.etaMinutes} min ({unit.routeDistanceKm} km)
                  </div>
                </div>
              )}

              {/* Capabilities pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {unit.capabilities.map((cap) => (
                  <span
                    key={cap}
                    style={{
                      fontSize: '0.6rem',
                      padding: '2px 5px',
                      background: 'var(--bg-control, #161c18)',
                      borderRadius: '2px',
                      color: 'var(--text-muted, #667564)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Evacuation Tasks Table & Management */}
      <div
        style={{
          background: 'var(--bg-card, #181d1a)',
          border: '1px solid var(--border-card, rgba(115, 138, 101, 0.20))',
          borderRadius: 'var(--radius-sm, 6px)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-heading)' }}>
              Active Evacuation Operations & Missions ({evacuationTasks.length})
            </h3>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary, #94a192)', marginTop: '2px' }}>
              Coordinating casualty pickup, transit routes, and facility handover
            </div>
          </div>
        </div>

        {evacuationTasks.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted, #667564)' }}>
            No active evacuation tasks. Click "Create Evac Dispatch" to deploy an ambulance or rotorcraft.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))', color: 'var(--text-muted, #667564)', fontFamily: 'var(--font-mono)' }}>
                  <th style={{ padding: '10px 12px' }}>Task ID</th>
                  <th style={{ padding: '10px 12px' }}>Priority</th>
                  <th style={{ padding: '10px 12px' }}>Casualty</th>
                  <th style={{ padding: '10px 12px' }}>Transport Unit</th>
                  <th style={{ padding: '10px 12px' }}>Destination Facility</th>
                  <th style={{ padding: '10px 12px' }}>Route & ETA</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evacuationTasks.map((task) => (
                  <tr key={task.id} style={{ borderBottom: '1px solid rgba(115, 138, 101, 0.08)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary, #e9ece9)', fontWeight: 600 }}>
                      {task.id}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          textTransform: 'uppercase',
                          background:
                            task.priority === 'immediate'
                              ? 'rgba(200, 90, 83, 0.2)'
                              : 'rgba(212, 163, 115, 0.2)',
                          color: task.priority === 'immediate' ? 'var(--status-critical, #c85a53)' : 'var(--status-warning, #d4a373)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary, #e9ece9)' }}>
                      {task.casualtyId}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--accent-sage, #738a65)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {task.transportUnitId}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary, #e9ece9)' }}>
                      {task.destinationFacilityId}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                      {task.routeDistanceKm} km ({task.etaMinutes} min)
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: 'rgba(115, 138, 101, 0.15)',
                          color: 'var(--accent-sage, #738a65)',
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onCompleteEvacuationTask(task.id)}
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            background: 'rgba(88, 129, 87, 0.2)',
                            color: 'var(--status-safe, #588157)',
                            border: '1px solid rgba(88, 129, 87, 0.4)',
                            fontFamily: 'var(--font-mono)',
                          }}
                          title="Handover casualty to facility and free transport unit"
                        >
                          <Check size={11} style={{ marginRight: '3px' }} />
                          Handover
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onCancelEvacuationTask(task.id)}
                          style={{
                            fontSize: '0.65rem',
                            padding: '3px 8px',
                            background: 'rgba(200, 90, 83, 0.15)',
                            color: 'var(--status-critical, #c85a53)',
                            border: '1px solid rgba(200, 90, 83, 0.3)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Evacuation Dispatch Modal */}
      {isCreatingDispatch && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card, #181d1a)',
              border: '1px solid var(--accent-sage, #738a65)',
              borderRadius: 'var(--radius-sm, 6px)',
              padding: '20px',
              width: '100%',
              maxWidth: '480px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={16} color="var(--accent-sage, #738a65)" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-heading)' }}>
                  Create Evacuation Transport Mission
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setIsCreatingDispatch(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a192)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {dispatchError && (
              <div style={{ padding: '8px 10px', borderRadius: '4px', background: 'rgba(200, 90, 83, 0.15)', border: '1px solid rgba(200, 90, 83, 0.4)', fontSize: '0.7rem', color: 'var(--status-critical, #c85a53)' }}>
                {dispatchError}
              </div>
            )}

            <form onSubmit={handleConfirmDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary, #94a192)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                  1. Target Casualty
                </label>
                <select
                  value={selectedCasualtyId}
                  onChange={(e) => setSelectedCasualtyId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.78rem',
                    background: 'var(--bg-control, #161c18)',
                    border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))',
                    borderRadius: '4px',
                    color: 'var(--text-primary, #e9ece9)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {casualtiesNeedingTransport.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.patientCode || c.id} &bull; {c.triageCategory?.toUpperCase()} &bull; {c.location?.name || 'Field'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary, #94a192)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                  2. Transport Vehicle Unit (Ground / Air)
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.78rem',
                    background: 'var(--bg-control, #161c18)',
                    border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))',
                    borderRadius: '4px',
                    color: 'var(--text-primary, #e9ece9)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.callsign} &bull; {u.type === 'air_medevac' ? 'Air Rotorcraft' : 'Ground Ambulance'} &bull; {u.stationName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary, #94a192)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                  3. Destination Facility (Capacity Check)
                </label>
                <select
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.78rem',
                    background: 'var(--bg-control, #161c18)',
                    border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))',
                    borderRadius: '4px',
                    color: 'var(--text-primary, #e9ece9)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id} disabled={f.availableBeds === 0 || f.status === 'full'}>
                      {f.name} &bull; {f.availableBeds} beds free &bull; {f.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setIsCreatingDispatch(false)}
                  style={{ background: 'var(--bg-control, #161c18)', color: 'var(--text-secondary, #94a192)', border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm"
                  style={{ background: 'var(--accent-sage, #738a65)', color: '#000', fontWeight: 700, border: 'none', fontFamily: 'var(--font-mono)' }}
                >
                  Confirm Dispatch Mission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
