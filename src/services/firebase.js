import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Firebase configuration - users will need to add their own config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and Auth
export const database = getDatabase(app);
export const auth = getAuth(app);

// Promise that resolves when user is authenticated
let authReady = null;

// Ensure user is authenticated before any database operations
export const ensureAuth = async () => {
  if (!authReady) {
    authReady = signInAnonymously(auth)
      .then(() => {
        console.log('Anonymous authentication successful');
      })
      .catch((error) => {
        console.error('Anonymous auth failed:', error);
        throw error;
      });
  }
  return authReady;
};
