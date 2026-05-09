/**
 * E-Nose — Automation Pipeline page
 */

const PIPELINE_STEPS = ['IDLE', 'PURGE', 'WAIT', 'SAMPLE', 'FLUSH'];

let pipelineRunning = false;

function updateStepUI(state, stepElapsed, stepTotal) {
  PIPELINE_STEPS.forEach((name, i) => {
    const el = document.getElementById(`step-${name}`);
    if (!el) return;
    el.classList.remove('active', 'done');
    const idx = PIPELINE_STEPS.indexOf(state);
    if (i < idx) el.classList.add('done');
    else if (i === idx && state !== 'IDLE') el.classList.add('active');
  });

  // Progress bar
  const bar = document.getElementById('pipeline-progress');
  if (bar && stepTotal > 0) {
    bar.style.width = `${Math.min(100, (stepElapsed / stepTotal) * 100)}%`;
  } else if (bar) {
    bar.style.width = '0%';
  }

  // Status label
  const lbl = document.getElementById('pipeline-state-label');
  if (lbl) lbl.textContent = state === 'IDLE' ? 'Chờ' : state;

  pipelineRunning = state !== 'IDLE';
  const btnStart = document.getElementById('btn-auto-start');
  const btnStop  = document.getElementById('btn-auto-stop');
  if (btnStart) btnStart.disabled = pipelineRunning;
  if (btnStop)  btnStop.disabled  = !pipelineRunning;
}

async function loadStatus() {
  try {
    const s = await API.get('/api/automation/status');
    updateStepUI(s.state, 0, 0);
  } catch (_) {}
}

async function loadProjects() {
  const projects = await API.get('/api/projects/');
  const sel = document.getElementById('auto-proj-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Chọn dự án --</option>';
  projects.forEach(p => sel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name}</option>`));
}

async function startPipeline() {
  const projectId = document.getElementById('auto-proj-select')?.value;
  if (!projectId) { showToast('Chọn dự án trước', 'warning'); return; }

  const cfg = {
    project_id:      parseInt(projectId),
    session_name:    document.getElementById('auto-sess-name')?.value || 'Auto Session',
    label:           document.getElementById('auto-sess-label')?.value || '',
    purge_duration:  parseInt(document.getElementById('auto-purge')?.value || 30),
    sample_delay:    parseInt(document.getElementById('auto-delay')?.value || 5),
    sample_duration: parseInt(document.getElementById('auto-sample')?.value || 60),
    flush_duration:  parseInt(document.getElementById('auto-flush')?.value || 20),
    pump_speed:      Math.round((parseInt(document.getElementById('auto-pump')?.value || 80) / 100) * 255),
  };

  try {
    const r = await API.post('/api/automation/start', cfg);
    if (r.ok) showToast('Pipeline đã khởi động', 'success');
    else showToast(r.message || 'Lỗi', 'error');
  } catch (e) { showToast('Lỗi kết nối', 'error'); }
}

async function stopPipeline() {
  try {
    await API.post('/api/automation/stop');
    showToast('Đã dừng pipeline', 'warning');
  } catch (e) { showToast('Lỗi', 'error'); }
}

document.addEventListener('DOMContentLoaded', () => {
  loadStatus();
  loadProjects();

  document.getElementById('btn-auto-start')?.addEventListener('click', startPipeline);
  document.getElementById('btn-auto-stop')?.addEventListener('click', stopPipeline);

  document.getElementById('auto-pump')?.addEventListener('input', e => {
    const el = document.getElementById('auto-pump-val');
    if (el) el.textContent = e.target.value;
  });

  document.addEventListener('pipeline_status', (e) => {
    const d = e.detail;
    updateStepUI(d.state, d.step_elapsed, d.step_total);
  });
});
