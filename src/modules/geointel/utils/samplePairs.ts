import { ImageMatrix } from '../../../algorithms/geointel/imageDiff';

export interface SamplePair {
  id: string;
  title: string;
  subtitle: string;
  zoneName: string;
  beforeImageId: string;
  afterImageId: string;
  beforeLabel: string;
  afterLabel: string;
  description: string;
  isSynthetic: true;
  width: number;
  height: number;
  centerCoordinates: { lat: number; lng: number };
  getBeforeMatrix: () => ImageMatrix;
  getAfterMatrix: () => ImageMatrix;
  getBeforeSvg: (theme?: 'light' | 'dark') => string;
  getAfterSvg: (theme?: 'light' | 'dark') => string;
}

/**
 * Helper to generate synthetic terrain & tactical structures for reproducible image diffing
 */
function createSyntheticSceneMatrix(
  id: string,
  label: string,
  width: number,
  height: number,
  features: {
    baseLuminance?: number;
    riverY?: number;
    riverThickness?: number;
    roads?: Array<{ x1: number; y1: number; x2: number; y2: number; width: number; luminance: number }>;
    rectangles?: Array<{ x: number; y: number; w: number; h: number; luminance: number }>;
  }
): ImageMatrix {
  const base = features.baseLuminance ?? 150;
  const data = new Array(width * height).fill(base);

  // 1. Subtle terrain gradient & per-pixel pseudo-noise (deterministic)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const subtleNoise = Math.floor(Math.sin(x * 0.05) * Math.cos(y * 0.05) * 8);
      data[idx] = Math.max(0, Math.min(255, base + subtleNoise));
    }
  }

  // 2. Winding River
  if (features.riverY !== undefined) {
    const rY = features.riverY;
    const thick = features.riverThickness ?? 18;
    for (let x = 0; x < width; x++) {
      const curve = Math.round(Math.sin((x / width) * Math.PI * 2) * 16);
      const cy = rY + curve;
      for (let dy = -thick; dy <= thick; dy++) {
        const y = cy + dy;
        if (y >= 0 && y < height) {
          data[y * width + x] = 75; // River is dark water
        }
      }
    }
  }

  // 3. Roads
  if (features.roads) {
    for (const road of features.roads) {
      const steps = Math.max(Math.abs(road.x2 - road.x1), Math.abs(road.y2 - road.y1)) * 2;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = Math.round(road.x1 + t * (road.x2 - road.x1));
        const cy = Math.round(road.y1 + t * (road.y2 - road.y1));
        const halfW = Math.floor(road.width / 2);
        for (let dy = -halfW; dy <= halfW; dy++) {
          for (let dx = -halfW; dx <= halfW; dx++) {
            const px = cx + dx;
            const py = cy + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              data[py * width + px] = road.luminance;
            }
          }
        }
      }
    }
  }

  // 4. Rectangular structures / anomalies
  if (features.rectangles) {
    for (const rect of features.rectangles) {
      for (let y = rect.y; y < rect.y + rect.h; y++) {
        for (let x = rect.x; x < rect.x + rect.w; x++) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            data[y * width + x] = rect.luminance;
          }
        }
      }
    }
  }

  return {
    id,
    label,
    width,
    height,
    data,
  };
}

// ==========================================================================
// 1. Sector 34 Tactical Logistics Hub (4 Candidate Alterations)
// ==========================================================================
const S34_WIDTH = 500;
const S34_HEIGHT = 300;

