import powerAppsControlsReference from '../../../schemas/powerapps_controls_reference.json'
import powerAppsFormulaFunctions from '../../../schemas/powerapps_formula_functions.json'
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
import screenSchema from '../../../schemas/screen.json'
import { FUNCTIONS } from '@/features/powerapps/functions'

type CoverageStatus = 'supported' | 'partial' | 'unsupported'
type AvailabilityStatus = 'current' | 'preview' | 'experimental'

const normalize = (value: string | null | undefined) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const controlKey = (variant: string, name: string) => `${variant}::${normalize(name)}`

const buildSchemaPropertySet = (schemas: any[]) => {
  const values = new Set<string>()

  schemas.forEach((schema) => {
    ;(schema?.properties || []).forEach((property: any) => {
      values.add(normalize(property?.key))
      values.add(normalize(property?.label))
    })
  })

  return values
}

const controlMappings = new Map<
  string,
  {
    schemas: any[]
    note?: string
    statusOverride?: CoverageStatus
  }
>([
  [controlKey('classic', 'Button'), { schemas: [buttonSchema] }],
  [controlKey('modern', 'Button'), { schemas: [modernButtonSchema] }],
  [controlKey('modern', 'Dropdown'), { schemas: [modernDropdownSchema] }],
  [controlKey('modern', 'Checkbox'), { schemas: [modernCheckboxSchema] }],
  [controlKey('modern', 'Combobox'), { schemas: [modernComboBoxSchema] }],
  [controlKey('modern', 'Progress bar'), { schemas: [modernProgressBarSchema] }],
  [controlKey('modern', 'Slider'), { schemas: [modernSliderSchema] }],
  [controlKey('modern', 'Spinner'), { schemas: [modernSpinnerSchema] }],
  [controlKey('modern', 'Text'), { schemas: [modernTextSchema] }],
  [controlKey('modern', 'Text input'), { schemas: [modernTextInputSchema] }],
  [controlKey('modern', 'Toggle'), { schemas: [modernToggleSchema] }],
  [controlKey('modern', 'Link'), { schemas: [linkSchema] }],
  [controlKey('modern', 'Number input'), { schemas: [numberInputSchema] }],
  [controlKey('modern', 'Date picker'), { schemas: [modernDatePickerSchema] }],
  [controlKey('classic', 'Label'), { schemas: [labelSchema] }],
  [controlKey('classic', 'Text input'), { schemas: [textInputSchema] }],
  [controlKey('classic', 'Drop down'), { schemas: [dropdownSchema] }],
  [controlKey('classic', 'Gallery'), { schemas: [gallerySchema] }],
  [controlKey('classic', 'Check box'), { schemas: [checkboxSchema] }],
  [controlKey('classic', 'Container'), { schemas: [containerSchema] }],
  [controlKey('classic', 'Date Picker'), { schemas: [datePickerSchema] }],
  [controlKey('classic', 'Combo box'), { schemas: [comboBoxSchema] }],
  [controlKey('classic', 'Toggle'), { schemas: [toggleSchema] }],
  [controlKey('classic', 'Radio'), { schemas: [radioSchema] }],
  [controlKey('classic', 'Slider'), { schemas: [sliderSchema] }],
  [controlKey('classic', 'Rich text editor'), { schemas: [richTextEditorSchema] }],
  [controlKey('classic', 'Rating'), { schemas: [ratingSchema] }],
  [controlKey('classic', 'HTML text'), { schemas: [htmlTextSchema] }],
  [controlKey('classic', 'Screen'), { schemas: [screenSchema] }],
  [
    controlKey('classic', 'Shape and Icon'),
    {
      schemas: [iconSchema, rectangleSchema],
      statusOverride: 'partial',
      note: 'Current support covers Icon and Rectangle renderers, but not the broader Power Apps shapes set from the official reference page.',
    },
  ],
])

const statusOrder: Record<CoverageStatus, number> = {
  supported: 0,
  partial: 1,
  unsupported: 2,
}

const statusLabels: Record<CoverageStatus, string> = {
  supported: 'Supported',
  partial: 'Partial',
  unsupported: 'Unsupported',
}

const availabilityLabels: Record<AvailabilityStatus, string> = {
  current: 'Current',
  preview: 'Preview',
  experimental: 'Experimental',
}

