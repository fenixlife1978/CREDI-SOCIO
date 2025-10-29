'use client';

import React, { useMemo, type ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  const auth = useMemo(() => {
    if (firebaseServices) {
      return getAuth(firebaseServices.firebaseApp);
    }
    return null;
  }, [firebaseServices]);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setIsLoading(false);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
          setIsLoading(false); // Stop loading even if sign-in fails
        });
      }
    });

    return () => unsubscribe();
  }, [auth]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

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
