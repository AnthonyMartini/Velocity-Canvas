/**
 * @file ai-prompt-access.ts
 * @description
 * This file serves as the definitive security "rulebook" and property allowlist for AI interactions.
 * It defines:
 * 1. Which component types the AI is allowed to add/create (allowAdd).
 * 2. Which component types the AI is allowed to tweak/modify (allowTweak).
 * 3. Exactly which property keys the AI is permitted to see and manipulate for each component type.
 *
 * This layer prevents the AI from hallucinating unsupported properties or performing unauthorized
 * structural changes. It also generates the prompt fragments used to instruct the AI on its boundaries.
 */

import { AI_ADDABLE_COMPONENT_TYPES } from "@/features/powerapps/ai-constraints";
import { SCHEMAS } from "@/features/powerapps/schema";

type PromptAccessEntry = {
  allowAdd: boolean;
  allowTweak?: boolean;
  properties: string[];
};

export const AI_PROMPT_COMPONENT_ACCESS: Record<string, PromptAccessEntry> = {
  Button: { allowAdd: true, allowTweak: true, properties: ["Text", "OnSelect", "Align", "VerticalAlign", "X", "Y", "Width", "Height", "Fill", "Color", "Size", "FontWeight", "BorderRadius", "RadiusTopLeft", "RadiusTopRight", "RadiusBottomLeft", "RadiusBottomRight", "BorderColor", "BorderStyle", "BorderThickness", "HoverFill", "HoverColor", "PressedFill", "PressedColor", "PaddingTop", "PaddingBottom", "PaddingLeft", "PaddingRight", "DisplayMode", "Visible", "Italic", "Underline"] },
  Checkbox: { allowAdd: true, allowTweak: true, properties: ["Text", "Default", "X", "Y", "Width", "Height", "Fill", "Color", "Size", "FontWeight", "CheckmarkFill", "CheckboxBackgroundFill", "CheckboxBorderColor", "CheckboxSize", "BorderColor", "BorderStyle", "BorderThickness", "DisplayMode", "Visible", "OnCheck", "OnUncheck", "OnSelect"] },
  ComboBox: { allowAdd: true, allowTweak: true, properties: ["Items", "DefaultSelectedItems", "SelectedItems", "Selected", "SearchFields", "DisplayFields", "X", "Y", "Width", "Height", "SelectMultiple", "IsSearchable", "BorderColor", "BorderStyle", "BorderThickness", "FocusedBorderColor", "FocusedBorderThickness", "InputTextPlaceholder", "DisplayMode", "Visible", "OnSelect", "OnChange", "OnNavigate", "AccessibleLabel"] },
  Container: { allowAdd: true, allowTweak: true, properties: ["X", "Y", "Width", "Height", "Fill", "BorderColor", "BorderStyle", "BorderThickness", "RadiusTopLeft", "RadiusTopRight", "RadiusBottomLeft", "RadiusBottomRight", "DropShadow", "Visible"] },
  DatePicker: { allowAdd: true, allowTweak: true, properties: ["DefaultDate", "SelectedDate", "Format", "Language", "X", "Y", "Width", "Height", "Fill", "Color", "Size", "FontWeight", "BorderColor", "BorderStyle", "BorderThickness", "IconFill", "IconBackground", "StartYear", "EndYear", "IsEditable", "DisplayMode", "Visible", "OnSelect", "OnChange", "AccessibleLabel"] },
  Dropdown: { allowAdd: true, allowTweak: true, properties: ["Items", "Default", "X", "Y", "Width", "Height", "Fill", "Color", "Size", "FontWeight", "BorderColor", "BorderStyle", "BorderThickness", "SelectionFill", "SelectionColor", "AllowEmptySelection", "DisplayMode", "Visible", "OnChange", "OnSelect", "Selected"] },
  Gallery: { allowAdd: true, allowTweak: true, properties: ["Items", "X", "Y", "Width", "Height", "TemplateSize", "TemplatePadding", "WrapCount", "ShowNavigation", "ShowScrollbar", "Fill", "BorderColor", "BorderStyle", "BorderThickness", "Visible", "Variant"] },
  HtmlText: { allowAdd: true, allowTweak: true, properties: ["HtmlText", "X", "Y", "Width", "Height", "Color", "Fill", "BorderColor", "BorderStyle", "BorderThickness", "HoverBorderColor", "PaddingTop", "PaddingBottom", "PaddingLeft", "PaddingRight", "DisplayMode", "Visible", "OnSelect"] },
  Icon: { allowAdd: true, allowTweak: true, properties: ["Icon", "Rotation", "Color", "Fill", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnSelect", "AccessibleLabel"] },
  Image: { allowAdd: true, allowTweak: true, properties: ["X", "Y", "Width", "Height", "Fill", "Color", "BorderColor", "BorderStyle", "BorderThickness", "PaddingTop", "PaddingRight", "PaddingBottom", "PaddingLeft", "RadiusTopLeft", "RadiusTopRight", "RadiusBottomRight", "RadiusBottomLeft", "DisplayMode", "Visible", "AccessibleLabel", "Tooltip", "OnSelect"] },
  Label: { allowAdd: true, allowTweak: true, properties: ["Text", "Align", "VerticalAlign", "X", "Y", "Width", "Height", "Color", "Fill", "Size", "FontWeight", "BorderColor", "BorderStyle", "BorderThickness", "PaddingTop", "PaddingBottom", "PaddingLeft", "PaddingRight", "LineHeight", "Overflow", "DisplayMode", "Visible", "Italic", "Underline", "OnSelect"] },
  ListBox: { allowAdd: true, allowTweak: true, properties: ["Items", "Default", "Selected", "SelectedItems", "SelectedItemsText", "SelectMultiple", "X", "Y", "Width", "Height", "Fill", "Color", "Size", "FontWeight", "BorderColor", "BorderStyle", "BorderThickness", "SelectionFill", "SelectionColor", "ItemPaddingLeft", "LineHeight", "DisplayMode", "Visible", "AccessibleLabel", "Tooltip", "OnSelect", "OnChange"] },
  Radio: { allowAdd: true, allowTweak: true, properties: ["Items", "Default", "Selected", "Layout", "RadioSize", "X", "Y", "Width", "Height", "Fill", "Color", "Size", "FontWeight", "RadioBorderColor", "RadioSelectionFill", "BorderColor", "BorderStyle", "BorderThickness", "DisplayMode", "Visible", "OnChange", "OnSelect", "AccessibleLabel"] },
  Rectangle: { allowAdd: true, allowTweak: true, properties: ["X", "Y", "Width", "Height", "Fill", "HoverFill", "PressedFill", "FocusedBorderColor", "FocusedBorderThickness", "DisplayMode", "Visible", "OnSelect", "AccessibleLabel"] },
  Slider: { allowAdd: true, allowTweak: true, properties: ["Default", "Value", "Min", "Max", "Step", "ShowValue", "X", "Y", "Width", "Height", "Fill", "RailFill", "ValueFill", "HandleFill", "BorderColor", "BorderStyle", "BorderThickness", "DisplayMode", "Visible", "OnChange", "AccessibleLabel"] },
  TextInput: { allowAdd: true, allowTweak: true, properties: ["Default", "HintText", "X", "Y", "Width", "Height", "Fill", "Color", "Size", "FontWeight", "BorderColor", "BorderStyle", "BorderThickness", "Mode", "Format", "MaxLength", "Clear", "DisplayMode", "Visible", "Italic", "Underline", "OnChange", "OnSelect", "Text"] },
  Toggle: { allowAdd: true, allowTweak: true, properties: ["TrueText", "FalseText", "Default", "Value", "X", "Y", "Width", "Height", "Fill", "Color", "Size", "FontWeight", "TrueFill", "FalseFill", "HandleFill", "BorderColor", "BorderStyle", "BorderThickness", "DisplayMode", "Visible", "OnCheck", "OnUncheck", "OnChange", "OnSelect", "AccessibleLabel"] },
  ModernTabList: { allowAdd: true, allowTweak: true, properties: ["Items", "Default", "Selected", "Align", "Alignment", "Appearance", "TabSize", "Color", "Size", "Font", "FontWeight", "PaddingTop", "PaddingRight", "PaddingBottom", "PaddingLeft", "DisplayMode", "AccessibleLabel", "Visible", "X", "Y", "Width", "Height", "OnSelect", "OnChange"] },
  Link: { allowAdd: false, allowTweak: true, properties: ["Text", "Url", "Type", "Align", "VerticalAlign", "AutoHeight", "Wrap", "BasePaletteColor", "BorderColor", "BorderStyle", "BorderThickness", "Color", "Fill", "Font", "FontWeight", "Italic", "Underline", "Strikethrough", "Size", "PaddingTop", "PaddingRight", "PaddingBottom", "PaddingLeft", "RadiusTopLeft", "RadiusTopRight", "RadiusBottomLeft", "RadiusBottomRight", "X", "Y", "Width", "Height", "DisplayMode", "Visible"] },
  NumberInput: { allowAdd: false, allowTweak: true, properties: ["Default", "Value", "HintText", "Min", "Max", "Step", "Precision", "ValidationState", "Align", "Appearance", "BasePaletteColor", "BorderColor", "BorderStyle", "BorderThickness", "Color", "Fill", "Font", "Size", "PaddingTop", "PaddingRight", "PaddingBottom", "PaddingLeft", "RadiusTopLeft", "RadiusTopRight", "RadiusBottomLeft", "RadiusBottomRight", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnChange"] },
  ModernButton: { allowAdd: false, allowTweak: true, properties: ["Text", "OnSelect", "AccessibleLabel", "Appearance", "BasePaletteColor", "BorderRadius", "FontColor", "FontSize", "FontWeight", "FontItalic", "FontUnderline", "FontStrikethrough", "Icon", "Layout", "IconStyle", "IconRotation", "AcceptsFocus", "X", "Y", "Width", "Height", "DisplayMode", "Visible"] },
  ModernCheckbox: { allowAdd: false, allowTweak: true, properties: ["Label", "Checked", "AccessibleLabel", "BasePaletteColor", "Font", "FontColor", "FontSize", "FontWeight", "FontItalic", "FontUnderline", "FontStrikethrough", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnCheck", "OnUncheck", "OnSelect"] },
  ModernComboBox: { allowAdd: false, allowTweak: true, properties: ["Items", "DefaultSelectedItems", "SelectedItems", "Selected", "AllowMultipleSelection", "AllowSearching", "Appearance", "BasePaletteColor", "BorderColor", "BorderStyle", "BorderThickness", "Color", "DelayOutput", "DisplayMode", "Fill", "Font", "FontWeight", "InputTextPlaceholder", "IsSearchable", "ItemDisplayText", "MultiValueDelimiter", "PaddingTop", "PaddingRight", "PaddingBottom", "PaddingLeft", "RadiusTopLeft", "RadiusTopRight", "RadiusBottomLeft", "RadiusBottomRight", "Required", "SearchText", "SelectMultiple", "Size", "ValidationState", "X", "Y", "Width", "Height", "Visible", "OnChange"] },
  ModernDatePicker: { allowAdd: false, allowTweak: true, properties: ["SelectedDate", "StartDate", "EndDate", "Format", "PlaceHolder", "StartOfWeek", "Required", "IsEditable", "ValidationState", "AccessibleLabel", "BasePaletteColor", "Font", "FontColor", "FontSize", "FontWeight", "FontItalic", "FontUnderline", "FontStrikethrough", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnChange"] },
  ModernDropdown: { allowAdd: false, allowTweak: true, properties: ["Items", "DefaultSelectedItems", "Selected", "AccessibleLabel", "BasePaletteColor", "FontSize", "Required", "ValidationState", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnChange"] },
  ModernProgressBar: { allowAdd: false, allowTweak: true, properties: ["Value", "Max", "Indeterminate", "AccessibleLabel", "BasePaletteColor", "ProgressColor", "Shape", "Thickness", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnChange"] },
  ModernSlider: { allowAdd: false, allowTweak: true, properties: ["Value", "Min", "Max", "AccessibleLabel", "BasePaletteColor", "Layout", "Size", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnChange"] },
  ModernSpinner: { allowAdd: false, allowTweak: true, properties: ["Label", "SpinnerSize", "LabelPosition", "Appearance", "AccessibleLabel", "BasePaletteColor", "Font", "FontColor", "FontSize", "FontWeight", "FontItalic", "FontUnderline", "FontStrikethrough", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnChange"] },
  ModernText: { allowAdd: false, allowTweak: true, properties: ["Text", "Align", "VerticalAlign", "AutoHeight", "Wrap", "X", "Y", "Width", "Height", "Color", "Fill", "Font", "Size", "FontWeight", "Italic", "Underline", "Strikethrough", "BorderColor", "BorderStyle", "BorderThickness", "PaddingTop", "PaddingRight", "PaddingBottom", "PaddingLeft", "RadiusTopLeft", "RadiusTopRight", "RadiusBottomLeft", "RadiusBottomRight", "Visible", "OnSelect"] },
  ModernTextInput: { allowAdd: false, allowTweak: true, properties: ["Default", "Text", "Placeholder", "Type", "TriggerOutput", "Required", "ValidationState", "Align", "Appearance", "BasePaletteColor", "BorderColor", "BorderStyle", "BorderThickness", "Color", "Fill", "Font", "FontWeight", "Italic", "Underline", "Strikethrough", "Size", "MaxLength", "PaddingTop", "PaddingRight", "PaddingBottom", "PaddingLeft", "RadiusTopLeft", "RadiusTopRight", "RadiusBottomLeft", "RadiusBottomRight", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnChange", "OnSelect"] },
  ModernToggle: { allowAdd: false, allowTweak: true, properties: ["Label", "Checked", "LabelPosition", "AccessibleLabel", "BasePaletteColor", "Font", "FontColor", "FontSize", "FontWeight", "FontItalic", "FontUnderline", "FontStrikethrough", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnCheck", "OnUncheck", "OnSelect"] },
  Rating: { allowAdd: false, allowTweak: true, properties: ["Default", "Value", "Max", "RatingFill", "ReadOnly", "ShowValue", "Reset", "Tooltip", "AccessibleLabel", "BorderColor", "BorderStyle", "BorderThickness", "Fill", "FocusedBorderColor", "FocusedBorderThickness", "TabIndex", "X", "Y", "Width", "Height", "DisplayMode", "Visible", "OnChange", "OnSelect"] },
  RichTextEditor: { allowAdd: false, allowTweak: true, properties: ["Default", "HTMLText", "EnableSpellCheck", "AccessibleLabel", "TabIndex", "X", "Y", "Width", "Height", "DisplayMode", "Visible"] },
  Screen: { allowAdd: false, allowTweak: true, properties: ["Fill", "Width", "Height"] },
} as const;

function getSchemaPropertyKeys(type: string) {
  const schema = (SCHEMAS as Record<string, any>)[type];
  const properties = schema?.groups
    ? schema.groups.reduce((acc: any[], group: any) => acc.concat(group.properties || []), [])
    : schema?.properties || [];

  return new Set(properties.map((property: any) => property.key || property.name).filter(Boolean));
}

function validateAiPromptAccessConfig() {
  const accessEntries = Object.entries(AI_PROMPT_COMPONENT_ACCESS);
  const addableFromAccess = new Set<string>();

  for (const [type, config] of accessEntries) {
    if (!(SCHEMAS as Record<string, any>)[type]) {
      throw new Error(`AI prompt access config references unknown schema type "${type}".`);
    }

    const schemaPropertyKeys = getSchemaPropertyKeys(type);
    for (const property of config.properties) {
      if (!schemaPropertyKeys.has(property)) {
        throw new Error(`AI prompt access config property "${type}.${property}" is not defined in the schema.`);
      }
    }

    if (config.allowAdd) {
      addableFromAccess.add(type);
    }
  }

  const expectedAddableTypes = new Set(AI_ADDABLE_COMPONENT_TYPES);
  for (const type of expectedAddableTypes) {
    if (!addableFromAccess.has(type)) {
      throw new Error(`AI prompt access config is missing addable type "${type}".`);
    }
  }

  for (const type of addableFromAccess) {
    if (!expectedAddableTypes.has(type as (typeof AI_ADDABLE_COMPONENT_TYPES)[number])) {
      throw new Error(`AI prompt access config marks "${type}" as addable, but ai-constraints does not.`);
    }
  }
}

validateAiPromptAccessConfig();

export const AI_PROMPT_COMPONENT_TYPES = Object.keys(AI_PROMPT_COMPONENT_ACCESS);
export const AI_PROMPT_ADDABLE_COMPONENT_TYPES = AI_PROMPT_COMPONENT_TYPES.filter(
  (type) => AI_PROMPT_COMPONENT_ACCESS[type]?.allowAdd,
);

export const AI_PROMPT_COMPONENT_RULES_TEXT = [
  "AI component/property allowlist rules:",
  '- The only structural keys allowed outside component-specific properties are "id", "type", "name", and "children".',
  "- Never add, rename, alias, or infer property keys that are not listed for that component type in the allowlist below.",
  "- If a listed property is output-only or runtime-derived, preserve it only when it already exists in provided component JSON. Do not invent runtime-only values on new components.",
  '- For add operations, only component types marked "[add]" are allowed.',
].join("\n");

export const AI_PROMPT_COMPONENT_CATALOG_TEXT = [
  "AI component/property allowlist catalog:",
  ...AI_PROMPT_COMPONENT_TYPES.map((type) => {
    const entry = AI_PROMPT_COMPONENT_ACCESS[type];
    const modeLabel = entry.allowAdd ? "[add,tweak]" : "[tweak-only]";
    return `- ${modeLabel} ${type}: ${entry.properties.join(", ")}`;
  }),
].join("\n");

export function buildSelectedComponentPromptAccessText(type: string | undefined) {
  if (!type) {
    return 'Selected component allowlist: no component type was provided. Preserve structural keys only and do not introduce new properties.';
  }

  const entry = AI_PROMPT_COMPONENT_ACCESS[type];
  if (!entry) {
    return `Selected component allowlist: "${type}" is not in the configured prompt access list. Preserve its structural keys exactly and do not introduce new properties.`;
  }

  return [
    `Selected component allowlist for "${type}":`,
    `- Allowed property keys: ${entry.properties.join(", ")}`,
    '- Do not emit any other component-specific property keys for this type.',
  ].join("\n");
}
