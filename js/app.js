/**
 * App Controller - Interfaz de usuario
 */

// ═══ ESTADO GLOBAL ═══════════════════════════════════

let engine = null;
let isScanning = false;
let scanInterval = null;
let stats = { scans: 0, profitable: 0, bestScore: 0 };
let history = [];
let currentOpportunities = [];

// ═══ INICIALIZACIÓN ══════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadHistory();
  engine = new ArbitrageEngine(getConfig());
  requestNotificationPermission();
  registerServiceWorker();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// ═══ CONTROL DE ESCANEO ══════════════════════════════

function toggleScanning() {
  if (isScanning) {
    stopScanning();
  } else {
    startScanning();
  }
}

function startScanning() {
  isScanning = true;
  updateUI();
  runScan();
  const interval = (getConfig().scanInterval || 15) * 1000;
  scanInterval = setInterval(runScan, interval);
}

function stopScanning() {
  isScanning = false;
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  updateUI();
}

async function runScan() {
  if (!engine) return;

  try {
    const result = await engine.scan();
    stats.scans++;
    stats.profitable += result.profitable.length;

    if (result.profitable.length > 0) {
      const best = result.profitable[0];
      if (best.score > stats.bestScore) {
        stats.bestScore = best.score;
      }
      // Guardar en historial
      result.profitable.forEach(opp => {
        history.unshift(opp);
      });
      history = history.slice(0, 100);
      saveHistory();

      // Notificar
      sendNotification(best, result.profitable.length);
    }

    currentOpportunities = result.opportunities;
    updateUI();
    saveStats();
  } catch (e) {
    console.error('Error en escaneo:', e);
  }
}



// ═══ NOTIFICACIONES ══════════════════════════════════

function sendNotification(best, count) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const title = `🔔 ${count} oportunidad${count > 1 ? 'es' : ''}`;
    const body = `${best.pair}: +$${best.netProfitUsd.toFixed(2)} (Score: ${best.score.toFixed(0)})`;
    try {
      new Notification(title, { body, icon: 'icons/icon-192.png', vibrate: [200, 100, 200] });
    } catch {}
  }
}

// ═══ UI UPDATES ══════════════════════════════════════

function updateUI() {
  // Status
  const pill = document.getElementById('statusPill');
  const dot = document.getElementById('pulseDot');
  const text = document.getElementById('statusText');

  if (isScanning) {
    pill.classList.add('active');
    dot.classList.add('active');
    text.textContent = 'Escaneando';
  } else {
    pill.classList.remove('active');
    dot.classList.remove('active');
    text.textContent = 'Pausado';
  }

  // Button
  const btn = document.getElementById('controlBtn');
  if (isScanning) {
    btn.textContent = '⏸ Pausar Monitoreo';
    btn.classList.add('active');
  } else {
    btn.textContent = '▶ Iniciar Monitoreo';
    btn.classList.remove('active');
  }

  // Stats
  document.getElementById('statScans').textContent = stats.scans;
  document.getElementById('statProfitable').textContent = stats.profitable;
  document.getElementById('statBestScore').textContent = stats.bestScore.toFixed(0);

  // Opportunities
  renderOpportunities();
  renderHistory();
}

