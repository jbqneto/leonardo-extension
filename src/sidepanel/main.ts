import '../sidepanel/sidepanel.css';
import { PromptRunner } from '../core/prompt-runner';
import { createPromptQueue } from '../core/prompt-queue';
import { createRunState, type RunState } from '../core/run-state';
import { sendMessageToActiveLeonardoTab } from '../messaging/message-client';
import { parsePromptFile } from '../prompts/prompt-file-parser';

const promptFileInput = document.querySelector<HTMLInputElement>('#promptFile');
const postDelayInput = document.querySelector<HTMLInputElement>('#postDelay');
const timeoutInput = document.querySelector<HTMLInputElement>('#timeout');
const dryRunButton = document.querySelector<HTMLButtonElement>('#dryRunButton');
const diagnosticsButton = document.querySelector<HTMLButtonElement>('#diagnosticsButton');
const startButton = document.querySelector<HTMLButtonElement>('#startButton');
const pauseButton = document.querySelector<HTMLButtonElement>('#pauseButton');
const resumeButton = document.querySelector<HTMLButtonElement>('#resumeButton');
const stopButton = document.querySelector<HTMLButtonElement>('#stopButton');
const statusOutput = document.querySelector<HTMLPreElement>('#statusOutput');
const logOutput = document.querySelector<HTMLPreElement>('#logOutput');
const promptPreview = document.querySelector<HTMLOListElement>('#promptPreview');
const negativePromptInput = document.querySelector<HTMLTextAreaElement>('#negativePrompt');

let currentPrompts: string[] = [];
let currentRunner: PromptRunner | null = null;
let currentRunState: RunState | null = null;

function writeStatus(message: unknown): void {
  if (!statusOutput) {
    return;
  }

  statusOutput.textContent = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
}

function writeLog(message: string): void {
  if (!logOutput) {
    return;
  }

  logOutput.textContent += `${new Date().toISOString()} - ${message}\n`;
}

async function readSelectedPromptFile(): Promise<string[]> {
  const file = promptFileInput?.files?.[0];

  if (!file) {
    throw new Error('Select a prompt file first.');
  }

  const content = await file.text();
  const parsed = parsePromptFile(content);

  if (parsed.prompts.length === 0) {
    throw new Error('Prompt file does not contain valid prompts.');
  }

  return parsed.prompts;
}

function renderPreview(prompts: string[]): void {
  if (!promptPreview) {
    return;
  }

  promptPreview.innerHTML = '';

  for (const prompt of prompts.slice(0, 5)) {
    const item = document.createElement('li');
    item.textContent = prompt;
    promptPreview.appendChild(item);
  }
}

async function handleDryRun(): Promise<void> {
  try {
    currentPrompts = await readSelectedPromptFile();
    renderPreview(currentPrompts);
    writeStatus({
      mode: 'dry-run',
      validPrompts: currentPrompts.length,
      previewCount: Math.min(currentPrompts.length, 5)
    });
  } catch (error) {
    writeStatus(error instanceof Error ? error.message : 'Unknown dry-run error.');
  }
}

async function handleDiagnostics(): Promise<void> {
  const response = await sendMessageToActiveLeonardoTab({ type: 'DIAGNOSE_PAGE' });
  writeStatus(response);
}

async function handleStart(): Promise<void> {
  try {
    if (currentPrompts.length === 0) {
      currentPrompts = await readSelectedPromptFile();
      renderPreview(currentPrompts);
    }

    const postGenerationDelayMs = Number(postDelayInput?.value ?? 70000);
    const generationTimeoutMs = Number(timeoutInput?.value ?? 180000);
    const queue = createPromptQueue(currentPrompts);
            const negativePrompt = negativePromptInput?.value?.trim() || undefined;

    currentRunState = createRunState({
      queue,
      postGenerationDelayMs,
      generationTimeoutMs,
              negativePrompt
    });

    currentRunner = new PromptRunner({
      onStateChanged: (state) => writeStatus(state),
      onLog: writeLog
    });

    await currentRunner.run(currentRunState);
  } catch (error) {
    writeStatus(error instanceof Error ? error.message : 'Unknown run error.');
  }
}

function handlePause(): void {
  currentRunner?.pause();
  writeLog('Pause requested.');
}

function handleResume(): void {
  currentRunner?.resume();
  writeLog('Resume requested.');
}

function handleStop(): void {
  currentRunner?.stop();
  writeLog('Stop requested.');
}

dryRunButton?.addEventListener('click', () => void handleDryRun());
diagnosticsButton?.addEventListener('click', () => void handleDiagnostics());
startButton?.addEventListener('click', () => void handleStart());
pauseButton?.addEventListener('click', handlePause);
resumeButton?.addEventListener('click', handleResume);
stopButton?.addEventListener('click', handleStop);

writeStatus('Idle. Select a prompt file and run Dry run first.');
