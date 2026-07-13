/**
 * Almacenamiento local persistente
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EngineConfig, DEFAULT_CONFIG, ArbitrageOpportunity } from '../services/arbitrageEngine';

const KEYS = {
  CONFIG: '@arbitrage_config',
  HISTORY: '@arbitrage_history',
  STATS: '@arbitrage_stats',
};

// ─── CONFIGURACIÓN ──────────────────────────────────────────────────────────────

export async function saveConfig(config: Partial<EngineConfig>): Promise<void> {
  const merged = { ...DEFAULT_CONFIG, ...config };
  await AsyncStorage.setItem(KEYS.CONFIG, JSON.stringify(merged));
}

export async function loadConfig(): Promise<EngineConfig | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.CONFIG);
    if (data) return JSON.parse(data);
  } catch {}
  return null;
}

// ─── HISTORIAL ──────────────────────────────────────────────────────────────────

export async function saveOpportunity(opp: ArbitrageOpportunity): Promise<void> {
  try {
    const history = await loadHistory();
    history.unshift(opp);
    // Mantener solo las últimas 200
    const trimmed = history.slice(0, 200);
    await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(trimmed));
  } catch {}
}

export async function loadHistory(): Promise<ArbitrageOpportunity[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.HISTORY);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.HISTORY);
}

// ─── ESTADÍSTICAS ───────────────────────────────────────────────────────────────

export interface AppStats {
  totalScans: number;
  totalOpportunities: number;
  totalProfitable: number;
  bestScore: number;
  bestProfitUsd: number;
  lastScanTime: number;
}

export async function loadStats(): Promise<AppStats> {
  try {
    const data = await AsyncStorage.getItem(KEYS.STATS);
    if (data) return JSON.parse(data);
  } catch {}
  return {
    totalScans: 0,
    totalOpportunities: 0,
    totalProfitable: 0,
    bestScore: 0,
    bestProfitUsd: 0,
    lastScanTime: 0,
  };
}

export async function updateStats(
  scanned: number,
  profitable: number,
  bestScore: number,
  bestProfit: number
): Promise<AppStats> {
  const current = await loadStats();
  const updated: AppStats = {
    totalScans: current.totalScans + 1,
    totalOpportunities: current.totalOpportunities + scanned,
    totalProfitable: current.totalProfitable + profitable,
    bestScore: Math.max(current.bestScore, bestScore),
    bestProfitUsd: Math.max(current.bestProfitUsd, bestProfit),
    lastScanTime: Date.now(),
  };
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(updated));
  return updated;
}
