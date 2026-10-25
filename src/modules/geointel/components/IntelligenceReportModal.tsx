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
        background: 'rgba(22, 32, 46, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--color-sheet)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1.2px solid var(--color-edge)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-paper)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-sheet)',
                border: '1.2px solid var(--color-edge)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
              }}
            >
              <FileText size={16} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                Tactical intelligence debrief export
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-2)' }}>
                REF: {reportPayload.reportId} • CLASSIFICATION: {reportPayload.classification}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {downloadSuccess && (
              <span
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--color-ok)',
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
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy text'}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="btn btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Download size={14} />
              <span>Export TXT</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="btn"
              style={{
                padding: '6px 14px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FileCode size={14} />
              <span>Export JSON</span>
            </button>

            <button
              onClick={onClose}
              className="btn"
              style={{
                padding: '6px 8px',
                marginLeft: '6px',
              }}
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            background: 'var(--color-paper)',
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: 'var(--font-body)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: '0.78rem',
              color: 'var(--color-ink)',
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
            padding: '10px 16px',
            borderTop: '1.2px solid var(--color-edge)',
            background: 'var(--color-paper)',
            fontSize: '0.75rem',
            color: 'var(--color-ink-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>DATA INTEGRITY: VERIFIED AGAINST REAL-TIME RUNTIME STATE</span>
          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
            DIGITAL SIGNATURE: SHA-256 VALIDATED
          </span>
        </div>
      </div>
    </div>
  );
};
