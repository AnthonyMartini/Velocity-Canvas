import { resolveSampleText } from "@/features/powerapps/sample-text";
import { SCHEMAS } from "@/features/powerapps/schema";

const GRID_SIZE = 8;
const SINGLE_LINE_SAFETY_WIDTH = 16;
const BUTTON_LINE_HEIGHT_MULTIPLIER = 1.2;
const BODY_LINE_HEIGHT_MULTIPLIER = 1.35;
const DEFAULT_LABEL_LINE_HEIGHT_MULTIPLIER = 1.5;

const DYNAMIC_TEXT_MARKERS = [
  "Parent.",
  "ThisItem.",
  "App.",
  "Self.",
  "Set(",
  "Notify(",
  "Navigate(",
  "If(",
  "RGBA(",
  "RGB(",
  "Text(",
  "Value(",
  "Table(",
];

export const TEXT_SIZING_PROMPT_GUIDE = [
  "=== TEXT SIZING RULES ===",
  "1. Size every text-bearing control from its content. Do not guess Width or Height.",
  "2. Estimate single-line text width before placing Button, ModernButton, Label, Link, TextInput, or ModernTextInput controls.",
  "3. Use this heuristic for average character width:",
  "   - regular text: 0.52 * font size",
  "   - semibold text: 0.55 * font size",
  "   - bold/title text: 0.58 * font size",
  "   - spaces: 0.32 * font size",
  "4. Add 12-16 px of safety width after estimating the text width to avoid accidental wrapping.",
  "5. Include control padding, border thickness, and icon width/gap in the final Width.",
  "6. Use line height of about 1.2 * font size for buttons and 1.35 * font size for labels/body text unless the component already specifies a larger line height.",
  "7. Titles and headings should stay on one line by default. Give them more width before increasing height.",
  "8. Buttons should stay single-line. Increase Width before shrinking font size.",
  "9. Inputs must fit their placeholder or default text plus left/right input padding.",
  "10. If Wrap is true for text content, choose Width first, then compute Height from the estimated line count.",
  "11. Snap final Width and Height values to the 8 px grid.",
].join("\n");

export const TEXT_SIZING_RUNTIME_GUIDE = [
  "Text sizing guide:",
  '- Estimate regular text at ~0.52 x font size per character, semibold at ~0.55 x, bold/title text at ~0.58 x, and spaces at ~0.32 x.',
  "- Add 16 px of safety width for single-line controls.",
  "- Classic Button padding defaults: Left/Right 10, Top/Bottom 5, Height 40.",
  "- ModernButton defaults: FontSize 14, horizontal padding 12 per side when text is visible, icon width 14, icon gap 8, icon-only width target 32+.",
  "- Label defaults: Left/Right padding 8, Top/Bottom 4, line-height 1.5.",
  "- ModernText defaults: Left/Right padding 8, Top/Bottom 6, line-height about 1.35.",
  "- TextInput defaults: Left/Right padding 12, Height 40, line-height about 1.2.",
  "- Favor wider titles and buttons over wrapped titles and wrapped button text.",
  "- Snap Width and Height to multiples of 8.",
].join("\n");

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getDefaults(type: string) {
  return (SCHEMAS as Record<string, any>)?.[type]?.defaults || {};
}

