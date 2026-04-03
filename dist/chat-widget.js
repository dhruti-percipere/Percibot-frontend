(() => {
  // src/utils/constants.js
  var BACKEND_URL = "https://percibot.cfapps.us10-001.hana.ondemand.com";
  var CRYPTO_KEY = "percibot-default-key";
  var REQUEST_SOURCE = "sac_widget";
  var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  var ACCEPTED_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  var CHARTJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
  var PALETTE = [
    "#3A86FF",
    "#FF6B6B",
    "#06D6A0",
    "#FFD166",
    "#8338EC",
    "#FF9F1C",
    "#2EC4B6",
    "#E63946",
    "#457B9D",
    "#A8DADC",
    "#C77DFF",
    "#80B918"
  ];
  var ICONS = {
    plus: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
           <line x1="10" y1="3" x2="10" y2="17"/><line x1="3" y1="10" x2="17" y2="10"/>
         </svg>`,
    clip: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
           <path d="M17 10.5L9.5 18a5 5 0 0 1-7.07-7.07l8-8a3.33 3.33 0 0 1 4.71 4.71L7.41 15.41a1.67 1.67 0 0 1-2.36-2.36l7.07-7.07"/>
         </svg>`,
    globe: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="10" r="8"/>
            <path d="M2 10h16M10 2a13 13 0 0 1 0 16M10 2a13 13 0 0 0 0 16"/>
          </svg>`,
    send: `<svg viewBox="0 0 20 20" fill="currentColor">
           <path d="M3.1 3.1a1 1 0 0 1 1.09-.24l13 5a1 1 0 0 1 0 1.87l-13 5a1 1 0 0 1-1.33-1.33L4.9 10 2.86 4.44a1 1 0 0 1 .24-1.34z"/>
         </svg>`,
    clear: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 17 6"/><path d="M8 6V4h4v2"/><path d="M9 9l.01 6M11 9l.01 6"/>
            <path d="M5 6l1 11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-11"/>
          </svg>`
  };

  // src/utils/crypto.js
  function xorEncrypt(plainText) {
    const enc = new TextEncoder();
    const ptB = enc.encode(plainText);
    const keyB = enc.encode(CRYPTO_KEY);
    const x = ptB.map((b, i) => b ^ keyB[i % keyB.length]);
    return btoa(String.fromCharCode(...x)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  // src/utils/chart-renderer.js
  var chartJsPromise = null;
  var instances = /* @__PURE__ */ new WeakMap();
  function loadChartJs() {
    if (chartJsPromise) return chartJsPromise;
    if (window.Chart) return Promise.resolve(window.Chart);
    chartJsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = CHARTJS_CDN;
      s.async = true;
      s.onload = () => resolve(window.Chart);
      s.onerror = () => reject(new Error("Failed to load Chart.js from CDN."));
      document.head.appendChild(s);
    });
    return chartJsPromise;
  }
  function fmt(n) {
    const v = Number(n);
    if (isNaN(v)) return String(n);
    const abs = Math.abs(v);
    if (abs >= 1e7) return (v / 1e7).toFixed(2).replace(/\.?0+$/, "") + " Cr";
    if (abs >= 1e6) return (v / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    if (abs >= 1e3) return (v / 1e3).toFixed(1).replace(/\.?0+$/, "") + "K";
    return v % 1 === 0 ? String(v) : v.toFixed(2);
  }
  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }
  function normaliseRows(rows, mapping) {
    if (!rows || !rows.length) return { rows: [], mapping };
    const sample = rows[0];
    const colMap = {};
    Object.keys(sample).forEach((k) => {
      colMap[norm(k)] = k;
    });
    const resolve = (col) => colMap[norm(col)] || col;
    return {
      rows,
      mapping: {
        x: resolve(mapping.x),
        y: (mapping.y || []).map(resolve),
        color: mapping.color ? resolve(mapping.color) : null
      }
    };
  }
  function buildDatasets(rows, mapping) {
    const { x: xCol, y: yCols, color: colorCol } = mapping;
    if (!colorCol || !rows.some((r) => r[colorCol] !== void 0)) {
      const labels = rows.map((r) => r[xCol]);
      const datasets2 = yCols.map((yCol2, i) => ({
        label: yCol2,
        data: rows.map((r) => Number(r[yCol2]) || 0),
        backgroundColor: PALETTE[i % PALETTE.length],
        borderColor: PALETTE[i % PALETTE.length],
        borderWidth: 2
      }));
      return { labels, datasets: datasets2 };
    }
    const yCol = yCols[0];
    const labelsOrdered = [];
    const labelSet = /* @__PURE__ */ new Set();
    rows.forEach((r) => {
      const lbl = String(r[xCol]);
      if (!labelSet.has(lbl)) {
        labelsOrdered.push(lbl);
        labelSet.add(lbl);
      }
    });
    const groupsOrdered = [];
    const groupSet = /* @__PURE__ */ new Set();
    rows.forEach((r) => {
      const g = String(r[colorCol]);
      if (!groupSet.has(g)) {
        groupsOrdered.push(g);
        groupSet.add(g);
      }
    });
    const datasets = groupsOrdered.map((group, i) => {
      const groupRows = rows.filter((r) => String(r[colorCol]) === group);
      const lookup = {};
      groupRows.forEach((r) => {
        lookup[String(r[xCol])] = Number(r[yCol]) || 0;
      });
      return {
        label: group,
        data: labelsOrdered.map((lbl) => {
          var _a;
          return (_a = lookup[lbl]) != null ? _a : 0;
        }),
        backgroundColor: PALETTE[i % PALETTE.length],
        borderColor: PALETTE[i % PALETTE.length],
        borderWidth: 2
      };
    });
    return { labels: labelsOrdered, datasets };
  }
  function tooltipConfig() {
    return {
      callbacks: {
        label(ctx) {
          var _a;
          const val = (_a = ctx.parsed.y) != null ? _a : ctx.parsed;
          return ` ${ctx.dataset.label}: ${fmt(val)}`;
        }
      },
      backgroundColor: "rgba(15,20,50,0.88)",
      titleColor: "#fff",
      bodyColor: "#d0d8f0",
      borderColor: "rgba(100,130,255,0.2)",
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      titleFont: { weight: "bold", size: 12 },
      bodyFont: { size: 12 }
    };
  }
  function xTicks() {
    return {
      color: "#7a80a0",
      font: { size: 11 },
      maxRotation: 40,
      autoSkip: true,
      maxTicksLimit: 18
    };
  }
  function yTicks() {
    return {
      callback: (v) => fmt(v),
      color: "#7a80a0",
      font: { size: 11 }
    };
  }
  function baseScaleTitle(text) {
    return {
      display: !!text,
      text: text || "",
      color: "#7a80a0",
      font: { size: 11 }
    };
  }
  function buildBarConfig({ labels, datasets }, spec) {
    return {
      type: "bar",
      data: {
        labels,
        datasets: datasets.map((d) => ({
          ...d,
          backgroundColor: d.backgroundColor + "cc",
          hoverBackgroundColor: d.backgroundColor,
          borderRadius: 5,
          borderSkipped: false
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { color: "#4a5280", font: { size: 12 } } },
          tooltip: tooltipConfig(),
          title: { display: !!spec.title, text: spec.title, color: "#1a1f36", font: { size: 14, weight: "bold" } }
        },
        scales: {
          x: { grid: { display: false }, ticks: xTicks(), title: baseScaleTitle(spec.x_axis_title) },
          y: { grid: { color: "rgba(0,0,0,.05)" }, ticks: yTicks(), title: baseScaleTitle(spec.y_axis_title) }
        },
        animation: { duration: 500, easing: "easeOutQuart" }
      }
    };
  }
  function buildLineConfig({ labels, datasets }, spec, area = false) {
    return {
      type: "line",
      data: {
        labels,
        datasets: datasets.map((d, i) => ({
          ...d,
          fill: area,
          tension: area ? 0.4 : 0.35,
          pointRadius: area ? 3 : 4,
          pointHoverRadius: area ? 6 : 7,
          pointBackgroundColor: d.borderColor,
          backgroundColor: area ? PALETTE[i % PALETTE.length] + "30" : d.backgroundColor,
          borderColor: PALETTE[i % PALETTE.length]
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: { color: "#4a5280", font: { size: 12 } } },
          tooltip: { ...tooltipConfig(), mode: "index", intersect: false },
          title: { display: !!spec.title, text: spec.title, color: "#1a1f36", font: { size: 14, weight: "bold" } }
        },
        scales: {
          x: { grid: { display: area ? false : void 0, color: "rgba(0,0,0,.04)" }, ticks: xTicks(), title: baseScaleTitle(spec.x_axis_title) },
          y: { grid: { color: "rgba(0,0,0,.05)" }, ticks: yTicks(), title: baseScaleTitle(spec.y_axis_title) }
        },
        hover: { mode: "index", intersect: false },
        animation: { duration: 500, easing: "easeOutQuart" }
      }
    };
  }
  function buildPieConfig({ labels, datasets }, spec) {
    const values = datasets[0] ? datasets[0].data : [];
    const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);
    return {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.map((c) => c + "cc"),
          hoverBackgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              color: "#4a5280",
              font: { size: 12 },
              padding: 14,
              boxWidth: 14,
              boxHeight: 14
            }
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (ctx.parsed / total * 100).toFixed(1) + "%" : "\u2013";
                return ` ${ctx.label}: ${fmt(ctx.parsed)} (${pct})`;
              }
            },
            backgroundColor: "rgba(15,20,50,0.88)",
            titleColor: "#fff",
            bodyColor: "#d0d8f0",
            borderColor: "rgba(100,130,255,0.2)",
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8
          },
          title: {
            display: !!spec.title,
            text: spec.title,
            color: "#1a1f36",
            font: { size: 14, weight: "bold" },
            padding: { bottom: 16 }
          }
        },
        animation: { animateRotate: true, duration: 600, easing: "easeOutQuart" },
        cutout: "55%"
      }
    };
  }
  function makeConfig(type, builtData, spec) {
    switch (type) {
      case "bar":
        return buildBarConfig(builtData, spec);
      case "line":
        return buildLineConfig(builtData, spec, false);
      case "area":
        return buildLineConfig(builtData, spec, true);
      case "pie":
        return buildPieConfig(builtData, spec);
      default:
        throw new Error(`Unsupported chart_type "${type}".`);
    }
  }
  function injectShimmer(container) {
    container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px 20px;background:#f8f9fc;border-radius:10px;height:100%;">
      <div style="display:flex;align-items:flex-end;gap:6px;height:64px;width:80%;">
        ${[40, 70, 55, 90, 65, 45, 80].map((h, i) => `
          <div style="flex:1;border-radius:4px 4px 0 0;height:${h}%;background:linear-gradient(90deg,#e8ecf8 25%,#d0d6f0 50%,#e8ecf8 75%);background-size:300% 100%;animation:pbShimBar 1.4s ease-in-out infinite ${i * 0.1}s;"></div>
        `).join("")}
      </div>
      <style>
        @keyframes pbShimBar {
          0%,100% { opacity:.4 }
          50% { opacity:1 }
        }
      </style>
    </div>
  `;
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
  `;
  }
  async function renderChart(container, chartData) {
    if (!container || !chartData) return null;
    const { chart_type, data_mapping, rows } = chartData;
    if (!chart_type || !data_mapping || !rows || !rows.length) {
      showError(container, "Chart data is incomplete or missing.");
      return null;
    }
    const prev = instances.get(container);
    if (prev) {
      try {
        prev.destroy();
      } catch (_) {
      }
    }
    injectShimmer(container);
    let Chart;
    try {
      Chart = await loadChartJs();
    } catch (_) {
      showError(container, "Could not load chart library. Check your network connection.");
      return null;
    }
    let normResult;
    try {
      normResult = normaliseRows(rows, data_mapping);
    } catch (_) {
      showError(container, "Failed to read chart data columns.");
      return null;
    }
    let builtData;
    try {
      builtData = buildDatasets(normResult.rows, normResult.mapping);
    } catch (err) {
      showError(container, `Chart data error: ${err.message}`);
      return null;
    }
    let config;
    try {
      config = makeConfig(chart_type, builtData, chartData);
    } catch (err) {
      showError(container, err.message);
      return null;
    }
    container.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block; width:100%; height:100%;";
    container.appendChild(canvas);
    try {
      const instance = new Chart(canvas, config);
      instances.set(container, instance);
      return instance;
    } catch (err) {
      showError(container, `Chart render failed: ${err.message}`);
      return null;
    }
  }

  // src/utils/markdown.js
  function escapeHtml(s = "") {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function mdInline(s) {
    let t = escapeHtml(s);
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return t;
  }
  function mdTable(block) {
    const rows = block.trim().split("\n").filter(Boolean);
    if (rows.length < 2) return null;
    const norm2 = rows.map((l) => l.replace(/^\s*\|\s*/, "").replace(/\s*\|\s*$/, ""));
    if (!norm2[1].split("|").map((s) => s.trim()).every((c) => /^:?-{3,}:?$/.test(c))) return null;
    const cells = (l) => l.split("|").map((c) => c.trim()).filter(Boolean).map((c) => mdInline(c));
    const head = cells(norm2[0]);
    const body = norm2.slice(2).map(cells);
    return `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  function mdLists(md) {
    const lines = md.split("\n");
    const out = [];
    let ul = false;
    let ol = false;
    const flush = () => {
      if (ul) {
        out.push("</ul>");
        ul = false;
      }
      if (ol) {
        out.push("</ol>");
        ol = false;
      }
    };
    for (const l of lines) {
      if (/^\s*[-*]\s+/.test(l)) {
        if (!ul) {
          flush();
          out.push("<ul>");
          ul = true;
        }
        out.push(`<li>${mdInline(l.replace(/^\s*[-*]\s+/, ""))}</li>`);
      } else if (/^\s*\d+\.\s+/.test(l)) {
        if (!ol) {
          flush();
          out.push("<ol>");
          ol = true;
        }
        out.push(`<li>${mdInline(l.replace(/^\s*\d+\.\s+/, ""))}</li>`);
      } else if (l.trim() === "") {
        flush();
        out.push("<br/>");
      } else {
        flush();
        out.push(`<p>${mdInline(l)}</p>`);
      }
    }
    flush();
    return out.join("");
  }
  function renderMarkdown(md = "") {
    return md.split(/\n{2,}/).map((block) => mdTable(block) || mdLists(block)).join("\n");
  }

  // src/utils/dom.js
  function qs(root, id) {
    return root.getElementById(id);
  }
  function createBubble(role, textColor = "#0d1117") {
    const b = document.createElement("div");
    b.className = `msg ${role}`;
    b.style.background = role === "user" ? "#ddeeff" : "#ffffff";
    b.style.border = "1px solid #e3e6f0";
    b.style.color = textColor;
    return b;
  }
  function appendBotMessage(chatEl, md, textColor) {
    const b = createBubble("bot", textColor);
    b.innerHTML = renderMarkdown(String(md || ""));
    chatEl.appendChild(b);
    chatEl.scrollTop = chatEl.scrollHeight;
    return b;
  }
  function appendUserMessage(chatEl, text, imgSnap, openLightbox, textColor) {
    const b = createBubble("user", textColor);
    if (imgSnap) {
      const img = document.createElement("img");
      img.className = "msgImg";
      img.src = imgSnap.dataUri;
      img.alt = imgSnap.name || "image";
      img.addEventListener("click", () => openLightbox(imgSnap.dataUri));
      b.appendChild(img);
    }
    if (text) {
      const s = document.createElement("span");
      s.textContent = text;
      b.appendChild(s);
    }
    chatEl.appendChild(b);
    chatEl.scrollTop = chatEl.scrollHeight;
    return b;
  }
  function resizeTextarea(ta, min = 34, max = 196) {
    ta.style.height = `${min}px`;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }

  // src/chat-widget.js
  var import_meta = {};
  async function loadText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load resource: ${url}`);
    return res.text();
  }
  async function loadTemplateAndStyle() {
    const [html, css] = await Promise.all([
      loadText(new URL("./templates/widget-template.html", import_meta.url)),
      loadText(new URL("./styles/widget.css", import_meta.url))
    ]);
    const tpl = document.createElement("template");
    tpl.innerHTML = `<style>${css}</style>${html}`;
    return tpl;
  }
  var PerciBot = class extends HTMLElement {
    constructor() {
      super();
      this._sr = this.attachShadow({ mode: "open" });
      this._img = null;
      this._ws = false;
      this._popOpen = false;
      this._typingEl = null;
      this._datasets = {};
      this._props = {
        apiKey: "",
        model: "gpt-4o-mini",
        welcomeText: "Hello, I\u2019m PerciBOT! How can I assist you?",
        datasets: "",
        primaryColor: "#1f4fbf",
        primaryDark: "#163a8a",
        surfaceColor: "#ffffff",
        surfaceAlt: "#f8f9fc",
        textColor: "#0d1117",
        answerPrompt: "",
        behaviourPrompt: "",
        schemaPrompt: "",
        clientId: "",
        schemaName: "",
        viewName: "",
        memoryMode: "disabled"
      };
      this._sessionId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    async connectedCallback() {
      if (!this._sr.hasChildNodes()) {
        const tpl = await loadTemplateAndStyle();
        this._sr.appendChild(tpl.content.cloneNode(true));
        this.$ = (id) => qs(this._sr, id);
        this._injectIcons();
        this._wire();
        this._applyTheme();
        if (this._props.welcomeText) {
          this._botMsg(this._props.welcomeText);
        }
      }
      this.$("modelChip").addEventListener("click", () => {
        const d = this.$("dsDrawer");
        d.style.display = d.style.display === "block" ? "none" : "block";
      });
      const modeToggle = this.$("modeToggle");
      const modeText = modeToggle.querySelector(".modeText");
      modeToggle.addEventListener("click", () => {
        const isAnalytical = modeToggle.classList.contains("analytical");
        modeToggle.classList.toggle("analytical", !isAnalytical);
        modeToggle.classList.toggle("consultant", isAnalytical);
        modeText.textContent = isAnalytical ? "Consultant Mode" : "Analytical Mode";
      });
    }
    _injectIcons() {
      this._sr.querySelector(".js-icon-plus").innerHTML = ICONS.plus;
      this._sr.querySelector(".js-icon-clip").innerHTML = ICONS.clip;
      this._sr.querySelector(".js-icon-globe").innerHTML = ICONS.globe;
      this._sr.querySelector(".js-icon-send").innerHTML = ICONS.send;
      this._sr.querySelector(".js-icon-clear").innerHTML = ICONS.clear;
    }
    onCustomWidgetAfterUpdate(p = {}) {
      Object.assign(this._props, p);
      if (this.$) {
        this._applyTheme();
        if (typeof p.datasets === "string") this._parseDS(p.datasets);
        if (!this.$("chat").innerHTML && this._props.welcomeText) this._botMsg(this._props.welcomeText);
      }
    }
    setProperties(p) {
      this.onCustomWidgetAfterUpdate(p);
    }
    onCustomWidgetRequest(method, params) {
      if (method === "setDatasets") {
        const v = typeof params === "string" ? params : Array.isArray(params) ? params[0] || "" : params && params.payload || "";
        if (v) this._parseDS(v);
      }
    }
    _wire() {
      const ta = this.$("input");
      const send = this.$("btnSend");
      const plus = this.$("btnPlus");
      const clear = this.$("btnClear");
      const pop = this.$("popover");
      ta.addEventListener("input", () => {
        resizeTextarea(ta);
        this._syncSend();
      });
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this._send();
        }
      });
      send.addEventListener("click", () => this._send());
      clear.addEventListener("click", () => this._clearChat());
      plus.addEventListener("click", (e) => {
        e.stopPropagation();
        this._togglePop();
      });
      this.$("popAttach").addEventListener("click", () => {
        this._closePop();
        this.$("fileInput").click();
      });
      this.$("popWS").addEventListener("click", () => {
        this._ws = !this._ws;
        this.$("popWS").classList.toggle("sel", this._ws);
        this._renderPills();
        this._syncSend();
        this._closePop();
      });
      this.$("fileInput").addEventListener("change", (e) => {
        const f = e.target.files && e.target.files[0];
        if (f) this._loadFile(f);
        e.target.value = "";
      });
      this._sr.addEventListener("paste", (e) => {
        if (!e.clipboardData) return;
        const item = Array.from(e.clipboardData.items || []).find(
          (i) => i.kind === "file" && ACCEPTED_IMAGES.includes(i.type)
        );
        if (!item) return;
        e.preventDefault();
        const f = item.getAsFile();
        if (f) this._loadFile(f);
      });
      document.addEventListener("click", () => this._closePop());
      this._sr.addEventListener("click", (e) => {
        if (!plus.contains(e.target) && !pop.contains(e.target)) this._closePop();
      });
      this.$("lb").addEventListener("click", (e) => {
        if (e.target === this.$("lb") || e.target === this.$("lbX")) this._closeLB();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this._closeLB();
      });
    }
    _togglePop() {
      this._popOpen ? this._closePop() : this._openPop();
    }
    _openPop() {
      this._popOpen = true;
      this.$("popover").classList.add("vis");
      this.$("btnPlus").classList.add("active");
    }
    _closePop() {
      this._popOpen = false;
      this.$("popover").classList.remove("vis");
      this.$("btnPlus").classList.remove("active");
    }
    _clearChat() {
      this.$("chat").innerHTML = "";
      if (this._props.welcomeText) this._botMsg(this._props.welcomeText);
    }
    _botMsg(md) {
      appendBotMessage(this.$("chat"), md, this._props.textColor || "#0d1117");
    }
    _userMsg(text, imgSnap) {
      appendUserMessage(
        this.$("chat"),
        text,
        imgSnap,
        (src) => this._openLB(src),
        this._props.textColor || "#0d1117"
      );
    }
    _startTyping() {
      if (this._typingEl) return;
      const b = document.createElement("div");
      b.className = "msg bot typing";
      b.style.background = "#ffffff";
      b.style.border = "1px solid #e3e6f0";
      b.innerHTML = `<span style="font-size:12px;opacity:.6">PerciBOT</span><span class="dots"><b></b><b></b><b></b></span>`;
      this.$("chat").appendChild(b);
      this.$("chat").scrollTop = this.$("chat").scrollHeight;
      this._typingEl = b;
    }
    _stopTyping() {
      var _a;
      if ((_a = this._typingEl) == null ? void 0 : _a.parentNode) this._typingEl.parentNode.removeChild(this._typingEl);
      this._typingEl = null;
    }
    _openLB(src) {
      this.$("lbImg").src = src;
      this.$("lb").classList.add("vis");
    }
    _closeLB() {
      this.$("lb").classList.remove("vis");
      this.$("lbImg").src = "";
    }
    _syncSend() {
      this.$("btnSend").disabled = !(this.$("input").value.trim() || this._img);
    }
    _renderPills() {
      const c = this.$("pills");
      c.innerHTML = "";
      let any = false;
      if (this._img) {
        any = true;
        const p = document.createElement("div");
        p.className = "pill";
        p.innerHTML = `<img class="pthumb" src="${this._img.dataUri}" alt="img" />
                     <span class="plabel">${escapeHtml(this._img.name)}</span>
                     <button class="prem" title="Remove">&#x2715;</button>`;
        p.querySelector(".pthumb").addEventListener("click", () => this._openLB(this._img.dataUri));
        p.querySelector(".prem").addEventListener("click", () => {
          this._img = null;
          this._renderPills();
          this._syncSend();
        });
        c.appendChild(p);
      }
      if (this._ws) {
        any = true;
        const p = document.createElement("div");
        p.className = "pill";
        p.innerHTML = `${ICONS.globe}<span class="plabel">Web search</span>
                     <button class="prem" title="Remove">&#x2715;</button>`;
        p.querySelector(".prem").addEventListener("click", () => {
          this._ws = false;
          this.$("popWS").classList.remove("sel");
          this._renderPills();
          this._syncSend();
        });
        c.appendChild(p);
      }
      c.classList.toggle("vis", any);
    }
    _loadFile(file) {
      if (!ACCEPTED_IMAGES.includes(file.type)) {
        this._botMsg("\u26A0\uFE0F Unsupported type. Please attach a JPEG, PNG, WEBP, or GIF image.");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        this._botMsg("\u26A0\uFE0F Image exceeds 5 MB. Please use a smaller file.");
        return;
      }
      this.$("shimRow").classList.add("vis");
      const r = new FileReader();
      r.onload = (e) => {
        this.$("shimRow").classList.remove("vis");
        this._img = {
          dataUri: e.target.result,
          name: file.name,
          mimeType: file.type
        };
        this._renderPills();
        this._syncSend();
      };
      r.onerror = () => {
        this.$("shimRow").classList.remove("vis");
        this._botMsg("\u26A0\uFE0F Failed to read the file. Please try again.");
      };
      r.readAsDataURL(file);
    }
    async _send() {
      const q = (this.$("input").value || "").trim();
      const imgSnap = this._img ? { ...this._img } : null;
      const wsFlag = this._ws;
      if (!q && !imgSnap) return;
      this._userMsg(q, imgSnap);
      this.$("input").value = "";
      resizeTextarea(this.$("input"));
      this._img = null;
      this._renderPills();
      this._syncSend();
      const apiKey = (this._props.apiKey || "").trim();
      if (!apiKey) {
        this._botMsg("\u26A0\uFE0F API key not configured. Open the Builder panel.");
        return;
      }
      this._startTyping();
      this.$("btnSend").disabled = true;
      try {
        const payload = {
          query: q || "(Image attached \u2014 please analyse)",
          session_id: this._sessionId,
          answer_prompt: this._props.answerPrompt || "",
          behaviour_prompt: this._props.behaviourPrompt || "",
          schema_prompt: this._props.schemaPrompt || "",
          client_id: this._props.clientId || "",
          api_key_encrypted: xorEncrypt(apiKey),
          model: this._props.model || "gpt-4o-mini",
          web_search: wsFlag,
          requestSource: REQUEST_SOURCE,
          memory_mode: this._props.memoryMode || "disabled"
        };
        if (imgSnap) payload.image_base64 = imgSnap.dataUri;
        const sn = (this._props.schemaName || "").trim();
        const vn = (this._props.viewName || "").trim();
        if (sn && vn) {
          payload.schema_name = sn;
          payload.view_name = vn;
        }
        const res = await fetch(`${BACKEND_URL}/presales/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          let d = "";
          try {
            const e = await res.json();
            d = e.detail || e.message || "";
          } catch (_) {
          }
          throw new Error(`HTTP ${res.status} ${res.statusText}${d ? ": " + d : ""}`);
        }
        const data = await res.json();
        this._stopTyping();
        this._renderBotResponse(data);
      } catch (err) {
        this._stopTyping();
        this._botMsg(`\u26A0\uFE0F ${err.message}`);
      } finally {
        this._syncSend();
      }
    }
    _renderBotResponse(data) {
      const answerText = data.answer && data.answer.trim() ? data.answer : data.message || "(No response received)";
      const b = document.createElement("div");
      b.className = "msg bot";
      b.style.background = "#ffffff";
      b.style.border = "1px solid #e3e6f0";
      b.style.color = this._props.textColor || "#0d1117";
      const textWrap = document.createElement("div");
      textWrap.innerHTML = renderMarkdown(String(answerText));
      b.appendChild(textWrap);
      if (data.chart_data && typeof data.chart_data === "object") {
        const card = document.createElement("div");
        card.className = "chartCard";
        const canvasWrap = document.createElement("div");
        canvasWrap.className = "chartCanvas";
        card.appendChild(canvasWrap);
        const footer = document.createElement("div");
        footer.className = "chartFooter";
        footer.innerHTML = `<span class="cfName">${escapeHtml(data.chart_data.title || "Chart")}</span>`;
        card.appendChild(footer);
        b.appendChild(card);
        this.$("chat").appendChild(b);
        this.$("chat").scrollTop = this.$("chat").scrollHeight;
        renderChart(canvasWrap, data.chart_data);
        return;
      }
      this.$("chat").appendChild(b);
      this.$("chat").scrollTop = this.$("chat").scrollHeight;
    }
    _applyTheme() {
      if (!this.$) return;
      const p = this._props;
      const grad = `linear-gradient(135deg,${p.primaryColor || "#1f4fbf"},${p.primaryDark || "#163a8a"})`;
      this._sr.querySelector(".wrap").style.background = p.surfaceColor || "#fff";
      this._sr.querySelector(".wrap").style.color = p.textColor || "#0d1117";
      this._sr.querySelector(".panel").style.background = p.surfaceAlt || "#f8f9fc";
      this._sr.querySelector("header").style.background = grad;
      this._sr.querySelector(".btnSend").style.background = grad;
    }
    _parseDS(jsonStr) {
      try {
        const raw = JSON.parse(jsonStr || "{}") || {};
        const out = {};
        Object.keys(raw).forEach((k) => {
          const { schema = [], rows2D = [] } = raw[k] || {};
          out[k] = {
            schema,
            rows2D,
            rows: rows2D.map((a) => {
              const o = {};
              schema.forEach((c, i) => {
                o[c] = a[i];
              });
              return o;
            })
          };
        });
        this._datasets = out;
      } catch (e) {
        this._datasets = {};
      }
      this._updateDSUI();
    }
    _updateDSUI() {
      const chip = this.$("modelChip");
      const drawer = this.$("dsDrawer");
      const items = Object.entries(this._datasets || {});
      if (!items.length) {
        chip.textContent = "AI Assistant";
        drawer.style.display = "none";
        return;
      }
      const pts = items.map(([k, v]) => {
        var _a;
        return `${k}: ${((_a = v.rows) == null ? void 0 : _a.length) || 0} rows`;
      });
      chip.textContent = pts.length > 2 ? `${pts.slice(0, 2).join(" \xB7 ")} \xB7 +${pts.length - 2} more` : pts.join(" \xB7 ");
      drawer.innerHTML = items.map(
        ([n, d]) => {
          var _a;
          return `<div class="ds"><div class="name">${escapeHtml(n)}</div><div>${((_a = d.rows) == null ? void 0 : _a.length) || 0} rows</div><div>${(d.schema || []).slice(0, 10).join(", ")}</div></div>`;
        }
      ).join("") || '<div class="ds">No datasets</div>';
    }
  };
  if (!customElements.get("perci-bot")) {
    customElements.define("perci-bot", PerciBot);
  }
})();
