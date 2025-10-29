'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

// Safe initialize on the client
const firebaseApp: FirebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

// Initialize and export client-side instances of Firebase services
const firestore: Firestore = getFirestore(firebaseApp);
const auth: Auth = getAuth(firebaseApp);

// Re-export for convenience
export { firebaseApp, firestore, auth };
