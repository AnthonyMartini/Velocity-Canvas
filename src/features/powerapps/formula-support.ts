export const EXPORT_SAFE_PREVIEW_LIMITED_FUNCTIONS = [
  "Collect",
  "ClearCollect",
  "Patch",
] as const;

const EXPORT_SAFE_PREVIEW_LIMITED_FUNCTION_SET = new Set(
  EXPORT_SAFE_PREVIEW_LIMITED_FUNCTIONS.map((name) => normalizePowerAppsFunctionName(name)),
);

export function normalizePowerAppsFunctionName(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function isExportSafePreviewLimitedFunction(value: unknown) {
  return EXPORT_SAFE_PREVIEW_LIMITED_FUNCTION_SET.has(normalizePowerAppsFunctionName(value));
}
