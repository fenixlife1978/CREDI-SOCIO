'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * A client-side component that initializes Firebase and provides it to its children.
 * This ensures that Firebase is initialized only once on the client.
 * It does NOT handle authentication state, which is managed separately.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures Firebase app and services are initialized only once.
  const { firebaseApp, firestore, auth } = useMemo(() => {
    const services = initializeFirebase();
    return {
      firebaseApp: services.firebaseApp,
      firestore: services.firestore,
      auth: services.auth,
    };
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      firestore={firestore}
      auth={auth}
    >
      {children}
    </FirebaseProvider>
  );
}

// We no longer manage loading state here, so the context is removed.
export const useFirebaseLoading = () => false;
