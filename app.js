const metrics = {
  activeUsers: {
    label: 'Pengguna aktif',
    value: 251,
    baseline: 103,
    color: '#1a73e8',
    change: 0,
    trend: 'up'
  },
  totalEvents: {
    label: 'Jumlah peristiwa',
    value: 1100,
    baseline: 798,
    color: '#9334e6',
    change: 0,
    trend: 'up'
  },
  sessions: {
    label: 'Sesi',
    value: 270,
    baseline: 232,
    color: '#0f9d58',
    change: 0,
    trend: 'up'
  },
  views: {
    label: 'Tampilan',
    value: 382,
    baseline: 280,
    color: '#fbbc04',
    change: 0,
    trend: 'up'
  }
};

const timelineLabels = [
  '17 Sep',
  '20 Sep',
  '23 Sep',
  '26 Sep',
  '29 Sep',
  '02 Okt',
  '05 Okt',
  '08 Okt',
  '11 Okt',
  '14 Okt',
  '17 Okt',
  '20 Okt',
  '23 Okt',
  '26 Okt',
  '29 Okt'
];

let activeMetric = 'activeUsers';
const metricSeries = {};

const chartTitle = document.querySelector('[data-active-label]');
const realtimeValue = document.querySelector('[data-realtime]');
const realtimeSubtitle = document.querySelector('[data-realtime-subtitle]');
const realtimeBreakdown = document.querySelector('[data-realtime-breakdown]');
const realtimeBadge = document.querySelector('[data-realtime-label]');
const ctx = document.getElementById('trafficChart').getContext('2d');

initializeSeries();
Object.keys(metrics).forEach(key => {
  rescaleSeriesToMatchValue(key, metrics[key].value);
});

function hexToRgba(hex, alpha = 1) {
  const value = hex.replace('#', '');
  const bigint = parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createGradient(color) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, hexToRgba(color, 0.28));
  gradient.addColorStop(1, hexToRgba(color, 0));
  return gradient;
}

function hashValue(value, salt = '') {
  const saltValue = Array.from(String(salt)).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const raw = Math.sin((value + 1) * 0.011 + saltValue * 0.17) * 10000;
  const fractional = raw - Math.floor(raw);
  return fractional < 0 ? fractional + 1 : fractional;
}

function createDynamicProfile(total, salt = '') {
  const points = timelineLabels.length;
  if (!points) return [];

  const normalized = Math.min(total / 1500, 1);
  const hash = hashValue(total || 1, salt);
  const amplitude = 0.25 + normalized * 0.4 + hash * 0.2;
  const phase = hash * Math.PI * 2;
  const frequency = 0.9 + hash * 0.7;
  const slopeBoost = 0.3 + normalized * 0.5;

  return timelineLabels.map((_, index) => {
    const progress = index / (points - 1 || 1);
    const wave = Math.sin(progress * Math.PI * frequency + phase) * amplitude;
    const noiseSeed = Math.sin((index + 1) * (hash + 1.3));
    const noise = ((noiseSeed + 1) / 2) * 0.12;
    const rise = progress * slopeBoost;
    return Math.max(0.02, 0.05 + rise + wave + noise);
  });
}

function getBaselineValue(metric) {
  if (!metric) return 0;
  if (typeof metric.baseline === 'number') {
    return Math.max(0, metric.baseline);
  }
  return Math.max(0, metric.value * 0.65);
}

function buildSeries(metricKey) {
  const metric = metrics[metricKey];
  if (!metric) {
    return { current: [], previous: [] };
  }

  const total = Math.max(0, metric.value || 0);
  const baseline = getBaselineValue(metric);
  const currentProfile = createDynamicProfile(total, metricKey);
  const previousProfile = createDynamicProfile(baseline, `${metricKey}-baseline`);
  const current = currentProfile.map(point => Number((point * total).toFixed(2)));
  const previous = previousProfile.map(point => Number((point * baseline).toFixed(2)));
  return { current, previous };
}

function initializeSeries() {
  Object.keys(metrics).forEach(key => {
    metricSeries[key] = buildSeries(key);
  });
}

function getSeries(metricKey) {
  if (!metricSeries[metricKey]) {
    metricSeries[metricKey] = buildSeries(metricKey);
  }
  return metricSeries[metricKey];
}

