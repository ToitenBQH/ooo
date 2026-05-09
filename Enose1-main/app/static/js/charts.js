/**
 * E-Nose — Chart.js helper factory
 * Provides createLineChart, createRadarChart, addDataPoint, clearChart
 */

const SENSOR_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#38bdf8','#a855f7','#f97316'];

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 200 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      padding: 10,
      callbacks: {
        label: ctx => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}`
      }
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 11 } }
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: '#64748b', font: { size: 11 } }
    }
  }
};

function createLineChart(canvasId, labels, datasets, { maxPoints = 60 } = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ds = datasets.map((d, i) => ({
    label: d.label,
    data: d.data || [],
    borderColor: d.color || SENSOR_COLORS[i % SENSOR_COLORS.length],
    backgroundColor: 'transparent',
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.4,
    ...d.extra,
  }));
  const chart = new Chart(canvas, {
    type: 'line',
    data: { labels: labels || [], datasets: ds },
    options: { ...CHART_DEFAULTS, ...{ animation: false } },
  });
  chart._maxPoints = maxPoints;
  return chart;
}

function createRadarChart(canvasId, sensorLabels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  return new Chart(canvas, {
    type: 'radar',
    data: {
      labels: sensorLabels,
      datasets: [{
        label: 'Sensors',
        data: values,
        backgroundColor: 'rgba(99,102,241,0.2)',
        borderColor: '#6366f1',
        pointBackgroundColor: '#6366f1',
        borderWidth: 2,
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: { legend: { display: false } },
      scales: {
        r: {
          grid: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { color: '#94a3b8', font: { size: 11 } },
          ticks: { color: '#64748b', backdropColor: 'transparent', font: { size: 10 } },
          angleLines: { color: 'rgba(255,255,255,0.08)' },
        }
      }
    }
  });
}

function addDataPoint(chart, label, values) {
  if (!chart) return;
  chart.data.labels.push(label);
  chart.data.datasets.forEach((ds, i) => {
    ds.data.push(values[i] !== undefined ? values[i] : null);
  });
  if (chart.data.labels.length > chart._maxPoints) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds => ds.data.shift());
  }
  chart.update('none');
}

function clearChart(chart) {
  if (!chart) return;
  chart.data.labels = [];
  chart.data.datasets.forEach(ds => ds.data = []);
  chart.update();
}

function updateRadar(chart, values) {
  if (!chart) return;
  chart.data.datasets[0].data = values;
  chart.update('none');
}

window.Charts = { createLineChart, createRadarChart, addDataPoint, clearChart, updateRadar, SENSOR_COLORS };
