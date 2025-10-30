'use client';

import React, { type ReactNode, useEffect, useState, useMemo, createContext, useContext } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { getAuth, onAuthStateChanged, signInAnonymously, type User, type Auth } from 'firebase/auth';

const FirebaseLoadingContext = createContext<boolean>(true);

export const useFirebaseLoading = () => useContext(FirebaseLoadingContext);

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures Firebase app is initialized only once.
  const { firebaseApp, firestore, storage } = useMemo(() => initializeFirebase(), []);
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
    <FirebaseLoadingContext.Provider value={isLoading}>
      <FirebaseProvider
        firebaseApp={firebaseApp}
        firestore={firestore}
        auth={auth} 
        storage={storage}
      >
        {children}
      </FirebaseProvider>
    </FirebaseLoadingContext.Provider>
  );
}