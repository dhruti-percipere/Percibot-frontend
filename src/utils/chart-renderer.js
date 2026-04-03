import { CHARTJS_CDN, PALETTE } from './constants.js'

let chartJsPromise = null
const instances = new WeakMap()

function loadChartJs () {
  if (chartJsPromise) return chartJsPromise
  if (window.Chart) return Promise.resolve(window.Chart)

  chartJsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = CHARTJS_CDN
    s.async = true
    s.onload = () => resolve(window.Chart)
    s.onerror = () => reject(new Error('Failed to load Chart.js from CDN.'))
    document.head.appendChild(s)
  })

  return chartJsPromise
}

function fmt (n) {
  const v = Number(n)
  if (isNaN(v)) return String(n)
  const abs = Math.abs(v)
  if (abs >= 1e7) return (v / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr'
  if (abs >= 1e6) return (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (abs >= 1e3) return (v / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K'
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}

function norm (s) {
  return String(s || '').trim().toLowerCase()
}

function normaliseRows (rows, mapping) {
  if (!rows || !rows.length) return { rows: [], mapping }
  const sample = rows[0]
  const colMap = {}
  Object.keys(sample).forEach(k => { colMap[norm(k)] = k })

  const resolve = col => colMap[norm(col)] || col

  return {
    rows,
    mapping: {
      x: resolve(mapping.x),
      y: (mapping.y || []).map(resolve),
      color: mapping.color ? resolve(mapping.color) : null,
    },
  }
}

function buildDatasets (rows, mapping) {
  const { x: xCol, y: yCols, color: colorCol } = mapping

  if (!colorCol || !rows.some(r => r[colorCol] !== undefined)) {
    const labels = rows.map(r => r[xCol])
    const datasets = yCols.map((yCol, i) => ({
      label: yCol,
      data: rows.map(r => Number(r[yCol]) || 0),
      backgroundColor: PALETTE[i % PALETTE.length],
      borderColor: PALETTE[i % PALETTE.length],
      borderWidth: 2,
    }))
    return { labels, datasets }
  }

  const yCol = yCols[0]
  const labelsOrdered = []
  const labelSet = new Set()
  rows.forEach(r => {
    const lbl = String(r[xCol])
    if (!labelSet.has(lbl)) {
      labelsOrdered.push(lbl)
      labelSet.add(lbl)
    }
  })

  const groupsOrdered = []
  const groupSet = new Set()
  rows.forEach(r => {
    const g = String(r[colorCol])
    if (!groupSet.has(g)) {
      groupsOrdered.push(g)
      groupSet.add(g)
    }
  })

  const datasets = groupsOrdered.map((group, i) => {
    const groupRows = rows.filter(r => String(r[colorCol]) === group)
    const lookup = {}
    groupRows.forEach(r => { lookup[String(r[xCol])] = Number(r[yCol]) || 0 })

    return {
      label: group,
      data: labelsOrdered.map(lbl => lookup[lbl] ?? 0),
      backgroundColor: PALETTE[i % PALETTE.length],
      borderColor: PALETTE[i % PALETTE.length],
      borderWidth: 2,
    }
  })

  return { labels: labelsOrdered, datasets }
}

function tooltipConfig () {
  return {
    callbacks: {
      label (ctx) {
        const val = ctx.parsed.y ?? ctx.parsed
        return ` ${ctx.dataset.label}: ${fmt(val)}`
      },
    },
    backgroundColor: 'rgba(15,20,50,0.88)',
    titleColor: '#fff',
    bodyColor: '#d0d8f0',
    borderColor: 'rgba(100,130,255,0.2)',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    titleFont: { weight: 'bold', size: 12 },
    bodyFont: { size: 12 },
  }
}

function xTicks () {
  return {
    color: '#7a80a0',
    font: { size: 11 },
    maxRotation: 40,
    autoSkip: true,
    maxTicksLimit: 18,
  }
}

function yTicks () {
  return {
    callback: v => fmt(v),
    color: '#7a80a0',
    font: { size: 11 },
  }
}

function baseScaleTitle(text) {
  return {
    display: !!text,
    text: text || '',
    color: '#7a80a0',
    font: { size: 11 },
  }
}

function buildBarConfig({ labels, datasets }, spec) {
  return {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map(d => ({
        ...d,
        backgroundColor: d.backgroundColor + 'cc',
        hoverBackgroundColor: d.backgroundColor,
        borderRadius: 5,
        borderSkipped: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: '#4a5280', font: { size: 12 } } },
        tooltip: tooltipConfig(),
        title: { display: !!spec.title, text: spec.title, color: '#1a1f36', font: { size: 14, weight: 'bold' } },
      },
      scales: {
        x: { grid: { display: false }, ticks: xTicks(), title: baseScaleTitle(spec.x_axis_title) },
        y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: yTicks(), title: baseScaleTitle(spec.y_axis_title) },
      },
      animation: { duration: 500, easing: 'easeOutQuart' },
    },
  }
}

function buildLineConfig({ labels, datasets }, spec, area = false) {
  return {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((d, i) => ({
        ...d,
        fill: area,
        tension: area ? 0.4 : 0.35,
        pointRadius: area ? 3 : 4,
        pointHoverRadius: area ? 6 : 7,
        pointBackgroundColor: d.borderColor,
        backgroundColor: area ? PALETTE[i % PALETTE.length] + '30' : d.backgroundColor,
        borderColor: PALETTE[i % PALETTE.length],
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: '#4a5280', font: { size: 12 } } },
        tooltip: { ...tooltipConfig(), mode: 'index', intersect: false },
        title: { display: !!spec.title, text: spec.title, color: '#1a1f36', font: { size: 14, weight: 'bold' } },
      },
      scales: {
        x: { grid: { display: area ? false : undefined, color: 'rgba(0,0,0,.04)' }, ticks: xTicks(), title: baseScaleTitle(spec.x_axis_title) },
        y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: yTicks(), title: baseScaleTitle(spec.y_axis_title) },
      },
      hover: { mode: 'index', intersect: false },
      animation: { duration: 500, easing: 'easeOutQuart' },
    },
  }
}

