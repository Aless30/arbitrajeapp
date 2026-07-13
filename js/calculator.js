/**
 * Calculadora de Arbitraje - Circuito Completo
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
  const capital = parseFloat(document.getElementById('capital').value) || 0;
  const buyPrice = parseFloat(document.getElementById('buyPrice').value) || 0;
  const buyFee = parseFloat(document.getElementById('buyFee').value) || 0;
  const withdrawFee = parseFloat(document.getElementById('withdrawFee').value) || 0;
  const depositFee = parseFloat(document.getElementById('depositFee').value) || 0;
  const sellPrice = parseFloat(document.getElementById('sellPrice').value) || 0;
  const sellFee = parseFloat(document.getElementById('sellFee').value) || 0;
  const includeRebuy = document.getElementById('includeRebuy').checked;
  const rebuyPrice = parseFloat(document.getElementById('rebuyPrice').value) || 0;
  const rebuyFee = parseFloat(document.getElementById('rebuyFee').value) || 0;
  const returnFee = parseFloat(document.getElementById('returnFee').value) || 0;

  if (!capital || !buyPrice || !sellPrice) {
    alert('Completa al menos: Capital, Precio de compra y Precio de venta');
    return;
  }

  const buyPlatform = document.getElementById('buyPlatform').value;
  const sellPlatform = document.getElementById('sellPlatform').value;
  const rebuyPlatform = document.getElementById('rebuyPlatform').value;
  const pair = document.getElementById('buyPair').value || 'CRYPTO';

  // === PASO 1: Compra ===
  const buyFeeUsd = capital * (buyFee / 100);
  const capitalAfterBuyFee = capital - buyFeeUsd;
  const cryptoAmount = capitalAfterBuyFee / buyPrice;

  // === PASO 2: Transferencia (retiro + deposito) ===
  // El fee de retiro se cobra en crypto o en USD fijo
  const cryptoAfterWithdraw = cryptoAmount - (withdrawFee / buyPrice);
  const withdrawFeeUsd = withdrawFee;
  const depositFeeUsd = depositFee;
  const cryptoAfterDeposit = cryptoAfterWithdraw - (depositFee / buyPrice);

  // === PASO 3: Venta ===
  const grossSellUsd = cryptoAfterDeposit * sellPrice;
  const sellFeeUsd = grossSellUsd * (sellFee / 100);
  const netSellUsd = grossSellUsd - sellFeeUsd;

  let finalValue, rebuyAmount, rebuyFeeUsd, returnFeeUsd, cryptoFinal;
  const steps = [];

  steps.push({
    num: 1, label: 'Compra',
    value: `${cryptoAmount.toFixed(6)} ${pair.split('/')[0]}`,
    detail: `en ${platformName(buyPlatform)} a $${buyPrice.toLocaleString()}`,
    amount: `-$${buyFeeUsd.toFixed(2)} fee`,
    amountClass: 'color-red'
  });

  steps.push({
    num: 2, label: 'Transferencia',
    value: `→ ${platformName(sellPlatform)}`,
    detail: `Retiro: $${withdrawFee} + Deposito: $${depositFee}`,
    amount: `-$${(withdrawFeeUsd + depositFeeUsd).toFixed(2)}`,
    amountClass: 'color-red'
  });

  steps.push({
    num: 3, label: 'Venta',
    value: `$${netSellUsd.toFixed(2)} recibido`,
    detail: `en ${platformName(sellPlatform)} a $${sellPrice.toLocaleString()}`,
    amount: `-$${sellFeeUsd.toFixed(2)} fee`,
    amountClass: 'color-red'
  });

  if (includeRebuy && rebuyPrice > 0) {
    // === PASO 4: Recompra ===
    rebuyFeeUsd = netSellUsd * (rebuyFee / 100);
    const capitalForRebuy = netSellUsd - rebuyFeeUsd;
    cryptoFinal = capitalForRebuy / rebuyPrice;

    // === PASO 5: Retorno ===
    returnFeeUsd = returnFee;
    const cryptoFinalAfterReturn = cryptoFinal - (returnFee / rebuyPrice);

    steps.push({
      num: 4, label: 'Recompra',
      value: `${cryptoFinal.toFixed(6)} ${pair.split('/')[0]}`,
      detail: `en ${platformName(rebuyPlatform)} a $${rebuyPrice.toLocaleString()}`,
      amount: `-$${rebuyFeeUsd.toFixed(2)} fee`,
      amountClass: 'color-red'
    });

    steps.push({
      num: 5, label: 'Retorno',
      value: `${cryptoFinalAfterReturn.toFixed(6)} ${pair.split('/')[0]}`,
      detail: `De vuelta en ${platformName(buyPlatform)}`,
      amount: `-$${returnFeeUsd.toFixed(2)} fee`,
      amountClass: 'color-red'
    });

    // Resultado: comparar crypto inicial vs crypto final
    finalValue = cryptoFinalAfterReturn * buyPrice;
    // Net profit en USD relativo al capital
    const totalFees = buyFeeUsd + withdrawFeeUsd + depositFeeUsd + sellFeeUsd + rebuyFeeUsd + returnFeeUsd;
    const netProfit = finalValue - capital;
    const netProfitPercent = (netProfit / capital) * 100;

    // Tambien calcular en crypto
    const cryptoDiff = cryptoFinalAfterReturn - cryptoAmount;

    showResults(netProfit, netProfitPercent, steps, {
      capital,
      buyFeeUsd,
      withdrawFeeUsd,
      depositFeeUsd,
      sellFeeUsd,
      rebuyFeeUsd: rebuyFeeUsd || 0,
      returnFeeUsd: returnFeeUsd || 0,
      totalFees,
      grossSellUsd,
      netSellUsd,
      finalValue,
      cryptoStart: cryptoAmount,
      cryptoEnd: cryptoFinalAfterReturn,
      cryptoDiff,
      pair,
      includeRebuy: true
    });
  } else {
    // Sin recompra: ganancia en USD directo
    const netProfit = netSellUsd - capital;
    const netProfitPercent = (netProfit / capital) * 100;
    const totalFees = buyFeeUsd + withdrawFeeUsd + depositFeeUsd + sellFeeUsd;
    finalValue = netSellUsd;

    showResults(netProfit, netProfitPercent, steps, {
      capital,
      buyFeeUsd,
      withdrawFeeUsd,
      depositFeeUsd,
      sellFeeUsd,
      rebuyFeeUsd: 0,
      returnFeeUsd: 0,
      totalFees,
      grossSellUsd,
      netSellUsd,
      finalValue,
      pair,
      includeRebuy: false
    });
  }

  // Save to history
  saveToHistory(pair, buyPlatform, sellPlatform, capital, finalValue - capital, ((finalValue - capital) / capital) * 100);
}


// ═══ MOSTRAR RESULTADOS ══════════════════════════════

function showResults(netProfit, netProfitPercent, steps, data) {
  document.getElementById('resultsSection').style.display = 'block';

  // Scroll to results
  setTimeout(() => {
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
  }, 100);

  // Summary
  const summary = document.getElementById('resultSummary');
  const isPositive = netProfit >= 0;
  summary.className = `result-summary ${isPositive ? 'positive' : 'negative'}`;
  document.getElementById('resultMain').innerHTML =
    `<span style="color:${isPositive ? 'var(--success)' : 'var(--danger)'}">` +
    `${isPositive ? '+' : ''}$${netProfit.toFixed(2)}</span>`;
  document.getElementById('resultPercent').innerHTML =
    `<span style="color:${isPositive ? 'var(--success)' : 'var(--danger)'}">` +
    `${isPositive ? '+' : ''}${netProfitPercent.toFixed(3)}% sobre capital</span>`;

  // Circuit
  const circuit = document.getElementById('circuit');
  circuit.innerHTML = steps.map(s => `
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
  const bd = document.getElementById('breakdown');
  let breakdownHTML = `<div class="breakdown-title">Desglose de Costos</div>`;
  breakdownHTML += row('Capital invertido', `$${data.capital.toFixed(2)}`);
  breakdownHTML += divider();
  breakdownHTML += row('Comision compra', `-$${data.buyFeeUsd.toFixed(2)}`, 'color-red');
  breakdownHTML += row('Fee retiro', `-$${data.withdrawFeeUsd.toFixed(2)}`, 'color-red');
  breakdownHTML += row('Fee deposito', `-$${data.depositFeeUsd.toFixed(2)}`, 'color-red');
  breakdownHTML += row('Comision venta', `-$${data.sellFeeUsd.toFixed(2)}`, 'color-red');

  if (data.includeRebuy) {
    breakdownHTML += row('Comision recompra', `-$${data.rebuyFeeUsd.toFixed(2)}`, 'color-red');
    breakdownHTML += row('Fee retorno', `-$${data.returnFeeUsd.toFixed(2)}`, 'color-red');
  }

  breakdownHTML += divider();
  breakdownHTML += row('Total comisiones', `-$${data.totalFees.toFixed(2)}`, 'color-red');
  breakdownHTML += divider();

  if (data.includeRebuy) {
    breakdownHTML += row('Crypto inicial', `${data.cryptoStart.toFixed(6)}`);
    breakdownHTML += row('Crypto final', `${data.cryptoEnd.toFixed(6)}`);
    breakdownHTML += row('Diferencia', `${data.cryptoDiff >= 0 ? '+' : ''}${data.cryptoDiff.toFixed(6)}`,
      data.cryptoDiff >= 0 ? 'color-green' : 'color-red');
    breakdownHTML += divider();
  }

  const isPos = netProfit >= 0;
  breakdownHTML += `<div class="breakdown-row total">` +
    `<span class="label">GANANCIA NETA</span>` +
    `<span class="value ${isPos ? 'color-green' : 'color-red'}">` +
    `${isPos ? '+' : ''}$${netProfit.toFixed(2)}</span></div>`;

  bd.innerHTML = breakdownHTML;
}

function row(label, value, colorClass) {
  return `<div class="breakdown-row"><span class="label">${label}</span>` +
    `<span class="value ${colorClass || ''}">${value}</span></div>`;
}

function divider() {
  return `<div class="breakdown-divider"></div>`;
}


// ═══ HISTORIAL ═══════════════════════════════════════

function saveToHistory(pair, buyPlatform, sellPlatform, capital, profit, percent) {
  calcHistory.unshift({
    pair,
    buyPlatform: platformName(buyPlatform),
    sellPlatform: platformName(sellPlatform),
    capital,
    profit,
    percent,
    timestamp: Date.now()
  });
  calcHistory = calcHistory.slice(0, 50);
  localStorage.setItem('arb_calc_history', JSON.stringify(calcHistory));
  renderHistory();
}

function renderHistory() {
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');

  if (calcHistory.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = calcHistory.map(h => {
    const isPos = h.profit >= 0;
    const date = new Date(h.timestamp).toLocaleString('es', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    return `
      <div class="hist-card">
        <div class="hist-header">
          <span class="hist-pair">${h.pair} · $${h.capital}</span>
          <span class="hist-profit ${isPos ? 'color-green' : 'color-red'}">
            ${isPos ? '+' : ''}$${h.profit.toFixed(2)}
          </span>
        </div>
        <div class="hist-detail">
          ${h.buyPlatform} → ${h.sellPlatform} · ${date} · ${isPos ? '+' : ''}${h.percent.toFixed(2)}%
        </div>
      </div>
    `;
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

function platformName(id) {
  const names = {
    binance: 'Binance', bybit: 'Bybit', kucoin: 'KuCoin',
    kraken: 'Kraken', gate: 'Gate.io', okx: 'OKX',
    mexc: 'MEXC', bitget: 'Bitget', coinbase: 'Coinbase',
    p2p: 'P2P/OTC', otro: 'Otro'
  };
  return names[id] || id;
}
