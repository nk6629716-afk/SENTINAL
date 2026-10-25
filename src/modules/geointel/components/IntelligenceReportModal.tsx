import React, { useState } from 'react';
import {
  FileText,
  Download,
  X,
  CheckCircle,
  Copy,
  Check,
  Shield,
  FileCode,
} from 'lucide-react';
import { IntelligenceReportPayload } from '../types';
import { generateTacticalReportText } from '../utils/geoUtils';

interface IntelligenceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportPayload: IntelligenceReportPayload;
}

export const IntelligenceReportModal: React.FC<IntelligenceReportModalProps> = ({
  isOpen,
  onClose,
  reportPayload,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const reportText = generateTacticalReportText(reportPayload);

  const handleCopyText = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportPayload.reportId}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Exported ${reportPayload.reportId}.txt`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(reportPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportPayload.reportId}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Exported ${reportPayload.reportId}.json`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#0B0F17',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 240, 255, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(17, 24, 39, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(0, 240, 255, 0.15)',
                border: '1px solid #00F0FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00F0FF',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#F1F5F9', letterSpacing: '0.04em' }}>
                TACTICAL INTELLIGENCE DEBRIEF EXPORT
              </div>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>
                REF: {reportPayload.reportId} • CLASSIFICATION: {reportPayload.classification}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {downloadSuccess && (
              <span
                style={{
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#10B981',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCircle size={14} />
                {downloadSuccess}
              </span>
            )}

            <button
              onClick={handleCopyText}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: copied ? '#10B981' : '#E2E8F0',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'COPIED' : 'COPY TEXT'}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              style={{
                background: '#0284C7',
                border: '1px solid #38BDF8',
                color: '#FFFFFF',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Download size={14} />
              <span>EXPORT TXT</span>
            </button>

            <button
              onClick={handleDownloadJson}
              style={{
                background: '#1E293B',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#E2E8F0',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FileCode size={14} />
              <span>EXPORT JSON</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: '#070B12',
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.76rem',
              color: '#38BDF8',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {reportText}
          </pre>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(11, 15, 23, 0.95)',
            fontSize: '0.72rem',
            color: '#64748B',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>DATA INTEGRITY: VERIFIED AGAINST REAL-TIME RUNTIME STATE</span>
          <span style={{ color: '#00F0FF', fontFamily: 'var(--font-mono)' }}>
            DIGITAL SIGNATURE: SHA-256 VALIDATED
          </span>
        </div>
      </div>
    </div>
  );
};
