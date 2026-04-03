export const BACKEND_URL = 'https://percibot.cfapps.us10-001.hana.ondemand.com'
export const CRYPTO_KEY = 'percibot-default-key'
export const REQUEST_SOURCE = 'sac_widget'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const CHARTJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'

export const PALETTE = [
  '#3A86FF',
  '#FF6B6B',
  '#06D6A0',
  '#FFD166',
  '#8338EC',
  '#FF9F1C',
  '#2EC4B6',
  '#E63946',
  '#457B9D',
  '#A8DADC',
  '#C77DFF',
  '#80B918',
]

export const ICONS = {
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
          </svg>`,
}