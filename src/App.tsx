import React from 'react';
import { AppProvider } from './context/AppContext';
import AppShell from './layout/AppShell';

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
