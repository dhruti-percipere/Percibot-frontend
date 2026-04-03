import { xorEncrypt } from './utils/crypto.js'
import { renderChart } from './utils/chart-renderer.js'
import { qs, appendBotMessage, appendUserMessage, resizeTextarea } from './utils/dom.js'
import { escapeHtml, renderMarkdown } from './utils/markdown.js'
import {
  BACKEND_URL,
  REQUEST_SOURCE,
  MAX_IMAGE_BYTES,
  ACCEPTED_IMAGES,
  ICONS,
} from './utils/constants.js'

async function loadText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load resource: ${url}`)
  return res.text()
}

async function loadTemplateAndStyle() {
  const [html, css] = await Promise.all([
    loadText(new URL('./templates/widget-template.html', import.meta.url)),
    loadText(new URL('./styles/widget.css', import.meta.url)),
  ])

  const tpl = document.createElement('template')
  tpl.innerHTML = `<style>${css}</style>${html}`
  return tpl
}

class PerciBot extends HTMLElement {
  constructor() {
    super()
    this._sr = this.attachShadow({ mode: 'open' })
    this._img = null
    this._ws = false
    this._popOpen = false
    this._typingEl = null
    this._datasets = {}

    this._props = {
      apiKey: '',
      model: 'gpt-4o-mini',
      welcomeText: 'Hello, I’m PerciBOT! How can I assist you?',
      datasets: '',
      primaryColor: '#1f4fbf',
      primaryDark: '#163a8a',
      surfaceColor: '#ffffff',
      surfaceAlt: '#f8f9fc',
      textColor: '#0d1117',
      answerPrompt: '',
      behaviourPrompt: '',
      schemaPrompt: '',
      clientId: '',
      schemaName: '',
      viewName: '',
      memoryMode: 'disabled',
    }

    this._sessionId = (
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
  }

  async connectedCallback() {
    if (!this._sr.hasChildNodes()) {
      const tpl = await loadTemplateAndStyle()
      this._sr.appendChild(tpl.content.cloneNode(true))
      this.$ = id => qs(this._sr, id)
      this._injectIcons()
      this._wire()
      this._applyTheme()

      if (this._props.welcomeText) {
        this._botMsg(this._props.welcomeText)
      }
    }

    this.$('modelChip').addEventListener('click', () => {
      const d = this.$('dsDrawer')
      d.style.display = d.style.display === 'block' ? 'none' : 'block'
    })

    const modeToggle = this.$('modeToggle')
    const modeText = modeToggle.querySelector('.modeText')

    modeToggle.addEventListener('click', () => {
      const isAnalytical = modeToggle.classList.contains('analytical')
      modeToggle.classList.toggle('analytical', !isAnalytical)
      modeToggle.classList.toggle('consultant', isAnalytical)
      modeText.textContent = isAnalytical ? 'Consultant Mode' : 'Analytical Mode'
    })
  }

  _injectIcons() {
    this._sr.querySelector('.js-icon-plus').innerHTML = ICONS.plus
    this._sr.querySelector('.js-icon-clip').innerHTML = ICONS.clip
    this._sr.querySelector('.js-icon-globe').innerHTML = ICONS.globe
    this._sr.querySelector('.js-icon-send').innerHTML = ICONS.send
    this._sr.querySelector('.js-icon-clear').innerHTML = ICONS.clear
  }

  onCustomWidgetAfterUpdate(p = {}) {
    Object.assign(this._props, p)
    if (this.$) {
      this._applyTheme()
      if (typeof p.datasets === 'string') this._parseDS(p.datasets)
      if (!this.$('chat').innerHTML && this._props.welcomeText) this._botMsg(this._props.welcomeText)
    }
  }

  setProperties(p) {
    this.onCustomWidgetAfterUpdate(p)
  }

  onCustomWidgetRequest(method, params) {
    if (method === 'setDatasets') {
      const v = typeof params === 'string'
        ? params
        : Array.isArray(params)
            ? (params[0] || '')
            : (params && params.payload) || ''

      if (v) this._parseDS(v)
    }
  }

  _wire() {
    const ta = this.$('input')
    const send = this.$('btnSend')
    const plus = this.$('btnPlus')
    const clear = this.$('btnClear')
    const pop = this.$('popover')

    ta.addEventListener('input', () => {
      resizeTextarea(ta)
      this._syncSend()
    })

    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this._send()
      }
    })

    send.addEventListener('click', () => this._send())
    clear.addEventListener('click', () => this._clearChat())
    plus.addEventListener('click', e => {
      e.stopPropagation()
      this._togglePop()
    })

    this.$('popAttach').addEventListener('click', () => {
      this._closePop()
      this.$('fileInput').click()
    })

    this.$('popWS').addEventListener('click', () => {
      this._ws = !this._ws
      this.$('popWS').classList.toggle('sel', this._ws)
      this._renderPills()
      this._syncSend()
      this._closePop()
    })

    this.$('fileInput').addEventListener('change', e => {
      const f = e.target.files && e.target.files[0]
      if (f) this._loadFile(f)
      e.target.value = ''
    })

    this._sr.addEventListener('paste', e => {
      if (!e.clipboardData) return
      const item = Array.from(e.clipboardData.items || []).find(
        i => i.kind === 'file' && ACCEPTED_IMAGES.includes(i.type)
      )
      if (!item) return
      e.preventDefault()
      const f = item.getAsFile()
      if (f) this._loadFile(f)
    })

    document.addEventListener('click', () => this._closePop())

    this._sr.addEventListener('click', e => {
      if (!plus.contains(e.target) && !pop.contains(e.target)) this._closePop()
    })

    this.$('lb').addEventListener('click', e => {
      if (e.target === this.$('lb') || e.target === this.$('lbX')) this._closeLB()
    })

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this._closeLB()
    })
  }

  _togglePop() {
    this._popOpen ? this._closePop() : this._openPop()
  }

  _openPop() {
    this._popOpen = true
    this.$('popover').classList.add('vis')
    this.$('btnPlus').classList.add('active')
  }

  _closePop() {
    this._popOpen = false
    this.$('popover').classList.remove('vis')
    this.$('btnPlus').classList.remove('active')
  }

  _clearChat() {
    this.$('chat').innerHTML = ''
    if (this._props.welcomeText) this._botMsg(this._props.welcomeText)
  }

  _botMsg(md) {
    appendBotMessage(this.$('chat'), md, this._props.textColor || '#0d1117')
  }

  _userMsg(text, imgSnap) {
    appendUserMessage(
      this.$('chat'),
      text,
      imgSnap,
      src => this._openLB(src),
      this._props.textColor || '#0d1117'
    )
  }

  _startTyping() {
    if (this._typingEl) return
    const b = document.createElement('div')
    b.className = 'msg bot typing'
    b.style.background = '#ffffff'
    b.style.border = '1px solid #e3e6f0'
    b.innerHTML = `<span style="font-size:12px;opacity:.6">PerciBOT</span><span class="dots"><b></b><b></b><b></b></span>`
    this.$('chat').appendChild(b)
    this.$('chat').scrollTop = this.$('chat').scrollHeight
    this._typingEl = b
  }

  _stopTyping() {
    if (this._typingEl?.parentNode) this._typingEl.parentNode.removeChild(this._typingEl)
    this._typingEl = null
  }

  _openLB(src) {
    this.$('lbImg').src = src
    this.$('lb').classList.add('vis')
  }

  _closeLB() {
    this.$('lb').classList.remove('vis')
    this.$('lbImg').src = ''
  }

  _syncSend() {
    this.$('btnSend').disabled = !(this.$('input').value.trim() || this._img)
  }

  _renderPills() {
    const c = this.$('pills')
    c.innerHTML = ''
    let any = false

    if (this._img) {
      any = true
      const p = document.createElement('div')
      p.className = 'pill'
      p.innerHTML = `<img class="pthumb" src="${this._img.dataUri}" alt="img" />
                     <span class="plabel">${escapeHtml(this._img.name)}</span>
                     <button class="prem" title="Remove">&#x2715;</button>`
      p.querySelector('.pthumb').addEventListener('click', () => this._openLB(this._img.dataUri))
      p.querySelector('.prem').addEventListener('click', () => {
        this._img = null
        this._renderPills()
        this._syncSend()
      })
      c.appendChild(p)
    }

    if (this._ws) {
      any = true
      const p = document.createElement('div')
      p.className = 'pill'
      p.innerHTML = `${ICONS.globe}<span class="plabel">Web search</span>
                     <button class="prem" title="Remove">&#x2715;</button>`
      p.querySelector('.prem').addEventListener('click', () => {
        this._ws = false
        this.$('popWS').classList.remove('sel')
        this._renderPills()
        this._syncSend()
      })
      c.appendChild(p)
    }

    c.classList.toggle('vis', any)
  }

  _loadFile(file) {
    if (!ACCEPTED_IMAGES.includes(file.type)) {
      this._botMsg('⚠️ Unsupported type. Please attach a JPEG, PNG, WEBP, or GIF image.')
      return
    }

    if (file.size > MAX_IMAGE_BYTES) {
      this._botMsg('⚠️ Image exceeds 5 MB. Please use a smaller file.')
      return
    }

    this.$('shimRow').classList.add('vis')
    const r = new FileReader()

    r.onload = e => {
      this.$('shimRow').classList.remove('vis')
      this._img = {
        dataUri: e.target.result,
        name: file.name,
        mimeType: file.type,
      }
      this._renderPills()
      this._syncSend()
    }

    r.onerror = () => {
      this.$('shimRow').classList.remove('vis')
      this._botMsg('⚠️ Failed to read the file. Please try again.')
    }

    r.readAsDataURL(file)
  }

  async _send() {
    const q = (this.$('input').value || '').trim()
    const imgSnap = this._img ? { ...this._img } : null
    const wsFlag = this._ws

    if (!q && !imgSnap) return

    this._userMsg(q, imgSnap)

    this.$('input').value = ''
    resizeTextarea(this.$('input'))
    this._img = null
    this._renderPills()
    this._syncSend()

    const apiKey = (this._props.apiKey || '').trim()
    if (!apiKey) {
      this._botMsg('⚠️ API key not configured. Open the Builder panel.')
      return
    }

    this._startTyping()
    this.$('btnSend').disabled = true

    try {
      const payload = {
        query: q || '(Image attached — please analyse)',
        session_id: this._sessionId,
        answer_prompt: this._props.answerPrompt || '',
        behaviour_prompt: this._props.behaviourPrompt || '',
        schema_prompt: this._props.schemaPrompt || '',
        client_id: this._props.clientId || '',
        api_key_encrypted: xorEncrypt(apiKey),
        model: this._props.model || 'gpt-4o-mini',
        web_search: wsFlag,
        requestSource: REQUEST_SOURCE,
        memory_mode: this._props.memoryMode || 'disabled',
      }

      if (imgSnap) payload.image_base64 = imgSnap.dataUri

      const sn = (this._props.schemaName || '').trim()
      const vn = (this._props.viewName || '').trim()
      if (sn && vn) {
        payload.schema_name = sn
        payload.view_name = vn
      }

      const res = await fetch(`${BACKEND_URL}/presales/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let d = ''
        try {
          const e = await res.json()
          d = e.detail || e.message || ''
        } catch (_) {}
        throw new Error(`HTTP ${res.status} ${res.statusText}${d ? ': ' + d : ''}`)
      }

      const data = await res.json()
      this._stopTyping()
      this._renderBotResponse(data)
    } catch (err) {
      this._stopTyping()
      this._botMsg(`⚠️ ${err.message}`)
    } finally {
      this._syncSend()
    }
  }

  _renderBotResponse(data) {
    const answerText = (data.answer && data.answer.trim())
      ? data.answer
      : (data.message || '(No response received)')

    const b = document.createElement('div')
    b.className = 'msg bot'
    b.style.background = '#ffffff'
    b.style.border = '1px solid #e3e6f0'
    b.style.color = this._props.textColor || '#0d1117'

    const textWrap = document.createElement('div')
    textWrap.innerHTML = renderMarkdown(String(answerText))
    b.appendChild(textWrap)

    if (data.chart_data && typeof data.chart_data === 'object') {
      const card = document.createElement('div')
      card.className = 'chartCard'

      const canvasWrap = document.createElement('div')
      canvasWrap.className = 'chartCanvas'
      card.appendChild(canvasWrap)

      const footer = document.createElement('div')
      footer.className = 'chartFooter'
      footer.innerHTML = `<span class="cfName">${escapeHtml(data.chart_data.title || 'Chart')}</span>`
      card.appendChild(footer)

      b.appendChild(card)
      this.$('chat').appendChild(b)
      this.$('chat').scrollTop = this.$('chat').scrollHeight

      renderChart(canvasWrap, data.chart_data)
      return
    }

    this.$('chat').appendChild(b)
    this.$('chat').scrollTop = this.$('chat').scrollHeight
  }

  _applyTheme() {
    if (!this.$) return
    const p = this._props
    const grad = `linear-gradient(135deg,${p.primaryColor || '#1f4fbf'},${p.primaryDark || '#163a8a'})`
    this._sr.querySelector('.wrap').style.background = p.surfaceColor || '#fff'
    this._sr.querySelector('.wrap').style.color = p.textColor || '#0d1117'
    this._sr.querySelector('.panel').style.background = p.surfaceAlt || '#f8f9fc'
    this._sr.querySelector('header').style.background = grad
    this._sr.querySelector('.btnSend').style.background = grad
  }

  _parseDS(jsonStr) {
    try {
      const raw = JSON.parse(jsonStr || '{}') || {}
      const out = {}

      Object.keys(raw).forEach(k => {
        const { schema = [], rows2D = [] } = raw[k] || {}
        out[k] = {
          schema,
          rows2D,
          rows: rows2D.map(a => {
            const o = {}
            schema.forEach((c, i) => { o[c] = a[i] })
            return o
          }),
        }
      })

      this._datasets = out
    } catch {
      this._datasets = {}
    }

    this._updateDSUI()
  }

  _updateDSUI() {
    const chip = this.$('modelChip')
    const drawer = this.$('dsDrawer')
    const items = Object.entries(this._datasets || {})

    if (!items.length) {
      chip.textContent = 'AI Assistant'
      drawer.style.display = 'none'
      return
    }

    const pts = items.map(([k, v]) => `${k}: ${v.rows?.length || 0} rows`)
    chip.textContent = pts.length > 2
      ? `${pts.slice(0, 2).join(' · ')} · +${pts.length - 2} more`
      : pts.join(' · ')

    drawer.innerHTML = items.map(([n, d]) =>
      `<div class="ds"><div class="name">${escapeHtml(n)}</div><div>${d.rows?.length || 0} rows</div><div>${(d.schema || []).slice(0, 10).join(', ')}</div></div>`
    ).join('') || '<div class="ds">No datasets</div>'
  }
}

if (!customElements.get('perci-bot')) {
  customElements.define('perci-bot', PerciBot)
}