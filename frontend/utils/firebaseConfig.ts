import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore: getReactNativePersistence is available in React Native environment
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Helper to clean environment variables (removes accidental quotes, commas, or spaces)
const cleanEnvVar = (value: string | undefined) => {
  return value?.replace(/['",]/g, '').trim();
};

// Replace the values below with those from your Firebase console (Project Settings > Your apps)
const firebaseConfig = {
  // Fallback to check both common naming conventions (with and without FIREBASE_ prefix)
  apiKey: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_API_KEY),
  authDomain: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.EXPO_PUBLIC_AUTH_DOMAIN),
  projectId: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_PROJECT_ID),
  storageBucket: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_STORAGE_BUCKET),
  messagingSenderId: cleanEnvVar(
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.EXPO_PUBLIC_MESSAGERY_SENDER_ID,
  ),
  appId: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.EXPO_PUBLIC_APP_ID),
  measurementId: cleanEnvVar(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.EXPO_PUBLIC_MEASUREMENT_ID),
};

// Robust safety check for environment variables
const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value || value === 'undefined')
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error('🚨 Firebase configuration is incomplete!');
  console.error('Missing keys:', missingKeys);
  console.log("Check that your .env file contains variables starting with 'EXPO_PUBLIC_'.");
  console.log(
    'Available keys in process.env:',
    Object.keys(process.env).filter((k) => k.startsWith('EXPO_PUBLIC_')),
  );
  console.error('After fixing .env, you MUST restart with: npx expo start -c');
} else {
  console.log('✅ Firebase config loaded successfully');
}

// Firebase Initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth initialization with platform-specific persistence
// This allows the user to stay logged in after closing the app
const auth: Auth =
  Platform.OS === 'web'
    ? getAuth(app)
    : (() => {
        try {
          return initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
          });
        } catch (e) {
          return getAuth(app);
        }
      })();

// Firestore initialization (NoSQL database)
const db = getFirestore(app);

export { auth, db };
