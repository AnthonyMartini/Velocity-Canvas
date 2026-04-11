export const formatK = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }

  return num.toString();
};

export const getPromptTokens = (log: any) => Number(log.promptTokens ?? log.inputTokens ?? 0);
export const getToolUsePromptTokens = (log: any) => Number(log.toolUsePromptTokens ?? 0);
export const getInputTokens = (log: any) => Number(log.inputTokens ?? (getPromptTokens(log) + getToolUsePromptTokens(log)));
export const getCandidateTokens = (log: any) => Number(log.candidateTokens ?? log.outputTokens ?? 0);
export const getThoughtsTokens = (log: any) => Number(log.thoughtsTokens ?? 0);
export const getOutputTokens = (log: any) => Number(log.outputTokens ?? (getCandidateTokens(log) + getThoughtsTokens(log)));
export const getCachedTokens = (log: any) => Number(log.cachedTokens ?? 0);
export const getTotalTokens = (log: any) => Number(log.totalTokens ?? (getInputTokens(log) + getOutputTokens(log)));
