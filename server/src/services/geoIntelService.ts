import crypto from 'crypto';
import { db } from '../db/database';
import {
  GeoIntelObservation,
  CreateGeoObservationInput,
  UpdateGeoObservationInput,
} from '../../../shared/types';
import { eventBus } from '../realtime/eventBus';

export class GeoIntelService {
  public listObservations(filter?: { reviewStatus?: string; samplePairId?: string }): GeoIntelObservation[] {
    return db.getObservations(filter);
  }

  public getObservationById(id: string): GeoIntelObservation | null {
    return db.getObservationById(id);
  }

  public createObservation(input: CreateGeoObservationInput): GeoIntelObservation {
    const id = `GEO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    const observation: GeoIntelObservation = {
      id,
      samplePairId: input.samplePairId,
      beforeImageId: input.beforeImageId,
      afterImageId: input.afterImageId,
      normalizedCoordinates: input.normalizedCoordinates,
      geoCoordinates: input.geoCoordinates,
      differenceScore: input.differenceScore,
      algorithmSettings: input.algorithmSettings,
      explanation: input.explanation,
      analystNotes: input.analystNotes || '',
      reviewStatus: 'pending_review',
      createdAt: now,
      updatedAt: now,
      isSimulated: true,
    };

    const saved = db.saveObservation(observation);
    eventBus.publish('geointel:candidate_added', saved);
    return saved;
  }

  public updateObservation(id: string, input: UpdateGeoObservationInput): GeoIntelObservation | null {
    const existing = db.getObservationById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated: GeoIntelObservation = {
      ...existing,
      reviewStatus: input.reviewStatus !== undefined ? input.reviewStatus : existing.reviewStatus,
      analystNotes: input.analystNotes !== undefined ? input.analystNotes : existing.analystNotes,
      reviewedAt: input.reviewStatus && input.reviewStatus !== 'pending_review' ? now : existing.reviewedAt,
      updatedAt: now,
    };

    const saved = db.saveObservation(updated);
    eventBus.publish('geointel:reviewed', saved);
    return saved;
  }
}

export const geoIntelService = new GeoIntelService();
