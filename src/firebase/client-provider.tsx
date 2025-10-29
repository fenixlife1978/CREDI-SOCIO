'use client';

import React, { type ReactNode, useEffect, useState, useMemo } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase'; // Use the new initializer
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // useMemo ensures Firebase is initialized only once.
  const { firebaseApp, firestore, auth } = useMemo(() => initializeFirebase(), []);

  useEffect(() => {
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
  }, [auth]); // Dependency array with auth instance

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