export const CONTROL_COVERAGE = powerAppsControlsReference.controls
  .map((control: any) => {
    const mapping = controlMappings.get(controlKey(control.variant, control.name))
    const supportedPropertySet = mapping ? buildSchemaPropertySet(mapping.schemas) : new Set<string>()

    const properties = control.properties.map((property: any) => {
      const propertyKey = normalize(property.name)
      const supported = supportedPropertySet.has(propertyKey)

      return {
        ...property,
        supported,
      }
    })

    const supportedProperties = properties.filter((property: any) => property.supported)
    const missingProperties = properties.filter((property: any) => !property.supported)
    let status: CoverageStatus = 'unsupported'

    if (mapping) {
      if (mapping.statusOverride) {
        status = mapping.statusOverride
      } else if (missingProperties.length === 0) {
        status = 'supported'
      } else if (supportedProperties.length > 0) {
        status = 'partial'
      }
    }

    return {
      ...control,
      availability: (control.availability || 'current') as AvailabilityStatus,
      availabilityLabel: availabilityLabels[(control.availability || 'current') as AvailabilityStatus],
      status,
      statusLabel: statusLabels[status],
      note: mapping?.note || null,
      supportedProperties,
      missingProperties,
      supportedPropertyCount: supportedProperties.length,
      totalPropertyCount: properties.length,
      propertyCoveragePercent: properties.length === 0 ? 0 : Math.round((supportedProperties.length / properties.length) * 100),
      properties,
    }
  })
  .sort((left: any, right: any) => {
    if (statusOrder[left.status] !== statusOrder[right.status]) {
      return statusOrder[left.status] - statusOrder[right.status]
    }

    if (left.variant !== right.variant) {
      return left.variant.localeCompare(right.variant)
    }

    return left.name.localeCompare(right.name)
  })

const implementedFunctionMap = new Map(FUNCTIONS.map((func) => [normalize(func.name), func]))

export const FUNCTION_COVERAGE = powerAppsFormulaFunctions.functions
  .map((func: any) => {
    const implementation = implementedFunctionMap.get(normalize(func.name))
    const status: CoverageStatus = implementation ? 'supported' : 'unsupported'

    return {
      ...func,
      status,
      statusLabel: statusLabels[status],
      implementation,
    }
  })
  .sort((left: any, right: any) => {
    if (statusOrder[left.status] !== statusOrder[right.status]) {
      return statusOrder[left.status] - statusOrder[right.status]
    }

    if (left.category !== right.category) {
      return left.category.localeCompare(right.category)
    }

    return left.name.localeCompare(right.name)
  })

export const EXTRA_IMPLEMENTED_FUNCTIONS = FUNCTIONS
  .filter((func) => !powerAppsFormulaFunctions.functions.some((official: any) => normalize(official.name) === normalize(func.name)))
  .map((func) => ({
    name: func.name,
    type: func.type,
    description: func.description,
  }))
  .sort((left, right) => left.name.localeCompare(right.name))

export const CONTROL_COVERAGE_SUMMARY = {
  total: CONTROL_COVERAGE.length,
  supported: CONTROL_COVERAGE.filter((control) => control.status === 'supported').length,
  partial: CONTROL_COVERAGE.filter((control) => control.status === 'partial').length,
  unsupported: CONTROL_COVERAGE.filter((control) => control.status === 'unsupported').length,
  classic: CONTROL_COVERAGE.filter((control) => control.variant === 'classic').length,
  modern: CONTROL_COVERAGE.filter((control) => control.variant === 'modern').length,
  previewOrExperimental: CONTROL_COVERAGE.filter((control) => control.availability !== 'current').length,
  supportedProperties: CONTROL_COVERAGE.reduce((sum, control) => sum + control.supportedPropertyCount, 0),
  totalProperties: CONTROL_COVERAGE.reduce((sum, control) => sum + control.totalPropertyCount, 0),
}

export const FUNCTION_COVERAGE_SUMMARY = {
  total: FUNCTION_COVERAGE.length,
  supported: FUNCTION_COVERAGE.filter((func) => func.status === 'supported').length,
  unsupported: FUNCTION_COVERAGE.filter((func) => func.status === 'unsupported').length,
  extraImplemented: EXTRA_IMPLEMENTED_FUNCTIONS.length,
}

export const COVERAGE_METADATA = {
  controlsGeneratedAt: powerAppsControlsReference.generatedAt,
  functionsGeneratedAt: powerAppsFormulaFunctions.generatedAt,
  controlsScope: powerAppsControlsReference.scope,
  functionsScope: powerAppsFormulaFunctions.scope,
}
