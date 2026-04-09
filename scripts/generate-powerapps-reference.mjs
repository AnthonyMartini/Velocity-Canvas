import https from "node:https";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const workspaceRoot = process.cwd();
const schemaDir = path.join(workspaceRoot, "schemas");

const userAgent = "velocity-canvas-powerapps-reference";

const classicControlsApi =
  "https://api.github.com/repos/MicrosoftDocs/powerapps-docs/contents/powerapps-docs/maker/canvas-apps/controls?ref=main";
const modernControlsReferenceUrl =
  "https://raw.githubusercontent.com/MicrosoftDocs/powerapps-docs/main/powerapps-docs/maker/canvas-apps/controls/modern-controls/modern-controls-reference.md";
const formulaReferenceUrl =
  "https://raw.githubusercontent.com/MicrosoftDocs/power-platform/main/power-platform/power-fx/formula-reference-canvas-apps.md";

const classicPropertySections = new Set([
  "Key properties",
  "Additional properties",
  "Properties",
  "Chart key properties",
  "Additional chart properties",
  "Add picture button properties",
  "Other properties",
  "All properties",
  "Display properties",
  "Size and position",
  "Color and border",
  "Visibility",
  "Grid layout properties (child-specific)",
  "Key properties (icons and shapes)",
  "Key properties (icons only)",
]);

const modernPropertySections = new Set([
  "General",
  "Behavior",
  "Size and position",
  "Style and theme",
  "Additional properties",
  "Data",
  "Validation",
  "Key properties",
]);

const nonFunctionFormulaEntries = new Map([
  ["Acceleration", "signal"],
  ["App", "object"],
  ["As", "operator"],
  ["Color", "enumeration"],
  ["Compass", "signal"],
  ["Connection", "signal"],
  ["Host", "object"],
  ["Location", "signal"],
  ["Parent", "operator"],
  ["Self", "operator"],
  ["ThisItem", "operator"],
  ["ThisRecord", "operator"],
  ["exactin", "operator"],
  ["in", "operator"],
]);

