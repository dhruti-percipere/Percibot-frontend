export function escapeHtml (s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function mdInline (s) {
  let t = escapeHtml(s)
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return t
}

export function mdTable (block) {
  const rows = block.trim().split('\n').filter(Boolean)
  if (rows.length < 2) return null

  const norm = rows.map(l => l.replace(/^\s*\|\s*/, '').replace(/\s*\|\s*$/, ''))
  if (!norm[1].split('|').map(s => s.trim()).every(c => /^:?-{3,}:?$/.test(c))) return null

  const cells = l => l.split('|').map(c => c.trim()).filter(Boolean).map(c => mdInline(c))
  const head = cells(norm[0])
  const body = norm.slice(2).map(cells)

  return `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

export function mdLists (md) {
  const lines = md.split('\n')
  const out = []
  let ul = false
  let ol = false

  const flush = () => {
    if (ul) { out.push('</ul>'); ul = false }
    if (ol) { out.push('</ol>'); ol = false }
  }

  for (const l of lines) {
    if (/^\s*[-*]\s+/.test(l)) {
      if (!ul) { flush(); out.push('<ul>'); ul = true }
      out.push(`<li>${mdInline(l.replace(/^\s*[-*]\s+/, ''))}</li>`)
    } else if (/^\s*\d+\.\s+/.test(l)) {
      if (!ol) { flush(); out.push('<ol>'); ol = true }
      out.push(`<li>${mdInline(l.replace(/^\s*\d+\.\s+/, ''))}</li>`)
    } else if (l.trim() === '') {
      flush()
      out.push('<br/>')
    } else {
      flush()
      out.push(`<p>${mdInline(l)}</p>`)
    }
  }

  flush()
  return out.join('')
}

export function renderMarkdown (md = '') {
  return md
    .split(/\n{2,}/)
    .map(block => mdTable(block) || mdLists(block))
    .join('\n')
}