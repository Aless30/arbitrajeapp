/**
 * Servicio de Monitoreo en Segundo Plano
 * ========================================
 * Mantiene el escaneo de arbitraje activo incluso cuando
 * la app no está en primer plano.
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { ArbitrageEngine, ArbitrageOpportunity, DEFAULT_CONFIG } from './arbitrageEngine';
import { loadConfig } from '../utils/storage';

const BACKGROUND_FETCH_TASK = 'ARBITRAGE_SCAN_TASK';

// Definir la tarea de background
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const config = await loadConfig();
    const engine = new ArbitrageEngine(config || DEFAULT_CONFIG);
    await engine.initialize();

    const result = await engine.scan();
    await engine.close();

    if (result.profitable.length > 0) {
      const best = result.profitable[0];
      await sendNotification(best, result.profitable.length);
    }

    return result.profitable.length > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Error en background task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Enviar notificación push local
async function sendNotification(best: ArbitrageOpportunity, totalCount: number): Promise<void> {
  const typeLabel = best.type === 'inter_exchange' ? 'Inter-Exchange' :
                    best.type === 'triangular' ? 'Triangular' : 'Forex';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 ${totalCount} oportunidad${totalCount > 1 ? 'es' : ''} detectada${totalCount > 1 ? 's' : ''}`,
      body: `[${typeLabel}] ${best.pair}\nGanancia neta: $${best.netProfitUsd.toFixed(2)} (${best.netProfitPercent.toFixed(3)}%)\nScore: ${best.score.toFixed(0)}/100`,
      data: { opportunityId: best.id },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // Inmediato
  });
}

// Registrar la tarea de background
export async function registerBackgroundTask(intervalMinutes: number = 1): Promise<boolean> {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: intervalMinutes * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Background task registrado exitosamente');
    return true;
  } catch (error) {
    console.error('Error registrando background task:', error);
    return false;
  }
}

// Cancelar la tarea de background
export async function unregisterBackgroundTask(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
  } catch {}
}

// Verificar si la tarea está registrada
export async function isTaskRegistered(): Promise<boolean> {
  const status = await BackgroundFetch.getStatusAsync();
  return status === BackgroundFetch.BackgroundFetchStatus.Available;
}

// Configurar notificaciones
export async function setupNotifications(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Configurar canal de notificación en Android
  await Notifications.setNotificationChannelAsync('arbitrage-alerts', {
    name: 'Alertas de Arbitraje',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0066FF',
    sound: 'default',
  });

  return true;
}