export const SECTOR_34_PAIR: SamplePair = {
  id: 'pair-sector-34',
  title: 'Sector 34 Tactical Logistics Hub',
  subtitle: 'Sector 34, pair 1 of 4 (Tactical Arterial & Depot Recon)',
  zoneName: 'Sector 34 Logistics Perimeter',
  beforeImageId: 'IMG-S34-BASE-001',
  afterImageId: 'IMG-S34-POST-001',
  beforeLabel: 'Before, 06 Oct (Baseline Optical)',
  afterLabel: 'After, 24 Oct (Surveillance Sweep)',
  description: 'Multi-temporal reconnaissance comparison of Sector 34 supply depot and arterial junction.',
  isSynthetic: true,
  width: S34_WIDTH,
  height: S34_HEIGHT,
  centerCoordinates: { lat: 34.0588, lng: -118.2391 },
  getBeforeMatrix: () => {
    return createSyntheticSceneMatrix('IMG-S34-BASE-001', 'Sector 34 Baseline', S34_WIDTH, S34_HEIGHT, {
      baseLuminance: 165,
      riverY: 240,
      riverThickness: 16,
      roads: [
        { x1: 0, y1: 150, x2: 500, y2: 150, width: 8, luminance: 195 },
        { x1: 250, y1: 0, x2: 450, y2: 300, width: 10, luminance: 205 },
      ],
      rectangles: [
        // Intact compound buildings
        { x: 120, y: 70, w: 45, h: 35, luminance: 220 },
        { x: 320, y: 55, w: 75, h: 55, luminance: 155 }, // Undeveloped vegetated patch
        { x: 415, y: 150, w: 55, h: 30, luminance: 165 }, // Empty staging ground
      ],
    });
  },
  getAfterMatrix: () => {
    return createSyntheticSceneMatrix('IMG-S34-POST-001', 'Sector 34 Surveillance Recon', S34_WIDTH, S34_HEIGHT, {
      baseLuminance: 165,
      riverY: 240,
      riverThickness: 16,
      roads: [
        { x1: 0, y1: 150, x2: 500, y2: 150, width: 8, luminance: 195 },
        { x1: 250, y1: 0, x2: 450, y2: 300, width: 10, luminance: 205 },
      ],
      rectangles: [
        // Building modification (Anomaly 4: Structure alteration)
        { x: 120, y: 70, w: 45, h: 35, luminance: 245 }, // Delta ~25
        // Alteration 1: Roadway crater / surface alteration at x: 360, y: 195, w: 85, h: 45
        { x: 360, y: 195, w: 85, h: 45, luminance: 55 }, // Delta = 140 (high contrast crater)
        // Alteration 2: Cleared staging ground compound at x: 320, y: 55, w: 75, h: 55
        { x: 320, y: 55, w: 75, h: 55, luminance: 235 }, // Delta = 80 (bright soil clearing)
        // Alteration 3: Relocated vehicle convoy cluster at x: 415, y: 150, w: 55, h: 30
        { x: 415, y: 150, w: 55, h: 30, luminance: 40 }, // Delta = 125 (dark vehicle shapes)
      ],
    });
  },
  getBeforeSvg: (theme = 'light') => {
    const isDark = theme === 'dark';
    const bg = isDark ? '#170909' : '#EDF0E6';
    const water = isDark ? '#2A1816' : '#BFDCE8';
    const road = isDark ? '#4D2420' : '#D0D8CD';
    const building = isDark ? '#6E322B' : '#B8C4B5';
    const forest = isDark ? '#231211' : '#D5E5C9';
    const grid = isDark ? '#3B1816' : '#9EB4A4';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="100%" height="100%" style="background:${bg}">
      <!-- Grid -->
      <line x1="0" y1="75" x2="500" y2="75" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>
      <line x1="0" y1="150" x2="500" y2="150" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>
      <line x1="0" y1="225" x2="500" y2="225" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>
      <line x1="125" y1="0" x2="125" y2="300" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>
      <line x1="250" y1="0" x2="250" y2="300" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>
      <line x1="375" y1="0" x2="375" y2="300" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>

      <!-- Waterway / River -->
      <path d="M 0,240 Q 150,220 280,245 T 500,230" fill="none" stroke="${water}" stroke-width="26" stroke-linecap="round"/>

      <!-- Topography Contours -->
      <ellipse cx="140" cy="90" rx="65" ry="40" fill="none" stroke="${isDark ? '#5C221D' : '#C2AE86'}" stroke-width="1.2" opacity="0.6"/>
      <ellipse cx="360" cy="90" rx="80" ry="50" fill="${forest}" opacity="0.5"/>

      <!-- Primary Arterial Highway -->
      <line x1="0" y1="150" x2="500" y2="150" stroke="${road}" stroke-width="12" stroke-linecap="round"/>
      <line x1="250" y1="0" x2="450" y2="300" stroke="${road}" stroke-width="14" stroke-linecap="round"/>

      <!-- Compound Structure -->
      <rect x="120" y="70" width="45" height="35" fill="${building}" stroke="${isDark ? '#8A3B33' : '#8D9A8F'}" stroke-width="1.2"/>
      <text x="142" y="92" fill="${isDark ? '#FFB3A3' : '#556270'}" font-size="9" font-family="sans-serif" font-weight="700" text-anchor="middle">DEPOT-1</text>
    </svg>`;
  },
  getAfterSvg: (theme = 'light') => {
    const isDark = theme === 'dark';
    const bg = isDark ? '#170909' : '#EDF0E6';
    const water = isDark ? '#2A1816' : '#BFDCE8';
    const road = isDark ? '#4D2420' : '#D0D8CD';
    const building = isDark ? '#6E322B' : '#B8C4B5';
    const forest = isDark ? '#231211' : '#D5E5C9';
    const grid = isDark ? '#3B1816' : '#9EB4A4';
    const accent = isDark ? '#FF5A3C' : '#E8590C';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="100%" height="100%" style="background:${bg}">
      <!-- Grid -->
      <line x1="0" y1="75" x2="500" y2="75" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>
      <line x1="0" y1="150" x2="500" y2="150" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>
      <line x1="0" y1="225" x2="500" y2="225" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>
      <line x1="125" y1="0" x2="125" y2="300" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>
      <line x1="250" y1="0" x2="250" y2="300" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>
      <line x1="375" y1="0" x2="375" y2="300" stroke="${grid}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.4"/>

      <!-- Waterway / River -->
      <path d="M 0,240 Q 150,220 280,245 T 500,230" fill="none" stroke="${water}" stroke-width="26" stroke-linecap="round"/>

      <!-- Topography Contours -->
      <ellipse cx="140" cy="90" rx="65" ry="40" fill="none" stroke="${isDark ? '#5C221D' : '#C2AE86'}" stroke-width="1.2" opacity="0.6"/>

      <!-- Forest with clearing visible -->
      <ellipse cx="360" cy="90" rx="80" ry="50" fill="${forest}" opacity="0.3"/>

      <!-- Primary Arterial Highway -->
      <line x1="0" y1="150" x2="500" y2="150" stroke="${road}" stroke-width="12" stroke-linecap="round"/>
      <line x1="250" y1="0" x2="450" y2="300" stroke="${road}" stroke-width="14" stroke-linecap="round"/>

      <!-- Structure -->
      <rect x="120" y="70" width="45" height="35" fill="${building}" stroke="${isDark ? '#FF8C7A' : '#16202E'}" stroke-width="1.6"/>
      <text x="142" y="92" fill="${isDark ? '#FFB3A3' : '#16202E'}" font-size="9" font-family="sans-serif" font-weight="700" text-anchor="middle">DEPOT-1</text>

      <!-- VISIBLE ALTERATION 1: Roadway crater disturbance at [360, 195, 85, 45] -->
      <ellipse cx="400" cy="217" rx="40" ry="20" fill="${isDark ? '#2D0A08' : '#735F48'}" opacity="0.85"/>
      <path d="M 370,225 L 435,210" stroke="${isDark ? '#8A3B33' : '#4A3D2D'}" stroke-width="3" stroke-linecap="round"/>

      <!-- VISIBLE ALTERATION 2: Cleared Compound at [320, 55, 75, 55] -->
      <polygon points="325,60 390,55 395,105 330,110" fill="${isDark ? '#3D1B18' : '#F6F0DD'}" stroke="${isDark ? '#6E322B' : '#C8BC9D'}" stroke-width="1.2"/>

      <!-- VISIBLE ALTERATION 3: Staged vehicle convoy at [415, 150, 55, 30] -->
      <rect x="420" y="155" width="10" height="6" fill="${isDark ? '#FFA394' : '#16202E'}"/>
      <rect x="435" y="155" width="10" height="6" fill="${isDark ? '#FFA394' : '#16202E'}"/>
      <rect x="450" y="155" width="10" height="6" fill="${isDark ? '#FFA394' : '#16202E'}"/>
      <rect x="428" y="166" width="10" height="6" fill="${isDark ? '#FFA394' : '#16202E'}"/>
      <rect x="443" y="166" width="10" height="6" fill="${isDark ? '#FFA394' : '#16202E'}"/>
    </svg>`;
  },
};

