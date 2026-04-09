const DEFAULT_THEME_NAME = 'Office Blue'
const DEFAULT_FONT = 'Segoe UI'
const DEFAULT_BASE_PALETTE_COLOR = '#0f6cbd'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function sanitizeThemeName(value: unknown) {
  const cleaned = String(value ?? '').trim().replace(/[\r\n:]/g, '').slice(0, 80)
  return cleaned || DEFAULT_THEME_NAME
}

function sanitizeFont(value: unknown) {
  return String(value ?? '').trim().slice(0, 120) || DEFAULT_FONT
}

function sanitizeHexColor(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return DEFAULT_BASE_PALETTE_COLOR

  const withHash = raw.startsWith('#') ? raw : `#${raw}`
  if (/^#[0-9a-fA-F]{3}$/.test(withHash) || /^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toLowerCase()
  }

  return DEFAULT_BASE_PALETTE_COLOR
}

function sanitizeNumber(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hexToRgb(hex: string) {
  const clean = sanitizeHexColor(hex).replace('#', '')
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    }
  }

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map(channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')).join('')}`
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      default:
        h = (rn - gn) / d + 4
        break
    }
    h /= 6
  }

  return { h, s, l }
}

function hueToRgb(p: number, q: number, t: number) {
  let next = t
  if (next < 0) next += 1
  if (next > 1) next -= 1
  if (next < 1 / 6) return p + (q - p) * 6 * next
  if (next < 1 / 2) return q
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6
  return p
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const value = Math.round(l * 255)
    return { r: value, g: value, b: value }
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  }
}

function shiftColor(hex: string, hueTorsion = 0, vibrancy = 0) {
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  const nextHue = ((h * 360 + hueTorsion) % 360 + 360) % 360
  const nextSat = clamp(s + vibrancy / 100, 0, 1)
  const nextRgb = hslToRgb(nextHue / 360, nextSat, l)
  return rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b)
}

function mixColors(baseHex: string, targetHex: string, ratio: number) {
  const amount = clamp(ratio, 0, 1)
  const base = hexToRgb(baseHex)
  const target = hexToRgb(targetHex)
  return rgbToHex(
    base.r + (target.r - base.r) * amount,
    base.g + (target.g - base.g) * amount,
    base.b + (target.b - base.b) * amount
  )
}

function isDarkColor(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance < 0.58
}

function sanitizeColorOverrides(value: unknown) {
  if (!isPlainObject(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, color]) => [String(key).trim(), sanitizeHexColor(color)])
      .filter(([key]) => key)
  )
}

export function createDefaultCanvasThemeState() {
  return {
    activeThemeName: DEFAULT_THEME_NAME,
    themes: {
      [DEFAULT_THEME_NAME]: {
        Font: DEFAULT_FONT,
        BasePaletteColor: DEFAULT_BASE_PALETTE_COLOR,
        HueTorsion: 0,
        Vibrancy: 0,
        ColorOverrides: {},
      },
    },
  }
}

export function normalizeCanvasThemeState(value: unknown) {
  const fallback = createDefaultCanvasThemeState()
  const source = isPlainObject(value) ? value : {}
  const rawThemes = isPlainObject(source.themes) ? source.themes : fallback.themes

  const themes = Object.fromEntries(
    Object.entries(rawThemes).map(([rawName, rawTheme]) => {
      const name = sanitizeThemeName(rawName)
      const themeSource = isPlainObject(rawTheme) ? rawTheme : {}
      return [name, {
        Font: sanitizeFont(themeSource.Font),
        BasePaletteColor: sanitizeHexColor(themeSource.BasePaletteColor),
        HueTorsion: clamp(sanitizeNumber(themeSource.HueTorsion, 0), -360, 360),
        Vibrancy: clamp(sanitizeNumber(themeSource.Vibrancy, 0), -100, 100),
        ColorOverrides: sanitizeColorOverrides(themeSource.ColorOverrides),
      }]
    })
  )

  const safeThemes = Object.keys(themes).length ? themes : fallback.themes
  const requestedActiveName = sanitizeThemeName(source.activeThemeName)
  const activeThemeName = safeThemes[requestedActiveName]
    ? requestedActiveName
    : Object.keys(safeThemes)[0]

  return {
    activeThemeName,
    themes: safeThemes,
  }
}

export function getActiveCanvasThemeDefinition(canvasTheme: any) {
  const normalized = normalizeCanvasThemeState(canvasTheme)
  return {
    name: normalized.activeThemeName,
    ...(normalized.themes[normalized.activeThemeName] || normalized.themes[Object.keys(normalized.themes)[0]]),
  }
}

export function resolveCanvasTheme(canvasTheme: any) {
  const activeTheme = getActiveCanvasThemeDefinition(canvasTheme)
  const transformedBase = shiftColor(
    activeTheme.BasePaletteColor,
    activeTheme.HueTorsion,
    activeTheme.Vibrancy
  )

  const colors = {
    Lighter30: mixColors(transformedBase, '#ffffff', 0.86),
    Lighter20: mixColors(transformedBase, '#ffffff', 0.72),
    Lighter10: mixColors(transformedBase, '#ffffff', 0.5),
    Base: transformedBase,
    Darker10: mixColors(transformedBase, '#000000', 0.12),
    Darker20: mixColors(transformedBase, '#000000', 0.24),
    Darker30: mixColors(transformedBase, '#000000', 0.36),
    Darker40: mixColors(transformedBase, '#000000', 0.5),
    Primary: transformedBase,
    PrimaryForeground: isDarkColor(transformedBase) ? '#ffffff' : '#1b1a19',
  }

  return {
    Name: activeTheme.name,
    Font: activeTheme.Font,
    BasePaletteColor: transformedBase,
    HueTorsion: activeTheme.HueTorsion,
    Vibrancy: activeTheme.Vibrancy,
    ColorOverrides: activeTheme.ColorOverrides || {},
    Colors: {
      ...colors,
      ...(activeTheme.ColorOverrides || {}),
    },
  }
}

function escapeYamlString(value: unknown) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function themesToYaml(canvasTheme: any) {
  const normalized = normalizeCanvasThemeState(canvasTheme)
  const lines = ['Themes:']

  for (const [themeName, definition] of Object.entries(normalized.themes)) {
    lines.push(`  ${themeName}:`)
    lines.push(`    Font: ="${escapeYamlString(definition.Font)}"`)
    lines.push(`    BasePaletteColor: ="${definition.BasePaletteColor}"`)
    lines.push(`    HueTorsion: =${definition.HueTorsion}`)
    lines.push(`    Vibrancy: =${definition.Vibrancy}`)

    const colorOverrideEntries = Object.entries(definition.ColorOverrides || {})
    if (colorOverrideEntries.length) {
      lines.push('    ColorOverrides:')
      for (const [key, color] of colorOverrideEntries) {
        lines.push(`      ${key}: ="${color}"`)
      }
    }
  }

  return lines.join('\n')
}
