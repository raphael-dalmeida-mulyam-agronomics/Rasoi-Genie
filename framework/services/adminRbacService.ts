import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase/client';
import { RegionHub } from './mealKitsService';

export type AdminRole = 'super_admin' | 'regional_admin';

export const SUPER_ADMIN_EMAIL = 'raphael.dalmeida@mulyam.in';

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  regions: (RegionHub | string)[];
  createdAt: string;
  updatedAt?: string;
}

export type Region = RegionHub;

export interface StorageCentreRegion {
  id: string; // e.g. 'pune-city', 'pune-pcmc'
  name: string; // e.g. 'Pune City', 'Pimpri Chinchwad'
  city: string; // e.g. 'Pune'
  zone: RegionHub; // e.g. 'West'
  storageCentreName: string; // e.g. 'RasoiGenie Pune Central Depot'
  storageCentreAddress: string; // e.g. 'Shivajinagar / FC Road, Pune'
  coverageAreas: string[];
}

export const STORAGE_CENTRE_REGIONS: StorageCentreRegion[] = [
  // ─── PUNE ─────────────────────────────────────────────────────────────
  {
    id: 'pune-city',
    name: 'Pune City',
    city: 'Pune',
    zone: 'West',
    storageCentreName: 'RasoiGenie Pune Central Depot',
    storageCentreAddress: 'Shivajinagar / FC Road, Pune',
    coverageAreas: [
      'Shivajinagar',
      'FC Road',
      'Camp',
      'Kalyani Nagar',
      'Viman Nagar',
      'Koregaon Park',
      'Hadapsar',
      'Swargate',
      'Pune City',
    ],
  },
  {
    id: 'pune-pcmc',
    name: 'Pimpri Chinchwad',
    city: 'Pune',
    zone: 'West',
    storageCentreName: 'RasoiGenie PCMC Cold-Storage Centre',
    storageCentreAddress: 'Nigdi / Bhosari Industrial Area, Pune',
    coverageAreas: [
      'Pimpri',
      'Chinchwad',
      'Nigdi',
      'Bhosari',
      'Akurdi',
      'Ravet',
      'Moshi',
      'Pradhikaran',
      'PCMC',
    ],
  },
  {
    id: 'pune-west',
    name: 'Pune West & Hinjawadi',
    city: 'Pune',
    zone: 'West',
    storageCentreName: 'RasoiGenie Hinjawadi Tech Fulfillment Hub',
    storageCentreAddress: 'Wakad / Hinjawadi Phase 1, Pune',
    coverageAreas: [
      'Baner',
      'Aundh',
      'Balewadi',
      'Wakad',
      'Hinjawadi',
      'Kothrud',
      'Bavdhan',
      'Pashan',
    ],
  },

  // ─── MUMBAI ───────────────────────────────────────────────────────────
  {
    id: 'mumbai-south',
    name: 'South Mumbai',
    city: 'Mumbai',
    zone: 'West',
    storageCentreName: 'RasoiGenie Worli Storage Hub',
    storageCentreAddress: 'Worli Naka / Lower Parel, Mumbai',
    coverageAreas: [
      'Colaba',
      'Fort',
      'Marine Drive',
      'Worli',
      'Lower Parel',
      'Dadar',
      'Prabhadevi',
      'Nariman Point',
    ],
  },
  {
    id: 'mumbai-suburbs-west',
    name: 'Mumbai Western Suburbs',
    city: 'Mumbai',
    zone: 'West',
    storageCentreName: 'RasoiGenie Andheri Cold-Chain Depot',
    storageCentreAddress: 'MIDC Andheri East, Mumbai',
    coverageAreas: [
      'Bandra',
      'Khar',
      'Santacruz',
      'Juhu',
      'Andheri West',
      'Andheri East',
      'Goregaon',
    ],
  },
  {
    id: 'mumbai-suburbs-north',
    name: 'Mumbai Northern Suburbs',
    city: 'Mumbai',
    zone: 'West',
    storageCentreName: 'RasoiGenie Borivali Micro-Hub',
    storageCentreAddress: 'Borivali West / Link Road, Mumbai',
    coverageAreas: ['Malad', 'Kandivali', 'Borivali', 'Dahisar', 'Mira Road', 'Bhayandar'],
  },
  {
    id: 'mumbai-suburbs-central',
    name: 'Mumbai Central Suburbs',
    city: 'Mumbai',
    zone: 'West',
    storageCentreName: 'RasoiGenie Ghatkopar Storage Facility',
    storageCentreAddress: 'LBS Marg, Ghatkopar West, Mumbai',
    coverageAreas: ['Kurla', 'Ghatkopar', 'Vikhroli', 'Kanjurmarg', 'Bhandup', 'Mulund'],
  },
  {
    id: 'mumbai-thane-navi',
    name: 'Thane & Navi Mumbai',
    city: 'Mumbai',
    zone: 'West',
    storageCentreName: 'RasoiGenie Navi Mumbai Logistics Depot',
    storageCentreAddress: 'Sector 19 Vashi / Wagle Estate Thane',
    coverageAreas: [
      'Thane West',
      'Ghodbunder',
      'Vashi',
      'Nerul',
      'Kharghar',
      'Belapur',
      'Airoli',
      'Kopar Khairane',
    ],
  },

  // ─── BENGALURU ────────────────────────────────────────────────────────
  {
    id: 'blr-east',
    name: 'Bengaluru East & Whitefield',
    city: 'Bengaluru',
    zone: 'South',
    storageCentreName: 'RasoiGenie Whitefield Depot',
    storageCentreAddress: 'EPIP Zone, Whitefield, Bengaluru',
    coverageAreas: [
      'Indiranagar',
      'HAL',
      'Marathahalli',
      'Whitefield',
      'Bellandur',
      'Sarjapur Road',
      'Varthur',
    ],
  },
  {
    id: 'blr-south',
    name: 'Bengaluru South & Koramangala',
    city: 'Bengaluru',
    zone: 'South',
    storageCentreName: 'RasoiGenie HSR Storage Centre',
    storageCentreAddress: 'Sector 2, HSR Layout, Bengaluru',
    coverageAreas: [
      'Koramangala',
      'HSR Layout',
      'BTM Layout',
      'JP Nagar',
      'Jayanagar',
      'Electronic City',
      'Bannerghatta Road',
    ],
  },
  {
    id: 'blr-north',
    name: 'Bengaluru North & Hebbal',
    city: 'Bengaluru',
    zone: 'South',
    storageCentreName: 'RasoiGenie Hebbal Dispatch Hub',
    storageCentreAddress: 'Near Manyata Tech Park, Hebbal, Bengaluru',
    coverageAreas: [
      'Hebbal',
      'RT Nagar',
      'Yelahanka',
      'Sahakara Nagar',
      'Nagavara',
      'Kalyan Nagar',
    ],
  },
  {
    id: 'blr-central-west',
    name: 'Bengaluru Central & West',
    city: 'Bengaluru',
    zone: 'South',
    storageCentreName: 'RasoiGenie Central Depot',
    storageCentreAddress: 'Rajajinagar Industrial Area, Bengaluru',
    coverageAreas: [
      'MG Road',
      'CBD',
      'Malleshwaram',
      'Rajajinagar',
      'Vijayanagar',
      'Basavanagudi',
      'Yeshwanthpur',
    ],
  },

  // ─── DELHI NCR ────────────────────────────────────────────────────────
  {
    id: 'delhi-south-central',
    name: 'South & Central Delhi',
    city: 'Delhi NCR',
    zone: 'North',
    storageCentreName: 'RasoiGenie Okhla Storage Depot',
    storageCentreAddress: 'Okhla Phase 2, New Delhi',
    coverageAreas: [
      'Saket',
      'Hauz Khas',
      'Greater Kailash',
      'Vasant Kunj',
      'Lajpat Nagar',
      'Connaught Place',
      'Chanakyapuri',
    ],
  },
  {
    id: 'delhi-north-west',
    name: 'North & West Delhi',
    city: 'Delhi NCR',
    zone: 'North',
    storageCentreName: 'RasoiGenie Kirti Nagar Hub',
    storageCentreAddress: 'Kirti Nagar Industrial Area, New Delhi',
    coverageAreas: [
      'Rohini',
      'Pitampura',
      'Model Town',
      'Punjabi Bagh',
      'Rajouri Garden',
      'Janakpuri',
      'Dwarka',
    ],
  },
  {
    id: 'delhi-noida',
    name: 'Noida & Greater Noida',
    city: 'Delhi NCR',
    zone: 'North',
    storageCentreName: 'RasoiGenie Sector 63 Storage Centre',
    storageCentreAddress: 'Sector 63, Noida, Uttar Pradesh',
    coverageAreas: [
      'Sector 18',
      'Sector 50',
      'Sector 62',
      'Sector 76',
      'Sector 137',
      'Noida Expressway',
      'Greater Noida',
    ],
  },
  {
    id: 'delhi-gurugram',
    name: 'Gurugram & Manesar',
    city: 'Delhi NCR',
    zone: 'North',
    storageCentreName: 'RasoiGenie Udyog Vihar Dispatch Hub',
    storageCentreAddress: 'Udyog Vihar Phase 4, Gurugram, Haryana',
    coverageAreas: [
      'DLF Phase 1-5',
      'Cyber Hub',
      'Golf Course Road',
      'Golf Course Ext',
      'Sohna Road',
      'Sector 29',
      'Sector 56',
    ],
  },

  // ─── HYDERABAD ────────────────────────────────────────────────────────
  {
    id: 'hyd-west',
    name: 'Hyderabad West & Hitec City',
    city: 'Hyderabad',
    zone: 'South',
    storageCentreName: 'RasoiGenie Madhapur Cold-Chain Depot',
    storageCentreAddress: 'Ayyappa Society, Madhapur, Hyderabad',
    coverageAreas: [
      'Madhapur',
      'Hitec City',
      'Gachibowli',
      'Kondapur',
      'Financial District',
      'Kukatpally',
      'Miyapur',
    ],
  },
  {
    id: 'hyd-central-east',
    name: 'Hyderabad Central & Secunderabad',
    city: 'Hyderabad',
    zone: 'South',
    storageCentreName: 'RasoiGenie Banjara Storage Centre',
    storageCentreAddress: 'Road No 12, Banjara Hills, Hyderabad',
    coverageAreas: [
      'Banjara Hills',
      'Jubilee Hills',
      'Somajiguda',
      'Begumpet',
      'Secunderabad',
      'Uppal',
      'Tarnaka',
    ],
  },

  // ─── AHMEDABAD ────────────────────────────────────────────────────────
  {
    id: 'ahm-west',
    name: 'Ahmedabad West & SG Highway',
    city: 'Ahmedabad',
    zone: 'West',
    storageCentreName: 'RasoiGenie SG Highway Storage Hub',
    storageCentreAddress: 'Prahlad Nagar / SG Highway, Ahmedabad',
    coverageAreas: [
      'SG Highway',
      'Bopal',
      'Prahlad Nagar',
      'Bodakdev',
      'Thaltej',
      'Satellite',
      'Vastrapur',
    ],
  },
  {
    id: 'ahm-central-east',
    name: 'Ahmedabad Central & East',
    city: 'Ahmedabad',
    zone: 'West',
    storageCentreName: 'RasoiGenie Central Ahmedabad Depot',
    storageCentreAddress: 'Navrangpura / CG Road, Ahmedabad',
    coverageAreas: ['Navrangpura', 'CG Road', 'Paldi', 'Maninagar', 'Ellisbridge', 'Sabarmati'],
  },

  // ─── KOLKATA ──────────────────────────────────────────────────────────
  {
    id: 'kol-south-central',
    name: 'Kolkata South & Central',
    city: 'Kolkata',
    zone: 'East',
    storageCentreName: 'RasoiGenie South Kolkata Depot',
    storageCentreAddress: 'Ballygunge Circular Road, Kolkata',
    coverageAreas: [
      'Park Street',
      'Ballygunge',
      'Alipore',
      'Gariahat',
      'Jadavpur',
      'Behala',
      'Bhawanipur',
    ],
  },
  {
    id: 'kol-north-east',
    name: 'Kolkata North & Salt Lake',
    city: 'Kolkata',
    zone: 'East',
    storageCentreName: 'RasoiGenie Sector V Cold-Storage Centre',
    storageCentreAddress: 'Sector V, Salt Lake / New Town, Kolkata',
    coverageAreas: [
      'Salt Lake',
      'Sector V',
      'New Town',
      'Rajarhat',
      'Dum Dum',
      'Shyambazar',
      'Lake Town',
    ],
  },

  // ─── CHENNAI ──────────────────────────────────────────────────────────
  {
    id: 'chn-south',
    name: 'Chennai South & OMR Corridor',
    city: 'Chennai',
    zone: 'South',
    storageCentreName: 'RasoiGenie OMR Storage Hub',
    storageCentreAddress: 'Thoraipakkam, OMR, Chennai',
    coverageAreas: [
      'OMR',
      'Adyar',
      'Besant Nagar',
      'Thiruvanmiyur',
      'Velachery',
      'Sholinganallur',
      'Perungudi',
    ],
  },
  {
    id: 'chn-central-north',
    name: 'Chennai Central & North',
    city: 'Chennai',
    zone: 'South',
    storageCentreName: 'RasoiGenie Anna Nagar Storage Depot',
    storageCentreAddress: '2nd Avenue, Anna Nagar, Chennai',
    coverageAreas: [
      'T. Nagar',
      'Nungambakkam',
      'Anna Nagar',
      'Kilpauk',
      'Mylapore',
      'Egmore',
      'Alwarpet',
    ],
  },
];

