import { SCHEMAS, BORDER_MAP } from '@/features/powerapps/schema'
import { resolveSampleTextDeep } from '@/features/powerapps/sample-text'
import { formatTabListDefaultRecordFormula, parseTabListSelectionRecord } from '@/components/RendererPage/components/controls/modernControlUtils'

const CLOUD_IMAGE_DATA_URI = `"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 120' fill='none'%3E%3Crect x='8' y='8' width='144' height='104' rx='22' fill='%23bfdbfe' fill-opacity='.25'/%3E%3Cpath d='M49 79h50c12.15 0 22-9.85 22-22 0-10.666-8.053-19.52-18.731-20.13C100.23 23.34 88.59 13 74.5 13 62.873 13 53.06 20.21 49.818 31.245 40.283 32.773 33 41.036 33 51c0 11.046 8.954 20 20 20' stroke='%2360a5fa' stroke-width='8' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M71 56l9 9 18-18' stroke='%2360a5fa' stroke-width='8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"`

// ── Unique ID ─────────────────────────────────────────────────────────────────
export const uid = () => `comp_${Math.random().toString(36).substring(2, 11)}`

// ── Name counter per type ────────────────────────────────────────────────────
// Pre-seed Screen to 1 because the initial tree already contains Screen1
const _typeCounts = { Screen: 1 }
export function nextName(type) {
  if (type === 'App') return 'App'
  _typeCounts[type] = (_typeCounts[type] || 0) + 1
  return `${type}${_typeCounts[type]}`
}

// ── Create a fresh component from schema ─────────────────────────────────────
export function createComponent(schema, overrides = {}) {
  const base = JSON.parse(JSON.stringify(schema.defaults))
  return { id: uid(), type: schema.type, name: nextName(schema.type), ...base, ...overrides }
}

// ── Create from LLM spec (merge with defaults) ────────────────────────────────
export function createFromSpec(spec, usedIds?: Set<string>) {
  if (!spec || !spec.type) return null

  // Normalize type lookup (e.g., handle "CONTAINER", "container", "Container")
  const typeKey = Object.keys(SCHEMAS).find(
    k => k.toLowerCase() === spec.type.toLowerCase()
  )
  
  const schema = typeKey ? SCHEMAS[typeKey] : null
  if (!schema && spec.type !== 'UnknownPowerAppsObject') {
    console.warn(`No schema found for type: ${spec.type}`)
    return null
  }

  const base = schema
    ? JSON.parse(JSON.stringify(schema.defaults))
    : {
        X: 40,
        Y: 40,
        Width: 180,
        Height: 96,
        Visible: true,
      }
  
  // Flatten children/Children
  const childrenList = spec.children || spec.Children || []
  const { children, Children, ...rest } = spec
  
  const normalizedRest = resolveSampleTextDeep(rest)
  const processedChildren = childrenList.map(c => createFromSpec(c, usedIds)).filter(Boolean)
  
  let finalId = spec.id || uid()
  if (usedIds) {
    while (usedIds.has(finalId)) {
      finalId = uid()
    }
    usedIds.add(finalId)
  }

  return { 
    ...base, 
    ...normalizedRest, 
    id: finalId, 
    type: schema?.type || spec.type, 
    name: spec.name || nextName(schema?.type || spec.type), 
    children: processedChildren 
  }
}

// ── Extract powerFx variables from a component tree ───────────────────────────
export function extractVariables(tree: any[]): string[] {
  const vars = new Set<string>()
  const ignoredKeys = new Set(['id', 'type', 'name', 'children', 'sourceControl'])

  // PowerFx Set() regex: looks for Set(VariableName , Value)
  // We only want the first argument
  const setRegex = /\bSet\s*\(\s*([a-zA-Z0-9_]+)\s*,/g

  const collectVariablesFromValue = (value: any) => {
    if (typeof value === 'string') {
      setRegex.lastIndex = 0
      let match
      while ((match = setRegex.exec(value)) !== null) {
        if (match[1]) vars.add(match[1])
      }
      return
    }

    if (Array.isArray(value)) {
      for (const item of value) collectVariablesFromValue(item)
      return
    }

    if (value && typeof value === 'object') {
      for (const [key, nestedValue] of Object.entries(value)) {
        if (ignoredKeys.has(key) || key.startsWith('_')) continue
        collectVariablesFromValue(nestedValue)
      }
    }
  }

  const walk = (nodes) => {
    for (const node of nodes) {
      for (const [key, value] of Object.entries(node)) {
        if (ignoredKeys.has(key) || key.startsWith('_')) continue
        collectVariablesFromValue(value)
      }

      if (node.children?.length) {
        walk(node.children)
      }
    }
  }

  walk(tree)
  return Array.from(vars)
}

// ──────────────────────────────────────────────────────────────────────────────
// YAML Generation
// ──────────────────────────────────────────────────────────────────────────────

/** Convert a hex color string to PA RGBA notation */
export function toRgba(hex) {
  const value = String(hex || '').trim()
  if (!value || value === 'transparent') return 'RGBA(0, 0, 0, 0)'
  if (value.startsWith('rgba') || value.startsWith('RGBA')) return value.replace('rgba', 'RGBA')
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) return value

  const clean = value.replace('#', '')
  if (clean.length === 3) {
    const [r, g, b] = clean.split('').map(c => parseInt(c + c, 16))
    return `RGBA(${r}, ${g}, ${b}, 1)`
  }
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `RGBA(${r}, ${g}, ${b}, 1)`
}

const YAML_PROPERTY_DEF_CACHE = new Map()

function getPropertyDef(type, key) {
  if (!type || !key) return null

  if (!YAML_PROPERTY_DEF_CACHE.has(type)) {
    const schema = SCHEMAS?.[type]
    const propertyDefs = schema?.groups
      ? schema.groups.reduce((acc, group) => acc.concat(group.properties || []), [])
      : (schema?.properties || [])

    YAML_PROPERTY_DEF_CACHE.set(type, propertyDefs)
  }

  const propertyDefs = YAML_PROPERTY_DEF_CACHE.get(type) || []
  return propertyDefs.find(property => {
    const propertyKey = property?.key || property?.name
    return String(propertyKey || '').toLowerCase() === String(key || '').toLowerCase()
  }) || null
}

function normalizeFormulaString(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed
}

function getFormulaFlag(node, key) {
  if (!node?._formulaProps || typeof node._formulaProps !== 'object') return false
  return node._formulaProps[key] === true
}

