/**
 * E-Nose — Control Panel page
 */

let deviceState = { valve1: false, valve2: false, pump_speed: 0 };

async function loadState() {
  try {
    deviceState = await API.get('/api/device/state');
    renderState();
  } catch (_) { showToast('Không thể tải trạng thái thiết bị', 'error'); }
}

function renderState() {
  // Valves
  [1, 2].forEach(v => {
    const toggle = document.getElementById(`valve${v}-toggle`);
    const label  = document.getElementById(`valve${v}-label`);
    const card   = document.getElementById(`valve${v}-card`);
    const on = deviceState[`valve${v}`];
    if (toggle) toggle.className = `toggle ${on ? 'on' : ''}`;
    if (label)  label.textContent = on ? 'ĐANG MỞ' : 'ĐÓNG';
    if (card)   card.className = `device-card ${on ? 'on' : ''}`;
  });

  // Pump
  const pumpPct = Math.round((deviceState.pump_speed / 255) * 100);
  const slider = document.getElementById('pump-slider');
  const valEl  = document.getElementById('pump-val');
  if (slider) slider.value = pumpPct;
  if (valEl)  valEl.textContent = pumpPct;
}

async function toggleValve(valve) {
  const newState = !deviceState[`valve${valve}`];
  try {
    const r = await API.post('/api/device/valve', { valve, state: newState });
    if (r.ok) {
      deviceState[`valve${valve}`] = newState;
      renderState();
      showToast(`${getValveName(valve)}: ${newState ? 'MỞ' : 'ĐÓNG'}`, newState ? 'success' : 'warning');
    }
  } catch (e) { showToast('Lỗi điều khiển van', 'error'); }
}

async function setPumpSpeed(pct) {
  const speed = Math.round((pct / 100) * 255);
  try {
    const r = await API.post('/api/device/pump', { speed });
    if (r.ok) {
      deviceState.pump_speed = speed;
      document.getElementById('pump-val').textContent = pct;
    }
  } catch (e) { showToast('Lỗi điều khiển bơm', 'error'); }
}

async function sendRaw() {
  const cmd = document.getElementById('raw-cmd').value.trim();
  if (!cmd) return;
  try {
    const r = await API.post('/api/device/command', { command: cmd });
    const log = document.getElementById('cmd-log');
    if (log) log.insertAdjacentHTML('afterbegin',
      `<div class="log-line"><span class="text-muted fs-12">${new Date().toLocaleTimeString('vi-VN')}</span> → <span class="text-primary">${cmd}</span> ${r.ok ? '✅' : '❌'}</div>`
    );
  } catch (e) { showToast('Lỗi gửi lệnh', 'error'); }
}

function getValveName(v) {
  return window.App.settings[`valve${v}_name`] || `Van ${v}`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();

  document.getElementById('valve1-toggle')?.addEventListener('click', () => toggleValve(1));
  document.getElementById('valve2-toggle')?.addEventListener('click', () => toggleValve(2));

  let pumpDebounce;
  document.getElementById('pump-slider')?.addEventListener('input', e => {
    document.getElementById('pump-val').textContent = e.target.value;
    clearTimeout(pumpDebounce);
    pumpDebounce = setTimeout(() => setPumpSpeed(parseInt(e.target.value)), 300);
  });

  document.getElementById('btn-send-raw')?.addEventListener('click', sendRaw);
  document.getElementById('raw-cmd')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendRaw();
  });

  // Update device labels with settings
  setTimeout(() => {
    const s = window.App.settings;
    const v1n = document.getElementById('valve1-name');
    const v2n = document.getElementById('valve2-name');
    const pn  = document.getElementById('pump-name');
    if (v1n) v1n.textContent = s.valve1_name || 'Van 1';
    if (v2n) v2n.textContent = s.valve2_name || 'Van 2';
    if (pn)  pn.textContent  = s.pump_name   || 'Bơm';
  }, 300);
});
