import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { getSupabaseClient } from '../supabase/client';
import { isMissingSchemaError } from './supabaseUtils';
import { CONFIG } from '../../src/constants/config';
import { subscribeToTable } from './realtimeService';

// ─── Interfaces & Types ──────────────────────────────────────────────────────

export type FamilyRole = 'owner' | 'co_owner' | 'member' | 'dependent';
export type DependentType = 'child' | 'senior';
export type ItemStatus = 'approved' | 'pending_approval' | 'rejected';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
export type LinkStatus = 'pending' | 'redeemed' | 'expired' | 'revoked';

export interface Family {
  id: string;
  name: string;
  owner_id: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  family_id: string;
  user_id: string;
  role: FamilyRole;
  dependent_type?: DependentType | null;
  display_name: string;
  joined_at: string;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  invited_by: string;
  invited_phone: string;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyJoinLink {
  id: string;
  family_id: string;
  created_by: string;
  token_hash: string;
  dependent_type: DependentType;
  display_name: string;
  status: LinkStatus;
  expires_at: string;
  redeemed_by?: string | null;
  redeemed_at?: string | null;
  guardian_confirmed: boolean;
  consent_version: string;
  created_at: string;
}

export interface FamilyCartItem {
  id: string;
  family_id: string;
  added_by: string;
  kit_id: string;
  quantity: number;
  servings: number;
  spice_level?: string;
  unit_price: number;
  status: ItemStatus;
  approved_by?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyCheckoutHold {
  family_id: string;
  held_by: string;
  expires_at: string;
  idempotency_key?: string;
  created_at: string;
}

export interface FamilyAuditLogEntry {
  id: string;
  family_id: string;
  actor_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export interface FamilyMembershipHistoryEntry {
  id: string;
  user_id: string;
  family_id: string;
  role: FamilyRole;
  joined_at: string;
  left_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_FAMILY_MEMBERS = 6;
export const MAX_CO_OWNERS = 2;
export const MAX_PHONE_INVITES_PER_DAY = 10;
export const MAX_JOIN_LINKS_PER_DAY = 5;
export const CHECKOUT_HOLD_DURATION_MINUTES = 10;

// ─── Validation & Formatting Utilities ───────────────────────────────────────

const phoneSchema = z.string().refine(
  (val) => {
    try {
      return isValidPhoneNumber(val, 'IN') || isValidPhoneNumber(val);
    } catch {
      return false;
    }
  },
  { message: 'Invalid phone number format' },
);

/**
 * Normalizes phone number to strict E.164 standard using libphonenumber-js.
 * Defaults country to 'IN' (+91) if not explicitly prefixed.
 */
export function normalizePhoneNumber(rawPhone: string): {
  valid: boolean;
  e164?: string;
  error?: string;
} {
  try {
    const trimmed = rawPhone.trim();
    if (!trimmed) {
      return { valid: false, error: 'Phone number cannot be empty' };
    }

    const validation = phoneSchema.safeParse(trimmed);
    if (!validation.success) {
      return { valid: false, error: 'Invalid phone number format' };
    }

    const parsed = parsePhoneNumber(trimmed, 'IN');
    if (!parsed || !parsed.isValid()) {
      return { valid: false, error: 'Invalid phone number' };
    }

    return { valid: true, e164: parsed.format('E.164') };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Invalid phone number' };
  }
}

/**
 * Masks a phone number so only country code and trailing digits are visible.
 * Example: +91 98765 43210 -> +91 98••• ••210
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const clean = phone.trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length <= 4) return clean;

  const last3 = digits.slice(-3);
  const first2 = digits.length >= 12 ? digits.slice(2, 4) : digits.slice(0, 2);
  return `+91 ${first2}••• ••${last3}`;
}

/**
 * Validates whether a given string is a valid UUID (required by PostgreSQL/Supabase UUID columns).
 */
export function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

/**
 * Extracts and capitalizes the first name only.
 */
export function extractFirstName(fullName: string): string {
  if (!fullName) return 'Member';
  const first = fullName.trim().split(' ')[0] || 'Member';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * Normalizes family name so names like "sharma" become "Sharma Family".
 * Avoids duplicating if "Family" is already entered.
 */
export function formatFamilyName(raw: string): string {
  const trimmed = raw ? raw.trim() : '';
  if (!trimmed) return 'Family';
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (/\s*household$/i.test(capitalized)) {
    return capitalized;
  }
  if (/\s*family$/i.test(capitalized)) {
    return capitalized.replace(/\s*family$/i, ' Family');
  }
  return `${capitalized} Family`;
}

// ─── Mathematical Utility: Largest Remainder Allocation ─────────────────────

/**
 * Allocates a shared financial amount (in integer paise) among members
 * proportional to their given weights using the Largest Remainder Method (Hare-Niemeyer).
 * Guarantees that the sum of allocated amounts equals totalPaise exactly.
 */
export function allocateSharedAmountLargestRemainder(
  totalPaise: number,
  weights: number[],
): number[] {
  if (weights.length === 0) return [];
  const totalWeight = weights.reduce((sum, w) => sum + Math.max(0, w), 0);

  if (totalWeight === 0 || totalPaise === 0) {
    return new Array(weights.length).fill(0);
  }

  // Step 1: Compute quotas and integer floors
  const quotas = weights.map((w) => (Math.max(0, w) / totalWeight) * totalPaise);
  const floors = quotas.map((q) => Math.floor(q));
  const remainders = quotas.map((q, idx) => ({ remainder: q - (floors[idx] ?? 0), idx }));

  let distributed = floors.reduce((sum, val) => sum + val, 0);
  let leftover = Math.round(totalPaise - distributed);

  // Step 2: Sort descending by remainder
  remainders.sort((a, b) => b.remainder - a.remainder);

  // Step 3: Distribute leftover paise to largest remainders
  const result = [...floors];
  for (let i = 0; i < leftover && i < remainders.length; i++) {
    const rem = remainders[i];
    if (rem && result[rem.idx] !== undefined) {
      result[rem.idx]! += 1;
    }
  }

  return result;
}

// ─── Local State Fallback Store (Sandbox / Offline Resilience) ───────────────

interface LocalFamilyStore {
  families: Map<string, Family>;
  members: Map<string, FamilyMember[]>; // family_id -> members
  invites: Map<string, FamilyInvite[]>;
  links: Map<string, FamilyJoinLink[]>;
  cartItems: Map<string, FamilyCartItem[]>;
  holds: Map<string, FamilyCheckoutHold>;
  auditLog: Map<string, FamilyAuditLogEntry[]>;
  history: Map<string, FamilyMembershipHistoryEntry[]>;
}

const localStore: LocalFamilyStore = {
  families: new Map(),
  members: new Map(),
  invites: new Map(),
  links: new Map(),
  cartItems: new Map(),
  holds: new Map(),
  auditLog: new Map(),
  history: new Map(),
};

const LOCAL_STORE_KEY = '@rasoi_family_store_v1';
let localStoreLoaded = false;

export async function ensureLocalFamilyStore(): Promise<void> {
  if (localStoreLoaded) return;
  try {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      raw = window.localStorage.getItem(LOCAL_STORE_KEY);
    }
    if (!raw) {
      raw = await AsyncStorage.getItem(LOCAL_STORE_KEY);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.families) {
        Object.entries(parsed.families).forEach(([k, v]: any) => localStore.families.set(k, v));
      }
      if (parsed.members) {
        Object.entries(parsed.members).forEach(([k, v]: any) => localStore.members.set(k, v));
      }
      if (parsed.invites) {
        Object.entries(parsed.invites).forEach(([k, v]: any) => localStore.invites.set(k, v));
      }
      if (parsed.links) {
        Object.entries(parsed.links).forEach(([k, v]: any) => localStore.links.set(k, v));
      }
      if (parsed.cartItems) {
        Object.entries(parsed.cartItems).forEach(([k, v]: any) => localStore.cartItems.set(k, v));
      }
      if (parsed.holds) {
        Object.entries(parsed.holds).forEach(([k, v]: any) => localStore.holds.set(k, v));
      }
    }
    localStoreLoaded = true;
  } catch (err) {
    console.warn('[FamilyService] Error loading local family store:', err);
  }
}

async function persistLocalStore(): Promise<void> {
  try {
    const serialized = JSON.stringify({
      families: Object.fromEntries(localStore.families),
      members: Object.fromEntries(localStore.members),
      invites: Object.fromEntries(localStore.invites),
      links: Object.fromEntries(localStore.links),
      cartItems: Object.fromEntries(localStore.cartItems),
      holds: Object.fromEntries(localStore.holds),
    });
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORE_KEY, serialized);
    }
    await AsyncStorage.setItem(LOCAL_STORE_KEY, serialized);
  } catch {}
}

export function resetLocalFamilyStoreForTesting(): void {
  localStore.families.clear();
  localStore.members.clear();
  localStore.invites.clear();
  localStore.links.clear();
  localStore.cartItems.clear();
  localStore.holds.clear();
  localStore.auditLog.clear();
  localStore.history.clear();
  localStoreLoaded = true;
}

export function isMockEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  if (process.env.EXPO_PUBLIC_ENABLE_MOCK_API === 'true') return true;
  if (process.env.EXPO_PUBLIC_ENABLE_MOCK_API === 'false') return false;
  return CONFIG.enableMockApi === true;
}

