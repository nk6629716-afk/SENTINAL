import React, { useState, useMemo } from 'react';
import {
  IncidentReport,
  IncidentType,
  PriorityLevel,
  GeoLocation,
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
  Filter,
  Eye,
  X,
  RotateCcw,
  ShieldAlert,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '../../services/api/apiClient';

interface FieldLinkModuleProps {
  incidents: IncidentReport[];
  isOfflineMode: boolean;
  onRefreshIncidents: () => Promise<void>;
  onTriggerSync: () => Promise<void>;
  onResetDemo?: () => Promise<void>;
  isSyncing: boolean;
}

const PRESET_LOCATIONS: { name: string; lat: number; lng: number }[] = [
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
  onResetDemo,
  isSyncing,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IncidentType>('security_breach');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [notes, setNotes] = useState('');
  const [locationMode, setLocationMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [customLat, setCustomLat] = useState('34.0600');
  const [customLng, setCustomLng] = useState('-118.2450');
  const [customLocName, setCustomLocName] = useState('Sector Grid Checkpoint');

  // Inline Validation States
  const [titleError, setTitleError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Form Submission Status
  const [formBanner, setFormBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    clientId?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'priority'>('newest');

  // Inspect Modal State
  const [inspectingReport, setInspectingReport] = useState<IncidentReport | null>(null);

  const pendingCount = incidents.filter(
    (i) => i.syncStatus === 'pending' || i.syncStatus === 'failed'
  ).length;

  // Validation function
  const validateForm = (): boolean => {
    let isValid = true;

    if (!title.trim()) {
      setTitleError('Incident summary title is required.');
      isValid = false;
    } else if (title.trim().length < 3) {
      setTitleError('Title must be at least 3 characters.');
      isValid = false;
    } else if (title.trim().length > 120) {
      setTitleError('Title must not exceed 120 characters.');
      isValid = false;
    } else {
      setTitleError(null);
    }

    if (!notes.trim()) {
      setNotesError('Operational notes are required for tactical evaluation.');
      isValid = false;
    } else if (notes.trim().length < 5) {
      setNotesError('Operational notes must be at least 5 characters.');
      isValid = false;
    } else if (notes.trim().length > 1000) {
      setNotesError('Operational notes must not exceed 1000 characters.');
      isValid = false;
    } else {
      setNotesError(null);
    }

    if (locationMode === 'custom') {
      const latNum = parseFloat(customLat);
      const lngNum = parseFloat(customLng);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        setLocationError('Latitude must be a valid number between -90 and 90.');
        isValid = false;
      } else if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        setLocationError('Longitude must be a valid number between -180 and 180.');
        isValid = false;
      } else {
        setLocationError(null);
      }
    } else {
      setLocationError(null);
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormBanner(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      let finalLocation: GeoLocation;
      if (locationMode === 'preset') {
        const preset = PRESET_LOCATIONS[selectedPresetIdx];
        finalLocation = { name: preset.name, lat: preset.lat, lng: preset.lng };
      } else {
        finalLocation = {
          name: customLocName.trim() || 'Custom Field Coordinate',
          lat: parseFloat(customLat),
          lng: parseFloat(customLng),
        };
      }

      // Generate a stable client ID
      const stableClientId = `FL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const nowIso = new Date().toISOString();

      const newReport: IncidentReport = {
        id: stableClientId,
        clientId: stableClientId,
        sourceModule: 'fieldlink',
        type,
        priority,
        title: title.trim(),
        notes: notes.trim(),
        location: finalLocation,
        createdAt: nowIso,
        updatedAt: nowIso,
        status: isOfflineMode ? 'pending_sync' : 'active',
        syncStatus: isOfflineMode ? 'pending' : 'synced',
        syncAttempts: 0,
        isSimulated: true,
      };

      const result = await api.createIncident(newReport);
      await onRefreshIncidents();

      // Reset form on success
      setTitle('');
      setNotes('');
      setTitleError(null);
      setNotesError(null);
      setLocationError(null);

      setFormBanner({
        type: result.isServerSynced ? 'success' : 'info',
        message: result.message,
        clientId: stableClientId,
      });
    } catch (err: any) {
      setFormBanner({
        type: 'error',
        message: err.message || 'Failed to submit tactical incident report.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered & Sorted Incidents
  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((inc) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchTitle = inc.title.toLowerCase().includes(q);
          const matchNotes = inc.notes.toLowerCase().includes(q);
          const matchLoc = (inc.location.name || '').toLowerCase().includes(q);
          const matchId = (inc.clientId || inc.id).toLowerCase().includes(q);
          if (!matchTitle && !matchNotes && !matchLoc && !matchId) return false;
        }
        if (priorityFilter !== 'all' && inc.priority !== priorityFilter) return false;
        if (typeFilter !== 'all' && inc.type !== typeFilter) return false;
        if (syncFilter !== 'all') {
          if (syncFilter === 'pending' && inc.syncStatus !== 'pending' && inc.syncStatus !== 'failed') return false;
          if (syncFilter === 'synced' && inc.syncStatus !== 'synced') return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const weight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
          const diff = (weight[b.priority] || 0) - (weight[a.priority] || 0);
          if (diff !== 0) return diff;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [incidents, searchQuery, priorityFilter, typeFilter, syncFilter, sortBy]);

  const getPriorityBadgeClass = (p: PriorityLevel) => {
    switch (p) {
      case 'critical':
        return 'badge-neu-crit';
      case 'high':
        return 'badge-neu-warn';
      case 'medium':
        return 'badge-neu-info';
      case 'low':
      default:
        return 'badge-neu-neutral';
    }
  };

  const getSyncBadge = (status?: string) => {
    switch (status) {
      case 'synced':
        return (
          <span className="badge-neu badge-neu-ok" title="Synchronized with command server">
            <CheckCircle2 size={11} /> SYNCED
          </span>
        );
      case 'pending':
        return (
          <span className="badge-neu badge-neu-warn" title="Safely queued in local IndexedDB outbox">
            <Clock size={11} /> PENDING SYNC
          </span>
        );
      case 'failed':
        return (
          <span className="badge-neu badge-neu-crit" title="Sync attempt failed, queued for retry">
            <AlertTriangle size={11} /> SYNC FAILED
          </span>
        );
      default:
        return (
          <span className="badge-neu badge-neu-neutral">
            <Clock size={11} /> QUEUED
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Tactical Banner */}
      <div className="neu-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={20} color="var(--accent)" />
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                FieldLink Tactical Report Desk
              </div>
              <span className="badge-neu badge-neu-neutral">OFFLINE-FIRST STORE</span>
              <span className="badge-neu badge-neu-info">SYNTHETIC DEMO</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Local-first incident ingestion with IndexedDB outbox. Operates during connectivity loss and reconciles idempotently when online.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Status Pill */}
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                background: isOfflineMode ? 'var(--critical-bg)' : 'var(--healthy-bg)',
                border: `1px solid ${isOfflineMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: isOfflineMode ? 'var(--critical)' : 'var(--healthy)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isOfflineMode ? <WifiOff size={13} /> : <CheckCircle2 size={13} />}
              <span>{isOfflineMode ? 'Offline Outbox Active' : 'Online Link Ready'}</span>
            </div>

            {/* Sync Outbox Button */}
            <button
              className={`btn-neu btn-neu-sm ${pendingCount > 0 && !isOfflineMode ? 'btn-neu-primary' : ''}`}
              onClick={onTriggerSync}
              disabled={isSyncing || isOfflineMode || pendingCount === 0}
              title={
                isOfflineMode
                  ? 'Restore online connection to synchronize outbox'
                  : pendingCount === 0
                  ? 'All reports are synchronized'
                  : `Synchronize ${pendingCount} queued report(s)`
              }
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Synchronizing...' : `Sync Outbox (${pendingCount})`}</span>
            </button>

            {/* Optional Reset Demo Button */}
            {onResetDemo && (
              <button
                className="btn-neu btn-neu-sm"
                onClick={onResetDemo}
                title="Reset all demo data back to deterministic fixtures"
              >
                <RotateCcw size={12} />
                <span>Reset Demo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout: Form Composer (1 col) + Incident Feed (2 cols) */}
      <div className="grid grid-cols-3">
        {/* Left Column: Form Composer */}
        <div style={{ gridColumn: 'span 1' }}>
          <div className="neu-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                <FileText size={16} color="var(--accent)" />
                <span>New Incident Report</span>
              </div>
              <span className={`badge-neu ${isOfflineMode ? 'badge-neu-warn' : 'badge-neu-ok'}`}>
                {isOfflineMode ? 'Local Outbox' : 'Direct Broadcast'}
              </span>
            </div>

            {/* Submission Status Confirmation Banner */}
            {formBanner && (
              <div
                style={{
                  background:
                    formBanner.type === 'error'
                      ? 'var(--critical-bg)'
                      : formBanner.type === 'success'
                      ? 'var(--healthy-bg)'
                      : 'var(--informational-bg)',
                  border: `1px solid ${
                    formBanner.type === 'error'
                      ? 'rgba(239, 68, 68, 0.3)'
                      : formBanner.type === 'success'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : 'rgba(14, 165, 233, 0.3)'
                  }`,
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  fontSize: '0.78rem',
                  color:
                    formBanner.type === 'error'
                      ? 'var(--critical)'
                      : formBanner.type === 'success'
                      ? 'var(--healthy)'
                      : 'var(--informational)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                {formBanner.type === 'error' ? (
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>{formBanner.message}</div>
                  {formBanner.clientId && (
                    <div style={{ fontSize: '0.7rem', marginTop: '2px', opacity: 0.85, fontFamily: 'var(--font-mono)' }}>
                      Client Reference: {formBanner.clientId}
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Field: Classification Type */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Incident Classification *
                </label>
                <select
                  className="input-neu"
                  value={type}
                  onChange={(e) => setType(e.target.value as IncidentType)}
                >
                  <option value="security_breach">Security Breach / Perimeter Trip</option>
                  <option value="road_blockage">Road Blockage / Route Obstruction</option>
                  <option value="medical_evac">Medical Evacuation Request</option>
                  <option value="drone_incursion">Hostile UAV Incursion</option>
                  <option value="recon_anomaly">Reconnaissance Observation</option>
                  <option value="infrastructure_damage">Infrastructure / Bridge Damage</option>
                  <option value="communication_loss">Comms Jamming / Node Loss</option>
                </select>
              </div>

              {/* Field: Tactical Priority */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Tactical Priority *
                </label>
                <select
                  className="input-neu"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                >
                  <option value="critical">Critical (Immediate Evac / Threat)</option>
                  <option value="high">High (Urgent Response Needed)</option>
                  <option value="medium">Medium (Standard Operational Action)</option>
                  <option value="low">Low (Advisory Information)</option>
                </select>
              </div>

              {/* Field: Summary Title with Inline Validation */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Incident Summary Title *
                  </label>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: title.length > 120 ? 'var(--critical)' : 'var(--text-muted)' }}>
                    {title.length}/120
                  </span>
                </div>
                <input
                  type="text"
                  className="input-neu"
                  placeholder="e.g. Ground sensor trip near Checkpoint Alpha"
                  value={title}
                  maxLength={130}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError(null);
                  }}
                  style={{
                    borderColor: titleError ? 'var(--critical)' : undefined,
                  }}
                />
                {titleError && (
                  <div style={{ color: 'var(--critical)', fontSize: '0.7rem', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={11} /> {titleError}
                  </div>
                )}
              </div>

              {/* Field: Location Mode Selection */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Incident Location *
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.68rem',
                        color: locationMode === 'preset' ? 'var(--accent)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: locationMode === 'preset' ? 700 : 500,
                        textDecoration: locationMode === 'preset' ? 'underline' : 'none',
                      }}
                      onClick={() => setLocationMode('preset')}
                    >
                      Presets
                    </button>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>|</span>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '0.68rem',
                        color: locationMode === 'custom' ? 'var(--accent)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: locationMode === 'custom' ? 700 : 500,
                        textDecoration: locationMode === 'custom' ? 'underline' : 'none',
                      }}
                      onClick={() => setLocationMode('custom')}
                    >
                      Custom Coords
                    </button>
                  </div>
                </div>

                {locationMode === 'preset' ? (
                  <select
                    className="input-neu"
                    value={selectedPresetIdx}
                    onChange={(e) => setSelectedPresetIdx(Number(e.target.value))}
                  >
                    {PRESET_LOCATIONS.map((loc, idx) => (
                      <option key={idx} value={idx}>
                        {loc.name} [{loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}]
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="text"
                      className="input-neu"
                      placeholder="Sector / Point Name (e.g. Ridge Patrol 4)"
                      value={customLocName}
                      onChange={(e) => setCustomLocName(e.target.value)}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <input
                        type="number"
                        step="0.0001"
                        className="input-neu"
                        placeholder="Latitude (e.g. 34.0600)"
                        value={customLat}
                        onChange={(e) => {
                          setCustomLat(e.target.value);
                          if (locationError) setLocationError(null);
                        }}
                      />
                      <input
                        type="number"
                        step="0.0001"
                        className="input-neu"
                        placeholder="Longitude (e.g. -118.2450)"
                        value={customLng}
                        onChange={(e) => {
                          setCustomLng(e.target.value);
                          if (locationError) setLocationError(null);
                        }}
                      />
                    </div>
                    {locationError && (
                      <div style={{ color: 'var(--critical)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={11} /> {locationError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Field: Operational Notes with Inline Validation */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Operational Details & Notes *
                  </label>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: notes.length > 1000 ? 'var(--critical)' : 'var(--text-muted)' }}>
                    {notes.length}/1000
                  </span>
                </div>
                <textarea
                  className="input-neu"
                  rows={4}
                  placeholder="Enter detailed field observations, assets involved, or requested tactical support..."
                  value={notes}
                  maxLength={1050}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (notesError) setNotesError(null);
                  }}
                  style={{
                    borderColor: notesError ? 'var(--critical)' : undefined,
                    resize: 'vertical',
                  }}
                />
                {notesError && (
                  <div style={{ color: 'var(--critical)', fontSize: '0.7rem', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={11} /> {notesError}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-neu btn-neu-primary"
                style={{ width: '100%', padding: '10px' }}
                disabled={isSubmitting}
              >
                <Send size={14} />
                <span>{isSubmitting ? 'Recording Report...' : isOfflineMode ? 'Save to Local Outbox' : 'Broadcast Incident'}</span>
              </button>

              <div style={{ marginTop: '10px', fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                All reports generate stable client IDs for idempotent offline reconciliation.
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Incident Feed & Filters */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Bar Card */}
          <div className="neu-card" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Search Input */}
                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input-neu"
                    placeholder="Search by title, notes, coordinates, or client ID..."
                    style={{ paddingLeft: '32px', fontSize: '0.78rem' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '8px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Priority Filter */}
                <select
                  className="input-neu"
                  style={{ width: 'auto', fontSize: '0.78rem', minWidth: '130px' }}
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">Priority: All</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Sync Status Filter */}
                <select
                  className="input-neu"
                  style={{ width: 'auto', fontSize: '0.78rem', minWidth: '130px' }}
                  value={syncFilter}
                  onChange={(e) => setSyncFilter(e.target.value)}
                >
                  <option value="all">Sync: All</option>
                  <option value="pending">Pending Outbox</option>
                  <option value="synced">Synced</option>
                </select>

                {/* Sort Order */}
                <button
                  type="button"
                  className="btn-neu btn-neu-sm"
                  onClick={() => setSortBy(sortBy === 'newest' ? 'priority' : 'newest')}
                  title={`Currently sorted by: ${sortBy === 'newest' ? 'Newest first' : 'Highest priority first'}`}
                >
                  <ArrowUpDown size={12} />
                  <span>{sortBy === 'newest' ? 'Sort: Time' : 'Sort: Priority'}</span>
                </button>
              </div>

              {/* Filter summary counts */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <div>
                  Showing <strong>{filteredIncidents.length}</strong> of <strong>{incidents.length}</strong> incidents
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--warning)' }}>● {pendingCount} Pending Sync</span>
                  <span style={{ color: 'var(--healthy)' }}>● {incidents.length - pendingCount} Synced</span>
                </div>
              </div>
            </div>
          </div>

          {/* Incident Feed List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredIncidents.length === 0 ? (
              <div
                className="neu-card"
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                <Filter size={28} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  No Tactical Reports Match Filters
                </div>
                <p style={{ fontSize: '0.78rem', marginTop: '4px', color: 'var(--text-muted)' }}>
                  {searchQuery || priorityFilter !== 'all' || syncFilter !== 'all'
                    ? 'Try clearing the active search keyword or adjusting priority/sync filters.'
                    : 'No incidents recorded yet. Submit a new report using the composer on the left.'}
                </p>
                {(searchQuery || priorityFilter !== 'all' || syncFilter !== 'all') && (
                  <button
                    className="btn-neu btn-neu-sm"
                    style={{ marginTop: '12px' }}
                    onClick={() => {
                      setSearchQuery('');
                      setPriorityFilter('all');
                      setSyncFilter('all');
                    }}
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isPending = inc.syncStatus === 'pending' || inc.syncStatus === 'failed';
                return (
                  <div
                    key={inc.id || inc.clientId}
                    className="neu-card"
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      borderLeft: `4px solid ${
                        inc.priority === 'critical'
                          ? 'var(--critical)'
                          : inc.priority === 'high'
                          ? 'var(--warning)'
                          : 'var(--accent)'
                      }`,
                    }}
                    onClick={() => setInspectingReport(inc)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`badge-neu ${getPriorityBadgeClass(inc.priority)}`}>
                          {inc.priority.toUpperCase()}
                        </span>
                        <span className="badge-neu badge-neu-neutral" style={{ fontSize: '0.65rem' }}>
                          {inc.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {inc.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getSyncBadge(inc.syncStatus)}
                        <button
                          className="btn-neu btn-neu-sm"
                          style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingReport(inc);
                          }}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '10px' }}>
                      {inc.notes.length > 150 ? `${inc.notes.substring(0, 150)}...` : inc.notes}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="var(--accent)" />
                        <span>{inc.location.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          [{inc.location.lat.toFixed(3)}, {inc.location.lng.toFixed(3)}]
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          ID: {inc.clientId || inc.id}
                        </span>
                        <span>•</span>
                        <span>{new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Detailed Report Inspection Modal */}
      {inspectingReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setInspectingReport(null)}
        >
          <div
            className="neu-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--accent)" />
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Tactical Incident Record
                </div>
              </div>
              <button
                className="btn-neu btn-neu-sm"
                onClick={() => setInspectingReport(null)}
                style={{ padding: '4px 8px' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span className={`badge-neu ${getPriorityBadgeClass(inspectingReport.priority)}`}>
                {inspectingReport.priority.toUpperCase()} PRIORITY
              </span>
              <span className="badge-neu badge-neu-neutral">
                {inspectingReport.type.replace('_', ' ').toUpperCase()}
              </span>
              {getSyncBadge(inspectingReport.syncStatus)}
            </div>

            {/* Title */}
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              {inspectingReport.title}
            </div>

            {/* Full Notes */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Operational Field Observations
              </div>
              <div
                style={{
                  background: 'var(--surface-inset)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  border: '1px solid var(--border-subtle)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {inspectingReport.notes}
              </div>
            </div>

            {/* Location & Metadata Ledger */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.74rem',
                marginBottom: '18px',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Location Sector: </span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {inspectingReport.location.name}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Coordinates: </span>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '2px' }}>
                  {inspectingReport.location.lat.toFixed(4)}, {inspectingReport.location.lng.toFixed(4)}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Client Storage ID: </span>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginTop: '2px' }}>
                  {inspectingReport.clientId || inspectingReport.id}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Command Server ID: </span>
                <div style={{ fontFamily: 'var(--font-mono)', color: inspectingReport.id.startsWith('FL-') ? 'var(--warning)' : 'var(--healthy)', marginTop: '2px' }}>
                  {inspectingReport.id.startsWith('FL-') ? 'Unassigned (Local Outbox)' : inspectingReport.id}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Created Timestamp: </span>
                <div style={{ fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {new Date(inspectingReport.createdAt).toLocaleString()}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Storage Layer: </span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  IndexedDB Outbox Store
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn-neu"
                onClick={() => setInspectingReport(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
