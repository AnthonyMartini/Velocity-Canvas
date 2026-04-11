import { Icon } from "@/features/powerapps/functions";

export const CLASSIC_AI_COMPONENT_TYPES = [
  "Button",
  "Checkbox",
  "ComboBox",
  "Container",
  "DatePicker",
  "Dropdown",
  "Gallery",
  "HtmlText",
  "Image",
  "Icon",
  "Label",
  "ListBox",
  "Radio",
  "Rectangle",
  "Slider",
  "TextInput",
  "Toggle",
] as const;

export const CLASSIC_AI_COMPONENT_TYPE_SET = new Set<string>(CLASSIC_AI_COMPONENT_TYPES);
export const AI_ADDABLE_COMPONENT_TYPES = [...CLASSIC_AI_COMPONENT_TYPES, "ModernTabList"] as const;
export const AI_ADDABLE_COMPONENT_TYPE_SET = new Set<string>(AI_ADDABLE_COMPONENT_TYPES);

export const SUPPORTED_ICON_ENUM_VALUES = Object.values(Icon);
export const SUPPORTED_ICON_ENUM_VALUE_SET = new Set<string>(SUPPORTED_ICON_ENUM_VALUES);