export const ALL_STORAGE_CENTRE_IDS = STORAGE_CENTRE_REGIONS.map((r) => r.id);

export const ALL_REGIONS: (RegionHub | string)[] = [
  'North',
  'South',
  'West',
  'East',
  ...ALL_STORAGE_CENTRE_IDS,
];

export interface RegionInfo {
  id: RegionHub | string;
  name: string;
  majorCities: string[];
  description: string;
  smallerRegions?: StorageCentreRegion[];
}

export const REGIONS_LIST: RegionInfo[] = [
  {
    id: 'North',
    name: 'North Region',
    majorCities: ['Delhi NCR', 'Noida', 'Gurugram', 'Chandigarh', 'Jaipur', 'Lucknow'],
    description: 'Delhi NCR, Punjab, Haryana, Uttar Pradesh, Rajasthan, Uttarakhand',
    smallerRegions: STORAGE_CENTRE_REGIONS.filter((r) => r.zone === 'North'),
  },
  {
    id: 'South',
    name: 'South Region',
    majorCities: ['Bengaluru', 'Hyderabad', 'Chennai', 'Kochi', 'Coimbatore', 'Mysuru'],
    description: 'Karnataka, Telangana, Tamil Nadu, Andhra Pradesh, Kerala',
    smallerRegions: STORAGE_CENTRE_REGIONS.filter((r) => r.zone === 'South'),
  },
  {
    id: 'West',
    name: 'West Region',
    majorCities: ['Mumbai', 'Pune', 'Ahmedabad', 'Surat', 'Nagpur', 'Nashik'],
    description: 'Maharashtra, Gujarat, Goa, Madhya Pradesh',
    smallerRegions: STORAGE_CENTRE_REGIONS.filter((r) => r.zone === 'West'),
  },
  {
    id: 'East',
    name: 'East Region',
    majorCities: ['Kolkata', 'Patna', 'Bhubaneswar', 'Guwahati', 'Ranchi'],
    description: 'West Bengal, Odisha, Bihar, Jharkhand, Assam & North East',
    smallerRegions: STORAGE_CENTRE_REGIONS.filter((r) => r.zone === 'East'),
  },
];

