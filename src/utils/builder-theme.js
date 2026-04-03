export const HEX = /^#([0-9a-fA-F]{6})$/

export const PALETTES = [
  { name: 'SAC Blue', primaryColor: '#1f4fbf', primaryDark: '#163a8a', surfaceColor: '#ffffff', surfaceAlt: '#f6f8ff', textColor: '#0b1221' },
  { name: 'Emerald', primaryColor: '#0fb37d', primaryDark: '#0a7f59', surfaceColor: '#ffffff', surfaceAlt: '#f2fbf7', textColor: '#0a1b14' },
  { name: 'Sunset', primaryColor: '#ff8a00', primaryDark: '#e53670', surfaceColor: '#ffffff', surfaceAlt: '#fff8f0', textColor: '#131212' },
  { name: 'Slate', primaryColor: '#4a5568', primaryDark: '#2d3748', surfaceColor: '#f7f9fc', surfaceAlt: '#eef2f7', textColor: '#0b1221' },
  { name: 'Indigo', primaryColor: '#5a67d8', primaryDark: '#434190', surfaceColor: '#ffffff', surfaceAlt: '#f3f4ff', textColor: '#0b1221' },
  { name: 'Carbon', primaryColor: '#2b2b2b', primaryDark: '#0f0f0f', surfaceColor: '#ffffff', surfaceAlt: '#f6f6f6', textColor: '#111111' },
]

export function validateTheme(getValue) {
  const ids = ['primaryColor', 'primaryDark', 'surfaceColor', 'surfaceAlt', 'textColor']
  return ids.every(id => HEX.test((getValue(id) || '').trim().toLowerCase()))
}