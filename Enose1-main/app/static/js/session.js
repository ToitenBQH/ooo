/**
 * E-Nose — Session Recording page
 */

let sessionChart = null;
let currentSessionId = null;
let recordingTimer = null;
let recordingElapsed = 0;
const SENSOR_KEYS = ['mq1','mq2','mq3','mq4','mq5','mq6','mq7'];

function getSensorName(i) {
  return window.App.settings[`sensor${i+1}_name`] || `MQ-${i+1}`;
}

async function loadProjects() {
  const projects = await API.get('/api/projects/');
  const sel = document.getElementById('proj-select');
  sel.innerHTML = '<option value="">-- Chọn dự án --</option>';
  projects.forEach(p => {
    sel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name}</option>`);
  });
}

async function loadSessions(projectId) {
  const sessions = await API.get(`/api/sessions/?project_id=${projectId}`);
  const list = document.getElementById('session-list');
  if (!list) return;
  list.innerHTML = '';
  sessions.forEach(s => {
    const badge = s.status === 'recording' ? 'badge-warning' :
                  s.status === 'completed' ? 'badge-success' : 'badge-muted';
    list.insertAdjacentHTML('beforeend', `
      <div class="session-row" data-sid="${s.id}">
        <div>
          <div class="fw-500">${s.name}</div>
          <div class="fs-12 text-muted">${s.label || ''} · ${s.created_at?.slice(0,16) || ''}</div>
        </div>
        <span class="badge ${badge}">${s.status}</span>
      </div>
    `);
  });
  list.querySelectorAll('.session-row').forEach(row => {
    row.addEventListener('click', () => selectSession(parseInt(row.dataset.sid)));
  });
}

async function selectSession(sid) {
  currentSessionId = sid;
  const s = await API.get(`/api/sessions/${sid}`);
  document.getElementById('sess-name-display').textContent = s.name;
  document.getElementById('sess-label-display').textContent = s.label || 'Chưa có nhãn';
  document.getElementById('sess-status-badge').textContent = s.status;

  // Reset chart
  if (sessionChart) { Charts.clearChart(sessionChart); }
  else {
    sessionChart = Charts.createLineChart('session-chart', [],
      SENSOR_KEYS.map((k,i) => ({ label: getSensorName(i), color: Charts.SENSOR_COLORS[i] })),
      { maxPoints: 300 }
    );
  }

  // Update button state
  const isRecording = s.status === 'recording';
  document.getElementById('btn-start-rec').disabled = isRecording;
  document.getElementById('btn-stop-rec').disabled = !isRecording;

  if (isRecording) {
    // Tell socket which session to save to
    window.App.socket?.emit('set_active_session', { session_id: sid }, { namespace: '/live' });
    startTimer();
  }
}

async function createSession() {
  const projId = document.getElementById('proj-select').value;
  const name   = document.getElementById('new-sess-name').value.trim();
  const label  = document.getElementById('new-sess-label').value.trim();
  if (!projId || !name) { showToast('Chọn dự án và nhập tên phiên', 'warning'); return; }
  const r = await API.post('/api/sessions/', { project_id: parseInt(projId), name, label });
  showToast('Đã tạo phiên đo', 'success');
  await loadSessions(projId);
  selectSession(r.id);
}

async function startRecording() {
  if (!currentSessionId) return;
  await API.post(`/api/sessions/${currentSessionId}/start`);
  window.App.socket?.emit('set_active_session', { session_id: currentSessionId }, { namespace: '/live' });
  document.getElementById('btn-start-rec').disabled = true;
  document.getElementById('btn-stop-rec').disabled = false;
  startTimer();
  showToast('Bắt đầu ghi dữ liệu', 'success');
}

async function stopRecording() {
  if (!currentSessionId) return;
  await API.post(`/api/sessions/${currentSessionId}/stop`);
  window.App.socket?.emit('set_active_session', { session_id: null }, { namespace: '/live' });
  document.getElementById('btn-start-rec').disabled = false;
  document.getElementById('btn-stop-rec').disabled = true;
  stopTimer();
  showToast('Đã dừng ghi dữ liệu', 'success');
}

function startTimer() {
  recordingElapsed = 0;
  stopTimer();
  recordingTimer = setInterval(() => {
    recordingElapsed++;
    const h = String(Math.floor(recordingElapsed/3600)).padStart(2,'0');
    const m = String(Math.floor((recordingElapsed%3600)/60)).padStart(2,'0');
    const s = String(recordingElapsed%60).padStart(2,'0');
    const el = document.getElementById('rec-timer');
    if (el) el.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProjects();

  document.getElementById('proj-select')?.addEventListener('change', e => {
    if (e.target.value) loadSessions(e.target.value);
  });

  document.getElementById('btn-create-sess')?.addEventListener('click', createSession);
  document.getElementById('btn-start-rec')?.addEventListener('click', startRecording);
  document.getElementById('btn-stop-rec')?.addEventListener('click', stopRecording);

  // Live data → chart
  document.addEventListener('sensor_data', (e) => {
    const data = e.detail;
    const label = new Date().toLocaleTimeString('vi-VN');
    Charts.addDataPoint(sessionChart, label, SENSOR_KEYS.map(k => data[k] || 0));
  });
});
