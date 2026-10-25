import {
  ImageMatrix,
  CandidateRegion,
  validateImageMatrices
} from '../../../algorithms/geointel/imageDiff';
import { EnrichedChangeCandidate, CandidateReviewDecision } from '../types';
import { convertToMGRS } from './geoUtils';

export interface RasterOptions {
  targetWidth?: number;
  targetHeight?: number;
  id?: string;
  label?: string;
}

export const DEFAULT_RASTER_WIDTH = 256;
export const DEFAULT_RASTER_HEIGHT = 144;

/**
 * Safely loads an image in browser from a URL string, File, or Blob.
 * Handles CORS and object URL cleanup.
 */
export async function loadImageElement(source: string | File | Blob): Promise<HTMLImageElement> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    throw new Error('Image loading is only supported in browser environments with HTMLImageElement.');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;

    img.crossOrigin = 'anonymous';

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    img.onload = () => {
      cleanup();
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error('Invalid image: Dimensions are zero or unreadable.'));
        return;
      }
      resolve(img);
    };

    img.onerror = () => {
      cleanup();
      const srcSummary = typeof source === 'string' ? source : (source instanceof File ? source.name : 'Blob');
      reject(new Error(`Failed to decode image from source: ${srcSummary}. Corrupt file or unsupported format.`));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      try {
        objectUrl = URL.createObjectURL(source);
        img.src = objectUrl;
      } catch (err) {
        reject(new Error(`Failed to create object URL for image file: ${err instanceof Error ? err.message : String(err)}`));
      }
    }
  });
}

/**
 * Extracts grayscale intensity matrix [0..255] from an HTMLImageElement or HTMLCanvasElement.
 * Standardizes to target dimensions and cleans up temporary canvas memory.
 */
export function imageToMatrix(
  source: HTMLImageElement | HTMLCanvasElement,
  options?: RasterOptions
): ImageMatrix {
  if (typeof document === 'undefined') {
    throw new Error('Canvas extraction is only available in DOM/browser environments.');
  }

  const width = options?.targetWidth || DEFAULT_RASTER_WIDTH;
  const height = options?.targetHeight || DEFAULT_RASTER_HEIGHT;

  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid target dimensions: ${width}x${height}. Must be positive integers.`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to create 2D canvas rendering context.');
  }

  // Draw scaled image into canvas
  ctx.drawImage(source, 0, 0, width, height);

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, width, height);
  } catch (err) {
    canvas.width = 0;
    canvas.height = 0;
    throw new Error(`SecurityError: Canvas extraction blocked by cross-origin security: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Clean up canvas buffer immediately
  canvas.width = 0;
  canvas.height = 0;

  const rgba = imgData.data;
  const pixelCount = width * height;
  const data: number[] = new Array(pixelCount);

  // Standard ITU-R BT.601 luminance: 0.299 R + 0.587 G + 0.114 B
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    data[p] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return {
    id: options?.id || `IMG-${Date.now()}`,
    label: options?.label || 'Decoded Raster Matrix',
    width,
    height,
    data,
  };
}

/**
 * Loads and extracts matched ImageMatrix pairs from source URLs or Files.
 */
export async function loadAndRasterizePair(
  beforeSource: string | File | Blob,
  afterSource: string | File | Blob,
  options?: {
    width?: number;
    height?: number;
    beforeLabel?: string;
    afterLabel?: string;
  }
): Promise<{ before: ImageMatrix; after: ImageMatrix }> {
  const width = options?.width || DEFAULT_RASTER_WIDTH;
  const height = options?.height || DEFAULT_RASTER_HEIGHT;

  const [beforeImg, afterImg] = await Promise.all([
    loadImageElement(beforeSource),
    loadImageElement(afterSource),
  ]);

  // Validate perspective & aspect ratio compatibility
  const beforeAspect = beforeImg.naturalWidth / beforeImg.naturalHeight;
  const afterAspect = afterImg.naturalWidth / afterImg.naturalHeight;
  const aspectDelta = Math.abs(beforeAspect - afterAspect) / Math.max(beforeAspect, afterAspect);
  if (aspectDelta > 0.20) {
    throw new Error(
      `Incompatible image dimensions: Aspect ratios differ significantly (Before: ${beforeImg.naturalWidth}x${beforeImg.naturalHeight} [${beforeAspect.toFixed(2)}:1], After: ${afterImg.naturalWidth}x${afterImg.naturalHeight} [${afterAspect.toFixed(2)}:1]). Change detection requires matching perspective frames.`
    );
  }

  const beforeMatrix = imageToMatrix(beforeImg, {
    targetWidth: width,
    targetHeight: height,
    id: 'BEFORE',
    label: options?.beforeLabel || 'Baseline Image',
  });

  const afterMatrix = imageToMatrix(afterImg, {
    targetWidth: width,
    targetHeight: height,
    id: 'AFTER',
    label: options?.afterLabel || 'Surveillance Image',
  });

  validateImageMatrices(beforeMatrix, afterMatrix);

  return { before: beforeMatrix, after: afterMatrix };
}

