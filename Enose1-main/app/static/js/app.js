/**
 * E-Nose App — Core JS: Socket.IO connection, global state, toast
 */

// ---------- State ----------
window.App = {
  socket: null,
  settings: {},
  latestSensor: {},
  deviceState: { valve1: false, valve2: false, pump_speed: 0 },
  isConnected: false,
};

// ---------- Toast ----------
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> <span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(div);
  setTimeout(() => {
    div.style.animation = 'toastOut 0.3s ease forwards';
    div.addEventListener('animationend', () => div.remove());
  }, 3500);
}
window.showToast = showToast;

// ---------- Clock ----------
function updateClock() {
  const el = document.getElementById('topbar-time');
  if (el) el.textContent = new Date().toLocaleTimeString('vi-VN');
}
setInterval(updateClock, 1000);
updateClock();

// ---------- Sidebar active link ----------
function markActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
}

// ---------- Socket.IO ----------
function initSocket() {
  const socket = io('/live');
  window.App.socket = socket;

  socket.on('connect', () => {
    console.log('[Socket] Connected');
    updateConnectionBadge(true);
    window.App.isConnected = true;
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
    updateConnectionBadge(false);
    window.App.isConnected = false;
  });

  socket.on('sensor_data', (data) => {
    window.App.latestSensor = data;
    document.dispatchEvent(new CustomEvent('sensor_data', { detail: data }));
  });

  socket.on('serial_status', (data) => {
    const connected = data.status === 'connected';
    window.App.isConnected = connected;
    updateConnectionBadge(connected);
    document.dispatchEvent(new CustomEvent('serial_status', { detail: data }));
  });

  socket.on('pipeline_status', (data) => {
    document.dispatchEvent(new CustomEvent('pipeline_status', { detail: data }));
  });
}

function updateConnectionBadge(connected) {
  document.querySelectorAll('[data-com-status]').forEach(el => {
    if (connected) {
      el.className = 'dot dot-success pulse';
      el.dataset.comStatus = 'connected';
    } else {
      el.className = 'dot dot-danger';
      el.dataset.comStatus = 'disconnected';
    }
  });
  document.querySelectorAll('[data-com-label]').forEach(el => {
    el.textContent = connected ? 'Đã kết nối' : 'Chưa kết nối';
    el.style.color = connected ? 'var(--success)' : 'var(--danger)';
  });
}

// ---------- Load settings ----------
async function loadSettings() {
  try {
    const r = await fetch('/api/system/settings');
    if (r.ok) window.App.settings = await r.json();
  } catch (_) {}
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', async () => {
  markActiveNav();
  await loadSettings();
  if (typeof io !== 'undefined') initSocket();
});
