/**
 * Seed script for Firebase Auth / Firestore Emulator or Test environment.
 * Sets up known test accounts and customer records before E2E tests run.
 */

import { TEST_USERS } from '../fixtures/test-data';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAI_P1BlBGErbAFrhvXrS8CVA2wt3AI7CE',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'rasoi-genie.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'rasoi-genie',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'rasoi-genie.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '555230179053',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:555230179053:web:74f10eaf8aa79a0f74e6e4',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export async function seedFirebaseTest() {
  console.log('[Seed Firebase] Starting test data seeding...');

  if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR !== 'true' && !process.env.CI) {
    console.log('[Seed Firebase] Emulator not running, skipping remote Firestore seed in local dev.');
    return;
  }

  try {
    const seedPromise = (async () => {
      for (const user of Object.values(TEST_USERS)) {
        const userRef = doc(db, 'customers', user.uid);
        await setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            phoneNumber: user.phoneNumber || null,
            role: user.role,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
        console.log(`[Seed Firebase] Seeded customer profile: ${user.email} (${user.role})`);
      }
    })();

    // 4s timeout guard
    await Promise.race([
      seedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase seed timeout')), 4000)),
    ]);

    console.log('[Seed Firebase] Test users successfully seeded.');
  } catch (err: any) {
    console.warn('[Seed Firebase] Warning during seeding:', err?.message || err);
  }
}

export async function cleanupFirebaseTest() {
  console.log('[Cleanup Firebase] Cleaning up test orders...');
  try {
    // Clean up E2E generated test orders
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('isE2ETest', '==', true));
    const snapshot = await getDocs(q);
    for (const orderDoc of snapshot.docs) {
      await deleteDoc(orderDoc.ref);
    }
    console.log(`[Cleanup Firebase] Removed ${snapshot.docs.length} test orders.`);
  } catch (err: any) {
    console.warn('[Cleanup Firebase] Cleanup warning:', err?.message || err);
  }
}

if (require.main === module) {
  seedFirebaseTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
