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

// ── Extract powerFx variables from a component tree ───────────────────────────
export function extractVariables(tree) {
  const vars = new Set()
  
  // PowerFx Set() regex: looks for Set(VariableName , Value)
  // We only want the first argument
  const setRegex = /\bSet\s*\(\s*([a-zA-Z0-9_]+)\s*,/g

  const walk = (nodes) => {
    for (const node of nodes) {
      // Check properties where formulas might live (we can broadly check all string props really, 
      // but restricting to On* is safer)
      const formulaProps = ['OnSelect', 'OnChange', 'OnCheck', 'OnUncheck', 'OnNavigate']
      for (const prop of formulaProps) {
        if (typeof node[prop] === 'string') {
          let match
          while ((match = setRegex.exec(node[prop])) !== null) {
            if (match[1]) vars.add(match[1])
          }
        }
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
          ? (safeName(node.HintText) || 'TextInput') + 'Input'
          : node.type === 'Dropdown'
            ? (safeName(node.Default) || 'Dropdown') + 'Dropdown'
            : (safeName(node.Text) || 'Label')  + 'Label'

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
    lines.push(`${sp(col + 4)}Fill: =${toRgba(node.Fill)}`)
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
    p('Text', node.Text || '"Button"')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Fill', toRgba(node.Fill))
    p('Color', toRgba(node.Color))
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('Align', node.Align)
    p('VerticalAlign', node.VerticalAlign)
    p('RadiusTopLeft', node.RadiusTopLeft)
    p('RadiusTopRight', node.RadiusTopRight)
    p('RadiusBottomLeft', node.RadiusBottomLeft)
    p('RadiusBottomRight', node.RadiusBottomRight)
    p('BorderColor', toRgba(node.BorderColor))
    p('BorderThickness', node.BorderThickness)
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    if (node.HoverFill) p('HoverFill', toRgba(node.HoverFill))
    if (node.HoverColor) p('HoverColor', toRgba(node.HoverColor))
    if (node.PressedFill) p('PressedFill', toRgba(node.PressedFill))
    if (node.PressedColor) p('PressedColor', toRgba(node.PressedColor))
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
  } else if (node.type === 'Label') {
    p('Text', node.Text || '"Label"')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    p('Color', toRgba(node.Color))
    if (node.Fill && node.Fill !== 'transparent') p('Fill', toRgba(node.Fill))
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('Align', node.Align)
    p('VerticalAlign', node.VerticalAlign)
    if (node.BorderColor) p('BorderColor', toRgba(node.BorderColor))
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
    if (node.Fill && node.Fill !== 'rgba(0,0,0,0)') p('Fill', toRgba(node.Fill))
    if (node.BorderStyle && node.BorderStyle !== 'BorderStyle.None') {
      p('BorderStyle', BORDER_MAP[node.BorderStyle] || node.BorderStyle)
      p('BorderColor', toRgba(node.BorderColor))
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
    p('Fill', toRgba(node.Fill))
    p('Color', toRgba(node.Color))
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('BorderColor', toRgba(node.BorderColor))
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
    p('Fill', toRgba(node.Fill))
    p('Color', toRgba(node.Color))
    if (node.SelectionFill) p('SelectionFill', toRgba(node.SelectionFill))
    if (node.SelectionColor) p('SelectionColor', toRgba(node.SelectionColor))
    if (node.AllowEmptySelection !== undefined) p('AllowEmptySelection', node.AllowEmptySelection ? 'true' : 'false')
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('BorderColor', toRgba(node.BorderColor))
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
  } else if (node.type === 'Checkbox') {
    p('Text', node.Text || '"Checkbox"')
    p('X', node.X)
    p('Y', node.Y)
    p('Width', node.Width)
    p('Height', node.Height)
    if (node.Default !== undefined) p('Default', node.Default)
    p('Fill', toRgba(node.Fill))
    p('Color', toRgba(node.Color))
    p('CheckmarkFill', toRgba(node.CheckmarkFill))
    p('CheckboxBackgroundFill', toRgba(node.CheckboxBackgroundFill))
    p('CheckboxBorderColor', toRgba(node.CheckboxBorderColor))
    p('CheckboxSize', node.CheckboxSize)
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    if (node.BorderColor) p('BorderColor', toRgba(node.BorderColor))
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
    p('Color', toRgba(node.Color))
    p('Fill', toRgba(node.Fill))
    p('Size', node.Size)
    p('FontWeight', node.FontWeight)
    p('BorderColor', toRgba(node.BorderColor))
    p('BorderThickness', node.BorderThickness)
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('FocusedBorderColor', toRgba(node.FocusedBorderColor))
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
    p('Fill', toRgba(node.Fill))
    if (node.HoverFill) p('HoverFill', toRgba(node.HoverFill))
    if (node.PressedFill) p('PressedFill', toRgba(node.PressedFill))
    p('BorderThickness', node.BorderThickness || 0)
    p('BorderStyle', node.BorderStyle || 'BorderStyle.None')
    p('BorderColor', toRgba(node.BorderColor))
    if (node.FocusedBorderColor) p('FocusedBorderColor', toRgba(node.FocusedBorderColor))
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
    p('Color', toRgba(node.Color))
    p('Fill', toRgba(node.Fill))
    if (node.Rotation !== undefined) p('Rotation', node.Rotation)
    p('HoverBorderColor', toRgba(node.HoverBorderColor))
    p('DisabledBorderColor', toRgba(node.DisabledBorderColor))
    p('DisabledFill', toRgba(node.DisabledFill))
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
    p('Color', toRgba(node.Color))
    p('Fill', toRgba(node.Fill))
    p('Size', node.Size)
    p('PaddingTop', node.PaddingTop)
    p('PaddingBottom', node.PaddingBottom)
    p('PaddingLeft', node.PaddingLeft)
    p('PaddingRight', node.PaddingRight)
    p('BorderColor', toRgba(node.BorderColor))
    p('BorderThickness', node.BorderThickness)
    p('BorderStyle', node.BorderStyle)
    p('HoverBorderColor', toRgba(node.HoverBorderColor))
    p('DisabledBorderColor', toRgba(node.DisabledBorderColor))
    p('DisabledFill', toRgba(node.DisabledFill))
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
    if (node.Fill && node.Fill !== 'transparent') p('Fill', toRgba(node.Fill))
    if (node.BorderColor) p('BorderColor', toRgba(node.BorderColor))
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
    p('Color', toRgba(node.Color))
    p('Fill', toRgba(node.Fill))
    p('Size', node.Size)
    if (node.Font) p('Font', node.Font)
    p('FontWeight', node.FontWeight)
    p('BorderColor', toRgba(node.BorderColor))
    if (node.BorderStyle) p('BorderStyle', node.BorderStyle)
    p('BorderThickness', node.BorderThickness)
    p('IconFill', toRgba(node.IconFill))
    p('IconBackground', toRgba(node.IconBackground))
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
