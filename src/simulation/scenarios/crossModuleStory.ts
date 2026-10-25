import {
  SentinelSystemState,
  CrossModuleEvent,
  IncidentRecord,
  CandidateRegion,
  SkyWatchAlert,
  RouteCalculationResult
} from '../../../shared/contracts';
import { getBaselineSentinelState } from '../demoFixtures';
import { FieldLinkQueueManager } from '../../algorithms/fieldlink/queueManager';
import { SkyWatchSimulator } from '../../algorithms/skywatch/simulator';
import { SkyWatchAnomalyDetector } from '../../algorithms/skywatch/anomalyDetector';
import { GeoIntelImageDiff, getKnownDifferenceMatrixFixture } from '../../algorithms/geointel/imageDiff';
import { MediRouteGraphRouter } from '../../algorithms/mediroute/graphRouter';

/**
 * CrossModuleStoryOrchestrator: Manages the unified multi-module 5-step scenario
 * and provides atomic reset to satisfy hackathon judging & replayability rubric.
 */
export class CrossModuleStoryOrchestrator {
  private state: SentinelSystemState;
  private fieldLinkQueue: FieldLinkQueueManager;
  private skyWatchSimulator: SkyWatchSimulator;
  private skyWatchDetector: SkyWatchAnomalyDetector;
  private geoIntelDiff: GeoIntelImageDiff;
  private router: MediRouteGraphRouter;

  constructor() {
    this.state = getBaselineSentinelState();
    this.fieldLinkQueue = new FieldLinkQueueManager();
    this.skyWatchSimulator = new SkyWatchSimulator();
    this.skyWatchDetector = new SkyWatchAnomalyDetector();
    this.geoIntelDiff = new GeoIntelImageDiff();
    this.router = new MediRouteGraphRouter(this.state.roadGraph);
  }

  /**
   * Reset system state back to clean baseline
   */
  public resetToBaseline(): SentinelSystemState {
    this.state = getBaselineSentinelState();
    this.fieldLinkQueue.clear();
    this.skyWatchSimulator.reset();
    this.skyWatchDetector.clear();
    this.router = new MediRouteGraphRouter(this.state.roadGraph);

    // Initial calculation of open route
    this.state.activeRoute = this.router.calculateRoute('CAS-01', 'HOSP-01', true);
    return this.getState();
  }