/**
 * Resolves the designated storage centre region from a delivery address, city, or region ID.
 * Defaults to Pune City depot if unspecified.
 */
export function resolveStorageCentre(
  addressOrRegionId: string,
  city?: string,
): StorageCentreRegion {
  const query = `${addressOrRegionId || ''} ${city || ''}`.toLowerCase();

  // 1. Direct ID match
  const byId = STORAGE_CENTRE_REGIONS.find(
    (r) => r.id.toLowerCase() === (addressOrRegionId || '').toLowerCase(),
  );
  if (byId) return byId;

  // 2. Direct name match
  const byName = STORAGE_CENTRE_REGIONS.find((r) => query.includes(r.name.toLowerCase()));
  if (byName) return byName;

  // 3. Keyword / coverage areas match (e.g. 'pcmc', 'pimpri', 'nigdi', 'andheri', etc.)
  for (const reg of STORAGE_CENTRE_REGIONS) {
    if (reg.coverageAreas.some((area) => query.includes(area.toLowerCase()))) {
      return reg;
    }
  }

  // 4. City match
  const targetCity = (city || addressOrRegionId || '').toLowerCase();
  const byCity = STORAGE_CENTRE_REGIONS.find((r) => r.city.toLowerCase() === targetCity);
  if (byCity) return byCity;

  // 5. Zone fallback
  const byZone = STORAGE_CENTRE_REGIONS.find(
    (r) => r.zone.toLowerCase() === (addressOrRegionId || '').toLowerCase(),
  );
  if (byZone) return byZone;

  // Default to Pune City Depot
  return STORAGE_CENTRE_REGIONS[0]!;
}

