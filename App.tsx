/**
 * Arbitrage Detector - App principal
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { setupNotifications, registerBackgroundTask } from './src/services/backgroundTask';

export default function App() {
  useEffect(() => {
    (async () => {
      // Configurar notificaciones
      await setupNotifications();

      // Registrar tarea de background (escaneo cada 1 min)
      await registerBackgroundTask(1);
    })();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}