// ==========================================================================
// 2. East Canal Embankment (Infrastructure Breach Anomaly)
// ==========================================================================
const CANAL_WIDTH = 500;
const CANAL_HEIGHT = 300;

export const EAST_CANAL_PAIR: SamplePair = {
  id: 'pair-east-canal',
  title: 'East Canal Embankment',
  subtitle: 'Sector Bravo Canal, pair 2 of 4 (Waterway Security)',
  zoneName: 'East Canal Sector Bravo',
  beforeImageId: 'IMG-EC-BASE-002',
  afterImageId: 'IMG-EC-POST-002',
  beforeLabel: 'Before, 18 Oct (Baseline Canal)',
  afterLabel: 'After, 25 Oct (Patrol Sweep)',
  description: 'Hydro-engineering surveillance monitoring of East Canal retaining wall and levee integrity.',
  isSynthetic: true,
  width: CANAL_WIDTH,
  height: CANAL_HEIGHT,
  centerCoordinates: { lat: 34.061, lng: -118.239 },
  getBeforeMatrix: () => {
    return createSyntheticSceneMatrix('IMG-EC-BASE-002', 'East Canal Baseline', CANAL_WIDTH, CANAL_HEIGHT, {
      baseLuminance: 170,
      riverY: 150,
      riverThickness: 32,
      roads: [
        { x1: 0, y1: 100, x2: 500, y2: 100, width: 8, luminance: 200 },
        { x1: 0, y1: 200, x2: 500, y2: 200, width: 8, luminance: 200 },
      ],
      rectangles: [
        { x: 220, y: 125, w: 65, h: 50, luminance: 75 }, // Intact canal waterway
      ],
    });
  },
  getAfterMatrix: () => {
    return createSyntheticSceneMatrix('IMG-EC-POST-002', 'East Canal Patrol Sweep', CANAL_WIDTH, CANAL_HEIGHT, {
      baseLuminance: 170,
      riverY: 150,
      riverThickness: 32,
      roads: [
        { x1: 0, y1: 100, x2: 500, y2: 100, width: 8, luminance: 200 },
        { x1: 0, y1: 200, x2: 500, y2: 200, width: 8, luminance: 200 },
      ],
      rectangles: [
        // Embankment breach / flooded terrain alteration at [220, 115, 65, 70]
        { x: 220, y: 115, w: 65, h: 70, luminance: 230 }, // Delta = 155 (structural collapse / water runoff)
      ],
    });
  },
  getBeforeSvg: (theme = 'light') => {
    const isDark = theme === 'dark';
    const bg = isDark ? '#170909' : '#EDF0E6';
    const water = isDark ? '#2A1816' : '#BFDCE8';
    const road = isDark ? '#4D2420' : '#D0D8CD';
    const embankment = isDark ? '#5C221D' : '#8D9A8F';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="100%" height="100%" style="background:${bg}">
      <!-- Canal Bed -->
      <rect x="0" y="115" width="500" height="70" fill="${water}"/>
      <!-- Retaining Walls -->
      <line x1="0" y1="115" x2="500" y2="115" stroke="${embankment}" stroke-width="4"/>
      <line x1="0" y1="185" x2="500" y2="185" stroke="${embankment}" stroke-width="4"/>
      <!-- North & South Access Roads -->
      <line x1="0" y1="95" x2="500" y2="95" stroke="${road}" stroke-width="8"/>
      <line x1="0" y1="205" x2="500" y2="205" stroke="${road}" stroke-width="8"/>
    </svg>`;
  },
  getAfterSvg: (theme = 'light') => {
    const isDark = theme === 'dark';
    const bg = isDark ? '#170909' : '#EDF0E6';
    const water = isDark ? '#2A1816' : '#BFDCE8';
    const road = isDark ? '#4D2420' : '#D0D8CD';
    const embankment = isDark ? '#5C221D' : '#8D9A8F';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="100%" height="100%" style="background:${bg}">
      <!-- Canal Bed -->
      <rect x="0" y="115" width="500" height="70" fill="${water}"/>
      <!-- Retaining Walls with breach at x: 220..285 -->
      <line x1="0" y1="115" x2="220" y2="115" stroke="${embankment}" stroke-width="4"/>
      <line x1="285" y1="115" x2="500" y2="115" stroke="${embankment}" stroke-width="4"/>
      <line x1="0" y1="185" x2="500" y2="185" stroke="${embankment}" stroke-width="4"/>

      <!-- Alteration: Embankment collapse breach & water washout -->
      <path d="M 220,115 Q 250,75 285,115 Z" fill="${water}" stroke="${isDark ? '#FF5A3C' : '#E8590C'}" stroke-width="1.6"/>
      <ellipse cx="250" cy="115" rx="30" ry="25" fill="${isDark ? '#3D1B18' : '#E2D1B2'}" opacity="0.8"/>

      <!-- North & South Access Roads -->
      <line x1="0" y1="95" x2="500" y2="95" stroke="${road}" stroke-width="8"/>
      <line x1="0" y1="205" x2="500" y2="205" stroke="${road}" stroke-width="8"/>
    </svg>`;
  },
};

