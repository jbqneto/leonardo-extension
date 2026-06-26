export interface ParsedPromptFile {
  prompts: string[];
  ignoredLines: number;
  totalLines: number;
}

export function parsePromptFile(content: string): ParsedPromptFile {
  const lines = content.split(/\r?\n/);
  const prompts: string[] = [];
  let ignoredLines = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      ignoredLines += 1;
      continue;
    }

    prompts.push(trimmedLine);
  }

  return {
    prompts,
    ignoredLines,
    totalLines: lines.length
  };
}