function fetchText(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { "User-Agent": userAgent, ...extraHeaders } },
      (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Request failed for ${url}: ${response.statusCode}`));
          response.resume();
          return;
        }

        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve(body));
      },
    );

    request.on("error", reject);
  });
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

function parseFrontMatter(markdown) {
  if (!markdown.startsWith("---")) {
    return { frontMatter: {}, body: markdown };
  }

  const lines = markdown.split(/\r?\n/);
  const frontMatter = {};
  let index = 1;

  while (index < lines.length) {
    const line = lines[index];
    if (line === "---") {
      index += 1;
      break;
    }

    const match = line.match(/^([A-Za-z0-9._-]+):\s*(.*)$/);
    if (match) {
      const [, key, rawValue] = match;
      if (rawValue) {
        frontMatter[key] = rawValue.trim();
      }
    }

    index += 1;
  }

  return {
    frontMatter,
    body: lines.slice(index).join("\n"),
  };
}

function cleanMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/&pi;/g, "pi")
    .replace(/<a id="[^"]+"><\/a>\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toLearnUrlFromDocsPath(repoPath) {
  if (repoPath.startsWith("powerapps-docs/")) {
    return `https://learn.microsoft.com/en-us/power-apps/${repoPath
      .replace(/^powerapps-docs\//, "")
      .replace(/\.md$/, "")}`;
  }

  if (repoPath.startsWith("power-platform/")) {
    return `https://learn.microsoft.com/en-us/power-platform/${repoPath
      .replace(/^power-platform\//, "")
      .replace(/\.md$/, "")}`;
  }

  throw new Error(`Unsupported docs path: ${repoPath}`);
}

function resolveLearnUrl(baseLearnUrl, link) {
  if (!link) {
    return null;
  }

  if (link.startsWith("http://") || link.startsWith("https://")) {
    return link;
  }

  if (link.startsWith("/")) {
    return `https://learn.microsoft.com/en-us${link.replace(/\.md(?=#|$)/, "")}`;
  }

  const baseUrl = baseLearnUrl.endsWith("/") ? baseLearnUrl : `${baseLearnUrl}.md`;
  const resolved = new URL(link, baseUrl);
  return resolved.href.replace(/\.md(?=#|$)/, "");
}

function firstParagraph(body) {
  const lines = body.split(/\r?\n/);
  let seenHeading = false;
  const paragraph = [];

  for (const line of lines) {
    if (!seenHeading) {
      if (line.startsWith("# ")) {
        seenHeading = true;
      }
      continue;
    }

    if (!line.trim()) {
      if (paragraph.length) {
        break;
      }
      continue;
    }

    if (/^(#|>|##)/.test(line)) {
      if (paragraph.length) {
        break;
      }
      continue;
    }

    paragraph.push(line.trim());
  }

  return cleanMarkdown(paragraph.join(" "));
}

function normalizeControlName(title) {
  return title
    .replace(/\s+in Power Apps$/i, "")
    .replace(/\s+in canvas apps$/i, "")
    .replace(/\s+\((preview|experimental|retired)\)$/i, "")
    .replace(/\s+modern control$/i, "")
    .replace(/\s+controls?$/i, "")
    .trim();
}

function detectAvailability(title, body, fallbackPreview = false) {
  if (/\(retired\)/i.test(title)) {
    return "retired";
  }

  if (/\(experimental\)/i.test(title)) {
    return "experimental";
  }

  if (fallbackPreview || /\(preview\)/i.test(title) || /\[This article is a pre-release document/i.test(body)) {
    return "preview";
  }

  return "current";
}

function parseMarkdownLink(rawValue) {
  const linkMatch = rawValue.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (!linkMatch) {
    return {
      text: cleanMarkdown(rawValue),
      docUrl: null,
    };
  }

  return {
    text: cleanMarkdown(linkMatch[1]),
    docUrl: linkMatch[2],
  };
}

function parsePropertyLine(line, currentGroup, baseLearnUrl) {
  const match = line.match(/^(\s*)(?:[-*]\s+)?\*\*(.+?)\*\*(?:\s*[–-]\s*(.+))?$/);
  if (!match) {
    return null;
  }

  const [, indent, rawName, rawDescription = ""] = match;
  const { text: nameText, docUrl } = parseMarkdownLink(rawName);
  const name = indent.length >= 2 && currentGroup ? `${currentGroup} ${nameText}` : nameText;
  const description = cleanMarkdown(rawDescription);

  return {
    indent: indent.length,
    name,
    description,
    propertyDocUrl: docUrl ? resolveLearnUrl(baseLearnUrl, docUrl) : null,
    isGroup: !description,
  };
}

function dedupeProperties(properties) {
  const byName = new Map();

  for (const property of properties) {
    const key = property.name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, { ...property, sections: [property.section] });
      continue;
    }

    const existing = byName.get(key);
    if (!existing.sections.includes(property.section)) {
      existing.sections.push(property.section);
    }
    if (!existing.description && property.description) {
      existing.description = property.description;
    }
    if (!existing.propertyDocUrl && property.propertyDocUrl) {
      existing.propertyDocUrl = property.propertyDocUrl;
    }
  }

  return [...byName.values()]
    .map(({ sections, ...property }) => ({
      ...property,
      sections,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function extractProperties(body, baseLearnUrl, allowedSections) {
  const lines = body.split(/\r?\n/);
  const properties = [];
  let currentSection = null;
  let currentGroup = null;

  for (const line of lines) {
    const sectionMatch = line.match(/^## (.+)$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim();
      currentSection = allowedSections.has(sectionName) ? sectionName : null;
      currentGroup = null;
      continue;
    }

    if (!currentSection) {
      continue;
    }

    const property = parsePropertyLine(line, currentGroup, baseLearnUrl);
    if (!property) {
      continue;
    }

    if (property.isGroup) {
      currentGroup = property.name;
      continue;
    }

    if (property.indent < 2) {
      currentGroup = null;
    }

    properties.push({
      name: property.name,
      description: property.description,
      propertyDocUrl: property.propertyDocUrl,
      section: currentSection,
    });
  }

  return dedupeProperties(properties);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getClassicControls() {
  const files = await fetchJson(classicControlsApi);
  const targets = files
    .filter((file) => file.type === "file" && /^control-.*\.md$/.test(file.name))
    .sort((left, right) => left.name.localeCompare(right.name));

  const controls = [];

  for (const file of targets) {
    const markdown = await fetchText(file.download_url);
    const { frontMatter, body } = parseFrontMatter(markdown);
    const learnUrl = toLearnUrlFromDocsPath(file.path);
    const title = frontMatter.title || body.match(/^#\s+(.+)$/m)?.[1] || file.name;
    const normalizedName = normalizeControlName(title);
    const availability = detectAvailability(title, body);

    controls.push({
      id: slugify(`classic-${normalizedName}`),
      name: normalizedName,
      variant: "classic",
      availability,
      preview: availability === "preview",
      summary: firstParagraph(body),
      source: {
        repo: "MicrosoftDocs/powerapps-docs",
        repoPath: file.path,
        rawUrl: file.download_url,
        learnUrl,
        docLastUpdated: frontMatter["ms.date"] || null,
      },
      properties: extractProperties(body, learnUrl, classicPropertySections),
    });
  }

  return controls;
}

async function getModernControlTargets() {
  const markdown = await fetchText(modernControlsReferenceUrl);
  const matches = [
    ...markdown.matchAll(/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*[–-]\s*([^\n]+)/g),
  ];

  return matches.map((match) => ({
    name: cleanMarkdown(match[1]),
    relativePath: `powerapps-docs/maker/canvas-apps/controls/modern-controls/${match[2]}`,
    summary: cleanMarkdown(match[3]),
  }));
}

async function getModernControls() {
  const targets = await getModernControlTargets();
  const controls = [];

  for (const target of targets) {
    const rawUrl = `https://raw.githubusercontent.com/MicrosoftDocs/powerapps-docs/main/${target.relativePath}`;
    const markdown = await fetchText(rawUrl);
    const { frontMatter, body } = parseFrontMatter(markdown);
    const learnUrl = toLearnUrlFromDocsPath(target.relativePath);
    const title = frontMatter.title || body.match(/^#\s+(.+)$/m)?.[1] || target.name;
    const normalizedName = normalizeControlName(target.name || title);
    const availability = detectAvailability(title, body, /\(preview\)/i.test(target.name));

    controls.push({
      id: slugify(`modern-${normalizedName}`),
      name: normalizedName,
      variant: "modern",
      availability,
      preview: availability === "preview",
      summary: target.summary || firstParagraph(body),
      source: {
        repo: "MicrosoftDocs/powerapps-docs",
        repoPath: target.relativePath,
        rawUrl,
        learnUrl,
        docLastUpdated: frontMatter["ms.date"] || null,
      },
      properties: extractProperties(body, learnUrl, modernPropertySections),
    });
  }

  return controls.sort((left, right) => left.name.localeCompare(right.name));
}

function classifyFormulaEntry(name) {
  return nonFunctionFormulaEntries.get(name) || "function";
}

async function getFormulaFunctions() {
  const markdown = await fetchText(formulaReferenceUrl);
  const { frontMatter, body } = parseFrontMatter(markdown);
  const repoPath = "power-platform/power-fx/formula-reference-canvas-apps.md";
  const learnUrl = toLearnUrlFromDocsPath(repoPath);
  const lines = body.split(/\r?\n/);
  const functions = [];
  const excludedEntries = [];
  let currentCategory = null;

  for (const line of lines) {
    const categoryMatch = line.match(/^## (?:<a id="[^"]+"><\/a>\s*)?(.+)$/);
    if (categoryMatch) {
      currentCategory = cleanMarkdown(categoryMatch[1]);
      continue;
    }

    const entryMatch = line.match(/^\*\*\[([^\]]+)\]\(([^)]+)\)\*\*\s*[–-]\s*(.+)$/);
    if (!entryMatch || !currentCategory) {
      continue;
    }

    const [, rawName, docLink, rawDescription] = entryMatch;
    const name = cleanMarkdown(rawName);
    const entryType = classifyFormulaEntry(name);
    const entry = {
      name,
      category: currentCategory,
      description: cleanMarkdown(rawDescription),
      docUrl: resolveLearnUrl(learnUrl, docLink),
    };

    if (entryType === "function") {
      functions.push(entry);
    } else {
      excludedEntries.push({ ...entry, entryType });
    }
  }

  return {
    meta: {
      repo: "MicrosoftDocs/power-platform",
      repoPath,
      rawUrl: formulaReferenceUrl,
      learnUrl,
      docLastUpdated: frontMatter["ms.date"] || null,
    },
    functions: functions.sort((left, right) => left.name.localeCompare(right.name)),
    excludedEntries: excludedEntries.sort((left, right) => left.name.localeCompare(right.name)),
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const classicControlsRaw = await getClassicControls();
  const modernControls = await getModernControls();
  const formulaData = await getFormulaFunctions();
  const retiredControls = classicControlsRaw.filter((control) => control.availability === "retired");
  const classicControls = classicControlsRaw.filter((control) => control.availability !== "retired");

  const controls = [...classicControls, ...modernControls].sort((left, right) => {
    if (left.variant !== right.variant) {
      return left.variant.localeCompare(right.variant);
    }
    return left.name.localeCompare(right.name);
  });

  const controlsPayload = {
    generatedAt,
    scope:
      "Built-in Power Apps canvas controls only, sourced from official Microsoft Power Apps canvas control documentation. This excludes Power Automate content and user-authored custom components.",
    sources: {
      classicControlsApi,
      modernControlsReferenceUrl,
      repos: ["MicrosoftDocs/powerapps-docs"],
    },
    counts: {
      totalControls: controls.length,
      classicControls: classicControls.length,
      modernControls: modernControls.length,
      excludedRetiredControls: retiredControls.length,
      totalProperties: controls.reduce((sum, control) => sum + control.properties.length, 0),
    },
    excludedRetiredControls: retiredControls.map((control) => ({
      id: control.id,
      name: control.name,
      variant: control.variant,
      source: control.source,
    })),
    controls,
  };

  const formulaPayload = {
    generatedAt,
    scope:
      "Power Apps canvas formula functions only, sourced from the official canvas-app-specific Power Fx formula reference. Power Automate expressions and non-function canvas formula elements are excluded from the functions array.",
    source: formulaData.meta,
    counts: {
      totalFunctions: formulaData.functions.length,
      excludedNonFunctionEntries: formulaData.excludedEntries.length,
    },
    excludedNonFunctionEntries: formulaData.excludedEntries,
    functions: formulaData.functions,
  };

  await mkdir(schemaDir, { recursive: true });
  await writeFile(
    path.join(schemaDir, "powerapps_controls_reference.json"),
    `${JSON.stringify(controlsPayload, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(schemaDir, "powerapps_formula_functions.json"),
    `${JSON.stringify(formulaPayload, null, 2)}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        controlsFile: path.join(schemaDir, "powerapps_controls_reference.json"),
        formulaFunctionsFile: path.join(schemaDir, "powerapps_formula_functions.json"),
        counts: {
          controls: controlsPayload.counts,
          formulaFunctions: formulaPayload.counts,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
