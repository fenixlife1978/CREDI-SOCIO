// Barrel file for re-exporting Firebase modules.
// Do not initialize firebase here.

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';

// IMPORTANT: This function is being deprecated for direct imports from client.ts
import { firebaseApp } from './config';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * @deprecated Please import firebaseApp, firestore, and auth directly from @/firebase/client
 */
export function initializeFirebase() {
  return {
    firebaseApp,
    firestore: getFirestore(firebaseApp),
    auth: getAuth(firebaseApp),
  };
}
