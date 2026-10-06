import { cleanupFirebaseTest } from './scripts/seed-emulator';
import { cleanupSupabaseTest } from './scripts/seed-supabase-test';

export default async function globalTeardown() {
  console.log('\n========================================');
  console.log('🧹 [Playwright E2E] Running Global Teardown...');
  console.log('========================================\n');

  try {
    await cleanupFirebaseTest();
  } catch (err: any) {
    console.warn('[Global Teardown] Firebase cleanup warning:', err?.message || err);
  }

  try {
    await cleanupSupabaseTest();
  } catch (err: any) {
    console.warn('[Global Teardown] Supabase cleanup warning:', err?.message || err);
  }

  console.log('\n✨ [Playwright E2E] Teardown complete.\n');
}
