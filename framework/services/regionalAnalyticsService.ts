import { CuisineType, DietTag, getMealKits } from './mealKitsService';

export interface StateData {
  stateCode: string;
  stateName: string;
  capitalCity: string;
  hubName: string;
  totalOrders: number;
  totalRevenue: number;
  topMealKitName: string;
  topMealKitId: string;
  vegOrderPercentage: number;
  nonVegOrderPercentage: number;
  growthRate: number; // e.g. +18.4%
}

export const INDIAN_STATES_ANALYTICS: StateData[] = [
  {
    stateCode: 'MH',
    stateName: 'Maharashtra',
    capitalCity: 'Mumbai',
    hubName: 'West Hub (Bhiwandi)',
    totalOrders: 4280,
    totalRevenue: 1420500,
    topMealKitName: 'Paneer Butter Masala Kit',
    topMealKitId: 'kit-101',
    vegOrderPercentage: 62,
    nonVegOrderPercentage: 38,
    growthRate: 24.5,
  },
  {
    stateCode: 'KA',
    stateName: 'Karnataka',
    capitalCity: 'Bengaluru',
    hubName: 'South Hub (Electronic City)',
    totalOrders: 5120,
    totalRevenue: 1785000,
    topMealKitName: 'Hyderabadi Dum Chicken Biryani Kit',
    topMealKitId: 'kit-102',
    vegOrderPercentage: 48,
    nonVegOrderPercentage: 52,
    growthRate: 31.2,
  },
  {
    stateCode: 'DL',
    stateName: 'Delhi NCR',
    capitalCity: 'New Delhi',
    hubName: 'North Hub (Noida)',
    totalOrders: 4650,
    totalRevenue: 1560000,
    topMealKitName: 'Slow-Brew Dal Makhani Kit',
    topMealKitId: 'kit-103',
    vegOrderPercentage: 58,
    nonVegOrderPercentage: 42,
    growthRate: 19.8,
  },
  {
    stateCode: 'TS',
    stateName: 'Telangana',
    capitalCity: 'Hyderabad',
    hubName: 'South Hub (Madhapur)',
    totalOrders: 3890,
    totalRevenue: 1342000,
    topMealKitName: 'Hyderabadi Dum Chicken Biryani Kit',
    topMealKitId: 'kit-102',
    vegOrderPercentage: 34,
    nonVegOrderPercentage: 66,
    growthRate: 28.0,
  },
  {
    stateCode: 'GJ',
    stateName: 'Gujarat',
    capitalCity: 'Ahmedabad',
    hubName: 'West Hub (Sanand)',
    totalOrders: 2940,
    totalRevenue: 894000,
    topMealKitName: 'Paneer Butter Masala Kit',
    topMealKitId: 'kit-101',
    vegOrderPercentage: 88,
    nonVegOrderPercentage: 12,
    growthRate: 15.6,
  },
  {
    stateCode: 'TN',
    stateName: 'Tamil Nadu',
    capitalCity: 'Chennai',
    hubName: 'South Hub (Guindy)',
    totalOrders: 2450,
    totalRevenue: 812000,
    topMealKitName: 'Coastal Prawns Ghee Roast Kit',
    topMealKitId: 'kit-104',
    vegOrderPercentage: 45,
    nonVegOrderPercentage: 55,
    growthRate: 17.2,
  },
  {
    stateCode: 'WB',
    stateName: 'West Bengal',
    capitalCity: 'Kolkata',
    hubName: 'East Hub (Salt Lake)',
    totalOrders: 2180,
    totalRevenue: 694000,
    topMealKitName: 'Kolkata Kathi Paneer Roll Kit',
    topMealKitId: 'kit-105',
    vegOrderPercentage: 41,
    nonVegOrderPercentage: 59,
    growthRate: 21.0,
  },
];

export interface TrendDataPoint {
  month: string;
  orders: number;
  revenue: number;
  biryaniShare: number;
  paneerShare: number;
}

export const MONTHLY_TRENDS: TrendDataPoint[] = [
  { month: 'Apr', orders: 2800, revenue: 920000, biryaniShare: 32, paneerShare: 28 },
  { month: 'May', orders: 3250, revenue: 1080000, biryaniShare: 34, paneerShare: 27 },
  { month: 'Jun', orders: 3600, revenue: 1210000, biryaniShare: 33, paneerShare: 29 },
  { month: 'Jul', orders: 4100, revenue: 1390000, biryaniShare: 35, paneerShare: 26 },
  { month: 'Aug', orders: 4650, revenue: 1580000, biryaniShare: 36, paneerShare: 30 },
  { month: 'Sep', orders: 5200, revenue: 1790000, biryaniShare: 38, paneerShare: 31 },
];

export interface CrossTabFilter {
  stateName: string;
  dietType: 'all' | 'veg' | 'nonveg';
  cuisine: string;
}

export function getCrossTabAnalytics(filter: CrossTabFilter) {
  const kits = getMealKits();
  let filtered = kits;

  if (filter.dietType !== 'all') {
    filtered = filtered.filter((k) =>
      filter.dietType === 'veg' ? k.diet === 'veg' : k.diet === 'nonveg',
    );
  }

  if (filter.cuisine !== 'all') {
    filtered = filtered.filter((k) => k.cuisine === filter.cuisine);
  }

  // Calculate units sold in selected state
  const ranked = filtered.map((k) => {
    const units = k.salesByRegion[filter.stateName] || Math.floor(k.reviewCount * 2.8);
    return {
      mealKitId: k.id,
      name: k.name,
      diet: k.diet,
      cuisine: k.cuisine,
      price: k.price,
      unitsSold: units,
      revenueGenerated: units * k.price,
      shareInRegion: 0,
    };
  });

  const totalRegionUnits = ranked.reduce((sum, item) => sum + item.unitsSold, 0);
  ranked.forEach((item) => {
    item.shareInRegion =
      totalRegionUnits > 0 ? Math.round((item.unitsSold / totalRegionUnits) * 100) : 0;
  });

  ranked.sort((a, b) => b.unitsSold - a.unitsSold);

  return {
    stateName: filter.stateName,
    dietType: filter.dietType,
    cuisine: filter.cuisine,
    totalOrdersInCrossTab: totalRegionUnits,
    topItems: ranked,
  };
}

export function generateRegionalCSV(stateName?: string): string {
  let rows = INDIAN_STATES_ANALYTICS;
  if (stateName && stateName !== 'All') {
    rows = rows.filter((r) => r.stateName === stateName);
  }

  const header =
    'State,Hub,Total Orders,Total Revenue (INR),Top Selling Meal,Veg %,Non-Veg %,Growth %';
  const csvLines = rows.map(
    (r) =>
      `"${r.stateName}","${r.hubName}",${r.totalOrders},${r.totalRevenue},"${r.topMealKitName}",${r.vegOrderPercentage}%,${r.nonVegOrderPercentage}%,+${r.growthRate}%`,
  );

  return [header, ...csvLines].join('\n');
}
