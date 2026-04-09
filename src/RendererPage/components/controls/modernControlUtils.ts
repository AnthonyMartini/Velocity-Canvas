import { resolveSampleText } from './sampleText'

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function parseHexColor(color: string) {
  const raw = String(color || '').trim().replace('#', '')
  if (raw.length === 3) {
    return {
      r: parseInt(raw[0] + raw[0], 16),
      g: parseInt(raw[1] + raw[1], 16),
      b: parseInt(raw[2] + raw[2], 16),
    }
  }

  if (raw.length >= 6) {
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    }
  }

  return null
}

export function toRgba(color: string, alpha = 1) {
  const parsed = parseHexColor(color)
  if (!parsed) return color || `rgba(15,108,189,${alpha})`
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${clamp(alpha, 0, 1)})`
}

export function blendWithWhite(color: string, amount = 0.84) {
  const parsed = parseHexColor(color)
  if (!parsed) return color
  const ratio = clamp(amount, 0, 1)
  const r = Math.round(parsed.r + (255 - parsed.r) * ratio)
  const g = Math.round(parsed.g + (255 - parsed.g) * ratio)
  const b = Math.round(parsed.b + (255 - parsed.b) * ratio)
  return `rgb(${r}, ${g}, ${b})`
}

export function stripOuterQuotes(value: any) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function normalizeLiteralString(value: any, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback
  return resolveSampleText(String(stripOuterQuotes(value)))
}

export function resolveModernPalette(comp: any, canvasTheme: any = null) {
  const palette = comp.BasePaletteColor || canvasTheme?.BasePaletteColor || '#0f6cbd'
  return {
    palette,
    lighter30: canvasTheme?.Colors?.Lighter30 || blendWithWhite(palette, 0.88),
    lighter20: canvasTheme?.Colors?.Lighter20 || blendWithWhite(palette, 0.74),
    lighter10: canvasTheme?.Colors?.Lighter10 || blendWithWhite(palette, 0.56),
    darker10: canvasTheme?.Colors?.Darker10 || toRgba(palette, 0.45),
    darker20: canvasTheme?.Colors?.Darker20 || toRgba(palette, 0.68),
    foreground: canvasTheme?.Colors?.PrimaryForeground || '#ffffff',
  }
}

export function parseItemsValue(value: any, fallback: any[] = []) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return fallback

  const trimmed = value.trim()
  if (!trimmed) return fallback

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function getCollectionItemLabel(item: any, displayFields: string[] = [], itemDisplayText = '') {
  if (item === undefined || item === null) return ''
  if (typeof item !== 'object') return String(item)

  const normalizedFields = displayFields.filter(Boolean)
  for (const field of normalizedFields) {
    if (item[field] !== undefined && item[field] !== null) return String(item[field])
  }

  const displayFieldName = normalizeLiteralString(itemDisplayText)
  if (displayFieldName && item[displayFieldName] !== undefined && item[displayFieldName] !== null) {
    return String(item[displayFieldName])
  }

  const preferredKeys = ['Label', 'Title', 'Name', 'Value']
  for (const key of preferredKeys) {
    if (item[key] !== undefined && item[key] !== null) return String(item[key])
  }

  const firstKey = Object.keys(item)[0]
  return firstKey ? String(item[firstKey]) : JSON.stringify(item)
}

export function areItemsEqual(left: any, right: any) {
  return JSON.stringify(left) === JSON.stringify(right)
}
