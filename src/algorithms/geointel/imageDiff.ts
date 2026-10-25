export type {
  CandidateRegion,
  BoundingBox,
  GeoIntelReport
} from '../../../shared/contracts';
import type {
  CandidateRegion,
  BoundingBox,
  GeoIntelReport
} from '../../../shared/contracts';

export interface ImageMatrix {
  id: string;
  label: string;
  width: number;
  height: number;
  data: number[]; // Flat array of grayscale intensity [0, 255] of length width * height
}

export interface DiffAlgorithmSettings {
  threshold: number;      // Minimum pixel intensity delta [0..255] to flag (default: 35)
  minRegionSize: number;  // Minimum connected cluster size in pixels (default: 4)
}

export const DEFAULT_DIFF_SETTINGS: DiffAlgorithmSettings = {
  threshold: 35,
  minRegionSize: 4
};

/**
 * Validates matrix dimensions and bounds
 */
export function validateImageMatrices(before: ImageMatrix, after: ImageMatrix): void {
  if (!before || !after) {
    throw new Error('Both before and after image matrices are required');
  }
  if (before.width <= 0 || before.height <= 0 || after.width <= 0 || after.height <= 0) {
    throw new Error('Image dimensions must be positive non-zero integers');
  }
  if (before.width !== after.width || before.height !== after.height) {
    throw new Error(
      `Dimension mismatch: Before image is ${before.width}x${before.height}, but After image is ${after.width}x${after.height}`
    );
  }
  if (before.data.length !== before.width * before.height) {
    throw new Error(`Corrupt matrix data: expected ${before.width * before.height} pixels, got ${before.data.length}`);
  }
  if (after.data.length !== after.width * after.height) {
    throw new Error(`Corrupt matrix data: expected ${after.width * after.height} pixels, got ${after.data.length}`);
  }
}

/**
 * Deterministic Image Difference & Region Clustering Algorithm
 */
export class GeoIntelImageDiff {
  private settings: DiffAlgorithmSettings;
  private candidateCounter: number = 100;

  constructor(settings?: Partial<DiffAlgorithmSettings>) {
    this.settings = {
      ...DEFAULT_DIFF_SETTINGS,
      ...settings
    };
  }

