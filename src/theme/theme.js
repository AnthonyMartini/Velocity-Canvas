const hexToRgbChannels = (hex) => {
  const clean = String(hex || '').replace('#', '').trim()
  if (clean.length === 3) {
    const [r, g, b] = clean.split('').map(char => parseInt(char + char, 16))
    return `${r} ${g} ${b}`
  }

  const value = clean.length >= 6 ? clean.slice(0, 6) : '000000'
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

const varRef = (name) => `var(${name})`
const deepClone = (value) => JSON.parse(JSON.stringify(value))

export const appTheme = {
  fonts: {
    sans: `'Selawik', 'Inter', system-ui, sans-serif`,
    mono: `'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace`,
  },
  colors: {
    base: '#1e1e1e',
    surface: '#252526',
    overlay: '#3c3c3c',
    accent: '#0e639c',
    accentDark: '#1177bb',
    text: '#d4d4d4',
    subtext: '#9da5b4',
    green: '#4ec9b0',
    red: '#f14c4c',
    yellow: '#d7ba7d',
    white: '#ffffff',
    panel: '#181818',
    panelScrim: 'rgba(0, 0, 0, 0.48)',
    canvasWorkspace: '#202124',
    canvasSurface: '#1e1e1e',
    canvasGridDot: '#2d2d30',
    selection: '#094771',
    selectionSoft: 'rgba(9, 71, 113, 0.35)',
    selectionStrong: 'rgba(14, 99, 156, 0.55)',
    gallerySelection: '#7c3aed',
    gallerySelectionSoft: 'rgba(124, 58, 237, 0.22)',
    gallerySelectionStrong: 'rgba(124, 58, 237, 0.45)',
    controlText: '#d4d4d4',
    controlTextMuted: '#9da5b4',
    controlBorder: '#3c3c3c',
    controlBorderStrong: '#4b4b4b',
    controlSurface: '#2d2d30',
    controlDisabled: '#6b7280',
    controlDisabledFill: '#252526',
    transparent: 'rgba(0,0,0,0)',
    placeholder: '#808080',
  },
  gradients: {
    askAi: 'linear-gradient(180deg,#1177bb 0%,#0e639c 45%,#094771 100%)',
    canvasGrid: 'radial-gradient(circle, var(--vc-color-canvas-grid-dot) 1px, transparent 1px)',
  },
  shadows: {
    selection: '0 0 0 3px rgba(14, 99, 156, 0.24)',
    selectionInset: '0 0 0 2px #0e639c inset',
    gallerySelection: '0 0 0 3px rgba(124, 58, 237, 0.24)',
    gallerySelectionInset: '0 0 0 2px #7c3aed inset',
    canvas: '0 16px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.04)',
    controlRest: '0 2px 8px rgba(0,0,0,0.24)',
    dragGuide: '0 0 6px rgba(14, 99, 156, 0.4)',
    floatingPanel: '0 24px 64px rgba(0, 0, 0, 0.62)',
    spotlight: '0 0 24px rgba(14, 99, 156, 0.18)',
    chatDock: '0 -14px 40px rgba(0, 0, 0, 0.45)',
  },
  editor: {
    panelBackground: '#181818',
    modalBackground: '#252526',
    scrim: 'rgba(0, 0, 0, 0.65)',
    selection: {
      color: '#0e639c',
      soft: 'rgba(14, 99, 156, 0.25)',
      strong: 'rgba(14, 99, 156, 0.5)',
    },
    gallerySelection: {
      color: '#7c3aed',
      soft: 'rgba(124, 58, 237, 0.24)',
      strong: 'rgba(124, 58, 237, 0.46)',
    },
    askAi: {
      gradient: 'linear-gradient(180deg,#1177bb 0%,#0e639c 45%,#094771 100%)',
      border: 'rgba(255,255,255,0.12)',
      glow: 'rgba(14,99,156,0.35)',
      glowHover: 'rgba(14,99,156,0.48)',
      iconGlow: 'rgba(9,71,113,0.4)',
      insetHighlight: 'rgba(255,255,255,0.12)',
      insetShadow: 'rgba(9,71,113,0.42)',
    },
    tour: {
      popupBorder: 'rgba(255, 255, 255, 0.1)',
    },
  },
  controlDefaults: {
    Button: {
      BorderColor: '#005a9e',
      Color: '#ffffff',
      DisabledBorderColor: '#a1a1a1',
      DisabledColor: '#a1a1a1',
      DisabledFill: '#f3f2f1',
      Fill: '#0078d4',
      FocusedBorderColor: '#0078d4',
      HoverBorderColor: '#004578',
      HoverColor: '#ffffff',
      HoverFill: '#005a9e',
      PressedBorderColor: '#002440',
      PressedColor: '#ffffff',
      PressedFill: '#004578',
    },
    Checkbox: {
      BorderColor: '#605e5c',
      CheckboxBackgroundFill: '#0078d4',
      CheckboxBorderColor: '#0078d4',
      CheckmarkFill: '#ffffff',
      Color: '#323130',
      DisabledBorderColor: '#a1a1a1',
      DisabledColor: '#a1a1a1',
      DisabledFill: 'rgba(0,0,0,0)',
      Fill: 'rgba(0,0,0,0)',
      FocusedBorderColor: '#0078d4',
      HoverBorderColor: '#004578',
      HoverColor: '#323130',
      HoverFill: 'rgba(0,0,0,0)',
      PressedBorderColor: '#002440',
      PressedColor: '#323130',
      PressedFill: 'rgba(0,0,0,0)',
    },
    ComboBox: {
      BorderColor: '#8a8886',
      FocusedBorderColor: '#0078d4',
    },
    Container: {
      BorderColor: '#8a8886',
      Fill: 'rgba(0,0,0,0)',
    },
    DatePicker: {
      BorderColor: '#8a8886',
      Color: '#323130',
      DisabledBorderColor: '#a1a1a1',
      DisabledColor: '#a1a1a1',
      DisabledFill: '#f3f2f1',
      Fill: '#ffffff',
      FocusedBorderColor: '#0078d4',
      IconBackground: 'rgba(0,0,0,0)',
      IconFill: '#605e5c',
    },
    Dropdown: {
      BorderColor: '#605e5c',
      Color: '#323130',
      DisabledBorderColor: '#a1a1a1',
      DisabledColor: '#a1a1a1',
      DisabledFill: '#f3f2f1',
      Fill: '#ffffff',
      FocusedBorderColor: '#0078d4',
      HoverBorderColor: '#323130',
      HoverColor: '#323130',
      HoverFill: '#ffffff',
      PressedBorderColor: '#0078d4',
      PressedColor: '#323130',
      PressedFill: '#ffffff',
      SelectionColor: '#ffffff',
      SelectionFill: '#0078d4',
    },
    Gallery: {
      BorderColor: 'rgba(0,0,0,0)',
      Fill: 'rgba(0,0,0,0)',
      TemplateFill: 'rgba(0,0,0,0)',
    },
    HtmlText: {
      BorderColor: 'rgba(0,0,0,0)',
      Color: '#323130',
      DisabledBorderColor: 'rgba(0,0,0,0)',
      DisabledFill: 'rgba(0,0,0,0)',
      Fill: 'rgba(0,0,0,0)',
      HoverBorderColor: 'rgba(0,0,0,0)',
    },
    Icon: {
      Color: '#0e639c',
      Fill: 'rgba(0,0,0,0)',
      FocusedBorderColor: 'rgba(0,0,0,0)',
      HoverFill: 'rgba(0,0,0,0)',
      PressedBorderColor: 'rgba(0,0,0,0)',
      PressedFill: 'rgba(0,0,0,0)',
    },
    Label: {
      BorderColor: 'rgba(0,0,0,0)',
      Color: '#323130',
      DisabledBorderColor: 'rgba(0,0,0,0)',
      DisabledColor: '#a1a1a1',
      DisabledFill: 'rgba(0,0,0,0)',
      Fill: 'rgba(0,0,0,0)',
      FocusedBorderColor: 'rgba(0,0,0,0)',
      HoverBorderColor: 'rgba(0,0,0,0)',
      HoverColor: '#323130',
      HoverFill: 'rgba(0,0,0,0)',
      PressedBorderColor: 'rgba(0,0,0,0)',
      PressedColor: '#323130',
      PressedFill: 'rgba(0,0,0,0)',
    },
    Rectangle: {
      Fill: '#0078d4',
      FocusedBorderColor: '#0078d4',
      HoverFill: '#005a9e',
      PressedBorderColor: '#002440',
      PressedFill: '#004578',
    },
    Screen: {
      Fill: 'RGBA(255, 255, 255, 1)',
    },
    TextInput: {
      BorderColor: '#8a8886',
      Color: '#201f1e',
      DisabledBorderColor: '#a1a1a1',
      DisabledColor: '#a1a1a1',
      DisabledFill: '#f3f2f1',
      Fill: '#ffffff',
      FocusedBorderColor: '#0078d4',
      HoverBorderColor: '#323130',
      HoverColor: '#201f1e',
      HoverFill: '#ffffff',
      PressedBorderColor: '#0078d4',
      PressedColor: '#201f1e',
      PressedFill: '#ffffff',
    },
  },
}

export const themeTailwindColors = {
  base: 'rgb(var(--vc-color-base-rgb) / <alpha-value>)',
  surface: 'rgb(var(--vc-color-surface-rgb) / <alpha-value>)',
  overlay: 'rgb(var(--vc-color-overlay-rgb) / <alpha-value>)',
  accent: 'rgb(var(--vc-color-accent-rgb) / <alpha-value>)',
  'accent-dark': 'rgb(var(--vc-color-accent-dark-rgb) / <alpha-value>)',
  text: 'rgb(var(--vc-color-text-rgb) / <alpha-value>)',
  subtext: 'rgb(var(--vc-color-subtext-rgb) / <alpha-value>)',
  green: 'rgb(var(--vc-color-green-rgb) / <alpha-value>)',
  red: 'rgb(var(--vc-color-red-rgb) / <alpha-value>)',
  yellow: 'rgb(var(--vc-color-yellow-rgb) / <alpha-value>)',
}

export const themeCssVariables = {
  '--vc-font-sans': appTheme.fonts.sans,
  '--vc-font-mono': appTheme.fonts.mono,
  '--vc-color-base': appTheme.colors.base,
  '--vc-color-base-rgb': hexToRgbChannels(appTheme.colors.base),
  '--vc-color-surface': appTheme.colors.surface,
  '--vc-color-surface-rgb': hexToRgbChannels(appTheme.colors.surface),
  '--vc-color-overlay': appTheme.colors.overlay,
  '--vc-color-overlay-rgb': hexToRgbChannels(appTheme.colors.overlay),
  '--vc-color-accent': appTheme.colors.accent,
  '--vc-color-accent-rgb': hexToRgbChannels(appTheme.colors.accent),
  '--vc-color-accent-dark': appTheme.colors.accentDark,
  '--vc-color-accent-dark-rgb': hexToRgbChannels(appTheme.colors.accentDark),
  '--vc-color-text': appTheme.colors.text,
  '--vc-color-text-rgb': hexToRgbChannels(appTheme.colors.text),
  '--vc-color-subtext': appTheme.colors.subtext,
  '--vc-color-subtext-rgb': hexToRgbChannels(appTheme.colors.subtext),
  '--vc-color-green': appTheme.colors.green,
  '--vc-color-green-rgb': hexToRgbChannels(appTheme.colors.green),
  '--vc-color-red': appTheme.colors.red,
  '--vc-color-red-rgb': hexToRgbChannels(appTheme.colors.red),
  '--vc-color-yellow': appTheme.colors.yellow,
  '--vc-color-yellow-rgb': hexToRgbChannels(appTheme.colors.yellow),
  '--vc-color-white': appTheme.colors.white,
  '--vc-color-panel': appTheme.colors.panel,
  '--vc-color-panel-scrim': appTheme.colors.panelScrim,
  '--vc-color-canvas-workspace': appTheme.colors.canvasWorkspace,
  '--vc-color-canvas-surface': appTheme.colors.canvasSurface,
  '--vc-color-canvas-grid-dot': appTheme.colors.canvasGridDot,
  '--vc-color-selection': appTheme.colors.selection,
  '--vc-color-selection-soft': appTheme.colors.selectionSoft,
  '--vc-color-selection-strong': appTheme.colors.selectionStrong,
  '--vc-color-gallery-selection': appTheme.colors.gallerySelection,
  '--vc-color-gallery-selection-soft': appTheme.colors.gallerySelectionSoft,
  '--vc-color-gallery-selection-strong': appTheme.colors.gallerySelectionStrong,
  '--vc-color-control-text': appTheme.colors.controlText,
  '--vc-color-control-text-muted': appTheme.colors.controlTextMuted,
  '--vc-color-control-border': appTheme.colors.controlBorder,
  '--vc-color-control-border-strong': appTheme.colors.controlBorderStrong,
  '--vc-color-control-surface': appTheme.colors.controlSurface,
  '--vc-color-control-disabled': appTheme.colors.controlDisabled,
  '--vc-color-control-disabled-fill': appTheme.colors.controlDisabledFill,
  '--vc-color-placeholder': appTheme.colors.placeholder,
  '--vc-gradient-ask-ai': appTheme.gradients.askAi,
  '--vc-gradient-canvas-grid': appTheme.gradients.canvasGrid,
  '--vc-shadow-selection': appTheme.shadows.selection,
  '--vc-shadow-selection-inset': appTheme.shadows.selectionInset,
  '--vc-shadow-gallery-selection': appTheme.shadows.gallerySelection,
  '--vc-shadow-gallery-selection-inset': appTheme.shadows.gallerySelectionInset,
  '--vc-shadow-canvas': appTheme.shadows.canvas,
  '--vc-shadow-control-rest': appTheme.shadows.controlRest,
  '--vc-shadow-drag-guide': appTheme.shadows.dragGuide,
  '--vc-shadow-floating-panel': appTheme.shadows.floatingPanel,
  '--vc-shadow-spotlight': appTheme.shadows.spotlight,
  '--vc-shadow-chat-dock': appTheme.shadows.chatDock,
}

export const themeVars = {
  fonts: {
    sans: varRef('--vc-font-sans'),
    mono: varRef('--vc-font-mono'),
  },
  colors: {
    base: varRef('--vc-color-base'),
    surface: varRef('--vc-color-surface'),
    overlay: varRef('--vc-color-overlay'),
    accent: varRef('--vc-color-accent'),
    accentDark: varRef('--vc-color-accent-dark'),
    text: varRef('--vc-color-text'),
    subtext: varRef('--vc-color-subtext'),
    green: varRef('--vc-color-green'),
    red: varRef('--vc-color-red'),
    yellow: varRef('--vc-color-yellow'),
    white: varRef('--vc-color-white'),
    panel: varRef('--vc-color-panel'),
    panelScrim: varRef('--vc-color-panel-scrim'),
    canvasWorkspace: varRef('--vc-color-canvas-workspace'),
    canvasSurface: varRef('--vc-color-canvas-surface'),
    canvasGridDot: varRef('--vc-color-canvas-grid-dot'),
    selection: varRef('--vc-color-selection'),
    selectionSoft: varRef('--vc-color-selection-soft'),
    selectionStrong: varRef('--vc-color-selection-strong'),
    gallerySelection: varRef('--vc-color-gallery-selection'),
    gallerySelectionSoft: varRef('--vc-color-gallery-selection-soft'),
    gallerySelectionStrong: varRef('--vc-color-gallery-selection-strong'),
    controlText: varRef('--vc-color-control-text'),
    controlTextMuted: varRef('--vc-color-control-text-muted'),
    controlBorder: varRef('--vc-color-control-border'),
    controlBorderStrong: varRef('--vc-color-control-border-strong'),
    controlSurface: varRef('--vc-color-control-surface'),
    controlDisabled: varRef('--vc-color-control-disabled'),
    controlDisabledFill: varRef('--vc-color-control-disabled-fill'),
    placeholder: varRef('--vc-color-placeholder'),
  },
  gradients: {
    askAi: varRef('--vc-gradient-ask-ai'),
    canvasGrid: varRef('--vc-gradient-canvas-grid'),
  },
  shadows: {
    selection: varRef('--vc-shadow-selection'),
    selectionInset: varRef('--vc-shadow-selection-inset'),
    gallerySelection: varRef('--vc-shadow-gallery-selection'),
    gallerySelectionInset: varRef('--vc-shadow-gallery-selection-inset'),
    canvas: varRef('--vc-shadow-canvas'),
    controlRest: varRef('--vc-shadow-control-rest'),
    dragGuide: varRef('--vc-shadow-drag-guide'),
    floatingPanel: varRef('--vc-shadow-floating-panel'),
    spotlight: varRef('--vc-shadow-spotlight'),
    chatDock: varRef('--vc-shadow-chat-dock'),
  },
}

export const selectionKinds = {
  default: {
    color: themeVars.colors.selection,
    soft: themeVars.colors.selectionSoft,
    strong: themeVars.colors.selectionStrong,
    shadow: themeVars.shadows.selection,
    insetShadow: themeVars.shadows.selectionInset,
  },
  gallery: {
    color: themeVars.colors.gallerySelection,
    soft: themeVars.colors.gallerySelectionSoft,
    strong: themeVars.colors.gallerySelectionStrong,
    shadow: themeVars.shadows.gallerySelection,
    insetShadow: themeVars.shadows.gallerySelectionInset,
  },
}

export function getSelectionStyles(selected, kind = 'default', restShadow = 'none') {
  const token = selectionKinds[kind] || selectionKinds.default
  return {
    outline: selected ? `2px solid ${token.color}` : 'none',
    outlineOffset: selected ? '2px' : '0',
    boxShadow: selected ? token.shadow : restShadow,
  }
}

export function getInsetSelectionStyles(selected, kind = 'default', restShadow = 'none') {
  const token = selectionKinds[kind] || selectionKinds.default
  return {
    boxShadow: selected ? token.insetShadow : restShadow,
  }
}

export function getDragOutlineStyles(kind = 'default') {
  const token = selectionKinds[kind] || selectionKinds.default
  return {
    outline: `4px solid ${token.strong}`,
    outlineOffset: '2px',
  }
}

export function applyThemeToSchema(schema, overrides = {}) {
  const themedSchema = deepClone(schema)
  themedSchema.defaults = {
    ...(themedSchema.defaults || {}),
    ...overrides,
  }
  return themedSchema
}
