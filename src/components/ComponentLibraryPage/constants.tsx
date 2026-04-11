import buttonSchema from '../../../schemas/button.json'
import modernButtonSchema from '../../../schemas/modernButton.json'
import modernDropdownSchema from '../../../schemas/modernDropdown.json'
import modernCheckboxSchema from '../../../schemas/modernCheckbox.json'
import modernComboBoxSchema from '../../../schemas/modernComboBox.json'
import modernProgressBarSchema from '../../../schemas/modernProgressBar.json'
import modernSliderSchema from '../../../schemas/modernSlider.json'
import modernSpinnerSchema from '../../../schemas/modernSpinner.json'
import modernTextSchema from '../../../schemas/modernText.json'
import modernTextInputSchema from '../../../schemas/modernTextInput.json'
import modernToggleSchema from '../../../schemas/modernToggle.json'
import linkSchema from '../../../schemas/link.json'
import numberInputSchema from '../../../schemas/numberInput.json'
import modernDatePickerSchema from '../../../schemas/modernDatePicker.json'
import richTextEditorSchema from '../../../schemas/richTextEditor.json'
import ratingSchema from '../../../schemas/rating.json'
import labelSchema from '../../../schemas/label.json'
import containerSchema from '../../../schemas/container.json'
import textInputSchema from '../../../schemas/textInput.json'
import dropdownSchema from '../../../schemas/dropdown.json'
import gallerySchema from '../../../schemas/gallery.json'
import checkboxSchema from '../../../schemas/checkbox.json'
import rectangleSchema from '../../../schemas/rectangle.json'
import iconSchema from '../../../schemas/icon.json'
import htmlTextSchema from '../../../schemas/htmltext.json'
import datePickerSchema from '../../../schemas/datepicker.json'
import comboBoxSchema from '../../../schemas/combobox.json'
import toggleSchema from '../../../schemas/toggle.json'
import radioSchema from '../../../schemas/radio.json'
import sliderSchema from '../../../schemas/slider.json'

const PROP_TYPE_COLORS = {
  text: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  number: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  color: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  boolean: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  select: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
}

const SCHEMAS = [
  buttonSchema,
  modernButtonSchema,
  modernDropdownSchema,
  modernCheckboxSchema,
  modernComboBoxSchema,
  modernProgressBarSchema,
  modernSliderSchema,
  modernSpinnerSchema,
  modernTextSchema,
  modernTextInputSchema,
  modernToggleSchema,
  linkSchema,
  numberInputSchema,
  modernDatePickerSchema,
  richTextEditorSchema,
  ratingSchema,
  labelSchema,
  textInputSchema,
  dropdownSchema,
  checkboxSchema,
  rectangleSchema,
  iconSchema,
  htmlTextSchema,
  datePickerSchema,
  comboBoxSchema,
  toggleSchema,
  radioSchema,
  sliderSchema,
  containerSchema,
  gallerySchema
]

export { PROP_TYPE_COLORS, SCHEMAS }
