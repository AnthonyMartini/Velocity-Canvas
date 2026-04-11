const DEFAULT_IMPORT_X = 40;
const DEFAULT_IMPORT_Y = 40;
const DEFAULT_IMPORT_WIDTH = 180;
const DEFAULT_IMPORT_HEIGHT = 96;

const CONTROL_TYPE_MAP: Array<[string, string]> = [
  ["classic/button", "Button"],
  ["button@", "ModernButton"],
  ["button", "ModernButton"],
  ["classic/dropdown", "Dropdown"],
  ["dropdown", "ModernDropdown"],
  ["classic/checkbox", "Checkbox"],
  ["checkbox", "ModernCheckbox"],
  ["groupcontainer", "Container"],
  ["gallery", "Gallery"],
  ["label", "Label"],
  ["classic/textinput", "TextInput"],
  ["textinput", "ModernTextInput"],
  ["rectangle", "Rectangle"],
  ["classic/icon", "Icon"],
  ["htmlviewer", "HtmlText"],
  ["classic/datepicker", "DatePicker"],
  ["datepicker", "ModernDatePicker"],
  ["classic/combobox", "ComboBox"],
  ["combobox", "ModernComboBox"],
  ["classic/toggle", "Toggle"],
  ["toggle", "ModernToggle"],
  ["classic/radio", "Radio"],
  ["classic/slider", "Slider"],
  ["link", "Link"],
  ["numberinput", "NumberInput"],
  ["richtexteditor", "RichTextEditor"],
  ["rating", "Rating"],
  ["progressbar", "ModernProgressBar"],
  ["spinner", "ModernSpinner"],
  ["text", "ModernText"],
];

function countIndent(line: string) {
  let count = 0;
  while (count < line.length && line[count] === " ") count += 1;
  return count;
}

function normalizeYamlBlock(lines: string[], baseIndent: number) {
  return lines
    .map((line) => {
      if (!line.trim()) return "";
      return line.startsWith(" ".repeat(baseIndent)) ? line.slice(baseIndent) : line.trimStart();
    })
    .join("\n")
    .trimEnd();
}

function normalizeInput(input: string) {
  return String(input || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "  ");
}

function splitKeyValue(trimmedLine: string) {
  const colonIndex = trimmedLine.indexOf(":");
  if (colonIndex === -1) return null;
  return {
    key: trimmedLine.slice(0, colonIndex).trim(),
    value: trimmedLine.slice(colonIndex + 1).trim(),
  };
}

function coercePowerAppsValue(rawValue: string) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) return "";

  const value = trimmed.startsWith("=") ? trimmed.slice(1).trim() : trimmed;
  if (!value) return "";

  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === "true";

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value;
  }

  return value;
}

function isControlHeader(trimmedLine: string) {
  return /^-\s+.+:\s*$/.test(trimmedLine);
}

function isScreenHeader(trimmedLine: string) {
  if (!/.+:\s*$/.test(trimmedLine)) return false;
  if (trimmedLine.startsWith("- ")) return false;
  return !["Screens:", "Properties:", "Children:", "Control:", "Variant:"].includes(trimmedLine);
}

function mapControlToType(controlRaw: string | null) {
  const normalized = String(controlRaw || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .toLowerCase();

  for (const [fragment, type] of CONTROL_TYPE_MAP) {
    if (normalized.includes(fragment)) return type;
  }

  return null;
}

function parsePropertyEntries(lines: string[], startIndex: number, parentIndent: number) {
  const properties: Record<string, any> = {};
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const indent = countIndent(line);
    if (indent <= parentIndent) break;

    const keyValue = splitKeyValue(trimmed);
    if (keyValue) {
      properties[keyValue.key] = coercePowerAppsValue(keyValue.value);
    }

    index += 1;
  }

  return { properties, nextIndex: index };
}

function parseNodeSequence(lines: string[], startIndex: number, parentIndent: number) {
  const nodes: any[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const indent = countIndent(line);
    if (indent <= parentIndent) break;
    if (!isControlHeader(trimmed) && !isScreenHeader(trimmed)) {
      index += 1;
      continue;
    }

    const parsed = parseNode(lines, index);
    if (parsed.node) nodes.push(parsed.node);
    index = parsed.nextIndex;
  }

  return { nodes, nextIndex: index };
}

