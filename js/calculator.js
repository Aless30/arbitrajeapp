/**
 * Calculadora de Arbitraje - ARS + P2P
 * Circuito: ARS → Crypto (Binance) → Transfer → Crypto (OKX) → ARS
 */

let calcHistory = [];

// Toggle rebuy section
document.getElementById('includeRebuy').addEventListener('change', function() {
  document.getElementById('rebuySection').style.display = this.checked ? 'block' : 'none';
});

// Load history on start
(function init() {
  try {
    const saved = localStorage.getItem('arb_calc_history');
    if (saved) calcHistory = JSON.parse(saved);
    renderHistory();
  } catch {}
})();

// ═══ CALCULO PRINCIPAL ═══════════════════════════════

function calculate() {
  // Capital
  const capital = parseFloat(document.getElementById('capital').value) || 0;

  // Compra
  const buyPrice = parseFloat(document.getElementById('buyPrice').value) || 0;
  const buyFeeExchange = parseFloat(document.getElementById('buyFeeExchange').value) || 0;
  const buyP2pSpread = parseFloat(document.getElementById('buyP2pSpread').value) || 0;
  const buyBankFee = parseFloat(document.getElementById('buyBankFee').value) || 0;

  // Transferencia
  const withdrawFee = parseFloat(document.getElementById('withdrawFee').value) || 0;

  // Venta
  const sellPrice = parseFloat(document.getElementById('sellPrice').value) || 0;
  const sellFeeExchange = parseFloat(document.getElementById('sellFeeExchange').value) || 0;
  const sellP2pSpread = parseFloat(document.getElementById('sellP2pSpread').value) || 0;
  const sellBankFee = parseFloat(document.getElementById('sellBankFee').value) || 0;

  // Recompra
  const includeRebuy = document.getElementById('includeRebuy').checked;
  const rebuyPrice = parseFloat(document.getElementById('rebuyPrice').value) || 0;
  const rebuyFee = parseFloat(document.getElementById('rebuyFee').value) || 0;
  const returnFee = parseFloat(document.getElementById('returnFee').value) || 0;
  const rebuyP2pSpread = parseFloat(document.getElementById('rebuyP2pSpread').value) || 0;
  const rebuyBankFee = parseFloat(document.getElementById('rebuyBankFee').value) || 0;

  // Platforms
  const buyPlatform = document.getElementById('buyPlatform').value;
  const sellPlatform = document.getElementById('sellPlatform').value;
  const rebuyPlatform = document.getElementById('rebuyPlatform').value;
  const pair = document.getElementById('buyPair').value || 'USDT/ARS';

  if (!capital || !buyPrice || !sellPrice) {
    alert('Completa al menos: Capital, Precio de compra y Precio de venta');
    return;
  }

  // ═══ PASO 1: COMPRA (ARS → Crypto) ═══
  // Precio efectivo = precio publicado + spread P2P
  const buyPriceEffective = buyPrice * (1 + buyP2pSpread / 100);
  const capitalAfterBankFee = capital - buyBankFee;
  const buyFeeArs = capitalAfterBankFee * (buyFeeExchange / 100);
  const arsForCrypto = capitalAfterBankFee - buyFeeArs;
  const cryptoBought = arsForCrypto / buyPriceEffective;

  // ═══ PASO 2: TRANSFERENCIA ═══
  const cryptoAfterWithdraw = cryptoBought - withdrawFee;

  // ═══ PASO 3: VENTA (Crypto → ARS) ═══
  // Precio efectivo de venta = precio publicado - spread P2P
  const sellPriceEffective = sellPrice * (1 - sellP2pSpread / 100);
  const grossSellArs = cryptoAfterWithdraw * sellPriceEffective;
  const sellFeeArs = grossSellArs * (sellFeeExchange / 100);
  const netSellArs = grossSellArs - sellFeeArs - sellBankFee;

  // Costos totales paso 1-3
  const buySpreadCostArs = (buyPriceEffective - buyPrice) * cryptoBought;
  const sellSpreadCostArs = (sellPrice - sellPriceEffective) * cryptoAfterWithdraw;
  const withdrawFeeCostArs = withdrawFee * sellPriceEffective;

  const steps = [];

  steps.push({
    num: 1, label: 'Compra P2P',
    value: `${cryptoBought.toFixed(4)} ${pair.split('/')[0]}`,
    detail: `en ${pName(buyPlatform)} a $${buyPriceEffective.toLocaleString('es-AR', {maximumFractionDigits:2})} ARS`,
    amount: `-$${(buyFeeArs + buyBankFee + buySpreadCostArs).toFixed(0)} costos`,
    amountClass: 'color-red'
  });

  steps.push({
    num: 2, label: 'Envio on-chain',
    value: `${cryptoAfterWithdraw.toFixed(4)} ${pair.split('/')[0]}`,
    detail: `Red: ${document.getElementById('networkNote').value || 'TRC20'} → ${pName(sellPlatform)}`,
    amount: `-${withdrawFee} ${pair.split('/')[0]}`,
    amountClass: 'color-red'
  });

  steps.push({
    num: 3, label: 'Venta P2P',
    value: `$${netSellArs.toLocaleString('es-AR', {maximumFractionDigits:0})} ARS`,
    detail: `en ${pName(sellPlatform)} a $${sellPriceEffective.toLocaleString('es-AR', {maximumFractionDigits:2})} ARS`,
    amount: `-$${(sellFeeArs + sellBankFee + sellSpreadCostArs).toFixed(0)} costos`,
    amountClass: 'color-red'
  });

  let finalArs, netProfit, netProfitPercent, totalCosts;
  let rebuyFeeArs = 0, returnFeeArs = 0, rebuySpreadCostArs = 0;
  let cryptoFinal = 0, cryptoDiff = 0;

  if (includeRebuy && rebuyPrice > 0) {
    // ═══ PASO 4: RECOMPRA (ARS → Crypto de nuevo) ═══
    const rebuyPriceEffective = rebuyPrice * (1 + rebuyP2pSpread / 100);
    const arsForRebuy = netSellArs - rebuyBankFee;
    rebuyFeeArs = arsForRebuy * (rebuyFee / 100);
    const arsAfterRebuyFee = arsForRebuy - rebuyFeeArs;
    cryptoFinal = arsAfterRebuyFee / rebuyPriceEffective;

    // ═══ PASO 5: RETORNO (enviar crypto de vuelta) ═══
    const cryptoFinalAfterReturn = cryptoFinal - returnFee;
    returnFeeArs = returnFee * rebuyPriceEffective;
    rebuySpreadCostArs = (rebuyPriceEffective - rebuyPrice) * cryptoFinal;

    steps.push({
      num: 4, label: 'Recompra P2P',
      value: `${cryptoFinal.toFixed(4)} ${pair.split('/')[0]}`,
      detail: `en ${pName(rebuyPlatform)} a $${rebuyPriceEffective.toLocaleString('es-AR', {maximumFractionDigits:2})} ARS`,
      amount: `-$${(rebuyFeeArs + rebuyBankFee + rebuySpreadCostArs).toFixed(0)} costos`,
      amountClass: 'color-red'
    });

    steps.push({
      num: 5, label: 'Retorno on-chain',
      value: `${cryptoFinalAfterReturn.toFixed(4)} ${pair.split('/')[0]}`,
      detail: `De vuelta en ${pName(buyPlatform)}`,
      amount: `-${returnFee} ${pair.split('/')[0]}`,
      amountClass: 'color-red'
    });

    cryptoDiff = cryptoFinalAfterReturn - cryptoBought;
    // Valor final en ARS (al precio original de compra)
    finalArs = cryptoFinalAfterReturn * buyPrice;
    netProfit = finalArs - capital;
    netProfitPercent = (netProfit / capital) * 100;

    totalCosts = buyFeeArs + buyBankFee + buySpreadCostArs +
                 withdrawFeeCostArs +
                 sellFeeArs + sellBankFee + sellSpreadCostArs +
                 rebuyFeeArs + rebuyBankFee + rebuySpreadCostArs +
                 returnFeeArs;

    showResults(netProfit, netProfitPercent, steps, {
      capital, buyFeeArs, buyBankFee, buySpreadCostArs,
      withdrawFeeCostArs, sellFeeArs, sellBankFee, sellSpreadCostArs,
      rebuyFeeArs, rebuyBankFee: rebuyBankFee, rebuySpreadCostArs,
      returnFeeArs, totalCosts,
      cryptoStart: cryptoBought, cryptoEnd: cryptoFinalAfterReturn, cryptoDiff,
      pair, includeRebuy: true
    });
  } else {
    // Sin recompra: ganancia directa en ARS
    finalArs = netSellArs;
    netProfit = netSellArs - capital;
    netProfitPercent = (netProfit / capital) * 100;

    totalCosts = buyFeeArs + buyBankFee + buySpreadCostArs +
                 withdrawFeeCostArs +
                 sellFeeArs + sellBankFee + sellSpreadCostArs;

    showResults(netProfit, netProfitPercent, steps, {
      capital, buyFeeArs, buyBankFee, buySpreadCostArs,
      withdrawFeeCostArs, sellFeeArs, sellBankFee, sellSpreadCostArs,
      rebuyFeeArs: 0, rebuyBankFee: 0, rebuySpreadCostArs: 0,
      returnFeeArs: 0, totalCosts,
      pair, includeRebuy: false
    });
  }

  // Save to history
  saveToHistory(pair, buyPlatform, sellPlatform, capital, netProfit, netProfitPercent);
}

