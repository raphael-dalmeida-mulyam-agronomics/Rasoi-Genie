import { getSupabaseClient } from '../supabase/client';
import {
  fetchAllUserProfilesFromSupabase,
  subscribeToUserProfilesRealtime,
  emitUserProfileUpdated,
} from './supabaseUserService';
import { subscribeToWalletsRealtime, getAllLocalWalletsMap } from './walletService';

export interface ManagedUser {
  id: string; // Customer ID (UID)
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'customer' | 'chef';
  status: 'active' | 'suspended';
  city: string;
  ordersCount: number;
  totalSpend: number;
  joinedDate: string;
  lastActive: string;
  walletBalance?: number;
  walletReserved?: number;
}

const INITIAL_USERS: ManagedUser[] = [
  {
    id: 'admin_raphael_01',
    name: 'Raphael D’Almeida (Staff)',
    email: 'admin@mulyam.in',
    phone: '+91 98765 43210',
    role: 'admin',
    status: 'active',
    city: 'Bengaluru',
    ordersCount: 28,
    totalSpend: 11450,
    joinedDate: 'Jan 2026',
    lastActive: 'Just now',
    walletBalance: 0,
    walletReserved: 0,
  },
];

let usersStore: ManagedUser[] = [...INITIAL_USERS];

export function getManagedUsers(): ManagedUser[] {
  return usersStore.map((u) => {
    const em = (u.email || '').trim().toLowerCase();
    if (u.role === 'admin' && (!em.endsWith('@mulyam.in') || em === 'raphdesantos@gmail.com')) {
      return { ...u, role: 'customer' };
    }
    return u;
  });
}

export function updateUserWalletBalance(userId: string, newBalance: number): void {
  usersStore = usersStore.map((u) =>
    u.id === userId ? { ...u, walletBalance: newBalance } : u,
  );
  emitUserProfileUpdated();
}

/**
 * Fetches all live registered customer accounts and staff admins from Supabase,
 * attaching their actual live wallet balances, orders count, and total spend.
 */
export async function fetchLiveManagedUsers(): Promise<ManagedUser[]> {
  try {
    const supabase = getSupabaseClient();

    // 1. Fetch live user profiles (merges DB, orders, and persistent caches)
    const profiles = await fetchAllUserProfilesFromSupabase();

    // 2. Fetch live wallets: check local persistent wallet cache first
    const walletMap = new Map<string, { available: number; reserved: number }>();
    try {
      const localWallets = await getAllLocalWalletsMap();
      localWallets.forEach((val, uid) => {
        walletMap.set(uid, { available: val.available, reserved: val.reserved });
      });
    } catch {}

    // Check remote Supabase wallets table if available
    try {
      const { data: walletsData } = await supabase
        .from('wallets')
        .select('user_id, available_balance, reserved_balance');

      if (Array.isArray(walletsData)) {
        walletsData.forEach((w: any) => {
          if (w.user_id) {
            walletMap.set(w.user_id, {
              available: parseFloat(w.available_balance || 0),
              reserved: parseFloat(w.reserved_balance || 0),
            });
          }
        });
      }
    } catch {}

    // 3. Fetch orders for counts and spend metrics
    const ordersMap = new Map<string, { count: number; spend: number }>();
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, user_id, total_amount');

      if (Array.isArray(ordersData)) {
        ordersData.forEach((o: any) => {
          if (o.user_id) {
            const prev = ordersMap.get(o.user_id) || { count: 0, spend: 0 };
            ordersMap.set(o.user_id, {
              count: prev.count + 1,
              spend: prev.spend + (parseFloat(o.total_amount) || 0),
            });
          }
        });
      }
    } catch {}

    // Fetch approved chef profiles to assign live chef roles
    let chefUidSet = new Set<string>();
    try {
      const { fetchAllChefProfiles } = await import('./adminRbacService');
      const chefProfiles = await fetchAllChefProfiles();
      chefUidSet = new Set(chefProfiles.map((c) => c.uid));
    } catch {}

    // 4. Map profiles into ManagedUser records
    const liveUsers: ManagedUser[] = [];
    const seenIds = new Set<string>();

    for (const p of profiles) {
      if (!p.uid) continue;
      seenIds.add(p.uid);

      const wallet = walletMap.get(p.uid);
      const orders = ordersMap.get(p.uid);

      // Determine display name
      const name =
        p.displayName ||
        p.addresses?.[0]?.name ||
        (p.phoneNumber ? `Customer (${p.phoneNumber.slice(-4)})` : 'Customer');

      const phone = p.phoneNumber || p.addresses?.[0]?.phone || 'N/A';
      const email = p.email || 'N/A';
      const city = p.preferences?.city || p.addresses?.[0]?.city || 'Pan-India';

      // Check if user already exists in usersStore (preserve local toggle status & counts)
      const existing = usersStore.find((u) => u.id === p.uid);

      const emailLower = (p.email || '').trim().toLowerCase();
      const isMulyamEmail =
        emailLower.endsWith('@mulyam.in') && emailLower !== 'raphdesantos@gmail.com';

      // Staff admin accounts are strictly identified by admin_ ID prefix AND must have a valid @mulyam.in email
      const isStaffAdmin =
        isMulyamEmail &&
        (p.uid.toLowerCase().startsWith('admin_') ||
          (existing?.role === 'admin' && p.uid.toLowerCase().startsWith('admin_')));

      const isChef = chefUidSet.has(p.uid) || existing?.role === 'chef';

      const determinedRole: 'admin' | 'customer' | 'chef' =
        isStaffAdmin || (existing?.role === 'admin' && isMulyamEmail)
          ? 'admin'
          : isChef
          ? 'chef'
          : 'customer';

      liveUsers.push({
        id: p.uid, // Customer ID
        name,
        email,
        phone,
        role: determinedRole,
        status: existing?.status || 'active',
        city,
        ordersCount: orders ? orders.count : (existing?.ordersCount ?? 0),
        totalSpend: orders ? orders.spend : (existing?.totalSpend ?? 0),
        joinedDate: p.updatedAt
          ? new Date(p.updatedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          : existing?.joinedDate || 'Recent',
        lastActive: existing?.lastActive || 'Active today',
        walletBalance: wallet?.available ?? existing?.walletBalance ?? 0,
        walletReserved: wallet?.reserved ?? existing?.walletReserved ?? 0,
      });
    }

    // 5. Keep initial seeded customers/admins if not yet in profileMap
    for (const initUser of INITIAL_USERS) {
      if (!seenIds.has(initUser.id)) {
        const wallet = walletMap.get(initUser.id);
        liveUsers.push({
          ...initUser,
          walletBalance: wallet?.available ?? initUser.walletBalance ?? 0,
        });
        seenIds.add(initUser.id);
      }
    }

    usersStore = liveUsers;
    return liveUsers;
  } catch (err) {
    console.warn('[UserManagement] fetchLiveManagedUsers exception:', err);
    return [...usersStore];
  }
}

