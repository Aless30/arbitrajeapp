/**
 * Motor de Detección de Arbitraje
 * ================================
 * Consulta APIs públicas de exchanges para detectar
 * diferencias de precio en tiempo real.
 */

// Configuración por defecto
const DEFAULT_CONFIG = {
  exchanges: ['binance', 'kraken', 'bybit', 'kucoin', 'gate'],
  pairs: [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT',
    'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT',
    'LINK/USDT', 'MATIC/USDT',
  ],
  minProfitPercent: 0.3,
  minProfitTriangular: 0.2,
  investmentAmount: 1000,
  tradingFeePercent: 0.1,
  slippagePercent: 0.05,
  scanInterval: 15,
};

// Fees de retiro estimados (en USD)
const WITHDRAWAL_FEES = {
  BTC: 15.0, ETH: 8.0, SOL: 0.5, XRP: 0.25,
  ADA: 0.5, DOGE: 2.0, AVAX: 0.5, DOT: 1.0,
  LINK: 2.0, MATIC: 0.5, USDT: 1.0,
};

// Tiempos de transferencia (minutos)
const TRANSFER_TIMES = {
  BTC: 30, ETH: 5, SOL: 1, XRP: 1,
  ADA: 3, DOGE: 10, AVAX: 2, DOT: 3,
  LINK: 5, MATIC: 5, USDT: 3,
};

// ═══ URLs de APIs públicas de exchanges ══════════════════════════════════════

const EXCHANGE_APIS = {
  binance: {
    ticker: (symbol) => `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${symbol.replace('/', '')}`,
    parse: (data) => ({ bid: parseFloat(data.bidPrice), ask: parseFloat(data.askPrice) }),
  },
  kraken: {
    ticker: (symbol) => {
      const map = {
        'BTC/USDT': 'XBTUSDT', 'ETH/USDT': 'ETHUSDT', 'SOL/USDT': 'SOLUSDT',
        'XRP/USDT': 'XRPUSDT', 'ADA/USDT': 'ADAUSDT', 'DOGE/USDT': 'DOGEUSDT',
        'AVAX/USDT': 'AVAXUSDT', 'DOT/USDT': 'DOTUSDT', 'LINK/USDT': 'LINKUSDT',
        'MATIC/USDT': 'MATICUSDT',
      };
      const pair = map[symbol] || symbol.replace('/', '');
      return `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
    },
    parse: (data) => {
      const key = Object.keys(data.result)[0];
      if (!key) return null;
      const r = data.result[key];
      return { bid: parseFloat(r.b[0]), ask: parseFloat(r.a[0]) };
    },
  },
  bybit: {
    ticker: (symbol) => `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol.replace('/', '')}`,
    parse: (data) => {
      const item = data?.result?.list?.[0];
      if (!item) return null;
      return { bid: parseFloat(item.bid1Price), ask: parseFloat(item.ask1Price) };
    },
  },
  kucoin: {
    ticker: (symbol) => `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${symbol.replace('/', '-')}`,
    parse: (data) => {
      const d = data?.data;
      if (!d) return null;
      return { bid: parseFloat(d.bestBid), ask: parseFloat(d.bestAsk) };
    },
  },
  gate: {
    ticker: (symbol) => `https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${symbol.replace('/', '_')}`,
    parse: (data) => {
      const item = Array.isArray(data) ? data[0] : null;
      if (!item) return null;
      return { bid: parseFloat(item.highest_bid), ask: parseFloat(item.lowest_ask) };
    },
  },
  okx: {
    ticker: (symbol) => `https://www.okx.com/api/v5/market/ticker?instId=${symbol.replace('/', '-')}`,
    parse: (data) => {
      const item = data?.data?.[0];
      if (!item) return null;
      return { bid: parseFloat(item.bidPx), ask: parseFloat(item.askPx) };
    },
  },
  mexc: {
    ticker: (symbol) => `https://api.mexc.com/api/v3/ticker/bookTicker?symbol=${symbol.replace('/', '')}`,
    parse: (data) => ({ bid: parseFloat(data.bidPrice), ask: parseFloat(data.askPrice) }),
  },
};

// ═══ MOTOR PRINCIPAL ═════════════════════════════════════════════════════════

