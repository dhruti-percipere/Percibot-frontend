export function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function deleteIcon() {
  return `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
    <line x1="1" y1="1" x2="11" y2="11"/>
    <line x1="11" y1="1" x2="1" y2="11"/>
  </svg>`
}

export function createDsPairRow(index, id, schema = '', view = '', onDirty, onDelete) {
  const row = document.createElement('div')
  row.className = 'pair-row'
  row.dataset.id = id

  const idx = document.createElement('div')
  idx.className = 'pair-idx'
  idx.textContent = index

  const fields = document.createElement('div')
  fields.className = 'pair-fields'

  const schemaInp = document.createElement('input')
  schemaInp.type = 'text'
  schemaInp.placeholder = 'Schema name (e.g. DEMO)'
  schemaInp.value = schema
  schemaInp.addEventListener('input', onDirty)

  const viewInp = document.createElement('input')
  viewInp.type = 'text'
  viewInp.placeholder = 'View name (e.g. VW_SALES_DATA)'
  viewInp.value = view
  viewInp.addEventListener('input', onDirty)

  fields.appendChild(schemaInp)
  fields.appendChild(viewInp)

  const del = document.createElement('button')
  del.className = 'btn-del-pair'
  del.type = 'button'
  del.title = 'Remove pair'
  del.innerHTML = deleteIcon()
  del.addEventListener('click', () => onDelete(id))

  row.appendChild(idx)
  row.appendChild(fields)
  row.appendChild(del)

  return { row, schemaInp, viewInp }
}

export function createSapPairRow(index, id, table = '', onDirty, onDelete) {
  const row = document.createElement('div')
  row.className = 'pair-row'
  row.dataset.id = id

  const idx = document.createElement('div')
  idx.className = 'pair-idx sap-idx'
  idx.textContent = index

  const fields = document.createElement('div')
  fields.className = 'pair-fields single'

  const tableInp = document.createElement('input')
  tableInp.type = 'text'
  tableInp.placeholder = 'Table name (e.g. MARA, VBAK, KNA1)'
  tableInp.value = table
  tableInp.addEventListener('input', onDirty)

  fields.appendChild(tableInp)

  const del = document.createElement('button')
  del.className = 'btn-del-pair'
  del.type = 'button'
  del.title = 'Remove table'
  del.innerHTML = deleteIcon()
  del.addEventListener('click', () => onDelete(id))

  row.appendChild(idx)
  row.appendChild(fields)
  row.appendChild(del)

  return { row, tableInp }
}

export function showToast(el, msg) {
  el.textContent = msg
  el.classList.add('show')
  setTimeout(() => el.classList.remove('show'), 1200)
}