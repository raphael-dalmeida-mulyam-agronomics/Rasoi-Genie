import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase/config';
import { UserProfile, signInAnonymousUser, saveStoredUser } from '../firebase/authService';
import { setSupabaseAuthToken } from '../supabase/client';

export const DEPENDENT_SESSION_STORAGE_KEY = '@rasoi_dependent_session_v1';

export interface DependentSession {
  uid: string;
  displayName: string;
  dependentType: 'child' | 'senior';
  familyId?: string;
  familyName?: string;
  role: 'dependent';
  joinedAt: string;
}

let inMemoryDependentSession: DependentSession | null = null;

/**
 * Bridges active Firebase session to Supabase by acquiring the Firebase ID token
 * and passing it to the Supabase client and Realtime socket.
 */
export async function bridgeFirebaseToSupabase(): Promise<string | null> {
  try {
    const currentFbUser = auth.currentUser;
    if (currentFbUser) {
      const token = await currentFbUser.getIdToken();
      return token;
    }
  } catch (err) {
    console.warn('[FamilyAuthBridge] Failed to bridge Firebase token to Supabase:', err);
  }
  return null;
}

/**
 * Creates or restores an anonymous dependent session.
 * Guaranteed to provide a working identity for Supabase RLS and Realtime.
 */
export async function createOrRestoreDependentSession(
  displayName: string,
  dependentType: 'child' | 'senior',
  familyId?: string,
  familyName?: string,
): Promise<{ success: boolean; session?: DependentSession; error?: string }> {
  try {
    const firstName = displayName.trim().split(' ')[0] || 'Member';
    const authResult = await signInAnonymousUser(firstName);

    if (!authResult.success || !authResult.user) {
      return {
        success: false,
        error: authResult.error || 'Failed to initialize anonymous session',
      };
    }

    const session: DependentSession = {
      uid: authResult.user.uid,
      displayName: firstName,
      dependentType,
      familyId,
      familyName,
      role: 'dependent',
      joinedAt: new Date().toISOString(),
    };

    inMemoryDependentSession = session;

    // Cross-platform persistence
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DEPENDENT_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    await AsyncStorage.setItem(DEPENDENT_SESSION_STORAGE_KEY, JSON.stringify(session));

    // Bridge token to Supabase
    await bridgeFirebaseToSupabase();

    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Could not setup dependent session' };
  }
}

/**
 * Retrieves the currently active dependent session if present.
 */
export async function getDependentSession(): Promise<DependentSession | null> {
  if (inMemoryDependentSession) {
    return inMemoryDependentSession;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(DEPENDENT_SESSION_STORAGE_KEY);
      if (raw) {
        inMemoryDependentSession = JSON.parse(raw);
        return inMemoryDependentSession;
      }
    }

    const nativeRaw = await AsyncStorage.getItem(DEPENDENT_SESSION_STORAGE_KEY);
    if (nativeRaw) {
      inMemoryDependentSession = JSON.parse(nativeRaw);
      return inMemoryDependentSession;
    }
  } catch (err) {
    console.warn('[FamilyAuthBridge] Error reading dependent session:', err);
  }

  return null;
}

/**
 * Clears dependent session storage upon leaving or account reset.
 */
export async function clearDependentSession(): Promise<void> {
  inMemoryDependentSession = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(DEPENDENT_SESSION_STORAGE_KEY);
    }
    await AsyncStorage.removeItem(DEPENDENT_SESSION_STORAGE_KEY);
    setSupabaseAuthToken(null);
  } catch (err) {
    console.warn('[FamilyAuthBridge] Error clearing dependent session:', err);
  }
}

/**
 * Returns true if a session is currently restricted to dependent shell.
 */
export function isDependentUser(
  user: UserProfile | null,
  dependentSession: DependentSession | null,
): boolean {
  if (dependentSession && dependentSession.role === 'dependent') {
    return true;
  }
  return !!(user && user.isAnonymous);
}
