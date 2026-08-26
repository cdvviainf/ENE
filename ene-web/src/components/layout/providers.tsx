'use client';
import React from 'react';
import { ActiveThemeProvider } from '../themes/active-theme';
import QueryProvider from './query-provider';
import { MenuAccesoProvider } from '@/contexts/menu-acceso-context';

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <ActiveThemeProvider initialTheme={activeThemeValue}>
      <QueryProvider>
        <MenuAccesoProvider>{children}</MenuAccesoProvider>
      </QueryProvider>
    </ActiveThemeProvider>
  );
}