function buildOpaqueNode(name: string, controlRaw: string | null, properties: Record<string, any>, rawYaml: string) {
  return {
    type: "UnknownPowerAppsObject",
    name,
    sourceControl: String(controlRaw || "Unknown"),
    X: typeof properties.X === "number" ? properties.X : DEFAULT_IMPORT_X,
    Y: typeof properties.Y === "number" ? properties.Y : DEFAULT_IMPORT_Y,
    Width: typeof properties.Width === "number" ? properties.Width : DEFAULT_IMPORT_WIDTH,
    Height: typeof properties.Height === "number" ? properties.Height : DEFAULT_IMPORT_HEIGHT,
    Visible: properties.Visible !== false,
    _rawPowerAppsYaml: rawYaml,
  };
}

function buildParsedNode(input: {
  kind: "screen" | "component";
  name: string;
  controlRaw: string | null;
  variantRaw: string | null;
  properties: Record<string, any>;
  children: any[];
  rawYaml: string;
}) {
  const { kind, name, controlRaw, variantRaw, properties, children, rawYaml } = input;

  if (kind === "screen") {
    return {
      type: "Screen",
      name,
      Fill: properties.Fill || "RGBA(255, 255, 255, 1)",
      Width: typeof properties.Width === "number" ? properties.Width : undefined,
      Height: typeof properties.Height === "number" ? properties.Height : undefined,
      children,
    };
  }

  const mappedType = mapControlToType(controlRaw);
  if (!mappedType) {
    return buildOpaqueNode(name, controlRaw, properties, rawYaml);
  }

  const parsedNode: Record<string, any> = {
    type: mappedType,
    name,
    ...properties,
  };

  if (variantRaw) parsedNode.Variant = variantRaw;
  if (children.length) parsedNode.children = children;

  return parsedNode;
}

function parseNode(lines: string[], startIndex: number) {
  const headerLine = lines[startIndex];
  const trimmedHeader = headerLine.trim();
  const baseIndent = countIndent(headerLine);

  const componentMatch = trimmedHeader.match(/^-\s+(.+):\s*$/);
  const screenMatch = !componentMatch ? trimmedHeader.match(/^(.+):\s*$/) : null;

  const kind = componentMatch ? "component" : "screen";
  const name = (componentMatch?.[1] || screenMatch?.[1] || "ImportedObject").trim();

  let index = startIndex + 1;
  let controlRaw: string | null = null;
  let variantRaw: string | null = null;
  let properties: Record<string, any> = {};
  let children: any[] = [];

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const indent = countIndent(line);
    if (indent <= baseIndent) break;

    if (kind === "component" && trimmed.startsWith("Control:")) {
      controlRaw = trimmed.slice("Control:".length).trim();
      index += 1;
      continue;
    }

    if (trimmed.startsWith("Variant:")) {
      variantRaw = trimmed.slice("Variant:".length).trim();
      index += 1;
      continue;
    }

    if (trimmed === "Properties:") {
      const parsedProperties = parsePropertyEntries(lines, index + 1, indent);
      properties = parsedProperties.properties;
      index = parsedProperties.nextIndex;
      continue;
    }

    if (trimmed === "Children:") {
      const parsedChildren = parseNodeSequence(lines, index + 1, indent);
      children = parsedChildren.nodes;
      index = parsedChildren.nextIndex;
      continue;
    }

    index += 1;
  }

  const rawYaml = normalizeYamlBlock(lines.slice(startIndex, index), baseIndent);
  return {
    node: buildParsedNode({ kind, name, controlRaw, variantRaw, properties, children, rawYaml }),
    nextIndex: index,
  };
}

function countOpaqueNodes(nodes: any[]): number {
  let count = 0;
  for (const node of nodes || []) {
    if (node?.type === "UnknownPowerAppsObject") count += 1;
    if (Array.isArray(node?.children) && node.children.length) {
      count += countOpaqueNodes(node.children);
    }
  }
  return count;
}

