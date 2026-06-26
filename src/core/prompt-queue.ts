export interface PromptQueueItem {
  id: string;
  index: number;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
}

export function createPromptQueue(prompts: string[]): PromptQueueItem[] {
  return prompts.map((prompt, index) => ({
    id: `prompt-${String(index + 1).padStart(4, '0')}`,
    index,
    prompt,
    status: 'pending'
  }));
}
