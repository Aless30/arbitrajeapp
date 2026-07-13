/**
 * Calculadora de Arbitraje ARS
 * Comisiones automaticas por plataforma
 */

// ═══ COMISIONES AUTOMATICAS ══════════════════════════
// Fuente: paginas oficiales de cada exchange (julio 2024)

const PLATFORM_FEES = {
  binance_p2p:   { name: 'Binance P2P',   maker: 0, taker: 0, spread: 0.3, note: 'Sin comision maker/taker, spread ~0.3%' },
  okx_p2p:       { name: 'OKX P2P',       maker: 0, taker: 0, spread: 0.3, note: 'Sin comision, spread ~0.3%' },
  bybit_p2p:     { name: 'Bybit P2P',     maker: 0, taker: 0, spread: 0.4, note: 'Sin comision, spread ~0.4%' },
  kucoin_p2p:    { name: 'KuCoin P2P',    maker: 0, taker: 0, spread: 0.5, note: 'Sin comision, spread ~0.5%' },
  bitget_p2p:    { name: 'Bitget P2P',    maker: 0, taker: 0, spread: 0.4, note: 'Sin comision, spread ~0.4%' },
  lemon:         { name: 'Lemon Cash',    maker: 0, taker: 0, spread: 1.5, note: 'Spread incluido en precio ~1.5%' },
  belo:          { name: 'Belo',          maker: 0, taker: 0, spread: 1.2, note: 'Spread incluido ~1.2%' },
  buenbit:       { name: 'Buenbit',       maker: 0.5, taker: 0.5, spread: 0.8, note: '0.5% comision + spread ~0.8%' },
  ripio:         { name: 'Ripio',         maker: 0, taker: 0, spread: 2.0, note: 'Spread incluido ~2%' },
  fiwind:        { name: 'Fiwind',        maker: 0, taker: 0, spread: 0.8, note: 'Spread ~0.8%' },
  tiendacrypto:  { name: 'TiendaCrypto',  maker: 0, taker: 0.6, spread: 0.5, note: '0.6% + spread ~0.5%' },
};

// Fees de retiro por red (en USDT equivalente)
const NETWORK_FEES = {
  trc20:    { fee: 1, name: 'TRC20 (Tron)' },
  bep20:    { fee: 0.3, name: 'BEP20 (BSC)' },
  polygon:  { fee: 0.1, name: 'Polygon' },
  solana:   { fee: 0.1, name: 'Solana' },
  ton:      { fee: 0.1, name: 'TON' },
  arbitrum: { fee: 0.5, name: 'Arbitrum' },
  erc20:    { fee: 15, name: 'ERC20 (Ethereum)' },
};

let calcHistory = [];

// ═══ INIT ════════════════════════════════════════════

(function init() {
  document.getElementById('includeRebuy').addEventListener('change', function() {
    document.getElementById('rebuySection').style.display = this.checked ? 'block' : 'none';
  });
  try {
    const saved = localStorage.getItem('arb_calc_history');
    if (saved) calcHistory = JSON.parse(saved);
    renderHistory();
  } catch {}
  onPlatformChange();
  onNetworkChange();
})();

// ═══ AUTO-FILL FEES ══════════════════════════════════

function onPlatformChange() {
  showFeeInfo('buyPlatform', 'buyFeeInfo');
  showFeeInfo('sellPlatform', 'sellFeeInfo');
  showFeeInfo('rebuyPlatform', 'rebuyFeeInfo');
}

function showFeeInfo(selectId, infoId) {
  const el = document.getElementById(infoId);
  if (!el) return;
  const platform = document.getElementById(selectId).value;
  const fees = PLATFORM_FEES[platform];
  if (!fees) { el.innerHTML = ''; return; }

  const totalFee = fees.maker + fees.taker + fees.spread;
  el.innerHTML = `<span class="fee-tag">${totalFee.toFixed(1)}% total</span> ${fees.note}`;
}

function onNetworkChange() {
  const network = document.getElementById('network').value;
  const info = NETWORK_FEES[network];
  if (info) {
    document.getElementById('withdrawFee').value = info.fee;
  }
}

function getPlatformTotalFee(platformId) {
  const p = PLATFORM_FEES[platformId];
  if (!p) return 0;
  return p.maker + p.taker + p.spread;
}

// ═══ CALCULO ═════════════════════════════════════════

