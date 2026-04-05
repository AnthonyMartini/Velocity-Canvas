export const SAMPLE_TEXT = {
  short: "Lorem ipsum dolor sit amet.",
  medium: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  long: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
};

/**
 * Replaces shorthand tokens with full sample text.
 * [sample-short]  ~5 words
 * [sample-medium] ~25 words
 * [sample-long]   ~75 words
 */
export function resolveSampleText(text: any): any {
  if (typeof text !== 'string') return text;
  
  return text
    .replace(/\[sample-short\]/g, SAMPLE_TEXT.short)
    .replace(/\[sample-medium\]/g, SAMPLE_TEXT.medium)
    .replace(/\[sample-long\]/g, SAMPLE_TEXT.long);
}
