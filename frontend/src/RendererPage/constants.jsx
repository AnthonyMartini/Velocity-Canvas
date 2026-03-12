import buttonSchema from '@schemas/button.json'
import labelSchema from '@schemas/label.json'
import containerSchema from '@schemas/container.json'
import textInputSchema from '@schemas/textInput.json'
import dropdownSchema from '@schemas/dropdown.json'
import gallerySchema from '@schemas/gallery.json'
import CheckboxSchema from '../../../schemas/checkbox.json'
import RectangleSchema from '../../../schemas/rectangle.json'
import IconSchema from '../../../schemas/icon.json'
import HtmlTextSchema from '../../../schemas/htmltext.json'
import DatePickerSchema from '../../../schemas/datepicker.json'
import ComboBoxSchema from '../../../schemas/combobox.json'
import screenSchema from '../../../schemas/screen.json'

// ── Schema lookup ─────────────────────────────────────────────────────────────
export const SCHEMAS = {
  Button: buttonSchema,
  Label: labelSchema,
  Container: containerSchema,
  TextInput: textInputSchema,
  Dropdown: dropdownSchema,
  Gallery: gallerySchema,
  Checkbox: CheckboxSchema,
  Rectangle: RectangleSchema,
  Icon: IconSchema,
  HtmlText: HtmlTextSchema,
  DatePicker: DatePickerSchema,
  ComboBox: ComboBoxSchema,
  Screen: screenSchema,
}

// ── Shared maps ───────────────────────────────────────────────────────────────
export const BORDER_MAP = {
  None: 'BorderStyle.None',
  Solid: 'BorderStyle.Solid',
  Dashed: 'BorderStyle.Dashed',
  Dotted: 'BorderStyle.Dotted'
}
