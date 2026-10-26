import React from 'react';

/**
 * Creates an ultra-smooth, expanding circular wavefront ripple originating from
 * the click coordinates across tactical button surfaces.
 */
export function createWavefrontRipple(e: React.MouseEvent<HTMLElement>): void {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const diameter = Math.max(rect.width, rect.height) * 2.2;
  const radius = diameter / 2;

  const circle = document.createElement('span');
  circle.className = 'tactical-wavefront-ripple';
  circle.style.width = `${diameter}px`;
  circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - radius}px`;
  circle.style.top = `${e.clientY - rect.top - radius}px`;

  // Remove any stale ripples immediately
  const existing = btn.getElementsByClassName('tactical-wavefront-ripple')[0];
  if (existing) {
    existing.remove();
  }

  btn.appendChild(circle);

  // Auto clean up after animation finishes
  setTimeout(() => {
    if (circle && circle.parentNode === btn) {
      circle.remove();
    }
  }, 600);
}
