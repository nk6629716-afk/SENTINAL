import React, { useState, useEffect, useCallback } from 'react';
import {
  IncidentReport,
  TelemetryTrack,
  AirspaceAlert,
  RestrictedAirspaceZone,
  GeoIntelObservation,
  CasualtyRecord,
  RoadHazardEdge,
  DashboardSummary,
} from '@shared/types';
import { api } from '../services/api/apiClient';
import { dbService } from '../services/storage/indexedDb';
import { EVACUATION_NODES } from '../services/data/fixtures';
import { Sidebar } from './Sidebar';
import { CommandHeader } from './CommandHeader';
import { Dashboard } from '../dashboard/Dashboard';
import { FieldLinkModule } from '../modules/fieldlink/FieldLinkModule';
import { SkyWatchModule } from '../modules/skywatch/SkyWatchModule';
import { GeoIntelModule } from '../modules/geointel/GeoIntelModule';
import { MediRouteModule } from '../modules/mediroute/MediRouteModule';

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<'dashboard' | 'fieldlink' | 'skywatch' | 'geointel' | 'mediroute'>('dashboard');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Core Data States
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [tracks, setTracks] = useState<TelemetryTrack[]>([]);
  const [alerts, setAlerts] = useState<AirspaceAlert[]>([]);
  const [zones, setZones] = useState<RestrictedAirspaceZone[]>([]);
  const [observations, setObservations] = useState<GeoIntelObservation[]>([]);
  const [casualties, setCasualties] = useState<CasualtyRecord[]>([]);
  const [hazards, setHazards] = useState<RoadHazardEdge[]>([]);

  // 1. Initial Database Seed & Load
  const refreshAllData = useCallback(async () => {
    try {
      const [
        sum,
        incList,
        trkList,
        altList,
        zoneList,
        obsList,
        casList,
        hazList,
      ] = await Promise.all([
        api.getDashboardSummary(),
        api.getIncidents(),
        api.getTelemetryTracks(),
        api.getAirspaceAlerts(),
        api.getRestrictedZones(),
        api.getGeoObservations(),
        api.getCasualties(),
        api.getRoadHazards(),
      ]);

      setSummary(sum);
      setIncidents(incList);
      setTracks(trkList);
      setAlerts(altList);
      setZones(zoneList);
      setObservations(obsList);
      setCasualties(casList);
      setHazards(hazList);
    } catch (err) {
      console.error('Error refreshing SENTINEL data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function boot() {
      await dbService.seedDefaultFixturesIfEmpty();
      await refreshAllData();
    }
    boot();
  }, [refreshAllData]);

  // 2. Hardware Browser Network Listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('Browser online event detected');
      setIsOfflineMode(false);
      api.setOfflineSimulation(false);
      refreshAllData();
    };

    const handleOffline = () => {
      console.log('Browser offline event detected');
      setIsOfflineMode(true);
      api.setOfflineSimulation(true);
      refreshAllData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshAllData]);

  // 3. User Toggle Offline Mode
  const handleToggleOffline = () => {
    const nextState = !isOfflineMode;
    setIsOfflineMode(nextState);
    api.setOfflineSimulation(nextState);
    refreshAllData();
  };

  // 4. Batch Sync Outbox Queue
  const handleTriggerSync = async () => {
    if (isOfflineMode) return;
    setIsSyncing(true);
    try {
      await api.syncPendingQueue();
      await refreshAllData();
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 5. Deterministic Reset Demo
  const handleResetDemo = async () => {
    if (window.confirm('Reset all modules to deterministic baseline fixtures for judge demonstration replay?')) {
      setIsLoading(true);
      await dbService.resetToDeterministicBaseline();
      await refreshAllData();
      setIsLoading(false);
    }
  };

  const pendingSyncCount = incidents.filter(
    (i) => i.syncStatus === 'pending' || i.syncStatus === 'failed'
  ).length;

  const unackAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  if (isLoading || !summary) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--surface)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-sans)',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--shadow-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 10px rgba(70, 105, 168, 0.6)',
            }}
          />
        </div>
        <div style={{ letterSpacing: '0.04em', fontSize: '1rem', fontWeight: 700 }}>
          INITIALIZING SENTINEL NEUMORPHIC CONSOLE...
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
          Mounting IndexedDB stores and deterministic scenario fixtures
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* 1. Neumorphic Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        onNavigate={setActiveModule}
        pendingSyncCount={pendingSyncCount}
        unackAlertsCount={unackAlertsCount}
        isOfflineMode={isOfflineMode}
      />

      {/* 2. Main Content Area */}
      <div className="app-main">
        <CommandHeader
          activeModule={activeModule}
          pendingSyncCount={pendingSyncCount}
          isOfflineMode={isOfflineMode}
          onToggleOffline={handleToggleOffline}
          onTriggerSync={handleTriggerSync}
          onResetDemo={handleResetDemo}
          isSyncing={isSyncing}
        />

        <main style={{ flex: 1, padding: '24px' }}>
          {activeModule === 'dashboard' && (
            <Dashboard
              summary={summary}
              incidents={incidents}
              tracks={tracks}
              alerts={alerts}
              zones={zones}
              observations={observations}
              casualties={casualties}
              hazards={hazards}
              nodes={EVACUATION_NODES}
              onNavigate={setActiveModule}
              onResetDemo={handleResetDemo}
              isOfflineMode={isOfflineMode}
            />
          )}

          {activeModule === 'fieldlink' && (
            <FieldLinkModule
              incidents={incidents}
              isOfflineMode={isOfflineMode}
              onRefreshIncidents={refreshAllData}
              onTriggerSync={handleTriggerSync}
              isSyncing={isSyncing}
            />
          )}

          {activeModule === 'skywatch' && (
            <SkyWatchModule
              tracks={tracks}
              alerts={alerts}
              zones={zones}
              onRefreshAlerts={refreshAllData}
            />
          )}

          {activeModule === 'geointel' && (
            <GeoIntelModule
              observations={observations}
              onRefreshObservations={refreshAllData}
            />
          )}

          {activeModule === 'mediroute' && (
            <MediRouteModule
              casualties={casualties}
              hazards={hazards}
              nodes={EVACUATION_NODES}
              onRefreshCasualties={refreshAllData}
              onRefreshHazards={refreshAllData}
            />
          )}
        </main>

        {/* Soft Tactical Footer */}
        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface)',
            padding: '14px 28px',
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>SENTINEL v1.0.0</span>
            <span>•</span>
            <span>Falling Sun 2026 Prototype</span>
            <span>•</span>
            <span className="badge-neu badge-neu-neutral" style={{ fontSize: '0.62rem' }}>
              SIMULATED OPERATIONS TESTBED
            </span>
          </div>

          <div>
            <span>Honest Demo Simulation • Person 1 Frontend • Person 2 Backend API • Person 3 Algorithms</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
