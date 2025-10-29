'use client';

import React, { type ReactNode, useEffect, useState, useMemo } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { getAuth, onAuthStateChanged, signInAnonymously, type User, type Auth } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures Firebase app is initialized only once.
  const { firebaseApp, firestore } = useMemo(() => initializeFirebase(), []);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (firebaseApp) {
      const authInstance = getAuth(firebaseApp);
      setAuth(authInstance);

      const unsubscribe = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          setUser(user);
          setIsLoading(false);
        } else {
          // If no user, sign in anonymously.
          signInAnonymously(authInstance).catch((error) => {
            console.error("Anonymous sign-in failed:", error);
            setIsLoading(false); // Stop loading even if sign-in fails
          });
        }
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    }
  }, [firebaseApp]);


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
