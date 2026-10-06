import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    AUTH_STORAGE_KEY,
    getStoredUser,
    loginWithGoogle,
    logoutUser,
    saveStoredUser,
    sendEmailOTP,
    sendPhoneOTP,
    subscribeToFirebaseAuthChanges,
    UserProfile,
    validateAdminEmail,
    verifyEmailOTP,
    verifyPhoneOTP,
} from '../firebase/authService';

import {
    AdminRole,
    ALL_REGIONS,
    fetchAdminProfile,
    isSuperAdminEmail,
} from '../services/adminRbacService';
import { RegionHub } from '../services/mealKitsService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isRegionalAdmin: boolean;
  isChef: boolean;
  assignedRegions: (RegionHub | string)[];
  currentAdminRole: AdminRole | null;
  refreshAdminPermissions: () => Promise<void>;
  refreshChefStatus: () => Promise<void>;
  userType: 'customer' | 'admin' | 'chef' | null;
  verificationId: string | null;
  phoneNumber: string | null;
  emailAddress: string | null;
  activeOtpHint: string | null;
  loginGoogle: () => Promise<{ success: boolean; error?: string }>;
  requestEmailOTP: (
    email: string,
  ) => Promise<{ success: boolean; error?: string; otpHint?: string }>;
  confirmEmailOTP: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  requestPhoneOTP: (
    phone: string,
  ) => Promise<{ success: boolean; error?: string; otpHint?: string }>;
  confirmPhoneOTP: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    // Instant synchronous restoration for Web / browser reloads
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored) as UserProfile;
        }
      } catch {
        // Fallback to async storage
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [emailAddress, setEmailAddress] = useState<string | null>(null);
  const [activeOtpHint, setActiveOtpHint] = useState<string | null>(null);

  // Regional RBAC State
  const [assignedRegions, setAssignedRegions] = useState<(RegionHub | string)[]>(ALL_REGIONS);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);

  const loadAdminPermissions = async (userEmail?: string | null) => {
    if (!userEmail) {
      setAssignedRegions([]);
      setAdminRole(null);
      return;
    }

    if (isSuperAdminEmail(userEmail)) {
      setAssignedRegions(ALL_REGIONS);
      setAdminRole('super_admin');
      return;
    }

    try {
      const profile = await fetchAdminProfile(userEmail);
      if (profile) {
        setAdminRole(profile.role);
        setAssignedRegions(profile.role === 'super_admin' ? ALL_REGIONS : profile.regions);
      } else {
        // Default new regional admin to North hub if not configured
        setAdminRole('regional_admin');
        setAssignedRegions(['North']);
      }
    } catch {
      setAssignedRegions(['North']);
      setAdminRole('regional_admin');
    }
  };

  useEffect(() => {
    if (user?.email && user.role === 'admin') {
      loadAdminPermissions(user.email);
    }
  }, [user?.email, user?.role]);

  // Synchronize chef status for active session (both on mount and on realtime updates)
  // Runs whenever uid/email changes (i.e. login/logout), NOT on role change —
  // including role in deps causes a circular loop where the effect never heals itself.
  useEffect(() => {
    let isMounted = true;
    if (!user || user.role === 'admin') return;

    const syncChefStatus = () => {
      import('../services/adminRbacService').then(({ fetchChefProfile }) => {
        fetchChefProfile(user.uid, user.email).then((chefProfile) => {
          if (!isMounted) return;
          if (chefProfile && user.role !== 'chef') {
            const updated = { ...user, role: 'chef' as const };
            setUser(updated);
            saveStoredUser(updated);
          } else if (!chefProfile && user.role === 'chef') {
            const updated = { ...user, role: 'customer' as const };
            setUser(updated);
            saveStoredUser(updated);
          }
        });
      });
    };

    // Run immediately on mount
    syncChefStatus();

    // Also poll every 8s while the app is open — catches cases where the
    // realtime listener doesn't fire (e.g. grant from a different device,
    // or Supabase realtime not connected).
    const interval = setInterval(syncChefStatus, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.uid, user?.email]);

  // Realtime listener for promotion/revocation while user is in active session
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    import('../services/supabaseUserService').then(({ subscribeToUserProfilesRealtime }) => {
      unsubscribe = subscribeToUserProfilesRealtime(async () => {
        if (!isMounted || !user || user.role === 'admin') return;
        const { fetchChefProfile } = await import('../services/adminRbacService');
        const chefProfile = await fetchChefProfile(user.uid, user.email);
        if (chefProfile && user.role !== 'chef') {
          const updated = { ...user, role: 'chef' as const };
          setUser(updated);
          saveStoredUser(updated);
        } else if (!chefProfile && user.role === 'chef') {
          const updated = { ...user, role: 'customer' as const };
          setUser(updated);
          saveStoredUser(updated);
        }
      });
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, user?.email, user?.role]);

  // Restore persisted session on native app startup / mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const storedUser = await getStoredUser();
        if (storedUser && isMounted) {
          setUser((prev) => prev || storedUser);
        }
      } catch (err) {
        console.warn('[AuthContext] Error restoring session on startup:', err);
      }
    })();

    // Listen to Firebase auth state persistence (Google OAuth)
    const unsubscribeFirebase = subscribeToFirebaseAuthChanges((fbProfile) => {
      if (isMounted && fbProfile) {
        setUser(fbProfile);
      }
    });

    // When the admin tab writes the chef store to localStorage (same origin),
    // the user's tab receives a 'storage' event — use it to immediately refresh.
    const handleStorageEvent = (e: StorageEvent) => {
      if (!isMounted) return;
      if (e.key === '@rasoi_chef_profiles_v1' || e.key === '@rasoi_auth_user') {
        // Re-read stored user; getStoredUser already checks chefStore
        getStoredUser().then((stored) => {
          if (isMounted && stored) {
            setUser(stored);
          }
        });
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent);
    }

    return () => {
      isMounted = false;
      unsubscribeFirebase();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent);
      }
    };
  }, []);

  const isAdmin = !!(user && user.role === 'admin' && user.email && validateAdminEmail(user.email));
  const isSuperAdmin = isAdmin && isSuperAdminEmail(user?.email);
  const isRegionalAdmin = isAdmin && !isSuperAdmin;
  const isChef = !!(user && user.role === 'chef');

  const refreshAdminPermissions = async () => {
    if (user?.email) {
      await loadAdminPermissions(user.email);
    }
  };

  // Manually re-check chef status from storage/Supabase immediately.
  // Called after admin grants the chef role so the user's session updates
  // without waiting for the 8-second polling interval.
  const refreshChefStatus = async () => {
    if (!user || user.role === 'admin') return;
    // Force-reload the chef store from storage before querying
    const { fetchChefProfile } = await import('../services/adminRbacService');
    const chefProfile = await fetchChefProfile(user.uid, user.email);
    if (chefProfile && user.role !== 'chef') {
      const updated = { ...user, role: 'chef' as const };
      setUser(updated);
      saveStoredUser(updated);
    } else if (!chefProfile && user.role === 'chef') {
      const updated = { ...user, role: 'customer' as const };
      setUser(updated);
      saveStoredUser(updated);
    }
  };

  const userType = user ? user.role : null;

  const loginGoogle = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.success && result.user) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error || 'Google Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const requestEmailOTP = async (email: string) => {
    setLoading(true);
    try {
      const result = await sendEmailOTP(email);
      if (result.success && result.verificationId) {
        setVerificationId(result.verificationId);
        setEmailAddress(email);
        setActiveOtpHint(result.otpHint || null);
        return { success: true, otpHint: result.otpHint };
      }
      return { success: false, error: result.error || 'Failed to send Email OTP' };
    } finally {
      setLoading(false);
    }
  };

  const confirmEmailOTP = async (email: string, code: string) => {
    setLoading(true);
    try {
      const result = await verifyEmailOTP(email, code);
      if (result.success && result.user) {
        setUser(result.user);
        setVerificationId(null);
        setActiveOtpHint(null);
        return { success: true };
      }
      return { success: false, error: result.error || 'Invalid OTP code' };
    } finally {
      setLoading(false);
    }
  };

  const requestPhoneOTP = async (phone: string) => {
    setLoading(true);
    try {
      const result = await sendPhoneOTP(phone);
      if (result.success && result.verificationId) {
        setVerificationId(result.verificationId);
        setPhoneNumber(phone);
        setActiveOtpHint(result.otpHint || null);
        return { success: true, otpHint: result.otpHint };
      }
      return { success: false, error: result.error || 'Failed to send Phone OTP' };
    } finally {
      setLoading(false);
    }
  };

  const confirmPhoneOTP = async (code: string) => {
    if (!phoneNumber) {
      return { success: false, error: 'Session expired. Please request a new OTP.' };
    }
    setLoading(true);
    try {
      const result = await verifyPhoneOTP(verificationId || 'verif_default', code, phoneNumber);
      if (result.success && result.user) {
        setUser(result.user);
        setVerificationId(null);
        setActiveOtpHint(null);
        return { success: true };
      }
      return { success: false, error: result.error || 'Invalid Phone OTP' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setVerificationId(null);
      setPhoneNumber(null);
      setEmailAddress(null);
      setActiveOtpHint(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        userType,
        verificationId,
        phoneNumber,
        emailAddress,
        activeOtpHint,
        isSuperAdmin,
        isRegionalAdmin,
        isChef,
        assignedRegions,
        currentAdminRole: adminRole,
        refreshAdminPermissions,
        refreshChefStatus,
        loginGoogle,
        requestEmailOTP,
        confirmEmailOTP,
        requestPhoneOTP,
        confirmPhoneOTP,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
