/**
 * E-Nose — Dashboard page JS
 * Real-time sensor cards + mini rolling line chart + radar chart
 */

const SENSOR_KEYS = ['mq1','mq2','mq3','mq4','mq5','mq6','mq7'];
let lineChart = null;
let radarChart = null;
let sampleCount = 0;

function getSensorName(i) {
  return window.App.settings[`sensor${i+1}_name`] || `MQ-${i+1}`;
}

function initDashboard() {
  const settings = window.App.settings;

  // Init line chart
  lineChart = Charts.createLineChart('dash-line-chart',
    [],
    SENSOR_KEYS.map((k, i) => ({ label: getSensorName(i), color: Charts.SENSOR_COLORS[i] })),
    { maxPoints: 60 }
  );

  // Init radar chart
  radarChart = Charts.createRadarChart('dash-radar-chart',
    SENSOR_KEYS.map((_, i) => getSensorName(i)),
    [0,0,0,0,0,0,0]
  );

  // Build legend for line chart
  const legend = document.getElementById('dash-legend');
  if (legend) {
    SENSOR_KEYS.forEach((k, i) => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `<span class="legend-dot" style="background:${Charts.SENSOR_COLORS[i]}"></span>${getSensorName(i)}`;
      item.addEventListener('click', () => {
        const ds = lineChart.data.datasets[i];
        ds.hidden = !ds.hidden;
        item.classList.toggle('hidden', ds.hidden);
        lineChart.update();
      });
      legend.appendChild(item);
    });
  }

  // Listen for sensor data
  document.addEventListener('sensor_data', (e) => {
    updateSensorCards(e.detail);
    updateCharts(e.detail);
  });

  // Load device state
  refreshDeviceState();
}

function updateSensorCards(data) {
  SENSOR_KEYS.forEach((key, i) => {
    const val = data[key];
    const card = document.getElementById(`sensor-card-${i}`);
    if (!card) return;
    card.querySelector('.sensor-value').textContent = val != null ? val.toFixed(2) : '--';
    // Animate bar (assume 0–4095 ADC range)
    const pct = Math.min(100, ((val || 0) / 4095) * 100);
    card.querySelector('.sensor-bar-fill').style.width = pct + '%';
  });

  // DHT11
  const tempEl = document.getElementById('val-temp');
  const humEl  = document.getElementById('val-hum');
  if (tempEl) tempEl.textContent = data.temperature != null ? data.temperature.toFixed(1) : '--';
  if (humEl)  humEl.textContent  = data.humidity    != null ? data.humidity.toFixed(1)    : '--';
}

function updateCharts(data) {
  sampleCount++;
  const label = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const values = SENSOR_KEYS.map(k => data[k] || 0);
  Charts.addDataPoint(lineChart, label, values);
  Charts.updateRadar(radarChart, values);
}

async function refreshDeviceState() {
  try {
    const s = await API.get('/api/device/state');
    window.App.deviceState = s;
    const v1 = document.getElementById('dash-v1');
    const v2 = document.getElementById('dash-v2');
    if (v1) v1.textContent = s.valve1 ? '🟢 ON' : '🔴 OFF';
    if (v2) v2.textContent = s.valve2 ? '🟢 ON' : '🔴 OFF';
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', initDashboard);
