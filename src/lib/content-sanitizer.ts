const MAX_MARKUP_LENGTH = 20000;

const HTML_ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "u",
  "ul",
]);

const HTML_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "title", "rel"]),
};

const SVG_ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "title",
  "desc",
]);

const SVG_ALLOWED_ATTRS = new Set([
  "cx",
  "cy",
  "d",
  "fill",
  "fill-opacity",
  "fill-rule",
  "height",
  "opacity",
  "points",
  "r",
  "rx",
  "ry",
  "stroke",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "transform",
  "viewbox",
  "width",
  "x",
  "x1",
  "x2",
  "xmlns",
  "y",
  "y1",
  "y2",
]);

const HTML_BLOCKED_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "video",
  "audio",
  "source",
  "canvas",
];

const SVG_BLOCKED_TAGS = ["script", "foreignobject", "iframe", "object", "embed", "audio", "video", "style"];

function cleanMarkupInput(value: unknown, maxLength = MAX_MARKUP_LENGTH) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .slice(0, maxLength);
}

function stripDangerousBlocks(input: string, tags: string[]) {
  return tags.reduce((current, tag) => {
    const pairPattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    const selfClosingPattern = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    return current.replace(pairPattern, "").replace(selfClosingPattern, "");
  }, input);
}

function stripComments(input: string) {
  return input.replace(/<!--[\s\S]*?-->/g, "");
}

function parseAttributes(rawAttributes: string) {
  const attributes = [];
  const attributePattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(rawAttributes))) {
    attributes.push({
      name: match[1],
      value: match[2] ?? match[3] ?? match[4] ?? "",
    });
  }

  return attributes;
}

function normalizeUrlAttribute(attributeName: string, rawValue: string) {
  const value = rawValue.trim();
  if (!value) return null;

  const normalized = value.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
  if (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("vbscript:") ||
    normalized.startsWith("data:text/html") ||
    normalized.startsWith("file:")
  ) {
    return null;
  }

  if (normalized.startsWith("data:")) {
    return attributeName === "src" && normalized.startsWith("data:image/") ? value : null;
  }

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("mailto:") ||
    normalized.startsWith("tel:") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized.startsWith("#")
  ) {
    return value;
  }

  return normalized.includes(":") ? null : value;
}

function escapeAttributeValue(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeHtmlTag(rawTag: string, isClosingTag: string, rawAttributes: string) {
  const tag = rawTag.toLowerCase();
  if (!HTML_ALLOWED_TAGS.has(tag)) return "";
  if (isClosingTag) return `</${tag}>`;

  const allowedAttrs = HTML_ALLOWED_ATTRS[tag] || new Set<string>();
  const safeAttributes: string[] = [];
  let targetValue = "";

  for (const attribute of parseAttributes(rawAttributes)) {
    const name = attribute.name.toLowerCase();
    if (!allowedAttrs.has(name)) continue;
    if (name.startsWith("on") || name === "style" || name === "srcset") continue;

    if (name === "href") {
      const safeUrl = normalizeUrlAttribute(name, attribute.value);
      if (!safeUrl) continue;
      safeAttributes.push(`href="${escapeAttributeValue(safeUrl)}"`);
      continue;
    }

    if (name === "target") {
      const normalizedTarget = attribute.value.trim().toLowerCase();
      if (!["_blank", "_self", "_parent", "_top"].includes(normalizedTarget)) continue;
      targetValue = normalizedTarget;
      safeAttributes.push(`target="${escapeAttributeValue(normalizedTarget)}"`);
      continue;
    }

    if (name === "title") {
      safeAttributes.push(`title="${escapeAttributeValue(attribute.value.slice(0, 256))}"`);
    }
  }

  if (tag === "a") {
    const relValue = targetValue === "_blank" ? "noopener noreferrer nofollow" : "nofollow";
    safeAttributes.push(`rel="${relValue}"`);
  }

  return `<${tag}${safeAttributes.length ? ` ${safeAttributes.join(" ")}` : ""}>`;
}

function sanitizeSvgAttribute(name: string, value: string) {
  const normalizedName = name.toLowerCase();
  if (!SVG_ALLOWED_ATTRS.has(normalizedName)) return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  const compactValue = trimmedValue.replace(/[\u0000-\u001F\u007F]+/g, "");
  const normalizedValue = compactValue.replace(/\s+/g, "").toLowerCase();

  if (
    normalizedValue.startsWith("javascript:") ||
    normalizedValue.startsWith("vbscript:") ||
    normalizedValue.startsWith("data:") ||
    normalizedValue.startsWith("file:")
  ) {
    return null;
  }

  if (normalizedValue.includes("url(") && !/^url\(#[-\w]+\)$/i.test(compactValue)) {
    return null;
  }

  return `${normalizedName}="${escapeAttributeValue(compactValue.slice(0, 512))}"`;
}

function sanitizeSvgTag(rawTag: string, isClosingTag: string, rawAttributes: string) {
  const tag = rawTag.toLowerCase();
  if (!SVG_ALLOWED_TAGS.has(tag)) return "";
  if (isClosingTag) return `</${tag}>`;

  const safeAttributes = parseAttributes(rawAttributes)
    .filter((attribute) => !attribute.name.toLowerCase().startsWith("on"))
    .map((attribute) => sanitizeSvgAttribute(attribute.name, attribute.value))
    .filter(Boolean) as string[];

  return `<${tag}${safeAttributes.length ? ` ${safeAttributes.join(" ")}` : ""}>`;
}

export function sanitizeHtmlFragment(value: unknown) {
  let safeMarkup = cleanMarkupInput(value);
  safeMarkup = stripComments(safeMarkup);
  safeMarkup = stripDangerousBlocks(safeMarkup, HTML_BLOCKED_TAGS);

  return safeMarkup.replace(/<\s*(\/?)\s*([a-zA-Z0-9:-]+)([^>]*)>/g, (_match, closing, tag, attributes) =>
    sanitizeHtmlTag(tag, closing, attributes)
  );
}

export function sanitizeSvgFragment(value: unknown) {
  let safeMarkup = cleanMarkupInput(value);
  safeMarkup = stripComments(safeMarkup);
  safeMarkup = stripDangerousBlocks(safeMarkup, SVG_BLOCKED_TAGS);

  return safeMarkup.replace(/<\s*(\/?)\s*([a-zA-Z0-9:-]+)([^>]*)>/g, (_match, closing, tag, attributes) =>
    sanitizeSvgTag(tag, closing, attributes)
  );
}
