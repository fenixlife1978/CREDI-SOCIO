'use client';

// Barrel file for re-exporting Firebase modules.
// This is the central point for Firebase initialization and service access.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

// Define the shape of the returned services object
interface FirebaseServices {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

/**
 * Initializes Firebase on the client side, ensuring it only happens once.
 * This is the single source of truth for getting Firebase service instances.
 * @returns An object containing the initialized Firebase App, Firestore, and Auth instances.
 */
export function initializeFirebase(): FirebaseServices {
  const firebaseApp = !getApps().length
    ? initializeApp(firebaseConfig)
    : getApp();

  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}


// Re-export hooks and utilities for components to use
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';
