const metrics = {
  activeUsers: {
    label: 'Pengguna aktif',
    value: 251,
    baseline: 103,
    color: '#1a73e8'
  },
  totalEvents: {
    label: 'Jumlah peristiwa',
    value: 1100,
    baseline: 798,
    color: '#9334e6'
  },
  sessions: {
    label: 'Sesi',
    value: 270,
    baseline: 232,
    color: '#0f9d58'
  },
  views: {
    label: 'Tampilan',
    value: 382,
    baseline: 280,
    color: '#fbbc04'
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

const chartTitle = document.querySelector('[data-active-label]');
const realtimeValue = document.querySelector('[data-realtime]');
const realtimeSubtitle = document.querySelector('[data-realtime-subtitle]');
const realtimeBreakdown = document.querySelector('[data-realtime-breakdown]');
const realtimeBadge = document.querySelector('[data-realtime-label]');
const ctx = document.getElementById('trafficChart').getContext('2d');

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

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: timelineLabels,
    datasets: [
      {
        label: '30 hari terakhir',
        data: [],
        borderColor: metrics[activeMetric].color,
        backgroundColor: createGradient(metrics[activeMetric].color),
        fill: true,
        tension: 0,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointBorderColor: metrics[activeMetric].color
      },
      {
        label: 'Periode sebelumnya',
        data: [],
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

    const current = Math.max(0, metric.value || 0);
    const baseline = getBaselineValue(metric);

    if (!baseline) {
      element.textContent = '—';
      element.classList.remove('positive', 'negative');
      return;
    }

    const delta = ((current - baseline) / baseline) * 100;
    const formatter = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    const arrow = delta >= 0 ? '↑' : '↓';
    element.textContent = `${arrow} ${formatter.format(Math.abs(delta))}%`;
    element.classList.toggle('positive', delta >= 0);
    element.classList.toggle('negative', delta < 0);
  });
}

function updateRealtimeSection(metricKey = activeMetric) {
  const metric = metrics[metricKey];
  if (!metric) return;
  realtimeValue.textContent = '0';
  if (realtimeSubtitle) {
    realtimeSubtitle.textContent = `${metric.label.toUpperCase()} PER MENIT`;
  }
  if (realtimeBadge) {
    realtimeBadge.textContent = metric.label.toUpperCase();
  }
  if (realtimeBreakdown) {
    realtimeBreakdown.innerHTML = '<p class="realtime-empty">Tidak ada data</p>';
  }
}

function updateChart(metricKey = activeMetric) {
  activeMetric = metricKey;
  const series = buildSeries(metricKey);
  const color = metrics[metricKey].color;
  const mergedValues = [...series.current, ...series.previous];
  const yMax = determineYAxisMax(mergedValues);
  const stepSize = determineStepSize(yMax);

  chart.data.datasets[0].data = series.current;
  chart.data.datasets[0].borderColor = color;
  chart.data.datasets[0].pointBorderColor = color;
  chart.data.datasets[0].backgroundColor = createGradient(color);
  chart.data.datasets[1].data = series.previous;
  chart.data.datasets[1].borderColor = hexToRgba(color, 0.35);

  chart.options.scales.y.max = yMax;
  chart.options.scales.y.ticks.stepSize = stepSize;

  chart.update();
  chartTitle.textContent = `${metrics[metricKey].label} • 30 hari terakhir`;
  setActiveCard(metricKey);
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
      metrics[name].value = Math.max(0, Number(value) || 0);
      updatePercentages();
      if (name === activeMetric) {
        updateChart(name);
      } else {
        updateRealtimeSection(activeMetric);
      }
    });

    input.addEventListener('blur', event => {
      const { name } = event.target;
      if (!metrics[name]) return;
      event.target.value = metrics[name].value;
    });
  });
}

function init() {
  bindMetricCards();
  bindMetricInputs();
  updateCardDisplays();
  updatePercentages();
  updateChart(activeMetric);
}

init();
