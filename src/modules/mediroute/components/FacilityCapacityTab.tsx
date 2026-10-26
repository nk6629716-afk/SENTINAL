import React, { useState } from 'react';
import {
  MedicalFacility,
  ExtendedCasualtyRecord,
  FacilityType,
} from '../medirouteTypes';
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Users,
  Activity,
  ArrowRight,
  Plus,
  Minus,
  Edit,
  UserPlus,
  X,
} from 'lucide-react';

interface FacilityCapacityTabProps {
  facilities: MedicalFacility[];
  casualties: ExtendedCasualtyRecord[];
  onUpdateFacilityCapacity: (
    facilityId: string,
    totalBeds: number,
    availableBeds: number,
    surgicalAvailable: number
  ) => void;
  onAssignCasualtyToFacility?: (casualtyId: string, facilityId: string) => void;
}

export const FacilityCapacityTab: React.FC<FacilityCapacityTabProps> = ({
  facilities,
  casualties,
  onUpdateFacilityCapacity,
  onAssignCasualtyToFacility,
}) => {
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null);
  const [editTotalBeds, setEditTotalBeds] = useState<number>(0);
  const [editAvailableBeds, setEditAvailableBeds] = useState<number>(0);
  const [editSurgicalAvailable, setEditSurgicalAvailable] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Quick admission assignment modal
  const [admittingFacilityId, setAdmittingFacilityId] = useState<string | null>(null);
  const [selectedCasualtyForAdmission, setSelectedCasualtyForAdmission] = useState<string>('');

  const unassignedCasualties = casualties.filter(
    (c) => !c.assignedFacilityId && c.status !== 'evacuated'
  );

  const startEditFacility = (facility: MedicalFacility) => {
    setEditingFacilityId(facility.id);
    setEditTotalBeds(facility.totalBeds);
    setEditAvailableBeds(facility.availableBeds);
    setEditSurgicalAvailable(facility.surgicalAvailable);
    setValidationError(null);
  };

  const handleSaveFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFacilityId) return;

    if (editTotalBeds < 0 || editAvailableBeds < 0 || editSurgicalAvailable < 0) {
      setValidationError('Capacities cannot be negative.');
      return;
    }

    if (editAvailableBeds > editTotalBeds) {
      setValidationError('Available beds cannot exceed total bed capacity.');
      return;
    }

    onUpdateFacilityCapacity(
      editingFacilityId,
      editTotalBeds,
      editAvailableBeds,
      editSurgicalAvailable
    );
    setEditingFacilityId(null);
  };

  const handleConfirmAdmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!admittingFacilityId || !selectedCasualtyForAdmission) return;

    if (onAssignCasualtyToFacility) {
      onAssignCasualtyToFacility(selectedCasualtyForAdmission, admittingFacilityId);
    }
    setAdmittingFacilityId(null);
    setSelectedCasualtyForAdmission('');
  };

  // Facility recommendation helper
  const recommendFacility = (needsSurgery: boolean) => {
    const candidate = facilities
      .filter((f) => f.status !== 'full' && f.status !== 'unavailable' && f.availableBeds > 0)
      .sort((a, b) => {
        if (needsSurgery) {
          return b.surgicalAvailable - a.surgicalAvailable;
        }
        return b.availableBeds - a.availableBeds;
      });
    return candidate[0] || null;
  };

  const recommendedGeneral = recommendFacility(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Tactical Recommendation Bar */}
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
          <Building2 size={17} color="var(--accent-sage, #738a65)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-heading)' }}>
            Medical Facilities & Resource Allocation
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--text-secondary, #94a192)' }}>Recommended Destination: </span>
          <strong style={{ color: recommendedGeneral ? 'var(--accent-sage, #738a65)' : 'var(--status-critical, #c85a53)' }}>
            {recommendedGeneral ? recommendedGeneral.name : 'ALL FACILITIES FULL'}
          </strong>
        </div>
      </div>

      {/* Facilities Grid: 4 Dedicated Facility Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        {facilities.map((fac) => {
          const occupancyRate = fac.totalBeds > 0 ? Math.round(((fac.totalBeds - fac.availableBeds) / fac.totalBeds) * 100) : 100;
          const isFull = fac.availableBeds === 0 || fac.status === 'full';

          return (
            <div
              key={fac.id}
              style={{
                background: 'var(--bg-card, #181d1a)',
                border: isFull ? '1px solid rgba(200, 90, 83, 0.4)' : '1px solid var(--border-card, rgba(115, 138, 101, 0.20))',
                borderRadius: 'var(--radius-sm, 6px)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.15s',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: 'rgba(115, 138, 101, 0.15)',
                      color: 'var(--accent-sage, #738a65)',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {fac.type}
                  </span>
                  <h3 style={{ margin: '6px 0 2px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-heading)' }}>
                    {fac.name}
                  </h3>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary, #94a192)' }}>
                    {fac.location.name}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono)',
                    background:
                      fac.status === 'available'
                        ? 'rgba(88, 129, 87, 0.2)'
                        : fac.status === 'limited'
                        ? 'rgba(212, 163, 115, 0.2)'
                        : 'rgba(200, 90, 83, 0.2)',
                    color:
                      fac.status === 'available'
                        ? 'var(--status-safe, #588157)'
                        : fac.status === 'limited'
                        ? 'var(--status-warning, #d4a373)'
                        : 'var(--status-critical, #c85a53)',
                  }}
                >
                  {fac.status}
                </span>
              </div>

              {/* Occupancy Progress Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-secondary, #94a192)' }}>Bed Occupancy</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary, #e9ece9)' }}>
                    {fac.totalBeds - fac.availableBeds} / {fac.totalBeds} ({occupancyRate}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${occupancyRate}%`,
                      height: '100%',
                      background: occupancyRate >= 90 ? 'var(--status-critical, #c85a53)' : occupancyRate >= 70 ? 'var(--status-warning, #d4a373)' : 'var(--status-safe, #588157)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Key Metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px',
                  background: 'var(--bg-elevated, #1f2622)',
                  border: '1px solid var(--border-grid, rgba(115, 138, 101, 0.12))',
                  borderRadius: '4px',
                  padding: '8px 10px',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted, #667564)', display: 'block' }}>Available Beds</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: fac.availableBeds === 0 ? 'var(--status-critical, #c85a53)' : 'var(--text-primary, #e9ece9)' }}>
                    {fac.availableBeds}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted, #667564)', display: 'block' }}>Surgical Suites</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #e9ece9)' }}>
                    {fac.surgicalAvailable} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted, #667564)' }}>/ {fac.surgicalCapacity}</span>
                  </span>
                </div>
              </div>

              {/* Assigned Casualties */}
              <div>
                <div style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--text-muted, #667564)', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                  Assigned Casualties ({fac.assignedCasualtyIds.length})
                </div>
                {fac.assignedCasualtyIds.length === 0 ? (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #667564)' }}>No active patient assignments</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {fac.assignedCasualtyIds.map((cid) => (
                      <span
                        key={cid}
                        style={{
                          fontSize: '0.66rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 5px',
                          background: 'rgba(115, 138, 101, 0.15)',
                          border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.25))',
                          borderRadius: '3px',
                          color: 'var(--accent-sage, #738a65)',
                        }}
                      >
                        {cid}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => startEditFacility(fac)}
                  style={{
                    flex: 1,
                    fontSize: '0.7rem',
                    padding: '5px 8px',
                    background: 'var(--bg-control, #161c18)',
                    color: 'var(--text-secondary, #94a192)',
                    border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <Edit size={11} />
                  <span>Update Capacity</span>
                </button>

                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={isFull}
                  onClick={() => {
                    setAdmittingFacilityId(fac.id);
                    setSelectedCasualtyForAdmission(unassignedCasualties[0]?.id || '');
                  }}
                  style={{
                    flex: 1,
                    fontSize: '0.7rem',
                    padding: '5px 8px',
                    background: isFull ? 'rgba(255, 255, 255, 0.04)' : 'rgba(115, 138, 101, 0.18)',
                    color: isFull ? 'var(--text-muted, #667564)' : 'var(--accent-sage, #738a65)',
                    border: isFull ? '1px solid transparent' : '1px solid var(--border-tactical, rgba(115, 138, 101, 0.35))',
                    cursor: isFull ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <UserPlus size={11} />
                  <span>Admit Patient</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Capacity Modal */}
      {editingFacilityId && (
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
              maxWidth: '440px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} color="var(--accent-sage, #738a65)" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-heading)' }}>
                  Update Facility Capacity
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setEditingFacilityId(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a192)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {validationError && (
              <div style={{ padding: '8px 10px', borderRadius: '4px', background: 'rgba(200, 90, 83, 0.15)', border: '1px solid rgba(200, 90, 83, 0.4)', fontSize: '0.7rem', color: 'var(--status-critical, #c85a53)' }}>
                {validationError}
              </div>
            )}

            <form onSubmit={handleSaveFacility} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary, #94a192)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                  Total Bed Quota
                </label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={editTotalBeds}
                  onChange={(e) => setEditTotalBeds(Number(e.target.value))}
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
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary, #94a192)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                  Available Unoccupied Beds
                </label>
                <input
                  type="number"
                  min="0"
                  max={editTotalBeds}
                  value={editAvailableBeds}
                  onChange={(e) => setEditAvailableBeds(Number(e.target.value))}
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
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary, #94a192)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                  Available Surgical Suites
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={editSurgicalAvailable}
                  onChange={(e) => setEditSurgicalAvailable(Number(e.target.value))}
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
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setEditingFacilityId(null)}
                  style={{ background: 'var(--bg-control, #161c18)', color: 'var(--text-secondary, #94a192)', border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-sm"
                  style={{ background: 'var(--accent-sage, #738a65)', color: '#000', fontWeight: 700, border: 'none', fontFamily: 'var(--font-mono)' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admit Patient Modal */}
      {admittingFacilityId && (
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
              maxWidth: '440px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={16} color="var(--accent-sage, #738a65)" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary, #e9ece9)', fontFamily: 'var(--font-heading)' }}>
                  Assign & Admit Casualty
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setAdmittingFacilityId(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #94a192)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmAdmission} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary, #94a192)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                  Select Casualty for Admission
                </label>
                {unassignedCasualties.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #667564)', padding: '8px', background: 'var(--bg-elevated, #1f2622)', borderRadius: '4px' }}>
                    All casualties already assigned to medical facilities.
                  </div>
                ) : (
                  <select
                    value={selectedCasualtyForAdmission}
                    onChange={(e) => setSelectedCasualtyForAdmission(e.target.value)}
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
                    {unassignedCasualties.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.patientCode || c.id} &bull; {c.triageCategory?.toUpperCase()} &bull; {c.notes || 'In transit'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setAdmittingFacilityId(null)}
                  style={{ background: 'var(--bg-control, #161c18)', color: 'var(--text-secondary, #94a192)', border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={unassignedCasualties.length === 0}
                  className="btn btn-sm"
                  style={{ background: 'var(--accent-sage, #738a65)', color: '#000', fontWeight: 700, border: 'none', fontFamily: 'var(--font-mono)' }}
                >
                  Confirm Admission (-1 Bed)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