// Fallback in-memory store for instant responsiveness & offline/sandbox support
let adminStore: AdminProfile[] = [
  {
    id: 'admin-super-01',
    email: SUPER_ADMIN_EMAIL,
    name: 'Raphael D’Almeida',
    role: 'super_admin',
    regions: ALL_REGIONS as any,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin-reg-01',
    email: 'pune.city.admin@mulyam.in',
    name: 'Pooja Verma (Pune City Depot)',
    role: 'regional_admin',
    regions: ['pune-city', 'West'] as any,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin-reg-02',
    email: 'pcmc.admin@mulyam.in',
    name: 'Rohan Shinde (Pimpri Chinchwad Storage)',
    role: 'regional_admin',
    regions: ['pune-pcmc', 'West'] as any,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin-reg-03',
    email: 'mumbai.west.admin@mulyam.in',
    name: 'Ananya Deshmukh (Mumbai Western Suburbs)',
    role: 'regional_admin',
    regions: ['mumbai-suburbs-west', 'West'] as any,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'admin-reg-04',
    email: 'blr.whitefield.admin@mulyam.in',
    name: 'Karthik Raman (Bengaluru Whitefield Depot)',
    role: 'regional_admin',
    regions: ['blr-east', 'South'] as any,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Checks if a given email is the designated Super Admin.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Fetches admin profile (role & assigned regions) for a specific email address.
 * Supabase-first with graceful fallback to local store.
 */
export async function fetchAdminProfile(email: string): Promise<AdminProfile | null> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || cleanEmail === 'raphdesantos@gmail.com' || !cleanEmail.endsWith('@mulyam.in')) {
    return null;
  }

  // Super Admin always has full access
  if (isSuperAdminEmail(cleanEmail)) {
    return {
      id: 'admin-super-01',
      email: SUPER_ADMIN_EMAIL,
      name: 'Raphael D’Almeida',
      role: 'super_admin',
      regions: ALL_REGIONS,
      createdAt: new Date().toISOString(),
    };
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from('admin_users')
      .select('id, email, name, role, created_at, updated_at')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!userError && userData) {
      // Fetch assigned regions for this admin
      const { data: regionData, error: regionError } = await supabase
        .from('admin_regions')
        .select('region_id')
        .ilike('admin_email', cleanEmail);

      const assignedRegions: (RegionHub | string)[] =
        !regionError && regionData
          ? (regionData.map((r: any) => r.region_id).filter(Boolean) as (RegionHub | string)[])
          : [];

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name || cleanEmail.split('@')[0],
        role: userData.role as AdminRole,
        regions: userData.role === 'super_admin' ? ALL_REGIONS : assignedRegions,
        createdAt: userData.created_at || new Date().toISOString(),
        updatedAt: userData.updated_at,
      };
    }
  } catch (err) {
    console.warn('[AdminRBAC] Supabase query error, checking local store:', err);
  }

  // Fallback to in-memory store
  const match = adminStore.find(
    (a) =>
      a.email.toLowerCase() === cleanEmail &&
      cleanEmail.endsWith('@mulyam.in') &&
      cleanEmail !== 'raphdesantos@gmail.com',
  );
  return match || null;
}

