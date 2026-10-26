import { UserProfile, UserRole } from '@shared/types';
import { API_BASE_URL } from './apiClient';

export interface AuthSession {
  user: UserProfile;
  token?: string;
}

export interface SignUpPayload {
  email: string;
  password?: string;
  name: string;
  callsign?: string;
  role?: UserRole;
  teamId?: string;
  teamName?: string;
  missionId?: string;
  missionName?: string;
}

export interface AddPersonnelPayload {
  id: string;
  name: string;
  teamId?: string;
  teamName?: string;
  missionId?: string;
  missionName?: string;
  role?: UserRole;
  callsign?: string;
  isNewRegistration?: boolean;
}

export class AuthService {
  private static readonly STORAGE_USER_KEY = 'sentinel_auth_user';
  private static readonly STORAGE_TOKEN_KEY = 'sentinel_auth_token';

  public getCurrentUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem(AuthService.STORAGE_USER_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as UserProfile;
    } catch {
      return null;
    }
  }

  public getToken(): string | null {
    try {
      return localStorage.getItem(AuthService.STORAGE_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  public setCurrentUser(user: UserProfile, token?: string): void {
    try {
      localStorage.setItem(AuthService.STORAGE_USER_KEY, JSON.stringify(user));
      if (token) {
        localStorage.setItem(AuthService.STORAGE_TOKEN_KEY, token);
      }
    } catch (err) {
      console.warn('[AuthService] Failed to cache user session:', err);
    }
  }

  public clearCurrentUser(): void {
    try {
      localStorage.removeItem(AuthService.STORAGE_USER_KEY);
      localStorage.removeItem(AuthService.STORAGE_TOKEN_KEY);
    } catch (err) {
      console.warn('[AuthService] Failed to clear user session:', err);
    }
  }

  public async signUp(payload: SignUpPayload): Promise<{ success: boolean; user?: UserProfile; error?: string; status?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}: Signup rejected.` };
      }
      return data;
    } catch (err) {
      return { success: false, error: (err as Error).message || 'Network connection failed.' };
    }
  }

  public async signIn(email: string, password?: string): Promise<{ success: boolean; user?: UserProfile; token?: string; error?: string; status?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          status: data.status || (res.status === 403 ? 'pending' : undefined),
          error: data.error || `HTTP ${res.status}: Access Denied.`,
        };
      }

      if (data.user) {
        this.setCurrentUser(data.user, data.token);
      }

      return data;
    } catch (err) {
      return { success: false, error: (err as Error).message || 'Network connection error.' };
    }
  }

  public async signOut(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
    } catch (err) {
      console.warn('[AuthService] Logout endpoint notice:', err);
    } finally {
      this.clearCurrentUser();
    }
  }

  public async forgotPassword(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Password reset request failed.' };
      }
      return data;
    } catch (err) {
      return { success: false, error: (err as Error).message || 'Network request failed.' };
    }
  }

  public async getUsers(): Promise<{ success: boolean; users?: UserProfile[]; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users`);
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
      return await res.json();
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  public async approveUser(userId: string, assignedRole: UserRole, approvedBy: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, assignedRole, approvedBy }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
      return data;
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  public async addPersonnel(payload: AddPersonnelPayload, requesterRole: string): Promise<{ success: boolean; personnel?: any; accountLinked?: boolean; linkedUserEmail?: string; error?: string; message?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/vitalwatch/personnel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': requesterRole,
        },
        body: JSON.stringify({
          ...payload,
          requesterRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || `HTTP ${res.status}: Registration failed.` };
      }
      return data;
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}

export const authService = new AuthService();