class ArbitrageEngine {
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scanCount = 0;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Fetch con timeout
  async fetchWithTimeout(url, timeout = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  // Obtener precio de un par en un exchange
  async fetchPrice(exchangeName, pair) {
    const api = EXCHANGE_APIS[exchangeName];
    if (!api) return null;

    try {
      const url = api.ticker(pair);
      const data = await this.fetchWithTimeout(url);
      if (!data) return null;

      const parsed = api.parse(data);
      if (!parsed || !parsed.bid || !parsed.ask || parsed.bid <= 0 || parsed.ask <= 0) return null;

      return { exchange: exchangeName, pair, bid: parsed.bid, ask: parsed.ask };
    } catch {
      return null;
    }
  }

  // Obtener precios de un par en todos los exchanges
  async fetchAllPrices(pair) {
    const promises = this.config.exchanges.map(ex => this.fetchPrice(ex, pair));
    const results = await Promise.allSettled(promises);
    return results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
  }

  // Calcular rentabilidad neta
  calculateProfitability(pair, buyExchange, sellExchange, buyPrice, sellPrice, grossSpread) {
    const currency = pair.split('/')[0];
    const investment = this.config.investmentAmount;
    const cryptoAmount = investment / buyPrice;

    // Ganancia bruta
    const grossProfitUsd = (sellPrice - buyPrice) * cryptoAmount;

    // Costos
    const buyFee = investment * (this.config.tradingFeePercent / 100);
    const sellFee = (cryptoAmount * sellPrice) * (this.config.tradingFeePercent / 100);
    const tradingFees = buyFee + sellFee;

    const withdrawalFee = WITHDRAWAL_FEES[currency] || 1.0;
    const slippageCost = investment * (this.config.slippagePercent / 100) * 2;
    const transferTime = TRANSFER_TIMES[currency] || 5;
    const transferRisk = investment * (0.02 / 100) * transferTime;

    const totalCosts = tradingFees + withdrawalFee + slippageCost + transferRisk;
    const netProfit = grossProfitUsd - totalCosts;
    const netProfitPercent = (netProfit / investment) * 100;

    // Score
    let riskLevel;
    if (transferTime <= 2 && netProfitPercent > 0.5) riskLevel = 'bajo';
    else if (transferTime <= 5 && netProfitPercent > 0.3) riskLevel = 'medio';
    else riskLevel = 'alto';

    const profitScore = Math.min(netProfitPercent * 20, 60);
    const riskScore = riskLevel === 'bajo' ? 20 : riskLevel === 'medio' ? 10 : 0;
    const timeScore = transferTime <= 1 ? 20 : transferTime <= 3 ? 15 : transferTime <= 5 ? 10 : 5;
    const score = Math.min(Math.max(profitScore + riskScore + timeScore, 0), 100);

    return {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'inter_exchange',
      pair,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      grossProfitPercent: grossSpread,
      netProfitPercent: Math.round(netProfitPercent * 10000) / 10000,
      netProfitUsd: Math.round(netProfit * 100) / 100,
      investmentUsd: investment,
      tradingFees: Math.round(tradingFees * 100) / 100,
      withdrawalFee,
      slippageCost: Math.round(slippageCost * 100) / 100,
      transferRisk: Math.round(transferRisk * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
      riskLevel,
      score: Math.round(score * 10) / 10,
      transferTimeMin: transferTime,
      timestamp: Date.now(),
      description: `Comprar ${pair} en ${buyExchange} → Vender en ${sellExchange}`,
    };
  }

  // Escaneo completo
  async scan() {
    const startTime = Date.now();
    const allOpportunities = [];

    for (const pair of this.config.pairs) {
      try {
        const prices = await this.fetchAllPrices(pair);
        if (prices.length < 2) continue;

        for (let i = 0; i < prices.length; i++) {
          for (let j = 0; j < prices.length; j++) {
            if (i === j) continue;
            const buyFrom = prices[i];
            const sellTo = prices[j];

            if (sellTo.bid > buyFrom.ask) {
              const spread = ((sellTo.bid - buyFrom.ask) / buyFrom.ask) * 100;
              if (spread >= this.config.minProfitPercent) {
                const opp = this.calculateProfitability(
                  pair, buyFrom.exchange, sellTo.exchange,
                  buyFrom.ask, sellTo.bid, spread
                );
                allOpportunities.push(opp);
              }
            }
          }
        }
      } catch {
        // Continuar con el siguiente par
      }
    }

    // Ordenar por score
    allOpportunities.sort((a, b) => b.score - a.score);
    this.scanCount++;

    return {
      opportunities: allOpportunities,
      profitable: allOpportunities.filter(o => o.netProfitUsd > 0),
      scanTime: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
}