/**
 * Returns role and assigned regions for an admin email.
 */
export async function getAdminRoleAndRegions(
  email: string,
): Promise<{ role: AdminRole; regions: (RegionHub | string)[] }> {
  const profile = await fetchAdminProfile(email);
  if (!profile) {
    return { role: 'regional_admin', regions: [] };
  }
  return { role: profile.role, regions: profile.regions };
}

/**
 * Fetches all admin profiles with their assigned regions.
 * Strictly filters out any non-@mulyam.in emails and raphdesantos@gmail.com.
 */
export async function fetchAllAdminProfiles(): Promise<AdminProfile[]> {
  try {
    // Purge raphdesantos@gmail.com from Supabase if present
    try {
      supabase.from('admin_users').delete().ilike('email', 'raphdesantos@gmail.com').then(() => {}, () => {});
      supabase.from('admin_regions').delete().ilike('admin_email', 'raphdesantos@gmail.com').then(() => {}, () => {});
    } catch {}

    const { data: users, error: usersErr } = await supabase
      .from('admin_users')
      .select('id, email, name, role, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (!usersErr && users && users.length > 0) {
      // Filter out raphdesantos@gmail.com and any email that does not end with @mulyam.in
      const validAdminUsers = users.filter((u: any) => {
        const em = (u.email || '').trim().toLowerCase();
        return em !== 'raphdesantos@gmail.com' && em.endsWith('@mulyam.in');
      });

      const { data: regionsData } = await supabase
        .from('admin_regions')
        .select('admin_email, region_id');

      const regionsByEmail = new Map<string, (RegionHub | string)[]>();
      if (regionsData) {
        for (const r of regionsData) {
          const em = r.admin_email.toLowerCase();
          const list = regionsByEmail.get(em) || [];
          if (!list.includes(r.region_id)) {
            list.push(r.region_id);
          }
          regionsByEmail.set(em, list);
        }
      }

      return validAdminUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name || u.email.split('@')[0],
        role: u.role as AdminRole,
        regions:
          u.role === 'super_admin' || isSuperAdminEmail(u.email)
            ? ALL_REGIONS
            : regionsByEmail.get(u.email.toLowerCase()) || [],
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }));
    }
  } catch (err) {
    console.warn('[AdminRBAC] Error fetching from Supabase, using local store:', err);
  }

  return adminStore.filter(
    (a) =>
      a.email.toLowerCase() !== 'raphdesantos@gmail.com' &&
      a.email.toLowerCase().endsWith('@mulyam.in'),
  );
}

