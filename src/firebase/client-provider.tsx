'use client';

import React, { useMemo, type ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get memoized SDK instances
  const { firebaseApp, firestore, auth } = useMemo(() => initializeFirebase(), []);

  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsLoading(false);
      } else {
        // If not signed in, sign in anonymously
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
          setIsLoading(false); // Stop loading even if sign-in fails
        });
      }
    });

    return () => unsubscribe();
  }, [auth]);

  // While waiting for auth state, render nothing to prevent child components from running
  if (isLoading) {
    return null; 
  }

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
