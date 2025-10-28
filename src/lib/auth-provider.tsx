'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const CORRECT_PIN = '1111';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // En un entorno real, verificarías un token aquí.
    // Para esta demo, usamos sessionStorage.
    const unlocked = sessionStorage.getItem('isUnlocked') === 'true';
    setIsAuthenticated(unlocked);
  }, []);

  const login = (pin: string) => {
    if (pin === CORRECT_PIN) {
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

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
