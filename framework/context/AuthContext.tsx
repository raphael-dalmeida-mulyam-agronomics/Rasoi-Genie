import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
import { clearDependentSession } from '../services/familyAuthBridge';

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
  updateUserContact: (contact: {
    displayName?: string;
    phoneNumber?: string;
    email?: string;
  }) => Promise<void>;
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

  const [isChef, setIsChef] = useState<boolean>(() => user?.role === 'chef');

  const syncChefStatus = useCallback(async () => {
    if (!user) {
      setIsChef(false);
      return;
    }
    try {
      const { fetchChefProfile } = await import('../services/adminRbacService');
      const chefProfile = await fetchChefProfile(user.uid, user.email);
      const active = Boolean(chefProfile);
      setIsChef(active);

      if (active && user.role !== 'chef' && user.role !== 'admin') {
        const updated = { ...user, role: 'chef' as const };
        setUser(updated);
        saveStoredUser(updated);
      } else if (!active && user.role === 'chef') {
        const updated = { ...user, role: 'customer' as const };
        setUser(updated);
        saveStoredUser(updated);
      }
    } catch (err) {
      console.warn('[AuthContext] syncChefStatus error:', err);
    }
  }, [user?.uid, user?.email, user?.role]);

  const syncChefStatusRef = useRef(syncChefStatus);
  syncChefStatusRef.current = syncChefStatus;

  // Synchronize chef status on mount and poll as fallback
  useEffect(() => {
    if (!user) return;

    syncChefStatus();
    const interval = setInterval(() => {
      syncChefStatusRef.current();
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.uid, user?.email]);

  // Realtime listeners for promotion/revocation on chef_profiles and user_profiles
  useEffect(() => {
    let unsubscribeChef: (() => void) | undefined;
    let unsubscribeUser: (() => void) | undefined;

    import('../services/adminRbacService').then(({ subscribeToChefProfilesRealtime }) => {
      unsubscribeChef = subscribeToChefProfilesRealtime(() => {
        syncChefStatusRef.current();
      });
    });

    import('../services/supabaseUserService').then(({ subscribeToUserProfilesRealtime }) => {
      unsubscribeUser = subscribeToUserProfilesRealtime(() => {
        syncChefStatusRef.current();
      });
    });

    const handleCustomEvent = () => {
      syncChefStatusRef.current();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('chef_role_changed', handleCustomEvent);
    }

    return () => {
      if (unsubscribeChef) unsubscribeChef();
      if (unsubscribeUser) unsubscribeUser();
      if (typeof window !== 'undefined') {
        window.removeEventListener('chef_role_changed', handleCustomEvent);
      }
    };
  }, []);

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

    const handleStorageEvent = (e: StorageEvent) => {
      if (!isMounted) return;
      if (
        e.key === '@rasoi_chef_profiles_v1' ||
        e.key === '@rasoi_auth_user' ||
        e.key === '@rasoi_chef_sync_trigger'
      ) {
        syncChefStatus();
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
  }, [syncChefStatus]);

  const isAdmin = !!(user && user.role === 'admin' && user.email && validateAdminEmail(user.email));
  const isSuperAdmin = isAdmin && isSuperAdminEmail(user?.email);
  const isRegionalAdmin = isAdmin && !isSuperAdmin;

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

  const updateUserContact = async (contact: {
    displayName?: string;
    phoneNumber?: string;
    email?: string;
  }) => {
    if (user) {
      const updatedUser: UserProfile = {
        ...user,
        displayName: contact.displayName !== undefined ? contact.displayName : user.displayName,
        phoneNumber: contact.phoneNumber !== undefined ? contact.phoneNumber : user.phoneNumber,
        email: contact.email !== undefined ? contact.email : user.email,
      };
      setUser(updatedUser);
      await saveStoredUser(updatedUser);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await clearDependentSession();
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
        updateUserContact,
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
