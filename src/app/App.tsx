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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // App Shell States & Persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('sentinel_sidebar_collapsed');
      return val !== null ? JSON.parse(val) : false;
    } catch (e) {
      return false;
    }
  });


  const [isHeaderCompact, setIsHeaderCompact] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('sentinel_header_compact');
      return val !== null ? JSON.parse(val) : false;
    } catch (e) {
      return false;
    }
  });

  const [isHeaderMinimized, setIsHeaderMinimized] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('sentinel_header_minimized');
      return val !== null ? JSON.parse(val) : false;
    } catch (e) {
      return false;
    }
  });

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
      await api.resetDemoBaseline();
      await refreshAllData();
      setIsLoading(false);
    }
  };

  // 6. Global Keyboard Shortcuts (Ctrl+B / Cmd+B for sidebar, Escape for mobile menu)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (window.innerWidth < 900) {
          setIsMobileMenuOpen((prev) => !prev);
        } else {
          setIsSidebarCollapsed((prev) => {
            const next = !prev;
            try {
              localStorage.setItem('sentinel_sidebar_collapsed', JSON.stringify(next));
            } catch (err) {}
            return next;
          });
        }
      }
      if (e.key === 'Escape') {
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sentinel_sidebar_collapsed', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const handleToggleHeaderCompact = () => {
    setIsHeaderCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sentinel_header_compact', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const handleToggleHeaderMinimized = () => {
    setIsHeaderMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sentinel_header_minimized', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const effectiveSidebarWidth = isSidebarCollapsed ? 76 : 240;
  const effectiveHeaderHeight = 48;

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
    <div
      className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      style={{
        '--sidebar-width': `${effectiveSidebarWidth}px`,
        '--header-height': `${effectiveHeaderHeight}px`,
      } as React.CSSProperties}
    >
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 1. Neumorphic Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        onNavigate={setActiveModule}
        pendingSyncCount={pendingSyncCount}
        unackAlertsCount={unackAlertsCount}
        isOfflineMode={isOfflineMode}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* 2. Sticky Command Header */}
      <CommandHeader
        activeModule={activeModule}
        pendingSyncCount={pendingSyncCount}
        isOfflineMode={isOfflineMode}
        onToggleOffline={handleToggleOffline}
        onTriggerSync={handleTriggerSync}
        onResetDemo={handleResetDemo}
        isSyncing={isSyncing}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={handleToggleSidebarCollapse}
        isHeaderCompact={isHeaderCompact}
        onToggleHeaderCompact={handleToggleHeaderCompact}
        isHeaderMinimized={isHeaderMinimized}
        onToggleHeaderMinimized={handleToggleHeaderMinimized}
      />

      {/* 3. Main Content Area */}
      <main className="app-main" style={{ padding: 0 }}>
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
    </div>
  );
};