// ═══ MOSTRAR RESULTADOS ══════════════════════════════

function showResults(netProfit, netProfitPercent, steps, data) {
  document.getElementById('resultsSection').style.display = 'block';

  setTimeout(() => {
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
  }, 100);

  const isPositive = netProfit >= 0;
  const summary = document.getElementById('resultSummary');
  summary.className = `result-summary ${isPositive ? 'positive' : 'negative'}`;

  const color = isPositive ? 'var(--success)' : 'var(--danger)';
  document.getElementById('resultMain').innerHTML =
    `<span style="color:${color}">${isPositive ? '+' : ''}$${Math.abs(netProfit).toLocaleString('es-AR', {maximumFractionDigits:0})} ARS</span>`;
  document.getElementById('resultPercent').innerHTML =
    `<span style="color:${color}">${isPositive ? '+' : ''}${netProfitPercent.toFixed(3)}% sobre capital</span>`;

  // Circuit
  document.getElementById('circuit').innerHTML = steps.map(s => `
    <div class="circuit-step">
      <div class="step-num">${s.num}</div>
      <div class="step-info">
        <div class="step-label">${s.label}</div>
        <div class="step-value">${s.value}</div>
        <div class="step-detail">${s.detail}</div>
      </div>
      <div class="step-amount ${s.amountClass}">${s.amount}</div>
    </div>
  `).join('');

  // Breakdown
  let html = `<div class="breakdown-title">Desglose de Costos (ARS)</div>`;
  html += bRow('Capital invertido', `$${data.capital.toLocaleString('es-AR', {maximumFractionDigits:0})}`);
  html += bDiv();
  html += bRow('Comision compra (exchange)', `-$${data.buyFeeArs.toFixed(0)}`, 'color-red');
  html += bRow('Spread P2P compra', `-$${data.buySpreadCostArs.toFixed(0)}`, 'color-red');
  html += bRow('Fee banco compra', `-$${data.buyBankFee.toFixed(0)}`, 'color-red');
  html += bRow('Fee retiro on-chain', `-$${data.withdrawFeeCostArs.toFixed(0)}`, 'color-red');
  html += bRow('Comision venta (exchange)', `-$${data.sellFeeArs.toFixed(0)}`, 'color-red');
  html += bRow('Spread P2P venta', `-$${data.sellSpreadCostArs.toFixed(0)}`, 'color-red');
  html += bRow('Fee banco venta', `-$${data.sellBankFee.toFixed(0)}`, 'color-red');

  if (data.includeRebuy) {
    html += bRow('Comision recompra', `-$${data.rebuyFeeArs.toFixed(0)}`, 'color-red');
    html += bRow('Spread P2P recompra', `-$${data.rebuySpreadCostArs.toFixed(0)}`, 'color-red');
    html += bRow('Fee banco recompra', `-$${data.rebuyBankFee.toFixed(0)}`, 'color-red');
    html += bRow('Fee retorno on-chain', `-$${data.returnFeeArs.toFixed(0)}`, 'color-red');
  }

  html += bDiv();
  html += bRow('Total costos', `-$${data.totalCosts.toLocaleString('es-AR', {maximumFractionDigits:0})}`, 'color-red');

  if (data.includeRebuy) {
    html += bDiv();
    html += bRow('Crypto comprado', `${data.cryptoStart.toFixed(4)}`);
    html += bRow('Crypto final', `${data.cryptoEnd.toFixed(4)}`);
    html += bRow('Diferencia crypto', `${data.cryptoDiff >= 0 ? '+' : ''}${data.cryptoDiff.toFixed(4)}`,
      data.cryptoDiff >= 0 ? 'color-green' : 'color-red');
  }

  html += bDiv();
  html += `<div class="breakdown-row total"><span class="label">GANANCIA NETA</span>` +
    `<span class="value ${isPositive ? 'color-green' : 'color-red'}">` +
    `${isPositive ? '+' : ''}$${Math.abs(netProfit).toLocaleString('es-AR', {maximumFractionDigits:0})} ARS</span></div>`;

  document.getElementById('breakdown').innerHTML = html;
}

