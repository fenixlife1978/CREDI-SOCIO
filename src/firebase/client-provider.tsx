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
      const auth = getAuth(firebaseServices.firebaseApp);
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          signInAnonymously(auth);
        }
      });
      return auth;
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