/**
 * Assigns an admin to specified regions (many-to-many relationship).
 * If the admin does not exist yet, creates them in admin_users.
 * Strictly verifies email domain ends with @mulyam.in and rejects non-allowed accounts.
 * Only callable by Super Admin.
 */
export async function assignAdminRegions(
  email: string,
  regions: (RegionHub | string)[],
  name?: string,
  role: AdminRole = 'regional_admin',
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (
    !cleanEmail ||
    !cleanEmail.includes('@') ||
    cleanEmail === 'raphdesantos@gmail.com' ||
    !cleanEmail.endsWith('@mulyam.in')
  ) {
    return {
      success: false,
      error: 'Admin role can only be granted to email addresses ending with @mulyam.in.',
    };
  }

  // Update in-memory store immediately
  const existingIdx = adminStore.findIndex((a) => a.email.toLowerCase() === cleanEmail);
  const updatedEntry: AdminProfile = {
    id: existingIdx >= 0 ? adminStore[existingIdx]!.id : `admin-${Date.now()}`,
    email: cleanEmail,
    name: name || cleanEmail.split('@')[0] || 'Admin',
    role: isSuperAdminEmail(cleanEmail) ? 'super_admin' : role,
    regions: isSuperAdminEmail(cleanEmail) ? ALL_REGIONS : regions,
    createdAt: existingIdx >= 0 ? adminStore[existingIdx]!.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    adminStore[existingIdx] = updatedEntry;
  } else {
    adminStore.push(updatedEntry);
  }

  // Synchronize to Supabase
  try {
    // 1. Upsert admin user
    const { error: userError } = await supabase.from('admin_users').upsert(
      {
        email: cleanEmail,
        name: updatedEntry.name,
        role: updatedEntry.role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    );

    if (userError) {
      console.warn('[AdminRBAC] Supabase user upsert error:', userError.message);
    }

    // 2. Clear old regions for this admin
    await supabase.from('admin_regions').delete().ilike('admin_email', cleanEmail);

    // 3. Insert new assigned regions (many-to-many)
    if (regions.length > 0 && updatedEntry.role !== 'super_admin') {
      const regionRows = regions.map((regionId) => ({
        admin_email: cleanEmail,
        region_id: regionId,
        assigned_at: new Date().toISOString(),
      }));

      const { error: regInsertError } = await supabase.from('admin_regions').insert(regionRows);
      if (regInsertError) {
        console.warn('[AdminRBAC] Supabase admin_regions insert error:', regInsertError.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[AdminRBAC] Supabase sync exception:', err?.message || err);
    return { success: true }; // Local store updated
  }
}

/**
 * Removes an admin profile and all their regional assignments.
 * Super admin cannot be removed.
 */
export async function deleteAdminProfile(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (isSuperAdminEmail(cleanEmail)) {
    return { success: false, error: 'The primary Super Admin cannot be deleted.' };
  }

  adminStore = adminStore.filter((a) => a.email.toLowerCase() !== cleanEmail);

  try {
    await supabase.from('admin_regions').delete().ilike('admin_email', cleanEmail);
    await supabase.from('admin_users').delete().ilike('email', cleanEmail);
    return { success: true };
  } catch (err: any) {
    console.warn('[AdminRBAC] Supabase delete exception:', err?.message || err);
    return { success: true };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHEF ROLE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface ChefProfile {
  uid: string;
  email: string;
  displayName: string;
  approvedAt: string;
  approvedBy: string; // admin email who granted the role
  bio?: string;
  speciality?: string;
}

// Persistent local store for chef profiles (survives reloads & re-logins on this device)
const CHEF_STORE_KEY = '@rasoi_chef_profiles_v1';
let chefStore: ChefProfile[] = [];
let chefStoreLoaded = false;

/** True when Supabase reports the table/column hasn't been created (migration not applied). */
function isMissingTableError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  return err?.code === 'PGRST205' || err?.code === '42P01' || msg.includes('schema cache');
}

async function ensureChefStoreLoaded(): Promise<void> {
  if (chefStoreLoaded) return;
  chefStoreLoaded = true;
  try {
    // On web, read from localStorage first (synchronous, cross-tab)
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      raw = window.localStorage.getItem(CHEF_STORE_KEY);
    }
    // Fall back to AsyncStorage (native / non-web)
    if (!raw) {
      raw = await AsyncStorage.getItem(CHEF_STORE_KEY);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const merged = [...parsed];
        for (const c of chefStore) {
          if (!merged.some((m: ChefProfile) => m.uid === c.uid)) merged.push(c);
        }
        chefStore = merged;
      }
    }
  } catch (err) {
    console.warn('[ChefRBAC] Could not load local chef store:', err);
  }
}

async function persistChefStore(): Promise<void> {
  try {
    const json = JSON.stringify(chefStore);
    // Write to AsyncStorage (native) AND localStorage (web) so any tab on this
    // origin can pick up the change immediately via the 'storage' event.
    await AsyncStorage.setItem(CHEF_STORE_KEY, json);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CHEF_STORE_KEY, json);
    }
  } catch (err) {
    console.warn('[ChefRBAC] Could not persist local chef store:', err);
  }
}

function mapChefRow(r: any): ChefProfile {
  return {
    uid: r.uid,
    email: (r.email || '').toLowerCase(),
    displayName: r.display_name || r.email?.split('@')[0] || 'Chef',
    approvedAt: r.approved_at,
    approvedBy: r.approved_by,
    bio: r.bio,
    speciality: r.speciality,
  };
}

/**
 * Fetches all approved chef profiles, merging Supabase with the local persistent store.
 */
export async function fetchAllChefProfiles(): Promise<ChefProfile[]> {
  await ensureChefStoreLoaded();
  const result: ChefProfile[] = [...chefStore];
  try {
    const { data, error } = await supabase
      .from('chef_profiles')
      .select('uid, email, display_name, approved_at, approved_by, bio, speciality')
      .order('approved_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const c = mapChefRow(row);
        if (!result.some((r) => r.uid === c.uid)) result.push(c);
      }
    }
  } catch (err) {
    console.warn('[ChefRBAC] Supabase fetchAllChefProfiles error:', err);
  }
  return result;
}

