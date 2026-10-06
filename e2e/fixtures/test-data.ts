/**
 * Test data definitions for Playwright E2E suites.
 * Contains seeded accounts, test kits, test coupons, and referral fixtures.
 */

export interface TestUserAccount {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  role: 'admin' | 'chef' | 'customer';
  isOnboarded?: boolean;
}

export const TEST_USERS = {
  admin: {
    uid: 'admin_e2e_user',
    email: 'admin@mulyam.in',
    displayName: 'Admin Tester',
    phoneNumber: '+919999900001',
    role: 'admin',
    isOnboarded: true,
  } as TestUserAccount,

  chef: {
    uid: 'chef_e2e_user',
    email: 'chef@rasoigenie.com',
    displayName: 'Chef Sanjeev Test',
    phoneNumber: '+919999900002',
    role: 'chef',
    isOnboarded: true,
  } as TestUserAccount,

  customer: {
    uid: 'user_e2e_customer',
    email: 'customer@example.com',
    displayName: 'Rahul Customer',
    phoneNumber: '+919999900003',
    role: 'customer',
    isOnboarded: true,
  } as TestUserAccount,

  referrer: {
    uid: 'referrer_e2e_user',
    email: 'referrer@example.com',
    displayName: 'Pooja Referrer',
    phoneNumber: '+919999900004',
    role: 'customer',
    isOnboarded: true,
  } as TestUserAccount,

  referee: {
    uid: 'referee_e2e_user',
    email: 'referee@example.com',
    displayName: 'Aman Referee',
    phoneNumber: '+919999900005',
    role: 'customer',
    isOnboarded: true,
  } as TestUserAccount,
};

export const TEST_COUPONS = {
  validFlat: 'RASOI100',
  validFreeDelivery: 'FREEDEL',
  invalid: 'FAKECOUPON99',
};

export const TEST_REFERRAL = {
  code: 'RASOIREF99',
  referrerReward: 300,
  referredReward: 200,
  qualificationEvent: 'FIRST_ORDER_DELIVERED' as const,
};

export const TEST_MEAL_KITS = [
  {
    id: 'e2e-kit-butter-chicken',
    name: 'Delhi Style Butter Chicken Kit',
    tagline: 'Rich tomato gravy with velvety spiced butter sauce',
    description: 'Authentic Old Delhi style makhani gravy with marinated tender chicken and freshly ground garam masala sachets.',
    cuisine: 'North Indian',
    diet: 'nonveg',
    dishCategory: 'Curries & Gravies',
    price: 349,
    servings: 2,
    prepTimeMinutes: 15,
    cookTimeMinutes: 25,
    spiceLevel: 'Medium',
    heroImage: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
    tags: ['North Indian', 'Curries & Gravies', 'Non-Veg', 'Popular'],
    isTrending: true,
    isOutOfStock: false,
    availableRegions: ['North', 'South', 'West', 'East'],
  },
  {
    id: 'e2e-kit-paneer-tikka',
    name: 'Amritsari Paneer Tikka Kit',
    tagline: 'Smoky grilled paneer cubes with mint chutney marinade',
    description: 'Fresh malai paneer cubes marinated in hung curd, carom seeds, mustard oil and kasuri methi.',
    cuisine: 'Punjabi',
    diet: 'veg',
    dishCategory: 'Street Food',
    price: 299,
    servings: 2,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    spiceLevel: 'Spicy',
    heroImage: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
    tags: ['Punjabi', 'Street Food', 'Vegetarian'],
    isTrending: false,
    isOutOfStock: false,
    availableRegions: ['North', 'South', 'West', 'East'],
  },
];
