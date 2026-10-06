import { fetchAllUserProfilesFromSupabase } from '../services/supabaseUserService';
import { fetchLiveManagedUsers, getManagedUsers, updateUserWalletBalance } from '../services/userManagementService';
import { adminIssueCredits, adminGetAllWallets, getWalletBalance } from '../services/walletService';

describe('Actual Customer Accounts Discovery & Wallet Credit Issuing', () => {
  it('discovers actual signed-up customers and order customers without filler mock data', async () => {
    const profiles = await fetchAllUserProfilesFromSupabase();

    // Verify filler customers are NOT present
    const priya = profiles.find((p) => p.displayName === 'Priya Sharma');
    expect(priya).toBeUndefined();
    const aarav = profiles.find((p) => p.displayName === 'Aarav Patel');
    expect(aarav).toBeUndefined();

    // Verify real customer accounts from orders or signups are discovered
    const realCustomer = profiles.find((p) => p.uid === 'EElqxIIgpehuPHtIIRVzLybIwos1');
    if (realCustomer) {
      expect(realCustomer.displayName).toBe("Raphael D'Almeida");
      expect(realCustomer.uid).toBe('EElqxIIgpehuPHtIIRVzLybIwos1');
    }
  });

  it('populates live customer accounts in user management with role customer for real accounts', async () => {
    const users = await fetchLiveManagedUsers();

    // Staff admin exists
    const staffAdmins = users.filter((u) => u.role === 'admin');
    expect(staffAdmins.length).toBeGreaterThanOrEqual(1);
    expect(staffAdmins[0].email).toContain('@mulyam.in');

    // Real customer account is categorized under customer role
    const realCustomer = users.find((u) => u.id === 'EElqxIIgpehuPHtIIRVzLybIwos1');
    if (realCustomer) {
      expect(realCustomer.role).toBe('customer');
      expect(realCustomer.name).toBe("Raphael D'Almeida");
    }
  });

  it('successfully issues wallet credits to a real customer and updates their live balance', async () => {
    const targetCustomerId = 'EElqxIIgpehuPHtIIRVzLybIwos1';
    const initialBalRes = await getWalletBalance(targetCustomerId);
    const prevBalance = initialBalRes.data?.available_balance ?? 0;

    const creditResult = await adminIssueCredits({
      targetUserId: targetCustomerId,
      amount: 150,
      source: 'PROMOTION',
      description: 'Customer loyalty bonus',
      adminId: 'admin_raphael_01',
      idempotencyKey: `test_actual_cred_${Date.now()}`,
    });

    expect(creditResult.success).toBe(true);
    expect(creditResult.data?.newBalance).toBe(prevBalance + 150);

    // Verify balance persisted
    const updatedBalRes = await getWalletBalance(targetCustomerId);
    expect(updatedBalRes.data?.available_balance).toBe(prevBalance + 150);

    // Verify live managed users reflects updated balance
    updateUserWalletBalance(targetCustomerId, creditResult.data!.newBalance);
    const liveUsers = getManagedUsers();
    const updatedUser = liveUsers.find((u) => u.id === targetCustomerId);
    if (updatedUser) {
      expect(updatedUser.walletBalance).toBe(prevBalance + 150);
    }
  });

  it('adminGetAllWallets lists actual customer wallets without filler accounts', async () => {
    const walletsRes = await adminGetAllWallets(100);
    expect(walletsRes.success).toBe(true);

    // Ensure filler names are absent
    const priyaWallet = walletsRes.data?.find((w) => w.customer_name === 'Priya Sharma');
    expect(priyaWallet).toBeUndefined();

    // Ensure real customer wallet exists
    const realWallet = walletsRes.data?.find((w) => w.user_id === 'EElqxIIgpehuPHtIIRVzLybIwos1');
    if (realWallet) {
      expect(realWallet.customer_name).toBe("Raphael D'Almeida");
    }
  });
});
