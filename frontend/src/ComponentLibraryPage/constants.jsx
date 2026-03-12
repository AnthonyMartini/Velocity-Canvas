import buttonSchema from '@schemas/button.json'
import labelSchema from '@schemas/label.json'
import containerSchema from '@schemas/container.json'
import textInputSchema from '@schemas/textInput.json'
import dropdownSchema from '@schemas/dropdown.json'
import gallerySchema from '@schemas/gallery.json'
import checkboxSchema from '@schemas/checkbox.json'
import rectangleSchema from '@schemas/rectangle.json'
import iconSchema from '@schemas/icon.json'
import htmlTextSchema from '@schemas/htmltext.json'
import datePickerSchema from '@schemas/datepicker.json'
import comboBoxSchema from '@schemas/combobox.json'

const PROP_TYPE_COLORS = {
  text: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  number: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  color: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  boolean: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  select: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
}

const SCHEMAS = [
  buttonSchema,
  labelSchema,
  textInputSchema,
  dropdownSchema,
  checkboxSchema,
  rectangleSchema,
  iconSchema,
  htmlTextSchema,
  datePickerSchema,
  comboBoxSchema,
  containerSchema,
  gallerySchema
]

export { PROP_TYPE_COLORS, SCHEMAS }
