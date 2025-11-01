'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const PIN_STORAGE_KEY = 'app-pin';
const DEFAULT_PIN = '1111';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
  changePin: (currentPin: string, newPin: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState(DEFAULT_PIN);

  useEffect(() => {
    const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
    if (storedPin) {
      setPin(storedPin);
    } else {
      localStorage.setItem(PIN_STORAGE_KEY, DEFAULT_PIN);
    }

    const unlocked = sessionStorage.getItem('isUnlocked') === 'true';
    setIsAuthenticated(unlocked);
  }, []);

  const login = (enteredPin: string) => {
    if (enteredPin === pin) {
      setIsAuthenticated(true);
      sessionStorage.setItem('isUnlocked', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isUnlocked');
  };

  const changePin = (currentPin: string, newPin: string) => {
    if (currentPin === pin) {
      localStorage.setItem(PIN_STORAGE_KEY, newPin);
      setPin(newPin);
      return true;
    }
    return false;
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
