(() => {
  // src/utils/builder-theme.js
  var HEX = /^#([0-9a-fA-F]{6})$/;
  var PALETTES = [
    { name: "SAC Blue", primaryColor: "#1f4fbf", primaryDark: "#163a8a", surfaceColor: "#ffffff", surfaceAlt: "#f6f8ff", textColor: "#0b1221" },
    { name: "Emerald", primaryColor: "#0fb37d", primaryDark: "#0a7f59", surfaceColor: "#ffffff", surfaceAlt: "#f2fbf7", textColor: "#0a1b14" },
    { name: "Sunset", primaryColor: "#ff8a00", primaryDark: "#e53670", surfaceColor: "#ffffff", surfaceAlt: "#fff8f0", textColor: "#131212" },
    { name: "Slate", primaryColor: "#4a5568", primaryDark: "#2d3748", surfaceColor: "#f7f9fc", surfaceAlt: "#eef2f7", textColor: "#0b1221" },
    { name: "Indigo", primaryColor: "#5a67d8", primaryDark: "#434190", surfaceColor: "#ffffff", surfaceAlt: "#f3f4ff", textColor: "#0b1221" },
    { name: "Carbon", primaryColor: "#2b2b2b", primaryDark: "#0f0f0f", surfaceColor: "#ffffff", surfaceAlt: "#f6f6f6", textColor: "#111111" }
  ];
  function validateTheme(getValue) {
    const ids = ["primaryColor", "primaryDark", "surfaceColor", "surfaceAlt", "textColor"];
    return ids.every((id) => HEX.test((getValue(id) || "").trim().toLowerCase()));
  }

  // src/utils/builder-dom.js
  function escapeHtml(s = "") {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function deleteIcon() {
    return `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
    <line x1="1" y1="1" x2="11" y2="11"/>
    <line x1="11" y1="1" x2="1" y2="11"/>
  </svg>`;
  }
  function createDsPairRow(index, id, schema = "", view = "", onDirty, onDelete) {
    const row = document.createElement("div");
    row.className = "pair-row";
    row.dataset.id = id;
    const idx = document.createElement("div");
    idx.className = "pair-idx";
    idx.textContent = index;
    const fields = document.createElement("div");
    fields.className = "pair-fields";
    const schemaInp = document.createElement("input");
    schemaInp.type = "text";
    schemaInp.placeholder = "Schema name (e.g. DEMO)";
    schemaInp.value = schema;
    schemaInp.addEventListener("input", onDirty);
    const viewInp = document.createElement("input");
    viewInp.type = "text";
    viewInp.placeholder = "View name (e.g. VW_SALES_DATA)";
    viewInp.value = view;
    viewInp.addEventListener("input", onDirty);
    fields.appendChild(schemaInp);
    fields.appendChild(viewInp);
    const del = document.createElement("button");
    del.className = "btn-del-pair";
    del.type = "button";
    del.title = "Remove pair";
    del.innerHTML = deleteIcon();
    del.addEventListener("click", () => onDelete(id));
    row.appendChild(idx);
    row.appendChild(fields);
    row.appendChild(del);
    return { row, schemaInp, viewInp };
  }
  function createSapPairRow(index, id, table = "", onDirty, onDelete) {
    const row = document.createElement("div");
    row.className = "pair-row";
    row.dataset.id = id;
    const idx = document.createElement("div");
    idx.className = "pair-idx sap-idx";
    idx.textContent = index;
    const fields = document.createElement("div");
    fields.className = "pair-fields single";
    const tableInp = document.createElement("input");
    tableInp.type = "text";
    tableInp.placeholder = "Table name (e.g. MARA, VBAK, KNA1)";
    tableInp.value = table;
    tableInp.addEventListener("input", onDirty);
    fields.appendChild(tableInp);
    const del = document.createElement("button");
    del.className = "btn-del-pair";
    del.type = "button";
    del.title = "Remove table";
    del.innerHTML = deleteIcon();
    del.addEventListener("click", () => onDelete(id));
    row.appendChild(idx);
    row.appendChild(fields);
    row.appendChild(del);
    return { row, tableInp };
  }
  function showToast(el, msg) {
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1200);
  }

  // src/utils/constants.js
  var BACKEND_URL = "https://percibot.cfapps.us10-001.hana.ondemand.com";
  var CRYPTO_KEY = "percibot-default-key";
  var MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  // src/utils/crypto.js
  function xorEncrypt(plainText) {
    const enc = new TextEncoder();
    const ptB = enc.encode(plainText);
    const keyB = enc.encode(CRYPTO_KEY);
    const x = ptB.map((b, i) => b ^ keyB[i % keyB.length]);
    return btoa(String.fromCharCode(...x)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  // src/utils/builder-connection.js
  async function testDatasphereConnection(apiKey, model, pairs = []) {
    const body = {
      api_key_encrypted: xorEncrypt(apiKey),
      model
    };
    if (pairs.length) {
      body.view_pairs = pairs.map((p) => ({
        schema_name: p.schema,
        view_name: p.view
      }));
    }
    const res = await fetch(`${BACKEND_URL}/presales/test-connection/datasphere`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return res.json();
  }
  async function testSapConnection(apiKey, model, tables = []) {
    const body = {
      api_key_encrypted: xorEncrypt(apiKey),
      model,
      ...tables.length ? { tables } : {}
    };
    const res = await fetch(`${BACKEND_URL}/presales/test-connection/sap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  // src/builder.js
  var import_meta = {};
  async function loadText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load resource: ${url}`);
    return res.text();
  }
  async function loadTemplateAndStyle() {
    const [html, css] = await Promise.all([
      loadText(new URL("./templates/builder-template.html", import_meta.url)),
      loadText(new URL("./styles/builder.css", import_meta.url))
    ]);
    const tpl = document.createElement("template");
    tpl.innerHTML = `<style>${css}</style>${html}`;
    return tpl;
  }
  var PerciBotBuilder = class extends HTMLElement {
    constructor() {
      super();
      this._activeSystem = "datasphere";
      this._dsPairs = [];
      this._sapPairs = [];
      this._pairSeq = 0;
      this._dirty = false;
      this.keys = [
        "apiKey",
        "model",
        "welcomeText",
        "memoryMode",
        "primaryColor",
        "primaryDark",
        "surfaceColor",
        "surfaceAlt",
        "textColor",
        "clientId",
        "answerPrompt",
        "behaviourPrompt",
        "schemaPrompt"
      ];
    }
    async connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      if (!this.shadowRoot.hasChildNodes()) {
        const tpl = await loadTemplateAndStyle();
        this.shadowRoot.appendChild(tpl.content.cloneNode(true));
        this.$ = (id) => this.shadowRoot.getElementById(id);
        this.inputs = this.keys.map((k) => this.$(k)).filter(Boolean);
        this._wire();
        this._renderPalettes();
        this._addDsPair();
      }
    }
    onCustomWidgetBuilderInit(host) {
      this._apply(host && host.properties || {});
      if (!this._initial) this._initial = JSON.parse(JSON.stringify(this._snapshot()));
    }
    onCustomWidgetAfterUpdate(changedProps) {
      this._apply(changedProps, true);
      if (!this._initial) this._initial = JSON.parse(JSON.stringify(this._snapshot()));
    }
    _wire() {
      this.$("toggleKey").addEventListener("click", () => {
        const inp = this.$("apiKey");
        inp.type = inp.type === "password" ? "text" : "password";
        this.$("toggleKey").textContent = inp.type === "password" ? "Show" : "Hide";
      });
      const markDirty = () => this._setDirty(true);
      this.inputs.forEach((el) => {
        el.addEventListener("input", markDirty);
        el.addEventListener("change", markDirty);
      });
      this.$("tabDatasphere").addEventListener("click", () => this._switchSystem("datasphere"));
      this.$("tabSap").addEventListener("click", () => this._switchSystem("sap"));
      this.$("btnAddDsPair").addEventListener("click", () => {
        this._addDsPair();
        this._setDirty(true);
      });
      this.$("btnAddSapPair").addEventListener("click", () => {
        this._addSapPair();
        this._setDirty(true);
      });
      this.$("memoryEnabled").addEventListener("change", () => {
        this._syncMemoryUI();
        this._setDirty(true);
      });
      this.$("memoryMode").addEventListener("change", () => {
        this._syncMemoryUI();
        this._setDirty(true);
      });
      this.$("resetBtn").addEventListener("click", () => this._reset());
      this.$("updateBtn").addEventListener("click", () => this._update());
      this.$("testConnBtn").addEventListener("click", () => this._testConnection());
    }
    _switchSystem(sys) {
      this._activeSystem = sys;
      this.$("tabDatasphere").classList.toggle("active", sys === "datasphere");
      this.$("tabSap").classList.toggle("active", sys === "sap");
      this.$("panelDatasphere").classList.toggle("active", sys === "datasphere");
      this.$("panelSap").classList.toggle("active", sys === "sap");
      this._clearConnResult();
      this._setDirty(true);
    }
    _addDsPair(schema = "", view = "") {
      const id = ++this._pairSeq;
      const pair = createDsPairRow(
        this._dsPairs.length + 1,
        id,
        schema,
        view,
        () => this._setDirty(true),
        (idToDelete) => this._removeDsPair(idToDelete)
      );
      this.$("dsPairList").appendChild(pair.row);
      this._dsPairs.push({ id, el: pair.row, schemaInp: pair.schemaInp, viewInp: pair.viewInp });
      this._reindexDs();
    }
    _removeDsPair(id) {
      const i = this._dsPairs.findIndex((p) => p.id === id);
      if (i === -1) return;
      this._dsPairs[i].el.remove();
      this._dsPairs.splice(i, 1);
      if (this._dsPairs.length === 0) this._addDsPair();
      this._reindexDs();
      this._setDirty(true);
    }
    _reindexDs() {
      this._dsPairs.forEach((p, i) => {
        p.el.querySelector(".pair-idx").textContent = i + 1;
      });
    }
    _addSapPair(table = "") {
      const id = ++this._pairSeq;
      const pair = createSapPairRow(
        this._sapPairs.length + 1,
        id,
        table,
        () => this._setDirty(true),
        (idToDelete) => this._removeSapPair(idToDelete)
      );
      this.$("sapPairList").appendChild(pair.row);
      this._sapPairs.push({ id, el: pair.row, tableInp: pair.tableInp });
      this._reindexSap();
    }
    _removeSapPair(id) {
      const i = this._sapPairs.findIndex((p) => p.id === id);
      if (i === -1) return;
      this._sapPairs[i].el.remove();
      this._sapPairs.splice(i, 1);
      if (this._sapPairs.length === 0) this._addSapPair();
      this._reindexSap();
      this._setDirty(true);
    }
    _reindexSap() {
      this._sapPairs.forEach((p, i) => {
        p.el.querySelector(".pair-idx").textContent = i + 1;
      });
    }
    _collectDsPairs() {
      return this._dsPairs.map((p) => ({ schema: p.schemaInp.value.trim(), view: p.viewInp.value.trim() })).filter((p) => p.schema && p.view);
    }
    _collectSapTables() {
      return this._sapPairs.map((p) => p.tableInp.value.trim()).filter(Boolean);
    }
    async _testConnection() {
      const apiKey = (this.$("apiKey").value || "").trim();
      const model = (this.$("model").value || "").trim();
      const statusEl = this.$("connStatus");
      const detailEl = this.$("connDetail");
      this._clearConnResult();
      if (!apiKey) {
        statusEl.className = "conn-status err show";
        statusEl.textContent = "\u2717 API key is empty";
        return;
      }
      statusEl.className = "conn-status checking show";
      statusEl.textContent = "\u29D7 Checking\u2026";
      this.$("testConnBtn").disabled = true;
      try {
        if (this._activeSystem === "datasphere") {
          const data = await testDatasphereConnection(apiKey, model, this._collectDsPairs());
          this._renderDatasphereConnectionResult(data, model);
        } else {
          const data = await testSapConnection(apiKey, model, this._collectSapTables());
          this._renderSapConnectionResult(data, model);
        }
      } catch (e) {
        statusEl.className = "conn-status err show";
        statusEl.textContent = `\u2717 ${e.message}`;
        detailEl.classList.remove("show");
      } finally {
        this.$("testConnBtn").disabled = false;
      }
    }
    _renderDatasphereConnectionResult(data, model) {
      const statusEl = this.$("connStatus");
      const detailEl = this.$("connDetail");
      const openaiOk = data.openai === "ok";
      const openaiHtml = `<div class="cd-openai">
      <span class="${openaiOk ? "ok-val" : "err-val"}">
        ${openaiOk ? "\u2713" : "\u2717"} OpenAI
        ${openaiOk ? `\u2014 connected (${data.model || model})` : `\u2014 ${data.openai_detail || "Failed"}`}
      </span>
    </div>`;
      let pairsHtml = "";
      const hana = data.hana;
      if (hana && hana.pairs && hana.pairs.length) {
        const rows = hana.pairs.map((p) => {
          const badgeClass = p.status === "found" ? "found" : p.status === "error" ? "error" : "not_found";
          const badgeLabel = p.status === "found" ? "Found" : p.status === "error" ? "Error" : "Not found";
          const detail = p.detail ? `<div class="cd-pair-detail">${escapeHtml(p.detail)}</div>` : "";
          return `<div class="cd-pair">
          <span class="cd-badge ${badgeClass}">${badgeLabel}</span>
          <div>
            <div class="cd-pair-name">${escapeHtml(p.schema_name)}.${escapeHtml(p.view_name)}</div>
            ${detail}
          </div>
        </div>`;
        }).join("");
        const summaryTxt = `${hana.found} of ${hana.checked} view${hana.checked !== 1 ? "s" : ""} found` + (hana.not_found ? ` \xB7 ${hana.not_found} not found` : "") + (hana.errors ? ` \xB7 ${hana.errors} error${hana.errors !== 1 ? "s" : ""}` : "");
        pairsHtml = `<div class="cd-pairs-title">HANA / Datasphere Views</div>${rows}
        <div class="cd-summary">${summaryTxt}</div>`;
      }
      detailEl.innerHTML = openaiHtml + pairsHtml;
      detailEl.classList.add("show");
      const overall = data.status || (openaiOk ? "ok" : "error");
      statusEl.className = `conn-status show ${overall === "ok" ? "ok" : overall === "partial" ? "partial" : "err"}`;
      statusEl.textContent = overall === "ok" ? "\u2713 All checks passed" : overall === "partial" ? "\u26A0 Partial \u2014 some views not found" : "\u2717 One or more checks failed";
    }
    _renderSapConnectionResult(data, model) {
      const statusEl = this.$("connStatus");
      const detailEl = this.$("connDetail");
      const openaiOk = data.openai === "ok";
      let html = `<div class="cd-openai">
      <span class="${openaiOk ? "ok-val" : "err-val"}">
        ${openaiOk ? "\u2713" : "\u2717"} OpenAI
        ${openaiOk ? `\u2014 connected (${data.model || model})` : `\u2014 ${data.openai_detail || "Failed"}`}
      </span>
    </div>`;
      const sap = data.sap;
      if (sap) {
        const isStub = sap.overall === "not_implemented";
        html += `<div class="cd-pairs-title">SAP System</div>
        <div class="cd-pair">
          <span class="cd-badge ${isStub ? "not_found" : sap.overall === "ok" ? "found" : "error"}">
            ${isStub ? "Pending" : sap.overall === "ok" ? "OK" : "Error"}
          </span>
          <div>
            <div class="cd-pair-name">${isStub ? "SAP connectivity" : "SAP system"}</div>
            <div class="cd-pair-detail">${escapeHtml(sap.detail || "")}</div>
          </div>
        </div>`;
      }
      detailEl.innerHTML = html;
      detailEl.classList.add("show");
      statusEl.className = `conn-status show ${openaiOk ? "ok" : "err"}`;
      statusEl.textContent = openaiOk ? "\u2713 OpenAI connected" : "\u2717 Connection failed";
    }
    _clearConnResult() {
      this.$("connStatus").className = "conn-status";
      this.$("connStatus").textContent = "";
      this.$("connDetail").innerHTML = "";
      this.$("connDetail").classList.remove("show");
    }
    _renderPalettes() {
      const root = this.$("palettes");
      PALETTES.forEach((p) => {
        const card = document.createElement("div");
        card.className = "pal-card";
        card.innerHTML = `
        <div class="pal-sw">
          <div class="pal-s" style="background:${p.primaryColor}"></div>
          <div class="pal-s" style="background:${p.primaryDark}"></div>
          <div class="pal-s" style="background:${p.surfaceColor}"></div>
          <div class="pal-s" style="background:${p.surfaceAlt}"></div>
          <div class="pal-s" style="background:${p.textColor}"></div>
        </div>
        <div class="pal-name">${p.name}</div>
      `;
        card.addEventListener("click", () => {
          Object.entries(p).forEach(([k, v]) => {
            if (k !== "name" && this.$(k)) this.$(k).value = v;
          });
          this._setDirty(true);
        });
        root.appendChild(card);
      });
    }
    _syncMemoryUI() {
      const enabled = this.$("memoryEnabled").checked;
      const mode = this.$("memoryMode").value === "hana_db" ? "hana_db" : "session";
      this.$("memoryOptions").classList.toggle("show", enabled);
      this.$("memoryHint").textContent = !enabled ? "" : mode === "hana_db" ? "Stores context in HANA so conversations can continue across sessions." : "Keeps context during this chat session only and resets for a new session.";
    }
    _apply(p = {}, external = false) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
      this._props = {
        apiKey: (_a = p.apiKey) != null ? _a : "",
        model: (_b = p.model) != null ? _b : "gpt-4o-mini",
        welcomeText: (_c = p.welcomeText) != null ? _c : "Hello, I\u2019m PerciBOT! How can I assist you?",
        schemaName: (_d = p.schemaName) != null ? _d : "",
        viewName: (_e = p.viewName) != null ? _e : "",
        memoryMode: (_f = p.memoryMode) != null ? _f : "disabled",
        primaryColor: (_g = p.primaryColor) != null ? _g : "#1f4fbf",
        primaryDark: (_h = p.primaryDark) != null ? _h : "#163a8a",
        surfaceColor: (_i = p.surfaceColor) != null ? _i : "#ffffff",
        surfaceAlt: (_j = p.surfaceAlt) != null ? _j : "#f6f8ff",
        textColor: (_k = p.textColor) != null ? _k : "#0b1221",
        clientId: (_l = p.clientId) != null ? _l : "",
        answerPrompt: (_m = p.answerPrompt) != null ? _m : "",
        behaviourPrompt: (_n = p.behaviourPrompt) != null ? _n : "",
        schemaPrompt: (_o = p.schemaPrompt) != null ? _o : ""
      };
      this.keys.forEach((k) => {
        if (this.$(k)) this.$(k).value = this._props[k];
      });
      const enabledMemory = this._props.memoryMode === "session" || this._props.memoryMode === "hana_db";
      this.$("memoryEnabled").checked = enabledMemory;
      this.$("memoryMode").value = this._props.memoryMode === "hana_db" ? "hana_db" : "session";
      this._syncMemoryUI();
      if (!external) this._setDirty(false);
      this._validateTheme();
    }
    _validateTheme() {
      const isValid = validateTheme((id) => this.$(id).value);
      const err = this.$("themeError");
      err.style.display = isValid ? "none" : "block";
      err.textContent = isValid ? "" : "Please choose valid colors.";
      return isValid;
    }
    _setDirty(dirty) {
      this._dirty = !!dirty;
      this.$("updateBtn").disabled = !this._dirty || !this._validateTheme();
      this.$("statusChip").textContent = this._dirty ? "Unsaved changes" : "No changes";
    }
    _snapshot() {
      return {
        ...this._props,
        dsPairs: this._dsPairs.map((p) => ({ schema: p.schemaInp.value, view: p.viewInp.value })),
        sapPairs: this._sapPairs.map((p) => ({ table: p.tableInp.value })),
        activeSystem: this._activeSystem
      };
    }
    _collect() {
      const get = (id) => this.$(id) ? this.$(id).value : "";
      const firstDs = this._dsPairs.length > 0 ? { schema: this._dsPairs[0].schemaInp.value.trim(), view: this._dsPairs[0].viewInp.value.trim() } : { schema: "", view: "" };
      return {
        apiKey: get("apiKey"),
        model: get("model"),
        welcomeText: get("welcomeText"),
        schemaName: firstDs.schema,
        viewName: firstDs.view,
        memoryMode: this.$("memoryEnabled").checked ? get("memoryMode") || "session" : "disabled",
        primaryColor: get("primaryColor"),
        primaryDark: get("primaryDark"),
        surfaceColor: get("surfaceColor"),
        surfaceAlt: get("surfaceAlt"),
        textColor: get("textColor"),
        clientId: get("clientId").trim(),
        answerPrompt: get("answerPrompt"),
        behaviourPrompt: get("behaviourPrompt"),
        schemaPrompt: get("schemaPrompt")
      };
    }
    _update() {
      if (!this._validateTheme()) return;
      const props = this._collect();
      this.dispatchEvent(new CustomEvent("propertiesChanged", {
        detail: { properties: props },
        bubbles: true,
        composed: true
      }));
      this._props = { ...props };
      this._setDirty(false);
      showToast(this.$("toast"), "Saved");
    }
    _reset() {
      if (!this._initial) return;
      this._apply(this._initial);
      this._setDirty(true);
    }
  };
  if (!customElements.get("perci-bot-builder")) {
    customElements.define("perci-bot-builder", PerciBotBuilder);
  }
})();