function calculate() {
  const capital = parseFloat(document.getElementById('capital').value) || 0;
  const buyPrice = parseFloat(document.getElementById('buyPrice').value) || 0;
  const sellPrice = parseFloat(document.getElementById('sellPrice').value) || 0;
  const withdrawFee = parseFloat(document.getElementById('withdrawFee').value) || 0;
  const includeRebuy = document.getElementById('includeRebuy').checked;
  const rebuyPrice = parseFloat(document.getElementById('rebuyPrice').value) || 0;

  const buyPlatform = document.getElementById('buyPlatform').value;
  const sellPlatform = document.getElementById('sellPlatform').value;
  const rebuyPlatform = document.getElementById('rebuyPlatform').value;

  if (!capital || !buyPrice || !sellPrice) {
    alert('Completa: Capital, Precio compra y Precio venta');
    return;
  }

  // Fees automaticas
  const buyFeeTotal = getPlatformTotalFee(buyPlatform);
  const sellFeeTotal = getPlatformTotalFee(sellPlatform);
  const rebuyFeeTotal = getPlatformTotalFee(rebuyPlatform);

  // ═══ PASO 1: COMPRA ═══
  const buyFeeCost = capital * (buyFeeTotal / 100);
  const arsNeto = capital - buyFeeCost;
  const cryptoBought = arsNeto / buyPrice;

  // ═══ PASO 2: ENVIO ═══
  const cryptoAfterSend = cryptoBought - withdrawFee;
  const sendCostArs = withdrawFee * buyPrice;

  // ═══ PASO 3: VENTA ═══
  const grossSell = cryptoAfterSend * sellPrice;
  const sellFeeCost = grossSell * (sellFeeTotal / 100);
  const netSell = grossSell - sellFeeCost;

  const steps = [];
  steps.push({
    n: 1, label: 'Compra',
    val: `${cryptoBought.toFixed(2)} USDT`,
    sub: `${pName(buyPlatform)} · $${fmt(buyPrice)}/u`,
    cost: `-$${fmt(buyFeeCost)} (${buyFeeTotal}%)`
  });
  steps.push({
    n: 2, label: 'Envio',
    val: `${cryptoAfterSend.toFixed(2)} USDT`,
    sub: `${NETWORK_FEES[document.getElementById('network').value]?.name || 'Red'}`,
    cost: `-${withdrawFee} USDT`
  });
  steps.push({
    n: 3, label: 'Venta',
    val: `$${fmt(netSell)} ARS`,
    sub: `${pName(sellPlatform)} · $${fmt(sellPrice)}/u`,
    cost: `-$${fmt(sellFeeCost)} (${sellFeeTotal}%)`
  });

  let netProfit, totalCosts;
  let cryptoEnd = 0, cryptoDiff = 0;

  if (includeRebuy && rebuyPrice > 0) {
    // ═══ PASO 4: RECOMPRA ═══
    const rebuyFeeCost = netSell * (rebuyFeeTotal / 100);
    const arsForRebuy = netSell - rebuyFeeCost;
    const cryptoRebought = arsForRebuy / rebuyPrice;

    // ═══ PASO 5: RETORNO ═══
    const cryptoFinal = cryptoRebought - withdrawFee;
    const returnCostArs = withdrawFee * rebuyPrice;

    steps.push({
      n: 4, label: 'Recompra',
      val: `${cryptoRebought.toFixed(2)} USDT`,
      sub: `${pName(rebuyPlatform)} · $${fmt(rebuyPrice)}/u`,
      cost: `-$${fmt(rebuyFeeCost)} (${rebuyFeeTotal}%)`
    });
    steps.push({
      n: 5, label: 'Retorno',
      val: `${cryptoFinal.toFixed(2)} USDT`,
      sub: `De vuelta en ${pName(buyPlatform)}`,
      cost: `-${withdrawFee} USDT`
    });

    cryptoEnd = cryptoFinal;
    cryptoDiff = cryptoFinal - cryptoBought;
    const finalValueArs = cryptoFinal * buyPrice;
    netProfit = finalValueArs - capital;
    totalCosts = buyFeeCost + sendCostArs + sellFeeCost + rebuyFeeCost + returnCostArs;

    showResults(netProfit, (netProfit / capital) * 100, steps, {
      capital, buyFeeCost, sendCostArs, sellFeeCost,
      rebuyFeeCost, returnCostArs, totalCosts,
      cryptoStart: cryptoBought, cryptoEnd, cryptoDiff,
      includeRebuy: true
    });
  } else {
    netProfit = netSell - capital;
    totalCosts = buyFeeCost + sendCostArs + sellFeeCost;

    showResults(netProfit, (netProfit / capital) * 100, steps, {
      capital, buyFeeCost, sendCostArs, sellFeeCost,
      rebuyFeeCost: 0, returnCostArs: 0, totalCosts,
      includeRebuy: false
    });
  }

  saveToHistory(buyPlatform, sellPlatform, capital, netProfit, (netProfit / capital) * 100);
}

