'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);
  
  const auth = useMemo(() => {
    if (firebaseServices) {
      const authInstance = getAuth(firebaseServices.firebaseApp);
      // Automatically sign in users anonymously if they are not logged in.
      onAuthStateChanged(authInstance, (user) => {
        if (!user) {
          signInAnonymously(authInstance).catch((error) => {
            console.error("Anonymous sign-in failed:", error);
          });
        }
      });
      return authInstance;
    }
    return null;
  }, [firebaseServices]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      firestore={firebaseServices.firestore}
      auth={auth}
    >
      {children}
    </FirebaseProvider>
  );
}