function readNumber(component: Record<string, any>, key: string, fallback: number) {
  const direct = component?.[key];
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;

  if (typeof direct === "string") {
    const parsed = Number(direct);
    if (Number.isFinite(parsed)) return parsed;
  }

  const schemaDefault = getDefaults(component?.type || "")?.[key];
  if (typeof schemaDefault === "number" && Number.isFinite(schemaDefault)) return schemaDefault;

  if (typeof schemaDefault === "string") {
    const parsed = Number(schemaDefault);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function readString(component: Record<string, any>, key: string, fallback = "") {
  const direct = component?.[key];
  if (typeof direct === "string") return direct;

  const schemaDefault = getDefaults(component?.type || "")?.[key];
  return typeof schemaDefault === "string" ? schemaDefault : fallback;
}

function readBoolean(component: Record<string, any>, key: string, fallback: boolean) {
  const direct = component?.[key];
  if (typeof direct === "boolean") return direct;
  if (typeof direct === "string") {
    const normalized = direct.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  const schemaDefault = getDefaults(component?.type || "")?.[key];
  if (typeof schemaDefault === "boolean") return schemaDefault;
  if (typeof schemaDefault === "string") {
    const normalized = schemaDefault.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return fallback;
}

function stripOuterQuotes(value: string) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function looksDynamicText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("=")) return true;
  if (/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) return true;
  return DYNAMIC_TEXT_MARKERS.some((marker) => trimmed.includes(marker));
}

function normalizeLiteralText(value: unknown) {
  if (value == null) return null;

  const resolved = resolveSampleText(String(value)).trim();
  if (!resolved || resolved === '""' || resolved === "''") return "";

  const unwrapped = stripOuterQuotes(resolved);
  if (!unwrapped) return "";

  if (resolved === unwrapped && looksDynamicText(resolved)) {
    return null;
  }

  return resolveSampleText(unwrapped);
}

function fontWeightWidthMultiplier(fontWeight: string) {
  if (fontWeight === "FontWeight.Bold") return 1.12;
  if (fontWeight === "FontWeight.Semibold") return 1.06;
  if (fontWeight === "FontWeight.Lighter") return 0.96;
  return 1;
}

function estimateCharacterWidthRatio(char: string) {
  if (/\s/.test(char)) return 0.32;
  if ("ilIjtfr.,:;|!'`".includes(char)) return 0.28;
  if ("MW@%#&QGOD".includes(char)) return 0.82;
  if (/[A-Z]/.test(char)) return 0.62;
  if (/[0-9]/.test(char)) return 0.56;
  return 0.52;
}

function estimateSingleLineTextWidth(text: string, fontSize: number, fontWeight: string, italic = false) {
  if (!text) return 0;

  const width =
    Array.from(text).reduce((sum, char) => sum + estimateCharacterWidthRatio(char) * fontSize, 0) *
    fontWeightWidthMultiplier(fontWeight) *
    (italic ? 1.03 : 1);

  return Math.ceil(width);
}

function resolveLineHeightPx(component: Record<string, any>, fontSize: number, fallbackMultiplier: number) {
  const explicit = component?.LineHeight;
  if (typeof explicit === "number" && Number.isFinite(explicit)) {
    return explicit > 3 ? explicit : explicit * fontSize;
  }

  return fontSize * fallbackMultiplier;
}

function snapToGrid(value: number, minimum = GRID_SIZE) {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.ceil(value / GRID_SIZE) * GRID_SIZE);
}

function getTextAreaWidth(componentWidth: number, horizontalPadding: number, borderThickness: number) {
  return Math.max(24, componentWidth - horizontalPadding - borderThickness * 2);
}

function estimateWrappedLineCount(text: string, availableTextWidth: number, fontSize: number, fontWeight: string, italic = false) {
  if (!text) return 1;
  if (!Number.isFinite(availableTextWidth) || availableTextWidth <= 0) return 1;

  const paragraphs = text.split(/\r?\n/);
  let totalLines = 0;
  const spaceWidth = estimateSingleLineTextWidth(" ", fontSize, fontWeight, italic);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (!words.length) {
      totalLines += 1;
      continue;
    }

    let lines = 1;
    let currentLineWidth = 0;

    for (const word of words) {
      const wordWidth = estimateSingleLineTextWidth(word, fontSize, fontWeight, italic);

      if (currentLineWidth === 0) {
        if (wordWidth <= availableTextWidth) {
          currentLineWidth = wordWidth;
        } else {
          const wrappedWordLines = Math.max(1, Math.ceil(wordWidth / availableTextWidth));
          lines += wrappedWordLines - 1;
          currentLineWidth = wordWidth % availableTextWidth || availableTextWidth;
        }
        continue;
      }

      if (currentLineWidth + spaceWidth + wordWidth <= availableTextWidth) {
        currentLineWidth += spaceWidth + wordWidth;
        continue;
      }

      lines += 1;

      if (wordWidth <= availableTextWidth) {
        currentLineWidth = wordWidth;
      } else {
        const wrappedWordLines = Math.max(1, Math.ceil(wordWidth / availableTextWidth));
        lines += wrappedWordLines - 1;
        currentLineWidth = wordWidth % availableTextWidth || availableTextWidth;
      }
    }

    totalLines += lines;
  }

  return Math.max(1, totalLines);
}

function isTitleLike(fontSize: number, fontWeight: string, text: string) {
  return fontSize >= 18 || (fontWeight === "FontWeight.Bold" && text.length <= 80);
}

