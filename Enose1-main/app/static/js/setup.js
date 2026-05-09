/**
 * E-Nose — Setup Wizard (3 steps)
 * Step 1: Select COM port + connect
 * Step 2: Name sensors, valves, pump
 * Step 3: Manual device test + finish
 */

let wizardStep = 1;

// ---- Navigation ----
function gotoStep(n) {
  document.querySelectorAll('.wizard-pane').forEach(el => el.classList.add('hidden'));
  document.getElementById(`wizard-step-${n}`)?.classList.remove('hidden');
  document.querySelectorAll('.wizard-step-dot').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i + 1 < n) el.classList.add('done');
    else if (i + 1 === n) el.classList.add('active');
  });
  wizardStep = n;
}

// ---- Step 1: COM Port ----
async function scanPorts() {
  const sel = document.getElementById('com-port-sel');
  sel.innerHTML = '<option>Đang quét…</option>';
  const ports = await API.get('/api/system/ports');
  sel.innerHTML = '<option value="">-- Chọn cổng COM --</option>';
  if (!ports.length) {
    sel.innerHTML += '<option disabled>Không tìm thấy cổng COM</option>';
    return;
  }
  ports.forEach(p => sel.insertAdjacentHTML('beforeend',
    `<option value="${p.port}">${p.port} — ${p.desc}</option>`));
}

async function testConnection() {
  const port = document.getElementById('com-port-sel').value;
  const baud = document.getElementById('baud-select').value;
  const btn  = document.getElementById('btn-connect');
  if (!port) { showToast('Chọn cổng COM', 'warning'); return; }

  btn.disabled = true;
  btn.textContent = 'Đang kết nối…';

  try {
    const r = await API.post('/api/system/connect', { port, baud: parseInt(baud) });
    if (r.ok) {
      showToast(`Kết nối thành công: ${port}`, 'success');
      document.getElementById('connect-status').innerHTML =
        `<span class="badge badge-success">✅ Đã kết nối ${port}</span>`;
      document.getElementById('btn-next-1').disabled = false;
    } else {
      showToast(r.message, 'error');
      document.getElementById('connect-status').innerHTML =
        `<span class="badge badge-danger">❌ ${r.message}</span>`;
    }
  } catch (e) {
    showToast('Lỗi kết nối', 'error');
  }
  btn.disabled = false;
  btn.textContent = 'Kết nối & Test';
}

// ---- Step 2: Load existing names ----
async function loadCurrentNames() {
  const s = await API.get('/api/system/settings');
  for (let i = 1; i <= 7; i++) {
    const el = document.getElementById(`sensor${i}-name`);
    if (el) el.value = s[`sensor${i}_name`] || `MQ-${i}`;
  }
  const v1 = document.getElementById('valve1-name-inp');
  const v2 = document.getElementById('valve2-name-inp');
  const pm = document.getElementById('pump-name-inp');
  if (v1) v1.value = s.valve1_name || 'Van Khí Trơ';
  if (v2) v2.value = s.valve2_name || 'Van Buồng Mẫu';
  if (pm) pm.value = s.pump_name   || 'Bơm Mẫu';
}

async function saveNames() {
  const data = {};
  for (let i = 1; i <= 7; i++) {
    const el = document.getElementById(`sensor${i}-name`);
    if (el) data[`sensor${i}_name`] = el.value.trim() || `Sensor ${i}`;
  }
  data.valve1_name = document.getElementById('valve1-name-inp')?.value.trim() || 'Van 1';
  data.valve2_name = document.getElementById('valve2-name-inp')?.value.trim() || 'Van 2';
  data.pump_name   = document.getElementById('pump-name-inp')?.value.trim()   || 'Bơm';
  await API.post('/api/system/settings', data);
}

// ---- Step 3: Manual test ----
async function toggleValveTest(valve) {
  const btn = document.getElementById(`test-valve${valve}-btn`);
  const isOn = btn.dataset.state === 'on';
  const newState = !isOn;
  try {
    const r = await API.post('/api/device/valve', { valve, state: newState });
    if (r.ok) {
      btn.dataset.state = newState ? 'on' : 'off';
      btn.textContent = newState ? `🟢 Van ${valve}: MỞ` : `⚫ Van ${valve}: ĐÓNG`;
      btn.className = newState ? 'btn btn-success' : 'btn btn-ghost';
    }
  } catch (e) { showToast('Lỗi điều khiển van', 'error'); }
}

function initLivePreview() {
  document.addEventListener('sensor_data', (e) => {
    const d = e.detail;
    const tbody = document.getElementById('test-sensor-tbody');
    if (!tbody) return;
    tbody.innerHTML = [1,2,3,4,5,6,7].map(i => {
      const name = document.getElementById(`sensor${i}-name`)?.value || `S${i}`;
      return `<tr>
        <td class="fw-500">${name}</td>
        <td class="text-primary fw-600">${d[`mq${i}`] != null ? parseFloat(d[`mq${i}`]).toFixed(2) : '--'}</td>
      </tr>`;
    }).join('') + `
      <tr><td>🌡️ Nhiệt độ</td><td class="text-warning fw-600">${d.temperature != null ? parseFloat(d.temperature).toFixed(1) + ' °C' : '--'}</td></tr>
      <tr><td>💧 Độ ẩm</td>  <td class="text-info fw-600">${d.humidity != null ? parseFloat(d.humidity).toFixed(1) + ' %' : '--'}</td></tr>
    `;
  });
}

async function finishSetup() {
  await API.post('/api/system/settings', { setup_done: '1' });
  showToast('Cài đặt hoàn tất! Đang chuyển đến Dashboard…', 'success');
  setTimeout(() => window.location.href = '/', 1200);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  gotoStep(1);
  scanPorts();
  loadCurrentNames();
  initLivePreview();

  document.getElementById('btn-scan-ports')?.addEventListener('click', scanPorts);
  document.getElementById('btn-connect')?.addEventListener('click', testConnection);

  document.getElementById('btn-next-1')?.addEventListener('click', () => gotoStep(2));
  document.getElementById('btn-back-2')?.addEventListener('click', () => gotoStep(1));

  document.getElementById('btn-next-2')?.addEventListener('click', async () => {
    await saveNames();
    gotoStep(3);
  });
  document.getElementById('btn-back-3')?.addEventListener('click', () => gotoStep(2));

  document.getElementById('test-valve1-btn')?.addEventListener('click', () => toggleValveTest(1));
  document.getElementById('test-valve2-btn')?.addEventListener('click', () => toggleValveTest(2));

  let debounce;
  document.getElementById('test-pump-slider')?.addEventListener('input', e => {
    const pct = e.target.value;
    document.getElementById('test-pump-val').textContent = pct;
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const speed = Math.round((parseInt(pct) / 100) * 255);
      await API.post('/api/device/pump', { speed });
    }, 300);
  });

  document.getElementById('btn-finish-setup')?.addEventListener('click', finishSetup);
  document.getElementById('btn-skip-setup')?.addEventListener('click', finishSetup);
});
