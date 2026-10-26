import React, { useState } from 'react';
import {
  Activity,
  Shield,
  Radio,
  Crosshair,
  Terminal,
  ChevronRight,
  TrendingUp,
  Star,
  Box,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Download,
  Lock,
} from 'lucide-react';
import { DashboardSummary } from '@shared/types';
import { createWavefrontRipple } from '../utils/motion';

interface TacticalBentoGridProps {
  summary: DashboardSummary;
  tracksCount: number;
  alertsCount: number;
  incidentsCount: number;
  onNavigateModule: (module: 'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute') => void;
}

interface DirectiveTask {
  id: string;
  title: string;
  completed: boolean;
  code: string;
  sector: string;
}

export const TacticalBentoGrid: React.FC<TacticalBentoGridProps> = ({
  summary,
  tracksCount,
  alertsCount,
  incidentsCount,
  onNavigateModule,
}) => {
  // Interactive Modal State
  const [modalNotice, setModalNotice] = useState<string | null>(null);

  // Tactical Mobile Comms / Comms Phone State
  const [commsPhone, setCommsPhone] = useState<string>('+1 (555) 019-2834');
  const [isTypingFlash, setIsTypingFlash] = useState<boolean>(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommsPhone(e.target.value);
    setIsTypingFlash(true);
    setTimeout(() => setIsTypingFlash(false), 220);
  };

  const handlePhoneAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalNotice(
      `TACTICAL COMMS LINK INITIALIZED: Terminal frequency [${commsPhone}] authenticated over secure satellite uplink with zero packet leakage.`
    );
  };

  // Interactive Directives State
  const [tasks, setTasks] = useState<DirectiveTask[]>([
    { id: 't1', title: 'INITIALIZE PROFILE & CRYPTO-KEY', completed: true, code: 'AUTH-01', sector: 'FIELD-HQ' },
    { id: 't2', title: 'Establish Orbital Uplink', completed: false, code: 'LINK-01', sector: 'ORBITAL-7' },
    { id: 't3', title: 'Calibrate Gravimetric Array', completed: false, code: 'GRAV-4B', sector: 'OMEGA-Z' },
    { id: 't4', title: 'Sync Unit Biometrics', completed: false, code: 'BIO-99', sector: 'FIELD-HQ' },
  ]);

  // Hover state for Bar Chart
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Bar chart telemetry data (JUL 06 - JUL 24)
  const anomalyData = [
    { label: 'Jul 06', val: 0.40, code: '0.40%' },
    { label: 'Jul 08', val: 0.45, code: '0.45%' },
    { label: 'Jul 10', val: 0.50, code: '0.50%' },
    { label: 'Jul 12', val: 0.65, code: '0.65%' },
    { label: 'Jul 14', val: 0.85, code: '0.85%' },
    { label: 'Jul 16', val: 0.95, code: '0.95%' },
    { label: 'Jul 18', val: 0.70, code: '0.70%' },
    { label: 'Jul 20', val: 0.55, code: '0.55%' },
    { label: 'Jul 22', val: 0.50, code: '0.50%' },
    { label: 'Jul 24', val: 0.75, code: '0.75%' },
  ];

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextState = !t.completed;
          setModalNotice(
            nextState
              ? `Directive [${t.code}] "${t.title}" verified and marked COMPLETE.`
              : `Directive [${t.code}] "${t.title}" status reset to PENDING calibration.`
          );
          return { ...t, completed: nextState };
        }
        return t;
      })
    );
  };

  const handleRunDiagnostics = () => {
    setModalNotice(
      `SYS_DIAGNOSTICS NOMINAL: Telemetry stream online. ${tracksCount} active radar tracks, ${alertsCount} geofence alerts, ${incidentsCount} field outbox reports. All tactical modules operating under authentic defense parameters.`
    );
  };

  const handleDeployPod = () => {
    setModalNotice(
      'ANTIGRAVITY POD MODULE v2.4 INITIALIZED: Autonomous supply pod allocated to Operational Sector OMEGA-ZETA. Uplink telemetry verified at 100% signal strength.'
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div
      className="tactical-grid-bg tactical-scanlines"
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '20px 24px 32px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* 1. Tactical Sub-Header & Telemetry Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          background: 'rgba(24, 29, 26, 0.85)',
          border: '1px solid rgba(115, 138, 101, 0.20)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-flat)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(91, 112, 80, 0.20)',
              border: '1px solid rgba(115, 138, 101, 0.40)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-sage, #738a65)',
            }}
          >
            <Crosshair size={18} className="dot-glowing-green" style={{ background: 'transparent' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: 'var(--text-primary, #e9ece9)',
                }}
              >
                ANTIGRAVITY // OP-DASH_04
              </span>
              <span className="tactical-badge tactical-badge-online">
                <span className="dot-glowing-green" />
                SYS_ONLINE
              </span>
              <span className="tactical-badge tactical-badge-secure">SECURE LINK</span>
            </div>
            <div
              className="meta-coord"
              style={{ fontSize: '0.66rem', marginTop: '3px', color: 'var(--text-secondary, #94a192)' }}
            >
              SECTOR: OMEGA-ZETA // COORDINATES: 28.6139° N, 77.2090° E // ALT: 216M MSL
            </div>
          </div>
        </div>

        {/* Right Header Quick Stats & Diagnostics Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#121614',
              border: '1px solid rgba(115, 138, 101, 0.20)',
              padding: '5px 12px',
              borderRadius: '6px',
            }}
          >
            <span className="dot-glowing-green" />
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              SYSTEM SYNC:
            </span>
            <span
              style={{
                fontSize: '0.70rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--accent-sage, #738a65)',
              }}
            >
              100% NOMINAL
            </span>
          </div>

          <button
            type="button"
            className="btn-tactical btn-tactical-primary"
            onClick={(e) => {
              createWavefrontRipple(e);
              setModalNotice(
                'TACTICAL AUTHENTICATION VERIFIED: Biometric cryptographic token valid. Clearance level: TOP SECRET // COMMAND OMEGA-ZETA authority granted.'
              );
            }}
            style={{ padding: '6px 14px' }}
            title="Authenticate tactical command credentials"
          >
            <Shield size={13} />
            <span>AUTHENTICATE</span>
            <span className="tactical-arrow">→</span>
          </button>

          <button
            type="button"
            className="btn-tactical btn-tactical-olive"
            onClick={(e) => {
              createWavefrontRipple(e);
              handleRunDiagnostics();
            }}
            style={{ padding: '6px 14px' }}
          >
            <Terminal size={13} />
            <span>DIAGNOSTICS</span>
          </button>

          <button
            type="button"
            className="btn-tactical"
            onClick={(e) => {
              createWavefrontRipple(e);
              setModalNotice(
                'TACTICAL CLIENT INSTALLED: Offline mission package cached locally in IndexedDB and Service Worker cache storage.'
              );
            }}
            style={{ padding: '6px 12px' }}
            title="Install offline tactical client"
          >
            <Download size={13} />
            <span>Install</span>
          </button>
        </div>
      </div>

      {/* 2. Tactical Uplink Status & Authenticated Comms Phone Pill Field (Exact 1:1 footprint) */}
      <div className="tactical-uplink-bar">
        {/* Left: Uplink Status Readout */}
        <div className="tactical-uplink-status">
          <span className="dot-glowing-green" />
          <span style={{ color: '#8a9685', fontFamily: 'var(--font-mono)' }}>
            [ORBITAL_STREAM_ACTIVE // ENCRYPTED_CHANNEL // AES-256-GCM]
          </span>
        </div>

        {/* Right: Tactical Mobile / Comms Phone Pill Input Field */}
        <form className="tactical-phone-pill-field" onSubmit={handlePhoneAuthSubmit}>
          {/* Country Flag Box Placeholder */}
          <div className="tactical-country-box">
            <span style={{ fontSize: '0.82rem' }}>🌐</span>
            <span>+01</span>
          </div>

          {/* Lock Icon */}
          <div className="tactical-lock-icon">
            <Lock size={13} color="#738a65" />
          </div>

          {/* Input field with floating focus and keypress telemetry */}
          <input
            type="tel"
            className="tactical-phone-input"
            value={commsPhone}
            onChange={handlePhoneChange}
            placeholder="COMMS // PHONE PROTOCOL (+1-555-...)"
            aria-label="Tactical Comms Phone Input"
          />

          {/* Keypress Telemetry Helper Counter */}
          <div className={`tactical-helper-counter ${isTypingFlash ? 'keypress-telemetry-flash' : ''}`}>
            <span>{commsPhone.length}/14</span>
            <span className="counter-tag">FREQ_OK</span>
          </div>

          {/* Authenticate / Link Button with Arrow & Wavefront Ripple */}
          <button
            type="submit"
            className="btn-tactical btn-tactical-olive tactical-auth-btn"
            onClick={createWavefrontRipple}
          >
            <span>LINK</span>
            <span className="tactical-arrow">→</span>
          </button>
        </form>
      </div>

      {/* 3. Bento Grid Layout */}
      <div className="bento-grid">
        {/* CARD 1: Total Telemetry / Yield (Span 4) */}
        <div className="bento-card bento-col-4 bento-card-stagger" style={{ '--index': 1 } as React.CSSProperties}>
          <span className="corner-accent-tr" />
          <span className="corner-accent-bl" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#121614',
                    border: '1px solid rgba(115, 138, 101, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-sage, #738a65)',
                  }}
                >
                  <TrendingUp size={15} />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-secondary, #94a192)',
                  }}
                >
                  Total Telemetry / Yield
                </span>
              </div>
              <span className="tactical-badge tactical-badge-online">ACTIVE</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '8px 0 14px 0' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--text-primary, #e9ece9)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                15,984.12
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary, #94a192)',
                  fontWeight: 600,
                }}
              >
                USD
              </span>
            </div>

            {/* Sparkline Visual SVG */}
            <div style={{ width: '100%', height: '42px', margin: '4px 0 10px 0' }}>
              <svg viewBox="0 0 280 42" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#738a65" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#181d1a" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,34 Q 35,28 70,30 T 140,16 T 210,18 T 280,6 L 280,42 L 0,42 Z"
                  fill="url(#sparkline-grad)"
                />
                <path
                  d="M 0,34 Q 35,28 70,30 T 140,16 T 210,18 T 280,6"
                  fill="none"
                  stroke="#738a65"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="280" cy="6" r="3.5" fill="#d4a373" stroke="#121614" strokeWidth="1.5" />
              </svg>
            </div>
          </div>

          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid rgba(115, 138, 101, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  GROSS YIELD
                </p>
                <p
                  style={{
                    fontSize: '1.05rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  246 <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>USD</span>
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  VOL UNITS
                </p>
                <p
                  style={{
                    fontSize: '1.05rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  8
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(91, 112, 80, 0.20)',
                border: '1px solid rgba(115, 138, 101, 0.35)',
                color: 'var(--accent-sage, #738a65)',
                fontSize: '0.70rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <TrendingUp size={12} />
              <span>+12% 7D</span>
            </div>
          </div>
        </div>

        {/* CARD 2: Resource Allocation & Circular Telemetry Dials (Span 4) */}
        <div className="bento-card bento-col-4 bento-card-stagger" style={{ '--index': 2 } as React.CSSProperties}>
          <span className="corner-accent-tr" />
          <span className="corner-accent-bl" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#121614',
                    border: '1px solid rgba(115, 138, 101, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-sage, #738a65)',
                  }}
                >
                  <Sliders size={15} />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-secondary, #94a192)',
                  }}
                >
                  Resource Distribution
                </span>
              </div>
              <span className="tactical-badge tactical-badge-secure">TELEMETRY</span>
            </div>

            {/* Circular Telemetry Dial Visual */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                margin: '12px 0 16px 0',
              }}
            >
              {/* Primary Node 62% */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #5b7050 0%, #44543b 100%)',
                  border: '2px solid #738a65',
                  boxShadow: '0 0 14px rgba(115, 138, 101, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  position: 'relative',
                }}
                title="Primary Deployment: 62%"
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#e9ece9',
                    lineHeight: 1,
                  }}
                >
                  62%
                </span>
                <span style={{ fontSize: '0.52rem', fontFamily: 'var(--font-mono)', color: '#d4a373' }}>
                  PRI
                </span>
              </div>

              {/* Secondary Node 24% */}
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#121614',
                  border: '1px solid rgba(115, 138, 101, 0.40)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
                title="Secondary Staging: 24%"
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    lineHeight: 1,
                  }}
                >
                  24%
                </span>
                <span style={{ fontSize: '0.48rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  SEC
                </span>
              </div>

              {/* Auxiliary Node 14% */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#121614',
                  border: '1px solid rgba(115, 138, 101, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
                title="Auxiliary Recon: 14%"
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    lineHeight: 1,
                  }}
                >
                  14%
                </span>
                <span style={{ fontSize: '0.45rem', fontFamily: 'var(--font-mono)', color: '#687766' }}>
                  AUX
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown items */}
          <div
            style={{
              paddingTop: '10px',
              borderTop: '1px solid rgba(115, 138, 101, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.70rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#738a65' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Primary Deployment</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>$4,549.05</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(115, 138, 101, 0.50)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Secondary Staging</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>$3,438.94</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#44543b' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Auxiliary Recon</span>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>$2,327.83</span>
            </div>
          </div>
        </div>

        {/* CARD 3: Tactical Setup Protocol & Directive Tasks (Span 4) */}
        <div className="bento-card bento-card-olive bento-col-4 bento-card-stagger" style={{ '--index': 3 } as React.CSSProperties}>
          <span className="corner-accent-tr" />
          <span className="corner-accent-bl" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e9ece9',
                  }}
                >
                  <Activity size={15} />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'rgba(233, 236, 233, 0.90)',
                  }}
                >
                  Tactical Setup Protocol
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(0, 0, 0, 0.30)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#e9ece9',
                }}
              >
                {completedCount}/4 COMPLETE
              </span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                marginBottom: '4px',
              }}
            >
              4 Active Directives
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.70rem',
                color: 'rgba(233, 236, 233, 0.78)',
                marginBottom: '14px',
              }}
            >
              Calibrate and verify all defense parameters for optimal command response.
            </p>
          </div>

          {/* Interactive Directives List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: task.completed ? 'rgba(0, 0, 0, 0.35)' : 'rgba(0, 0, 0, 0.20)',
                  border: `1px solid ${task.completed ? 'rgba(115, 138, 101, 0.50)' : 'rgba(255, 255, 255, 0.10)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                className="row-hover"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: task.completed ? '#588157' : 'rgba(255, 255, 255, 0.35)',
                      boxShadow: task.completed ? '0 0 8px #588157' : 'none',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: task.completed ? '#ffffff' : 'rgba(233, 236, 233, 0.85)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.85 : 1,
                    }}
                  >
                    {task.title}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'rgba(233, 236, 233, 0.60)' }}>
                    [{task.code}]
                  </span>
                  <ChevronRight size={13} color="rgba(255, 255, 255, 0.40)" />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn-tactical btn-tactical-primary"
            onClick={(e) => {
              createWavefrontRipple(e);
              setModalNotice(
                'TACTICAL PROFILE INITIALIZED: Operator profile cryptographically verified for Sector OMEGA-ZETA. All directives synchronized with Defense HQ.'
              );
            }}
            style={{ width: '100%', marginTop: '14px', padding: '7px 12px' }}
          >
            <span>INITIALIZE PROFILE</span>
            <span className="tactical-arrow">→</span>
          </button>
        </div>

        {/* CARD 4: Signal Anomaly & Cancellations Bar Chart (Span 8) */}
        <div className="bento-card bento-col-8 bento-card-stagger" style={{ '--index': 4 } as React.CSSProperties}>
          <span className="corner-accent-tr" />
          <span className="corner-accent-bl" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#121614',
                    border: '1px solid rgba(212, 163, 115, 0.30)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--highlight-amber, #d4a373)',
                  }}
                >
                  <AlertCircle size={15} />
                </div>
                <div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-primary, #e9ece9)',
                    }}
                  >
                    Signal Anomaly / Cancellations Telemetry
                  </span>
                  <p style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    MONITORING INTERVAL: JUL 06 - JUL 24 // SECTOR SAMPLING: 10 READINGS
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  className="meta-coord"
                  style={{
                    fontSize: '0.68rem',
                    background: 'rgba(18, 22, 20, 0.70)',
                    border: '1px solid rgba(115, 138, 101, 0.20)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  Rate: <strong style={{ color: '#e9ece9' }}>0.84%</strong>
                </div>
                <div
                  className="meta-coord"
                  style={{
                    fontSize: '0.68rem',
                    background: 'rgba(212, 163, 115, 0.12)',
                    border: '1px solid rgba(212, 163, 115, 0.35)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    color: 'var(--highlight-amber, #d4a373)',
                  }}
                >
                  Loss: -$1,912.50
                </div>
              </div>
            </div>

            {/* Clean SVG Bar Chart with Hover Telemetry */}
            <div style={{ height: '170px', width: '100%', position: 'relative', marginTop: '12px' }}>
              <svg viewBox="0 0 600 150" style={{ width: '100%', height: '100%' }}>
                {/* Grid guidelines */}
                <line x1="40" y1="20" x2="580" y2="20" stroke="rgba(115, 138, 101, 0.12)" strokeDasharray="3 3" />
                <line x1="40" y1="60" x2="580" y2="60" stroke="rgba(115, 138, 101, 0.12)" strokeDasharray="3 3" />
                <line x1="40" y1="100" x2="580" y2="100" stroke="rgba(115, 138, 101, 0.12)" strokeDasharray="3 3" />
                <line x1="40" y1="130" x2="580" y2="130" stroke="rgba(115, 138, 101, 0.20)" />

                {/* Y-axis labels */}
                <text x="32" y="24" fill="#94a192" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">1.0%</text>
                <text x="32" y="64" fill="#94a192" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">0.6%</text>
                <text x="32" y="104" fill="#94a192" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">0.3%</text>
                <text x="32" y="133" fill="#94a192" fontSize="9" fontFamily="var(--font-mono)" textAnchor="end">0.0%</text>

                {/* Bars */}
                {anomalyData.map((d, i) => {
                  const barWidth = 32;
                  const x = 55 + i * 53;
                  const maxH = 100;
                  const h = d.val * maxH;
                  const y = 130 - h;
                  const isPeak = i === 4 || i === 5;
                  const isHovered = hoveredBarIndex === i;

                  return (
                    <g
                      key={d.label}
                      onMouseEnter={() => setHoveredBarIndex(i)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Bar rectangle */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={h}
                        rx="4"
                        fill={isPeak ? '#5b7050' : isHovered ? '#738a65' : '#273428'}
                        stroke={isPeak || isHovered ? '#738a65' : 'rgba(115, 138, 101, 0.35)'}
                        strokeWidth="1"
                        style={{ transition: 'all 0.15s ease' }}
                      />

                      {/* X label */}
                      <text
                        x={x + barWidth / 2}
                        y="144"
                        fill={isHovered ? '#e9ece9' : '#94a192'}
                        fontSize="9"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                        fontWeight={isHovered ? 700 : 500}
                      >
                        {d.label}
                      </text>

                      {/* Hover / Peak value readout */}
                      {(isHovered || isPeak) && (
                        <text
                          x={x + barWidth / 2}
                          y={y - 5}
                          fill={isPeak ? '#d4a373' : '#e9ece9'}
                          fontSize="9.5"
                          fontFamily="var(--font-mono)"
                          fontWeight="700"
                          textAnchor="middle"
                        >
                          {d.code}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div
            style={{
              paddingTop: '10px',
              borderTop: '1px solid rgba(115, 138, 101, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Telemetry baseline: Normal distribution across all radar geofences</span>
            <button
              type="button"
              className="btn-tactical btn-tactical-ghost"
              onClick={(e) => {
                createWavefrontRipple(e);
                setModalNotice('Anomaly audit telemetry export completed: log hash #ANOM-8849-ZETA generated.');
              }}
              style={{ padding: '3px 8px', fontSize: '0.65rem' }}
            >
              <span>Export Anomaly Audit</span>
              <span className="tactical-arrow">→</span>
            </button>
          </div>
        </div>

        {/* CARD 5: Autonomous Antigravity Pod Module (Span 4) */}
        <div className="bento-card bento-col-4 bento-card-stagger" style={{ '--index': 5 } as React.CSSProperties}>
          <span className="corner-accent-tr" />
          <span className="corner-accent-bl" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#121614',
                    border: '1px solid rgba(115, 138, 101, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-sage, #738a65)',
                  }}
                >
                  <Box size={15} />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.70rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-secondary, #94a192)',
                  }}
                >
                  Antigravity Pod Module
                </span>
              </div>
              <span className="tactical-badge tactical-badge-online">v2.4</span>
            </div>

            <h3
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--text-primary, #e9ece9)',
                lineHeight: 1.2,
                marginBottom: '4px',
              }}
            >
              Enhance Field Range with Autonomous Pods
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--text-secondary, #94a192)',
                marginBottom: '14px',
              }}
            >
              Deploy next-generation tactical supply units to remote operational sectors automatically.
            </p>

            {/* Tactical Pod Graphical Representation Container */}
            <div
              style={{
                background: '#121614',
                border: '1px solid rgba(115, 138, 101, 0.22)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  background: 'rgba(91, 112, 80, 0.20)',
                  border: '1px solid #738a65',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-sage, #738a65)',
                  flexShrink: 0,
                }}
              >
                <Cpu size={22} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    BATTERY / FIELD CAP
                  </span>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: '#d4a373', fontWeight: 700 }}>
                    86%
                  </span>
                </div>
                <div className="tactical-progress-track">
                  <div className="tactical-progress-fill" style={{ width: '86%' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    PROPULSION: IONIC
                  </span>
                  <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: '#588157' }}>
                    READY
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-tactical btn-tactical-olive"
              onClick={handleDeployPod}
              style={{ flex: 1, padding: '7px 10px' }}
            >
              DEPLOY MODULE
            </button>
            <button
              type="button"
              className="btn-tactical btn-tactical-ghost"
              onClick={() =>
                setModalNotice(
                  'SPEC SHEET: Antigravity Pod v2.4 // Max Payload: 120kg // Range: 45km radius // Signal Uplink: 915MHz LoRa + SatCom // Redundancy: Dual gyro stabilization.'
                )
              }
              style={{ padding: '7px 12px' }}
            >
              SPECS
            </button>
          </div>
        </div>

        {/* CARD 6: Rating & Positions Filled (Span 4) */}
        <div className="bento-col-4 bento-card-stagger" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', '--index': 6 } as React.CSSProperties}>
          {/* Subcard A: Tactical Precision Rating */}
          <div className="bento-card" style={{ padding: '14px' }}>
            <span className="corner-accent-tr" />
            <span className="corner-accent-bl" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                AVG RATING
              </span>
              <span
                style={{
                  fontSize: '0.60rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-sage, #738a65)',
                  background: 'rgba(91, 112, 80, 0.20)',
                  padding: '2px 5px',
                  borderRadius: '3px',
                }}
              >
                -2% 7D
              </span>
            </div>
            <div style={{ margin: '8px 0' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2.1rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1,
                }}
              >
                4.9
              </span>
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Star size={12} color="#d4a373" fill="#d4a373" />
              <span>Tactical Precision</span>
            </div>
          </div>

          {/* Subcard B: Active Positions Filled */}
          <div className="bento-card" style={{ padding: '14px' }}>
            <span className="corner-accent-tr" />
            <span className="corner-accent-bl" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                POSITIONS FILLED
              </span>
              <span
                style={{
                  fontSize: '0.60rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#588157',
                  background: 'rgba(88, 129, 87, 0.15)',
                  padding: '2px 5px',
                  borderRadius: '3px',
                }}
              >
                Optimal
              </span>
            </div>
            <div style={{ margin: '8px 0' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2.1rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1,
                }}
              >
                80%
              </span>
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Shield size={12} color="#738a65" />
              <span>Active Grids</span>
            </div>
          </div>
        </div>

        {/* CARD 7: Quick Jump Tactical Defense Modules (Span 8) */}
        <div className="bento-card bento-col-8 bento-card-stagger" style={{ padding: '14px 18px', '--index': 7 } as React.CSSProperties}>
          <span className="corner-accent-tr" />
          <span className="corner-accent-bl" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.70rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary, #94a192)',
              }}
            >
              Mission Ready Command Subsystems
            </span>
            <span className="tactical-badge tactical-badge-secure">C2 LINK ACTIVE</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <button
              type="button"
              className="btn-tactical"
              onClick={() => onNavigateModule('skywatch')}
              style={{ flexDirection: 'column', padding: '10px 8px', gap: '4px', height: '100%' }}
            >
              <Crosshair size={18} color="var(--accent-sage, #738a65)" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>SKYWATCH</span>
              <span style={{ fontSize: '0.60rem', color: 'var(--text-muted)' }}>{tracksCount} Tracks</span>
            </button>

            <button
              type="button"
              className="btn-tactical"
              onClick={() => onNavigateModule('fieldlink')}
              style={{ flexDirection: 'column', padding: '10px 8px', gap: '4px', height: '100%' }}
            >
              <Radio size={18} color="var(--highlight-amber, #d4a373)" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>FIELDLINK</span>
              <span style={{ fontSize: '0.60rem', color: 'var(--text-muted)' }}>{incidentsCount} Incidents</span>
            </button>

            <button
              type="button"
              className="btn-tactical"
              onClick={() => onNavigateModule('geointel')}
              style={{ flexDirection: 'column', padding: '10px 8px', gap: '4px', height: '100%' }}
            >
              <Layers size={18} color="#588157" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>GEOINTEL</span>
              <span style={{ fontSize: '0.60rem', color: 'var(--text-muted)' }}>Satellite Recon</span>
            </button>

            <button
              type="button"
              className="btn-tactical"
              onClick={() => onNavigateModule('mediroute')}
              style={{ flexDirection: 'column', padding: '10px 8px', gap: '4px', height: '100%' }}
            >
              <Activity size={18} color="#738a65" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>MEDIROUTE</span>
              <span style={{ fontSize: '0.60rem', color: 'var(--text-muted)' }}>Triage Logistics</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tactical Modal Notification Dialog */}
      {modalNotice && (
        <div className="tactical-modal-overlay" onClick={() => setModalNotice(null)}>
          <div className="tactical-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '6px',
                  background: 'rgba(91, 112, 80, 0.20)',
                  border: '1px solid #738a65',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-sage, #738a65)',
                }}
              >
                <Terminal size={17} />
              </div>
              <div>
                <h4
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#e9ece9',
                    letterSpacing: '0.04em',
                  }}
                >
                  Tactical System Notice
                </h4>
                <p style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  SECURE PROTOCOL MESSAGE // LINK_04
                </p>
              </div>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                lineHeight: 1.5,
                color: 'var(--text-primary)',
                background: '#121614',
                border: '1px solid rgba(115, 138, 101, 0.22)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '18px',
              }}
            >
              {modalNotice}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-tactical btn-tactical-olive"
                onClick={() => setModalNotice(null)}
              >
                ACKNOWLEDGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