function calculateAverage(values = []) {
  if (!values.length) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function updateMetricInputValue(metricKey) {
  const input = document.querySelector(`.metric-value-input[name="${metricKey}"]`);
  if (input) {
    input.value = metrics[metricKey].value;
  }
}

function syncMetricValueWithSeries(metricKey) {
  const series = getSeries(metricKey);
  const average = Math.round(calculateAverage(series.current));
  metrics[metricKey].value = Number.isFinite(average) ? average : 0;
  updateMetricInputValue(metricKey);
}

function rescaleSeriesToMatchValue(metricKey, targetValue) {
  const series = getSeries(metricKey);
  const average = calculateAverage(series.current);
  if (!average) {
    const fallback = buildSeries(metricKey);
    series.current.length = 0;
    fallback.current.forEach(point => series.current.push(point));
    series.previous.length = 0;
    fallback.previous.forEach(point => series.previous.push(point));
    return;
  }
  const ratio = targetValue / average;
  for (let i = 0; i < series.current.length; i += 1) {
    const scaled = Math.max(0, series.current[i] * ratio);
    series.current[i] = Number(scaled.toFixed(2));
  }
}

function refreshChartScale(metricKey) {
  if (!chart) return;
  const series = getSeries(metricKey);
  const mergedValues = [...series.current, ...series.previous];
  const yMax = determineYAxisMax(mergedValues);
  chart.options.scales.y.max = yMax;
  chart.options.scales.y.ticks.stepSize = determineStepSize(yMax);
}

function determineYAxisMax(values) {
  const rawMax = Math.max(...values, 0);
  const fallback = rawMax || 120;
  return Math.ceil(fallback / 10) * 10;
}

function determineStepSize(maxValue) {
  const safeMax = Math.max(10, maxValue || 0);
  const desiredTicks = 5;
  const rawStep = safeMax / desiredTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let chosen;
  if (normalized <= 1) chosen = 1;
  else if (normalized <= 2) chosen = 2;
  else if (normalized <= 5) chosen = 5;
  else chosen = 10;
  return Math.max(10, chosen * magnitude);
}

const initialSeries = getSeries(activeMetric);

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: timelineLabels,
    datasets: [
      {
        label: '30 hari terakhir',
        data: initialSeries.current,
        borderColor: metrics[activeMetric].color,
        backgroundColor: createGradient(metrics[activeMetric].color),
        fill: true,
        tension: 0,
        cubicInterpolationMode: 'default',
        borderWidth: 2,
        borderCapStyle: 'butt',
        borderJoinStyle: 'miter',
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointBorderColor: metrics[activeMetric].color
      },
      {
        label: 'Periode sebelumnya',
        data: initialSeries.previous,
        borderColor: hexToRgba(metrics[activeMetric].color, 0.35),
        borderDash: [6, 6],
        borderWidth: 2,
        fill: false,
        tension: 0,
        pointRadius: 0
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        position: 'right',
        beginAtZero: true,
        min: 0,
        max: 150,
        grid: {
          color: '#eef0fb',
          drawBorder: false
        },
        ticks: {
          color: '#7a7d9c',
          stepSize: 20,
          maxTicksLimit: 5
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#7a7d9c',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#13152c',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        displayColors: false,
        callbacks: {
          label(context) {
            const value = new Intl.NumberFormat('id-ID').format(context.parsed.y || 0);
            return `${context.dataset.label}: ${value}`;
          }
        }
      }
    }
  }
});

enableChartDragging();

function enableChartDragging() {
  const canvas = chart.canvas ?? chart.ctx?.canvas;
  if (!canvas) return;
  let dragIndex = null;

  function nearestPointIndex(evt) {
    const points = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
    if (!points.length) return null;
    const point = points[0];
    if (point.datasetIndex !== 0) return null;
    return point.index;
  }

  function applyDrag(evt) {
    const series = getSeries(activeMetric);
    const yScale = chart.scales.y;
    if (!series || !yScale) return;
    const value = yScale.getValueForPixel(evt.offsetY);
    const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
    series.current[dragIndex] = Number(safeValue.toFixed(2));
    refreshChartScale(activeMetric);
    chart.update('none');
    syncMetricValueWithSeries(activeMetric);
    updateRealtimeSection(activeMetric);
  }

  canvas.addEventListener('pointerdown', evt => {
    const pointIndex = nearestPointIndex(evt);
    if (pointIndex === null) return;
    dragIndex = pointIndex;
    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(evt.pointerId);
    }
    canvas.style.cursor = 'grabbing';
    evt.preventDefault();
  });

  canvas.addEventListener('pointermove', evt => {
    const pointIndex = nearestPointIndex(evt);
    const isInteractive = pointIndex !== null;
    canvas.style.cursor = dragIndex !== null ? 'grabbing' : isInteractive ? 'grab' : 'default';
    if (dragIndex === null) return;
    applyDrag(evt);
  });

  ['pointerup', 'pointerleave', 'pointercancel'].forEach(eventName => {
    canvas.addEventListener(eventName, evt => {
      if (canvas.hasPointerCapture?.(evt.pointerId) && canvas.releasePointerCapture) {
        canvas.releasePointerCapture(evt.pointerId);
      }
      dragIndex = null;
      canvas.style.cursor = 'default';
    });
  });
}