/**
 * Fetches a single chef profile by UID or email.
 */
export async function fetchChefProfile(
  identifier: string,
  emailFallback?: string | null,
): Promise<ChefProfile | null> {
  const cleanId = (identifier || '').trim();
  const cleanEmail = (emailFallback || '').trim().toLowerCase();
  if (!cleanId && !cleanEmail) return null;

  await ensureChefStoreLoaded();

  // 1. Check local persistent store first
  const foundLocal = chefStore.find(
    (c) =>
      (cleanId && c.uid === cleanId) ||
      (cleanEmail && c.email?.toLowerCase() === cleanEmail),
  );
  if (foundLocal) {
    return foundLocal;
  }

  // 2. Query Supabase chef_profiles (by uid, then by email)
  try {
    const select = 'uid, email, display_name, approved_at, approved_by, bio, speciality';
    let row: any = null;
    if (cleanId) {
      const { data, error } = await supabase
        .from('chef_profiles')
        .select(select)
        .eq('uid', cleanId)
        .limit(1);
      if (!error && Array.isArray(data) && data.length > 0) row = data[0];
    }
    if (!row && cleanEmail) {
      const { data, error } = await supabase
        .from('chef_profiles')
        .select(select)
        .ilike('email', cleanEmail)
        .limit(1);
      if (!error && Array.isArray(data) && data.length > 0) row = data[0];
    }

    if (row) {
      const chefRecord = mapChefRow(row);
      if (!chefStore.some((c) => c.uid === chefRecord.uid)) {
        chefStore.push(chefRecord);
        await persistChefStore();
      }
      return chefRecord;
    }
  } catch (err) {
    console.warn('[ChefRBAC] Supabase fetchChefProfile error:', err);
  }
  return null;
}

