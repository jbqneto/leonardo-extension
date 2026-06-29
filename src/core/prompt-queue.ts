export interface PromptQueueItem {
    id: string;
    index: number;
    prompt: string;
    aspectRatio?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    error?: string;
}

export function createPromptQueue(prompts: string[]): PromptQueueItem[] {
    return prompts.map((rawPrompt, index) => {
          // Detecta aspect ratio inline: [AR:4:5] texto do prompt
                           const arMatch = rawPrompt.match(/^\[AR:([^\]]+)\]\s*/i);
          const aspectRatio = arMatch ? arMatch[1].trim() : undefined;
          const prompt = arMatch ? rawPrompt.replace(arMatch[0], '').trim() : rawPrompt.trim();

                           return {
                                   id: `prompt-${String(index + 1).padStart(4, '0')}`,
                                   index,
                                   prompt,
                                   aspectRatio,
                                   status: 'pending'
                           };
    });
}
