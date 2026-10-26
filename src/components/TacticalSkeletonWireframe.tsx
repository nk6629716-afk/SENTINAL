import React from 'react';

interface TacticalSkeletonWireframeProps {
  className?: string;
  style?: React.CSSProperties;
}

export const TacticalSkeletonWireframe: React.FC<TacticalSkeletonWireframeProps> = ({
  className = '',
  style = {},
}) => {
  // Bar chart heights corresponding to the 10 data points (40% to 95%)
  const barHeights = [40, 45, 50, 65, 85, 95, 70, 55, 50, 75];

  return (
    <div
      className={`tactical-grid-bg tactical-scanlines ${className}`}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '20px 24px 32px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        minHeight: '100%',
        ...style,
      }}
      aria-busy="true"
      aria-label="Tactical Wireframe Loading State"
    >
      {/* 1. Sub-Header & Telemetry Status Bar Skeleton (1:1 Footprint) */}
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
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Left Hero & Status Codes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div
            className="tactical-skeleton"
            style={{ width: '32px', height: '32px', borderRadius: '6px' }}
          />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Rectangular title block with rounded corners (border-radius: 8px) */}
              <div
                className="tactical-skeleton"
                style={{ width: '180px', height: '18px', borderRadius: '8px' }}
              />
              {/* Pill-shaped skeleton tags for status codes */}
              <div
                className="tactical-skeleton tactical-skeleton-pill"
                style={{ width: '84px', height: '20px' }}
              />
              <div
                className="tactical-skeleton tactical-skeleton-pill"
                style={{ width: '92px', height: '20px' }}
              />
            </div>
            {/* Coordinates subtitle block */}
            <div
              className="tactical-skeleton"
              style={{ width: '280px', height: '10px', marginTop: '6px', borderRadius: '4px' }}
            />
          </div>
        </div>

        {/* Right Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            className="tactical-skeleton"
            style={{ width: '150px', height: '28px', borderRadius: '6px' }}
          />
          <div
            className="tactical-skeleton"
            style={{ width: '115px', height: '28px', borderRadius: '6px' }}
          />
          <div
            className="tactical-skeleton"
            style={{ width: '105px', height: '28px', borderRadius: '6px' }}
          />
        </div>
      </div>

      {/* 2. Tactical Uplink Status & Phone Input Pill Field (Exact 1:1 Footprint) */}
      <div className="tactical-uplink-bar">
        {/* Pulsing Monospaced Uplink Prompt with Blinking Amber Cursor */}
        <div className="tactical-uplink-status">
          <span className="dot-glowing-green" style={{ background: '#d4a373' }} />
          <span style={{ color: '#8a9685', fontFamily: 'var(--font-mono)' }}>
            [BUFFERING_ORBITAL_STREAM // ENCRYPTING_HANDSHAKE...]
          </span>
          <span className="cursor-blink-amber" />
        </div>

        {/* Phone Input Skeleton: Exact 1:1 footprint matching mobile layout pill field */}
        <div
          className="tactical-phone-pill-field"
          style={{
            background: '#161b17',
            borderColor: 'rgba(97, 115, 37, 0.20)',
          }}
        >
          {/* Country Flag Box Placeholder */}
          <div
            className="tactical-skeleton tactical-skeleton-pill"
            style={{ width: '48px', height: '24px' }}
            title="Country flag placeholder"
          />

          {/* Lock Icon Placeholder */}
          <div
            className="tactical-skeleton"
            style={{ width: '16px', height: '16px', borderRadius: '4px' }}
            title="Lock icon placeholder"
          />

          {/* Input text placeholder */}
          <div
            className="tactical-skeleton"
            style={{ width: '150px', height: '14px', borderRadius: '4px', flex: 1 }}
          />

          {/* Helper counter ghost pill chip */}
          <div
            className="tactical-skeleton"
            style={{ width: '60px', height: '18px', borderRadius: '4px' }}
          />

          {/* Action button placeholder */}
          <div
            className="tactical-skeleton tactical-skeleton-pill"
            style={{ width: '64px', height: '26px' }}
          />
        </div>
      </div>

      {/* 3. Bento Grid Metrics Skeletons (7 Cards matching 1:1 CSS Grid) */}
      <div className="bento-grid">
        {/* CARD 1: Total Telemetry / Yield (Span 4) */}
        <div
          className="bento-card bento-col-4 tactical-skeleton-card"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '260px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="tactical-skeleton" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
              <div className="tactical-skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
            </div>
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '64px', height: '18px' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
            <div className="tactical-skeleton" style={{ width: '130px', height: '36px', borderRadius: '6px' }} />
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '60px', height: '18px' }} />
          </div>

          {/* Sparkline Area Placeholder */}
          <div
            className="tactical-skeleton"
            style={{ width: '100%', height: '80px', borderRadius: '8px', marginTop: 'auto' }}
          />

          {/* Ghost pill chips */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '70px', height: '20px' }} />
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '85px', height: '20px' }} />
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '60px', height: '20px' }} />
          </div>
        </div>

        {/* CARD 2: Circular Telemetry Dial (Span 4) */}
        <div
          className="bento-card bento-col-4 tactical-skeleton-card"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', minHeight: '260px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="tactical-skeleton" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
              <div className="tactical-skeleton" style={{ width: '130px', height: '14px', borderRadius: '4px' }} />
            </div>
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '56px', height: '18px' }} />
          </div>

          {/* Concentric Circular Pulse Rings for Telemetry Dial */}
          <div
            style={{
              position: 'relative',
              width: '130px',
              height: '130px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '8px 0',
            }}
          >
            {/* Outer ring */}
            <div
              className="tactical-skeleton-ring"
              style={{
                position: 'absolute',
                inset: 0,
                borderColor: 'rgba(97, 115, 37, 0.35)',
              }}
            />
            {/* Mid ring */}
            <div
              className="tactical-skeleton-ring"
              style={{
                position: 'absolute',
                inset: '16px',
                borderColor: 'rgba(97, 115, 37, 0.25)',
                animationDelay: '0.4s',
              }}
            />
            {/* Center Dial Core */}
            <div
              className="tactical-skeleton tactical-skeleton-circle"
              style={{ width: '56px', height: '56px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ flex: 1, height: '18px' }} />
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ flex: 1, height: '18px' }} />
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ flex: 1, height: '18px' }} />
          </div>
        </div>

        {/* CARD 3: Directive Tasks Skeleton (Span 4) */}
        <div
          className="bento-card bento-col-4 tactical-skeleton-card"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '260px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="tactical-skeleton" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
              <div className="tactical-skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
            </div>
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '50px', height: '18px' }} />
          </div>

          {/* 4 Task Items */}
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px',
                background: 'rgba(22, 27, 23, 0.5)',
                borderRadius: '6px',
              }}
            >
              <div className="tactical-skeleton" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
              <div className="tactical-skeleton" style={{ flex: 1, height: '12px', borderRadius: '4px' }} />
              <div className="tactical-skeleton" style={{ width: '52px', height: '14px', borderRadius: '4px' }} />
            </div>
          ))}

          <div
            className="tactical-skeleton"
            style={{ width: '100%', height: '30px', borderRadius: '6px', marginTop: 'auto' }}
          />
        </div>

        {/* CARD 4: Telemetry Anomaly Bar Chart (Span 8) */}
        <div
          className="bento-card bento-col-8 tactical-skeleton-card"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '260px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="tactical-skeleton" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
              <div>
                <div className="tactical-skeleton" style={{ width: '170px', height: '14px', borderRadius: '4px' }} />
                <div className="tactical-skeleton" style={{ width: '110px', height: '10px', marginTop: '4px', borderRadius: '4px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '80px', height: '20px' }} />
              <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '54px', height: '20px' }} />
            </div>
          </div>

          {/* Segmented Bars Shimmer Chart */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '120px',
              padding: '10px 10px 0 10px',
              borderBottom: '1px solid rgba(97, 115, 37, 0.20)',
              gap: '12px',
              marginTop: '10px',
            }}
          >
            {barHeights.map((pct, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <div
                  className="tactical-skeleton"
                  style={{
                    width: '100%',
                    maxWidth: '34px',
                    height: `${pct}%`,
                    borderRadius: '4px 4px 0 0',
                    animationDelay: `${idx * 80}ms`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Date Axis Placeholders */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
            {barHeights.map((_, idx) => (
              <div
                key={idx}
                className="tactical-skeleton"
                style={{ width: '28px', height: '8px', borderRadius: '2px' }}
              />
            ))}
          </div>
        </div>

        {/* CARD 5: Supply Pod Module (Span 4) */}
        <div
          className="bento-card bento-col-4 tactical-skeleton-card"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '260px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="tactical-skeleton" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
              <div className="tactical-skeleton" style={{ width: '130px', height: '14px', borderRadius: '4px' }} />
            </div>
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '60px', height: '18px' }} />
          </div>

          <div
            className="tactical-skeleton"
            style={{ width: '100%', height: '80px', borderRadius: '8px' }}
          />

          {/* Battery Segmented Track */}
          <div
            className="tactical-skeleton tactical-skeleton-pill"
            style={{ width: '100%', height: '12px' }}
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
            <div className="tactical-skeleton" style={{ flex: 1, height: '32px', borderRadius: '6px' }} />
            <div className="tactical-skeleton" style={{ flex: 1, height: '32px', borderRadius: '6px' }} />
          </div>
        </div>

        {/* CARD 6: Tactical Rating & Sector Coordinates (Span 4) */}
        <div
          className="bento-card bento-col-4 tactical-skeleton-card"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '240px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="tactical-skeleton" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
              <div className="tactical-skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
            </div>
            <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '50px', height: '18px' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div
              className="tactical-skeleton"
              style={{ flex: 1, height: '70px', borderRadius: '8px' }}
            />
            <div
              className="tactical-skeleton"
              style={{ flex: 1, height: '70px', borderRadius: '8px' }}
            />
          </div>

          <div
            className="tactical-skeleton"
            style={{ width: '100%', height: '34px', borderRadius: '6px', marginTop: 'auto' }}
          />
        </div>

        {/* CARD 7: Tactical Command Subsystems (Span 8) */}
        <div
          className="bento-card bento-col-8 tactical-skeleton-card"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '240px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="tactical-skeleton" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
              <div className="tactical-skeleton" style={{ width: '160px', height: '14px', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '60px', height: '18px' }} />
              <div className="tactical-skeleton tactical-skeleton-pill" style={{ width: '60px', height: '18px' }} />
            </div>
          </div>

          {/* 4 Subsystem Card Skeletons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '6px',
            }}
          >
            {[1, 2, 3, 4].map((sub) => (
              <div
                key={sub}
                className="tactical-skeleton"
                style={{
                  height: '78px',
                  borderRadius: '8px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(97, 115, 37, 0.25)' }} />
                  <div style={{ width: '40px', height: '14px', borderRadius: '9999px', background: 'rgba(97, 115, 37, 0.25)' }} />
                </div>
                <div style={{ width: '70%', height: '10px', borderRadius: '3px', background: 'rgba(97, 115, 37, 0.25)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
