"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: any | null; 
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const dbUser = await res.json();
        setUser(dbUser);
        return dbUser;
      } else if (res.status === 401) {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      await fetchProfile();
      setIsLoading(false);
    };

    initializeAuth();
  }, [fetchProfile]);

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      signOut,
      refreshProfile: fetchProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
