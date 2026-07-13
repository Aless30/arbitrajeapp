/**
 * Motor de Detección de Arbitraje
 * =================================
 * Versión para móvil del detector de arbitraje.
 * Utiliza la librería ccxt para conectar con exchanges.
 */

import ccxt from 'ccxt';

// ─── TIPOS ─────────────────────────────────────────────────────────────────────

export interface ArbitrageOpportunity {
  id: string;
  type: 'inter_exchange' | 'triangular' | 'forex';
  pair: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  grossProfitPercent: number;
  netProfitPercent: number;
  netProfitUsd: number;
  investmentUsd: number;
  tradingFees: number;
  withdrawalFee: number;
  slippageCost: number;
  transferRisk: number;
  totalCosts: number;
  riskLevel: 'bajo' | 'medio' | 'alto';
  score: number;
  transferTimeMin: number;
  timestamp: number;
  route?: string[];
  description: string;
}

export interface ScanResult {
  opportunities: ArbitrageOpportunity[];
  profitable: ArbitrageOpportunity[];
  scanTime: number;
  timestamp: number;
  exchangesScanned: number;
  pairsScanned: number;
}

export interface EngineConfig {
  exchanges: string[];
  pairs: string[];
  triangularExchange: string;
  triangularBaseCurrencies: string[];
  minProfitPercent: number;
  minProfitTriangular: number;
  investmentAmount: number;
  tradingFeePercent: number;
  slippagePercent: number;
}

// ─── CONFIGURACIÓN POR DEFECTO ─────────────────────────────────────────────────

export const DEFAULT_CONFIG: EngineConfig = {
  exchanges: ['binance', 'kraken', 'bybit', 'kucoin', 'gateio'],
  pairs: [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT',
    'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT',
    'LINK/USDT', 'MATIC/USDT',
  ],
  triangularExchange: 'binance',
  triangularBaseCurrencies: ['USDT', 'BTC', 'ETH'],
  minProfitPercent: 0.3,
  minProfitTriangular: 0.2,
  investmentAmount: 1000,
  tradingFeePercent: 0.1,
  slippagePercent: 0.05,
};

// Fees de retiro estimados (en unidades de la moneda)
const WITHDRAWAL_FEES: Record<string, number> = {
  BTC: 0.0005,
  ETH: 0.005,
  SOL: 0.01,
  XRP: 0.25,
  ADA: 1.0,
  DOGE: 5.0,
  AVAX: 0.01,
  DOT: 0.1,
  LINK: 0.3,
  MATIC: 0.1,
  USDT: 1.0,
};

// Tiempos de transferencia estimados (minutos)
const TRANSFER_TIMES: Record<string, number> = {
  BTC: 30,
  ETH: 5,
  SOL: 1,
  XRP: 1,
  ADA: 3,
  DOGE: 10,
  AVAX: 2,
  DOT: 3,
  LINK: 5,
  MATIC: 5,
  USDT: 3,
};

// ─── CLASE PRINCIPAL ────────────────────────────────────────────────────────────

export class ArbitrageEngine {
  private config: EngineConfig;
  private exchanges: Map<string, ccxt.Exchange> = new Map();
  private isRunning = false;
  private scanCount = 0;

