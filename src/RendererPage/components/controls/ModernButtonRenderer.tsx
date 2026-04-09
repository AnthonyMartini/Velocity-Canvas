import PropTypes from 'prop-types'
import { CSS_FW } from './cssProps'
import { executeAction } from '../../../common/helpers'
import { resolveSampleText } from './sampleText'
import { getSelectionStyles, themeVars } from '@/theme/theme'

const MODERN_BUTTON_ICON_SVGS: Record<string, { regular: string; filled: string }> = {
  Add: {
    regular: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'><path d='M10 4.5v11M4.5 10h11'/></svg>",
    filled: "<svg viewBox='0 0 20 20' fill='currentColor'><path d='M9 4a1 1 0 0 1 2 0v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4Z'/></svg>",
  },
  Check: {
    regular: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='m4.5 10.5 3.2 3.2L15.5 6'/></svg>",
    filled: "<svg viewBox='0 0 20 20' fill='currentColor'><path d='M16.2 5.2a1 1 0 0 1 .1 1.4l-7.8 9a1 1 0 0 1-1.47.05l-3.4-3.5a1 1 0 1 1 1.44-1.38l2.64 2.75 7.06-8.17a1 1 0 0 1 1.4-.14Z'/></svg>",
  },
  Dismiss: {
    regular: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'><path d='m5 5 10 10M15 5 5 15'/></svg>",
    filled: "<svg viewBox='0 0 20 20' fill='currentColor'><path d='M5.7 4.3a1 1 0 0 1 1.4 0L10 7.17l2.9-2.87a1 1 0 0 1 1.4 1.42L11.4 8.6l2.88 2.9a1 1 0 1 1-1.42 1.4L10 10.02 7.1 12.9a1 1 0 1 1-1.4-1.42l2.88-2.88-2.87-2.9a1 1 0 0 1 0-1.4Z'/></svg>",
  },
  Edit: {
    regular: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='m13.8 3.8 2.4 2.4M5 15l2.5-.4 8-8a1.7 1.7 0 0 0-2.4-2.4l-8 8L5 15Z'/></svg>",
    filled: "<svg viewBox='0 0 20 20' fill='currentColor'><path d='M13.62 2.97a2.2 2.2 0 0 1 3.11 0l.3.3a2.2 2.2 0 0 1 0 3.11l-8.8 8.8-3.78.68a.75.75 0 0 1-.87-.87l.68-3.78 8.8-8.8Z'/></svg>",
  },
  Save: {
    regular: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4.5 3.5h8l3 3v10H4.5z'/><path d='M6.5 3.5v4h6v-4M7 16h6'/></svg>",
    filled: "<svg viewBox='0 0 20 20' fill='currentColor'><path d='M4 3.5A1.5 1.5 0 0 1 5.5 2h7.88a1.5 1.5 0 0 1 1.06.44l2.12 2.12c.28.28.44.66.44 1.06V16.5A1.5 1.5 0 0 1 15.5 18h-10A1.5 1.5 0 0 1 4 16.5v-13ZM7 3.5v3h5v-3H7Zm0 9.5a1 1 0 0 0-1 1v2h8v-2a1 1 0 0 0-1-1H7Z'/></svg>",
  },
  Search: {
    regular: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round'><circle cx='8.75' cy='8.75' r='4.75'/><path d='m12.5 12.5 3 3'/></svg>",
    filled: "<svg viewBox='0 0 20 20' fill='currentColor'><path d='M8.75 3a5.75 5.75 0 1 0 3.65 10.2l3.2 3.2a1 1 0 0 0 1.4-1.4l-3.2-3.2A5.75 5.75 0 0 0 8.75 3Zm0 2a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z'/></svg>",
  },
  Delete: {
    regular: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'><path d='M4.5 6.5h11'/><path d='M7.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5'/><path d='M6.5 6.5l.7 8a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9l.7-8'/></svg>",
    filled: "<svg viewBox='0 0 20 20' fill='currentColor'><path d='M7.5 3.75A1.75 1.75 0 0 1 9.25 2h1.5A1.75 1.75 0 0 1 12.5 3.75V4h2.75a.75.75 0 0 1 0 1.5h-.39l-.56 9.07A2 2 0 0 1 12.3 16.5H7.7a2 2 0 0 1-1.99-1.93L5.14 5.5h-.39a.75.75 0 1 1 0-1.5H7.5v-.25Z'/></svg>",
  },
  ArrowExit: {
    regular: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M8 5h-2.5A1.5 1.5 0 0 0 4 6.5v7A1.5 1.5 0 0 0 5.5 15H8'/><path d='M10 10h6'/><path d='m13 7 3 3-3 3'/></svg>",
    filled: "<svg viewBox='0 0 20 20' fill='currentColor'><path d='M5.5 4A2.5 2.5 0 0 0 3 6.5v7A2.5 2.5 0 0 0 5.5 16H8a1 1 0 1 0 0-2H5.5a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5H8a1 1 0 0 0 0-2H5.5Zm8.8 2.3a1 1 0 0 0-1.4 1.4L14.17 9H10a1 1 0 1 0 0 2h4.17l-1.27 1.3a1 1 0 0 0 1.43 1.4l3-3.08a1 1 0 0 0 0-1.4l-3.03-2.92Z'/></svg>",
  },
  ArrowDownload: {
    regular: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M10 4.5v7'/><path d='m7.25 9.5 2.75 2.75 2.75-2.75'/><path d='M4.5 14.5v1h11v-1'/></svg>",
    filled: "<svg viewBox='0 0 20 20' fill='currentColor'><path d='M10 2.75a1 1 0 0 1 1 1V9.6l1.55-1.55a1 1 0 1 1 1.4 1.42l-3.24 3.23a1 1 0 0 1-1.42 0L6.05 9.47a1 1 0 0 1 1.4-1.42L9 9.6V3.75a1 1 0 0 1 1-1ZM4.5 14a1 1 0 0 1 1 1v.5h9V15a1 1 0 1 1 2 0v1A1.5 1.5 0 0 1 15 17.5H5A1.5 1.5 0 0 1 3.5 16v-1a1 1 0 0 1 1-1Z'/></svg>",
  },
  Info: {
    regular: "<svg viewBox='0 0 20 20' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round'><circle cx='10' cy='10' r='6.5'/><path d='M10 9.5v3.5M10 7h.01'/></svg>",
    filled: "<svg viewBox='0 0 20 20' fill='currentColor'><path d='M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm.75 10.5a.75.75 0 0 1-1.5 0V9.5a.75.75 0 0 1 1.5 0V13Zm-.75-6.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z'/></svg>",
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function parseHexColor(color: string) {
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

function toRgba(color: string, alpha = 1) {
  const parsed = parseHexColor(color)
  if (!parsed) return color || `rgba(15,108,189,${alpha})`
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${clamp(alpha, 0, 1)})`
}

function blendWithWhite(color: string, amount = 0.84) {
  const parsed = parseHexColor(color)
  if (!parsed) return color
  const ratio = clamp(amount, 0, 1)
  const r = Math.round(parsed.r + (255 - parsed.r) * ratio)
  const g = Math.round(parsed.g + (255 - parsed.g) * ratio)
  const b = Math.round(parsed.b + (255 - parsed.b) * ratio)
  return `rgb(${r}, ${g}, ${b})`
}

function resolveAppearanceTokens(comp: any, canvasTheme: any = null) {
  const palette = comp.BasePaletteColor || canvasTheme?.BasePaletteColor || '#0f6cbd'
  const appearance = comp.Appearance || 'ModernButtonAppearance.Primary'
  const explicitFontColor = comp.FontColor && String(comp.FontColor).trim() !== '' ? comp.FontColor : null
  const fallbackForeground = canvasTheme?.Colors?.PrimaryForeground || '#ffffff'

  let backgroundColor = palette
  let borderColor = palette
  let textColor = explicitFontColor || fallbackForeground

  if (appearance === 'ModernButtonAppearance.Secondary') {
    backgroundColor = canvasTheme?.Colors?.Lighter20 || blendWithWhite(palette, 0.83)
    borderColor = canvasTheme?.Colors?.Lighter10 || toRgba(palette, 0.25)
    textColor = explicitFontColor || palette
  } else if (appearance === 'ModernButtonAppearance.Outline') {
    backgroundColor = 'transparent'
    borderColor = canvasTheme?.Colors?.Darker10 || toRgba(palette, 0.45)
    textColor = explicitFontColor || palette
  } else if (appearance === 'ModernButtonAppearance.Subtle') {
    backgroundColor = canvasTheme?.Colors?.Lighter30 || toRgba(palette, 0.1)
    borderColor = 'transparent'
    textColor = explicitFontColor || palette
  } else if (appearance === 'ModernButtonAppearance.Transparent') {
    backgroundColor = 'transparent'
    borderColor = 'transparent'
    textColor = explicitFontColor || palette
  }

  return { backgroundColor, borderColor, textColor, palette }
}

function getModernButtonIconMarkup(iconName: string, iconStyle: string) {
  if (!iconName) return null
  const cleanName = typeof iconName === 'string' ? iconName.replace(/^Icon\./, '') : iconName
  const iconEntry = MODERN_BUTTON_ICON_SVGS[cleanName]
  if (!iconEntry) return null
  return iconStyle === 'ModernButtonIconStyle.Filled' ? iconEntry.filled : iconEntry.regular
}

export default function ModernButtonRenderer({
  comp,
  selected,
  isPlaying,
  localVars,
  setLocalVars,
  notify,
  navigate,
  flatNodes,
  parentNode,
  canvasTheme,
  onMouseDown,
  onClick,
  renderZIndex = 1
}) {
  const isViewMode = comp.DisplayMode === 'DisplayMode.View'
  const isDisabledMode = comp.DisplayMode === 'DisplayMode.Disabled'
  const isInteractive = isPlaying && !isViewMode && !isDisabledMode
  const { backgroundColor, borderColor, textColor, palette } = resolveAppearanceTokens(comp, canvasTheme)
  const displayText = resolveSampleText((comp.Text !== undefined && comp.Text !== null) ? comp.Text : 'Button')
  const iconMarkup = getModernButtonIconMarkup(comp.Icon, comp.IconStyle)
  const showIcon = Boolean(iconMarkup) && comp.Layout !== 'ModernButtonLayout.TextOnly'
  const showText = comp.Layout !== 'ModernButtonLayout.IconOnly'
  const isIconAfter = comp.Layout === 'ModernButtonLayout.IconAfter'

  const style: any = {
    position: 'absolute',
    left: `${comp.X}pt`,
    top: `${comp.Y}pt`,
    width: `${comp.Width}pt`,
    height: `${comp.Height}pt`,
    backgroundColor: isDisabledMode ? toRgba(palette, 0.18) : backgroundColor,
    color: isDisabledMode ? toRgba(palette, 0.6) : textColor,
    fontSize: `${comp.FontSize || 14}pt`,
    fontWeight: CSS_FW[comp.FontWeight] || comp.FontWeight || '600',
    fontStyle: comp.FontItalic ? 'italic' : 'normal',
    textDecoration: [
      comp.FontUnderline ? 'underline' : '',
      comp.FontStrikethrough ? 'line-through' : '',
    ].filter(Boolean).join(' ') || 'none',
    fontFamily: comp.Font || canvasTheme?.Font || themeVars.fonts.sans,
    borderRadius: `${comp.BorderRadius || 0}pt`,
    border: `${backgroundColor === 'transparent' ? 1.25 : 1}pt solid ${isDisabledMode ? toRgba(palette, 0.15) : borderColor}`,
    opacity: comp.Visible === false ? 0.3 : (isDisabledMode ? 0.72 : 1),
    cursor: isInteractive ? 'pointer' : (isPlaying ? 'default' : 'move'),
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: showIcon && showText ? '8pt' : 0,
    flexDirection: isIconAfter ? 'row-reverse' : 'row',
    paddingInline: showText ? '12pt' : '8pt',
    boxSizing: 'border-box',
    transition: 'box-shadow 0.1s, outline 0.1s, background-color 0.12s',
    ...getSelectionStyles(selected, 'default', themeVars.shadows.controlRest),
    zIndex: renderZIndex,
  }

  const handleClick = (e: any) => {
    if (!isInteractive) return
    onClick(e)
    if (comp.OnSelect) {
      executeAction(comp.OnSelect, localVars, setLocalVars, notify, navigate, flatNodes, parentNode, comp)
    }
  }

  return (
    <button
      style={style}
      onMouseDown={onMouseDown}
      onClick={handleClick}
      disabled={isPlaying && (isViewMode || isDisabledMode)}
      tabIndex={comp.AcceptsFocus === false ? -1 : 0}
      aria-label={comp.AccessibleLabel || undefined}
    >
      {showIcon && (
        <span
          style={{
            width: showText ? '14pt' : '18pt',
            height: showText ? '14pt' : '18pt',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: comp.IconRotation ? `rotate(${comp.IconRotation}deg)` : undefined,
          }}
          className="[&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current [&>svg]:stroke-current"
          dangerouslySetInnerHTML={{ __html: iconMarkup || '' }}
        />
      )}
      {showText && (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayText}
        </span>
      )}
    </button>
  )
}

ModernButtonRenderer.propTypes = {
  comp: PropTypes.shape({
    X: PropTypes.number.isRequired,
    Y: PropTypes.number.isRequired,
    Width: PropTypes.number.isRequired,
    Height: PropTypes.number.isRequired,
    Text: PropTypes.string,
    OnSelect: PropTypes.string,
    AccessibleLabel: PropTypes.string,
    AcceptsFocus: PropTypes.bool,
    Appearance: PropTypes.string,
    BasePaletteColor: PropTypes.string,
    BorderRadius: PropTypes.number,
    DisplayMode: PropTypes.string,
    Font: PropTypes.string,
    FontColor: PropTypes.string,
    FontItalic: PropTypes.bool,
    FontSize: PropTypes.number,
    FontStrikethrough: PropTypes.bool,
    FontUnderline: PropTypes.bool,
    FontWeight: PropTypes.string,
    Icon: PropTypes.string,
    IconRotation: PropTypes.number,
    IconStyle: PropTypes.string,
    Layout: PropTypes.string,
    Visible: PropTypes.bool,
  }).isRequired,
  selected: PropTypes.bool,
  isPlaying: PropTypes.bool,
  localVars: PropTypes.object,
  setLocalVars: PropTypes.func,
  notify: PropTypes.func,
  navigate: PropTypes.func,
  flatNodes: PropTypes.array,
  parentNode: PropTypes.object,
  canvasTheme: PropTypes.object,
  renderZIndex: PropTypes.number,
  onMouseDown: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
}
