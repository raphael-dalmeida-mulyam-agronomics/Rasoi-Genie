/**
 * Seed script for Supabase test database.
 * Seeds:
 * 1. Seeded user profiles in user_profiles
 * 2. Chef profile in chef_profiles for chef test user
 * 3. Seeded meal kits in meal_kits table with is_published: true
 * 4. Wallets for referrer & referee in wallets table
 * 5. Pending chef submission in chef_submissions
 */

import { TEST_USERS, TEST_MEAL_KITS, TEST_REFERRAL } from '../fixtures/test-data';
import { testSupabase as supabase } from '../fixtures/test-helpers';

export async function seedSupabaseTest() {
  console.log('[Seed Supabase] Starting Supabase test data seeding...');

  try {
    // 1. Seed user profiles
    for (const user of Object.values(TEST_USERS)) {
      const { error: userErr } = await supabase.from('user_profiles').upsert(
        {
          uid: user.uid,
          email: user.email,
          display_name: user.displayName,
          phone_number: user.phoneNumber,
          role: user.role,
          is_onboarded: true,
          preferences: {
            dietTypes: ['veg'],
            allergies: [],
            spiceTolerance: 'Medium',
            preferredCuisines: ['North Indian', 'South Indian'],
            state: 'Maharashtra',
            city: 'Pune',
            subRegion: 'pune-koregaon-park',
            regionHub: 'West',
            currentCity: 'Pune',
            isOnboarded: true,
          },
          addresses: [
            {
              id: 'addr-e2e-1',
              name: user.displayName,
              phone: user.phoneNumber || '+919876543210',
              flatAndStreet: 'Flat 402, Sunshine Heights',
              areaAndLandmark: 'Koregaon Park',
              city: 'Pune',
              pincode: '411001',
              tag: 'Home',
              isDefault: true,
            },
          ],
          preferred_payment_method: 'UPI',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'uid' },
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
        approved_at: new Date().toISOString(),
      },
      { onConflict: 'uid' },
    );
    if (chefErr) {
      console.warn('[Seed Supabase] Warning upserting chef profile:', chefErr.message);
    }

    // 3. Seed meal kits in meal_kits table with is_published: true
    for (const kit of TEST_MEAL_KITS) {
      const { error: kitErr } = await supabase.from('meal_kits').upsert(
        {
          id: kit.id,
          name: kit.name,
          tagline: kit.tagline,
          description: kit.description,
          price: kit.price,
          original_price: kit.price,
          cuisine: kit.cuisine,
          region: kit.availableRegions?.[0] || 'North',
          category: kit.dishCategory,
          diet_type: kit.diet,
          spice_level: kit.spiceLevel,
          prep_time_minutes: (kit.prepTimeMinutes || 10) + (kit.cookTimeMinutes || 20),
          servings: kit.servings,
          image_url: kit.heroImage,
          is_published: true,
          stock_status: kit.isOutOfStock ? 'out_of_stock' : 'in_stock',
          ingredients: [
            { name: 'Fresh Ingredients', quantity: '1 pack' },
            { name: 'Signature Spices', quantity: '2 sachets' },
          ],
          instructions: [
            { step: 1, title: 'Prep', instruction: 'Prep ingredients according to package' },
            { step: 2, title: 'Cook', instruction: 'Simmer and enjoy fresh' },
          ],
          nutrition: {
            calories: 450,
            tags: kit.tags,
            is_trending: kit.isTrending,
            available_regions: kit.availableRegions,
          },
          masala_sachets: ['Aroma Sachet', 'Base Gravy Premix'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );
      if (kitErr) {
        console.warn(`[Seed Supabase] Warning upserting kit ${kit.id}:`, kitErr.message);
      }
    }

    // 4. Seed referrer wallet balance
    const { error: walletErr } = await supabase.from('wallets').upsert(
      {
        user_id: TEST_USERS.referrer.uid,
        available_balance: 500,
        currency: 'INR',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (walletErr) {
      console.warn('[Seed Supabase] Warning upserting wallet:', walletErr.message);
    }

    // 5. Seed a pending chef submission for admin review
    const { error: subErr } = await supabase.from('chef_submissions').upsert(
      {
        id: 'e2e-submission-shahi-paneer',
        slug: 'royal-shahi-paneer-special',
        name: 'Royal Shahi Paneer Special',
        tagline: 'Creamy cashew and saffron royal curry',
        description:
          'Tender cottage cheese cooked in a rich, sweet and savory gravy of cashews, almonds and aromatic spices.',
        diet: 'veg',
        cuisine: 'North Indian',
        dish_category: 'Curries & Gravies',
        spice_level: 'Mild',
        servings: 2,
        prep_time_minutes: 15,
        cook_time_minutes: 20,
        ingredients: [
          { name: 'Paneer Cubes', quantity: '250g' },
          { name: 'Cashew Saffron Paste', quantity: '100g' },
        ],
        recipe_steps: [
          { step_number: 1, title: 'Saute', instruction: 'Heat ghee and saute whole spices' },
        ],
        chef_id: TEST_USERS.chef.uid,
        chef_name: TEST_USERS.chef.displayName,
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
    await supabase.from('orders').delete().ilike('id', 'ORD%');
    // Delete test meal kits created during tests
    await supabase
      .from('meal_kits')
      .delete()
      .or('name.ilike.Kashmiri Rogan Josh%,name.ilike.Experimental Spicy Dish%');
    // Delete test chef submissions created during tests
    await supabase
      .from('chef_submissions')
      .delete()
      .or('name.ilike.Kashmiri Rogan Josh%,name.ilike.Experimental Spicy Dish%');
    console.log('[Cleanup Supabase] Done cleanup.');
  } catch (err: any) {
    console.warn('[Cleanup Supabase] Error during cleanup:', err?.message || err);
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  seedSupabaseTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