function looksLikeFormulaExpression(value, propDef = null) {
  const normalized = normalizeFormulaString(value)
  if (typeof normalized !== 'string' || !normalized) return false

  if (
    propDef?.type === 'color' &&
    /^(RGBA|ColorValue)\([^()]*\)$/i.test(normalized)
  ) {
    return false
  }

  if (
    (/^".*"$/.test(normalized) || /^'.*'$/.test(normalized)) ||
    /^-?\d+(?:\.\d+)?$/.test(normalized) ||
    /^(true|false)$/i.test(normalized) ||
    /^#(?:[0-9a-fA-F]{3,8})$/.test(normalized) ||
    /^[A-Z][A-Za-z0-9_]*\.[A-Z][A-Za-z0-9_]*$/.test(normalized)
  ) {
    return false
  }

  return (
    /[()&+\-*/<>=;,[\]{}:]/.test(normalized) ||
    /^(Parent|Self|ThisItem|ThisRecord)\./.test(normalized) ||
    /^[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(normalized) ||
    /^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z0-9_]+/.test(normalized)
  )
}

function isFormulaPropertyValue(node, key, value, propDef = null) {
  if (typeof value !== 'string') return false
  if (value.trim().startsWith('=')) return true
  if (getFormulaFlag(node, key)) return true
  return looksLikeFormulaExpression(value, propDef)
}

function shouldUseLiteralBlockForFormula(key, serializedFormula, propDef = null) {
  const normalized = normalizeFormulaString(serializedFormula)
  if (key === 'Items') return true
  if (propDef?.type === 'text' || propDef?.type === 'string') return true

  // YAML plain scalars break on Power Fx record syntax like `{ Value: "Tab" }`.
  return /:\s|[\r\n]/.test(normalized)
}

function formatColorValue(node, key, value) {
  const propDef = getPropertyDef(node?.type, key)
  if (isFormulaPropertyValue(node, key, value, propDef)) {
    return normalizeFormulaString(String(value))
  }
  return toRgba(value)
}

/** Recursively convert a component tree node to PA YAML string.
 *  col = the column where the leading `- Name:` dash sits (0 for root). */
