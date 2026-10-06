import { validateAdminEmail } from '../firebase/authService';
import {
  fetchLiveManagedUsers,
  getManagedUsers,
  toggleUserAdminRole,
} from '../services/userManagementService';
import {
  fetchAllAdminProfiles,
  fetchAdminProfile,
  assignAdminRegions,
} from '../services/adminRbacService';

describe('Admin Grant Restrictions & raphdesantos@gmail.com Removal', () => {
  describe('validateAdminEmail domain restriction', () => {
    it('strictly returns false for raphdesantos@gmail.com', () => {
      expect(validateAdminEmail('raphdesantos@gmail.com')).toBe(false);
    });

    it('returns false for any regular non-@mulyam.in emails', () => {
      expect(validateAdminEmail('customer@gmail.com')).toBe(false);
      expect(validateAdminEmail('admin@yahoo.com')).toBe(false);
      expect(validateAdminEmail('test@outlook.com')).toBe(false);
    });

    it('returns true only for emails ending with @mulyam.in', () => {
      expect(validateAdminEmail('staff@mulyam.in')).toBe(true);
      expect(validateAdminEmail('raphael.dalmeida@mulyam.in')).toBe(true);
    });
  });

  describe('toggleUserAdminRole in userManagementService', () => {
    it('prevents granting admin to raphdesantos@gmail.com', async () => {
      const users = await fetchLiveManagedUsers();
      // Add or simulate a user with raphdesantos@gmail.com
      const user = users.find((u) => u.email.toLowerCase() === 'raphdesantos@gmail.com');
      if (user) {
        expect(user.role).not.toBe('admin');
        toggleUserAdminRole(user.id);
        const updated = getManagedUsers().find((u) => u.id === user.id);
        expect(updated?.role).not.toBe('admin');
      }
    });

    it('rejects promoting any non-@mulyam.in customer to admin', async () => {
      const users = getManagedUsers();
      const customer = users.find((u) => !u.email.toLowerCase().endsWith('@mulyam.in'));
      if (customer) {
        const originalRole = customer.role;
        toggleUserAdminRole(customer.id);
        const updated = getManagedUsers().find((u) => u.id === customer.id);
        expect(updated?.role).toBe(originalRole); // Should NOT have changed to admin
        expect(updated?.role).not.toBe('admin');
      }
    });

    it('allows granting admin only to customers whose email ends with @mulyam.in', () => {
      const users = getManagedUsers();
      const mulyamUser = users.find(
        (u) =>
          u.email.toLowerCase().endsWith('@mulyam.in') &&
          u.email.toLowerCase() !== 'raphdesantos@gmail.com' &&
          u.role === 'customer',
      );
      if (mulyamUser) {
        toggleUserAdminRole(mulyamUser.id);
        const updated = getManagedUsers().find((u) => u.id === mulyamUser.id);
        expect(updated?.role).toBe('admin');
      }
    });
  });

  describe('adminRbacService admin profiles filtering', () => {
    it('fetchAdminProfile returns null for raphdesantos@gmail.com', async () => {
      const profile = await fetchAdminProfile('raphdesantos@gmail.com');
      expect(profile).toBeNull();
    });

    it('fetchAllAdminProfiles excludes raphdesantos@gmail.com and any non-@mulyam.in email', async () => {
      const profiles = await fetchAllAdminProfiles();
      const foundBanned = profiles.find(
        (p) => p.email.toLowerCase() === 'raphdesantos@gmail.com',
      );
      expect(foundBanned).toBeUndefined();

      for (const p of profiles) {
        expect(p.email.toLowerCase().endsWith('@mulyam.in')).toBe(true);
      }
    });

    it('assignAdminRegions rejects raphdesantos@gmail.com and non-@mulyam.in emails', async () => {
      const res = await assignAdminRegions('raphdesantos@gmail.com', ['pune-city']);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/@mulyam.in/);

      const resNonMulyam = await assignAdminRegions('test@gmail.com', ['pune-city']);
      expect(resNonMulyam.success).toBe(false);
      expect(resNonMulyam.error).toMatch(/@mulyam.in/);
    });
  });
});