  constructor(config?: Partial<EngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Inicializa conexiones a exchanges
  async initialize(): Promise<void> {
    const exchangeClasses: Record<string, new (params?: any) => ccxt.Exchange> = {
      binance: ccxt.binance,
      kraken: ccxt.kraken,
      bybit: ccxt.bybit,
      kucoin: ccxt.kucoin,
      gateio: ccxt.gateio,
      okx: ccxt.okx,
      huobi: ccxt.huobi,
      mexc: ccxt.mexc,
    };

    for (const name of this.config.exchanges) {
      const ExchangeClass = exchangeClasses[name.toLowerCase()];
      if (ExchangeClass) {
        try {
          const exchange = new ExchangeClass({
            enableRateLimit: true,
            timeout: 10000,
          });
          this.exchanges.set(name.toLowerCase(), exchange);
        } catch (e) {
          console.warn(`No se pudo inicializar ${name}:`, e);
        }
      }
    }
  }

  // Cierra conexiones
  async close(): Promise<void> {
    this.isRunning = false;
    for (const exchange of this.exchanges.values()) {
      try {
        await exchange.close?.();
      } catch {}
    }
    this.exchanges.clear();
  }

  updateConfig(newConfig: Partial<EngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): EngineConfig {
    return { ...this.config };
  }

  // ─── ESCANEO PRINCIPAL ──────────────────────────────────────────────────────

  async scan(): Promise<ScanResult> {
    const startTime = Date.now();
    const allOpportunities: ArbitrageOpportunity[] = [];

    try {
      // 1. Escaneo inter-exchange
      const interExchangeOpps = await this.scanInterExchange();
      allOpportunities.push(...interExchangeOpps);

      // 2. Escaneo triangular
      const triangularOpps = await this.scanTriangular();
      allOpportunities.push(...triangularOpps);
    } catch (error) {
      console.error('Error en escaneo:', error);
    }

    // Ordenar por score
    allOpportunities.sort((a, b) => b.score - a.score);

    const profitable = allOpportunities.filter(o => o.netProfitPercent > 0);
    this.scanCount++;

    return {
      opportunities: allOpportunities,
      profitable,
      scanTime: Date.now() - startTime,
      timestamp: Date.now(),
      exchangesScanned: this.exchanges.size,
      pairsScanned: this.config.pairs.length,
    };
  }

  // ─── ARBITRAJE INTER-EXCHANGE ───────────────────────────────────────────────

  private async scanInterExchange(): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const pair of this.config.pairs) {
      try {
        const prices = await this.fetchPricesForPair(pair);
        if (prices.length < 2) continue;

        for (let i = 0; i < prices.length; i++) {
          for (let j = 0; j < prices.length; j++) {
            if (i === j) continue;

            const buyFrom = prices[i];
            const sellTo = prices[j];

            if (sellTo.bid > buyFrom.ask) {
              const spreadPercent = ((sellTo.bid - buyFrom.ask) / buyFrom.ask) * 100;

              if (spreadPercent >= this.config.minProfitPercent) {
                const report = this.calculateProfitability(
                  pair,
                  buyFrom.exchange,
                  sellTo.exchange,
                  buyFrom.ask,
                  sellTo.bid,
                  spreadPercent
                );
                opportunities.push(report);
              }
            }
          }
        }
      } catch (error) {
        // Silenciar errores por par individual
      }
    }

