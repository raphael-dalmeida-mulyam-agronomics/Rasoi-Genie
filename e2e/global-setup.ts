import { seedFirebaseTest } from './scripts/seed-emulator';
import { seedSupabaseTest } from './scripts/seed-supabase-test';

export default async function globalSetup() {
  console.log('\n========================================');
  console.log('🚀 [Playwright E2E] Initializing Global Setup...');
  console.log('========================================\n');

  try {
    await seedFirebaseTest();
  } catch (err: any) {
    console.warn('[Global Setup] Firebase seed warning:', err?.message || err);
  }

  try {
    await seedSupabaseTest();
  } catch (err: any) {
    console.warn('[Global Setup] Supabase seed warning:', err?.message || err);
  }

  console.log('\n✅ [Playwright E2E] Test fixtures seeded successfully.\n');
}
