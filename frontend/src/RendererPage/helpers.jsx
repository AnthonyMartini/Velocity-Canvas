import { SCHEMAS, BORDER_MAP } from './constants'

// ── Unique ID ─────────────────────────────────────────────────────────────────
let _id = 0
export const uid = () => `comp_${++_id}`

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
export function createFromSpec(spec) {
  const schema = SCHEMAS[spec.type]
  if (!schema) return null
  const base = JSON.parse(JSON.stringify(schema.defaults))
  const { children, ...rest } = spec
  const processedChildren = (children || []).map(c => createFromSpec(c)).filter(Boolean)
  return { ...base, ...rest, id: uid(), type: schema.type, name: spec.name || nextName(schema.type), children: processedChildren }
}

// ──────────────────────────────────────────────────────────────────────────────
// YAML Generation
// ──────────────────────────────────────────────────────────────────────────────

/** Convert a hex color string to PA RGBA notation */
export function toRgba(hex) {
  if (!hex || hex === 'transparent') return 'RGBA(0, 0, 0, 0)'
  if (hex.startsWith('rgba') || hex.startsWith('RGBA')) return hex
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const [r, g, b] = clean.split('').map(c => parseInt(c + c, 16))
    return `RGBA(${r}, ${g}, ${b}, 1)`
  }
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `RGBA(${r}, ${g}, ${b}, 1)`
}

/** Recursively convert a component tree node to PA YAML string.
 *  col = the column where the leading `- Name:` dash sits (0 for root). */