export function encodePayloadToToken(payload: {
  fid: string;
  fn: string;
  dt: DependentType;
  dn: string;
  exp: number;
  nonce?: string;
  raw?: string;
}): string {
  const json = JSON.stringify(payload);
  let hex = '';
  for (let i = 0; i < json.length; i++) {
    hex += json.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return `rjl_${hex}`;
}

export function decodeTokenPayload(token: string): {
  fid: string;
  fn: string;
  dt: DependentType;
  dn: string;
  exp: number;
  raw?: string;
} | null {
  try {
    const clean = token.trim();
    if (!clean.startsWith('rjl_')) return null;
    const hex = clean.slice(4);
    let json = '';
    for (let i = 0; i < hex.length; i += 2) {
      json += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    const parsed = JSON.parse(json);
    if (parsed && parsed.fid && parsed.dt && parsed.exp) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function inspectJoinLink(token: string): {
  valid: boolean;
  familyId?: string;
  familyName?: string;
  dependentType?: DependentType;
  displayName?: string;
  expiresAt?: string;
  expired?: boolean;
} | null {
  const clean = (token || '').trim();
  if (!clean || clean.length < 8) return null;

  const decoded = decodeTokenPayload(clean);
  if (decoded) {
    return {
      valid: true,
      familyId: decoded.fid,
      familyName: decoded.fn,
      dependentType: decoded.dt,
      displayName: decoded.dn,
      expiresAt: new Date(decoded.exp).toISOString(),
      expired: Date.now() > decoded.exp,
    };
  }

  // Fallback for raw Supabase tokens (64-char hex)
  return {
    valid: true,
    familyId: undefined,
    familyName: undefined,
    dependentType: undefined,
    displayName: undefined,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    expired: false,
  };
}

// ─── RPC Client Implementations ──────────────────────────────────────────────

/**
 * Creates a new family. Owner must not belong to another family.
 */
export async function createFamily(
  name: string,
  ownerDisplayName?: string,
  callerId?: string,
): Promise<{ success: boolean; family?: Family; error?: string }> {
  const formattedName = formatFamilyName(name);

  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('create_family', {
        p_name: formattedName,
        p_owner_display_name: ownerDisplayName || null,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) {
          return {
            success: true,
            family: {
              id: data.family_id,
              name: data.name,
              owner_id: data.owner_id,
              is_locked: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };
        }
        return { success: false, error: data.error };
      }
    } catch (rpcErr: any) {
      return { success: false, error: rpcErr?.message || 'Failed to create family' };
    }
    return { success: false, error: 'Could not create family on server' };
  }

  // Local fallback simulation
  await ensureLocalFamilyStore();
  const cid = callerId || 'owner_user_local';

  // Check if caller already in family
  for (const members of localStore.members.values()) {
    if (members.some((m) => m.user_id === cid)) {
      return {
        success: false,
        error: 'User is already a member of a family. Leave current family first.',
      };
    }
  }

  const familyId = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const first = extractFirstName(ownerDisplayName || 'Owner');

  const newFamily: Family = {
    id: familyId,
    name: formattedName,
    owner_id: cid,
    is_locked: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const ownerMember: FamilyMember = {
    family_id: familyId,
    user_id: cid,
    role: 'owner',
    dependent_type: null,
    display_name: first,
    joined_at: new Date().toISOString(),
  };

  localStore.families.set(familyId, newFamily);
  localStore.members.set(familyId, [ownerMember]);
  localStore.cartItems.set(familyId, []);
  localStore.invites.set(familyId, []);
  localStore.links.set(familyId, []);
  await persistLocalStore();

  return { success: true, family: newFamily };
}

/**
 * Invites an adult member by phone number (Owner only).
 * Phone number must belong to an existing registered user.
 */
export async function inviteMemberByPhone(
  familyId: string,
  phone: string,
  callerId?: string,
): Promise<{ success: boolean; inviteId?: string; error?: string }> {
  const norm = normalizePhoneNumber(phone);
  if (!norm.valid || !norm.e164) {
    return { success: false, error: norm.error || 'Invalid phone number' };
  }

  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('invite_member_by_phone', {
        p_family_id: familyId,
        p_phone: norm.e164,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) {
          return { success: true, inviteId: data.invite_id };
        }
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Local fallback
  await ensureLocalFamilyStore();
  const family = localStore.families.get(familyId);
  if (!family) return { success: false, error: 'Family not found' };
  if (callerId && family.owner_id !== callerId) {
    return { success: false, error: 'Only the family owner can invite members' };
  }

  const currentMembers = localStore.members.get(familyId) || [];
  const currentInvites = (localStore.invites.get(familyId) || []).filter(
    (i) => i.status === 'pending',
  );
  const currentLinks = (localStore.links.get(familyId) || []).filter((l) => l.status === 'pending');

  if (currentMembers.length + currentInvites.length + currentLinks.length >= MAX_FAMILY_MEMBERS) {
    return { success: false, error: 'Family capacity reached (max 6 members)' };
  }

  const inviteId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const invite: FamilyInvite = {
    id: inviteId,
    family_id: familyId,
    invited_by: callerId || family.owner_id,
    invited_phone: norm.e164,
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const list = localStore.invites.get(familyId) || [];
  list.push(invite);
  localStore.invites.set(familyId, list);
  await persistLocalStore();

  return { success: true, inviteId };
}

/**
 * Invitee responds to an adult phone invite in-app (accept or decline).
 */
export async function respondToInvite(
  inviteId: string,
  accept: boolean,
  callerId?: string,
): Promise<{ success: boolean; familyId?: string; status?: InviteStatus; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('respond_to_invite', {
        p_invite_id: inviteId,
        p_accept: accept,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) {
          return { success: true, familyId: data.family_id, status: data.status };
        }
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  let foundInvite: FamilyInvite | null = null;
  let targetFamilyId = '';

  for (const [famId, invites] of localStore.invites.entries()) {
    const inv = invites.find((i) => i.id === inviteId);
    if (inv) {
      foundInvite = inv;
      targetFamilyId = famId;
      break;
    }
  }

  if (!foundInvite || foundInvite.status !== 'pending') {
    return { success: false, error: 'Invite not found or expired' };
  }

  foundInvite.status = accept ? 'accepted' : 'declined';
  foundInvite.updated_at = new Date().toISOString();

  if (accept) {
    const cid = callerId || `user_${Date.now()}`;
    const members = localStore.members.get(targetFamilyId) || [];
    members.push({
      family_id: targetFamilyId,
      user_id: cid,
      role: 'member',
      dependent_type: null,
      display_name: 'Member',
      joined_at: new Date().toISOString(),
    });
    localStore.members.set(targetFamilyId, members);
  }

  await persistLocalStore();
  return { success: true, familyId: targetFamilyId, status: foundInvite.status };
}

/**
 * Generates a dependent join link (Child or Senior, Owner only).
 * Returns the raw token once.
 */
export async function createJoinLink(
  familyId: string,
  dependentType: DependentType,
  displayName: string,
  guardianConfirmed: boolean,
  consentVersion = 'v1.0',
  callerId?: string,
): Promise<{
  success: boolean;
  rawToken?: string;
  linkId?: string;
  expiresAt?: string;
  error?: string;
}> {
  const firstName = extractFirstName(displayName);
  if (!firstName) {
    return { success: false, error: 'Display name is required' };
  }

  if (dependentType === 'child' && !guardianConfirmed) {
    return { success: false, error: 'Guardian consent confirmation is required for a child' };
  }

  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('create_join_link', {
        p_family_id: familyId,
        p_dependent_type: dependentType,
        p_display_name: firstName,
        p_guardian_confirmed: guardianConfirmed,
        p_consent_version: consentVersion,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) {
          let famName = 'Family';
          try {
            const { data: famData } = await supabase
              .from('families')
              .select('name')
              .eq('id', familyId)
              .single();
            if (famData?.name) famName = famData.name;
          } catch {}

          const expiresMs = data.expires_at
            ? new Date(data.expires_at).getTime()
            : Date.now() + 24 * 60 * 60 * 1000;

          const richToken = encodePayloadToToken({
            fid: familyId,
            fn: famName,
            dt: dependentType,
            dn: firstName,
            exp: expiresMs,
            raw: data.raw_token,
          });

          return {
            success: true,
            rawToken: richToken,
            linkId: data.link_id,
            expiresAt: data.expires_at,
          };
        }
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback / Mock
  await ensureLocalFamilyStore();

  // Auto-revoke any previous unredeemed pending link for the same dependent name so regenerating frees seats
  const allLinks = localStore.links.get(familyId) || [];
  for (const l of allLinks) {
    if (l.display_name.toLowerCase() === firstName.toLowerCase() && l.status === 'pending') {
      l.status = 'revoked';
    }
  }

  const currentMembers = localStore.members.get(familyId) || [];
  const currentInvites = (localStore.invites.get(familyId) || []).filter(
    (i) => i.status === 'pending',
  );
  const currentLinks = (localStore.links.get(familyId) || []).filter((l) => l.status === 'pending');

  if (currentMembers.length + currentInvites.length + currentLinks.length >= MAX_FAMILY_MEMBERS) {
    return { success: false, error: 'Family capacity reached (max 6 members)' };
  }

  const famName = localStore.families.get(familyId)?.name || 'Family';
  const expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const rawToken = encodePayloadToToken({
    fid: familyId,
    fn: famName,
    dt: dependentType,
    dn: firstName,
    exp: expiresAtMs,
    nonce: Math.random().toString(36).substring(2, 8),
  });
  const linkId = `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const link: FamilyJoinLink = {
    id: linkId,
    family_id: familyId,
    created_by: callerId || 'owner',
    token_hash: `hash_${rawToken.slice(0, 16)}`,
    dependent_type: dependentType,
    display_name: firstName,
    status: 'pending',
    expires_at: expiresAt,
    guardian_confirmed: guardianConfirmed,
    consent_version: consentVersion,
    created_at: new Date().toISOString(),
  };

  const list = localStore.links.get(familyId) || [];
  list.push(link);
  localStore.links.set(familyId, list);
  await persistLocalStore();

  return { success: true, rawToken, linkId, expiresAt };
}

/**
 * Revokes a pending dependent join link.
 */
export async function revokeJoinLink(
  linkId: string,
  callerId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('revoke_join_link', {
        p_link_id: linkId,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  for (const links of localStore.links.values()) {
    const l = links.find((item) => item.id === linkId);
    if (l) {
      l.status = 'revoked';
      await persistLocalStore();
      return { success: true };
    }
  }
  return { success: true };
}

/**
 * Redeems a dependent join link using raw token.
 * Concurrency safe; exactly one redemption succeeds.
 */
export async function redeemJoinLink(
  rawToken: string,
  userId?: string,
  callerId?: string,
): Promise<{
  success: boolean;
  familyId?: string;
  familyName?: string;
  role?: FamilyRole;
  dependentType?: DependentType;
  displayName?: string;
  userId?: string;
  error?: string;
}> {
  const cleanToken = rawToken.trim();
  const decoded = decodeTokenPayload(cleanToken);
  const tokenToRedeem = decoded?.raw || cleanToken;

  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('redeem_join_link', {
        p_raw_token: tokenToRedeem,
        p_user_id: userId || null,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) {
          return {
            success: true,
            familyId: data.family_id,
            familyName: data.family_name,
            role: data.role,
            dependentType: data.dependent_type,
            displayName: data.display_name,
            userId: data.user_id,
          };
        }
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback / Cross-Device Mock Redemption
  await ensureLocalFamilyStore();

  // 1. Check local link store first (handles same-device redemption, revocation, expiration, and test harness)
  let foundLink: FamilyJoinLink | null = null;
  const tokenPrefix = cleanToken.slice(0, 20);
  for (const links of localStore.links.values()) {
    const l = links.find(
      (item) =>
        item.token_hash === `hash_${cleanToken.slice(0, 16)}` ||
        item.token_hash === cleanToken ||
        (tokenPrefix.length > 5 && item.token_hash.includes(tokenPrefix)),
    );
    if (l) {
      foundLink = l;
      break;
    }
  }

  if (foundLink) {
    if (foundLink.status !== 'pending') {
      return {
        success: false,
        error: 'This join link has already been used or revoked. Ask the owner for a new link.',
      };
    }

    if (new Date(foundLink.expires_at).getTime() <= Date.now()) {
      foundLink.status = 'expired';
      await persistLocalStore();
      return { success: false, error: 'This join link has expired. Ask the owner for a new link.' };
    }

    const fid = foundLink.family_id;
    const fam = localStore.families.get(fid);
    const members = localStore.members.get(fid) || [];
    if (members.length >= MAX_FAMILY_MEMBERS) {
      return { success: false, error: 'Family capacity reached (max 6 members)' };
    }

    const targetUid = userId || callerId || `anon_user_${Date.now()}`;
    foundLink.status = 'redeemed';
    foundLink.redeemed_by = targetUid;
    foundLink.redeemed_at = new Date().toISOString();

    // Reconcile any existing links in this family for this dependent so none remain revoked or pending
    const famLinks = localStore.links.get(fid) || [];
    for (const l of famLinks) {
      if (
        l.display_name.toLowerCase() === foundLink.display_name.toLowerCase() ||
        l.id === foundLink.id
      ) {
        l.status = 'redeemed';
        l.redeemed_by = targetUid;
        l.redeemed_at = foundLink.redeemed_at;
      }
    }

    const existing = members.find((m) => m.user_id === targetUid);
    if (!existing) {
      members.push({
        family_id: fid,
        user_id: targetUid,
        role: 'dependent',
        dependent_type: foundLink.dependent_type,
        display_name: foundLink.display_name,
        joined_at: new Date().toISOString(),
      });
      localStore.members.set(fid, members);
    }
    await persistLocalStore();

    return {
      success: true,
      familyId: fid,
      familyName: fam?.name || 'Family',
      role: 'dependent',
      dependentType: foundLink.dependent_type,
      displayName: foundLink.display_name,
      userId: targetUid,
    };
  }

  // 2. Cross-device encoded token decoding (when link was generated on another device)
  if (decoded) {
    if (Date.now() > decoded.exp) {
      return { success: false, error: 'This join link has expired. Ask the owner for a new link.' };
    }

    const fid = decoded.fid;
    const fn = decoded.fn || 'Family';
    const targetUid = userId || callerId || `anon_user_${Date.now()}`;

    // Provision family in local store on this device
    let fam = localStore.families.get(fid);
    if (!fam) {
      fam = {
        id: fid,
        name: fn,
        owner_id: 'owner',
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStore.families.set(fid, fam);
    }

    const members = localStore.members.get(fid) || [];
    const existing = members.find((m) => m.user_id === targetUid);
    if (!existing) {
      if (members.length >= MAX_FAMILY_MEMBERS) {
        return { success: false, error: 'Family capacity reached (max 6 members)' };
      }
      members.push({
        family_id: fid,
        user_id: targetUid,
        role: 'dependent',
        dependent_type: decoded.dt,
        display_name: decoded.dn,
        joined_at: new Date().toISOString(),
      });
      localStore.members.set(fid, members);
    }

    // Save redeemed link record locally so this link cannot be redeemed repeatedly on this device
    const linkRecord: FamilyJoinLink = {
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      family_id: fid,
      created_by: 'owner',
      token_hash: `hash_${cleanToken.slice(0, 16)}`,
      dependent_type: decoded.dt,
      display_name: decoded.dn,
      status: 'redeemed',
      expires_at: new Date(decoded.exp).toISOString(),
      redeemed_by: targetUid,
      redeemed_at: new Date().toISOString(),
      guardian_confirmed: true,
      consent_version: 'v1.0',
      created_at: new Date().toISOString(),
    };
    const list = localStore.links.get(fid) || [];
    for (const l of list) {
      if (l.display_name.toLowerCase() === decoded.dn.toLowerCase()) {
        l.status = 'redeemed';
        l.redeemed_by = targetUid;
        l.redeemed_at = new Date().toISOString();
      }
    }
    list.push(linkRecord);
    localStore.links.set(fid, list);

    await persistLocalStore();

    return {
      success: true,
      familyId: fid,
      familyName: fn,
      role: 'dependent',
      dependentType: decoded.dt,
      displayName: decoded.dn,
      userId: targetUid,
    };
  }

  return { success: false, error: 'Invalid join link. Ask the family owner for a new link.' };
}

/**
 * Owner re-issues join link for an existing dependent (e.g. lost phone/data).
 */
export async function reissueJoinLink(
  memberUserId: string,
  callerId?: string,
): Promise<{ success: boolean; rawToken?: string; linkId?: string; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('reissue_join_link', {
        p_member_user_id: memberUserId,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) {
          return { success: true, rawToken: data.raw_token, linkId: data.link_id };
        }
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  let foundMember: FamilyMember | null = null;
  let targetFamilyId = '';
  for (const [fid, members] of localStore.members.entries()) {
    const m = members.find((item) => item.user_id === memberUserId);
    if (m) {
      foundMember = m;
      targetFamilyId = fid;
      break;
    }
  }

  const famName = targetFamilyId
    ? localStore.families.get(targetFamilyId)?.name || 'Family'
    : 'Family';
  const expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;
  const rawToken = encodePayloadToToken({
    fid: targetFamilyId || 'family',
    fn: famName,
    dt: foundMember?.dependent_type || 'child',
    dn: foundMember?.display_name || 'Family Member',
    exp: expiresAtMs,
    nonce: Math.random().toString(36).substring(2, 8),
  });

  return { success: true, rawToken, linkId: `reissue_${Date.now()}` };
}

/**
 * Changes role of an adult member (promote to co-owner, or demote to member).
 */
export async function setMemberRole(
  familyId: string,
  targetUserId: string,
  newRole: 'co_owner' | 'member',
  callerId?: string,
): Promise<{ success: boolean; newRole?: FamilyRole; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('set_member_role', {
        p_family_id: familyId,
        p_target_user_id: targetUserId,
        p_new_role: newRole,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true, newRole: data.new_role };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const members = localStore.members.get(familyId) || [];
  const target = members.find((m) => m.user_id === targetUserId);
  if (!target) return { success: false, error: 'Member not found' };

  if (newRole === 'co_owner') {
    const coOwners = members.filter((m) => m.role === 'co_owner');
    if (coOwners.length >= MAX_CO_OWNERS) {
      return { success: false, error: `Maximum ${MAX_CO_OWNERS} co-owners allowed` };
    }
  }

  target.role = newRole;
  await persistLocalStore();
  return { success: true, newRole };
}

/**
 * Removes a member or dependent from the family (Owner only).
 */
export async function removeMember(
  familyId: string,
  targetUserId: string,
  callerId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('remove_member', {
        p_family_id: familyId,
        p_target_user_id: targetUserId,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const members = localStore.members.get(familyId) || [];
  const updated = members.filter((m) => m.user_id !== targetUserId);
  localStore.members.set(familyId, updated);

  // Remove their cart items
  const items = localStore.cartItems.get(familyId) || [];
  localStore.cartItems.set(
    familyId,
    items.filter((i) => i.added_by !== targetUserId),
  );
  await persistLocalStore();

  return { success: true };
}

/**
 * Member leaves the family. If owner leaves, ownership is transferred.
 */
export async function leaveFamily(
  familyId: string,
  callerId?: string,
): Promise<{ success: boolean; familyDeleted?: boolean; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('leave_family', {
        p_family_id: familyId,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true, familyDeleted: data.family_deleted };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const cid = callerId || 'current_user';
  const members = localStore.members.get(familyId) || [];
  const family = localStore.families.get(familyId);

  if (family && family.owner_id === cid) {
    const nextAdult = members.find(
      (m) => m.user_id !== cid && (m.role === 'co_owner' || m.role === 'member'),
    );
    if (nextAdult) {
      family.owner_id = nextAdult.user_id;
      nextAdult.role = 'owner';
    } else {
      localStore.families.delete(familyId);
      localStore.members.delete(familyId);
      localStore.cartItems.delete(familyId);
      await persistLocalStore();
      return { success: true, familyDeleted: true };
    }
  }

  localStore.members.set(
    familyId,
    members.filter((m) => m.user_id !== cid),
  );
  await persistLocalStore();
  return { success: true };
}

/**
 * Transfers ownership to another adult member.
 */
export async function transferOwnership(
  familyId: string,
  newOwnerUserId: string,
  callerId?: string,
): Promise<{ success: boolean; newOwner?: string; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('transfer_ownership', {
        p_family_id: familyId,
        p_new_owner_user_id: newOwnerUserId,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true, newOwner: data.new_owner };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const fam = localStore.families.get(familyId);
  if (!fam) return { success: false, error: 'Family not found' };

  const members = localStore.members.get(familyId) || [];
  const target = members.find((m) => m.user_id === newOwnerUserId);
  if (!target || target.role === 'dependent') {
    return { success: false, error: 'Cannot transfer ownership to dependent' };
  }

  const oldOwner = members.find((m) => m.user_id === fam.owner_id);
  if (oldOwner) oldOwner.role = 'member';
  target.role = 'owner';
  fam.owner_id = newOwnerUserId;
  await persistLocalStore();

  return { success: true, newOwner: newOwnerUserId };
}

/**
 * Permanently deletes the family and all associated members and items (Owner only).
 */
export async function deleteFamily(
  familyId: string,
  callerId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('delete_family', {
        p_family_id: familyId,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback / Mock
  await ensureLocalFamilyStore();
  localStore.families.delete(familyId);
  localStore.members.delete(familyId);
  localStore.cartItems.delete(familyId);
  localStore.invites.delete(familyId);
  localStore.links.delete(familyId);
  localStore.holds.delete(familyId);
  await persistLocalStore();

  return { success: true };
}

/**
 * Revokes all pending unredeemed links for a family (Owner only).
 */
export async function revokeAllPendingLinks(
  familyId: string,
  callerId?: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
  let count = 0;
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data: linkList } = await supabase
        .from('family_join_links')
        .select('id')
        .eq('family_id', familyId)
        .eq('status', 'pending');

      if (linkList && linkList.length > 0) {
        for (const l of linkList) {
          await revokeJoinLink(l.id, callerId);
          count++;
        }
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const links = localStore.links.get(familyId) || [];
  for (const l of links) {
    if (l.status === 'pending') {
      l.status = 'revoked';
      count++;
    }
  }
  await persistLocalStore();

  return { success: true, count };
}

/**
 * Adds an item on caller's behalf.
 * Adults -> approved immediately. Dependents -> pending_approval.
 */
export async function addOwnItem(
  familyId: string,
  kitId: string,
  quantity = 1,
  servings = 2,
  spiceLevel = 'Medium',
  unitPrice = 0,
  callerId?: string,
): Promise<{ success: boolean; itemId?: string; status?: ItemStatus; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('add_own_item', {
        p_family_id: familyId,
        p_kit_id: kitId,
        p_quantity: quantity,
        p_servings: servings,
        p_spice_level: spiceLevel,
        p_unit_price: unitPrice,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true, itemId: data.item_id, status: data.status };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const fam = localStore.families.get(familyId);
  const effectiveCaller = callerId || 'user';
  if (fam && fam.is_locked && fam.owner_id !== effectiveCaller) {
    return { success: false, error: 'Family cart is currently locked by the owner' };
  }

  const members = localStore.members.get(familyId) || [];
  const caller = members.find((m) => m.user_id === effectiveCaller);
  const isDep = caller?.role === 'dependent';
  const itemStatus: ItemStatus = isDep ? 'pending_approval' : 'approved';

  const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newItem: FamilyCartItem = {
    id: itemId,
    family_id: familyId,
    added_by: callerId || 'user',
    kit_id: kitId,
    quantity,
    servings,
    spice_level: spiceLevel,
    unit_price: unitPrice,
    status: itemStatus,
    approved_by: isDep ? null : callerId || 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const list = localStore.cartItems.get(familyId) || [];
  list.push(newItem);
  localStore.cartItems.set(familyId, list);
  await persistLocalStore();

  return { success: true, itemId, status: itemStatus };
}

/**
 * Owner upserts any item in the family cart.
 */
export async function ownerUpsertItem(
  familyId: string,
  itemId: string | null,
  kitId: string,
  quantity = 1,
  servings = 2,
  spiceLevel = 'Medium',
  unitPrice = 0,
  callerId?: string,
): Promise<{ success: boolean; itemId?: string; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('owner_upsert_item', {
        p_family_id: familyId,
        p_item_id: itemId || null,
        p_kit_id: kitId,
        p_quantity: quantity,
        p_servings: servings,
        p_spice_level: spiceLevel,
        p_unit_price: unitPrice,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true, itemId: data.item_id };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const list = localStore.cartItems.get(familyId) || [];
  if (itemId) {
    const ex = list.find((i) => i.id === itemId);
    if (ex) {
      ex.quantity = quantity;
      ex.servings = servings;
      ex.spice_level = spiceLevel;
      ex.unit_price = unitPrice;
      ex.status = 'approved';
      ex.updated_at = new Date().toISOString();
    }
  } else {
    const newId = `item_owner_${Date.now()}`;
    list.push({
      id: newId,
      family_id: familyId,
      added_by: callerId || 'owner',
      kit_id: kitId,
      quantity,
      servings,
      spice_level: spiceLevel,
      unit_price: unitPrice,
      status: 'approved',
      approved_by: callerId || 'owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  localStore.cartItems.set(familyId, list);
  await persistLocalStore();
  return { success: true, itemId: itemId || 'new_item' };
}

/**
 * Owner removes any item from the family cart.
 */
export async function ownerRemoveItem(
  familyId: string,
  itemId: string,
  callerId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('owner_remove_item', {
        p_family_id: familyId,
        p_item_id: itemId,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const list = localStore.cartItems.get(familyId) || [];
  localStore.cartItems.set(
    familyId,
    list.filter((i) => i.id !== itemId),
  );
  await persistLocalStore();
  return { success: true };
}

/**
 * Owner approves a dependent's pending item.
 */
export async function approveItem(
  familyId: string,
  itemId: string,
  callerId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('approve_item', {
        p_family_id: familyId,
        p_item_id: itemId,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const list = localStore.cartItems.get(familyId) || [];
  const it = list.find((i) => i.id === itemId);
  if (it) {
    it.status = 'approved';
    it.approved_by = callerId || 'owner';
    it.rejection_reason = null;
    it.updated_at = new Date().toISOString();
    await persistLocalStore();
  }
  return { success: true };
}

/**
 * Owner rejects a dependent's pending item with reason.
 */
export async function rejectItem(
  familyId: string,
  itemId: string,
  reason = 'Not added',
  callerId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('reject_item', {
        p_family_id: familyId,
        p_item_id: itemId,
        p_reason: reason,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const list = localStore.cartItems.get(familyId) || [];
  const it = list.find((i) => i.id === itemId);
  if (it) {
    it.status = 'rejected';
    it.rejection_reason = reason;
    it.updated_at = new Date().toISOString();
    await persistLocalStore();
  }
  return { success: true };
}

/**
 * Owner locks or unlocks the family cart.
 */
export async function setCartLock(
  familyId: string,
  locked: boolean,
  callerId?: string,
): Promise<{ success: boolean; isLocked?: boolean; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('set_cart_lock', {
        p_family_id: familyId,
        p_locked: locked,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) {
          notifyFamilyLockListeners(familyId, data.is_locked);
          return { success: true, isLocked: data.is_locked };
        }
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const fam = localStore.families.get(familyId);
  if (fam) {
    fam.is_locked = locked;
    await persistLocalStore();
    notifyFamilyLockListeners(familyId, locked);
    return { success: true, isLocked: locked };
  }
  notifyFamilyLockListeners(familyId, locked);
  return { success: true, isLocked: locked };
}

/**
 * Begins exclusive 10-minute checkout hold (Owner or Co-owner).
 */
export async function beginCheckoutHold(
  familyId: string,
  idempotencyKey?: string,
  callerId?: string,
): Promise<{
  success: boolean;
  heldByOther?: boolean;
  holderName?: string;
  expiresAt?: string;
  error?: string;
}> {
  const key = idempotencyKey || `hold_${Date.now()}`;

  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('begin_checkout_hold', {
        p_family_id: familyId,
        p_idempotency_key: key,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) {
          return { success: true, expiresAt: data.expires_at };
        }
        return {
          success: false,
          heldByOther: data.held_by_other,
          holderName: data.holder_name,
          error: data.error,
        };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const currentHold = localStore.holds.get(familyId);
  const now = Date.now();
  const cid = callerId || 'payer';

  if (currentHold && new Date(currentHold.expires_at).getTime() > now) {
    if (currentHold.held_by !== cid) {
      const members = localStore.members.get(familyId) || [];
      const holder = members.find((m) => m.user_id === currentHold.held_by);
      const name = holder?.display_name || 'Another payer';
      return {
        success: false,
        heldByOther: true,
        holderName: name,
        error: `${name} is currently checking out`,
      };
    }
  }

  const exp = new Date(now + CHECKOUT_HOLD_DURATION_MINUTES * 60 * 1000).toISOString();
  localStore.holds.set(familyId, {
    family_id: familyId,
    held_by: cid,
    expires_at: exp,
    idempotency_key: key,
    created_at: new Date().toISOString(),
  });
  await persistLocalStore();

  return { success: true, expiresAt: exp };
}

/**
 * Releases checkout hold.
 */
export async function releaseCheckoutHold(
  familyId: string,
  callerId?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('release_checkout_hold', {
        p_family_id: familyId,
        p_caller_id: callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) return { success: true };
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  localStore.holds.delete(familyId);
  await persistLocalStore();
  return { success: true };
}

/**
 * Places family order for all approved items using payer's personal wallet.
 */
export async function placeFamilyOrder(params: {
  familyId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  deliveryAddressSnapshot?: Record<string, any>;
  deliverySlot: string;
  couponCode?: string;
  deliveryFee?: number;
  walletCreditsToApply?: number;
  paymentMethod?: string;
  region?: string;
  idempotencyKey?: string;
  callerId?: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  subtotal?: number;
  discount?: number;
  totalAmount?: number;
  pendingItemsExcluded?: number;
  error?: string;
}> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('place_family_order', {
        p_family_id: params.familyId,
        p_order_id: params.orderId,
        p_customer_name: params.customerName,
        p_customer_phone: params.customerPhone,
        p_customer_email: params.customerEmail || null,
        p_delivery_address: params.deliveryAddress,
        p_delivery_address_snapshot: params.deliveryAddressSnapshot || {},
        p_delivery_slot: params.deliverySlot,
        p_coupon_code: params.couponCode || null,
        p_delivery_fee: params.deliveryFee || 0,
        p_wallet_credits_to_apply: params.walletCreditsToApply || 0,
        p_payment_method: params.paymentMethod || 'UPI',
        p_region: params.region || 'West',
        p_idempotency_key: params.idempotencyKey || null,
        p_caller_id: params.callerId || null,
      });

      if (error) {
        if (!isMissingSchemaError(error)) {
          return { success: false, error: error.message };
        }
      } else if (data) {
        if (data.success) {
          return {
            success: true,
            orderId: data.order_id,
            subtotal: data.subtotal,
            discount: data.discount,
            totalAmount: data.total_amount,
            pendingItemsExcluded: data.pending_items_excluded,
          };
        }
        return { success: false, error: data.error };
      }
    } catch {}
  }

  // Fallback
  await ensureLocalFamilyStore();
  const list = localStore.cartItems.get(params.familyId) || [];
  const approved = list.filter((i) => i.status === 'approved');
  const pending = list.filter((i) => i.status === 'pending_approval');

  if (approved.length === 0) {
    return { success: false, error: 'No approved items in the family cart' };
  }

  const subtotal = approved.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const total = Math.max(
    0,
    subtotal + (params.deliveryFee || 0) - (params.walletCreditsToApply || 0),
  );

  // Clear approved items and release hold
  localStore.cartItems.set(params.familyId, pending);
  localStore.holds.delete(params.familyId);
  await persistLocalStore();

  return {
    success: true,
    orderId: params.orderId,
    subtotal,
    discount: 0,
    totalAmount: total,
    pendingItemsExcluded: pending.length,
  };
}

// ─── Query Helpers ───────────────────────────────────────────────────────────

export async function fetchUserFamily(userId: string): Promise<Family | null> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data: memberData } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberData?.family_id && isValidUUID(memberData.family_id)) {
        const { data: famData } = await supabase
          .from('families')
          .select('*')
          .eq('id', memberData.family_id)
          .maybeSingle();

        if (famData) return famData as Family;
      }
    } catch {}
    // In live Supabase mode, do not fall back to stale mock families
    return null;
  }

  await ensureLocalFamilyStore();
  for (const [fid, members] of localStore.members.entries()) {
    if (members.some((m) => m.user_id === userId)) {
      return localStore.families.get(fid) || null;
    }
  }
  return null;
}

export async function fetchFamilyById(familyId: string): Promise<Family | null> {
  if (!isMockEnabled()) {
    if (!isValidUUID(familyId)) return null;
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .maybeSingle();

      if (!error && data) {
        return data as Family;
      }
    } catch {}
    return null;
  }

  await ensureLocalFamilyStore();
  return localStore.families.get(familyId) || null;
}

export async function fetchFamilyMembers(familyId: string): Promise<FamilyMember[]> {
  if (!isMockEnabled()) {
    if (!isValidUUID(familyId)) return [];
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .order('joined_at', { ascending: true });

      if (!error && data) {
        return data as FamilyMember[];
      }
    } catch {}
  }

  await ensureLocalFamilyStore();
  return localStore.members.get(familyId) || [];
}

export async function fetchFamilyCartItems(familyId: string): Promise<FamilyCartItem[]> {
  if (!isMockEnabled()) {
    if (!isValidUUID(familyId)) return [];
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('family_cart_items')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as FamilyCartItem[];
      }
    } catch {}
  }

  await ensureLocalFamilyStore();
  return localStore.cartItems.get(familyId) || [];
}

export async function fetchFamilyInvites(familyId: string): Promise<FamilyInvite[]> {
  if (!isMockEnabled()) {
    if (!isValidUUID(familyId)) return [];
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('family_invites')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as FamilyInvite[];
      }
    } catch {}
  }

  await ensureLocalFamilyStore();
  return localStore.invites.get(familyId) || [];
}

export async function fetchFamilyJoinLinks(familyId: string): Promise<FamilyJoinLink[]> {
  let links: FamilyJoinLink[] = [];
  if (!isMockEnabled()) {
    if (!isValidUUID(familyId)) return [];
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase
        .from('family_join_links')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        links = data as FamilyJoinLink[];
      }
    } catch {}
  }

  if (links.length === 0) {
    await ensureLocalFamilyStore();
    links = localStore.links.get(familyId) || [];
  }

  // Reconcile with current family members: if a dependent has already joined the family,
  // ensure their join link is marked as 'redeemed' and never displayed as 'revoked'.
  try {
    const mems = await fetchFamilyMembers(familyId);
    if (mems && mems.length > 0) {
      for (const l of links) {
        const joined = mems.find(
          (m) =>
            (m.role === 'dependent' || m.dependent_type) &&
            ((l.redeemed_by && m.user_id === l.redeemed_by) ||
              m.display_name?.trim().toLowerCase() === l.display_name?.trim().toLowerCase()),
        );
        if (joined) {
          l.status = 'redeemed';
          if (!l.redeemed_at) {
            l.redeemed_at = joined.joined_at || new Date().toISOString();
          }
          if (!l.redeemed_by) {
            l.redeemed_by = joined.user_id;
          }
        }
      }
    }
  } catch {}

  return links;
}

export async function fetchFamilyCheckoutHold(
  familyId: string,
): Promise<FamilyCheckoutHold | null> {
  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data } = await supabase
        .from('family_checkout_holds')
        .select('*')
        .eq('family_id', familyId)
        .maybeSingle();

      if (data && new Date(data.expires_at).getTime() > Date.now()) {
        return data as FamilyCheckoutHold;
      }
    } catch {}
  }

  await ensureLocalFamilyStore();
  const h = localStore.holds.get(familyId);
  if (h && new Date(h.expires_at).getTime() > Date.now()) {
    return h;
  }
  return null;
}

/**
 * Checks whether user A and user B are related (same family now or within 90 days).
 */
export async function areRelated(userA: string, userB: string): Promise<boolean> {
  if (userA === userB) return true;

  if (!isMockEnabled()) {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.rpc('are_related', {
        p_user_a: userA,
        p_user_b: userB,
      });
      if (!error && typeof data === 'boolean') {
        return data;
      }
    } catch {}
  }

  await ensureLocalFamilyStore();
  for (const members of localStore.members.values()) {
    const hasA = members.some((m) => m.user_id === userA);
    const hasB = members.some((m) => m.user_id === userB);
    if (hasA && hasB) return true;
  }
  return false;
}

/**
 * Subscribes to realtime updates for family members.
 */
export function subscribeToFamilyMembersRealtime(
  familyId: string,
  onChanged: () => void,
): () => void {
  if (isMockEnabled()) return () => {};
  return subscribeToTable<FamilyMember>({
    table: 'family_members',
    filter: `family_id=eq.${familyId}`,
    onInsert: () => onChanged(),
    onUpdate: () => onChanged(),
    onDelete: () => onChanged(),
    onResync: onChanged,
  });
}

/**
 * Subscribes to realtime updates for family join links.
 */
export function subscribeToFamilyLinksRealtime(
  familyId: string,
  onChanged: () => void,
): () => void {
  if (isMockEnabled()) return () => {};
  return subscribeToTable<FamilyJoinLink>({
    table: 'family_join_links',
    filter: `family_id=eq.${familyId}`,
    onInsert: () => onChanged(),
    onUpdate: () => onChanged(),
    onDelete: () => onChanged(),
    onResync: onChanged,
  });
}

// ─── Reactive Family Lock Events & Realtime ──────────────────────────────────
type FamilyLockListener = (payload: { familyId: string; isLocked: boolean }) => void;
const familyLockListeners = new Set<FamilyLockListener>();

export function subscribeToFamilyLockEvents(listener: FamilyLockListener): () => void {
  familyLockListeners.add(listener);
  return () => {
    familyLockListeners.delete(listener);
  };
}

export function notifyFamilyLockListeners(familyId: string, isLocked: boolean) {
  familyLockListeners.forEach((listener) => {
    try {
      listener({ familyId, isLocked });
    } catch (e) {
      console.warn('[FamilyService] Error in family lock listener:', e);
    }
  });
}

/**
 * Subscribes to realtime updates for a family (e.g. lock/unlock changes).
 * Works across both Supabase Realtime subscriptions and in-app event broadcasts.
 */
export function subscribeToFamilyRealtime(
  familyId: string,
  onChanged: (updatedFam?: Partial<Family>) => void,
): () => void {
  // In-app / mock event subscription
  const unsubEvents = subscribeToFamilyLockEvents((evt) => {
    if (evt.familyId === familyId) {
      onChanged({ is_locked: evt.isLocked });
    }
  });

  if (isMockEnabled()) {
    return unsubEvents;
  }

  // Supabase Realtime subscription on public.families
  const unsubTable = subscribeToTable<Family>({
    table: 'families',
    filter: `id=eq.${familyId}`,
    onUpdate: (newRow) => {
      if (newRow) {
        onChanged(newRow);
      }
    },
    onResync: () => {
      fetchFamilyById(familyId).then((fam) => {
        if (fam) {
          onChanged(fam);
        }
      });
    },
  });

  return () => {
    unsubEvents();
    unsubTable();
  };
}
