import React, { useState } from 'react';
import {
  IncidentReport,
  IncidentType,
  PriorityLevel,
} from '@shared/types';
import {
  Radio,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
  Search,
  WifiOff,
  MapPin,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api/apiClient';

interface FieldLinkModuleProps {
  incidents: IncidentReport[];
  isOfflineMode: boolean;
  onRefreshIncidents: () => Promise<void>;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
}

const PRESET_LOCATIONS = [
  { name: 'Forward Outpost Alpha (Sector 4)', lat: 34.0522, lng: -118.2437 },
  { name: 'Bridge Segment 04-East (Highway 9)', lat: 34.0620, lng: -118.2310 },
  { name: 'Outpost Bravo (North Ridge)', lat: 34.0710, lng: -118.2580 },
  { name: 'Logistics Depot Echo (Sector 9)', lat: 34.0410, lng: -118.2690 },
  { name: 'Casualty Collection Point Delta', lat: 34.0720, lng: -118.2250 },
];

export const FieldLinkModule: React.FC<FieldLinkModuleProps> = ({
  incidents,
  isOfflineMode,
  onRefreshIncidents,
  onTriggerSync,
  isSyncing,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IncidentType>('security_breach');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [notes, setNotes] = useState('');
  const [selectedLocationIdx, setSelectedLocationIdx] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<string>('all');

  const pendingCount = incidents.filter(
    (i) => i.syncStatus === 'pending' || i.syncStatus === 'failed'
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccessMessage(null);

    if (!title.trim()) {
      setFormError('Please enter an incident summary title.');
      return;
    }
    if (!notes.trim()) {
      setFormError('Operational details/notes are required for tactical clarity.');
      return;
    }

    setIsSubmitting(true);
    try {
      const location = PRESET_LOCATIONS[selectedLocationIdx];
      const newReport: IncidentReport = {
        id: isOfflineMode ? `OFFLINE-${Date.now()}` : `INC-FL-${Math.floor(Math.random() * 9000 + 1000)}`,
        sourceModule: 'fieldlink',
        type,
        priority,
        title: title.trim(),
        notes: notes.trim(),
        location,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: isOfflineMode ? 'pending_sync' : 'active',
        isSimulated: true,
        clientId: `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        syncStatus: isOfflineMode ? 'pending' : 'synced',
      };

      await api.createIncident(newReport);
      await onRefreshIncidents();

      setTitle('');
      setNotes('');
      if (isOfflineMode) {
        setFormSuccessMessage('Report saved locally to IndexedDB. Queued for server sync once connectivity is restored.');
      } else {
        setFormSuccessMessage('Incident broadcasted and synchronized with Tactical Command.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit tactical report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchNotes = inc.notes.toLowerCase().includes(q);
      const matchLoc = inc.location.name.toLowerCase().includes(q);
      if (!matchTitle && !matchNotes && !matchLoc) return false;
    }
    if (priorityFilter !== 'all' && inc.priority !== priorityFilter) return false;
    if (syncFilter !== 'all') {
      if (syncFilter === 'pending' && inc.syncStatus !== 'pending' && inc.syncStatus !== 'failed') return false;
      if (syncFilter === 'synced' && inc.syncStatus !== 'synced') return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Top Banner & Module Explainer */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          borderLeft: '4px solid var(--accent-cyan)',
          background: 'linear-gradient(90deg, rgba(14, 20, 36, 0.9) 0%, rgba(10, 16, 28, 0.8) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={22} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.25rem' }}>FieldLink Tactical Reporting & Battlefield Awareness</h2>
              <span className="badge badge-simulated">SIMULATED PROTOCOL</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.85rem' }}>
              Offline-first communication channel. Enables personnel to submit incident telemetry without network connectivity.
              Reports persist in browser IndexedDB with deterministic deduplication on sync.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: isOfflineMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${isOfflineMode ? 'var(--status-danger)' : 'var(--status-nominal)'}`,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`beacon ${isOfflineMode ? 'beacon-danger' : 'beacon-nominal'}`} />
                <span style={{ fontWeight: 700, color: isOfflineMode ? '#fca5a5' : '#86efac' }}>
                  {isOfflineMode ? 'LINK SEVERED (OFFLINE)' : 'LINK SYNCHRONIZED'}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '2px' }}>
                Pending in Outbox: {pendingCount}
              </div>
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={onTriggerSync}
              disabled={isSyncing || isOfflineMode || pendingCount === 0}
              title="Submit queued outbox to backend"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Reconciling...' : `Sync Queue (${pendingCount})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Form on Left, Incidents Feed on Right */}
      <div className="grid grid-cols-3">
        {/* Left Column: Tactical Incident Intake Form */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <FileText size={18} color="var(--accent-cyan)" />
                <span>Submit Field Incident</span>
              </div>
              <span className="badge badge-cyan">{isOfflineMode ? 'Local Cache' : 'Direct Dispatch'}</span>
            </div>

            {formError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--border-danger)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccessMessage && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                  color: '#86efac',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={15} />
                <span>{formSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Incident Classification</label>
                <select
                  className="form-control"
                  value={type}
                  onChange={(e) => setType(e.target.value as IncidentType)}
                >
                  <option value="security_breach">Security Breach / Perimeter Trip</option>
                  <option value="road_blockage">Road Blockage / Hazard</option>
                  <option value="medical_evac">Medical Evacuation Request</option>
                  <option value="drone_incursion">Hostile UAV / Airspace Incursion</option>
                  <option value="recon_anomaly">Reconnaissance Observation</option>
                  <option value="infrastructure_damage">Infrastructure Damage</option>
                  <option value="communication_loss">Comms Jamming / Loss</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tactical Priority</label>
                <select
                  className="form-control"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                >
                  <option value="critical">CRITICAL (Immediate Action)</option>
                  <option value="high">HIGH (Urgent Threat)</option>
                  <option value="medium">MEDIUM (Standard Priority)</option>
                  <option value="low">LOW (Advisory / Observation)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Incident Summary</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Hostile scout squad spotted near perimeter"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sector Location Coordinates</label>
                <select
                  className="form-control"
                  value={selectedLocationIdx}
                  onChange={(e) => setSelectedLocationIdx(Number(e.target.value))}
                >
                  {PRESET_LOCATIONS.map((loc, idx) => (
                    <option key={idx} value={idx}>
                      {loc.name} [{loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Operational Notes & Details</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Enter detailed observations, assets involved, or support requested..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={isSubmitting}
              >
                <Send size={15} />
                <span>{isSubmitting ? 'Recording...' : isOfflineMode ? 'Save Locally to Outbox' : 'Broadcast Report'}</span>
              </button>

              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.75rem',
                  textAlign: 'center',
                }}
              >
                {isOfflineMode
                  ? '🔒 Offline Mode: Record will be stored in IndexedDB and marked PENDING SYNC.'
                  : '📡 Online Mode: Record synchronized directly with central feed.'}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Tactical Incident Feed & Outbox */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Radio size={18} color="var(--accent-cyan)" />
                <span>Active Incident Log ({filteredIncidents.length})</span>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={13}
                    style={{ position: 'absolute', left: '8px', top: '9px', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search incident logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '26px', fontSize: '0.75rem', height: '30px', width: '160px' }}
                  />
                </div>

                <select
                  className="form-control"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  style={{ fontSize: '0.75rem', height: '30px', width: '110px', padding: '0 6px' }}
                >
                  <option value="all">All Priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  className="form-control"
                  value={syncFilter}
                  onChange={(e) => setSyncFilter(e.target.value)}
                  style={{ fontSize: '0.75rem', height: '30px', width: '110px', padding: '0 6px' }}
                >
                  <option value="all">All Sync</option>
                  <option value="pending">Pending Outbox</option>
                  <option value="synced">Synced Only</option>
                </select>
              </div>
            </div>

            {/* Incident Cards List */}
            {filteredIncidents.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Radio size={36} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No incident reports matching filters</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  Submit a new report from the left panel or clear your filter criteria.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredIncidents.map((inc) => {
                  const isPending = inc.syncStatus === 'pending' || inc.syncStatus === 'failed';
                  return (
                    <div
                      key={inc.id}
                      style={{
                        padding: '1rem',
                        background: isPending ? 'rgba(245, 158, 11, 0.05)' : 'rgba(14, 20, 36, 0.7)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${
                          isPending ? 'var(--border-warning)' : 'var(--border-subtle)'
                        }`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className={`badge ${
                              inc.priority === 'critical'
                                ? 'badge-danger'
                                : inc.priority === 'high'
                                ? 'badge-warning'
                                : 'badge-cyan'
                            }`}
                          >
                            {inc.priority.toUpperCase()}
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.95rem',
                              color: '#ffffff',
                            }}
                          >
                            {inc.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isPending ? (
                            <span
                              className="badge badge-warning"
                              title="Saved locally in IndexedDB, awaiting sync"
                            >
                              <Clock size={12} />
                              AWAITING SYNC
                            </span>
                          ) : (
                            <span className="badge badge-nominal" title="Confirmed synchronized">
                              <CheckCircle2 size={12} />
                              SYNCED
                            </span>
                          )}
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.72rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {inc.id}
                          </span>
                        </div>
                      </div>

                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '8px' }}>
                        {inc.notes}
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} color="var(--accent-cyan)" />
                          <span>{inc.location.name}</span>
                          <span>({inc.location.lat.toFixed(3)}, {inc.location.lng.toFixed(3)})</span>
                        </div>
                        <div>{new Date(inc.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