/**
 * Subscribes to live real-time updates for customer accounts and wallets.
 */
export function subscribeToManagedUsers(callback: () => void): () => void {
  const unsubProfiles = subscribeToUserProfilesRealtime(callback);
  const unsubWallets = subscribeToWalletsRealtime(callback);

  return () => {
    unsubProfiles();
    unsubWallets();
  };
}

export function toggleUserStatus(userId: string): void {
  usersStore = usersStore.map((u) =>
    u.id === userId ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u,
  );
  emitUserProfileUpdated();
}

/**
 * Toggles user role between customer and admin.
 * Admin role can STRICTLY only be granted to emails ending with @mulyam.in.
 * Rejects raphdesantos@gmail.com and any non-@mulyam.in email address.
 */
export function toggleUserAdminRole(userId: string): void {
  usersStore = usersStore.map((u) => {
    if (u.id === userId) {
      const emailLower = (u.email || '').trim().toLowerCase();
      if (u.role !== 'admin') {
        if (!emailLower.endsWith('@mulyam.in') || emailLower === 'raphdesantos@gmail.com') {
          console.warn(
            `[UserManagement] Admin role can only be granted to @mulyam.in emails. Rejected for: ${u.email}`,
          );
          return u;
        }
        return { ...u, role: 'admin' };
      } else {
        return { ...u, role: 'customer' };
      }
    }
    return u;
  });
  emitUserProfileUpdated();
}

/**
 * Toggles a user's role between customer and chef in the managed users store.
 */
export function toggleUserChefRole(userId: string): void {
  usersStore = usersStore.map((u) => {
    if (u.id === userId) {
      const newRole = u.role === 'chef' ? 'customer' : 'chef';
      return { ...u, role: newRole };
    }
    return u;
  });
  emitUserProfileUpdated();
}

/**
 * Explicitly sets (or clears) the chef role for a user in the managed users store.
 * Admin roles are never overwritten.
 */
export function setUserChefRole(userId: string, isChef: boolean): void {
  usersStore = usersStore.map((u) => {
    if (u.id === userId && u.role !== 'admin') {
      return { ...u, role: isChef ? 'chef' : 'customer' };
    }
    return u;
  });
  emitUserProfileUpdated();
}

