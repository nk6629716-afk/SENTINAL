import crypto from 'crypto';
import { db } from '../db/database';
import {
  Incident,
  CreateIncidentInput,
  UpdateIncidentInput,
} from '../../../shared/types';
import { eventBus } from '../realtime/eventBus';

export class IncidentService {
  public listIncidents(filter?: {
    sourceModule?: string;
    type?: string;
    priority?: string;
    status?: string;
    search?: string;
  }): Incident[] {
    return db.getIncidents(filter);
  }

  public getIncidentById(id: string): Incident | null {
    return db.getIncidentById(id);
  }

  public createIncident(input: CreateIncidentInput): Incident {
    // Idempotency check: if clientId is supplied and already recorded
    if (input.clientId) {
      const existing = db.findIncidentByClientId(input.clientId);
      if (existing) {
        return existing;
      }
    }

    const id = `INC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    const incident: Incident = {
      id,
      clientId: input.clientId,
      sourceModule: input.sourceModule,
      type: input.type,
      priority: input.priority,
      status: input.status || 'active',
      title: input.title,
      notes: input.notes,
      location: input.location,
      createdAt: input.createdAt || now, // Preserve client creation timestamp
      updatedAt: now,
      syncedAt: now,
      isSimulated: true,
    };

    const saved = db.saveIncident(incident);
    eventBus.publish('incident:created', saved);
    return saved;
  }

  public updateIncident(id: string, input: UpdateIncidentInput): Incident | null {
    const existing = db.getIncidentById(id);
    if (!existing) {
      return null;
    }

    const updated: Incident = {
      ...existing,
      status: input.status !== undefined ? input.status : existing.status,
      priority: input.priority !== undefined ? input.priority : existing.priority,
      title: input.title !== undefined ? input.title : existing.title,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    const saved = db.saveIncident(updated);
    eventBus.publish('incident:updated', saved);
    return saved;
  }
}

export const incidentService = new IncidentService();
