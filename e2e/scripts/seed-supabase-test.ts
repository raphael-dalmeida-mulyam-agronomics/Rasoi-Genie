/**
 * Seed script for Supabase test database.
 * Seeds:
 * 1. Seeded user rows in user_profiles / users (with isOnboarded = true)
 * 2. Chef profile in chef_profiles for chef test user
 * 3. Seeded meal kits in meal_kits table
 * 4. Referral settings & referral code for referrer in referral_codes
 * 5. Pending chef submission in chef_submissions
 */

import { TEST_USERS, TEST_MEAL_KITS, TEST_REFERRAL } from '../fixtures/test-data';
import { testSupabase as supabase } from '../fixtures/test-helpers';

export async function seedSupabaseTest() {
  console.log('[Seed Supabase] Starting Supabase test data seeding...');

  try {
    // 1. Seed user profiles
    for (const user of Object.values(TEST_USERS)) {
      const { error: userErr } = await supabase.from('users').upsert(
        {
          id: user.uid,
          email: user.email,
          display_name: user.displayName,
          phone: user.phoneNumber,
          role: user.role,
          is_onboarded: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
      if (userErr) {
        console.warn(`[Seed Supabase] Warning upserting user ${user.email}:`, userErr.message);
      }
    }

    // 2. Seed chef profile in chef_profiles
    const { error: chefErr } = await supabase.from('chef_profiles').upsert(
      {
        uid: TEST_USERS.chef.uid,
        email: TEST_USERS.chef.email,
        display_name: TEST_USERS.chef.displayName,
        speciality: 'North Indian & Mughlai Delicacies',
        is_active: true,
        approved_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      { onConflict: 'uid' },
    );
    if (chefErr) {
      console.warn('[Seed Supabase] Warning upserting chef profile:', chefErr.message);
    }

    // 3. Seed meal kits in meal_kits table
    for (const kit of TEST_MEAL_KITS) {
      const { error: kitErr } = await supabase.from('meal_kits').upsert(
        {
          id: kit.id,
          name: kit.name,
          tagline: kit.tagline,
          description: kit.description,
          cuisine: kit.cuisine,
          diet: kit.diet,
          dish_category: kit.dishCategory,
          price: kit.price,
          servings: kit.servings,
          prep_time_minutes: kit.prepTimeMinutes,
          cook_time_minutes: kit.cookTimeMinutes,
          spice_level: kit.spiceLevel,
          hero_image: kit.heroImage,
          tags: kit.tags,
          is_trending: kit.isTrending,
          is_out_of_stock: kit.isOutOfStock,
          available_regions: kit.availableRegions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
      if (kitErr) {
        console.warn(`[Seed Supabase] Warning upserting kit ${kit.id}:`, kitErr.message);
      }
    }

    // 4. Seed referral code & settings
    const { error: refSettingsErr } = await supabase.from('referral_settings').upsert(
      {
        id: 1,
        referrer_reward: TEST_REFERRAL.referrerReward,
        referred_reward: TEST_REFERRAL.referredReward,
        referral_credit_expiry_days: 60,
        min_qualifying_order_amount: 0,
        programme_enabled: true,
        qualification_event: TEST_REFERRAL.qualificationEvent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (refSettingsErr) {
      console.warn('[Seed Supabase] Warning upserting referral settings:', refSettingsErr.message);
    }

    const { error: codeErr } = await supabase.from('referral_codes').upsert(
      {
        user_id: TEST_USERS.referrer.uid,
        code: TEST_REFERRAL.code,
        is_active: true,
        total_uses: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'code' },
    );
    if (codeErr) {
      console.warn('[Seed Supabase] Warning upserting referral code:', codeErr.message);
    }

    // 5. Seed a pending chef submission for admin review
    const { error: subErr } = await supabase.from('chef_submissions').upsert(
      {
        id: 'e2e-submission-shahi-paneer',
        chef_id: TEST_USERS.chef.uid,
        chef_name: TEST_USERS.chef.displayName,
        chef_email: TEST_USERS.chef.email,
        name: 'Royal Shahi Paneer Special',
        tagline: 'Creamy cashew and saffron royal curry',
        description:
          'Tender cottage cheese cooked in a rich, sweet and savory gravy of cashews, almonds and aromatic spices.',
        cuisine: 'North Indian',
        diet: 'veg',
        dish_category: 'Curries & Gravies',
        servings: 2,
        prep_time_minutes: 15,
        cook_time_minutes: 20,
        spice_level: 'Mild',
        ingredients: [
          { name: 'Paneer Cubes', quantity: '250g' },
          { name: 'Cashew Saffron Paste', quantity: '100g' },
          { name: 'Whole Shahi Spices', quantity: '1 sachet' },
        ],
        recipe_steps: [
          {
            step_number: 1,
            title: 'Saute spices',
            instruction: 'Heat ghee in a pan and lightly saute whole spices.',
          },
          {
            step_number: 2,
            title: 'Simmer gravy',
            instruction: 'Add cashew paste and simmer on low flame for 8 minutes.',
          },
          {
            step_number: 3,
            title: 'Add paneer',
            instruction: 'Gently add paneer cubes and garnish with crushed kasuri methi.',
          },
        ],
        submission_status: 'pending_review',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (subErr) {
      console.warn('[Seed Supabase] Warning upserting pending chef submission:', subErr.message);
    }

    console.log('[Seed Supabase] Successfully seeded Supabase test state.');
  } catch (err: any) {
    console.warn('[Seed Supabase] Unexpected error in seeding:', err?.message || err);
  }
}

export async function cleanupSupabaseTest() {
  console.log('[Cleanup Supabase] Cleaning up test records...');
  try {
    // Delete test orders created during tests
    await supabase.from('orders').delete().ilike('id', 'ORD-E2E%');
    // Delete test meal kits created during tests
    await supabase
      .from('meal_kits')
      .delete()
      .or(
        'id.ilike.e2e-%,name.ilike.Kashmiri Rogan Josh%,name.ilike.Experimental Spicy Dish%,id.ilike.city-%,id.ilike.kit-test-%',
      );
    // Delete test chef submissions created during tests
    await supabase
      .from('chef_submissions')
      .delete()
      .or('id.ilike.e2e-%,name.ilike.Kashmiri Rogan Josh%,name.ilike.Experimental Spicy Dish%');
    console.log('[Cleanup Supabase] Done cleanup.');
  } catch (err: any) {
    console.warn('[Cleanup Supabase] Error during cleanup:', err?.message || err);
  }
}

if (require.main === module) {
  seedSupabaseTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