  /**
   * Execute Step 1: FieldLink offline report filed and synced
   */
  public executeStepFieldReport(): CrossModuleEvent {
    const report = this.fieldLinkQueue.enqueue({
      clientId: 'rep-flood-01',
      type: 'Infrastructure Hazard',
      priority: 'high',
      notes: 'Flash flooding observed at Bridge Highway Alpha. Debris impact on main span; road impassable.',
      location: { lat: 34.072, lng: -118.225, label: 'Bridge Highway Alpha' },
      createdAt: new Date().toISOString()
    });

    // Simulate batch sync confirmation
    this.fieldLinkQueue.applySyncResults({
      batchId: 'batch-demo-1',
      processedCount: 1,
      failedCount: 0,
      results: [
        {
          clientId: report.clientId,
          serverId: 'INC-FL-02',
          outcome: 'accepted',
          syncTimestamp: new Date().toISOString()
        }
      ]
    });

    const incident: IncidentRecord = {
      id: 'INC-FL-02',
      clientId: report.clientId,
      sourceModule: 'fieldlink',
      type: report.type,
      priority: report.priority,
      notes: report.notes,
      location: report.location,
      status: 'open',
      isSimulated: true,
      createdAt: report.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.state.incidents.push(incident);

    const event: CrossModuleEvent = {
      step: 'FIELD_REPORT_FILED',
      timestamp: new Date().toISOString(),
      title: 'FieldLink Offline Report Synced',
      description: 'Tactical field scout submitted critical infrastructure damage report. Upgraded to Incident INC-FL-02.',
      sourceModule: 'fieldlink',
      relatedEntityId: incident.id
    };

    this.state.scenarioHistory.push(event);
    return event;
  }

  /**
   * Execute Step 2: Road Hazard registered; Bridge edge marked blocked
   */
  public executeStepRoadBlockage(): CrossModuleEvent {
    this.router.setEdgeBlockage('E-INT-BRG', true, 'Structural damage from flash flood debris');
    this.state.roadGraph = this.router.getGraph();

    const event: CrossModuleEvent = {
      step: 'HAZARD_ROAD_BLOCK',
      timestamp: new Date().toISOString(),
      title: 'Road Network Hazard Updated',
      description: 'Edge E-INT-BRG (Bridge Highway Alpha) marked BLOCKED. Shared hazard registry notified.',
      sourceModule: 'mediroute',
      relatedEntityId: 'E-INT-BRG'
    };

    this.state.scenarioHistory.push(event);
    return event;
  }

  /**
   * Execute Step 3: MediRoute automatically reroutes evacuation convoy
   */
  public executeStepReroute(): RouteCalculationResult {
    const routeResult = this.router.calculateRoute('CAS-01', 'HOSP-01', true);
    this.state.activeRoute = routeResult;

    const event: CrossModuleEvent = {
      step: 'MEDIROUTE_DIVERT',
      timestamp: new Date().toISOString(),
      title: 'MediRoute Evacuation Rerouted',
      description: `Evacuation path recalculated: Diverting via Mountain Bypass E-INT-BYP. Avoided blocked Bridge edge. ETA: ${routeResult.totalTimeMin} min.`,
      sourceModule: 'mediroute',
      relatedEntityId: 'ROUTE-CAS01-HOSP01'
    };

    this.state.scenarioHistory.push(event);
    return routeResult;
  }

  /**
   * Execute Step 4: GeoIntel discovers candidate change via satellite matrix comparison
   */
  public executeStepGeoIntelDiff(): CandidateRegion {
    const fixture = getKnownDifferenceMatrixFixture();
    const candidates = this.geoIntelDiff.analyze(fixture.before, fixture.after);

    if (candidates.length === 0) {
      throw new Error('Expected candidate change in fixture, none found.');
    }

    const candidate = candidates[0];
    this.state.candidateRegions.push(candidate);

    const event: CrossModuleEvent = {
      step: 'GEOINTEL_DIFF_FOUND',
      timestamp: new Date().toISOString(),
      title: 'GeoIntel Change Candidate Flagged',
      description: `Algorithmic diff flagged structural alteration in Sector Bravo (4x4 matrix span, score ${candidate.differenceScore}).`,
      sourceModule: 'geointel',
      relatedEntityId: candidate.id
    };

    this.state.scenarioHistory.push(event);
    return candidate;
  }

  /**
   * Execute Step 5: SkyWatch detects drone track breaching Restricted Airspace Zone Bravo
   */
  public executeStepSkyWatchBreach(): SkyWatchAlert {
    this.skyWatchSimulator.setScenario('restricted_zone_breach');
    
    // Advance simulator to breach point (step 2)
    this.skyWatchSimulator.step();
    const breachPoint = this.skyWatchSimulator.step();

    if (!breachPoint) {
      throw new Error('Simulator failed to produce breach track point.');
    }

    const alerts = this.skyWatchDetector.evaluate(breachPoint);
    const criticalAlert = alerts.find(a => a.ruleName === 'restricted_zone_entry');

    if (!criticalAlert) {
      throw new Error('Expected restricted zone breach alert, but none triggered.');
    }

    this.state.activeTracks = this.skyWatchSimulator.getHistory();
    this.state.skyWatchAlerts.push(criticalAlert);

    const event: CrossModuleEvent = {
      step: 'SKYWATCH_ZONE_BREACH',
      timestamp: new Date().toISOString(),
      title: 'SkyWatch Airspace Breach Alert',
      description: `Track SW-204 violated Restricted Airspace Zone Bravo. Triggered critical alert ${criticalAlert.id}.`,
      sourceModule: 'skywatch',
      relatedEntityId: criticalAlert.id
    };

    this.state.scenarioHistory.push(event);
    return criticalAlert;
  }

  /**
   * Run entire 5-step scenario sequentially (automated replay)
   */
  public runFullScenario(): SentinelSystemState {
    this.resetToBaseline();
    this.executeStepFieldReport();
    this.executeStepRoadBlockage();
    this.executeStepReroute();
    this.executeStepGeoIntelDiff();
    this.executeStepSkyWatchBreach();
    return this.getState();
  }

  public getState(): SentinelSystemState {
    return {
      incidents: this.state.incidents.map(i => ({ ...i })),
      queuedReports: this.fieldLinkQueue.getAll(),
      activeTracks: this.skyWatchSimulator.getHistory(),
      skyWatchAlerts: this.skyWatchDetector.getAlerts(),
      candidateRegions: this.state.candidateRegions.map(c => ({ ...c })),
      casualties: this.state.casualties.map(c => ({ ...c })),
      roadGraph: this.router.getGraph(),
      activeRoute: this.state.activeRoute ? { ...this.state.activeRoute } : undefined,
      scenarioHistory: this.state.scenarioHistory.map(e => ({ ...e })),
      lastResetAt: this.state.lastResetAt
    };
  }
}
