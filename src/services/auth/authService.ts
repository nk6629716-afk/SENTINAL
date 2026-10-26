/**
 * SENTINEL Frontend Supabase Authentication & Session Service
 * Handles user sign-in, token storage, role resolution, and session persistence.
 * Uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY when configured.
 * Never exposes Supabase Service Role Key to client bundles.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserRole, UserProfile, AuthSession } from '@shared/types';

const STORAGE_KEY = 'sentinel_auth_session';

// Extract public frontend credentials from Vite environment
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || 'https://cajrbzfsfsimxweomrlt.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';

let clientInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey && supabaseAnonKey.trim().length > 0) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('[AuthService] Failed to initialize Supabase client:', err);
  }
}

export type AuthListener = (session: AuthSession | null) => void;

class AuthService {
  private currentSession: AuthSession | null = null;
  private listeners: Set<AuthListener> = new Set();

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
      } else {
        // Default to demo administrator for out-of-the-box local evaluation
        this.currentSession = {
          token: 'dev-admin-token',
          user: {
            id: 'usr-admin-demo',
            email: 'admin@sentinel.mil',
            role: 'administrator',
            callsign: 'COMMAND-1',
            unit: 'HQ Command Element',
          },
        };
      }
    } catch {
      this.currentSession = null;
    }
  }

  public getSession(): AuthSession | null {
    return this.currentSession;
  }

  public getToken(): string | null {
    return this.currentSession?.token || null;
  }

  public getUser(): UserProfile | null {
    return this.currentSession?.user || null;
  }

  public getRole(): UserRole {
    return this.currentSession?.user?.role || 'read_only_viewer';
  }

  public isAuthenticated(): boolean {
    return Boolean(this.currentSession?.token);
  }

  public hasRole(requiredRoles: UserRole[]): boolean {
    const role = this.getRole();
    return requiredRoles.includes(role);
  }

  public async loginWithSupabase(email: string, password: string): Promise<AuthSession> {
    if (clientInstance) {
      const { data, error } = await clientInstance.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        throw new Error(error?.message || 'Authentication failed');
      }

      const role: UserRole =
        data.user.app_metadata?.role || data.user.user_metadata?.role || 'read_only_viewer';

      const session: AuthSession = {
        token: data.session.access_token,
        expiresAt: data.session.expires_at,
        user: {
          id: data.user.id,
          email: data.user.email || email,
          role,
          callsign: data.user.user_metadata?.callsign,
          unit: data.user.user_metadata?.unit,
        },
      };

      this.setSession(session);
      return session;
    }

    // Backend proxy fallback
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Login failed');
    }

    const session: AuthSession = json.data;
    this.setSession(session);
    return session;
  }

  public demoLogin(role: UserRole): AuthSession {
    const token =
      role === 'administrator'
        ? 'dev-admin-token'
        : role === 'operations_officer'
        ? 'dev-ops-token'
        : role === 'medical_officer'
        ? 'dev-medical-token'
        : 'dev-viewer-token';

    const user: UserProfile = {
      id: `usr-${role}-demo`,
      email: `${role.replace('_', '.')}@sentinel.mil`,
      role,
      callsign:
        role === 'administrator'
          ? 'COMMAND-1'
          : role === 'operations_officer'
          ? 'TACTICAL-OPS'
          : role === 'medical_officer'
          ? 'MEDEVAC-LEAD'
          : 'OBSERVER-SIT',
      unit: role === 'medical_officer' ? 'Forward Triage & Health Monitoring' : 'Field Operations Group',
    };

    const session: AuthSession = {
      token,
      user,
    };

    this.setSession(session);
    return session;
  }

  public logout(): void {
    if (clientInstance) {
      clientInstance.auth.signOut().catch(() => {});
    }
    this.currentSession = null;
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }

  private setSession(session: AuthSession): void {
    this.currentSession = session;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {}
    this.notify();
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.currentSession));
  }
}

export const authService = new AuthService();