function setActiveCard(metricKey) {
  document.querySelectorAll('.metric-card').forEach(card => {
    const isActive = card.dataset.metric === metricKey;
    card.classList.toggle('active', isActive);
    card.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function updateCardDisplays() {
  document.querySelectorAll('.metric-value-input').forEach(input => {
    const key = input.name;
    if (!metrics[key]) return;
    input.value = metrics[key].value;
  });
}

function updatePercentages() {
  document.querySelectorAll('[data-change]').forEach(element => {
    const key = element.dataset.change;
    const metric = metrics[key];
    if (!metric) return;

    const delta = Number(metric.change) || 0;
    const trend = metric.trend || 'flat';
    const trendInput = element.querySelector('[data-trend-input]');
    if (trendInput && document.activeElement !== trendInput) {
      trendInput.value = trend;
    }
    const percentInput = element.querySelector('[data-change-input]');
    if (percentInput && document.activeElement !== percentInput) {
      percentInput.value = delta;
    }
    element.classList.toggle('positive', trend === 'up');
    element.classList.toggle('negative', trend === 'down');
    element.classList.toggle('neutral', trend !== 'up' && trend !== 'down');
  });
}

function updateRealtimeSection() {
  if (realtimeValue) {
    realtimeValue.textContent = '0';
  }
  if (realtimeSubtitle) {
    realtimeSubtitle.textContent = 'PENGGUNA AKTIF PER MENIT';
  }
  if (realtimeBadge) {
    realtimeBadge.textContent = 'PENGGUNA AKTIF';
  }
  if (realtimeBreakdown) {
    realtimeBreakdown.innerHTML = '<p class="realtime-empty">Tidak ada data</p>';
  }
}

function updateChart(metricKey = activeMetric) {
  activeMetric = metricKey;
  const series = getSeries(metricKey);
  const color = metrics[metricKey].color;
  chart.data.datasets[0].data = series.current;
  chart.data.datasets[0].borderColor = color;
  chart.data.datasets[0].pointBorderColor = color;
  chart.data.datasets[0].backgroundColor = createGradient(color);
  chart.data.datasets[1].data = series.previous;
  chart.data.datasets[1].borderColor = hexToRgba(color, 0.35);
  refreshChartScale(metricKey);
  chart.update();
  chartTitle.textContent = `${metrics[metricKey].label} • 30 hari terakhir`;
  setActiveCard(metricKey);
  syncMetricValueWithSeries(metricKey);
  updateRealtimeSection(metricKey);
}

function bindMetricCards() {
  document.querySelectorAll('.metric-card').forEach(card => {
    card.addEventListener('click', () => {
      updateChart(card.dataset.metric);
    });
  });
}

function bindMetricInputs() {
  document.querySelectorAll('.metric-value-input').forEach(input => {
    input.addEventListener('input', event => {
      const { name, value } = event.target;
      if (!metrics[name]) return;
      const numericValue = Math.max(0, Number(value) || 0);
      metrics[name].value = numericValue;
      rescaleSeriesToMatchValue(name, numericValue);
      if (name === activeMetric) {
        refreshChartScale(name);
        chart.update('none');
        updateRealtimeSection(name);
      }
    });

    input.addEventListener('blur', event => {
      const { name } = event.target;
      if (!metrics[name]) return;
      event.target.value = metrics[name].value;
    });
  });
}

function bindPercentageInputs() {
  document.querySelectorAll('[data-change-input]').forEach(input => {
    input.addEventListener('input', event => {
      const key = event.target.dataset.changeInput;
      if (!metrics[key]) return;
      const rawValue = event.target.value.trim();
      if (rawValue === '' || rawValue === '-' || rawValue === '+') {
        return;
      }
      const parsed = Number(rawValue);
      if (Number.isNaN(parsed)) {
        return;
      }
      metrics[key].change = parsed;
      updatePercentages();
    });

    input.addEventListener('blur', event => {
      const key = event.target.dataset.changeInput;
      if (!metrics[key]) return;
      const parsed = Number(event.target.value);
      if (Number.isNaN(parsed)) {
        event.target.value = metrics[key].change || 0;
      }
    });
  });
}

function bindTrendInputs() {
  document.querySelectorAll('[data-trend-input]').forEach(select => {
    select.addEventListener('change', event => {
      const key = event.target.dataset.trendInput;
      if (!metrics[key]) return;
      const nextTrend = event.target.value === 'down' ? 'down' : 'up';
      metrics[key].trend = nextTrend;
      event.target.value = nextTrend;
      updatePercentages();
    });
  });
}

function init() {
  bindMetricCards();
  bindMetricInputs();
  bindPercentageInputs();
  bindTrendInputs();
  updateCardDisplays();
  updatePercentages();
  updateChart(activeMetric);
}

init();
