import { CRYPTO_KEY } from './constants.js'

export function xorEncrypt (plainText) {
  const enc = new TextEncoder()
  const ptB = enc.encode(plainText)
  const keyB = enc.encode(CRYPTO_KEY)
  const x = ptB.map((b, i) => b ^ keyB[i % keyB.length])
  return btoa(String.fromCharCode(...x))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}