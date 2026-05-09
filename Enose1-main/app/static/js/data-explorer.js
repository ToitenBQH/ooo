/**
 * E-Nose — Data Explorer page
 */

let currentPage = 1;
const PAGE_SIZE = 50;
let totalRows = 0;
let currentSessionId = null;

async function loadProjects() {
  const projects = await API.get('/api/projects/');
  const sel = document.getElementById('ex-proj-select');
  sel.innerHTML = '<option value="">-- Dự án --</option>';
  projects.forEach(p => sel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name}</option>`));
}

async function loadSessions(projectId) {
  const sessions = await API.get(`/api/sessions/?project_id=${projectId}`);
  const sel = document.getElementById('ex-sess-select');
  sel.innerHTML = '<option value="">-- Phiên đo --</option>';
  sessions.forEach(s => sel.insertAdjacentHTML('beforeend', `<option value="${s.id}">${s.name} · ${s.label || ''}</option>`));
}

async function loadData(page = 1) {
  if (!currentSessionId) return;
  currentPage = page;
  const offset = (page - 1) * PAGE_SIZE;

  const { total, rows } = await API.get(
    `/api/measurements/?session_id=${currentSessionId}&limit=${PAGE_SIZE}&offset=${offset}`
  );
  totalRows = total;
  renderTable(rows);
  renderPagination(total);
  document.getElementById('total-rows').textContent = `${total} bản ghi`;
}

function getSensorName(i) {
  return window.App.settings[`sensor${i+1}_name`] || `MQ-${i+1}`;
}

function renderTable(rows) {
  const tbody = document.getElementById('data-tbody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="15" style="text-align:center;color:var(--text-muted);padding:32px">Không có dữ liệu</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.timestamp?.slice(0,19).replace('T',' ') || ''}</td>
      ${[1,2,3,4,5,6,7].map(i => `<td>${r[`mq${i}`] != null ? parseFloat(r[`mq${i}`]).toFixed(2) : '--'}</td>`).join('')}
      <td>${r.temperature != null ? parseFloat(r.temperature).toFixed(1) : '--'}</td>
      <td>${r.humidity    != null ? parseFloat(r.humidity).toFixed(1)    : '--'}</td>
      <td>${r.pump_speed ?? '--'}</td>
      <td><span class="badge ${r.valve1 ? 'badge-success' : 'badge-muted'}">${r.valve1 ? 'ON' : 'OFF'}</span></td>
      <td><span class="badge ${r.valve2 ? 'badge-success' : 'badge-muted'}">${r.valve2 ? 'ON' : 'OFF'}</span></td>
    </tr>
  `).join('');
}

function renderPagination(total) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const pag = document.getElementById('pagination');
  if (!pag) return;
  pag.innerHTML = '';
  for (let i = 1; i <= Math.min(pages, 10); i++) {
    const btn = document.createElement('button');
    btn.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-ghost'}`;
    btn.textContent = i;
    btn.addEventListener('click', () => loadData(i));
    pag.appendChild(btn);
  }
}

function exportCSV() {
  if (!currentSessionId) { showToast('Chọn phiên đo trước', 'warning'); return; }
  window.location.href = `/api/measurements/export?session_id=${currentSessionId}`;
}

async function updateHeaderNames() {
  const headers = document.querySelectorAll('[data-sensor-header]');
  headers.forEach((th, i) => {
    if (i < 7) th.textContent = getSensorName(i);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProjects();
  setTimeout(updateHeaderNames, 400);

  document.getElementById('ex-proj-select')?.addEventListener('change', e => {
    if (e.target.value) loadSessions(e.target.value);
    currentSessionId = null;
  });

  document.getElementById('ex-sess-select')?.addEventListener('change', e => {
    currentSessionId = e.target.value ? parseInt(e.target.value) : null;
    if (currentSessionId) loadData(1);
  });

  document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
  document.getElementById('btn-refresh')?.addEventListener('click', () => loadData(currentPage));
});