    return opportunities;
  }

  // ─── ARBITRAJE TRIANGULAR ───────────────────────────────────────────────────

  private async scanTriangular(): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    const exchangeName = this.config.triangularExchange;
    const exchange = this.exchanges.get(exchangeName);

    if (!exchange) return [];

    try {
      await exchange.loadMarkets();
      const markets = exchange.markets;
      const pairSet = new Set(Object.keys(markets).filter(s =>
        markets[s]?.active && markets[s]?.spot && s.includes('/')
      ));

      // Obtener tickers para pares con USDT, BTC, ETH
      const relevantPairs = Array.from(pairSet).filter(p => {
        const [base, quote] = p.split('/');
        return this.config.triangularBaseCurrencies.includes(quote) ||
               this.config.triangularBaseCurrencies.includes(base);
      }).slice(0, 50); // Limitar para no sobrecargar

      let tickers: Record<string, ccxt.Ticker> = {};
      try {
        tickers = await exchange.fetchTickers(relevantPairs);
      } catch {
        return [];
      }

      // Buscar rutas triangulares
      for (const baseCurrency of this.config.triangularBaseCurrencies) {
        const connected: string[] = [];

        for (const symbol of pairSet) {
          const [base, quote] = symbol.split('/');
          if (quote === baseCurrency) connected.push(base);
        }

        for (let i = 0; i < connected.length && i < 20; i++) {
          for (let j = i + 1; j < connected.length && j < 20; j++) {
            const mid = connected[i];
            const end = connected[j];

            // Verificar ruta: base -> mid -> end -> base
            const pair1 = `${mid}/${baseCurrency}`;
            const pair2 = `${end}/${mid}`;
            const pair3 = `${end}/${baseCurrency}`;

            if (!pairSet.has(pair1) || !pairSet.has(pair3)) continue;
            if (!pairSet.has(pair2) && !pairSet.has(`${mid}/${end}`)) continue;

            const t1 = tickers[pair1];
            const t3 = tickers[pair3];
            if (!t1?.ask || !t3?.bid) continue;

            const hasPair2Direct = pairSet.has(pair2);
            const t2 = hasPair2Direct ? tickers[pair2] : tickers[`${mid}/${end}`];
            if (!t2?.ask && !t2?.bid) continue;

            // Simular: invest USDT -> buy mid -> buy/sell end -> sell end for USDT
            let amount = this.config.investmentAmount;

            // Paso 1: Comprar mid con base
            amount = amount / t1.ask!;

            // Paso 2: mid -> end
            if (hasPair2Direct) {
              amount = amount / (t2.ask || t2.bid!);
            } else {
              amount = amount * (t2.bid || t2.ask!);
            }

            // Paso 3: Vender end por base
            amount = amount * t3.bid!;

            const profitPercent = ((amount - this.config.investmentAmount) / this.config.investmentAmount) * 100;

            if (profitPercent >= this.config.minProfitTriangular) {
              const profitUsd = amount - this.config.investmentAmount;

              // Costos triangulares (3 trades, sin retiro)
              const tradingFees = this.config.investmentAmount * (this.config.tradingFeePercent / 100) * 3;
              const slippage = this.config.investmentAmount * (this.config.slippagePercent / 100) * 3;
              const totalCosts = tradingFees + slippage;
              const netProfit = profitUsd - totalCosts;
              const netProfitPercent = (netProfit / this.config.investmentAmount) * 100;

              const riskLevel = netProfitPercent > 0.2 ? 'bajo' : 'medio';
              const score = Math.min(
                (netProfitPercent > 0 ? netProfitPercent * 20 : 0) +
                (riskLevel === 'bajo' ? 20 : 10) + 20, // +20 por transferencia instantánea
                100
              );

              opportunities.push({
                id: `tri_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                type: 'triangular',
                pair: `${baseCurrency}→${mid}→${end}→${baseCurrency}`,
                buyExchange: exchangeName,
                sellExchange: exchangeName,
                buyPrice: t1.ask!,
                sellPrice: t3.bid!,
                grossProfitPercent: profitPercent,
                netProfitPercent,
                netProfitUsd: netProfit,
                investmentUsd: this.config.investmentAmount,
                tradingFees,
                withdrawalFee: 0,
                slippageCost: slippage,
                transferRisk: 0,
                totalCosts,
                riskLevel,
                score,
                transferTimeMin: 0,
                timestamp: Date.now(),
                route: [baseCurrency, mid, end, baseCurrency],
                description: `Triangular en ${exchangeName}: ${baseCurrency}→${mid}→${end}→${baseCurrency}`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error en escaneo triangular:', error);
    }

    return opportunities.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  private async fetchPricesForPair(pair: string): Promise<Array<{ exchange: string; bid: number; ask: number }>> {
    const results: Array<{ exchange: string; bid: number; ask: number }> = [];

    const promises = Array.from(this.exchanges.entries()).map(async ([name, exchange]) => {
      try {
        const ticker = await exchange.fetchTicker(pair);
        if (ticker?.bid && ticker?.ask) {
          return { exchange: name, bid: ticker.bid, ask: ticker.ask };
        }
      } catch {}
      return null;
    });

    const responses = await Promise.allSettled(promises);
    for (const r of responses) {
      if (r.status === 'fulfilled' && r.value) {
        results.push(r.value);
      }
    }

    return results;
  }

  private calculateProfitability(
    pair: string,
    buyExchange: string,
    sellExchange: string,
    buyPrice: number,
    sellPrice: number,
    grossSpread: number
  ): ArbitrageOpportunity {
    const currency = pair.split('/')[0];
    const investment = this.config.investmentAmount;
    const cryptoAmount = investment / buyPrice;

    // Ganancia bruta
    const grossProfitUsd = (sellPrice - buyPrice) * cryptoAmount;

    // Costos
    const buyFee = investment * (this.config.tradingFeePercent / 100);
    const sellFee = (cryptoAmount * sellPrice) * (this.config.tradingFeePercent / 100);
    const tradingFees = buyFee + sellFee;

    const withdrawalFeeAmount = WITHDRAWAL_FEES[currency] || 0.5;
    const withdrawalFee = withdrawalFeeAmount * buyPrice;

    const slippageCost = investment * (this.config.slippagePercent / 100) * 2;

    const transferTime = TRANSFER_TIMES[currency] || 5;
    const transferRisk = investment * (0.02 / 100) * transferTime;

    const totalCosts = tradingFees + withdrawalFee + slippageCost + transferRisk;
    const netProfit = grossProfitUsd - totalCosts;
    const netProfitPercent = (netProfit / investment) * 100;

    // Evaluación
    let riskLevel: 'bajo' | 'medio' | 'alto';
    if (transferTime <= 2 && netProfitPercent > 0.5) riskLevel = 'bajo';
    else if (transferTime <= 5 && netProfitPercent > 0.3) riskLevel = 'medio';
    else riskLevel = 'alto';

    const profitScore = Math.min(netProfitPercent * 20, 60);
    const riskScore = riskLevel === 'bajo' ? 20 : riskLevel === 'medio' ? 10 : 0;
    const timeScore = transferTime <= 1 ? 20 : transferTime <= 3 ? 15 : transferTime <= 5 ? 10 : 5;
    const score = Math.min(profitScore + riskScore + timeScore, 100);

    return {
      id: `ie_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'inter_exchange',
      pair,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      grossProfitPercent: grossSpread,
      netProfitPercent,
      netProfitUsd: netProfit,
      investmentUsd: investment,
      tradingFees,
      withdrawalFee,
      slippageCost,
      transferRisk,
      totalCosts,
      riskLevel,
      score,
      transferTimeMin: transferTime,
      timestamp: Date.now(),
      description: `Comprar ${pair} en ${buyExchange} → Vender en ${sellExchange}`,
    };
  }
}
