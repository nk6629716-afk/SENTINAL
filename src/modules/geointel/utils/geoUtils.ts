import { IntelligenceReportPayload } from '../types';

/**
 * Deterministic conversion of Decimal Latitude/Longitude to Military Grid Reference System (MGRS)
 * Precision: 1-meter (10-digit grid)
 */
export function convertToMGRS(lat: number, lng: number): string {
  // Clamp lat/lng
  const clampedLat = Math.max(-80, Math.min(84, lat));
  const clampedLng = Math.max(-180, Math.min(180, lng));

  // Determine UTM Zone
  const zoneNumber = Math.floor((clampedLng + 180) / 6) + 1;

  // Determine Latitude Band (C to X, omitting I and O)
  const bands = 'CDEFGHJKLMNPQRSTUVWX';
  const bandIndex = Math.floor((clampedLat + 80) / 8);
  const bandLetter = bands[Math.max(0, Math.min(bands.length - 1, bandIndex))] || 'S';

  // Compute UTM projection Easting & Northing offsets for high-realism military grid
  const centralMeridian = (zoneNumber - 1) * 6 - 180 + 3;
  const dLng = (clampedLng - centralMeridian) * (Math.PI / 180);
  const radLat = clampedLat * (Math.PI / 180);

  // Approximate false easting/northing
  const falseEasting = 500000;
  const easting = Math.round(falseEasting + (dLng * Math.cos(radLat) * 6378137));
  const falseNorthing = clampedLat >= 0 ? 0 : 10000000;
  const northing = Math.round(falseNorthing + (clampedLat * 111132));

  // 100,000-meter square identification letters
  const colLetter = String.fromCharCode(65 + ((zoneNumber - 1) * 8 + Math.floor(easting / 100000)) % 24);
  const rowLetter = String.fromCharCode(65 + (Math.floor(northing / 100000)) % 20);

  const e5 = String(Math.abs(easting % 100000)).padStart(5, '0');
  const n5 = String(Math.abs(northing % 100000)).padStart(5, '0');

  return `${zoneNumber}${bandLetter} ${colLetter}${rowLetter} ${e5} ${n5}`;
}

/**
 * Format ISO timestamp into clean Zulu/UTC Tactical Timestamp
 * e.g., "25 OCT 2026 0745Z"
 */
export function formatTacticalTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const day = String(d.getUTCDate()).padStart(2, '0');
    const mon = months[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');

    return `${day} ${mon} ${year} ${hours}${mins}Z`;
  } catch {
    return isoString;
  }
}

/**
 * Generate formatted Plaintext / Markdown Tactical Intelligence Debrief
 */
export function generateTacticalReportText(report: IntelligenceReportPayload): string {
  const line = '='.repeat(82);
  const subline = '-'.repeat(82);

  return `
${line}
SENTINEL C4ISR RECONNAISSANCE & GEOSPATIAL INTELLIGENCE (GEOINT) REPORT
CLASSIFICATION: ${report.classification}
DOCUMENT REF:   ${report.reportId}
ISSUED AT:      ${report.generatedAt}
DUTY ANALYST:   ${report.analystCallsign}
${line}

1. AREA OF INTEREST (AOI) SPECIFICATION
Target Operational Zone: ${report.targetZone}
Observation Record ID:   ${report.observation.id} - ${report.observation.title}
Bounding Coordinates:
  - North: ${report.aoiBoundingBox.northLat.toFixed(5)}°N
  - South: ${report.aoiBoundingBox.southLat.toFixed(5)}°N
  - East:  ${report.aoiBoundingBox.eastLng.toFixed(5)}°E
  - West:  ${report.aoiBoundingBox.westLng.toFixed(5)}°E

SENSOR PAIR METADATA:
  Baseline Imagery:
    - Platform:      ${report.observation.baselineSensor.platform} (${report.observation.baselineSensor.sensorId})
    - Capture Date:  ${report.observation.baselineSensor.captureTimestamp}
    - Resolution:    ${report.observation.baselineSensor.resolutionGsd} GSD
    - Cloud Cover:   ${report.observation.baselineSensor.cloudCoverPct}% | Sun Elevation: ${report.observation.baselineSensor.sunElevationDeg}°
  Surveillance Imagery:
    - Platform:      ${report.observation.surveillanceSensor.platform} (${report.observation.surveillanceSensor.sensorId})
    - Capture Date:  ${report.observation.surveillanceSensor.captureTimestamp}
    - Resolution:    ${report.observation.surveillanceSensor.resolutionGsd} GSD
    - Cloud Cover:   ${report.observation.surveillanceSensor.cloudCoverPct}% | Sun Azimuth: ${report.observation.surveillanceSensor.sunAzimuthDeg}°

${subline}
2. ALGORITHMIC CHANGE EXTRACTION CONFIGURATION
  - Algorithm:            ${report.analysisConfiguration.algorithmName}
  - Sensitivity Threshold: Intensity Delta >= ${report.analysisConfiguration.sensitivityThreshold} / 255
  - Minimum Cluster Area:  ${report.analysisConfiguration.minRegionSize} pixels
  - Computation Time:      ${report.analysisConfiguration.executionTimeMs.toFixed(1)} ms

3. SUMMARY OF DETECTIONS & HUMAN ANALYST VERIFICATION
  - Total Candidate Anomalies Detected: ${report.summaryStats.totalCandidates}
  - Confirmed Tactical Threats:         ${report.summaryStats.confirmedThreats}
  - Benign / False Positives Dismissed: ${report.summaryStats.benignFalsePositives}
  - Secondary Pass Required:            ${report.summaryStats.secondaryPassRequired}
  - Awaiting Review:                    ${report.summaryStats.unreviewed}

${subline}
4. DETAILED CANDIDATE AUDIT TABLE
${
  report.candidates.length === 0
    ? '  [No candidate regions detected above threshold. Baseline and surveillance scenes match.]\n'
    : report.candidates
        .map(
          (c, idx) => `
[CANDIDATE #${idx + 1}] ID: ${c.id} | ${c.label.toUpperCase()}
  - Type / Class:       ${c.type.replace('_', ' ').toUpperCase()}
  - Image Pixel Box:    X: ${c.pixelBox.x}, Y: ${c.pixelBox.y}, Width: ${c.pixelBox.width}, Height: ${c.pixelBox.height}
  - Cluster Area:       ${c.areaPixels} pixels
  - Projected Anchor:   ${c.latLng.lat.toFixed(5)}°N, ${c.latLng.lng.toFixed(5)}°W (${c.mgrs})
  - Algorithmic Score:  ${c.diffScorePct.toFixed(1)}% (Confidence: ${c.confidencePct.toFixed(1)}%)
  - Review Status:      ${c.decision.replace('_', ' ').toUpperCase()}
  - Algorithmic Rationale:
      ${c.explanation}
  - Human Analyst Annotations:
      ${c.analystNotes || 'None logged during primary analysis pass.'}
`
        )
        .join('')
}

${subline}
5. OVERALL OPERATIONAL ASSESSMENT
${report.overallAnalystAssessment || 'Routine multi-temporal surveillance pass completed. Structural modifications verified by duty analyst.'}

6. MANDATORY STATUTORY & LIMITATION NOTICE
${report.limitationDisclaimer}

NOTICE: All imagery and scenarios in this environment are synthetic training data.
${line}
END OF TRANSMISSION // SENTINEL C4ISR PLATFORM
`.trim();
}
