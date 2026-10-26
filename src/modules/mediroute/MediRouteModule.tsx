import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CasualtyRecord,
  RoadHazardEdge,
  EvacuationNode,
  TriageCategory,
} from '@shared/types';
import {
  Activity,
  HeartPulse,
  ClipboardList,
  Route as RouteIcon,
  Building2,
  Ambulance,
  Play,
  Pause,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  MediRouteSubTab,
  MedicalFacility,
  TransportUnit,
  ExtendedCasualtyRecord,
  EvacuationTask,
  MedicalActivityItem,
  VitalAnomaly,
} from './medirouteTypes';
import {
  INITIAL_FACILITIES,
  INITIAL_TRANSPORT_UNITS,
  INITIAL_EXTENDED_CASUALTIES,
  INITIAL_EVACUATION_TASKS,
  INITIAL_MEDICAL_ACTIVITIES,
} from './medirouteData';
import { MedicalOverviewTab } from './components/MedicalOverviewTab';
import { PatientMonitoringTab } from './components/PatientMonitoringTab';
import { TriageBoardTab } from './components/TriageBoardTab';
import { EvacuationRoutingTab } from './components/EvacuationRoutingTab';
import { FacilityCapacityTab } from './components/FacilityCapacityTab';
import { TransportDispatchTab } from './components/TransportDispatchTab';

export interface MediRouteModuleProps {
  casualties: CasualtyRecord[];
  hazards: RoadHazardEdge[];
  nodes: EvacuationNode[];
  onRefreshCasualties: () => Promise<void>;
  onRefreshHazards: () => Promise<void>;
  onToggleSimulationPause?: () => void;
  isSimPaused?: boolean;
  initialSubTab?: MediRouteSubTab;
  onSubTabChange?: (tab: MediRouteSubTab) => void;
}

// Algorithmic Simplified START Triage Evaluation Function (Preserved exactly for contract safety)
export function calculateStartTriage(vitals: {
  canWalk: boolean;
  respiratoryRate: number;
  radialPulsePresent: boolean;
  mentalStatus: 'can_follow_commands' | 'unresponsive' | 'altered';
  severeBleedingControlled: boolean;
}): { category: TriageCategory; reason: string } {
  // Step 1: Minor (Walking Wounded)
  if (vitals.canWalk) {
    return {
      category: 'minimal',
      reason: 'Rule 1: Ambulatory patient capable of walking. Minor injuries requiring delayed holding.',
    };
  }

  // Step 2: Respiration check
  if (vitals.respiratoryRate === 0) {
    return {
      category: 'expectant',
      reason: 'Rule 2: Apneic (respiratory rate 0) after airway positioning. Expectant / non-survivable in field triage.',
    };
  }

  if (vitals.respiratoryRate > 30 || vitals.respiratoryRate < 10) {
    return {
      category: 'immediate',
      reason: `Rule 3: Respiratory distress detected (RR: ${vitals.respiratoryRate}/min outside 10-30 normal range). Immediate airway stabilization needed.`,
    };
  }

  // Step 3: Perfusion check (Radial Pulse or Bleeding)
  if (!vitals.radialPulsePresent || !vitals.severeBleedingControlled) {
    return {
      category: 'immediate',
      reason: 'Rule 4: Hemodynamic compromise (absent radial pulse or uncontrolled severe hemorrhage). High risk of hypovolemic shock.',
    };
  }

  // Step 4: Mental Status check
  if (vitals.mentalStatus !== 'can_follow_commands') {
    return {
      category: 'immediate',
      reason: 'Rule 5: Altered neurological status / inability to follow simple verbal commands. Potential intracranial injury.',
    };
  }

  // Otherwise: Delayed
  return {
    category: 'delayed',
    reason: 'Rule 6: Stable vital signs and perfusion present, non-ambulatory with serious systemic trauma.',
  };
}