function resizeSingleLineControl(component: Record<string, any>, options: {
  text: string;
  fontSize: number;
  fontWeight: string;
  italic?: boolean;
  horizontalPadding: number;
  verticalPadding: number;
  borderThickness: number;
  minimumHeight: number;
  iconWidth?: number;
  iconGap?: number;
  safetyWidth?: number;
}) {
  const currentWidth = readNumber(component, "Width", 0);
  const currentHeight = readNumber(component, "Height", 0);
  const lineHeightPx = resolveLineHeightPx(component, options.fontSize, BUTTON_LINE_HEIGHT_MULTIPLIER);
  const textWidth = estimateSingleLineTextWidth(options.text, options.fontSize, options.fontWeight, options.italic);

  const desiredWidth = snapToGrid(
    textWidth +
      options.horizontalPadding +
      options.borderThickness * 2 +
      (options.iconWidth || 0) +
      (options.iconGap || 0) +
      (options.safetyWidth ?? SINGLE_LINE_SAFETY_WIDTH),
  );

  const desiredHeight = snapToGrid(
    Math.max(
      options.minimumHeight,
      Math.ceil(lineHeightPx + options.verticalPadding + options.borderThickness * 2),
    ),
  );

  component.Width = Math.max(currentWidth, desiredWidth);
  component.Height = Math.max(currentHeight, desiredHeight);
}

function resizeLabelLikeControl(component: Record<string, any>, options: {
  text: string;
  fontSize: number;
  fontWeight: string;
  italic?: boolean;
  horizontalPadding: number;
  verticalPadding: number;
  borderThickness: number;
  wrap: boolean;
  autoHeight?: boolean;
}) {
  const currentWidth = readNumber(component, "Width", 0);
  const currentHeight = readNumber(component, "Height", 0);
  const lineHeightMultiplier =
    component.type === "Label"
      ? DEFAULT_LABEL_LINE_HEIGHT_MULTIPLIER
      : BODY_LINE_HEIGHT_MULTIPLIER;
  const lineHeightPx = resolveLineHeightPx(component, options.fontSize, lineHeightMultiplier);
  const singleLineHeight = Math.ceil(lineHeightPx + options.verticalPadding + options.borderThickness * 2);
  const singleLineWidth = Math.ceil(
    estimateSingleLineTextWidth(options.text, options.fontSize, options.fontWeight, options.italic) +
      options.horizontalPadding +
      options.borderThickness * 2 +
      SINGLE_LINE_SAFETY_WIDTH,
  );
  const titleLike = isTitleLike(options.fontSize, options.fontWeight, options.text);
  const shouldFavorSingleLine =
    !options.wrap ||
    titleLike ||
    currentHeight <= singleLineHeight + GRID_SIZE ||
    options.text.length <= 36;

  if (shouldFavorSingleLine) {
    component.Width = Math.max(currentWidth, snapToGrid(singleLineWidth));
    if (!options.autoHeight) {
      component.Height = Math.max(currentHeight, snapToGrid(singleLineHeight));
    }
    return;
  }

  const availableTextWidth = getTextAreaWidth(currentWidth, options.horizontalPadding, options.borderThickness);
  const lines = estimateWrappedLineCount(
    options.text,
    availableTextWidth,
    options.fontSize,
    options.fontWeight,
    options.italic,
  );
  const desiredHeight = snapToGrid(
    Math.ceil(lines * lineHeightPx + options.verticalPadding + options.borderThickness * 2),
  );

  if (!options.autoHeight) {
    component.Height = Math.max(currentHeight, desiredHeight);
  }
}

function resizeButton(component: Record<string, any>) {
  const text = normalizeLiteralText(component.Text);
  if (!text) return;

  const fontSize = readNumber(component, "Size", 14);
  const fontWeight = readString(component, "FontWeight", "FontWeight.Semibold");
  resizeSingleLineControl(component, {
    text,
    fontSize,
    fontWeight,
    italic: readBoolean(component, "Italic", false),
    horizontalPadding: readNumber(component, "PaddingLeft", 10) + readNumber(component, "PaddingRight", 10),
    verticalPadding: readNumber(component, "PaddingTop", 5) + readNumber(component, "PaddingBottom", 5),
    borderThickness: readNumber(component, "BorderThickness", 1),
    minimumHeight: readNumber(component, "Height", 40),
  });
}