  /**
   * Run matrix difference and cluster connected changed pixels into candidate regions
   */
  public analyze(before: ImageMatrix, after: ImageMatrix): CandidateRegion[] {
    validateImageMatrices(before, after);

    const width = before.width;
    const height = before.height;
    const diffGrid: number[] = new Array(width * height).fill(0);
    const flaggedMask: boolean[] = new Array(width * height).fill(false);

    // Step 1: Pixel-by-pixel intensity difference
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const delta = Math.abs(after.data[idx] - before.data[idx]);
        diffGrid[idx] = delta;
        if (delta >= this.settings.threshold) {
          flaggedMask[idx] = true;
        }
      }
    }

    // Step 2: Connected Component Labeling (Breadth-First Search cluster grouping)
    const visited: boolean[] = new Array(width * height).fill(false);
    const candidateRegions: CandidateRegion[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (flaggedMask[idx] && !visited[idx]) {
          // BFS to flood fill the component
          const queue: [number, number][] = [[x, y]];
          visited[idx] = true;

          let minX = x;
          let maxX = x;
          let minY = y;
          let maxY = y;
          let pixelCount = 0;
          let totalDelta = 0;

          while (queue.length > 0) {
            const [cx, cy] = queue.shift()!;
            const cIdx = cy * width + cx;
            pixelCount++;
            totalDelta += diffGrid[cIdx];

            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            // 4-neighborhood exploration
            const neighbors: [number, number][] = [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1]
            ];

            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (flaggedMask[nIdx] && !visited[nIdx]) {
                  visited[nIdx] = true;
                  queue.push([nx, ny]);
                }
              }
            }
          }

          // Step 3: Filter by minimum component size
          if (pixelCount >= this.settings.minRegionSize) {
            const bbox: BoundingBox = {
              x: minX,
              y: minY,
              width: maxX - minX + 1,
              height: maxY - minY + 1
            };
            const avgDelta = totalDelta / pixelCount;
            const normalizedScore = Number((avgDelta / 255).toFixed(3));

            const candidate: CandidateRegion = {
              id: `CAN-${this.candidateCounter++}`,
              beforeImageId: before.id,
              afterImageId: after.id,
              bbox,
              differenceScore: normalizedScore,
              areaPixels: pixelCount,
              algorithmSettings: { ...this.settings },
              explanation: `Candidate change detected across ${pixelCount} pixels at [${minX}, ${minY}] (area: ${bbox.width}x${bbox.height}). Mean intensity delta: ${avgDelta.toFixed(1)}/255 (threshold: ${this.settings.threshold}).`,
              reviewStatus: 'unreviewed',
              createdAt: new Date().toISOString(),
              isSimulated: true
            };

            candidateRegions.push(candidate);
          }
        }
      }
    }

    return candidateRegions;
  }

  /**
   * Transition candidate review status to confirmed
   */
  public confirmCandidate(candidate: CandidateRegion, analystNotes: string): CandidateRegion {
    return {
      ...candidate,
      reviewStatus: 'confirmed',
      analystNotes: analystNotes.trim()
    };
  }

  /**
   * Transition candidate review status to dismissed
   */
  public dismissCandidate(candidate: CandidateRegion, reason: string): CandidateRegion {
    return {
      ...candidate,
      reviewStatus: 'dismissed',
      analystNotes: reason.trim()
    };
  }

  /**
   * Generate finalized report bundle with mandatory limitation disclaimers
   */
  public compileReport(
    reportTitle: string,
    beforeImageId: string,
    afterImageId: string,
    candidates: CandidateRegion[],
    analystSummary: string
  ): GeoIntelReport {
    const confirmedCount = candidates.filter(c => c.reviewStatus === 'confirmed').length;
    const dismissedCount = candidates.filter(c => c.reviewStatus === 'dismissed').length;

    return {
      id: `GIR-${Date.now()}`,
      title: reportTitle,
      beforeImageId,
      afterImageId,
      candidateRegions: candidates.map(c => ({ ...c })),
      confirmedCount,
      dismissedCount,
      analystSummary,
      limitationsDisclaimer:
        'DISCLAIMER: Algorithmic image difference scores represent candidate radiometric changes. Differences may stem from sun angles, shadows, cloud cover, camera alignment, or lossy compression rather than physical ground activity. Analyst ground-truth verification is required.',
      generatedAt: new Date().toISOString()
    };
  }
}

// ==========================================
// Pre-bundled Deterministic Test Fixtures
// ==========================================

/**
 * Creates an aligned 16x16 synthetic matrix
 */
export function createSyntheticMatrix(id: string, label: string, fillValue: number = 100): ImageMatrix {
  return {
    id,
    label,
    width: 16,
    height: 16,
    data: new Array(16 * 16).fill(fillValue)
  };
}

/**
 * Fixture: Identical before & after pair (should yield 0 candidates)
 */
export function getIdenticalMatrixFixture(): { before: ImageMatrix; after: ImageMatrix } {
  return {
    before: createSyntheticMatrix('IMG-B-001', 'Baseline Sector Bravo', 120),
    after: createSyntheticMatrix('IMG-A-001', 'Recon Sweep Sector Bravo', 120)
  };
}

/**
 * Fixture: Known structural change (a 4x4 block with delta +80 in center)
 */
export function getKnownDifferenceMatrixFixture(): {
  before: ImageMatrix;
  after: ImageMatrix;
  expectedBbox: BoundingBox;
} {
  const before = createSyntheticMatrix('IMG-B-002', 'Sector Bravo Pre-Incident', 80);
  const after = createSyntheticMatrix('IMG-A-002', 'Sector Bravo Post-Incident', 80);

  // Inject a 4x4 alteration at x: 6..9, y: 6..9 (intensity jumps from 80 to 200)
  for (let y = 6; y <= 9; y++) {
    for (let x = 6; x <= 9; x++) {
      after.data[y * 16 + x] = 200; // Delta = 120 (well above default threshold of 35)
    }
  }

  return {
    before,
    after,
    expectedBbox: { x: 6, y: 6, width: 4, height: 4 }
  };
}
