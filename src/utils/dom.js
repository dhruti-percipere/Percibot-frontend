import { renderMarkdown } from './markdown.js'

export function qs(root, id) {
  return root.getElementById(id)
}

export function createBubble (role, textColor = '#0d1117') {
  const b = document.createElement('div')
  b.className = `msg ${role}`
  b.style.background = role === 'user' ? '#ddeeff' : '#ffffff'
  b.style.border = '1px solid #e3e6f0'
  b.style.color = textColor
  return b
}

export function appendBotMessage (chatEl, md, textColor) {
  const b = createBubble('bot', textColor)
  b.innerHTML = renderMarkdown(String(md || ''))
  chatEl.appendChild(b)
  chatEl.scrollTop = chatEl.scrollHeight
  return b
}

export function appendUserMessage (chatEl, text, imgSnap, openLightbox, textColor) {
  const b = createBubble('user', textColor)

  if (imgSnap) {
    const img = document.createElement('img')
    img.className = 'msgImg'
    img.src = imgSnap.dataUri
    img.alt = imgSnap.name || 'image'
    img.addEventListener('click', () => openLightbox(imgSnap.dataUri))
    b.appendChild(img)
  }

  if (text) {
    const s = document.createElement('span')
    s.textContent = text
    b.appendChild(s)
  }

  chatEl.appendChild(b)
  chatEl.scrollTop = chatEl.scrollHeight
  return b
}

export function resizeTextarea (ta, min = 34, max = 196) {
  ta.style.height = `${min}px`
  ta.style.height = `${Math.min(ta.scrollHeight, max)}px`
}