function resizeModernButton(component: Record<string, any>) {
  const layout = readString(component, "Layout", "ModernButtonLayout.TextOnly");
  const hasText = layout !== "ModernButtonLayout.IconOnly";
  const hasIcon = Boolean(readString(component, "Icon", "").trim()) && layout !== "ModernButtonLayout.TextOnly";
  const text = hasText ? normalizeLiteralText(component.Text) : "";

  if (!text && !hasIcon) return;

  const fontSize = readNumber(component, "FontSize", 14);
  const fontWeight = readString(component, "FontWeight", "FontWeight.Semibold");
  const iconWidth = hasIcon ? (hasText ? 14 : 18) : 0;
  const iconGap = hasIcon && hasText ? 8 : 0;
  const horizontalPadding = hasText ? 24 : 16;
  const verticalPadding = 12;
  const textValue = text || "";
  const currentWidth = readNumber(component, "Width", 0);
  const currentHeight = readNumber(component, "Height", 0);
  const lineHeightPx = resolveLineHeightPx(component, fontSize, BUTTON_LINE_HEIGHT_MULTIPLIER);
  const textWidth = hasText
    ? estimateSingleLineTextWidth(textValue, fontSize, fontWeight, readBoolean(component, "FontItalic", false))
    : 0;
  const desiredWidth = snapToGrid(
    textWidth + horizontalPadding + iconWidth + iconGap + SINGLE_LINE_SAFETY_WIDTH,
    hasIcon && !hasText ? 32 : GRID_SIZE,
  );
  const desiredHeight = snapToGrid(
    Math.max(32, Math.ceil(lineHeightPx + verticalPadding)),
    32,
  );

  component.Width = Math.max(currentWidth, desiredWidth);
  component.Height = Math.max(currentHeight, desiredHeight);
}

function resizeLabel(component: Record<string, any>) {
  const text = normalizeLiteralText(component.Text);
  if (!text) return;

  resizeLabelLikeControl(component, {
    text,
    fontSize: readNumber(component, "Size", 14),
    fontWeight: readString(component, "FontWeight", "FontWeight.Normal"),
    italic: readBoolean(component, "Italic", false),
    horizontalPadding: readNumber(component, "PaddingLeft", 8) + readNumber(component, "PaddingRight", 8),
    verticalPadding: readNumber(component, "PaddingTop", 4) + readNumber(component, "PaddingBottom", 4),
    borderThickness: readNumber(component, "BorderThickness", 0),
    wrap: true,
  });
}

function resizeModernText(component: Record<string, any>) {
  const text = normalizeLiteralText(component.Text);
  if (!text) return;

  resizeLabelLikeControl(component, {
    text,
    fontSize: readNumber(component, "Size", 14),
    fontWeight: readString(component, "FontWeight", "FontWeight.Normal"),
    italic: readBoolean(component, "Italic", false),
    horizontalPadding: readNumber(component, "PaddingLeft", 8) + readNumber(component, "PaddingRight", 8),
    verticalPadding: readNumber(component, "PaddingTop", 6) + readNumber(component, "PaddingBottom", 6),
    borderThickness: readNumber(component, "BorderThickness", 0),
    wrap: readBoolean(component, "Wrap", true),
    autoHeight: readBoolean(component, "AutoHeight", false),
  });
}

function resizeLink(component: Record<string, any>) {
  const text = normalizeLiteralText(component.Text);
  if (!text) return;

  resizeLabelLikeControl(component, {
    text,
    fontSize: readNumber(component, "Size", 14),
    fontWeight: readString(component, "FontWeight", "FontWeight.Normal"),
    italic: readBoolean(component, "Italic", false),
    horizontalPadding: readNumber(component, "PaddingLeft", 6) + readNumber(component, "PaddingRight", 6),
    verticalPadding: readNumber(component, "PaddingTop", 4) + readNumber(component, "PaddingBottom", 4),
    borderThickness: readNumber(component, "BorderThickness", 0),
    wrap: readBoolean(component, "Wrap", false),
    autoHeight: readBoolean(component, "AutoHeight", false),
  });
}

function pickLongestText(candidates: Array<unknown>) {
  const normalized = candidates
    .map(normalizeLiteralText)
    .filter((value): value is string => value !== null && value !== undefined);

  if (!normalized.length) return null;

  return normalized.sort((left, right) => right.length - left.length)[0];
}

