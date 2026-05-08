"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

type Density = 'compact' | 'comfortable' | 'spacious';

interface DensityContextType {
  density: Density;
  setDensity: (d: Density) => void;
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>('comfortable');

  useEffect(() => {
    const saved = localStorage.getItem('hz-density') as Density;
    if (saved && ['compact', 'comfortable', 'spacious'].includes(saved)) {
      setDensityState(saved);
    }
  }, []);

  const setDensity = (d: Density) => {
    setDensityState(d);
    localStorage.setItem('hz-density', d);
  };

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const context = useContext(DensityContext);
  if (!context) throw new Error('useDensity must be used within DensityProvider');
  return context;
}