// ==========================================================================
// 3. Sector Bravo Baseline Calibration (Identical Pair — Zero Changes)
// ==========================================================================
const IDENTICAL_WIDTH = 500;
const IDENTICAL_HEIGHT = 300;

export const IDENTICAL_PAIR: SamplePair = {
  id: 'pair-identical',
  title: 'Sector Bravo Baseline (Identical Pair — Zero Changes)',
  subtitle: 'Sector Bravo, pair 3 of 4 (False-Positive Control Test)',
  zoneName: 'Sector Bravo Calibration Sector',
  beforeImageId: 'IMG-IDEN-BASE-003',
  afterImageId: 'IMG-IDEN-VERIF-003',
  beforeLabel: 'Baseline Sweep A (Pass 1)',
  afterLabel: 'Verification Sweep B (Pass 2, 0 Δ)',
  description: 'Identical satellite matrices verifying that the change detection algorithm produces 0 false candidates when comparing identical scenes.',
  isSynthetic: true,
  width: IDENTICAL_WIDTH,
  height: IDENTICAL_HEIGHT,
  centerCoordinates: { lat: 34.0535, lng: -118.246 },
  getBeforeMatrix: () => {
    return createSyntheticSceneMatrix('IMG-IDEN-BASE-003', 'Sector Bravo Baseline', IDENTICAL_WIDTH, IDENTICAL_HEIGHT, {
      baseLuminance: 160,
      riverY: 180,
      riverThickness: 20,
      roads: [{ x1: 50, y1: 50, x2: 450, y2: 250, width: 8, luminance: 210 }],
      rectangles: [{ x: 150, y: 100, w: 50, h: 40, luminance: 190 }],
    });
  },
  getAfterMatrix: () => {
    // Exact clone of Before matrix — delta = 0 across every single pixel!
    return createSyntheticSceneMatrix('IMG-IDEN-VERIF-003', 'Sector Bravo Verification (Identical)', IDENTICAL_WIDTH, IDENTICAL_HEIGHT, {
      baseLuminance: 160,
      riverY: 180,
      riverThickness: 20,
      roads: [{ x1: 50, y1: 50, x2: 450, y2: 250, width: 8, luminance: 210 }],
      rectangles: [{ x: 150, y: 100, w: 50, h: 40, luminance: 190 }],
    });
  },
  getBeforeSvg: (theme = 'light') => {
    const isDark = theme === 'dark';
    const bg = isDark ? '#170909' : '#EDF0E6';
    const water = isDark ? '#2A1816' : '#BFDCE8';
    const road = isDark ? '#4D2420' : '#D0D8CD';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="100%" height="100%" style="background:${bg}">
      <path d="M 0,180 Q 250,150 500,190" fill="none" stroke="${water}" stroke-width="24"/>
      <line x1="50" y1="50" x2="450" y2="250" stroke="${road}" stroke-width="10"/>
      <rect x="150" y="100" width="50" height="40" fill="${isDark ? '#4A1D1A' : '#C3CCC1'}"/>
      <text x="250" y="280" fill="${isDark ? '#B8665A' : '#556270'}" font-size="11" font-weight="700" text-anchor="middle">CALIBRATION SCENE (IDENTICAL CONTROL)</text>
    </svg>`;
  },
  getAfterSvg: (theme = 'light') => {
    // Visually and mathematically identical
    return IDENTICAL_PAIR.getBeforeSvg(theme);
  },
};

// ==========================================================================
// 4. Algorithm Calibration Grid (Person 3 Known 4x4 Fixture)
// ==========================================================================
export const CALIBRATION_GRID_PAIR: SamplePair = {
  id: 'pair-calibration',
  title: 'Calibration Grid (Known 4x4 Structural Difference)',
  subtitle: 'Sector Bravo, pair 4 of 4 (Deterministic Fixture)',
  zoneName: 'Algorithm Test Bench Grid',
  beforeImageId: 'IMG-B-002',
  afterImageId: 'IMG-A-002',
  beforeLabel: 'Matrix Fixture (Baseline)',
  afterLabel: 'Matrix Fixture (+120 delta at [6,6,4,4])',
  description: 'Pure 16x16 test fixture matching Person 3 algorithm verification suite with an injected 4x4 alteration at [x: 6..9, y: 6..9].',
  isSynthetic: true,
  width: 16,
  height: 16,
  centerCoordinates: { lat: 34.05, lng: -118.25 },
  getBeforeMatrix: () => {
    return {
      id: 'IMG-B-002',
      label: 'Sector Bravo Pre-Incident',
      width: 16,
      height: 16,
      data: new Array(16 * 16).fill(80),
    };
  },
  getAfterMatrix: () => {
    const after = {
      id: 'IMG-A-002',
      label: 'Sector Bravo Post-Incident',
      width: 16,
      height: 16,
      data: new Array(16 * 16).fill(80),
    };
    for (let y = 6; y <= 9; y++) {
      for (let x = 6; x <= 9; x++) {
        after.data[y * 16 + x] = 200; // Delta = 120
      }
    }
    return after;
  },
  getBeforeSvg: (theme = 'light') => {
    const isDark = theme === 'dark';
    const bg = isDark ? '#170909' : '#EDF0E6';
    const gridLine = isDark ? '#3B1816' : '#C3CCC1';
    const cell = isDark ? '#2D0A08' : '#8D9A8F';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="100%" height="100%" style="background:${bg}">
      <rect width="16" height="16" fill="${cell}"/>
      ${Array.from({ length: 16 })
        .map((_, i) => `<line x1="${i}" y1="0" x2="${i}" y2="16" stroke="${gridLine}" stroke-width="0.08"/>`)
        .join('')}
      ${Array.from({ length: 16 })
        .map((_, i) => `<line x1="0" y1="${i}" x2="16" y2="${i}" stroke="${gridLine}" stroke-width="0.08"/>`)
        .join('')}
    </svg>`;
  },
  getAfterSvg: (theme = 'light') => {
    const isDark = theme === 'dark';
    const bg = isDark ? '#170909' : '#EDF0E6';
    const gridLine = isDark ? '#3B1816' : '#C3CCC1';
    const cell = isDark ? '#2D0A08' : '#8D9A8F';
    const anomaly = isDark ? '#FF5A3C' : '#E8590C';

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="100%" height="100%" style="background:${bg}">
      <rect width="16" height="16" fill="${cell}"/>
      <rect x="6" y="6" width="4" height="4" fill="${anomaly}"/>
      ${Array.from({ length: 16 })
        .map((_, i) => `<line x1="${i}" y1="0" x2="${i}" y2="16" stroke="${gridLine}" stroke-width="0.08"/>`)
        .join('')}
      ${Array.from({ length: 16 })
        .map((_, i) => `<line x1="0" y1="${i}" x2="16" y2="${i}" stroke="${gridLine}" stroke-width="0.08"/>`)
        .join('')}
    </svg>`;
  },
};

export const BUNDLED_SAMPLE_PAIRS: SamplePair[] = [
  SECTOR_34_PAIR,
  EAST_CANAL_PAIR,
  IDENTICAL_PAIR,
  CALIBRATION_GRID_PAIR,
];
