const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, value: string) => {
    mockStorage.set(key, value);
  }),
  getItem: jest.fn(async (key: string) => {
    return mockStorage.get(key) || null;
  }),
  removeItem: jest.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
  clear: jest.fn(async () => {
    mockStorage.clear();
  }),
}));

import {
  validateAdminEmail,
  loginWithGoogle,
  sendEmailOTP,
  verifyEmailOTP,
  sendPhoneOTP,
  verifyPhoneOTP,
  saveStoredUser,
  getStoredUser,
  clearStoredUser,
} from '../firebase/authService';

describe('Auth Service - Google Auth, Strict OTP Verification & @mulyam.in Admin Elevation', () => {
  describe('validateAdminEmail', () => {
    it('should return true for valid @mulyam.in email addresses', () => {
      expect(validateAdminEmail('admin@mulyam.in')).toBe(true);
      expect(validateAdminEmail('ceo@mulyam.in')).toBe(true);
      expect(validateAdminEmail('  CHEF@MULYAM.IN  ')).toBe(true);
    });

    it('should return false for non-@mulyam.in email addresses', () => {
      expect(validateAdminEmail('user@gmail.com')).toBe(false);
      expect(validateAdminEmail('admin@mulyam.com')).toBe(false);
      expect(validateAdminEmail('')).toBe(false);
    });
  });

  describe('loginWithGoogle', () => {
    it('should execute Google Auth and assign admin role if email ends with @mulyam.in', async () => {
      const res = await loginWithGoogle();
      expect(res.success).toBe(true);
      expect(res.user?.email?.endsWith('@mulyam.in')).toBe(true);
      expect(res.user?.role).toBe('admin');
    });
  });

  describe('Passwordless Email OTP', () => {
    it('should request email OTP and return generated 6-digit code', async () => {
      const res = await sendEmailOTP('customer@gmail.com');
      expect(res.success).toBe(true);
      expect(res.otpHint).toBeDefined();
      expect(res.otpHint?.length).toBe(6);
    });

    it('should REJECT incorrect random OTP code entered for email', async () => {
      const sendRes = await sendEmailOTP('test@gmail.com');
      const badVerify = await verifyEmailOTP('test@gmail.com', '999999');
      expect(badVerify.success).toBe(false);
      expect(badVerify.error).toContain('Incorrect OTP code entered');
    });

    it('should ACCEPT correct matching OTP code for email', async () => {
      const sendRes = await sendEmailOTP('user@gmail.com');
      const validCode = sendRes.otpHint || '123456';
      const verifyRes = await verifyEmailOTP('user@gmail.com', validCode);
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.user?.role).toBe('customer');
      expect(verifyRes.user?.email).toBe('user@gmail.com');
    });

    it('should automatically assign admin role for @mulyam.in email address with valid OTP', async () => {
      const sendRes = await sendEmailOTP('manager@mulyam.in');
      const validCode = sendRes.otpHint || '123456';
      const verifyRes = await verifyEmailOTP('manager@mulyam.in', validCode);
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.user?.role).toBe('admin');
      expect(verifyRes.user?.email).toBe('manager@mulyam.in');
    });
  });

  describe('Phone OTP', () => {
    it('should REJECT incorrect random Phone OTP code', async () => {
      const sendRes = await sendPhoneOTP('9876543210');
      const badVerify = await verifyPhoneOTP(
        sendRes.verificationId || 'v1',
        '888888',
        '9876543210',
      );
      expect(badVerify.success).toBe(false);
      expect(badVerify.error).toContain('Incorrect Phone OTP code');
    });

    it('should ACCEPT correct matching Phone OTP code', async () => {
      const sendRes = await sendPhoneOTP('9876543210');
      const validCode = sendRes.otpHint || '123456';
      const verifyRes = await verifyPhoneOTP(
        sendRes.verificationId || 'v1',
        validCode,
        '9876543210',
      );
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.user?.role).toBe('customer');
    });
  });

  describe('Session Persistence (App Close / Page Reload Survival)', () => {
    it('should save, retrieve, and clear user session in persistent storage', async () => {
      const testProfile = {
        uid: 'user_persistent_123',
        email: 'persistent@mulyam.in',
        role: 'admin' as const,
        displayName: 'Persistent Admin',
        createdAt: new Date().toISOString(),
      };

      await saveStoredUser(testProfile);
      const retrieved = await getStoredUser();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.uid).toBe('user_persistent_123');
      expect(retrieved?.email).toBe('persistent@mulyam.in');

      await clearStoredUser();
      const afterClear = await getStoredUser();
      expect(afterClear).toBeNull();
    });
  });
});