function renderOpportunities() {
  const list = document.getElementById('opportunitiesList');
  const empty = document.getElementById('emptyState');
  const profitable = currentOpportunities.filter(o => o.netProfitUsd > 0);

  if (profitable.length === 0) {
    empty.style.display = 'block';
    list.innerHTML = '';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = profitable.slice(0, 15).map(opp => renderCard(opp)).join('');
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');

  if (history.length === 0) {
    empty.style.display = 'block';
    list.innerHTML = '';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = history.slice(0, 30).map(opp => renderCard(opp)).join('');
}



// ═══ RENDER CARDS ════════════════════════════════════

function renderCard(opp) {
  const isProfitable = opp.netProfitUsd > 0;
  const glowClass = isProfitable && opp.score >= 60 ? 'glow' : '';
  const riskBadge = opp.riskLevel === 'bajo' ? 'badge-success' :
                    opp.riskLevel === 'medio' ? 'badge-warning' : 'badge-danger';
  const scoreColor = opp.score >= 70 ? 'var(--success)' :
                     opp.score >= 40 ? 'var(--warning)' : 'var(--danger)';

  const circumference = 2 * Math.PI * 18;
  const progress = (opp.score / 100) * circumference;

  return `
    <div class="opp-card ${glowClass}" onclick="openDetail('${opp.id}')">
      <div class="opp-header">
        <div class="opp-badges">
          <span class="badge badge-primary">${opp.type === 'inter_exchange' ? 'INTER-EX' : 'TRIANGULAR'}</span>
          <span class="badge ${riskBadge}">${opp.riskLevel}</span>
        </div>
        <div class="score-ring">
          <svg width="44" height="44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" stroke-width="3"/>
            <circle cx="22" cy="22" r="18" fill="none" stroke="${scoreColor}" stroke-width="3"
              stroke-dasharray="${progress} ${circumference}" stroke-linecap="round"/>
          </svg>
          <span class="score-value" style="color:${scoreColor}">${opp.score.toFixed(0)}</span>
        </div>
      </div>
      <div class="opp-pair">${opp.pair}</div>
      <div class="opp-route">${opp.buyExchange} → ${opp.sellExchange}</div>
      <div class="opp-profits">
        <div class="opp-profit-item">
          <div class="opp-profit-label">Bruto</div>
          <div class="opp-profit-value color-muted">${opp.grossProfitPercent.toFixed(3)}%</div>
        </div>
        <div class="opp-profit-item">
          <div class="opp-profit-label">Costos</div>
          <div class="opp-profit-value color-red">-$${opp.totalCosts.toFixed(2)}</div>
        </div>
        <div class="opp-profit-item">
          <div class="opp-profit-label">Neto</div>
          <div class="opp-profit-value profit-net ${isProfitable ? 'color-green' : 'color-red'}">
            ${isProfitable ? '+' : ''}$${opp.netProfitUsd.toFixed(2)}
          </div>
        </div>
      </div>
      ${opp.transferTimeMin > 0 ? `<div class="opp-time">⏱ ~${opp.transferTimeMin} min transferencia</div>` : ''}
    </div>
  `;
}

// ═══ DETAIL MODAL ════════════════════════════════════

function openDetail(id) {
  const all = [...currentOpportunities, ...history];
  const opp = all.find(o => o.id === id);
  if (!opp) return;

  const isProfitable = opp.netProfitUsd > 0;
  const riskBadge = opp.riskLevel === 'bajo' ? 'badge-success' :
                    opp.riskLevel === 'medio' ? 'badge-warning' : 'badge-danger';
  const scoreColor = opp.score >= 70 ? 'var(--success)' :
                     opp.score >= 40 ? 'var(--warning)' : 'var(--danger)';
  const circumference = 2 * Math.PI * 28;
  const progress = (opp.score / 100) * circumference;
  const netColor = isProfitable ? 'color-green' : 'color-red';

  document.getElementById('modalBody').innerHTML = `
    <div class="detail-score-section">
      <div class="detail-score-ring">
        <svg width="72" height="72">
          <circle cx="36" cy="36" r="28" fill="none" stroke="var(--border)" stroke-width="3"/>
          <circle cx="36" cy="36" r="28" fill="none" stroke="${scoreColor}" stroke-width="3"
            stroke-dasharray="${progress} ${circumference}" stroke-linecap="round"/>
        </svg>
        <span class="detail-score-value" style="color:${scoreColor}">${opp.score.toFixed(0)}</span>
      </div>
      <div>
        <div class="detail-pair">${opp.pair}</div>
        <div class="detail-badges">
          <span class="badge badge-primary">${opp.type === 'inter_exchange' ? 'Inter-Exchange' : 'Triangular'}</span>
          <span class="badge ${riskBadge}">${opp.riskLevel}</span>
        </div>
      </div>
    </div>

    <div class="detail-card">
      <p style="color:var(--text-secondary);font-size:14px;line-height:1.5">${opp.description}</p>
    </div>

    <div class="detail-card">
      <div class="detail-card-title">Desglose Financiero</div>
      <div class="detail-row">
        <span class="detail-row-label">Inversion</span>
        <span class="detail-row-value">$${opp.investmentUsd.toFixed(2)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Ganancia Bruta</span>
        <span class="detail-row-value color-muted">+${opp.grossProfitPercent.toFixed(4)}%</span>
      </div>
      <div class="detail-divider"></div>
      <div class="detail-row">
        <span class="detail-row-label">Fees de Trading</span>
        <span class="detail-row-value color-red">-$${opp.tradingFees.toFixed(2)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Fee de Retiro</span>
        <span class="detail-row-value color-red">-$${opp.withdrawalFee.toFixed(2)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Slippage</span>
        <span class="detail-row-value color-red">-$${opp.slippageCost.toFixed(2)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Riesgo Transf.</span>
        <span class="detail-row-value color-red">-$${opp.transferRisk.toFixed(2)}</span>
      </div>
      <div class="detail-divider"></div>
      <div class="detail-row detail-row-bold">
        <span class="detail-row-label">Total Costos</span>
        <span class="detail-row-value" style="color:var(--warning)">-$${opp.totalCosts.toFixed(2)}</span>
      </div>
      <div class="detail-divider"></div>
      <div class="detail-row detail-row-bold detail-row-large">
        <span class="detail-row-label">GANANCIA NETA</span>
        <span class="detail-row-value ${netColor}">${isProfitable ? '+' : ''}$${opp.netProfitUsd.toFixed(2)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label"></span>
        <span class="detail-row-value ${netColor}">${opp.netProfitPercent.toFixed(4)}%</span>
      </div>
    </div>

    ${opp.transferTimeMin > 0 ? `
    <div class="detail-card">
      <div class="detail-card-title">Tiempo Estimado</div>
      <p style="font-size:18px;font-weight:600;color:var(--text)">~${opp.transferTimeMin} minutos</p>
      <p style="font-size:13px;color:var(--text-muted);margin-top:4px">El precio puede cambiar durante la transferencia</p>
    </div>
    ` : ''}
  `;

  document.getElementById('detailModal').classList.add('open');
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('open');
}



// ═══ TABS ════════════════════════════════════════════

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ═══ SETTINGS ════════════════════════════════════════

function getConfig() {
  return {
    investmentAmount: parseFloat(document.getElementById('cfgInvestment')?.value) || 1000,
    minProfitPercent: parseFloat(document.getElementById('cfgMinProfit')?.value) || 0.3,
    minProfitTriangular: parseFloat(document.getElementById('cfgMinTriangular')?.value) || 0.2,
    tradingFeePercent: parseFloat(document.getElementById('cfgTradingFee')?.value) || 0.1,
    slippagePercent: parseFloat(document.getElementById('cfgSlippage')?.value) || 0.05,
    scanInterval: parseInt(document.getElementById('cfgInterval')?.value) || 15,
    exchanges: getSelectedExchanges(),
  };
}

function getSelectedExchanges() {
  const checked = document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked');
  return Array.from(checked).map(c => c.value);
}

function saveSettings() {
  const config = getConfig();
  localStorage.setItem('arb_config', JSON.stringify(config));
  if (engine) engine.updateConfig(config);

  // Reiniciar intervalo si está activo
  if (isScanning) {
    stopScanning();
    startScanning();
  }
  showToast('✓ Configuracion guardada');
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('arb_config');
    if (!saved) return;
    const config = JSON.parse(saved);
    if (config.investmentAmount) document.getElementById('cfgInvestment').value = config.investmentAmount;
    if (config.minProfitPercent) document.getElementById('cfgMinProfit').value = config.minProfitPercent;
    if (config.minProfitTriangular) document.getElementById('cfgMinTriangular').value = config.minProfitTriangular;
    if (config.tradingFeePercent) document.getElementById('cfgTradingFee').value = config.tradingFeePercent;
    if (config.slippagePercent) document.getElementById('cfgSlippage').value = config.slippagePercent;
    if (config.scanInterval) document.getElementById('cfgInterval').value = config.scanInterval;
  } catch {}
}

// ═══ STORAGE ═════════════════════════════════════════

function saveHistory() {
  try {
    localStorage.setItem('arb_history', JSON.stringify(history.slice(0, 100)));
  } catch {}
}

function loadHistory() {
  try {
    const saved = localStorage.getItem('arb_history');
    if (saved) history = JSON.parse(saved);
  } catch {}
}

function saveStats() {
  try {
    localStorage.setItem('arb_stats', JSON.stringify(stats));
  } catch {}
}

function clearHistory() {
  if (confirm('¿Borrar todo el historial?')) {
    history = [];
    localStorage.removeItem('arb_history');
    stats = { scans: 0, profitable: 0, bestScore: 0 };
    localStorage.removeItem('arb_stats');
    updateUI();
    showToast('Historial borrado');
  }
}

// ═══ TOAST ═══════════════════════════════════════════

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
