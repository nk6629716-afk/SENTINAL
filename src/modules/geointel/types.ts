import { GeoIntelObservation, ChangeCandidate, BoundingBox } from '@shared/types';
import { CandidateRegion } from '../../../shared/contracts';

export type ComparisonViewMode = 'swipe' | 'side-by-side';

export type CandidateReviewDecision = 
  | 'confirmed_threat'
  | 'benign_false_positive'
  | 'secondary_pass_required'
  | 'unreviewed';

export interface EnrichedChangeCandidate {
  id: string;
  label: string;
  anomalyType:
    | 'structure_alteration'
    | 'vehicle_movement'
    | 'terrain_disturbance'
    | 'vegetation_clearing';
  differenceScore: number; // 0.0 - 1.0 (e.g. 0.86 = 86% radiometric change)
  confidence: number;
  bbox: BoundingBox;
  boundingBox: BoundingBox;
  areaPixels: number;
  algorithmSettings: {
    threshold: number;
    minRegionSize: number;
  };
  explanation: string;
  reviewed: boolean;
  decision: CandidateReviewDecision;
  analystNotes?: string;
  latLng: { lat: number; lng: number };
  mgrsCoordinate: string;
  detectedAt: string;
  auditTrail: Array<{
    timestamp: string;
    analyst: string;
    action: string;
    notes?: string;
  }>;
}

export interface SensorMetadata {
  sensorId: string;
  platform: string;
  resolutionGsd: string;
  cloudCoverPct: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  spectralBands: string[];
  captureTimestamp: string;
}

export interface AnalysisState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progressPct: number;
  currentStage: string;
  executionTimeMs?: number;
  candidatesDetected?: number;
  errorMessage?: string;
}

export interface IntelligenceReportPayload {
  reportId: string;
  classification: string;
  generatedAt: string;
  analystCallsign: string;
  targetZone: string;
  aoiBoundingBox: {
    northLat: number;
    southLat: number;
    eastLng: number;
    westLng: number;
  };
  observation: {
    id: string;
    title: string;
    baselineCaptureDate: string;
    surveillanceCaptureDate: string;
    baselineSensor: SensorMetadata;
    surveillanceSensor: SensorMetadata;
  };
  analysisConfiguration: {
    algorithmName: string;
    sensitivityThreshold: number;
    minRegionSize: number;
    executionTimeMs: number;
  };
  summaryStats: {
    totalCandidates: number;
    confirmedThreats: number;
    benignFalsePositives: number;
    secondaryPassRequired: number;
    unreviewed: number;
  };
  candidates: Array<{
    id: string;
    label: string;
    type: string;
    confidencePct: number;
    diffScorePct: number;
    pixelBox: { x: number; y: number; width: number; height: number };
    areaPixels: number;
    mgrs: string;
    latLng: { lat: number; lng: number };
    decision: string;
    analystNotes: string;
    explanation: string;
  }>;
  overallAnalystAssessment: string;
  limitationDisclaimer: string;
  isSynthetic: true;
}
