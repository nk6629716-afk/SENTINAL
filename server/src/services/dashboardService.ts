import { db } from '../db/database';
import { DashboardSummary } from '../../../shared/types';
import { config } from '../config';

const serverStartTime = Date.now();

export class DashboardService {
  public getSummary(): DashboardSummary {
    const allIncidents = db.getIncidents();
    const openIncidents = allIncidents.filter((i) => i.status === 'active' || i.status === 'in_progress');
    const tracks = db.getTracks();
    const observations = db.getObservations();
    const pendingReviews = observations.filter((o) => o.reviewStatus === 'pending_review');
    const patients = db.getPatients();
    const awaitingEvac = patients.filter((p) => p.workflowStatus !== 'evacuated');
    const hazards = db.getHazards({ blocked: true });
    const alerts = db.getAlerts({ acknowledged: false });

    // Find latest sync timestamp across incidents
    let latestSync = new Date(0).toISOString();
    for (const inc of allIncidents) {
      if (inc.syncedAt && inc.syncedAt > latestSync) {
        latestSync = inc.syncedAt;
      }
    }

    return {
      metrics: {
        openIncidentsCount: openIncidents.length,
        activeTracksCount: tracks.length,
        pendingGeoReviewsCount: pendingReviews.length,
        patientsAwaitingEvacCount: awaitingEvac.length,
        activeHazardsCount: hazards.length,
      },
      recentIncidents: allIncidents.slice(0, 5),
      activeAlerts: alerts.slice(0, 5),
      systemHealth: {
        status: 'healthy',
        lastSyncTimestamp: latestSync === new Date(0).toISOString() ? new Date().toISOString() : latestSync,
        uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
        storageMode: config.storageMode,
      },
      isSimulated: true,
    };
  }
}

export const dashboardService = new DashboardService();
