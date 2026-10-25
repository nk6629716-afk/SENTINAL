import React from 'react';
import {
  Play,
  XCircle,
  Sliders,
  CheckCircle,
  Activity,
  Cpu,
  ShieldAlert,
} from 'lucide-react';
import { AnalysisState } from '../types';

interface RunAnalysisBarProps {
  analysisState: AnalysisState;
  onStartAnalysis: () => void;
  onCancelAnalysis: () => void;
  sensitivity: number;
  onSensitivityChange: (val: number) => void;
  kernelSize: string;
  onKernelSizeChange: (val: string) => void;
  noiseSuppression: boolean;
  onToggleNoiseSuppression: () => void;
  candidateCount: number;
}

export const RunAnalysisBar: React.FC<RunAnalysisBarProps> = ({
  analysisState,
  onStartAnalysis,
  onCancelAnalysis,
  sensitivity,
  onSensitivityChange,
  kernelSize,
  onKernelSizeChange,
  noiseSuppression,
  onToggleNoiseSuppression,
  candidateCount,
}) => {
  const isProcessing = analysisState.status === 'processing';

  return (
    <div
      style={{
        background: 'rgba(11, 15, 23, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        padding: '12px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Left: Execution Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {!isProcessing ? (
            <button
              onClick={onStartAnalysis}
              style={{
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                color: '#FFFFFF',
                border: '1px solid #38BDF8',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '0.84rem',
                fontWeight: 700,
                letterSpacing: '0.03em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 16px rgba(2, 132, 199, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1.0)')}
            >
              <Play size={16} fill="#FFFFFF" />
              <span>RUN AI CHANGE DETECTION</span>
            </button>
          ) : (
            <button
              onClick={onCancelAnalysis}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #EF4444',
                color: '#F87171',
                borderRadius: '8px',
                padding: '9px 16px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <XCircle size={16} />
              <span>CANCEL ANALYSIS</span>
            </button>
          )}

          {/* Sensitivity Threshold Slider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Sliders size={14} color="#00F0FF" />
            <span style={{ color: '#94A3B8' }}>THRESHOLD:</span>
            <span style={{ color: '#00F0FF', fontWeight: 700, minWidth: '32px' }}>{sensitivity}%</span>
            <input
              type="range"
              min="30"
              max="90"
              value={sensitivity}
              disabled={isProcessing}
              onChange={(e) => onSensitivityChange(Number(e.target.value))}
              style={{ width: '90px', accentColor: '#00F0FF', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
            />
          </div>

          {/* Convolution Kernel Size */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Cpu size={14} color="#A78BFA" />
            <span style={{ color: '#94A3B8' }}>KERNEL:</span>
            <select
              value={kernelSize}
              disabled={isProcessing}
              onChange={(e) => onKernelSizeChange(e.target.value)}
              style={{
                background: 'transparent',
                color: '#F1F5F9',
                border: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="3x3" style={{ background: '#111827' }}>3x3 Fine GSD</option>
              <option value="5x5" style={{ background: '#111827' }}>5x5 Standard</option>
              <option value="7x7" style={{ background: '#111827' }}>7x7 Macro AOI</option>
            </select>
          </div>

          {/* Noise Suppression Toggle */}
          <button
            onClick={onToggleNoiseSuppression}
            disabled={isProcessing}
            style={{
              background: noiseSuppression ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.45)',
              border: `1px solid ${noiseSuppression ? '#10B981' : 'rgba(255, 255, 255, 0.08)'}`,
              color: noiseSuppression ? '#10B981' : '#64748B',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={13} />
            <span>NOISE FILTER: {noiseSuppression ? 'ACTIVE' : 'BYPASS'}</span>
          </button>
        </div>

        {/* Right: Status Metric Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {analysisState.status === 'completed' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10B981',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                color: '#10B981',
                fontWeight: 700,
              }}
            >
              <CheckCircle size={14} />
              <span>
                ANALYSIS COMPLETE • {candidateCount} ANOMALIES FLAGGED ({analysisState.executionTimeMs || 340}ms)
              </span>
            </div>
          )}

          {analysisState.status === 'idle' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#94A3B8',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00F0FF', boxShadow: '0 0 6px #00F0FF' }} />
              <span>RADAR & CONVOLUTION ENGINE READY</span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Multi-Stage Processing Bar */}
      {isProcessing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#00F0FF', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#00F0FF', animation: 'radar-blip-pulse 1s infinite' }} />
              {analysisState.currentStage}
            </span>
            <span style={{ color: '#00F0FF', fontWeight: 800 }}>{analysisState.progressPct}%</span>
          </div>

          <div
            style={{
              height: '6px',
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid rgba(0, 240, 255, 0.2)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${analysisState.progressPct}%`,
                background: 'linear-gradient(90deg, #0284C7 0%, #00F0FF 100%)',
                boxShadow: '0 0 10px #00F0FF',
                borderRadius: '4px',
                transition: 'width 0.15s linear',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
