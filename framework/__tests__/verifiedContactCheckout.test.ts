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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveVerifiedContactInfo,
  getVerifiedContactInfo,
  clearVerifiedContactInfo,
} from '../services/verifiedContactService';
import {
  getUserProfileFromSupabase,
  saveUserProfileToSupabase,
  UserProfileData,
} from '../services/supabaseUserService';

describe('Verified Contact & Address Checkout Subsequent Orders Flow', () => {
  beforeEach(async () => {
    mockStorage.clear();
    await AsyncStorage.clear();
  });

  it('automatically detects and reuses verified contact details AND saved delivery address on subsequent orders without re-prompting', async () => {
    const customerId = 'cust_subsequent_order_101';

    // 1. Initial State: customer has no saved contact details or addresses
    let initialContact = await getVerifiedContactInfo(customerId);
    expect(initialContact).toBeNull();

    // 2. Customer places their 1st order: verifies phone, enters contact & delivery address
    await saveVerifiedContactInfo({
      userId: customerId,
      name: 'Priya Sundaram',
      phone: '9845012345',
      email: 'priya.sundaram@gmail.com',
      address: {
        flatAndStreet: 'Flat 302, Green Valley Apartments',
        areaAndLandmark: 'Near Indiranagar Metro',
        city: 'Bengaluru',
        pincode: '560038',
        deliveryInstructions: 'Ring bell twice',
        tag: 'Home',
      },
    });

    // 3. Verify it is saved in database profile (both contact info and addresses array)
    const profileAfterOrder1 = await getUserProfileFromSupabase(customerId);
    expect(profileAfterOrder1).not.toBeNull();
    expect(profileAfterOrder1?.displayName).toBe('Priya Sundaram');
    expect(profileAfterOrder1?.phoneNumber).toBe('+919845012345');
    expect(profileAfterOrder1?.email).toBe('priya.sundaram@gmail.com');
    expect(profileAfterOrder1?.addresses).toHaveLength(1);
    expect(profileAfterOrder1?.addresses[0]?.flatAndStreet).toBe(
      'Flat 302, Green Valley Apartments',
    );
    expect(profileAfterOrder1?.addresses[0]?.areaAndLandmark).toBe('Near Indiranagar Metro');

    // 4. Customer opens checkout for their 2nd order:
    // The app checks for saved details: both contact details and delivery address are loaded automatically!
    const contactForOrder2 = await getVerifiedContactInfo(customerId);
    expect(contactForOrder2).not.toBeNull();
    expect(contactForOrder2?.name).toBe('Priya Sundaram');
    expect(contactForOrder2?.phone).toBe('9845012345');
    expect(contactForOrder2?.email).toBe('priya.sundaram@gmail.com');
    expect(contactForOrder2?.isVerified).toBe(true);
    expect(contactForOrder2?.address).toBeDefined();
    expect(contactForOrder2?.address?.flatAndStreet).toBe('Flat 302, Green Valley Apartments');
    expect(contactForOrder2?.address?.areaAndLandmark).toBe('Near Indiranagar Metro');
    expect(contactForOrder2?.address?.pincode).toBe('560038');

    // 5. Customer places order 2 without having to type their address or contact info again!
    // Now imagine in order 3, customer updates flat & street:
    await saveVerifiedContactInfo({
      userId: customerId,
      name: 'Priya Sundaram',
      phone: '9845012345',
      email: 'priya.sundaram@gmail.com',
      address: {
        flatAndStreet: 'Villa 14, Prestige Palm',
        areaAndLandmark: 'Whitefield Main Road',
        city: 'Bengaluru',
        pincode: '560066',
        tag: 'Home',
      },
    });

    // 6. For order 4, the updated address is automatically loaded from the database:
    const contactForOrder4 = await getVerifiedContactInfo(customerId);
    expect(contactForOrder4?.address?.flatAndStreet).toBe('Villa 14, Prestige Palm');
    expect(contactForOrder4?.address?.areaAndLandmark).toBe('Whitefield Main Road');
  });

  it('supports guest user placing multiple orders with saved delivery address without re-asking', async () => {
    // 1. Guest places order 1 with delivery address
    await saveVerifiedContactInfo({
      name: 'Kabir Mehta',
      phone: '9711223344',
      email: 'kabir@mehta.com',
      isGuest: true,
      address: {
        flatAndStreet: 'Penthouse 18, Royal Heights',
        areaAndLandmark: 'Defence Colony',
        city: 'Bengaluru',
        pincode: '560038',
        tag: 'Home',
      },
    });

    // 2. Guest comes back tomorrow for order 2
    const guestContact = await getVerifiedContactInfo();
    expect(guestContact).not.toBeNull();
    expect(guestContact?.name).toBe('Kabir Mehta');
    expect(guestContact?.phone).toBe('9711223344');
    expect(guestContact?.email).toBe('kabir@mehta.com');
    expect(guestContact?.isVerified).toBe(true);
    expect(guestContact?.address).toBeDefined();
    expect(guestContact?.address?.flatAndStreet).toBe('Penthouse 18, Royal Heights');
    expect(guestContact?.address?.areaAndLandmark).toBe('Defence Colony');
  });
});
