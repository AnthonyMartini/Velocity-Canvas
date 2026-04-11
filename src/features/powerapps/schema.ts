import buttonSchema from "../../../schemas/button.json";
import modernButtonSchema from "../../../schemas/modernButton.json";
import modernDropdownSchema from "../../../schemas/modernDropdown.json";
import modernTabListSchema from "../../../schemas/modernTabList.json";
import modernCheckboxSchema from "../../../schemas/modernCheckbox.json";
import modernComboBoxSchema from "../../../schemas/modernComboBox.json";
import modernProgressBarSchema from "../../../schemas/modernProgressBar.json";
import modernSliderSchema from "../../../schemas/modernSlider.json";
import modernSpinnerSchema from "../../../schemas/modernSpinner.json";
import modernTextSchema from "../../../schemas/modernText.json";
import modernTextInputSchema from "../../../schemas/modernTextInput.json";
import modernToggleSchema from "../../../schemas/modernToggle.json";
import linkSchema from "../../../schemas/link.json";
import numberInputSchema from "../../../schemas/numberInput.json";
import modernDatePickerSchema from "../../../schemas/modernDatePicker.json";
import richTextEditorSchema from "../../../schemas/richTextEditor.json";
import ratingSchema from "../../../schemas/rating.json";
import labelSchema from "../../../schemas/label.json";
import containerSchema from "../../../schemas/container.json";
import textInputSchema from "../../../schemas/textInput.json";
import dropdownSchema from "../../../schemas/dropdown.json";
import listBoxSchema from "../../../schemas/listBox.json";
import gallerySchema from "../../../schemas/gallery.json";
import CheckboxSchema from "../../../schemas/checkbox.json";
import RectangleSchema from "../../../schemas/rectangle.json";
import IconSchema from "../../../schemas/icon.json";
import ImageSchema from "../../../schemas/image.json";
import HtmlTextSchema from "../../../schemas/htmltext.json";
import DatePickerSchema from "../../../schemas/datepicker.json";
import ComboBoxSchema from "../../../schemas/combobox.json";
import ToggleSchema from "../../../schemas/toggle.json";
import RadioSchema from "../../../schemas/radio.json";
import SliderSchema from "../../../schemas/slider.json";
import screenSchema from "../../../schemas/screen.json";
import { appTheme, applyThemeToSchema } from "@/theme/theme";

export const SCHEMAS = {
  Button: applyThemeToSchema(buttonSchema, appTheme.controlDefaults.Button),
  ModernButton: applyThemeToSchema(modernButtonSchema, appTheme.controlDefaults.ModernButton),
  ModernDropdown: applyThemeToSchema(modernDropdownSchema, appTheme.controlDefaults.ModernDropdown),
  ModernTabList: applyThemeToSchema(modernTabListSchema, appTheme.controlDefaults.ModernTabList),
  ModernCheckbox: applyThemeToSchema(modernCheckboxSchema, appTheme.controlDefaults.ModernCheckbox),
  ModernComboBox: applyThemeToSchema(modernComboBoxSchema, appTheme.controlDefaults.ModernComboBox),
  ModernProgressBar: applyThemeToSchema(modernProgressBarSchema, appTheme.controlDefaults.ModernProgressBar),
  ModernSlider: applyThemeToSchema(modernSliderSchema, appTheme.controlDefaults.ModernSlider),
  ModernSpinner: applyThemeToSchema(modernSpinnerSchema, appTheme.controlDefaults.ModernSpinner),
  ModernText: applyThemeToSchema(modernTextSchema, appTheme.controlDefaults.ModernText),
  ModernTextInput: applyThemeToSchema(modernTextInputSchema, appTheme.controlDefaults.ModernTextInput),
  ModernToggle: applyThemeToSchema(modernToggleSchema, appTheme.controlDefaults.ModernToggle),
  Link: applyThemeToSchema(linkSchema, appTheme.controlDefaults.Link),
  NumberInput: applyThemeToSchema(numberInputSchema, appTheme.controlDefaults.NumberInput),
  ModernDatePicker: applyThemeToSchema(modernDatePickerSchema, appTheme.controlDefaults.ModernDatePicker),
  RichTextEditor: applyThemeToSchema(richTextEditorSchema, appTheme.controlDefaults.RichTextEditor),
  Rating: applyThemeToSchema(ratingSchema, appTheme.controlDefaults.Rating),
  Label: applyThemeToSchema(labelSchema, appTheme.controlDefaults.Label),
  Container: applyThemeToSchema(containerSchema, appTheme.controlDefaults.Container),
  TextInput: applyThemeToSchema(textInputSchema, appTheme.controlDefaults.TextInput),
  Dropdown: applyThemeToSchema(dropdownSchema, appTheme.controlDefaults.Dropdown),
  ListBox: applyThemeToSchema(listBoxSchema, appTheme.controlDefaults.ListBox),
  Gallery: applyThemeToSchema(gallerySchema, appTheme.controlDefaults.Gallery),
  Checkbox: applyThemeToSchema(CheckboxSchema, appTheme.controlDefaults.Checkbox),
  Rectangle: applyThemeToSchema(RectangleSchema, appTheme.controlDefaults.Rectangle),
  Icon: applyThemeToSchema(IconSchema, appTheme.controlDefaults.Icon),
  Image: applyThemeToSchema(ImageSchema, appTheme.controlDefaults.Image),
  HtmlText: applyThemeToSchema(HtmlTextSchema, appTheme.controlDefaults.HtmlText),
  DatePicker: applyThemeToSchema(DatePickerSchema, appTheme.controlDefaults.DatePicker),
  ComboBox: applyThemeToSchema(ComboBoxSchema, appTheme.controlDefaults.ComboBox),
  Toggle: applyThemeToSchema(ToggleSchema, appTheme.controlDefaults.Toggle),
  Radio: applyThemeToSchema(RadioSchema, appTheme.controlDefaults.Radio),
  Slider: applyThemeToSchema(SliderSchema, appTheme.controlDefaults.Slider),
  Screen: applyThemeToSchema(screenSchema, appTheme.controlDefaults.Screen),
};

export const BORDER_MAP = {
  None: "BorderStyle.None",
  Solid: "BorderStyle.Solid",
  Dashed: "BorderStyle.Dashed",
  Dotted: "BorderStyle.Dotted",
};