/**
 * Grants the chef role to a user. Called by Super Admin or Regional Admin.
 * This upserts a record in `chef_profiles`, updates the user's role in
 * `user_profiles`, and updates local session storage so the user immediately
 * gets Chef Studio access.
 */
export async function grantChefRole(
  uid: string,
  email: string,
  displayName: string,
  approvedByEmail: string,
  bio?: string,
  speciality?: string,
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const chefEntry: ChefProfile = {
    uid,
    email: cleanEmail,
    displayName,
    approvedAt: new Date().toISOString(),
    approvedBy: approvedByEmail,
    bio,
    speciality,
  };

  // 1. Update local chef store (persisted to device storage)
  await ensureChefStoreLoaded();
  const idx = chefStore.findIndex(
    (c) => c.uid === uid || (cleanEmail && c.email.toLowerCase() === cleanEmail),
  );
  if (idx >= 0) {
    chefStore[idx] = chefEntry;
  } else {
    chefStore.push(chefEntry);
  }
  await persistChefStore();

  // 2. Update local session storage if active user on device matches
  try {
    const { getStoredUser, saveStoredUser } = await import('../firebase/authService');
    const stored = await getStoredUser();
    if (
      stored &&
      (stored.uid === uid || (stored.email && stored.email.toLowerCase() === cleanEmail))
    ) {
      await saveStoredUser({ ...stored, role: 'chef' });
    }
  } catch {}

  // 3. Update managed user store and emit notification
  try {
    const { setUserChefRole } = await import('./userManagementService');
    setUserChefRole(uid, true);
  } catch {}

  try {
    // 4. Upsert chef_profiles in Supabase
    const { error: chefError } = await supabase.from('chef_profiles').upsert(
      {
        uid,
        email: chefEntry.email,
        display_name: displayName,
        approved_at: chefEntry.approvedAt,
        approved_by: approvedByEmail,
        bio: bio ?? null,
        speciality: speciality ?? null,
      },
      { onConflict: 'uid' },
    );
    if (chefError && !isMissingTableError(chefError)) {
      console.warn('[ChefRBAC] chef_profiles upsert error:', chefError.message);
    }

    // Touch user_profiles so AuthContext's realtime listener fires on the user's device.
    // This is what actually wakes up the user's session without requiring a re-login.
    try {
      await supabase
        .from('user_profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('uid', uid);
    } catch {
      // Non-critical — the 8s polling in AuthContext will catch it anyway
    }

    return { success: true };
  } catch (err: any) {
    console.warn('[ChefRBAC] grantChefRole exception:', err?.message || err);
    return { success: true }; // Local store already updated
  }
}

/**
 * Revokes the chef role from a user, removing their chef_profiles record
 * and resetting their role back to 'customer'.
 */
export async function revokeChefRole(
  uid: string,
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  await ensureChefStoreLoaded();
  chefStore = chefStore.filter(
    (c) => c.uid !== uid && (!cleanEmail || c.email.toLowerCase() !== cleanEmail),
  );
  await persistChefStore();

  // Update local session storage if active user matches
  try {
    const { getStoredUser, saveStoredUser } = await import('../firebase/authService');
    const stored = await getStoredUser();
    if (
      stored &&
      (stored.uid === uid || (stored.email && stored.email.toLowerCase() === cleanEmail))
    ) {
      await saveStoredUser({ ...stored, role: 'customer' });
    }
  } catch {}

  // Update managed user store
  try {
    const { setUserChefRole } = await import('./userManagementService');
    setUserChefRole(uid, false);
  } catch {}

  try {
    await supabase.from('chef_profiles').delete().eq('uid', uid);
    if (cleanEmail) {
      await supabase.from('chef_profiles').delete().ilike('email', cleanEmail);
    }
    // Touch user_profiles to wake up AuthContext's realtime listener
    try {
      await supabase
        .from('user_profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('uid', uid);
    } catch {
      // Non-critical
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[ChefRBAC] revokeChefRole exception:', err?.message || err);
    return { success: true };
  }
}
