'use client';

import { firebaseApp } from './config';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Initialize and export client-side instances of Firebase services
export const firestore: Firestore = getFirestore(firebaseApp);
export const auth: Auth = getAuth(firebaseApp);

// Re-export firebaseApp for convenience
export { firebaseApp };
