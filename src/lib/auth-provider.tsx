'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// The initial PIN is hardcoded here for simplicity.
// In a real-world application, this could be fetched from a secure config.
const INITIAL_PIN = "2025"; 

interface AuthContextType {
  isAuthenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
  changePin: (newPin: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPin, setCurrentPin] = useState(INITIAL_PIN);

  const login = (pin: string) => {
    if (pin === currentPin) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const changePin = (newPin: string) => {
    setCurrentPin(newPin);
    // In a real app, you might want to persist this change securely.
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, changePin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