export const MediRouteModule: React.FC<MediRouteModuleProps> = ({
  casualties: initialCasualtiesProps,
  hazards: initialHazardsProps,
  nodes,
  onRefreshCasualties,
  onRefreshHazards,
  onToggleSimulationPause,
  isSimPaused = false,
  initialSubTab = 'overview',
  onSubTabChange,
}) => {
  // Active Sub-Tab Navigation
  const [activeSubTab, setActiveSubTab] = useState<MediRouteSubTab>(initialSubTab);

  // Sync if initialSubTab changes from parent
  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSubTabChange = (tab: MediRouteSubTab) => {
    setActiveSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  // Module Core States
  const [facilities, setFacilities] = useState<MedicalFacility[]>(INITIAL_FACILITIES);
  const [transportUnits, setTransportUnits] = useState<TransportUnit[]>(INITIAL_TRANSPORT_UNITS);
  const [evacuationTasks, setEvacuationTasks] = useState<EvacuationTask[]>(INITIAL_EVACUATION_TASKS);
  const [activities, setActivities] = useState<MedicalActivityItem[]>(INITIAL_MEDICAL_ACTIVITIES);
  const [selectedCasualtyId, setSelectedCasualtyId] = useState<string | null>(
    INITIAL_EXTENDED_CASUALTIES[0]?.id || null
  );

  // Hazards local state (synced with props or toggled)
  const [hazards, setHazards] = useState<RoadHazardEdge[]>(() => {
    if (initialHazardsProps && initialHazardsProps.length > 0) {
      return initialHazardsProps;
    }
    return [
      {
        id: 'EDGE-1',
        edgeId: 'E-INT-BRG',
        fromNodeId: 'INT-01',
        toNodeId: 'BRG-01',
        name: 'Bridge Highway Alpha Span',
        blocked: true,
        hazardType: 'structural_damage',
        reportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSimulated: true,
      },
      {
        id: 'EDGE-2',
        edgeId: 'E-AID-CAS',
        fromNodeId: 'AID-01',
        toNodeId: 'CAS-01',
        name: 'Forward Approach Corridor',
        blocked: false,
        reportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSimulated: true,
      },
    ];
  });

  // Merge extended casualties with props
  const [casualties, setCasualties] = useState<ExtendedCasualtyRecord[]>(() => {
    return INITIAL_EXTENDED_CASUALTIES;
  });

  // Local Simulation Run State
  const [localSimPaused, setLocalSimPaused] = useState<boolean>(isSimPaused);

  const toggleSimPause = () => {
    if (onToggleSimulationPause) {
      onToggleSimulationPause();
    }
    setLocalSimPaused((prev) => !prev);
  };

  // Log activity helper
  const addActivity = useCallback(
    (
      title: string,
      description: string,
      type: MedicalActivityItem['type'],
      severity: MedicalActivityItem['severity'],
      targetTab?: MediRouteSubTab,
      targetId?: string
    ) => {
      const item: MedicalActivityItem = {
        id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        title,
        description,
        type,
        severity,
        targetTab,
        targetId,
      };
      setActivities((prev) => [item, ...prev.slice(0, 40)]);
    },
    []
  );

  // Advance deterministic simulation by one step
  const stepSimulation = useCallback(() => {
    setCasualties((prevCasualties) => {
      return prevCasualties.map((c) => {
        // Minor realistic drift
        const hrDrift = Math.floor(Math.random() * 5) - 2;
        const currentHr = Math.max(45, Math.min(180, (c.heartRate || 80) + hrDrift));

        const spo2Drift = Math.floor(Math.random() * 3) - 1;
        const currentSpo2 = Math.max(75, Math.min(100, (c.spo2 || 96) + spo2Drift));

        const rrDrift = Math.floor(Math.random() * 3) - 1;
        const currentRr = Math.max(8, Math.min(48, (c.respiratoryRate || 18) + rrDrift));

        const tempDrift = (Math.random() * 0.2 - 0.1);
        const currentTemp = Number(Math.max(34.0, Math.min(41.0, (c.temperature || 37.0) + tempDrift)).toFixed(1));

        // Detect critical threshold anomalies
        const activeAnomalies: VitalAnomaly[] = [];

        if (currentSpo2 < 90) {
          activeAnomalies.push({
            id: `ANOM-SPO2-${c.id}-${Date.now()}`,
            patientId: c.id,
            metric: 'spo2',
            severity: 'critical',
            title: 'Critical Hypoxemia Alert',
            explanation: `Blood oxygen saturation dropped to ${currentSpo2}% (threshold < 90%). Supplemental high-flow oxygen indicated.`,
            observedValue: `${currentSpo2}%`,
            threshold: '< 90%',
            timestamp: new Date().toISOString(),
          });
        }

        if (currentHr > 130) {
          activeAnomalies.push({
            id: `ANOM-HR-${c.id}-${Date.now()}`,
            patientId: c.id,
            metric: 'hr',
            severity: 'critical',
            title: 'Severe Tachycardia Alert',
            explanation: `Heart rate spiked to ${currentHr} bpm (threshold > 130 bpm). Possible hemorrhagic decompensation.`,
            observedValue: `${currentHr} bpm`,
            threshold: '> 130 bpm',
            timestamp: new Date().toISOString(),
          });
        }

        if (currentRr > 30) {
          activeAnomalies.push({
            id: `ANOM-RR-${c.id}-${Date.now()}`,
            patientId: c.id,
            metric: 'rr',
            severity: 'critical',
            title: 'Tachypnea Distress Alert',
            explanation: `Respiratory rate elevated to ${currentRr}/min (threshold > 30/min). Airway evaluation recommended.`,
            observedValue: `${currentRr} /min`,
            threshold: '> 30 /min',
            timestamp: new Date().toISOString(),
          });
        }

        const now = new Date().toISOString();
        const updatedHistory = [
          ...(c.vitalsHistory || []).slice(-9),
          {
            timestamp: now,
            heartRate: currentHr,
            spo2: currentSpo2,
            respiratoryRate: currentRr,
            bpSystolic: c.bpSystolic || 120,
            bpDiastolic: c.bpDiastolic || 80,
          },
        ];

        return {
          ...c,
          heartRate: currentHr,
          spo2: currentSpo2,
          respiratoryRate: currentRr,
          temperature: currentTemp,
          lastReadingTime: now,
          activeAnomalies,
          vitalsHistory: updatedHistory,
        };
      });
    });
  }, []);

  // Periodic Simulation Tick (every 4 seconds when unpaused)
  useEffect(() => {
    if (localSimPaused) return;

    const interval = setInterval(() => {
      stepSimulation();
    }, 4000);

    return () => clearInterval(interval);
  }, [localSimPaused, stepSimulation]);

  // Reset Simulation
  const handleResetSimulation = () => {
    setCasualties(INITIAL_EXTENDED_CASUALTIES);
    setFacilities(INITIAL_FACILITIES);
    setTransportUnits(INITIAL_TRANSPORT_UNITS);
    setEvacuationTasks(INITIAL_EVACUATION_TASKS);
    setActivities(INITIAL_MEDICAL_ACTIVITIES);
    addActivity('Simulation Reset', 'Telemetry, facilities, and fleet reset to baseline training parameters.', 'vital_anomaly', 'info');
  };

  // Inject Anomaly for Demonstration
  const handleInjectAnomaly = (patientId: string, metric: 'hr' | 'spo2' | 'rr' | 'temp') => {
    setCasualties((prev) =>
      prev.map((c) => {
        if (c.id !== patientId) return c;

        const updated = { ...c };
        const now = new Date().toISOString();

        if (metric === 'spo2') {
          updated.spo2 = 86;
          const anom: VitalAnomaly = {
            id: `ANOM-SPO2-INJ-${Date.now()}`,
            patientId: c.id,
            metric: 'spo2',
            severity: 'critical',
            title: 'Injected Test Anomaly: Acute Desaturation',
            explanation: 'SpO2 forced to 86% by operator demonstration trigger.',
            observedValue: '86%',
            threshold: '< 90%',
            timestamp: now,
          };
          updated.activeAnomalies = [anom, ...(updated.activeAnomalies || [])];
          // Escalate triage to immediate
          updated.triageCategory = 'immediate';
          updated.triageReason = 'Acute hypoxemic desaturation (SpO2 86%) requiring immediate airway protection.';
        } else if (metric === 'hr') {
          updated.heartRate = 148;
          const anom: VitalAnomaly = {
            id: `ANOM-HR-INJ-${Date.now()}`,
            patientId: c.id,
            metric: 'hr',
            severity: 'critical',
            title: 'Injected Test Anomaly: Severe Tachycardia',
            explanation: 'Heart rate spiked to 148 bpm by operator demonstration trigger.',
            observedValue: '148 bpm',
            threshold: '> 130 bpm',
            timestamp: now,
          };
          updated.activeAnomalies = [anom, ...(updated.activeAnomalies || [])];
        }

        updated.lastReadingTime = now;
        return updated;
      })
    );

    addActivity(
      `Operator Injected Anomaly on ${patientId}`,
      `Triggered simulated ${metric.toUpperCase()} abnormal vital event. Triage and alert triggered.`,
      'vital_anomaly',
      'critical',
      'monitoring',
      patientId
    );
  };

  // Triage Update / Override Handler
  const handleUpdateTriage = (
    casualtyId: string,
    category: TriageCategory,
    overrideReason: string,
    isManualOverride: boolean
  ) => {
    setCasualties((prev) =>
      prev.map((c) => {
        if (c.id !== casualtyId) return c;
        return {
          ...c,
          triageCategory: category,
          triageReason: overrideReason,
          updatedAt: new Date().toISOString(),
          triageHistory: [
            ...(c.triageHistory || []),
            {
              timestamp: new Date().toISOString(),
              category,
              reason: overrideReason,
              triggerVitals: `HR ${c.heartRate}, SpO2 ${c.spo2}%, RR ${c.respiratoryRate}`,
            },
          ],
        };
      })
    );

    addActivity(
      `${isManualOverride ? 'Operator Override' : 'START Algorithmic'} Triage: ${casualtyId} &rarr; ${category.toUpperCase()}`,
      overrideReason,
      'triage_update',
      category === 'immediate' ? 'critical' : category === 'delayed' ? 'warning' : 'info',
      'triage',
      casualtyId
    );
  };

  // Road Blockage Toggle Handler
  const handleToggleHazardBlock = (edgeId: string, isBlocked: boolean, reason?: string) => {
    setHazards((prev) =>
      prev.map((h) => {
        if (h.id === edgeId || h.edgeId === edgeId) {
          return {
            ...h,
            blocked: isBlocked,
            hazardType: isBlocked ? 'structural_damage' : undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return h;
      })
    );

    addActivity(
      `Road Segment ${edgeId} ${isBlocked ? 'BLOCKED' : 'CLEARED'}`,
      isBlocked
        ? `Hazard activated: ${reason || 'Segment impassable'}. Evacuation routing recalculated.`
        : 'Road segment inspected and reopened for emergency traffic.',
      'route_recalculated',
      isBlocked ? 'warning' : 'success',
      'routing',
      edgeId
    );
  };

  // Facility Capacity Update Handler
  const handleUpdateFacilityCapacity = (
    facilityId: string,
    totalBeds: number,
    availableBeds: number,
    surgicalAvailable: number
  ) => {
    setFacilities((prev) =>
      prev.map((f) => {
        if (f.id !== facilityId) return f;
        const newStatus =
          availableBeds === 0 ? 'full' : availableBeds < 3 ? 'limited' : 'available';

        return {
          ...f,
          totalBeds,
          availableBeds,
          surgicalAvailable,
          status: newStatus,
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    addActivity(
      `Capacity Updated: ${facilityId}`,
      `Total Beds: ${totalBeds}, Available: ${availableBeds}, Surgical: ${surgicalAvailable}`,
      'facility_update',
      availableBeds === 0 ? 'warning' : 'info',
      'facilities',
      facilityId
    );
  };

  // Casualty Admission to Facility Handler
  const handleAssignCasualtyToFacility = (casualtyId: string, facilityId: string) => {
    setFacilities((prev) =>
      prev.map((f) => {
        if (f.id !== facilityId) return f;
        const newAvail = Math.max(0, f.availableBeds - 1);
        return {
          ...f,
          availableBeds: newAvail,
          assignedCasualtyIds: [...f.assignedCasualtyIds, casualtyId],
          status: newAvail === 0 ? 'full' : f.status,
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    setCasualties((prev) =>
      prev.map((c) => {
        if (c.id !== casualtyId) return c;
        return {
          ...c,
          assignedFacilityId: facilityId,
          status: 'assigned',
          updatedAt: new Date().toISOString(),
        };
      })
    );

    addActivity(
      `Patient ${casualtyId} Admitted`,
      `Assigned bed quota at facility ${facilityId}. Facility capacity decremented.`,
      'facility_update',
      'info',
      'facilities',
      facilityId
    );
  };

  // Transport Unit Dispatch Handler
  const handleDispatchUnit = (
    transportUnitId: string,
    casualtyId: string,
    destinationFacilityId: string,
    routeDistanceKm: number,
    etaMinutes: number
  ) => {
    // 1. Update Unit
    setTransportUnits((prev) =>
      prev.map((u) => {
        if (u.id !== transportUnitId) return u;
        return {
          ...u,
          status: 'dispatched',
          assignedCasualtyId: casualtyId,
          destinationFacilityId,
          routeDistanceKm,
          etaMinutes,
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    // 2. Create Evacuation Task
    const casualty = casualties.find((c) => c.id === casualtyId);
    const newTask: EvacuationTask = {
      id: `TASK-EVAC-${Date.now().toString().slice(-4)}`,
      casualtyId,
      transportUnitId,
      pickupLocation: casualty?.location || { name: 'Field CCP', lat: 34.07, lng: -118.23 },
      destinationFacilityId,
      status: 'dispatched',
      priority: casualty?.triageCategory || 'immediate',
      dispatchedAt: new Date().toISOString(),
      routeDistanceKm,
      etaMinutes,
      hazardsAvoided: ['Hazard-Aware Detour Engaged'],
    };

    setEvacuationTasks((prev) => [newTask, ...prev]);

    // 3. Update Casualty
    setCasualties((prev) =>
      prev.map((c) => {
        if (c.id !== casualtyId) return c;
        return {
          ...c,
          status: 'assigned',
          assignedTransportUnitId: transportUnitId,
          assignedFacilityId: destinationFacilityId,
        };
      })
    );

    addActivity(
      `Mission Dispatched: ${transportUnitId} &rarr; ${casualtyId}`,
      `Routing to ${destinationFacilityId} (${routeDistanceKm} km, ETA: ${etaMinutes} mins).`,
      'dispatch',
      'info',
      'dispatch',
      newTask.id
    );
  };

  // Complete Evacuation Task
  const handleCompleteEvacuationTask = (taskId: string) => {
    const task = evacuationTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Update Task
    setEvacuationTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'completed', completedAt: new Date().toISOString() } : t))
    );

    // Free Unit
    setTransportUnits((prev) =>
      prev.map((u) =>
        u.id === task.transportUnitId
          ? {
              ...u,
              status: 'available',
              assignedCasualtyId: null,
              destinationFacilityId: null,
              lastUpdated: new Date().toISOString(),
            }
          : u
      )
    );

    // Mark Casualty Evacuated
    setCasualties((prev) =>
      prev.map((c) =>
        c.id === task.casualtyId ? { ...c, status: 'evacuated', updatedAt: new Date().toISOString() } : c
      )
    );

    addActivity(
      `Evacuation Completed: ${task.id}`,
      `Casualty ${task.casualtyId} safely transferred to ${task.destinationFacilityId}. ${task.transportUnitId} is now available.`,
      'evacuation_complete',
      'success',
      'dispatch',
      taskId
    );
  };

  // Cancel Evacuation Task
  const handleCancelEvacuationTask = (taskId: string) => {
    const task = evacuationTasks.find((t) => t.id === taskId);
    if (!task) return;

    setEvacuationTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'cancelled' } : t))
    );

    setTransportUnits((prev) =>
      prev.map((u) =>
        u.id === task.transportUnitId
          ? {
              ...u,
              status: 'available',
              assignedCasualtyId: null,
              destinationFacilityId: null,
              lastUpdated: new Date().toISOString(),
            }
          : u
      )
    );

    addActivity(
      `Evacuation Cancelled: ${task.id}`,
      `Mission aborted. Unit ${task.transportUnitId} returned to available pool.`,
      'dispatch',
      'warning',
      'dispatch',
      taskId
    );
  };

  // Tab navigation helper
  const navigateTab = (tab: MediRouteSubTab, targetId?: string) => {
    handleSubTabChange(tab);
    if (tab === 'monitoring' && targetId) {
      setSelectedCasualtyId(targetId);
    }
  };

  const navTabs = [
    { id: 'overview' as MediRouteSubTab, label: 'Operations Overview', icon: Activity },
    { id: 'monitoring' as MediRouteSubTab, label: 'Patient Monitoring', icon: HeartPulse },
    { id: 'triage' as MediRouteSubTab, label: 'Triage Board', icon: ClipboardList },
    { id: 'routing' as MediRouteSubTab, label: 'Evacuation Routing', icon: RouteIcon },
    { id: 'facilities' as MediRouteSubTab, label: 'Resources & Facilities', icon: Building2 },
    { id: 'dispatch' as MediRouteSubTab, label: 'Transport Dispatch', icon: Ambulance },
  ];

  return (
    <div
      className="mediroute-module-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '100%',
        background: 'var(--bg-canvas, #121614)',
        color: 'var(--text-primary, #e9ece9)',
        overflowY: 'auto',
        padding: '16px 20px',
        gap: '16px',
      }}
    >
      {/* Module Masthead Header & Subtabs Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderBottom: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HeartPulse size={20} color="var(--accent-sage, #738a65)" />
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #e9ece9)', letterSpacing: '-0.01em', fontFamily: 'var(--font-heading)' }}>
                MediRoute — Medical Operations
              </h1>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a192)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              Automated Triage, Patient Telemetry, Hazard-Aware Evacuation Routing & Dispatch
            </div>
          </div>

          {/* Global Sim Control Quick Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={toggleSimPause}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                padding: '4px 10px',
                background: localSimPaused ? 'rgba(88, 129, 87, 0.2)' : 'rgba(200, 90, 83, 0.2)',
                color: localSimPaused ? 'var(--status-safe, #588157)' : 'var(--status-critical, #c85a53)',
                border: `1px solid ${localSimPaused ? 'rgba(88, 129, 87, 0.4)' : 'rgba(200, 90, 83, 0.4)'}`,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {localSimPaused ? <Play size={12} /> : <Pause size={12} />}
              <span>{localSimPaused ? 'Resume Sim' : 'Pause Sim'}</span>
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={stepSimulation}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                padding: '4px 10px',
                background: 'rgba(115, 138, 101, 0.15)',
                color: 'var(--accent-sage, #738a65)',
                border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.25))',
                fontFamily: 'var(--font-mono)',
              }}
              title="Step simulation forward +1 tick"
            >
              <Zap size={12} />
              <span>Step</span>
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={handleResetSimulation}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                padding: '4px 10px',
                background: 'var(--bg-control, #161c18)',
                color: 'var(--text-secondary, #94a192)',
                border: '1px solid var(--border-tactical, rgba(115, 138, 101, 0.20))',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Top Nested Sub-Nav Tabs */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          {navTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => handleSubTabChange(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 700 : 500,
                  borderRadius: 'var(--radius-sm, 4px)',
                  background: isActive ? 'var(--bg-card, #181d1a)' : 'transparent',
                  color: isActive ? 'var(--text-primary, #e9ece9)' : 'var(--text-secondary, #94a192)',
                  border: isActive
                    ? '1px solid var(--accent-sage, #738a65)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                <Icon size={14} color={isActive ? 'var(--accent-sage, #738a65)' : 'var(--text-muted, #667564)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div style={{ flex: 1 }}>
        {activeSubTab === 'overview' && (
          <MedicalOverviewTab
            casualties={casualties}
            facilities={facilities}
            transportUnits={transportUnits}
            evacuationTasks={evacuationTasks}
            hazards={hazards}
            activities={activities}
            onNavigateTab={navigateTab}
            onSelectCasualty={(id) => setSelectedCasualtyId(id)}
            isSimPaused={localSimPaused}
          />
        )}

        {activeSubTab === 'monitoring' && (
          <PatientMonitoringTab
            casualties={casualties}
            selectedCasualtyId={selectedCasualtyId}
            onSelectCasualty={(id) => setSelectedCasualtyId(id)}
            isSimPaused={localSimPaused}
            onToggleSimPause={toggleSimPause}
            onResetSimulation={handleResetSimulation}
            onStepSimulation={stepSimulation}
            onInjectAnomaly={handleInjectAnomaly}
          />
        )}

        {activeSubTab === 'triage' && (
          <TriageBoardTab
            casualties={casualties}
            onUpdateTriage={handleUpdateTriage}
            onNavigateTab={navigateTab}
          />
        )}

        {activeSubTab === 'routing' && (
          <EvacuationRoutingTab
            casualties={casualties}
            facilities={facilities}
            transportUnits={transportUnits}
            hazards={hazards}
            nodes={nodes}
            onToggleHazardBlock={handleToggleHazardBlock}
            onDispatchTransport={handleDispatchUnit}
          />
        )}

        {activeSubTab === 'facilities' && (
          <FacilityCapacityTab
            facilities={facilities}
            casualties={casualties}
            onUpdateFacilityCapacity={handleUpdateFacilityCapacity}
            onAssignCasualtyToFacility={handleAssignCasualtyToFacility}
          />
        )}

        {activeSubTab === 'dispatch' && (
          <TransportDispatchTab
            transportUnits={transportUnits}
            evacuationTasks={evacuationTasks}
            facilities={facilities}
            casualties={casualties}
            onDispatchUnit={handleDispatchUnit}
            onCompleteEvacuationTask={handleCompleteEvacuationTask}
            onCancelEvacuationTask={handleCancelEvacuationTask}
          />
        )}
      </div>
    </div>
  );
};
