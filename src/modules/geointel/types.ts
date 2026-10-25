import { GeoIntelObservation, ChangeCandidate, BoundingBox } from '@shared/types';

export type ComparisonViewMode = 'swipe' | 'side-by-side' | 'heatmap';

export type CandidateReviewDecision = 
  | 'confirmed_threat'
  | 'benign_false_positive'
  | 'secondary_pass_required'
  | 'unreviewed';

export interface EnrichedChangeCandidate extends ChangeCandidate {
  decision: CandidateReviewDecision;
  mgrsCoordinate: string;
  latLng: { lat: number; lng: number };
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
  status: 'idle' | 'processing' | 'completed' | 'cancelled';
  progressPct: number;
  currentStage: string;
  executionTimeMs?: number;
  candidatesDetected?: number;
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
    sensitivityThreshold: number;
    kernelSize: string;
    noiseSuppression: boolean;
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
    mgrs: string;
    latLng: { lat: number; lng: number };
    decision: string;
    analystNotes: string;
    explanation: string;
  }>;
  overallAnalystAssessment: string;
  limitationDisclaimer: string;
}
