/**
 * Hook principal para gestionar el escaneo de arbitraje
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArbitrageEngine, ArbitrageOpportunity, ScanResult, EngineConfig, DEFAULT_CONFIG } from '../services/arbitrageEngine';
import { loadConfig, saveConfig, updateStats, AppStats, loadStats } from '../utils/storage';

interface ScannerState {
  isScanning: boolean;
  isInitialized: boolean;
  opportunities: ArbitrageOpportunity[];
  profitable: ArbitrageOpportunity[];
  lastScanTime: number;
  scanCount: number;
  stats: AppStats;
  error: string | null;
}

export function useArbitrageScanner(autoStart = true) {
  const engineRef = useRef<ArbitrageEngine | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [config, setConfig] = useState<EngineConfig>(DEFAULT_CONFIG);

  const [state, setState] = useState<ScannerState>({
    isScanning: false,
    isInitialized: false,
    opportunities: [],
    profitable: [],
    lastScanTime: 0,
    scanCount: 0,
    stats: {
      totalScans: 0,
      totalOpportunities: 0,
      totalProfitable: 0,
      bestScore: 0,
      bestProfitUsd: 0,
      lastScanTime: 0,
    },
    error: null,
  });

  // Inicializar
  useEffect(() => {
    (async () => {
      const savedConfig = await loadConfig();
      if (savedConfig) setConfig(savedConfig);
      const stats = await loadStats();
      setState(s => ({ ...s, stats }));

      const engine = new ArbitrageEngine(savedConfig || DEFAULT_CONFIG);
      await engine.initialize();
      engineRef.current = engine;
      setState(s => ({ ...s, isInitialized: true }));

      if (autoStart) {
        startScanning();
      }
    })();

    return () => {
      stopScanning();
      engineRef.current?.close();
    };
  }, []);

  // Ejecutar un solo escaneo
  const runScan = useCallback(async (): Promise<ScanResult | null> => {
    if (!engineRef.current) return null;

    setState(s => ({ ...s, isScanning: true, error: null }));

    try {
      const result = await engineRef.current.scan();

      const bestScore = result.profitable.length > 0
        ? Math.max(...result.profitable.map(o => o.score))
        : 0;
      const bestProfit = result.profitable.length > 0
        ? Math.max(...result.profitable.map(o => o.netProfitUsd))
        : 0;

      const stats = await updateStats(
        result.opportunities.length,
        result.profitable.length,
        bestScore,
        bestProfit
      );

      setState(s => ({
        ...s,
        isScanning: false,
        opportunities: result.opportunities,
        profitable: result.profitable,
        lastScanTime: result.scanTime,
        scanCount: s.scanCount + 1,
        stats,
      }));

      return result;
    } catch (error: any) {
      setState(s => ({
        ...s,
        isScanning: false,
        error: error.message || 'Error en escaneo',
      }));
      return null;
    }
  }, []);

  // Iniciar escaneo continuo
  const startScanning = useCallback(() => {
    if (intervalRef.current) return;

    // Escaneo inmediato
    runScan();

    // Repetir cada N segundos
    const interval = (config.investmentAmount > 0 ? 15 : 30) * 1000;
    intervalRef.current = setInterval(() => {
      runScan();
    }, interval);
  }, [runScan, config]);

  // Detener escaneo
  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(s => ({ ...s, isScanning: false }));
  }, []);

  // Actualizar configuración
  const updateConfig = useCallback(async (newConfig: Partial<EngineConfig>) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);
    await saveConfig(merged);
    engineRef.current?.updateConfig(merged);
  }, [config]);

  return {
    ...state,
    config,
    runScan,
    startScanning,
    stopScanning,
    updateConfig,
  };
}
