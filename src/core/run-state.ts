import type { GenerationStatus } from './generation-status';
import type { PromptQueueItem } from './prompt-queue';

export interface RunState {
  id: string;
  status: GenerationStatus;
  createdAt: string;
  updatedAt: string;
  currentIndex: number;
  totalPrompts: number;
  completedPrompts: number;
  failedPrompts: number;
  postGenerationDelayMs: number;
  generationTimeoutMs: number;
  negativePrompt?: string;
  autoDownload?: boolean;
  queue: PromptQueueItem[];
  lastError?: string;
}

const STORAGE_KEY = 'leonardoPromptRunner.runState';

export async function saveRunState(runState: RunState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: runState });
}

export async function loadRunState(): Promise<RunState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as RunState | undefined) ?? null;
}

export async function clearRunState(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

export function createRunState(params: {
  queue: PromptQueueItem[];
  postGenerationDelayMs: number;
  generationTimeoutMs: number;
  negativePrompt?: string;
  autoDownload?: boolean;
}): RunState {
  const now = new Date().toISOString();

  return {
    id: `run-${Date.now()}`,
    status: 'idle',
    createdAt: now,
    updatedAt: now,
    currentIndex: 0,
    totalPrompts: params.queue.length,
    completedPrompts: 0,
    failedPrompts: 0,
    postGenerationDelayMs: params.postGenerationDelayMs,
    generationTimeoutMs: params.generationTimeoutMs,
    negativePrompt: params.negativePrompt,
    autoDownload: params.autoDownload,
    queue: params.queue,
  };
}