/**
 * Creates deterministic synthetic terrain raster matrices representing the SVG map.
 * Used for deterministic visual synchronization and headless unit tests.
 */
export function rasterizeSyntheticSvgTerrain(
  isAfter: boolean,
  width: number = DEFAULT_RASTER_WIDTH,
  height: number = DEFAULT_RASTER_HEIGHT
): ImageMatrix {
  const data: number[] = new Array(width * height).fill(110); // Base ground

  // Hill 1 (center-left)
  const h1cx = Math.round(width * 0.32);
  const h1cy = Math.round(height * 0.44);
  const h1r = Math.round(width * 0.15);

  // Hill 2 (center-right)
  const h2cx = Math.round(width * 0.65);
  const h2cy = Math.round(height * 0.50);
  const h2r = Math.round(width * 0.18);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // River path: diagonal curve across bottom
      const riverY = Math.round(height * 0.72 + Math.sin(x / (width * 0.2)) * (height * 0.05));
      if (Math.abs(y - riverY) <= Math.round(height * 0.05)) {
        data[idx] = 45; // Dark water
        continue;
      }

      // Elevation contours on Hill 1
      const d1 = Math.sqrt((x - h1cx) ** 2 + (y - h1cy) ** 2);
      if (d1 < h1r) {
        data[idx] = Math.round(110 + (1 - d1 / h1r) * 60);
      }

      // Elevation contours on Hill 2
      const d2 = Math.sqrt((x - h2cx) ** 2 + (y - h2cy) ** 2);
      if (d2 < h2r) {
        data[idx] = Math.round(110 + (1 - d2 / h2r) * 50);
      }
    }
  }

  // If After state: inject structural alterations (matching 04-geointel-day.png)
  if (isAfter) {
    // 1. Cleared area polygon on Hill 2 (top right: x: 50%..65%, y: 15%..45%)
    const c2x1 = Math.round(width * 0.48);
    const c2x2 = Math.round(width * 0.65);
    const c2y1 = Math.round(height * 0.16);
    const c2y2 = Math.round(height * 0.44);
    for (let y = c2y1; y <= c2y2; y++) {
      for (let x = c2x1; x <= c2x2; x++) {
        // polygon shape
        if (x + y > c2x1 + c2y1 + 5 && x + y < c2x2 + c2y2 - 5) {
          data[y * width + x] = 220; // Cleared bare soil
        }
      }
    }

    // 2. Road cut across Hill 2 (x: 54%..76%, y: 62%..88%)
    const rStartX = Math.round(width * 0.54);
    const rEndX = Math.round(width * 0.76);
    for (let x = rStartX; x <= rEndX; x++) {
      const frac = (x - rStartX) / (rEndX - rStartX);
      const roadY = Math.round(height * 0.88 - frac * (height * 0.26));
      for (let dy = -2; dy <= 2; dy++) {
        const ry = roadY + dy;
        if (ry >= 0 && ry < height) {
          data[ry * width + x] = 235; // Bright gravel road
        }
      }
    }

    // 3. Vehicles parked (cluster at x: 60%..67%, y: 46%..54%)
    const vx1 = Math.round(width * 0.60);
    const vx2 = Math.round(width * 0.67);
    const vy1 = Math.round(height * 0.46);
    const vy2 = Math.round(height * 0.54);
    for (let y = vy1; y <= vy2; y++) {
      for (let x = vx1; x <= vx2; x++) {
        data[y * width + x] = 20; // Dark metallic vehicle signatures (delta = 90)
      }
    }

    // 4. Structure alteration on Hill 1 (x: 36%..44%, y: 52%..62%)
    const sx1 = Math.round(width * 0.36);
    const sx2 = Math.round(width * 0.44);
    const sy1 = Math.round(height * 0.52);
    const sy2 = Math.round(height * 0.62);
    for (let y = sy1; y <= sy2; y++) {
      for (let x = sx1; x <= sx2; x++) {
        data[y * width + x] = 210; // Concrete foundation footprint (delta = 100)
      }
    }
  }

  return {
    id: isAfter ? 'IMG-SYNTH-AFTER' : 'IMG-SYNTH-BEFORE',
    label: isAfter ? 'Surveillance Sweep' : 'Baseline Reference',
    width,
    height,
    data,
  };
}

