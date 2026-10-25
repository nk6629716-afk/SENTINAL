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
  RefreshCw,
  Search,
  MapPin,
  FileText,
  WifiOff,
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
        id: isOfflineMode ? `LOCAL-${Date.now()}` : `INC-FL-${Math.floor(Math.random() * 9000 + 1000)}`,
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
        setFormSuccessMessage('Report saved locally in IndexedDB outbox. Queued for server sync upon reconnection.');
      } else {
        setFormSuccessMessage('Incident broadcasted and confirmed synchronized with command center.');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Banner Card */}
      <div className="neu-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={20} color="var(--accent)" />
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                FieldLink Tactical Report Desk
              </div>
              <span className="badge-neu badge-neu-neutral">OFFLINE-FIRST</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Local-first battlefield reports backed by IndexedDB. Zero-loss offline queue with idempotent server synchronization.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                background: isOfflineMode ? 'var(--critical-bg)' : 'var(--healthy-bg)',
                boxShadow: 'var(--shadow-inset-sm)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
              }}
            >
              {isOfflineMode ? '● Offline Mode Active' : '● Synchronized Online'}
            </div>

            <button
              className={`btn-neu btn-neu-sm ${pendingCount > 0 ? 'btn-neu-primary' : ''}`}
              onClick={onTriggerSync}
              disabled={isSyncing || isOfflineMode || pendingCount === 0}
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Reconciling...' : `Sync Outbox (${pendingCount})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Grid: Composer on Left, Incident Queue on Right */}
      <div className="grid grid-cols-3">
        {/* Left Column: Form Composer */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="neu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="var(--accent)" />
                <span>Submit Field Report</span>
              </div>
              <span className="badge-neu badge-neu-info">{isOfflineMode ? 'Local Outbox' : 'Direct Sync'}</span>
            </div>

            {formError && (
              <div
                style={{
                  background: 'var(--critical-bg)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  fontSize: '0.78rem',
                  color: 'var(--critical)',
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
                  background: 'var(--healthy-bg)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  fontSize: '0.78rem',
                  color: 'var(--healthy)',
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
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Incident Classification
                </label>
                <select
                  className="input-neu"
                  value={type}
                  onChange={(e) => setType(e.target.value as IncidentType)}
                >
                  <option value="security_breach">Security Breach / Perimeter Trip</option>
                  <option value="road_blockage">Road Blockage / Hazard</option>
                  <option value="medical_evac">Medical Evacuation Request</option>
                  <option value="drone_incursion">Hostile UAV Incursion</option>
                  <option value="recon_anomaly">Reconnaissance Observation</option>
                  <option value="infrastructure_damage">Infrastructure Damage</option>
                  <option value="communication_loss">Comms Jamming / Loss</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Tactical Priority
                </label>
                <select
                  className="input-neu"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                >
                  <option value="critical">Critical (Immediate Response)</option>
                  <option value="high">High (Urgent Threat)</option>
                  <option value="medium">Medium (Standard Priority)</option>
                  <option value="low">Low (Advisory Note)</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Incident Summary Title
                </label>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="e.g. Seismic sensor triggered at Sector Alpha"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Sector Location Coordinates
                </label>
                <select
                  className="input-neu"
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

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Operational Details & Notes
                </label>
                <textarea
                  className="input-neu"
                  rows={3}
                  placeholder="Enter detailed field observations, assets involved, or requested support..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-neu btn-neu-primary"
                style={{ width: '100%', padding: '10px' }}
                disabled={isSubmitting}
              >
                <Send size={14} />
                <span>{isSubmitting ? 'Recording...' : isOfflineMode ? 'Save Locally to Outbox' : 'Broadcast Report'}</span>
              </button>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center' }}>
                {isOfflineMode
                  ? 'Offline state: saved locally in browser IndexedDB.'
                  : 'Connected: verified synchronized with operations feed.'}
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Outbox & Record Queue */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="neu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                Incident Outbox & Feed ({filteredIncidents.length})
              </div>

              {/* Filters in recessed chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '160px', padding: '6px 10px', fontSize: '0.75rem' }}
                />

                <select
                  className="input-neu"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  style={{ width: '110px', padding: '6px 8px', fontSize: '0.72rem' }}
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  className="input-neu"
                  value={syncFilter}
                  onChange={(e) => setSyncFilter(e.target.value)}
                  style={{ width: '120px', padding: '6px 8px', fontSize: '0.72rem' }}
                >
                  <option value="all">All Sync States</option>
                  <option value="pending">Awaiting Sync</option>
                  <option value="synced">Synced Only</option>
                </select>
              </div>
            </div>

            {/* List */}
            {filteredIncidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                No incidents match the active search or filter criteria.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredIncidents.map((inc) => {
                  const isPending = inc.syncStatus === 'pending' || inc.syncStatus === 'failed';
                  return (
                    <div
                      key={inc.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-inset)',
                        boxShadow: 'var(--shadow-inset-sm)',
                        border: '1px solid rgba(210, 216, 225, 0.4)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className={`badge-neu ${
                              inc.priority === 'critical'
                                ? 'badge-neu-crit'
                                : inc.priority === 'high'
                                ? 'badge-neu-warn'
                                : 'badge-neu-info'
                            }`}
                          >
                            {inc.priority.toUpperCase()}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                            {inc.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isPending ? (
                            <span className="badge-neu badge-neu-warn">
                              <Clock size={11} />
                              AWAITING SYNC
                            </span>
                          ) : (
                            <span className="badge-neu badge-neu-ok">
                              <CheckCircle2 size={11} />
                              SYNCED
                            </span>
                          )}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {inc.id}
                          </span>
                        </div>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                        {inc.notes}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={12} color="var(--accent)" />
                          <span>{inc.location.name}</span>
                          <span>[{inc.location.lat.toFixed(3)}, {inc.location.lng.toFixed(3)}]</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)' }}>
                          {new Date(inc.createdAt).toLocaleTimeString()}
                        </div>
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
