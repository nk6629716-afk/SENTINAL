/**
 * SENTINEL Supabase Repository
 * Direct typed PostgreSQL data-access layer for real Supabase persistence.
 * Maps between application domain entities and public.sentinel_* database tables.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import {
  Incident,
  TelemetryTrack,
  Alert,
  GeoIntelObservation,
  Patient,
  HazardEdge,
  SyncItemResult,
  SoldierVitalsRecord,
} from '../../../shared/types';

export class SupabaseRepository {
  /**
   * Health ping against Supabase database instance.
   * Returns true if database connection and sentinel_incidents table are accessible.
   */
  public async ping(): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('sentinel_incidents')
        .select('id', { count: 'exact', head: true });

      return !error;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Incidents
  // --------------------------------------------------------------------------
  public async fetchIncidents(filter?: {
    sourceModule?: string;
    type?: string;
    priority?: string;
    status?: string;
    search?: string;
  }): Promise<Incident[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase.from('sentinel_incidents').select('*').order('created_at', { ascending: false });

    if (filter) {
      if (filter.sourceModule) query = query.eq('source_module', filter.sourceModule);
      if (filter.type) query = query.eq('type', filter.type);
      if (filter.priority) query = query.eq('priority', filter.priority);
      if (filter.status) query = query.eq('status', filter.status);
      if (filter.search) {
        query = query.or(`title.ilike.%${filter.search}%,notes.ilike.%${filter.search}%`);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('[SupabaseRepository] fetchIncidents error:', error.message);
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      clientId: row.client_id || undefined,
      sourceModule: row.source_module,
      type: row.type,
      priority: row.priority,
      status: row.status,
      title: row.title,
      notes: row.notes || '',
      location: row.location,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncedAt: row.synced_at || undefined,
      isSimulated: row.is_simulated ?? true,
    }));
  }

  public async fetchIncidentById(id: string): Promise<Incident | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('sentinel_incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`[SupabaseRepository] fetchIncidentById(${id}) error:`, error.message);
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    if (!data) return null;

    return {
      id: data.id,
      clientId: data.client_id || undefined,
      sourceModule: data.source_module,
      type: data.type,
      priority: data.priority,
      status: data.status,
      title: data.title,
      notes: data.notes || '',
      location: data.location,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      syncedAt: data.synced_at || undefined,
      isSimulated: data.is_simulated ?? true,
    };
  }

  public async fetchIncidentByClientId(clientId: string): Promise<Incident | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('sentinel_incidents')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      clientId: data.client_id,
      sourceModule: data.source_module,
      type: data.type,
      priority: data.priority,
      status: data.status,
      title: data.title,
      notes: data.notes || '',
      location: data.location,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      syncedAt: data.synced_at || undefined,
      isSimulated: data.is_simulated ?? true,
    };
  }

  public async upsertIncident(incident: Incident): Promise<Incident> {
    const supabase = getSupabaseClient();
    if (!supabase) return incident;

    const row = {
      id: incident.id,
      client_id: incident.clientId || null,
      source_module: incident.sourceModule,
      type: incident.type,
      priority: incident.priority,
      status: incident.status,
      title: incident.title,
      notes: incident.notes || '',
      location: incident.location,
      created_at: incident.createdAt,
      updated_at: incident.updatedAt || new Date().toISOString(),
      synced_at: incident.syncedAt || null,
      is_simulated: incident.isSimulated ?? true,
    };

    const { error } = await supabase.from('sentinel_incidents').upsert(row);
    if (error) {
      console.error('[SupabaseRepository] upsertIncident error:', error.message);
      throw new Error(`Failed to persist incident in Supabase: ${error.message}`);
    }

    return incident;
  }

  // --------------------------------------------------------------------------
  // Sync Registry (Idempotency)
  // --------------------------------------------------------------------------
  public async fetchSyncRegistryItem(clientId: string): Promise<SyncItemResult | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('sentinel_sync_registry')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      clientId: data.client_id,
      serverId: data.server_id,
      outcome: data.outcome as any,
      status: data.outcome as any,
      syncedAt: data.synced_at,
    };
  }

  public async upsertSyncRegistryItem(item: SyncItemResult): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const row = {
      client_id: item.clientId,
      server_id: item.serverId,
      outcome: item.outcome,
      synced_at: item.syncedAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('sentinel_sync_registry').upsert(row);
    if (error) {
      console.warn('[SupabaseRepository] upsertSyncRegistryItem error:', error.message);
    }
  }

  // --------------------------------------------------------------------------
  // Tracks & Alerts
  // --------------------------------------------------------------------------
  public async fetchTracks(): Promise<TelemetryTrack[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase.from('sentinel_tracks').select('*');
    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      callsign: r.callsign,
      type: r.type,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lng),
      altitude: parseFloat(r.altitude),
      speed: parseFloat(r.speed),
      heading: parseFloat(r.heading),
      timestamp: r.updated_at || new Date().toISOString(),
      status: r.status,
      flightHistory: r.flight_history || [],
      isSimulated: true,
    }));
  }

  public async fetchAlerts(filter?: { acknowledged?: boolean; trackId?: string }): Promise<Alert[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase.from('sentinel_alerts').select('*').order('created_at', { ascending: false });
    if (filter) {
      if (filter.acknowledged !== undefined) query = query.eq('acknowledged', filter.acknowledged);
      if (filter.trackId) query = query.eq('track_id', filter.trackId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      trackId: r.track_id || undefined,
      severity: r.severity as any,
      ruleName: (r.type as any) || 'speed_anomaly',
      observedValue: '',
      threshold: '',
      explanation: r.description,
      timestamp: r.created_at,
      acknowledged: r.acknowledged,
      acknowledgedAt: r.acknowledged_at || undefined,
      acknowledgedBy: r.acknowledged_by || undefined,
      isSimulated: true,
    }));
  }

  public async upsertAlert(alert: Alert): Promise<Alert> {
    const supabase = getSupabaseClient();
    if (!supabase) return alert;

    const row = {
      id: alert.id,
      track_id: alert.trackId || null,
      type: alert.ruleName,
      severity: alert.severity,
      description: alert.explanation || `${alert.ruleName} alert`,
      recommendation: null,
      acknowledged: alert.acknowledged,
      acknowledged_at: alert.acknowledgedAt || null,
      acknowledged_by: alert.acknowledgedBy || null,
      created_at: alert.timestamp || new Date().toISOString(),
      is_simulated: true,
    };

    const { error } = await supabase.from('sentinel_alerts').upsert(row);
    if (error) {
      console.warn('[SupabaseRepository] upsertAlert error:', error.message);
    }

    return alert;
  }

  // --------------------------------------------------------------------------
  // GeoIntel Observations
  // --------------------------------------------------------------------------
  public async fetchObservations(filter?: { reviewStatus?: string }): Promise<GeoIntelObservation[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase.from('sentinel_observations').select('*').order('created_at', { ascending: false });
    if (filter?.reviewStatus) {
      query = query.eq('review_status', filter.reviewStatus);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      title: r.title,
      samplePairId: r.title,
      zoneName: r.zone_name,
      coordinates: r.coordinates,
      captureDateBefore: r.capture_date_before,
      captureDateAfter: r.capture_date_after,
      reviewStatus: r.review_status,
      candidates: r.candidates || [],
      algorithmSettings: {
        threshold: 0.75,
        minRegionSize: 50,
      },
      analystNotes: r.analyst_notes || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isSimulated: true,
    }));
  }

  public async upsertObservation(observation: GeoIntelObservation): Promise<GeoIntelObservation> {
    const supabase = getSupabaseClient();
    if (!supabase) return observation;

    const row = {
      id: observation.id,
      title: observation.title,
      zone_name: observation.zoneName,
      coordinates: observation.coordinates,
      capture_date_before: observation.captureDateBefore,
      capture_date_after: observation.captureDateAfter,
      review_status: observation.reviewStatus,
      candidates: observation.candidates || [],
      analyst_notes: observation.analystNotes || null,
      created_at: observation.createdAt,
      updated_at: observation.updatedAt || new Date().toISOString(),
      is_simulated: true,
    };

    const { error } = await supabase.from('sentinel_observations').upsert(row);
    if (error) {
      console.warn('[SupabaseRepository] upsertObservation error:', error.message);
    }

    return observation;
  }

  // --------------------------------------------------------------------------
  // MediRoute Patients & Hazards
  // --------------------------------------------------------------------------
  public async fetchPatients(filter?: { workflowStatus?: string }): Promise<Patient[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase.from('sentinel_patients').select('*').order('created_at', { ascending: false });
    if (filter?.workflowStatus) {
      query = query.eq('status', filter.workflowStatus);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      patientCode: r.patient_code,
      location: r.location,
      vitals: r.vitals,
      triageCategory: r.triage_category,
      triageReason: r.triage_reason || 'START algorithmic evaluation',
      ruleVersion: r.rule_version,
      status: r.status,
      workflowStatus: r.status,
      assignedFacilityId: r.assigned_hospital_id || undefined,
      notes: r.notes || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isSimulated: true,
    }));
  }

  public async upsertPatient(patient: Patient): Promise<Patient> {
    const supabase = getSupabaseClient();
    if (!supabase) return patient;

    const row = {
      id: patient.id,
      patient_code: patient.patientCode,
      location: patient.location,
      vitals: patient.vitals,
      triage_category: patient.triageCategory,
      triage_reason: patient.triageReason,
      rule_version: patient.ruleVersion,
      status: patient.workflowStatus,
      assigned_hospital_id: patient.assignedFacilityId || null,
      notes: patient.notes || null,
      created_at: patient.createdAt,
      updated_at: patient.updatedAt || new Date().toISOString(),
      is_simulated: true,
    };

    const { error } = await supabase.from('sentinel_patients').upsert(row);
    if (error) {
      console.warn('[SupabaseRepository] upsertPatient error:', error.message);
    }

    return patient;
  }

  public async fetchHazards(): Promise<HazardEdge[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase.from('sentinel_hazards').select('*');
    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      edgeId: r.edge_id,
      fromNode: r.from_node,
      toNode: r.to_node,
      fromNodeId: r.from_node,
      toNodeId: r.to_node,
      hazardType: r.hazard_type as any,
      blocked: r.blocked,
      reportedBy: r.reported_by,
      reportedAt: r.reported_at,
      isSimulated: true,
    }));
  }

  public async upsertHazard(hazard: HazardEdge): Promise<HazardEdge> {
    const supabase = getSupabaseClient();
    if (!supabase) return hazard;

    const row = {
      id: hazard.id,
      edge_id: hazard.edgeId,
      from_node: hazard.fromNode || hazard.fromNodeId,
      to_node: hazard.toNode || hazard.toNodeId,
      hazard_type: hazard.hazardType,
      blocked: hazard.blocked,
      reported_by: hazard.reportedBy,
      reported_at: hazard.reportedAt,
      is_simulated: true,
    };

    const { error } = await supabase.from('sentinel_hazards').upsert(row);
    if (error) {
      console.warn('[SupabaseRepository] upsertHazard error:', error.message);
    }

    return hazard;
  }

  // --------------------------------------------------------------------------
  // Soldier Vitals
  // --------------------------------------------------------------------------
  public async fetchSoldierVitals(soldierId?: string): Promise<SoldierVitalsRecord[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase.from('sentinel_soldier_vitals').select('*').order('timestamp', { ascending: false });
    if (soldierId) {
      query = query.eq('soldier_id', soldierId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      soldierId: r.soldier_id,
      callsign: r.callsign,
      unit: r.unit,
      timestamp: r.timestamp,
      heartRateBpm: r.heart_rate_bpm ? Number(r.heart_rate_bpm) : undefined,
      bloodPressureSystolic: r.blood_pressure_systolic ? Number(r.blood_pressure_systolic) : undefined,
      bloodPressureDiastolic: r.blood_pressure_diastolic ? Number(r.blood_pressure_diastolic) : undefined,
      temperatureCelsius: r.temperature_celsius ? Number(r.temperature_celsius) : undefined,
      oxygenSaturationPct: r.oxygen_saturation_pct ? Number(r.oxygen_saturation_pct) : undefined,
      respiratoryRateBpm: r.respiratory_rate_bpm ? Number(r.respiratory_rate_bpm) : undefined,
      clinicalNotes: r.clinical_notes || undefined,
      recordedBy: r.recorded_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isSimulated: true,
    }));
  }

  public async insertSoldierVitals(record: SoldierVitalsRecord): Promise<SoldierVitalsRecord> {
    const supabase = getSupabaseClient();
    if (!supabase) return record;

    const row = {
      id: record.id,
      soldier_id: record.soldierId,
      callsign: record.callsign,
      unit: record.unit,
      timestamp: record.timestamp,
      heart_rate_bpm: record.heartRateBpm || null,
      blood_pressure_systolic: record.bloodPressureSystolic || null,
      blood_pressure_diastolic: record.bloodPressureDiastolic || null,
      temperature_celsius: record.temperatureCelsius || null,
      oxygen_saturation_pct: record.oxygenSaturationPct || null,
      respiratory_rate_bpm: record.respiratoryRateBpm || null,
      clinical_notes: record.clinicalNotes || null,
      recorded_by: record.recordedBy,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      is_simulated: true,
    };

    const { error } = await supabase.from('sentinel_soldier_vitals').insert(row);
    if (error) {
      console.error('[SupabaseRepository] insertSoldierVitals error:', error.message);
      throw new Error(`Failed to persist soldier vitals in Supabase: ${error.message}`);
    }

    return record;
  }
}

export const supabaseRepo = new SupabaseRepository();