export function componentToYaml(node, col = 0) {
  const sp = (n) => ' '.repeat(n)   // exact column indent
  const safeName = (s) => (s || '').replace(/[^a-zA-Z0-9]/g, '').replace(/^\d+/, '') || 'Ctrl'
  const color = (key, value) => formatColorValue(node, key, value)

  if (node.type === 'UnknownPowerAppsObject' && node._rawPowerAppsYaml) {
    return String(node._rawPowerAppsYaml)
      .split('\n')
      .map(line => line ? `${sp(col)}${line}` : '')
      .join('\n')
  }

  // Use explicit name if set, otherwise derive from text
  let name = node.name
  if (!name) {
    if (node.type === 'Container') {
      name = 'Container'
    } else if (node.type === 'Button' || node.type === 'ModernButton') {
      name = (safeName(node.Text) || 'Button') + 'Button'
    } else if (node.type === 'ModernCheckbox') {
      name = (safeName(node.Label) || 'Checkbox') + 'Checkbox'
    } else if (node.type === 'ModernDropdown') {
      name = 'Dropdown'
    } else if (node.type === 'ModernTabList') {
      name = 'TabList'
    } else if (node.type === 'ModernComboBox') {
      name = 'ComboBox'
    } else if (node.type === 'ModernProgressBar') {
      name = 'ProgressBar'
    } else if (node.type === 'ModernSlider') {
      name = 'Slider'
    } else if (node.type === 'ModernSpinner') {
      name = (safeName(node.Label) || 'Spinner') + 'Spinner'
    } else if (node.type === 'ModernText') {
      name = (safeName(node.Text) || 'Text') + 'Text'
    } else if (node.type === 'ModernTextInput') {
      name = (safeName(node.Placeholder || node.Default) || 'TextInput') + 'Input'
    } else if (node.type === 'ModernToggle') {
      name = (safeName(node.Label) || 'Toggle') + 'Toggle'
    } else if (node.type === 'Link') {
      name = (safeName(node.Text) || 'Link') + 'Link'
    } else if (node.type === 'NumberInput') {
      name = (safeName(node.HintText) || 'NumberInput') + 'Input'
    } else if (node.type === 'ModernDatePicker') {
      name = 'DatePicker'
    } else if (node.type === 'RichTextEditor') {
      name = 'RichTextEditor'
    } else if (node.type === 'Rating') {
      name = 'Rating'
    } else if (node.type === 'TextInput') {
      name = (safeName(node.HintText) || 'TextInput') + 'Input'
    } else if (node.type === 'Dropdown') {
      name = (safeName(node.Default) || 'Dropdown') + 'Dropdown'
    } else if (node.type === 'Image') {
      name = 'Image'
    } else if (node.type === 'ListBox') {
      name = (safeName(node.Default) || 'ListBox') + 'ListBox'
    } else {
      name = (safeName(node.Text) || 'Label') + 'Label'
    }
  }

  const controlMap = {
    Button:    'Classic/Button@2.2.0',
    ModernButton: 'Button@0.0.45',
    ModernDropdown: 'Dropdown',
    ModernTabList: 'ModernTabList@1.0.0',
    ModernCheckbox: 'Checkbox',
    ModernComboBox: 'Combobox',
    ModernProgressBar: 'ProgressBar',
    ModernSlider: 'Slider',
    ModernSpinner: 'Spinner',
    ModernText: 'ModernText',
    ModernTextInput: 'TextInput',
    ModernToggle: 'Toggle',
    Link: 'Link',
    NumberInput: 'NumberInput',
    ModernDatePicker: 'DatePicker',
    RichTextEditor: 'RichTextEditor',
    Rating: 'Rating',
    Label:     'Label@2.5.1',
    Container: 'GroupContainer@1.4.0',
    TextInput: 'Classic/TextInput@2.3.2',
    Dropdown: 'Classic/DropDown@2.3.1',
    Image: 'Image@2.2.3',
    ListBox: 'Classic/ListBox@2.2.0',
    Checkbox: 'Classic/Checkbox@2.1.2',
    Rectangle: 'Rectangle@2.3.0',
    Icon: 'Classic/Icon@2.5.0',
    HtmlText: 'HtmlViewer@2.1.0',
    DatePicker: 'Classic/DatePicker@2.2.0',
    ComboBox: 'Classic/ComboBox@2.4.0',
    Toggle: 'Classic/Toggle@1.1.0',
    Radio: 'Classic/Radio@2.1.0',
    Slider: 'Classic/Slider@1.0.0',
    Gallery:   'Gallery@2.15.0',
  }

  const lines = []

  // Header  ── col 0: "- Name:"
  //           ── col+4: Control / Variant / Properties / Children
  //           ── col+6: property values
  
  if (node.type === 'App') {
    lines.push('Screens:')
    if (node.children?.length) {
      for (const child of node.children) {
        lines.push(componentToYaml(child, 2))
      }
    }
    return lines.join('\n')
  }

  if (node.type === 'Screen') {
    lines.push(`${sp(col)}${name}:`)
    lines.push(`${sp(col + 2)}Properties:`)
    lines.push(`${sp(col + 4)}Fill: =${color('Fill', node.Fill)}`)
    lines.push(`${sp(col + 2)}Children:`)
    if (node.children?.length) {
      for (const child of node.children) {
        lines.push(componentToYaml(child, col + 4))
      }
    }
    return lines.join('\n')
  }

  lines.push(`${sp(col)}- ${name}:`)
  lines.push(`${sp(col + 4)}Control: ${controlMap[node.type]}`)
  if (node.type === 'Container') {
    lines.push(`${sp(col + 4)}Variant: ManualLayout`)
  } else if (node.type === 'Gallery') {
    lines.push(`${sp(col + 4)}Variant: ${node.Variant}`)
  }
  lines.push(`${sp(col + 4)}Properties:`)

  const p = (k, v) => {
    if (v === undefined || v === null) return
    const propDef = getPropertyDef(node?.type, k)
    const isTextProperty = propDef?.type === 'text' || propDef?.type === 'string'

    const pushLiteralBlock = (valueLine: string) => {
      lines.push(`${sp(col + 6)}${k}: |-`)
      lines.push(`${sp(col + 8)}${valueLine}`)
    }

    // Normalize smart quotes to straight quotes
    let valStr = String(v).trim().replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    
    // Legacy formula prefix support
    if (isFormulaPropertyValue(node, k, valStr, propDef) || valStr.startsWith('=')) {
      let formula = normalizeFormulaString(valStr)
      // Strip outer quotes if redundant (e.g. ="Notify(...)")
      if ((formula.startsWith('"') && formula.endsWith('"')) || (formula.startsWith("'") && formula.endsWith("'"))) {
        const inner = formula.slice(1, -1)
        // If the inner content looks like a function, strip quotes
        if (/^[A-Z][a-zA-Z0-9]*\s*\(/.test(inner)) {
          formula = inner
        }
      }
      const serialized = `=${formula}`
      if (shouldUseLiteralBlockForFormula(k, serialized, propDef)) pushLiteralBlock(serialized)
      else lines.push(`${sp(col + 6)}${k}: ${serialized}`)
      return
    }

    const isQuoted = (valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))
    const isNumeric = !isNaN(Number(valStr)) && valStr !== ''
    const isBoolean = valStr === 'true' || valStr === 'false'
    const isFunction = /^[A-Z][a-zA-Z0-9]*\s*\(/.test(valStr)

    // Handle quoted strings that are actually functions (e.g. "Notify(...)")
    if (isQuoted) {
      const inner = valStr.slice(1, -1).trim()
      if (/^[A-Z][a-zA-Z0-9]*\s*\(/.test(inner)) {
        const serialized = `=${inner}`
        if (shouldUseLiteralBlockForFormula(k, serialized, propDef)) pushLiteralBlock(serialized)
        else lines.push(`${sp(col + 6)}${k}: ${serialized}`)
        return
      }
    }

    // Enums look like Object.Member (e.g. Icon.Add, FontWeight.Bold)
    const isEnum = /^[A-Z][a-zA-Z0-9]*\.[A-Z][a-zA-Z0-9]*$/.test(valStr) || 
                   ['DisplayMode.Edit', 'DisplayMode.View', 'DisplayMode.Disabled', 'BorderStyle.Solid', 'BorderStyle.None', 'BorderStyle.Dashed', 'BorderStyle.Dotted'].includes(valStr)

    const isFormulaSpecial = valStr.startsWith('[') || valStr.startsWith('{')

    if (k === 'Items') {
      pushLiteralBlock(`=${valStr}`)
    } else if (isQuoted || isEnum || isFormulaSpecial) {
      const serialized = `=${valStr}`
      if (shouldUseLiteralBlockForFormula(k, serialized, propDef)) pushLiteralBlock(serialized)
      else lines.push(`${sp(col + 6)}${k}: ${serialized}`)
    } else if (isNumeric || isBoolean || isFunction) {
      const serialized = `=${valStr}`
      if (shouldUseLiteralBlockForFormula(k, serialized, propDef)) pushLiteralBlock(serialized)
      else lines.push(`${sp(col + 6)}${k}: ${serialized}`)
    } else {
      // It's a literal string that isn't quoted. Wrap it in quotes.
      const serialized = `="${valStr}"`
      if (isTextProperty) pushLiteralBlock(serialized)
      else lines.push(`${sp(col + 6)}${k}: ${serialized}`)
    }
  }

  if (node.type === 'Button') {
    const radiusTopLeft = node.RadiusTopLeft ?? node.BorderRadius
    const radiusTopRight = node.RadiusTopRight ?? node.BorderRadius
    const radiusBottomLeft = node.RadiusBottomLeft ?? node.BorderRadius
    const radiusBottomRight = node.RadiusBottomRight ?? node.BorderRadius
    p('Text', node.Text || '"Button"')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Fill', color('Fill', node.Fill))
    p('Color', color('Color', node.Color))
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('Align', node.Align)
    p('VerticalAlign', node.VerticalAlign)
    p('RadiusTopLeft', radiusTopLeft)
    p('RadiusTopRight', radiusTopRight)
    p('RadiusBottomLeft', radiusBottomLeft)
    p('RadiusBottomRight', radiusBottomRight)
    p('BorderColor', color('BorderColor', node.BorderColor))
    p('BorderThickness', node.BorderThickness)
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    if (node.HoverFill) p('HoverFill', color('HoverFill', node.HoverFill))
    if (node.HoverColor) p('HoverColor', color('HoverColor', node.HoverColor))
    if (node.PressedFill) p('PressedFill', color('PressedFill', node.PressedFill))
    if (node.PressedColor) p('PressedColor', color('PressedColor', node.PressedColor))
    if (node.PaddingTop) p('PaddingTop', node.PaddingTop)
    if (node.PaddingBottom) p('PaddingBottom', node.PaddingBottom)
    if (node.PaddingLeft) p('PaddingLeft', node.PaddingLeft)
    if (node.PaddingRight) p('PaddingRight', node.PaddingRight)
    if (node.Italic)   p('Italic', 'true')
    if (node.Underline) p('Underline', 'true')
    if (node.Strikethrough) p('Strikethrough', 'true')
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode === 'DisplayMode.Disabled') p('DisplayMode', 'DisplayMode.Disabled')
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'ModernButton') {
    const modernAppearanceMap = {
      'ModernButtonAppearance.Primary': "'ButtonCanvas.Appearance'.Primary",
      'ModernButtonAppearance.Secondary': "'ButtonCanvas.Appearance'.Secondary",
      'ModernButtonAppearance.Outline': "'ButtonCanvas.Appearance'.Outline",
      'ModernButtonAppearance.Subtle': "'ButtonCanvas.Appearance'.Subtle",
      'ModernButtonAppearance.Transparent': "'ButtonCanvas.Appearance'.Transparent",
    }
    const modernLayoutMap = {
      'ModernButtonLayout.TextOnly': "'ButtonCanvas.Layout'.TextOnly",
      'ModernButtonLayout.IconBefore': "'ButtonCanvas.Layout'.IconBefore",
      'ModernButtonLayout.IconAfter': "'ButtonCanvas.Layout'.IconAfter",
      'ModernButtonLayout.IconOnly': "'ButtonCanvas.Layout'.IconOnly",
    }
    const modernIconStyleMap = {
      'ModernButtonIconStyle.Outline': "'ButtonCanvas.IconStyle'.Outline",
      'ModernButtonIconStyle.Filled': "'ButtonCanvas.IconStyle'.Filled",
    }

    p('Text', node.Text || '"Button"')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('BorderRadius', node.BorderRadius)
    p('BasePaletteColor', node.BasePaletteColor)
    if (node.Font) p('Font', node.Font)
    if (node.FontColor) p('FontColor', color('FontColor', node.FontColor))
    p('FontSize', node.FontSize)
    p('FontWeight', node.FontWeight)
    if (node.FontItalic) p('FontItalic', 'true')
    if (node.FontUnderline) p('FontUnderline', 'true')
    if (node.FontStrikethrough) p('FontStrikethrough', 'true')
    if (node.Icon) p('Icon', node.Icon)
    if (node.IconRotation) p('IconRotation', node.IconRotation)
    if (node.AcceptsFocus === false) p('AcceptsFocus', 'false')
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode && node.DisplayMode !== 'DisplayMode.Edit') p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
    if (node.Appearance && modernAppearanceMap[node.Appearance]) {
      lines.push(`${sp(col + 6)}Appearance: =${modernAppearanceMap[node.Appearance]}`)
    }
    if (node.Layout && modernLayoutMap[node.Layout]) {
      lines.push(`${sp(col + 6)}Layout: =${modernLayoutMap[node.Layout]}`)
    }
    if (node.IconStyle && modernIconStyleMap[node.IconStyle]) {
      lines.push(`${sp(col + 6)}IconStyle: =${modernIconStyleMap[node.IconStyle]}`)
    }
  } else if (node.type === 'ModernDropdown') {
    if (node.Items) p('Items', node.Items)
    if (node.DefaultSelectedItems) p('DefaultSelectedItems', node.DefaultSelectedItems)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    p('FontSize', node.FontSize)
    if (node.Required !== undefined) p('Required', node.Required ? 'true' : 'false')
    if (node.ValidationState) p('ValidationState', node.ValidationState)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'ModernTabList') {
    if (node.Items) p('Items', node.Items)
    if (node.Default !== undefined) {
      const tabDefaultLabel = parseTabListSelectionRecord(node.Default)
      if (tabDefaultLabel) {
        p('Default', formatTabListDefaultRecordFormula(tabDefaultLabel))
      }
    }
    if (node.Align) p('Align', node.Align)
    if (node.Alignment) p('Alignment', node.Alignment)
    if (node.Appearance) p('Appearance', node.Appearance)
    if (node.TabSize) p('TabSize', node.TabSize)
    if (node.Color) p('Color', color('Color', node.Color))
    if (node.Font) p('Font', node.Font)
    if (node.FontWeight) p('FontWeight', node.FontWeight)
    if (node.Size !== undefined) p('Size', node.Size)
    if (node.Italic) p('Italic', 'true')
    if (node.Strikethrough) p('Strikethrough', 'true')
    if (node.Underline) p('Underline', 'true')
    if (node.PaddingTop !== undefined) p('PaddingTop', node.PaddingTop)
    if (node.PaddingRight !== undefined) p('PaddingRight', node.PaddingRight)
    if (node.PaddingBottom !== undefined) p('PaddingBottom', node.PaddingBottom)
    if (node.PaddingLeft !== undefined) p('PaddingLeft', node.PaddingLeft)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnChange) p('OnChange', node.OnChange)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'ModernCheckbox') {
    p('Label', node.Label || '"Checkbox"')
    p('Checked', node.Checked ? 'true' : 'false')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    if (node.Font) p('Font', node.Font)
    if (node.FontColor) p('FontColor', color('FontColor', node.FontColor))
    p('FontSize', node.FontSize)
    p('FontWeight', node.FontWeight)
    if (node.FontItalic) p('FontItalic', 'true')
    if (node.FontUnderline) p('FontUnderline', 'true')
    if (node.FontStrikethrough) p('FontStrikethrough', 'true')
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnCheck) p('OnCheck', node.OnCheck)
    if (node.OnUncheck) p('OnUncheck', node.OnUncheck)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'ModernComboBox') {
    if (node.Items) p('Items', node.Items)
    if (node.DefaultSelectedItems) p('DefaultSelectedItems', node.DefaultSelectedItems)
    if (node.SelectMultiple) p('SelectMultiple', 'true')
    if (node.AllowMultipleSelection) p('AllowMultipleSelection', 'true')
    if (node.IsSearchable === false) p('IsSearchable', 'false')
    if (node.AllowSearching === false) p('AllowSearching', 'false')
    if (node.ItemDisplayText) p('ItemDisplayText', node.ItemDisplayText)
    if (node.MultiValueDelimiter) p('MultiValueDelimiter', node.MultiValueDelimiter)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Appearance) p('Appearance', node.Appearance)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    if (node.Color) p('Color', color('Color', node.Color))
    if (node.Fill) p('Fill', color('Fill', node.Fill))
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    p('InputTextPlaceholder', node.InputTextPlaceholder || '""')
    p('PaddingTop', node.PaddingTop)
    p('PaddingRight', node.PaddingRight)
    p('PaddingBottom', node.PaddingBottom)
    p('PaddingLeft', node.PaddingLeft)
    p('RadiusTopLeft', node.RadiusTopLeft)
    p('RadiusTopRight', node.RadiusTopRight)
    p('RadiusBottomLeft', node.RadiusBottomLeft)
    p('RadiusBottomRight', node.RadiusBottomRight)
    if (node.Required !== undefined) p('Required', node.Required ? 'true' : 'false')
    if (node.ValidationState) p('ValidationState', node.ValidationState)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'ModernProgressBar') {
    p('Value', node.Value)
    p('Max', node.Max)
    if (node.Indeterminate !== undefined) p('Indeterminate', node.Indeterminate ? 'true' : 'false')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    if (node.ProgressColor) p('ProgressColor', node.ProgressColor)
    if (node.Shape) p('Shape', node.Shape)
    if (node.Thickness) p('Thickness', node.Thickness)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'ModernSlider') {
    p('Value', node.Value)
    p('Min', node.Min)
    p('Max', node.Max)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    if (node.Layout) p('Layout', node.Layout)
    p('Size', node.Size)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'ModernSpinner') {
    p('Label', node.Label || '"Loading"')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Appearance) p('Appearance', node.Appearance)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    if (node.Font) p('Font', node.Font)
    if (node.FontColor) p('FontColor', color('FontColor', node.FontColor))
    p('FontSize', node.FontSize)
    p('FontWeight', node.FontWeight)
    if (node.FontItalic) p('FontItalic', 'true')
    if (node.FontUnderline) p('FontUnderline', 'true')
    if (node.FontStrikethrough) p('FontStrikethrough', 'true')
    if (node.LabelPosition) p('LabelPosition', node.LabelPosition)
    if (node.SpinnerSize) p('SpinnerSize', node.SpinnerSize)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'ModernText') {
    p('Text', node.Text || '"Text"')
    p('Align', node.Align)
    p('VerticalAlign', node.VerticalAlign)
    if (node.AutoHeight !== undefined) p('AutoHeight', node.AutoHeight ? 'true' : 'false')
    if (node.Wrap !== undefined) p('Wrap', node.Wrap ? 'true' : 'false')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Color', color('Color', node.Color))
    if (node.Fill && node.Fill !== 'transparent') p('Fill', color('Fill', node.Fill))
    if (node.Font) p('Font', node.Font)
    p('Size', node.Size)
    p('FontWeight', node.FontWeight)
    if (node.Italic) p('Italic', 'true')
    if (node.Underline) p('Underline', 'true')
    if (node.Strikethrough) p('Strikethrough', 'true')
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    p('PaddingTop', node.PaddingTop)
    p('PaddingRight', node.PaddingRight)
    p('PaddingBottom', node.PaddingBottom)
    p('PaddingLeft', node.PaddingLeft)
    p('RadiusTopLeft', node.RadiusTopLeft)
    p('RadiusTopRight', node.RadiusTopRight)
    p('RadiusBottomLeft', node.RadiusBottomLeft)
    p('RadiusBottomRight', node.RadiusBottomRight)
    if (node.Visible === false) p('Visible', 'false')
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'ModernTextInput') {
    if (node.Default !== undefined) p('Default', node.Default)
    if (node.Text !== undefined) p('Text', node.Text)
    if (node.Placeholder) p('Placeholder', node.Placeholder)
    if (node.Type) p('Type', node.Type)
    if (node.TriggerOutput !== undefined) p('TriggerOutput', node.TriggerOutput ? 'true' : 'false')
    if (node.Required !== undefined) p('Required', node.Required ? 'true' : 'false')
    if (node.ValidationState) p('ValidationState', node.ValidationState)
    p('Align', node.Align)
    if (node.Appearance) p('Appearance', node.Appearance)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    p('Color', color('Color', node.Color))
    p('Fill', color('Fill', node.Fill))
    if (node.Font) p('Font', node.Font)
    p('Size', node.Size)
    p('FontWeight', node.FontWeight)
    if (node.Italic) p('Italic', 'true')
    if (node.Underline) p('Underline', 'true')
    if (node.Strikethrough) p('Strikethrough', 'true')
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    if (node.MaxLength) p('MaxLength', node.MaxLength)
    p('PaddingTop', node.PaddingTop)
    p('PaddingRight', node.PaddingRight)
    p('PaddingBottom', node.PaddingBottom)
    p('PaddingLeft', node.PaddingLeft)
    p('RadiusTopLeft', node.RadiusTopLeft)
    p('RadiusTopRight', node.RadiusTopRight)
    p('RadiusBottomLeft', node.RadiusBottomLeft)
    p('RadiusBottomRight', node.RadiusBottomRight)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'ModernToggle') {
    p('Label', node.Label || '"Toggle"')
    p('Checked', node.Checked ? 'true' : 'false')
    if (node.LabelPosition || node.LabelPostion) p('LabelPosition', node.LabelPosition || node.LabelPostion)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    if (node.Font) p('Font', node.Font)
    if (node.FontColor) p('FontColor', color('FontColor', node.FontColor))
    p('FontSize', node.FontSize)
    p('FontWeight', node.FontWeight)
    if (node.FontItalic) p('FontItalic', 'true')
    if (node.FontUnderline) p('FontUnderline', 'true')
    if (node.FontStrikethrough) p('FontStrikethrough', 'true')
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnCheck) p('OnCheck', node.OnCheck)
    if (node.OnUncheck) p('OnUncheck', node.OnUncheck)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'Link') {
    p('Text', node.Text || '"Open link"')
    if (node.Url) p('Url', node.Url)
    if (node.Type) p('Type', node.Type)
    p('Align', node.Align)
    p('VerticalAlign', node.VerticalAlign)
    if (node.AutoHeight !== undefined) p('AutoHeight', node.AutoHeight ? 'true' : 'false')
    if (node.Wrap !== undefined) p('Wrap', node.Wrap ? 'true' : 'false')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    p('Color', color('Color', node.Color))
    if (node.Fill && node.Fill !== 'transparent') p('Fill', color('Fill', node.Fill))
    if (node.Font) p('Font', node.Font)
    p('Size', node.Size)
    p('FontWeight', node.FontWeight)
    if (node.Italic) p('Italic', 'true')
    if (node.Underline) p('Underline', 'true')
    if (node.Strikethrough) p('Strikethrough', 'true')
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    p('PaddingTop', node.PaddingTop)
    p('PaddingRight', node.PaddingRight)
    p('PaddingBottom', node.PaddingBottom)
    p('PaddingLeft', node.PaddingLeft)
    p('RadiusTopLeft', node.RadiusTopLeft)
    p('RadiusTopRight', node.RadiusTopRight)
    p('RadiusBottomLeft', node.RadiusBottomLeft)
    p('RadiusBottomRight', node.RadiusBottomRight)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
  } else if (node.type === 'NumberInput') {
    p('Default', node.Default)
    p('Value', node.Value)
    if (node.HintText) p('HintText', node.HintText)
    p('Min', node.Min)
    p('Max', node.Max)
    p('Step', node.Step)
    p('Precision', node.Precision)
    if (node.ValidationState) p('ValidationState', node.ValidationState)
    p('Align', node.Align)
    if (node.Appearance) p('Appearance', node.Appearance)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    p('Color', color('Color', node.Color))
    p('Fill', color('Fill', node.Fill))
    if (node.Font) p('Font', node.Font)
    p('Size', node.Size)
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    p('PaddingTop', node.PaddingTop)
    p('PaddingRight', node.PaddingRight)
    p('PaddingBottom', node.PaddingBottom)
    p('PaddingLeft', node.PaddingLeft)
    p('RadiusTopLeft', node.RadiusTopLeft)
    p('RadiusTopRight', node.RadiusTopRight)
    p('RadiusBottomLeft', node.RadiusBottomLeft)
    p('RadiusBottomRight', node.RadiusBottomRight)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'ModernDatePicker') {
    if (node.SelectedDate) p('SelectedDate', node.SelectedDate)
    if (node.StartDate) p('StartDate', node.StartDate)
    if (node.EndDate) p('EndDate', node.EndDate)
    if (node.Format) p('Format', node.Format)
    if (node.PlaceHolder) p('PlaceHolder', node.PlaceHolder)
    if (node.StartOfWeek) p('StartOfWeek', node.StartOfWeek)
    if (node.Required !== undefined) p('Required', node.Required ? 'true' : 'false')
    if (node.IsEditable !== undefined) p('IsEditable', node.IsEditable ? 'true' : 'false')
    if (node.ValidationState) p('ValidationState', node.ValidationState)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.BasePaletteColor) p('BasePaletteColor', node.BasePaletteColor)
    if (node.Font) p('Font', node.Font)
    if (node.FontColor) p('FontColor', color('FontColor', node.FontColor))
    p('FontSize', node.FontSize)
    p('FontWeight', node.FontWeight)
    if (node.FontItalic) p('FontItalic', 'true')
    if (node.FontUnderline) p('FontUnderline', 'true')
    if (node.FontStrikethrough) p('FontStrikethrough', 'true')
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'RichTextEditor') {
    if (node.Default) p('Default', node.Default)
    if (node.EnableSpellCheck !== undefined) p('EnableSpellCheck', node.EnableSpellCheck ? 'true' : 'false')
    p('TabIndex', node.TabIndex)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
  } else if (node.type === 'Rating') {
    p('Default', node.Default)
    p('Value', node.Value)
    p('Max', node.Max)
    if (node.ShowValue !== undefined) p('ShowValue', node.ShowValue ? 'true' : 'false')
    if (node.ReadOnly !== undefined) p('ReadOnly', node.ReadOnly ? 'true' : 'false')
    if (node.Reset !== undefined) p('Reset', node.Reset ? 'true' : 'false')
    if (node.Tooltip) p('Tooltip', node.Tooltip)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Fill && node.Fill !== 'transparent') p('Fill', color('Fill', node.Fill))
    if (node.RatingFill) p('RatingFill', color('RatingFill', node.RatingFill))
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    if (node.FocusedBorderColor) p('FocusedBorderColor', color('FocusedBorderColor', node.FocusedBorderColor))
    p('FocusedBorderThickness', node.FocusedBorderThickness)
    p('TabIndex', node.TabIndex)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnChange) p('OnChange', node.OnChange)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'Label') {
    p('Text', node.Text || '"Label"')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Color', color('Color', node.Color))
    if (node.Fill && node.Fill !== 'transparent') p('Fill', color('Fill', node.Fill))
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('Align', node.Align)
    p('VerticalAlign', node.VerticalAlign)
    if (node.BorderColor) p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    if (node.BorderThickness !== undefined) p('BorderThickness', node.BorderThickness)
    if (node.LineHeight) p('LineHeight', node.LineHeight)
    if (node.Overflow) p('Overflow', node.Overflow)
    if (node.Italic)    p('Italic', 'true')
    if (node.Underline) p('Underline', 'true')
    if (node.Visible === false)  p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.PaddingLeft)   p('PaddingLeft', node.PaddingLeft)
    if (node.PaddingRight)  p('PaddingRight', node.PaddingRight)
    if (node.PaddingTop)    p('PaddingTop', node.PaddingTop)
    if (node.PaddingBottom) p('PaddingBottom', node.PaddingBottom)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'Container') {
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Fill && node.Fill !== 'rgba(0,0,0,0)') p('Fill', color('Fill', node.Fill))
    if (node.BorderStyle && node.BorderStyle !== 'BorderStyle.None') {
      p('BorderStyle', BORDER_MAP[node.BorderStyle] || node.BorderStyle)
      p('BorderColor', color('BorderColor', node.BorderColor))
      p('BorderThickness', node.BorderThickness)
    }
    if (node.RadiusTopLeft) p('RadiusTopLeft', node.RadiusTopLeft)
    if (node.RadiusTopRight) p('RadiusTopRight', node.RadiusTopRight)
    if (node.RadiusBottomLeft) p('RadiusBottomLeft', node.RadiusBottomLeft)
    if (node.RadiusBottomRight) p('RadiusBottomRight', node.RadiusBottomRight)
    if (node.DropShadow && node.DropShadow !== 'DropShadow.None') p('DropShadow', node.DropShadow)
    if (node.Visible === false) p('Visible', 'false')
  } else if (node.type === 'TextInput') {
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Default !== undefined) p('Default', node.Default)
    if (node.HintText)  p('HintText', node.HintText)
    p('Fill', color('Fill', node.Fill))
    p('Color', color('Color', node.Color))
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    if (node.Mode) p('Mode', node.Mode)
    if (node.Format) p('Format', node.Format)
    if (node.MaxLength) p('MaxLength', node.MaxLength)
    if (node.Clear !== undefined) p('Clear', node.Clear ? 'true' : 'false')
    if (node.RadiusTopLeft) p('RadiusTopLeft', node.RadiusTopLeft)
    if (node.RadiusTopRight) p('RadiusTopRight', node.RadiusTopRight)
    if (node.RadiusBottomLeft) p('RadiusBottomLeft', node.RadiusBottomLeft)
    if (node.RadiusBottomRight) p('RadiusBottomRight', node.RadiusBottomRight)
    if (node.Italic) p('Italic', 'true')
    if (node.Underline) p('Underline', 'true')
    if (node.Strikethrough) p('Strikethrough', 'true')
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.LineHeight) p('LineHeight', node.LineHeight)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'Dropdown') {
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Default !== undefined) p('Default', node.Default)
    if (node.Items) p('Items', node.Items)
    p('Fill', color('Fill', node.Fill))
    p('Color', color('Color', node.Color))
    if (node.SelectionFill) p('SelectionFill', color('SelectionFill', node.SelectionFill))
    if (node.SelectionColor) p('SelectionColor', color('SelectionColor', node.SelectionColor))
    if (node.AllowEmptySelection !== undefined) p('AllowEmptySelection', node.AllowEmptySelection ? 'true' : 'false')
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    if (node.RadiusTopLeft) p('RadiusTopLeft', node.RadiusTopLeft)
    if (node.RadiusTopRight) p('RadiusTopRight', node.RadiusTopRight)
    if (node.RadiusBottomLeft) p('RadiusBottomLeft', node.RadiusBottomLeft)
    if (node.RadiusBottomRight) p('RadiusBottomRight', node.RadiusBottomRight)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'Image') {
    p('Image', CLOUD_IMAGE_DATA_URI)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Fill) p('Fill', color('Fill', node.Fill))
    if (node.BorderColor) p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    if (node.BorderThickness !== undefined) p('BorderThickness', node.BorderThickness)
    if (node.PaddingTop !== undefined) p('PaddingTop', node.PaddingTop)
    if (node.PaddingRight !== undefined) p('PaddingRight', node.PaddingRight)
    if (node.PaddingBottom !== undefined) p('PaddingBottom', node.PaddingBottom)
    if (node.PaddingLeft !== undefined) p('PaddingLeft', node.PaddingLeft)
    if (node.RadiusTopLeft !== undefined) p('RadiusTopLeft', node.RadiusTopLeft)
    if (node.RadiusTopRight !== undefined) p('RadiusTopRight', node.RadiusTopRight)
    if (node.RadiusBottomLeft !== undefined) p('RadiusBottomLeft', node.RadiusBottomLeft)
    if (node.RadiusBottomRight !== undefined) p('RadiusBottomRight', node.RadiusBottomRight)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.Tooltip) p('Tooltip', node.Tooltip)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'ListBox') {
    if (node.Items) p('Items', node.Items)
    if (node.Default !== undefined) p('Default', node.Default)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Fill', color('Fill', node.Fill))
    p('Color', color('Color', node.Color))
    if (node.SelectionFill) p('SelectionFill', color('SelectionFill', node.SelectionFill))
    if (node.SelectionColor) p('SelectionColor', color('SelectionColor', node.SelectionColor))
    if (node.SelectMultiple !== undefined) p('SelectMultiple', node.SelectMultiple ? 'true' : 'false')
    if (node.ItemPaddingLeft !== undefined) p('ItemPaddingLeft', node.ItemPaddingLeft)
    if (node.LineHeight !== undefined) p('LineHeight', node.LineHeight)
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.Tooltip) p('Tooltip', node.Tooltip)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'Checkbox') {
    p('Text', node.Text || '"Checkbox"')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Default !== undefined) p('Default', node.Default)
    p('Fill', color('Fill', node.Fill))
    p('Color', color('Color', node.Color))
    p('CheckmarkFill', color('CheckmarkFill', node.CheckmarkFill))
    p('CheckboxBackgroundFill', color('CheckboxBackgroundFill', node.CheckboxBackgroundFill))
    p('CheckboxBorderColor', color('CheckboxBorderColor', node.CheckboxBorderColor))
    p('CheckboxSize', node.CheckboxSize)
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    if (node.BorderColor) p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    if (node.BorderThickness !== undefined) p('BorderThickness', node.BorderThickness)
    if (node.RadiusTopLeft) p('RadiusTopLeft', node.RadiusTopLeft)
    if (node.RadiusTopRight) p('RadiusTopRight', node.RadiusTopRight)
    if (node.RadiusBottomLeft) p('RadiusBottomLeft', node.RadiusBottomLeft)
    if (node.RadiusBottomRight) p('RadiusBottomRight', node.RadiusBottomRight)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnCheck) p('OnCheck', node.OnCheck)
    if (node.OnUncheck) p('OnUncheck', node.OnUncheck)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'ComboBox') {
    p('Items', node.Items || '[]')
    if (node.DefaultSelectedItems) p('DefaultSelectedItems', node.DefaultSelectedItems)
    if (node.SelectMultiple) p('SelectMultiple', 'true')
    if (node.IsSearchable === false) p('IsSearchable', 'false')
    p('SearchFields', node.SearchFields || '[]')
    p('DisplayFields', node.DisplayFields || '[]')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Color', color('Color', node.Color))
    p('Fill', color('Fill', node.Fill))
    p('Size', node.Size)
    p('FontWeight', node.FontWeight)
    p('BorderColor', color('BorderColor', node.BorderColor))
    p('BorderThickness', node.BorderThickness)
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('FocusedBorderColor', color('FocusedBorderColor', node.FocusedBorderColor))
    p('FocusedBorderThickness', node.FocusedBorderThickness)
    p('InputTextPlaceholder', node.InputTextPlaceholder || '""')
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
    if (node.OnChange) p('OnChange', node.OnChange)
    if (node.OnNavigate) p('OnNavigate', node.OnNavigate)
  } else if (node.type === 'Rectangle') {
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Fill', color('Fill', node.Fill))
    if (node.HoverFill) p('HoverFill', color('HoverFill', node.HoverFill))
    if (node.PressedFill) p('PressedFill', color('PressedFill', node.PressedFill))
    p('BorderThickness', node.BorderThickness || 0)
    p('BorderStyle', node.BorderStyle || 'BorderStyle.None')
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.FocusedBorderColor) p('FocusedBorderColor', color('FocusedBorderColor', node.FocusedBorderColor))
    if (node.FocusedBorderThickness !== undefined) p('FocusedBorderThickness', node.FocusedBorderThickness)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'Icon') {
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Icon', node.Icon || 'Icon.Printing3D')
    p('Color', color('Color', node.Color))
    p('Fill', color('Fill', node.Fill))
    if (node.Rotation !== undefined) p('Rotation', node.Rotation)
    p('HoverBorderColor', color('HoverBorderColor', node.HoverBorderColor))
    p('DisabledBorderColor', color('DisabledBorderColor', node.DisabledBorderColor))
    p('DisabledFill', color('DisabledFill', node.DisabledFill))
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'HtmlText') {
    p('HtmlText', node.HtmlText || '""')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Color', color('Color', node.Color))
    p('Fill', color('Fill', node.Fill))
    p('Size', node.Size)
    p('PaddingTop', node.PaddingTop)
    p('PaddingBottom', node.PaddingBottom)
    p('PaddingLeft', node.PaddingLeft)
    p('PaddingRight', node.PaddingRight)
    p('BorderColor', color('BorderColor', node.BorderColor))
    p('BorderThickness', node.BorderThickness)
    p('BorderStyle', node.BorderStyle)
    p('HoverBorderColor', color('HoverBorderColor', node.HoverBorderColor))
    p('DisabledBorderColor', color('DisabledBorderColor', node.DisabledBorderColor))
    p('DisabledFill', color('DisabledFill', node.DisabledFill))
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'Gallery') {
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Items) p('Items', node.Items)
    if (node.TemplateSize !== undefined) p('TemplateSize', node.TemplateSize)
    if (node.TemplatePadding !== undefined) p('TemplatePadding', node.TemplatePadding)
    if (node.WrapCount !== undefined) p('WrapCount', node.WrapCount)
    if (node.ShowNavigation !== undefined) p('ShowNavigation', node.ShowNavigation ? 'true' : 'false')
    if (node.ShowScrollbar !== undefined) p('ShowScrollbar', node.ShowScrollbar ? 'true' : 'false')
    if (node.Fill && node.Fill !== 'transparent') p('Fill', color('Fill', node.Fill))
    if (node.BorderColor) p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    if (node.BorderThickness !== undefined) p('BorderThickness', node.BorderThickness)
    if (node.Visible === false) p('Visible', 'false')
  } else if (node.type === 'DatePicker') {
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.DefaultDate) p('DefaultDate', node.DefaultDate)
    if (node.SelectedDate) p('SelectedDate', node.SelectedDate)
    if (node.Format) p('Format', node.Format)
    if (node.Language) p('Language', node.Language)
    p('Color', color('Color', node.Color))
    p('Fill', color('Fill', node.Fill))
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    p('IconFill', color('IconFill', node.IconFill))
    p('IconBackground', color('IconBackground', node.IconBackground))
    if (node.InputTextPlaceholder) p('InputTextPlaceholder', node.InputTextPlaceholder)
    if (node.IsEditable !== undefined) p('IsEditable', node.IsEditable ? 'true' : 'false')
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.StartYear !== undefined) p('StartYear', node.StartYear)
    if (node.EndYear !== undefined) p('EndYear', node.EndYear)
    if (node.StartOfWeek !== undefined) p('StartOfWeek', node.StartOfWeek)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'Toggle') {
    p('Default', node.Default)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Fill', color('Fill', node.Fill))
    p('Color', color('Color', node.Color))
    p('Size', node.Size)
    p('FontWeight', node.FontWeight)
    p('TrueText', node.TrueText || '"On"')
    p('FalseText', node.FalseText || '"Off"')
    p('TrueFill', color('TrueFill', node.TrueFill))
    p('FalseFill', color('FalseFill', node.FalseFill))
    p('HandleFill', color('HandleFill', node.HandleFill))
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnCheck) p('OnCheck', node.OnCheck)
    if (node.OnUncheck) p('OnUncheck', node.OnUncheck)
    if (node.OnChange) p('OnChange', node.OnChange)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'Radio') {
    p('Items', node.Items)
    if (node.Default !== undefined) p('Default', node.Default)
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Fill', color('Fill', node.Fill))
    p('Color', color('Color', node.Color))
    p('Size', node.Size)
    p('FontWeight', node.FontWeight)
    p('RadioSize', node.RadioSize)
    p('RadioBorderColor', color('RadioBorderColor', node.RadioBorderColor))
    p('RadioSelectionFill', color('RadioSelectionFill', node.RadioSelectionFill))
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    if (node.Layout) p('Layout', node.Layout)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnChange) p('OnChange', node.OnChange)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'Slider') {
    if (node.Default !== undefined) p('Default', node.Default)
    p('Min', node.Min)
    p('Max', node.Max)
    p('Step', node.Step)
    p('ShowValue', node.ShowValue ? 'true' : 'false')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Fill', color('Fill', node.Fill))
    p('RailFill', color('RailFill', node.RailFill))
    p('ValueFill', color('ValueFill', node.ValueFill))
    p('HandleFill', color('HandleFill', node.HandleFill))
    p('BorderColor', color('BorderColor', node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    if (node.Visible === false) p('Visible', 'false')
    if (node.DisplayMode) p('DisplayMode', node.DisplayMode)
    if (node.AccessibleLabel) p('AccessibleLabel', node.AccessibleLabel)
    if (node.OnChange) p('OnChange', node.OnChange)
  }

  // Children: dash at col+6, so child's "- Name:" starts at col+6
  if ((node.type === 'Container' || node.type === 'Gallery') && node.children?.length) {
    lines.push(`${sp(col + 4)}Children:`)
    for (const child of node.children) {
      lines.push(componentToYaml(child, col + 6))
    }
  }

  return lines.join('\n')
}

// ── Screen-level YAML renderer ───────────────────────────────────────────────
export function screenToYaml(tree, screensOverride = null) {
  if (!tree?.length) return '# Empty canvas — add components to get started'
  const screens = Array.isArray(screensOverride)
    ? screensOverride
    : (tree[0]?.type === 'App' ? (tree[0]?.children || []) : tree)

  const sections = []
  sections.push('Screens:')
  for (const screen of screens) {
    sections.push(componentToYaml(screen, 2))
  }

  return sections.join('\n')
}
