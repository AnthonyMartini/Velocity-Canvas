import buttonSchema from '../../schemas/button.json'
import labelSchema from '../../schemas/label.json'
import containerSchema from '../../schemas/container.json'
import textInputSchema from '../../schemas/textInput.json'
import dropdownSchema from '../../schemas/dropdown.json'
import gallerySchema from '../../schemas/gallery.json'
import CheckboxSchema from '../../schemas/checkbox.json'
import RectangleSchema from '../../schemas/rectangle.json'
import IconSchema from '../../schemas/icon.json'
import HtmlTextSchema from '../../schemas/htmltext.json'
import DatePickerSchema from '../../schemas/datepicker.json'
import ComboBoxSchema from '../../schemas/combobox.json'
import screenSchema from '../../schemas/screen.json'
import { appTheme, applyThemeToSchema } from '@/theme/theme'

// ── Schema lookup ─────────────────────────────────────────────────────────────
export const SCHEMAS = {
  Button: applyThemeToSchema(buttonSchema, appTheme.controlDefaults.Button),
  Label: applyThemeToSchema(labelSchema, appTheme.controlDefaults.Label),
  Container: applyThemeToSchema(containerSchema, appTheme.controlDefaults.Container),
  TextInput: applyThemeToSchema(textInputSchema, appTheme.controlDefaults.TextInput),
  Dropdown: applyThemeToSchema(dropdownSchema, appTheme.controlDefaults.Dropdown),
  Gallery: applyThemeToSchema(gallerySchema, appTheme.controlDefaults.Gallery),
  Checkbox: applyThemeToSchema(CheckboxSchema, appTheme.controlDefaults.Checkbox),
  Rectangle: applyThemeToSchema(RectangleSchema, appTheme.controlDefaults.Rectangle),
  Icon: applyThemeToSchema(IconSchema, appTheme.controlDefaults.Icon),
  HtmlText: applyThemeToSchema(HtmlTextSchema, appTheme.controlDefaults.HtmlText),
  DatePicker: applyThemeToSchema(DatePickerSchema, appTheme.controlDefaults.DatePicker),
  ComboBox: applyThemeToSchema(ComboBoxSchema, appTheme.controlDefaults.ComboBox),
  Screen: applyThemeToSchema(screenSchema, appTheme.controlDefaults.Screen),
}

// ── Shared maps ───────────────────────────────────────────────────────────────
export const BORDER_MAP = {
  None: 'BorderStyle.None',
  Solid: 'BorderStyle.Solid',
  Dashed: 'BorderStyle.Dashed',
  Dotted: 'BorderStyle.Dotted'
}
