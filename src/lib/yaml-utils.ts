/**
 * Converts the structured JSON output from Gemini into PowerApps YAML (pa.yaml v3.0).
 */
/**
 * Converts the structured JSON output from Gemini into PowerApps YAML (pa.yaml v3.0).
 */
export function jsonToYaml(json: any): string {
  if (!json || !json.RootNodes) return "";

  function processNode(node: any, level: number): string[] {
    const lines: string[] = [];
    const indent = "  ".repeat(level);
    const bodyIndent = "  ".repeat(level + 2);

    // Node header (always "- Name:")
    lines.push(`${indent}- ${node.Name}:`);

    // Control Type
    lines.push(`${bodyIndent}Control: ${node.Control}`);

    // Properties
    if (node.Properties) {
      lines.push(`${bodyIndent}Properties:`);
      const allProps = { ...(node.Properties || {}), ...(node.Properties.AdditionalProps || {}) };
      delete allProps.AdditionalProps;

      for (const [key, value] of Object.entries(allProps)) {
        lines.push(`${bodyIndent}  ${key}: ${value}`);
      }
    }

    // Children
    if (node.Children && node.Children.length > 0) {
      lines.push(`${bodyIndent}Children:`);
      node.Children.forEach((child: any) => {
        // Children are indented 1 level further
        lines.push(...processNode(child, level + 2));
      });
    }

    return lines;
  }

  const allLines: string[] = [];
  json.RootNodes.forEach((node: any) => {
    allLines.push(...processNode(node, 0));
  });

  return allLines.join("\n");
}