function buildPieConfig({ labels, datasets }, spec) {
  const values = datasets[0] ? datasets[0].data : []
  const colors = labels.map((_, i) => PALETTE[i % PALETTE.length])

  return {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'cc'),
        hoverBackgroundColor: colors,
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#4a5280',
            font: { size: 12 },
            padding: 14,
            boxWidth: 14,
            boxHeight: 14,
          },
        },
        tooltip: {
          callbacks: {
            label (ctx) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) + '%' : '–'
              return ` ${ctx.label}: ${fmt(ctx.parsed)} (${pct})`
            },
          },
          backgroundColor: 'rgba(15,20,50,0.88)',
          titleColor: '#fff',
          bodyColor: '#d0d8f0',
          borderColor: 'rgba(100,130,255,0.2)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
        },
        title: {
          display: !!spec.title,
          text: spec.title,
          color: '#1a1f36',
          font: { size: 14, weight: 'bold' },
          padding: { bottom: 16 },
        },
      },
      animation: { animateRotate: true, duration: 600, easing: 'easeOutQuart' },
      cutout: '55%',
    },
  }
}

function makeConfig(type, builtData, spec) {
  switch (type) {
    case 'bar': return buildBarConfig(builtData, spec)
    case 'line': return buildLineConfig(builtData, spec, false)
    case 'area': return buildLineConfig(builtData, spec, true)
    case 'pie': return buildPieConfig(builtData, spec)
    default: throw new Error(`Unsupported chart_type "${type}".`)
  }
}

function injectShimmer(container) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px 20px;background:#f8f9fc;border-radius:10px;height:100%;">
      <div style="display:flex;align-items:flex-end;gap:6px;height:64px;width:80%;">
        ${[40,70,55,90,65,45,80].map((h, i) => `
          <div style="flex:1;border-radius:4px 4px 0 0;height:${h}%;background:linear-gradient(90deg,#e8ecf8 25%,#d0d6f0 50%,#e8ecf8 75%);background-size:300% 100%;animation:pbShimBar 1.4s ease-in-out infinite ${i * 0.1}s;"></div>
        `).join('')}
      </div>
      <style>
        @keyframes pbShimBar {
          0%,100% { opacity:.4 }
          50% { opacity:1 }
        }
      </style>
    </div>
  `
}

function showError(container, msg) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:9px;background:#fff7f7;border:1px solid #ffd5d5;font-size:12px;color:#9b3030;font-family:inherit;">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="10" cy="10" r="8"/>
        <line x1="10" y1="6" x2="10" y2="10"/>
        <circle cx="10" cy="14" r=".5" fill="currentColor"/>
      </svg>
      ${msg}
    </div>
  `
}

export async function renderChart(container, chartData) {
  if (!container || !chartData) return null

  const { chart_type, data_mapping, rows } = chartData
  if (!chart_type || !data_mapping || !rows || !rows.length) {
    showError(container, 'Chart data is incomplete or missing.')
    return null
  }

  const prev = instances.get(container)
  if (prev) {
    try { prev.destroy() } catch (_) {}
  }

  injectShimmer(container)

  let Chart
  try {
    Chart = await loadChartJs()
  } catch (_) {
    showError(container, 'Could not load chart library. Check your network connection.')
    return null
  }

  let normResult
  try {
    normResult = normaliseRows(rows, data_mapping)
  } catch (_) {
    showError(container, 'Failed to read chart data columns.')
    return null
  }

  let builtData
  try {
    builtData = buildDatasets(normResult.rows, normResult.mapping)
  } catch (err) {
    showError(container, `Chart data error: ${err.message}`)
    return null
  }

  let config
  try {
    config = makeConfig(chart_type, builtData, chartData)
  } catch (err) {
    showError(container, err.message)
    return null
  }

  container.innerHTML = ''
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'display:block; width:100%; height:100%;'
  container.appendChild(canvas)

  try {
    const instance = new Chart(canvas, config)
    instances.set(container, instance)
    return instance
  } catch (err) {
    showError(container, `Chart render failed: ${err.message}`)
    return null
  }
}

export function destroyChart(container) {
  const inst = instances.get(container)
  if (inst) {
    try { inst.destroy() } catch (_) {}
    instances.delete(container)
  }
}