import { xorEncrypt } from './crypto.js'
import { BACKEND_URL } from './constants.js'

export async function testDatasphereConnection(apiKey, model, pairs = []) {
  const body = {
    api_key_encrypted: xorEncrypt(apiKey),
    model,
  }

  if (pairs.length) {
    body.view_pairs = pairs.map(p => ({
      schema_name: p.schema,
      view_name: p.view,
    }))
  }

  const res = await fetch(`${BACKEND_URL}/presales/test-connection/datasphere`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return res.json()
}

export async function testSapConnection(apiKey, model, tables = []) {
  const body = {
    api_key_encrypted: xorEncrypt(apiKey),
    model,
    ...(tables.length ? { tables } : {}),
  }

  const res = await fetch(`${BACKEND_URL}/presales/test-connection/sap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return res.json()
}