export function componentToYaml(node, col = 0) {
  const sp = (n) => ' '.repeat(n)   // exact column indent
  const safeName = (s) => (s || '').replace(/[^a-zA-Z0-9]/g, '').replace(/^\d+/, '') || 'Ctrl'

  // Use explicit name if set, otherwise derive from text
  const name = node.name
    ? node.name
    : node.type === 'Container'
      ? 'Container'
      : node.type === 'Button'
        ? (safeName(node.text) || 'Button') + 'Button'
        : node.type === 'TextInput'
          ? (safeName(node.hint) || 'TextInput') + 'Input'
          : node.type === 'Dropdown'
            ? (safeName(node.defaultValue) || 'Dropdown') + 'Dropdown'
            : (safeName(node.text) || 'Label')  + 'Label'

  const controlMap = {
    Button:    'Classic/Button@2.2.0',
    Label:     'Label@2.5.1',
    Container: 'GroupContainer@1.4.0',
    TextInput: 'Classic/TextInput@2.3.2',
    Dropdown: 'Classic/DropDown@2.3.1',
    Checkbox: 'Classic/Checkbox@2.1.2',
    Rectangle: 'Rectangle@2.3.0',
    Icon: 'Classic/Icon@2.5.0',
    HtmlText: 'HtmlViewer@2.1.0',
    DatePicker: 'Classic/DatePicker@2.2.0',
    ComboBox: 'Classic/ComboBox@2.4.0',
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
    lines.push(`${sp(col + 4)}Fill: =${toRgba(node.fill)}`)
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
    const valStr = String(v)
    const prefix = valStr.startsWith('=') ? '' : '='
    lines.push(`${sp(col + 6)}${k}: ${prefix}${valStr}`)
  }

  if (node.type === 'Button') {
    p('Text', node.text || '"Button"')
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    p('Fill', toRgba(node.fill))
    p('Color', toRgba(node.color))
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    p('RadiusTopLeft', node.borderRadius)
    p('RadiusTopRight', node.borderRadius)
    p('RadiusBottomLeft', node.borderRadius)
    p('RadiusBottomRight', node.borderRadius)
    p('BorderColor', toRgba(node.borderColor))
    p('BorderThickness', node.borderThickness)
    if (node.italic)   p('Italic', 'true')
    if (node.underline) p('Underline', 'true')
    if (!node.visible) p('Visible', 'false')
    if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'Label') {
    p('Text', node.text || '"Label"')
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    p('Color', toRgba(node.color))
    if (node.fill && node.fill !== 'transparent') p('Fill', toRgba(node.fill))
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    p('Align', node.align)
    p('VerticalAlign', node.verticalAlign)
    if (node.italic)    p('Italic', 'true')
    if (node.underline) p('Underline', 'true')
    if (!node.visible)  p('Visible', 'false')
    if (node.paddingLeft)   p('PaddingLeft', node.paddingLeft)
    if (node.paddingRight)  p('PaddingRight', node.paddingRight)
    if (node.paddingTop)    p('PaddingTop', node.paddingTop)
    if (node.paddingBottom) p('PaddingBottom', node.paddingBottom)
  } else if (node.type === 'Container') {
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    if (node.fill && node.fill !== 'rgba(0,0,0,0)') p('Fill', toRgba(node.fill))
    if (node.borderStyle && node.borderStyle !== 'None') {
      p('BorderStyle', BORDER_MAP[node.borderStyle])
      p('BorderColor', toRgba(node.borderColor))
      p('BorderThickness', node.borderThickness)
    }
    if (!node.visible) p('Visible', 'false')
  } else if (node.type === 'TextInput') {
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    if (node.value !== undefined) p('Default', node.value)
    if (node.hint)  p('HintText', node.hint)
    p('Fill', toRgba(node.fill))
    p('Color', toRgba(node.color))
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    p('BorderColor', toRgba(node.borderColor))
    p('BorderThickness', node.borderThickness)
    if (!node.visible) p('Visible', 'false')
    if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'Dropdown') {
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    if (node.defaultValue !== undefined) p('Default', node.defaultValue)
    if (node.items) p('Items', node.items)
    p('Fill', toRgba(node.fill))
    p('Color', toRgba(node.color))
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    p('BorderColor', toRgba(node.borderColor))
    p('BorderThickness', node.borderThickness)
    if (!node.visible) p('Visible', 'false')
    if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
    if (node.OnChange) p('OnChange', node.OnChange)
  } else if (node.type === 'Checkbox') {
    p('Text', node.text || '"Checkbox"')
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    if (node.value !== undefined) p('Default', node.value)
    p('Fill', toRgba(node.fill))
    p('Color', toRgba(node.color))
    p('CheckmarkFill', toRgba(node.checkmarkFill))
    p('CheckboxBackgroundFill', toRgba(node.checkboxBackgroundFill))
    p('CheckboxBorderColor', toRgba(node.checkboxBorderColor))
    p('CheckboxSize', node.checkboxSize)
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    if (!node.visible) p('Visible', 'false')
    if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
    if (node.OnCheck) p('OnCheck', node.OnCheck)
    if (node.OnUncheck) p('OnUncheck', node.OnUncheck)
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'ComboBox') {
    p('Items', node.Items || '[]')
    if (node.DefaultSelectedItems) p('DefaultSelectedItems', node.DefaultSelectedItems)
    if (node.SelectedItems) p('SelectedItems', node.SelectedItems)
    if (node.Selected) p('Selected', node.Selected)
    if (node.SelectMultiple) p('SelectMultiple', 'true')
    if (node.IsSearchable === false) p('IsSearchable', 'false')
    p('SearchFields', node.SearchFields || '[]')
    p('DisplayFields', node.DisplayFields || '[]')
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    p('Color', toRgba(node.color))
    p('Fill', toRgba(node.fill))
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    p('BorderColor', toRgba(node.borderColor))
    p('BorderThickness', node.borderThickness)
    p('BorderStyle', node.borderStyle)
    p('FocusedBorderColor', toRgba(node.focusedBorderColor))
    p('FocusedBorderThickness', node.focusedBorderThickness)
    p('InputTextPlaceholder', node.inputTextPlaceholder || '""')
    if (node.visible === false) p('Visible', 'false')
    if (node.tabIndex !== undefined) p('TabIndex', node.tabIndex)
    if (node.displayMode) p('DisplayMode', node.displayMode)
    else if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
    if (node.OnSelect) p('OnSelect', node.OnSelect)
    if (node.OnChange) p('OnChange', node.OnChange)
    if (node.OnNavigate) p('OnNavigate', node.OnNavigate)
  } else if (node.type === 'Rectangle') {
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    p('Fill', toRgba(node.fill))
    p('BorderThickness', node.borderThickness || 0)
    p('BorderStyle', node.borderStyle || 'BorderStyle.None')
    p('BorderColor', toRgba(node.borderColor))
    if (!node.visible) p('Visible', 'false')
    if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
  } else if (node.type === 'Icon') {
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    p('Icon', node.icon || 'Icon.Printing3D')
    p('Color', toRgba(node.color))
    p('Fill', toRgba(node.fill))
    p('HoverBorderColor', toRgba(node.hoverBorderColor))
    p('DisabledBorderColor', toRgba(node.disabledBorderColor))
    p('DisabledFill', toRgba(node.disabledFill))
    if (!node.visible) p('Visible', 'false')
    if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'HtmlText') {
    p('HtmlText', node.HtmlText || '""')
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    p('Color', toRgba(node.color))
    p('Fill', toRgba(node.fill))
    p('Size', node.fontSize)
    p('FontWeight', node.fontWeight)
    p('PaddingTop', node.paddingTop)
    p('PaddingBottom', node.paddingBottom)
    p('PaddingLeft', node.paddingLeft)
    p('PaddingRight', node.paddingRight)
    p('BorderColor', toRgba(node.borderColor))
    p('BorderThickness', node.borderThickness)
    p('BorderStyle', node.borderStyle)
    p('HoverBorderColor', toRgba(node.hoverBorderColor))
    p('DisabledBorderColor', toRgba(node.disabledBorderColor))
    p('DisabledFill', toRgba(node.disabledFill))
    if (node.AutoHeight) p('AutoHeight', 'true')
    if (!node.visible) p('Visible', 'false')
    if (node.disabled) p('DisplayMode', 'DisplayMode.Disabled')
    if (node.OnSelect) p('OnSelect', node.OnSelect)
  } else if (node.type === 'Gallery') {
    p('X', node.x)
    p('Y', node.y)
    p('Width', node.width)
    p('Height', node.height)
    if (node.Items) p('Items', node.Items)
    if (node.TemplateSize !== undefined) p('TemplateSize', node.TemplateSize)
    if (node.TemplatePadding !== undefined) p('TemplatePadding', node.TemplatePadding)
    if (node.WrapCount !== undefined) p('WrapCount', node.WrapCount)
    if (node.ShowNavigation !== undefined) p('ShowNavigation', node.ShowNavigation ? 'true' : 'false')
    if (node.ShowScrollbar !== undefined) p('ShowScrollbar', node.ShowScrollbar ? 'true' : 'false')
    if (!node.visible) p('Visible', 'false')
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
export function screenToYaml(tree) {
  if (!tree?.length) return '# Empty canvas — add components to get started'
  // Tree[0] is always the single App root node
  return componentToYaml(tree[0], 0)
}
