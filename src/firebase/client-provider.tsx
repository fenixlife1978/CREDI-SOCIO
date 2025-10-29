'use client';

import React, { type ReactNode, useEffect, useState, useMemo } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // useMemo ensures Firebase is initialized only once.
  const { firebaseApp, firestore, auth } = useMemo(() => initializeFirebase(), []);
  
  // We no longer need to manage user state here, as it will be handled by the onAuthStateChanged in the main Provider.
  // We can just pass the initialized services down.

  return (
    <FirebaseProvider
      firebaseApp={firebaseApp}
      firestore={firestore}
      auth={auth} // pass the auth instance
    >
      {children}
    </FirebaseProvider>
  );
}