/**
 * Maps a detected CandidateRegion to the UI's EnrichedChangeCandidate format
 * with precise normalized bounding boxes, MGRS coordinates, and clear non-military labels.
 */
export function mapRegionToCandidate(
  region: CandidateRegion,
  index: number,
  matrixWidth: number,
  matrixHeight: number,
  baseCoordinates: { lat: number; lng: number }
): EnrichedChangeCandidate {
  // Normalize matrix pixel coordinates to percentage [0..100]
  const normX = (region.bbox.x / matrixWidth) * 100;
  const normY = (region.bbox.y / matrixHeight) * 100;
  const normW = (region.bbox.width / matrixWidth) * 100;
  const normH = (region.bbox.height / matrixHeight) * 100;

  // Center point in normalized space [0..1]
  const centerX = (region.bbox.x + region.bbox.width / 2) / matrixWidth;
  const centerY = (region.bbox.y + region.bbox.height / 2) / matrixHeight;

  // Geographic coordinates mapping
  const lat = Number((baseCoordinates.lat + (0.5 - centerY) * 0.018).toFixed(5));
  const lng = Number((baseCoordinates.lng + (centerX - 0.5) * 0.024).toFixed(5));
  const mgrs = convertToMGRS(lat, lng);

  // Descriptive, objective labels (not claiming military targets or weapon recognition)
  let label = `Surface alteration C${index + 1}`;
  let anomalyType: EnrichedChangeCandidate['anomalyType'] = 'terrain_disturbance';

  const aspectRatio = region.bbox.width / Math.max(1, region.bbox.height);
  if (aspectRatio > 2.2 || aspectRatio < 0.45) {
    label = `Linear disturbance C${index + 1}`;
    anomalyType = 'terrain_disturbance';
  } else if (region.areaPixels < 20) {
    label = `Compact anomaly C${index + 1}`;
    anomalyType = 'structure_alteration';
  } else if (region.differenceScore > 0.6) {
    label = `High-contrast variance C${index + 1}`;
    anomalyType = 'vegetation_clearing';
  }

  const confidence = Math.min(
    0.98,
    Number((0.45 + region.differenceScore * 0.35 + Math.min(region.areaPixels, 50) / 100).toFixed(2))
  );

  return {
    id: `C${index + 1}`,
    label,
    anomalyType,
    differenceScore: region.differenceScore,
    confidence,
    boundingBox: {
      x: Number(normX.toFixed(1)),
      y: Number(normY.toFixed(1)),
      width: Number(normW.toFixed(1)),
      height: Number(normH.toFixed(1)),
    },
    reviewed: false,
    decision: 'unreviewed',
    explanation: region.explanation,
    latLng: { lat, lng },
    mgrsCoordinate: mgrs,
    detectedAt: region.createdAt || new Date().toISOString(),
    auditTrail: [
      {
        timestamp: new Date().toISOString(),
        analyst: 'GeoIntel Matrix Difference Algorithm',
        action: 'ALGORITHMIC_CHANGE_EXTRACTION',
        notes: `Extracted cluster of ${region.areaPixels} pixels (delta score ${region.differenceScore}, threshold >= ${region.algorithmSettings.threshold})`,
      },
    ],
  };
}
