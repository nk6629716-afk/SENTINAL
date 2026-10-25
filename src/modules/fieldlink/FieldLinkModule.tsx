import React, { useState } from 'react';
import {
  IncidentReport,
  IncidentType,
  PriorityLevel,
} from '@shared/types';
import {
  Play,
  Pause,
  Send,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { TacticalMap } from '../../components/TacticalMap';
import { api } from '../../services/api/apiClient';

interface FieldLinkModuleProps {
  incidents: IncidentReport[];
  isOfflineMode: boolean;
  onRefreshIncidents: () => Promise<void>;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
}

const PRESET_LOCATIONS = [
  { name: 'Bridge crossing (Sector 34)', lat: 34.0612, lng: -118.2433 },
  { name: 'Forward Outpost Alpha (Sector 4)', lat: 34.0522, lng: -118.2437 },
  { name: 'Bridge Segment 04-East (Highway 9)', lat: 34.0620, lng: -118.2310 },
  { name: 'Outpost Bravo (North Ridge)', lat: 34.0710, lng: -118.2580 },
  { name: 'Casualty Collection Point Delta', lat: 34.0720, lng: -118.2250 },
];

export const FieldLinkModule: React.FC<FieldLinkModuleProps> = ({
  incidents,
  isOfflineMode,
  onRefreshIncidents,
  onTriggerSync,
  isSyncing,
}) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('critical');
  const [selectedLocationIdx, setSelectedLocationIdx] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'channel' | 'outbox' | 'incidents'>('channel');
  const [chatMessage, setChatMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);

  const pendingIncidents = incidents.filter(
    (i) => i.syncStatus === 'pending' || i.syncStatus === 'failed'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const location = PRESET_LOCATIONS[selectedLocationIdx];
      const newReport: IncidentReport = {
        id: isOfflineMode ? `LOCAL-${Date.now()}` : `INC-${Math.floor(Math.random() * 900 + 100)}`,
        sourceModule: 'fieldlink',
        type: 'road_blockage',
        priority,
        title: title.trim(),
        notes: notes.trim() || 'Report submitted from field terminal.',
        location,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: isOfflineMode ? 'pending_sync' : 'active',
        isSimulated: true,
        clientId: `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        syncStatus: isOfflineMode ? 'pending' : 'synced',
      };

      await api.createIncident(newReport);
      await onRefreshIncidents();
      setTitle('');
      setNotes('');
    } catch (err: any) {
      console.error('Failed to submit report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryItem = async (incId: string) => {
    try {
      await onTriggerSync();
      await onRefreshIncidents();
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 48px)',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Left / Center Map Area */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, height: '100%' }}>
          <TacticalMap
            incidents={incidents}
            height="100%"
            showRadarSweep={false}
            initialMode="chart"
          />

          {/* Floating Top-Left Metrics Panel (Spec 03) */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '16px',
              zIndex: 20,
              background: 'var(--color-sheet)',
              border: 'var(--border-width, 1.2px) solid var(--color-edge)',
              boxShadow: 'var(--shadow-flat)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              padding: '8px 16px',
              gap: '24px',
              pointerEvents: 'auto',
            }}
          >
            <div>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                3
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Nodes online
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {pendingIncidents.length || 4}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Queued
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                380 ms
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Median delivery
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--color-line)', paddingLeft: '20px' }}>
              <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                2
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Average hops
              </div>
            </div>
          </div>

          {/* Floating New Incident Report Panel (Bottom-Left, Spec 03) */}
          <div
            style={{
              position: 'absolute',
              bottom: '36px',
              left: '16px',
              zIndex: 20,
              background: 'var(--color-sheet)',
              border: 'var(--border-width, 1.2px) solid var(--color-edge)',
              boxShadow: 'var(--shadow-flat)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              width: '260px',
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: '8px' }}>
              New incident report
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Title
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Bridge crossing blocked"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ padding: '5px 8px', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>
                  Priority
                </label>
                <div style={{ display: 'flex', border: '1px solid var(--color-edge)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {(['low', 'high', 'critical'] as PriorityLevel[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      style={{
                        flex: 1,
                        background: priority === p ? 'var(--color-strip)' : 'transparent',
                        color: priority === p ? '#FFFFFF' : 'var(--text-primary)',
                        border: 'none',
                        padding: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Location
                </label>
                <select
                  className="form-input"
                  value={selectedLocationIdx}
                  onChange={(e) => setSelectedLocationIdx(Number(e.target.value))}
                  style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                >
                  {PRESET_LOCATIONS.map((loc, idx) => (
                    <option key={idx} value={idx}>
                      {loc.lat.toFixed(4)} N, {Math.abs(loc.lng).toFixed(4)} W
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !title.trim()}
                style={{ marginTop: '4px', padding: '6px' }}
              >
                Save to outbox
              </button>
            </form>
          </div>
        </div>

        {/* Right Intel Pane: Channel, Link Quality & Outbox (Spec 03) */}
        <aside
          style={{
            width: '380px',
            minWidth: '380px',
            background: 'var(--color-sheet)',
            borderLeft: 'var(--border-width, 1.2px) solid var(--color-edge)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
            flexShrink: 0,
            padding: '12px 14px',
            gap: '12px',
          }}
          aria-label="Field reports pane"
        >
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: 'var(--border-width, 1.2px) solid var(--color-line)', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('channel')}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'channel' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                padding: '6px 8px',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                color: activeTab === 'channel' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Channel 4
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('outbox')}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'outbox' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                padding: '6px 8px',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                color: activeTab === 'outbox' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Outbox {pendingIncidents.length}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('incidents')}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'incidents' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                padding: '6px 8px',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                color: activeTab === 'incidents' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Incidents {incidents.length}
            </button>
          </div>

          {/* Team Transmission Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              {
                sender: 'Alpha',
                time: '14:31:52 UTC',
                text: 'Contact east of bridge, two vehicles.',
                status: 'Delivered, 380 ms',
                statusType: 'ok',
                path: 'Alpha, Bravo, Command',
              },
              {
                sender: 'Command',
                time: '14:32:01 UTC',
                text: 'Hold position. Medevac inbound.',
                status: 'Relayed at Bravo',
                statusType: 'info',
                path: 'Command, Bravo, Alpha',
              },
              {
                sender: 'Bravo',
                time: '14:32:10 UTC',
                text: 'Rally point RP-1 placed on the map.',
                status: 'Queued, retry in 8 s',
                statusType: 'warn',
                path: 'Bravo, Command',
              },
            ].map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  padding: '6px 8px',
                  background: 'var(--color-paper)',
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                    {msg.sender}
                  </span>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-primary)' }}>{msg.text}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>Path: {msg.path}</span>
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '1px',
                      border: `1px solid ${
                        msg.statusType === 'ok' ? 'var(--color-ok)' : msg.statusType === 'warn' ? 'var(--color-warn)' : 'var(--color-info)'
                      }`,
                      color:
                        msg.statusType === 'ok' ? 'var(--color-ok)' : msg.statusType === 'warn' ? 'var(--color-warn)' : 'var(--color-info)',
                    }}
                  >
                    {msg.status}
                  </span>
                </div>
              </div>
            ))}

            {/* Quick message input */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Message the team"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                style={{ padding: '5px 8px', fontSize: '0.78rem' }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setChatMessage('')}
                style={{ padding: '5px 12px' }}
              >
                Send
              </button>
            </div>
          </div>

          {/* Link Quality Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--color-line)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                Link quality
              </span>
              <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)' }}>
                Drag to drop packets
              </span>
            </div>

            {[
              { node: 'Alpha', pct: 92 },
              { node: 'Bravo', pct: 62 },
              { node: 'Command', pct: 100 },
            ].map((link) => (
              <div key={link.node} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-primary)', width: '60px' }}>{link.node}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue={link.pct}
                  style={{ flex: 1, accentColor: 'var(--color-strip)', height: '4px' }}
                />
                <span style={{ fontSize: '0.76rem', fontWeight: 700, width: '36px', textAlign: 'right' }}>
                  {link.pct}%
                </span>
              </div>
            ))}
          </div>

          {/* Outbox Pending Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--color-line)', paddingTop: '8px' }}>
            <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
              Outbox, {pendingIncidents.length || 3} pending
            </div>

            {[
              { id: '1', title: 'Bridge crossing blocked', status: 'Pending', statusType: 'warn' },
              { id: '2', title: 'Hazard H-2 reported', status: 'Pending', statusType: 'warn' },
              { id: '3', title: 'Contact C-3 marker', status: 'Failed', statusType: 'crit' },
            ].map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-paper)',
                }}
              >
                <span style={{ fontSize: '0.76rem', color: 'var(--text-primary)' }}>{item.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      border: `1px solid ${item.statusType === 'crit' ? 'var(--color-crit)' : 'var(--color-warn)'}`,
                      color: item.statusType === 'crit' ? 'var(--color-crit)' : 'var(--color-warn)',
                    }}
                  >
                    {item.status}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleRetryItem(item.id)}
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn btn-primary"
              onClick={onTriggerSync}
              disabled={isSyncing || isOfflineMode}
              style={{ marginTop: '6px', padding: '7px' }}
            >
              {isSyncing ? 'Syncing...' : 'Sync outbox'}
            </button>

            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2px' }}>
              Last sync 14:30:44 UTC, 2 sent, 0 conflicts. Newest record wins.
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Replay Bar (Spec 03) */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ width: '24px', height: '24px', minWidth: '24px', padding: 0 }}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          </button>

          <div style={{ display: 'flex', border: '1px solid var(--color-edge)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => setSimSpeed(speed)}
                style={{
                  background: simSpeed === speed ? 'var(--color-strip)' : 'transparent',
                  color: simSpeed === speed ? '#FFFFFF' : 'var(--text-primary)',
                  border: 'none',
                  padding: '1px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {speed}x
              </button>
            ))}
          </div>

          <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginLeft: '6px' }}>Replay</span>

          <div style={{ display: 'flex', alignItems: 'center', width: '320px', height: '8px', position: 'relative', margin: '0 12px' }}>
            <div style={{ width: '100%', height: '2px', background: 'var(--color-line)' }} />
            {[20, 40, 60, 80].map((pct, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  width: '2px',
                  height: '8px',
                  background: i === 1 ? 'var(--accent)' : 'var(--color-edge)',
                }}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                left: '40%',
                transform: 'translateX(-50%)',
                background: 'var(--color-strip)',
                color: '#FFFFFF',
                padding: '1px 4px',
                fontSize: '0.62rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                borderRadius: '1px',
                top: '-16px',
              }}
            >
              14:30:12
            </div>
          </div>
        </div>

        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Alpha to Command: contact east of bridge, 2 hops, 380 ms
        </div>
      </footer>
    </div>
  );
};