// ═══ RESULTADOS ══════════════════════════════════════

function showResults(netProfit, percent, steps, data) {
  document.getElementById('resultsSection').style.display = 'block';
  setTimeout(() => document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' }), 100);

  const pos = netProfit >= 0;
  const color = pos ? 'var(--success)' : 'var(--danger)';
  const cls = pos ? 'positive' : 'negative';

  document.getElementById('resultSummary').className = `result-summary ${cls}`;
  document.getElementById('resultMain').innerHTML = `<span style="color:${color}">${pos ? '+' : '-'}$${fmt(Math.abs(netProfit))} ARS</span>`;
  document.getElementById('resultPercent').innerHTML = `<span style="color:${color}">${pos ? '+' : ''}${percent.toFixed(2)}%</span>`;

  // Circuit
  document.getElementById('circuit').innerHTML = steps.map(s => `
    <div class="circuit-step">
      <div class="step-num">${s.n}</div>
      <div class="step-info">
        <div class="step-value">${s.label}: ${s.val}</div>
        <div class="step-detail">${s.sub}</div>
      </div>
      <div class="step-amount color-red">${s.cost}</div>
    </div>`).join('');

  // Breakdown
  let h = `<div class="breakdown-title">Costos</div>`;
  h += bR('Comision compra', `-$${fmt(data.buyFeeCost)}`);
  h += bR('Fee envio', `-$${fmt(data.sendCostArs)}`);
  h += bR('Comision venta', `-$${fmt(data.sellFeeCost)}`);
  if (data.includeRebuy) {
    h += bR('Comision recompra', `-$${fmt(data.rebuyFeeCost)}`);
    h += bR('Fee retorno', `-$${fmt(data.returnCostArs)}`);
  }
  h += `<div class="breakdown-divider"></div>`;
  h += bR('Total costos', `-$${fmt(data.totalCosts)}`, 'color-red');
  if (data.includeRebuy) {
    h += `<div class="breakdown-divider"></div>`;
    h += bR('USDT inicio', data.cryptoStart.toFixed(2));
    h += bR('USDT final', data.cryptoEnd.toFixed(2));
    h += bR('Diferencia', `${data.cryptoDiff >= 0 ? '+' : ''}${data.cryptoDiff.toFixed(2)}`, data.cryptoDiff >= 0 ? 'color-green' : 'color-red');
  }
  h += `<div class="breakdown-divider"></div>`;
  h += `<div class="breakdown-row total"><span class="label">NETO</span><span class="value ${pos ? 'color-green' : 'color-red'}">${pos ? '+' : '-'}$${fmt(Math.abs(netProfit))}</span></div>`;
  document.getElementById('breakdown').innerHTML = h;
}

function bR(l, v, c) { return `<div class="breakdown-row"><span class="label">${l}</span><span class="value ${c || ''}">${v}</span></div>`; }

// ═══ HISTORIAL ═══════════════════════════════════════

function saveToHistory(buyP, sellP, capital, profit, percent) {
  calcHistory.unshift({ buyP: pName(buyP), sellP: pName(sellP), capital, profit, percent, ts: Date.now() });
  calcHistory = calcHistory.slice(0, 30);
  localStorage.setItem('arb_calc_history', JSON.stringify(calcHistory));
  renderHistory();
}

function renderHistory() {
  const sec = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (!calcHistory.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  list.innerHTML = calcHistory.map(h => {
    const p = h.profit >= 0;
    const date = new Date(h.ts).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
    return `<div class="hist-card">
      <div class="hist-header">
        <span class="hist-pair">${h.buyP} → ${h.sellP}</span>
        <span class="hist-profit ${p ? 'color-green' : 'color-red'}">${p ? '+' : '-'}$${fmt(Math.abs(h.profit))}</span>
      </div>
      <div class="hist-detail">$${fmt(h.capital)} · ${date} · ${p ? '+' : ''}${h.percent.toFixed(2)}%</div>
    </div>`;
  }).join('');
}

function clearHist() {
  if (confirm('¿Borrar historial?')) {
    calcHistory = [];
    localStorage.removeItem('arb_calc_history');
    renderHistory();
  }
}

// ═══ HELPERS ═════════════════════════════════════════

function pName(id) { return PLATFORM_FEES[id]?.name || id; }
function fmt(n) { return Math.round(n).toLocaleString('es-AR'); }
