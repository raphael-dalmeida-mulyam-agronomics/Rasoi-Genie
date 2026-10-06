import {
  isSuperAdminEmail,
  fetchAdminProfile,
  assignAdminRegions,
  deleteAdminProfile,
  getAdminRoleAndRegions,
  SUPER_ADMIN_EMAIL,
  ALL_REGIONS,
  STORAGE_CENTRE_REGIONS,
  resolveStorageCentre,
} from '../services/adminRbacService';
import { filterMealKitsByAdminRegions } from '../services/supabaseMealKitsService';
import { getFilteredStateAnalytics } from '../services/regionalAnalyticsService';
import { INITIAL_MEAL_KITS, MealKit, toggleMealKitTrending } from '../services/mealKitsService';

describe('Admin RBAC & Regional Row-Level Security', () => {
  it('correctly identifies the super admin email', () => {
    expect(SUPER_ADMIN_EMAIL).toBe('raphael.dalmeida@mulyam.in');
    expect(isSuperAdminEmail('raphael.dalmeida@mulyam.in')).toBe(true);
    expect(isSuperAdminEmail('RAPHAEL.DALMEIDA@MULYAM.IN')).toBe(true);
    expect(isSuperAdminEmail('admin.north@mulyam.in')).toBe(false);
    expect(isSuperAdminEmail('unknown@mulyam.in')).toBe(false);
  });

  it('grants super admin full access to all regions', async () => {
    const profile = await fetchAdminProfile('raphael.dalmeida@mulyam.in');
    expect(profile).toBeDefined();
    expect(profile?.role).toBe('super_admin');
    expect(profile?.regions).toEqual(expect.arrayContaining(ALL_REGIONS));

    const { role, regions } = await getAdminRoleAndRegions('raphael.dalmeida@mulyam.in');
    expect(role).toBe('super_admin');
    expect(regions).toEqual(expect.arrayContaining(ALL_REGIONS));
  });

  it('supports many-to-many regional admin assignments', async () => {
    const multiRegionAdminEmail = 'test.multi.admin@mulyam.in';

    // Assign to North and West
    const saveRes = await assignAdminRegions(
      multiRegionAdminEmail,
      ['North', 'West'],
      'Multi Admin',
      'regional_admin',
    );
    expect(saveRes.success).toBe(true);

    const profile = await fetchAdminProfile(multiRegionAdminEmail);
    expect(profile?.role).toBe('regional_admin');
    expect(profile?.regions).toHaveLength(2);
    expect(profile?.regions).toContain('North');
    expect(profile?.regions).toContain('West');
    expect(profile?.regions).not.toContain('South');

    // Update assignment to add South (now North, West, South)
    await assignAdminRegions(
      multiRegionAdminEmail,
      ['North', 'West', 'South'],
      'Multi Admin',
      'regional_admin',
    );
    const updated = await fetchAdminProfile(multiRegionAdminEmail);
    expect(updated?.regions).toHaveLength(3);
    expect(updated?.regions).toContain('South');

    // Clean up
    await deleteAdminProfile(multiRegionAdminEmail);
    const deleted = await fetchAdminProfile(multiRegionAdminEmail);
    expect(deleted).toBeNull();
  });

  it('filters meal kits strictly according to admin assigned regions', () => {
    const sampleKits: Partial<MealKit>[] = [
      { id: 'kit-1', name: 'North Tadka', availableRegions: ['North'] },
      { id: 'kit-2', name: 'South Dosa', availableRegions: ['South'] },
      { id: 'kit-3', name: 'West Thepla', availableRegions: ['West'] },
      { id: 'kit-4', name: 'East Fish Curry', availableRegions: ['East'] },
      {
        id: 'kit-5',
        name: 'Pan-India Biryani',
        availableRegions: ['North', 'South', 'West', 'East'],
      },
    ];

    // Super Admin: sees all 5 kits
    const superAdminKits = filterMealKitsByAdminRegions(sampleKits as MealKit[], ALL_REGIONS, true);
    expect(superAdminKits).toHaveLength(5);

    // Regional Admin (North only): sees kit-1 and pan-India kit-5
    const northAdminKits = filterMealKitsByAdminRegions(sampleKits as MealKit[], ['North'], false);
    const northIds = northAdminKits.map((k) => k.id);
    expect(northIds).toContain('kit-1');
    expect(northIds).toContain('kit-5');
    expect(northIds).not.toContain('kit-2');
    expect(northIds).not.toContain('kit-3');
    expect(northIds).not.toContain('kit-4');

    // Regional Admin (South & East multi-region): sees kit-2, kit-4, and pan-India kit-5
    const southEastAdminKits = filterMealKitsByAdminRegions(
      sampleKits as MealKit[],
      ['South', 'East'],
      false,
    );
    const southEastIds = southEastAdminKits.map((k) => k.id);
    expect(southEastIds).toContain('kit-2');
    expect(southEastIds).toContain('kit-4');
    expect(southEastIds).toContain('kit-5');
    expect(southEastIds).not.toContain('kit-1');
    expect(southEastIds).not.toContain('kit-3');
  });

  it('scopes regional analytics and state statistics to assigned regions', () => {
    // Super admin sees all states
    const allStates = getFilteredStateAnalytics(ALL_REGIONS, true);
    expect(allStates.length).toBe(7);

    // Regional admin for North only sees North states (Delhi, Punjab, etc.)
    const northStates = getFilteredStateAnalytics(['North'], false);
    expect(northStates.length).toBeGreaterThan(0);
    expect(northStates.length).toBeLessThan(allStates.length);
    northStates.forEach((state) => {
      expect(state.region).toBe('North');
    });

    // Regional admin for South only sees South states (Karnataka, Tamil Nadu, etc.)
    const southStates = getFilteredStateAnalytics(['South'], false);
    expect(southStates.length).toBeGreaterThan(0);
    southStates.forEach((state) => {
      expect(state.region).toBe('South');
    });
  });

  it('allows admins to toggle dishes as trending', () => {
    expect(INITIAL_MEAL_KITS.length).toBeGreaterThan(0);

    const targetKit = INITIAL_MEAL_KITS[0]!;
    const initialTrending = !!targetKit.isTrending;

    const toggled = toggleMealKitTrending(targetKit.id);
    expect(toggled).toBeDefined();
    expect(toggled?.isTrending).toBe(!initialTrending);

    // Revert back
    const reverted = toggleMealKitTrending(targetKit.id);
    expect(reverted?.isTrending).toBe(initialTrending);
  });

  describe('Micro-Regions & Storage Centre Routing', () => {
    it('breaks down cities into smaller storage centre regions (e.g. Pune City vs PCMC)', () => {
      // Pune breakdown
      const puneRegions = STORAGE_CENTRE_REGIONS.filter((r) => r.city === 'Pune');
      expect(puneRegions.length).toBeGreaterThanOrEqual(2);
      expect(puneRegions.some((r) => r.id === 'pune-city' && r.name === 'Pune City')).toBe(true);
      expect(puneRegions.some((r) => r.id === 'pune-pcmc' && r.name === 'Pimpri Chinchwad')).toBe(
        true,
      );

      const pcmcHub = puneRegions.find((r) => r.id === 'pune-pcmc')!;
      expect(pcmcHub.storageCentreName).toContain('PCMC');
      expect(pcmcHub.coverageAreas).toContain('Nigdi');
      expect(pcmcHub.coverageAreas).toContain('Bhosari');

      // Other cities breakdown
      const mumbaiRegions = STORAGE_CENTRE_REGIONS.filter((r) => r.city === 'Mumbai');
      expect(mumbaiRegions.length).toBeGreaterThanOrEqual(3);

      const blrRegions = STORAGE_CENTRE_REGIONS.filter((r) => r.city === 'Bengaluru');
      expect(blrRegions.length).toBeGreaterThanOrEqual(3);

      const delhiRegions = STORAGE_CENTRE_REGIONS.filter((r) => r.city === 'Delhi NCR');
      expect(delhiRegions.length).toBeGreaterThanOrEqual(3);
    });

    it('resolves the exact storage centre from delivery address keywords', () => {
      // PCMC address -> PCMC Storage Centre
      const pcmcOrder = resolveStorageCentre('Sector 21, Nigdi Pradhikaran, PCMC');
      expect(pcmcOrder.id).toBe('pune-pcmc');
      expect(pcmcOrder.storageCentreName).toBe('RasoiGenie PCMC Cold-Storage Centre');

      // Pune City central address -> Pune City Central Depot
      const puneCityOrder = resolveStorageCentre('Flat 402, FC Road, Shivajinagar, Pune');
      expect(puneCityOrder.id).toBe('pune-city');
      expect(puneCityOrder.storageCentreName).toBe('RasoiGenie Pune Central Depot');

      // Bengaluru Whitefield address -> Whitefield Depot
      const blrOrder = resolveStorageCentre('Prestige Shantiniketan, Whitefield, Bengaluru');
      expect(blrOrder.id).toBe('blr-east');
      expect(blrOrder.storageCentreName).toBe('RasoiGenie Whitefield Depot');

      // Mumbai Andheri address -> Andheri Depot
      const mumbaiOrder = resolveStorageCentre('MIDC Central Road, Andheri East, Mumbai');
      expect(mumbaiOrder.id).toBe('mumbai-suburbs-west');
      expect(mumbaiOrder.storageCentreName).toBe('RasoiGenie Andheri Cold-Chain Depot');
    });

    it('supports assigning admins to specific smaller regions', async () => {
      const pcmcAdminEmail = 'pcmc.operations@mulyam.in';
      await assignAdminRegions(pcmcAdminEmail, ['pune-pcmc'], 'PCMC Admin', 'regional_admin');

      const profile = await fetchAdminProfile(pcmcAdminEmail);
      expect(profile).toBeDefined();
      expect(profile?.regions).toContain('pune-pcmc');
      expect(profile?.regions).not.toContain('pune-city');

      await deleteAdminProfile(pcmcAdminEmail);
    });
  });
});
