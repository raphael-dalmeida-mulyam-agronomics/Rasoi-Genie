import React, { createContext, useContext, useState } from 'react';
import {
  UserProfile,
  loginWithGoogle,
  sendEmailOTP,
  verifyEmailOTP,
  sendPhoneOTP,
  verifyPhoneOTP,
  logoutUser,
  validateAdminEmail,
} from '../firebase/authService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  userType: 'customer' | 'admin' | null;
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [emailAddress, setEmailAddress] = useState<string | null>(null);
  const [activeOtpHint, setActiveOtpHint] = useState<string | null>(null);

  const isAdmin = !!(user && user.role === 'admin' && user.email && validateAdminEmail(user.email));

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
