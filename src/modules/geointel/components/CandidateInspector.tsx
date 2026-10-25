import React, { useState } from 'react';
import {
  Eye,
  CheckCircle,
  AlertOctagon,
  HelpCircle,
  MapPin,
  Clock,
  Shield,
  Copy,
  Check,
  Filter,
  FileText,
  AlertTriangle,
  History,
  TrendingUp,
} from 'lucide-react';
import { EnrichedChangeCandidate, CandidateReviewDecision } from '../types';

interface CandidateInspectorProps {
  candidates: EnrichedChangeCandidate[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidateId: string) => void;
  onUpdateDecision: (candidateId: string, decision: CandidateReviewDecision, notes: string) => void;
  overallAnalystNotes: string;
  onUpdateOverallNotes: (notes: string) => void;
}

export const CandidateInspector: React.FC<CandidateInspectorProps> = ({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  onUpdateDecision,
  overallAnalystNotes,
  onUpdateOverallNotes,
}) => {
  const [filter, setFilter] = useState<'all' | 'unreviewed' | 'confirmed' | 'benign'>('all');
  const [activeNotes, setActiveNotes] = useState('');
  const [copiedMgrs, setCopiedMgrs] = useState(false);

  const activeCandidate = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  // Sync candidate notes when activeCandidate changes
  React.useEffect(() => {
    if (activeCandidate) {
      setActiveNotes(activeCandidate.analystNotes || '');
    }
  }, [activeCandidate?.id]);

  const filteredCandidates = candidates.filter((c) => {
    if (filter === 'unreviewed') return c.decision === 'unreviewed';
    if (filter === 'confirmed') return c.decision === 'confirmed_threat';
    if (filter === 'benign') return c.decision === 'benign_false_positive';
    return true;
  });

  const handleCopyMGRS = (mgrs: string) => {
    navigator.clipboard.writeText(mgrs);
    setCopiedMgrs(true);
    setTimeout(() => setCopiedMgrs(false), 2000);
  };

  const getStatusBadge = (decision: CandidateReviewDecision) => {
    switch (decision) {
      case 'confirmed_threat':
        return {
          label: 'CONFIRMED THREAT',
          bg: 'rgba(239, 68, 68, 0.2)',
          border: '#EF4444',
          color: '#F87171',
          icon: <AlertOctagon size={12} />,
        };
      case 'benign_false_positive':
        return {
          label: 'BENIGN / DISMISSED',
          bg: 'rgba(16, 185, 129, 0.2)',
          border: '#10B981',
          color: '#34D399',
          icon: <CheckCircle size={12} />,
        };
      case 'secondary_pass_required':
        return {
          label: 'SECONDARY PASS REQ',
          bg: 'rgba(245, 158, 11, 0.2)',
          border: '#F59E0B',
          color: '#FBBF24',
          icon: <HelpCircle size={12} />,
        };
      default:
        return {
          label: 'AWAITING REVIEW',
          bg: 'rgba(148, 163, 184, 0.15)',
          border: '#64748B',
          color: '#CBD5E1',
          icon: <Clock size={12} />,
        };
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* 1. Candidate List & Quick Filter Card */}
      <div
        style={{
          background: 'rgba(11, 15, 23, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          padding: '14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F1F5F9', fontWeight: 800, fontSize: '0.88rem' }}>
            <Eye size={16} color="#00F0FF" />
            <span>DETECTED ANOMALIES</span>
            <span
              style={{
                background: 'rgba(0, 240, 255, 0.15)',
                color: '#00F0FF',
                padding: '1px 7px',
                borderRadius: '10px',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {candidates.length}
            </span>
          </div>

          {/* Quick Filter Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                background: filter === 'all' ? '#1E293B' : 'transparent',
                color: filter === 'all' ? '#00F0FF' : '#94A3B8',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ALL
            </button>
            <button
              onClick={() => setFilter('unreviewed')}
              style={{
                background: filter === 'unreviewed' ? '#1E293B' : 'transparent',
                color: filter === 'unreviewed' ? '#F59E0B' : '#94A3B8',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              PENDING
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              style={{
                background: filter === 'confirmed' ? '#1E293B' : 'transparent',
                color: filter === 'confirmed' ? '#EF4444' : '#94A3B8',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              THREATS
            </button>
          </div>
        </div>

        {/* Candidate Horizontal Selector Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filteredCandidates.map((can) => {
            const isSelected = activeCandidate?.id === can.id;
            const badge = getStatusBadge(can.decision);

            return (
              <div
                key={can.id}
                onClick={() => onSelectCandidate(can.id)}
                style={{
                  background: isSelected ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0, 0, 0, 0.4)',
                  border: `1px solid ${isSelected ? '#00F0FF' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.12s ease',
                  boxShadow: isSelected ? '0 0 12px rgba(0, 240, 255, 0.2)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: isSelected ? '#00F0FF' : '#F1F5F9',
                    }}
                  >
                    {can.id}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F1F5F9' }}>
                      {can.label}
                    </div>
                    <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
                      MGRS: {can.mgrsCoordinate.slice(0, 14)}...
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#F59E0B' }}>
                      {(can.differenceScore * 100).toFixed(0)}% DIFF
                    </div>
                    <div style={{ fontSize: '0.64rem', color: '#64748B' }}>
                      {(can.confidence * 100).toFixed(0)}% CONF
                    </div>
                  </div>

                  <span
                    style={{
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.color,
                      padding: '3px 6px',
                      borderRadius: '4px',
                      fontSize: '0.6rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {badge.icon}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Detailed Candidate Inspector & Review Controls */}
      {activeCandidate && (
        <div
          style={{
            background: 'rgba(11, 15, 23, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F1F5F9' }}>
                  {activeCandidate.id}
                </span>
                <span
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38BDF8',
                    border: '1px solid #0284C7',
                    padding: '1px 8px',
                    borderRadius: '4px',
                    fontSize: '0.66rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                >
                  {activeCandidate.anomalyType.replace('_', ' ')}
                </span>
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#E2E8F0', marginTop: '2px' }}>
                {activeCandidate.label}
              </div>
            </div>

            {/* Current Review Decision Badge */}
            <div
              style={{
                background: getStatusBadge(activeCandidate.decision).bg,
                border: `1px solid ${getStatusBadge(activeCandidate.decision).border}`,
                color: getStatusBadge(activeCandidate.decision).color,
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {getStatusBadge(activeCandidate.decision).icon}
              <span>{getStatusBadge(activeCandidate.decision).label}</span>
            </div>
          </div>

          {/* Metric Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ fontSize: '0.64rem', color: '#94A3B8', fontWeight: 700 }}>AI CONFIDENCE</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00F0FF', marginTop: '2px' }}>
                {(activeCandidate.confidence * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '2px' }}>
                Convolutional Feature Score
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ fontSize: '0.64rem', color: '#94A3B8', fontWeight: 700 }}>RADIOMETRIC DELTA</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#F59E0B', marginTop: '2px' }}>
                {(activeCandidate.differenceScore * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: '2px' }}>
                Pixel Variance Amplitude
              </div>
            </div>
          </div>

          {/* Coordinates & MGRS Reference Card */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ color: '#94A3B8', fontSize: '0.64rem', fontWeight: 700 }}>MGRS GRID REFERENCE</span>
              <button
                onClick={() => handleCopyMGRS(activeCandidate.mgrsCoordinate)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedMgrs ? '#10B981' : '#00F0FF',
                  cursor: 'pointer',
                  fontSize: '0.66rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {copiedMgrs ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedMgrs ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
            <div style={{ color: '#00F0FF', fontWeight: 800, fontSize: '0.84rem' }}>
              {activeCandidate.mgrsCoordinate}
            </div>
            <div style={{ color: '#64748B', fontSize: '0.68rem', marginTop: '3px' }}>
              LAT: {activeCandidate.latLng.lat.toFixed(5)}°N • LNG: {activeCandidate.latLng.lng.toFixed(5)}°W
            </div>
          </div>

          {/* Algorithmic Rationale */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '0.76rem',
              color: '#CBD5E1',
              lineHeight: 1.45,
            }}
          >
            <div style={{ color: '#94A3B8', fontSize: '0.66rem', fontWeight: 700, marginBottom: '3px', textTransform: 'uppercase' }}>
              Neural Classification Rationale
            </div>
            {activeCandidate.explanation}
          </div>

          {/* AI Limitations & Sensor Warnings Box */}
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '0.72rem',
              color: '#FDE68A',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.4,
            }}
          >
            <AlertTriangle size={15} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <span style={{ fontWeight: 800 }}>GEOINT Disclaimers: </span>
              Sun azimuth differences (134° vs 142°) may create cast shadow variations. Human-in-the-loop ground truth verification is required before operational escalation.
            </div>
          </div>

          {/* Analyst Operational Notes Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', marginBottom: '4px' }}>
              HUMAN ANALYST ANNOTATIONS:
            </label>
            <textarea
              rows={2}
              value={activeNotes}
              onChange={(e) => setActiveNotes(e.target.value)}
              placeholder="Log tactical assessment, ground confirmation status, or secondary sweep requirements..."
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#F1F5F9',
                fontSize: '0.76rem',
                fontFamily: 'var(--font-sans)',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Quick-Action Triage Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => onUpdateDecision(activeCandidate.id, 'confirmed_threat', activeNotes)}
              style={{
                background: activeCandidate.decision === 'confirmed_threat' ? '#DC2626' : 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: activeCandidate.decision === 'confirmed_threat' ? '#FFFFFF' : '#F87171',
                borderRadius: '6px',
                padding: '8px 6px',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.12s ease',
              }}
            >
              <AlertOctagon size={14} />
              <span>CONFIRM THREAT</span>
            </button>

            <button
              onClick={() => onUpdateDecision(activeCandidate.id, 'benign_false_positive', activeNotes)}
              style={{
                background: activeCandidate.decision === 'benign_false_positive' ? '#059669' : 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10B981',
                color: activeCandidate.decision === 'benign_false_positive' ? '#FFFFFF' : '#34D399',
                borderRadius: '6px',
                padding: '8px 6px',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.12s ease',
              }}
            >
              <CheckCircle size={14} />
              <span>MARK BENIGN</span>
            </button>

            <button
              onClick={() => onUpdateDecision(activeCandidate.id, 'secondary_pass_required', activeNotes)}
              style={{
                background: activeCandidate.decision === 'secondary_pass_required' ? '#D97706' : 'rgba(245, 158, 11, 0.15)',
                border: '1px solid #F59E0B',
                color: activeCandidate.decision === 'secondary_pass_required' ? '#FFFFFF' : '#FBBF24',
                borderRadius: '6px',
                padding: '8px 6px',
                fontSize: '0.7rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.12s ease',
              }}
            >
              <HelpCircle size={14} />
              <span>SECONDARY PASS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