function bRow(label, value, cls) {
  return `<div class="breakdown-row"><span class="label">${label}</span><span class="value ${cls || ''}">${value}</span></div>`;
}
function bDiv() {
  return `<div class="breakdown-divider"></div>`;
}

// ═══ HISTORIAL ═══════════════════════════════════════

function saveToHistory(pair, buyP, sellP, capital, profit, percent) {
  calcHistory.unshift({
    pair, buyPlatform: pName(buyP), sellPlatform: pName(sellP),
    capital, profit, percent, timestamp: Date.now()
  });
  calcHistory = calcHistory.slice(0, 50);
  localStorage.setItem('arb_calc_history', JSON.stringify(calcHistory));
  renderHistory();
}

function renderHistory() {
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (calcHistory.length === 0) { section.style.display = 'none'; return; }

  section.style.display = 'block';
  list.innerHTML = calcHistory.map(h => {
    const isPos = h.profit >= 0;
    const date = new Date(h.timestamp).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    return `
      <div class="hist-card">
        <div class="hist-header">
          <span class="hist-pair">${h.pair} · $${h.capital.toLocaleString('es-AR', {maximumFractionDigits:0})}</span>
          <span class="hist-profit ${isPos ? 'color-green' : 'color-red'}">
            ${isPos ? '+' : ''}$${Math.abs(h.profit).toLocaleString('es-AR', {maximumFractionDigits:0})}
          </span>
        </div>
        <div class="hist-detail">
          ${h.buyPlatform} → ${h.sellPlatform} · ${date} · ${isPos ? '+' : ''}${h.percent.toFixed(2)}%
        </div>
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

function pName(id) {
  const names = {
    binance_p2p: 'Binance P2P', binance_spot: 'Binance Spot',
    okx_p2p: 'OKX P2P', okx_spot: 'OKX Spot',
    bybit_p2p: 'Bybit P2P', kucoin_p2p: 'KuCoin P2P',
    bitget_p2p: 'Bitget P2P',
    lemon: 'Lemon Cash', belo: 'Belo', buenbit: 'Buenbit',
    ripio: 'Ripio', fiwind: 'Fiwind', tiendacrypto: 'TiendaCrypto',
    otro: 'Otro'
  };
  return names[id] || id;
}