export function looksLikePowerAppsYaml(input: string) {
  const text = normalizeInput(input);
  if (!text.trim()) return false;

  const hasScreensDocument = /(^|\n)\s*Screens:\s*$/m.test(text);
  const hasControlBlock = /(^|\n)\s*-\s+.+:\s*$(?:\n|\r\n?)[\s\S]*?(^|\n)\s*Control:\s*/m.test(text);
  const hasScreenBlock = /(^|\n)\s*[A-Za-z_][^:\n]*:\s*$(?:\n|\r\n?)[\s\S]*?(^|\n)\s*Properties:\s*/m.test(text);

  return hasScreensDocument || hasControlBlock || hasScreenBlock;
}

export function parsePowerAppsYaml(input: string) {
  const normalized = normalizeInput(input);
  const lines = normalized.split("\n");

  let startIndex = 0;
  const screensIndex = lines.findIndex((line) => line.trim() === "Screens:");

  if (screensIndex !== -1) {
    startIndex = screensIndex + 1;
  } else {
    while (startIndex < lines.length && !lines[startIndex].trim()) startIndex += 1;
  }

  const parsed = parseNodeSequence(lines, startIndex, -1);
  const screens = parsed.nodes.filter((node) => node?.type === "Screen");
  const components = parsed.nodes.filter((node) => node?.type !== "Screen");

  return {
    screens,
    components,
    opaqueNodeCount: countOpaqueNodes(parsed.nodes),
    totalNodeCount: parsed.nodes.length,
  };
}

function formatPreservedYamlValue(key: string, value: unknown) {
  if (["X", "Y", "Width", "Height"].includes(key)) {
    const n = Number(value);
    return `=${Number.isFinite(n) ? Math.round(n) : 0}`;
  }

  return `=${String(value ?? "").trim()}`;
}

function upsertYamlProperty(rawYaml: string, key: string, value: unknown) {
  const normalized = normalizeInput(rawYaml);
  const lines = normalized.split("\n");
  let propertiesIndex = lines.findIndex((line) => line.trim() === "Properties:");

  if (propertiesIndex === -1) {
    const controlIndex = lines.findIndex((line) => line.trim().startsWith("Control:"));
    const variantIndex = lines.findIndex((line) => line.trim().startsWith("Variant:"));
    const anchorIndex = variantIndex !== -1 ? variantIndex : controlIndex;

    if (anchorIndex === -1) return normalized;

    const anchorIndent = countIndent(lines[anchorIndex]);
    propertiesIndex = anchorIndex + 1;
    lines.splice(propertiesIndex, 0, `${" ".repeat(anchorIndent)}Properties:`);
  }

  const propertiesIndent = countIndent(lines[propertiesIndex]);
  let propertyIndent = propertiesIndent + 2;
  let insertIndex = propertiesIndex + 1;

  for (let i = propertiesIndex + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      insertIndex = i + 1;
      continue;
    }

    const indent = countIndent(lines[i]);
    if (indent <= propertiesIndent) {
      insertIndex = i;
      break;
    }

    propertyIndent = indent;

    const keyValue = splitKeyValue(trimmed);
    if (keyValue?.key === key) {
      lines[i] = `${" ".repeat(indent)}${key}: ${formatPreservedYamlValue(key, value)}`;
      return lines.join("\n");
    }

    insertIndex = i + 1;
  }

  lines.splice(insertIndex, 0, `${" ".repeat(propertyIndent)}${key}: ${formatPreservedYamlValue(key, value)}`);
  return lines.join("\n");
}

export function mergePreservedPowerAppsYaml(node: any, updates: Record<string, any>) {
  if (
    !node ||
    node.type !== "UnknownPowerAppsObject" ||
    typeof node._rawPowerAppsYaml !== "string" ||
    !node._rawPowerAppsYaml.trim()
  ) {
    return updates;
  }

  let nextRawYaml = node._rawPowerAppsYaml;
  let changed = false;

  for (const key of ["X", "Y", "Width", "Height"]) {
    if (updates[key] === undefined) continue;
    nextRawYaml = upsertYamlProperty(nextRawYaml, key, updates[key]);
    changed = true;
  }

  return changed ? { ...updates, _rawPowerAppsYaml: nextRawYaml } : updates;
}
