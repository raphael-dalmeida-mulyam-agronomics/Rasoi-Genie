import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  // @ts-ignore - getReactNativePersistence is exported by @firebase/auth in React Native
  getReactNativePersistence,
  Auth,
  GoogleAuthProvider,
} from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    process.env.EXPO_FIREBASE_API_KEY ||
    'AIzaSyAI_P1BlBGErbAFrhvXrS8CVA2wt3AI7CE',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'rasoi-genie.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'rasoi-genie',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'rasoi-genie.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '555230179053',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:555230179053:web:74f10eaf8aa79a0f74e6e4',
};

// Initialize Firebase App singleton safely
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

let authInstance: Auth;
if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    const persistence =
      typeof getReactNativePersistence === 'function'
        ? getReactNativePersistence(AsyncStorage)
        : undefined;

    authInstance = persistence ? initializeAuth(app, { persistence }) : getAuth(app);
  } catch {
    // Graceful fallback if already initialized (e.g. during Fast Refresh / HMR)
    authInstance = getAuth(app);
  }
}

export const auth: Auth = authInstance;
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
