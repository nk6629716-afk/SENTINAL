import crypto from 'crypto';
import { db } from '../db/database';
import {
  SoldierProfile,
  SoldierVitalsRecord,
  CreateSoldierVitalsInput,
} from '../../../shared/types';
import { eventBus } from '../realtime/eventBus';

export class SoldierVitalsService {
  public listSoldiers(): SoldierProfile[] {
    return db.getSoldiers();
  }

  public getSoldierById(id: string): SoldierProfile | null {
    return db.getSoldierById(id);
  }

  public listVitals(soldierId?: string): SoldierVitalsRecord[] {
    return db.getSoldierVitals(soldierId);
  }

  public getVitalById(id: string): SoldierVitalsRecord | null {
    return db.getSoldierVitalById(id);
  }

  public recordVitals(input: CreateSoldierVitalsInput, recordedBy: string): SoldierVitalsRecord {
    const soldier = db.getSoldierById(input.soldierId);
    if (!soldier) {
      throw new Error(`Soldier with ID '${input.soldierId}' not found in active operational roster`);
    }

    const id = `VTL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    const record: SoldierVitalsRecord = {
      id,
      soldierId: soldier.id,
      callsign: soldier.callsign,
      unit: soldier.unit,
      timestamp: input.timestamp || now,
      heartRateBpm: input.heartRateBpm,
      bloodPressureSystolic: input.bloodPressureSystolic,
      bloodPressureDiastolic: input.bloodPressureDiastolic,
      temperatureCelsius: input.temperatureCelsius,
      oxygenSaturationPct: input.oxygenSaturationPct,
      respiratoryRateBpm: input.respiratoryRateBpm,
      clinicalNotes: input.clinicalNotes,
      recordedBy: recordedBy || 'system',
      createdAt: now,
      updatedAt: now,
      isSimulated: true,
    };

    const saved = db.saveSoldierVitals(record);
    eventBus.publish('vitals:recorded' as any, saved);
    return saved;
  }
}

export const soldierVitalsService = new SoldierVitalsService();
