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
  createOrRestoreDependentSession,
  getDependentSession,
  clearDependentSession,
  isDependentUser,
} from '../services/familyAuthBridge';
import { UserProfile } from '../firebase/authService';

describe('Dependent Shell & Session Isolation', () => {
  beforeEach(async () => {
    await clearDependentSession();
  });

  afterEach(async () => {
    await clearDependentSession();
  });

  it('creates an anonymous dependent session with valid attributes', async () => {
    const res = await createOrRestoreDependentSession('Aarav', 'child', 'fam_1', 'Sharma Family');
    expect(res.success).toBe(true);
    expect(res.session).toBeDefined();
    expect(res.session?.displayName).toBe('Aarav');
    expect(res.session?.dependentType).toBe('child');
    expect(res.session?.role).toBe('dependent');
    expect(res.session?.familyId).toBe('fam_1');
  });

  it('persists and restores the dependent session from storage', async () => {
    await createOrRestoreDependentSession('Dadi', 'senior', 'fam_2', 'Gupta Family');
    const restored = await getDependentSession();
    expect(restored).not.toBeNull();
    expect(restored?.displayName).toBe('Dadi');
    expect(restored?.dependentType).toBe('senior');
  });

  it('correctly identifies dependent sessions', () => {
    const regularUser: UserProfile = {
      uid: 'user_1',
      role: 'customer',
      createdAt: new Date().toISOString(),
      isAnonymous: false,
    };
    expect(isDependentUser(regularUser, null)).toBe(false);

    const anonUser: UserProfile = {
      uid: 'anon_1',
      role: 'customer',
      createdAt: new Date().toISOString(),
      isAnonymous: true,
    };
    expect(isDependentUser(anonUser, null)).toBe(true);
  });

  it('clears dependent session on logout or family exit', async () => {
    await createOrRestoreDependentSession('Chintu', 'child');
    expect(await getDependentSession()).not.toBeNull();

    await clearDependentSession();
    expect(await getDependentSession()).toBeNull();
  });
});