function resizeTextInput(component: Record<string, any>) {
  const mode = readString(component, "Mode", "TextMode.SingleLine");
  const isMultiline = mode === "TextMode.Multiline";
  const text = pickLongestText([component.Text, component.Default, component.HintText]);
  if (!text) return;

  const fontSize = readNumber(component, "Size", 14);
  const fontWeight = readString(component, "FontWeight", "FontWeight.Normal");
  const borderThickness = readNumber(component, "BorderThickness", 1);
  const horizontalPadding = readNumber(component, "PaddingLeft", 12) + readNumber(component, "PaddingRight", 12);
  const verticalPadding = readNumber(component, "PaddingTop", 0) + readNumber(component, "PaddingBottom", 0);
  const currentWidth = readNumber(component, "Width", 0);
  const currentHeight = readNumber(component, "Height", 0);
  const lineHeightPx = resolveLineHeightPx(component, fontSize, BUTTON_LINE_HEIGHT_MULTIPLIER);
  const singleLineWidth = snapToGrid(
    estimateSingleLineTextWidth(text, fontSize, fontWeight, readBoolean(component, "Italic", false)) +
      horizontalPadding +
      borderThickness * 2 +
      SINGLE_LINE_SAFETY_WIDTH,
  );
  const singleLineHeight = snapToGrid(
    Math.max(40, Math.ceil(lineHeightPx + verticalPadding + borderThickness * 2)),
  );

  if (!isMultiline) {
    component.Width = Math.max(currentWidth, singleLineWidth);
    component.Height = Math.max(currentHeight, singleLineHeight);
    return;
  }

  const availableTextWidth = getTextAreaWidth(currentWidth, horizontalPadding, borderThickness);
  const lines = estimateWrappedLineCount(text, availableTextWidth, fontSize, fontWeight, readBoolean(component, "Italic", false));
  const desiredHeight = snapToGrid(
    Math.max(singleLineHeight, Math.ceil(lines * lineHeightPx + verticalPadding + borderThickness * 2)),
  );
  component.Height = Math.max(currentHeight, desiredHeight);
}

function resizeModernTextInput(component: Record<string, any>) {
  const text = pickLongestText([component.Text, component.Default, component.Placeholder]);
  if (!text) return;

  resizeSingleLineControl(component, {
    text,
    fontSize: readNumber(component, "Size", 14),
    fontWeight: readString(component, "FontWeight", "FontWeight.Normal"),
    italic: readBoolean(component, "Italic", false),
    horizontalPadding: readNumber(component, "PaddingLeft", 12) + readNumber(component, "PaddingRight", 12),
    verticalPadding: readNumber(component, "PaddingTop", 6) + readNumber(component, "PaddingBottom", 6),
    borderThickness: readNumber(component, "BorderThickness", 1),
    minimumHeight: Math.max(40, readNumber(component, "Height", 40)),
  });
}

function resizeNodeInPlace(node: Record<string, any>) {
  switch (node.type) {
    case "Button":
      resizeButton(node);
      break;
    case "ModernButton":
      resizeModernButton(node);
      break;
    case "Label":
      resizeLabel(node);
      break;
    case "ModernText":
      resizeModernText(node);
      break;
    case "Link":
      resizeLink(node);
      break;
    case "TextInput":
      resizeTextInput(node);
      break;
    case "ModernTextInput":
      resizeModernTextInput(node);
      break;
    default:
      break;
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (isPlainObject(child)) {
        resizeNodeInPlace(child);
      }
    }
  }

  return node;
}

export function autoSizeTextComponents<T extends Record<string, any>>(node: T): T {
  if (!isPlainObject(node)) return node;
  return resizeNodeInPlace(node) as T;
}

export function getAutoSizedComponentChanges(existingNode: Record<string, any>, incomingChanges: Record<string, any>) {
  if (!isPlainObject(existingNode) || !isPlainObject(incomingChanges)) return incomingChanges;

  const mergedNode = autoSizeTextComponents(JSON.parse(JSON.stringify({ ...existingNode, ...incomingChanges })));
  const nextChanges = { ...incomingChanges };

  if (mergedNode.Width !== undefined && mergedNode.Width !== existingNode.Width) {
    nextChanges.Width = mergedNode.Width;
  }

  if (mergedNode.Height !== undefined && mergedNode.Height !== existingNode.Height) {
    nextChanges.Height = mergedNode.Height;
  }

  if (Object.prototype.hasOwnProperty.call(incomingChanges, "children") && Array.isArray(mergedNode.children)) {
    nextChanges.children = mergedNode.children;
  }

  return nextChanges;
}
