import '../sidepanel/sidepanel.css';
import { PromptRunner } from '../core/prompt-runner';
import { createPromptQueue } from '../core/prompt-queue';
import { createRunState, type RunState } from '../core/run-state';
import { sendMessageToActiveLeonardoTab } from '../messaging/message-client';
import { parsePromptFile } from '../prompts/prompt-file-parser';

const configPanel = document.querySelector<HTMLElement>('#configPanel');
const promptFileInput = document.querySelector<HTMLInputElement>('#promptFile');
const promptTextArea = document.querySelector<HTMLTextAreaElement>('#promptText');
const tabFileButton = document.querySelector<HTMLButtonElement>('#tabFile');
const tabPasteButton = document.querySelector<HTMLButtonElement>('#tabPaste');
const fileInputArea = document.querySelector<HTMLElement>('#fileInputArea');
const pasteInputArea = document.querySelector<HTMLElement>('#pasteInputArea');
const postDelayInput = document.querySelector<HTMLInputElement>('#postDelay');
const timeoutInput = document.querySelector<HTMLInputElement>('#timeout');
const negativePromptInput = document.querySelector<HTMLTextAreaElement>('#negativePrompt');
const autoDownloadInput = document.querySelector<HTMLInputElement>('#autoDownload');

const dryRunButton = document.querySelector<HTMLButtonElement>('#dryRunButton');
const diagnosticsButton = document.querySelector<HTMLButtonElement>('#diagnosticsButton');
const startButton = document.querySelector<HTMLButtonElement>('#startButton');
const pauseButton = document.querySelector<HTMLButtonElement>('#pauseButton');
const resumeButton = document.querySelector<HTMLButtonElement>('#resumeButton');
const stopButton = document.querySelector<HTMLButtonElement>('#stopButton');

const progressBox = document.querySelector<HTMLElement>('#progressBox');
const counterCompleted = document.querySelector<HTMLElement>('#counterCompleted');
const counterTotal = document.querySelector<HTMLElement>('#counterTotal');
const counterRemaining = document.querySelector<HTMLElement>('#counterRemaining');
const progressBar = document.querySelector<HTMLElement>('#progressBar');
const currentPromptIndex = document.querySelector<HTMLElement>('#currentPromptIndex');
const currentPromptText = document.querySelector<HTMLElement>('#currentPromptText');

const statusSummary = document.querySelector<HTMLElement>('#statusSummary');
const statusDetails = document.querySelector<HTMLElement>('#statusDetails');
const statusOutput = document.querySelector<HTMLPreElement>('#statusOutput');
const detailsToggle = document.querySelector<HTMLButtonElement>('#detailsToggle');
const logOutput = document.querySelector<HTMLPreElement>('#logOutput');
const promptPreview = document.querySelector<HTMLOListElement>('#promptPreview');

let currentPrompts: string[] = [];
let currentRunner: PromptRunner | null = null;
let inputMode: 'file' | 'paste' = 'file';
let detailsVisible = false;

tabFileButton?.addEventListener('click', () => {
  inputMode = 'file';
  tabFileButton.classList.add('active');
  tabFileButton.setAttribute('aria-selected', 'true');
  tabPasteButton?.classList.remove('active');
  tabPasteButton?.setAttribute('aria-selected', 'false');
  fileInputArea?.classList.remove('hidden');
  pasteInputArea?.classList.add('hidden');
});

tabPasteButton?.addEventListener('click', () => {
  inputMode = 'paste';
  tabPasteButton.classList.add('active');
  tabPasteButton.setAttribute('aria-selected', 'true');
  tabFileButton?.classList.remove('active');
  tabFileButton?.setAttribute('aria-selected', 'false');
  pasteInputArea?.classList.remove('hidden');
  fileInputArea?.classList.add('hidden');
});

detailsToggle?.addEventListener('click', () => {
  detailsVisible = !detailsVisible;
  statusDetails?.classList.toggle('hidden', !detailsVisible);
  if (detailsToggle) {
    detailsToggle.textContent = detailsVisible ? 'Hide details' : 'Details';
  }
});

function writeLog(message: string): void {
  if (!logOutput) return;
  logOutput.textContent += `${new Date().toISOString()} - ${message}\n`;
}

async function getPrompts(): Promise<string[]> {
  if (inputMode === 'paste') {
    const text = promptTextArea?.value ?? '';
    const parsed = parsePromptFile(text);
    if (parsed.prompts.length === 0) {
      throw new Error('No valid prompts found. Add one prompt per line; lines starting with # are ignored.');
    }
    return parsed.prompts;
  }

  const file = promptFileInput?.files?.[0];
  if (!file) throw new Error('Select a prompt file first.');
  const content = await file.text();
  const parsed = parsePromptFile(content);
  if (parsed.prompts.length === 0) {
    throw new Error('Prompt file does not contain valid prompts.');
  }
  return parsed.prompts;
}

function renderPreview(prompts: string[]): void {
  if (!promptPreview) return;
  promptPreview.innerHTML = '';
  for (const prompt of prompts.slice(0, 5)) {
    const item = document.createElement('li');
    item.textContent = prompt;
    promptPreview.appendChild(item);
  }
}

function buildStatusSummary(state: RunState): string {
  switch (state.status) {
    case 'running':
      return `Running - prompt ${state.currentIndex + 1} of ${state.totalPrompts}`;
    case 'paused':
      return `Paused - prompt ${state.currentIndex + 1} of ${state.totalPrompts}`;
    case 'completed':
      return `Completed - all ${state.totalPrompts} prompts done`;
    case 'stopped':
      return `Stopped - ${state.completedPrompts} of ${state.totalPrompts} completed`;
    case 'error':
      return `Error on prompt ${state.currentIndex + 1}: ${state.lastError ?? 'unknown error'}`;
    default:
      return 'Idle - select prompts and press Start';
  }
}

function updateProgress(state: RunState): void {
  progressBox?.classList.toggle('hidden', state.totalPrompts === 0);

  if (counterCompleted) counterCompleted.textContent = String(state.completedPrompts);
  if (counterTotal) counterTotal.textContent = String(state.totalPrompts);
  if (counterRemaining) {
    counterRemaining.textContent = String(state.totalPrompts - state.completedPrompts);
  }

  const pct = state.totalPrompts > 0 ? (state.completedPrompts / state.totalPrompts) * 100 : 0;
  if (progressBar) progressBar.style.width = `${pct}%`;

  const isActive = state.status === 'running' || state.status === 'paused';
  const currentItem = state.queue[state.currentIndex];

  if (currentPromptIndex) {
    currentPromptIndex.textContent = isActive && currentItem
      ? `${state.currentIndex + 1}/${state.totalPrompts}`
      : '—';
  }
  if (currentPromptText) {
    currentPromptText.textContent = isActive && currentItem ? currentItem.prompt : '—';
  }
}

function updateButtons(state: RunState): void {
  const running = state.status === 'running';
  const paused = state.status === 'paused';
  const active = running || paused;

  configPanel?.classList.toggle('locked', active);
  if (dryRunButton) dryRunButton.disabled = active;
  if (startButton) startButton.disabled = active;

  if (pauseButton) {
    pauseButton.disabled = !running;
    pauseButton.classList.toggle('hidden', paused);
  }
  if (resumeButton) {
    resumeButton.disabled = !paused;
    resumeButton.classList.toggle('hidden', !paused);
  }
  if (stopButton) stopButton.disabled = !active;
}

function onStateChanged(state: RunState): void {
  if (statusSummary) {
    statusSummary.textContent = buildStatusSummary(state);
    statusSummary.dataset.status = state.status;
  }
  if (statusOutput) {
    statusOutput.textContent = JSON.stringify(state, null, 2);
  }
  updateProgress(state);
  updateButtons(state);
}

async function handleDryRun(): Promise<void> {
  try {
    currentPrompts = await getPrompts();
    renderPreview(currentPrompts);
    if (statusSummary) {
      statusSummary.textContent = `Dry run - ${currentPrompts.length} valid prompt${currentPrompts.length === 1 ? '' : 's'} found`;
      delete statusSummary.dataset.status;
    }
    if (statusOutput) {
      statusOutput.textContent = JSON.stringify(
        { mode: 'dry-run', validPrompts: currentPrompts.length, previewCount: Math.min(currentPrompts.length, 5) },
        null,
        2
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown dry-run error.';
    if (statusSummary) {
      statusSummary.textContent = msg;
      statusSummary.dataset.status = 'error';
    }
  }
}

async function handleDiagnostics(): Promise<void> {
  const response = await sendMessageToActiveLeonardoTab({ type: 'DIAGNOSE_PAGE' });
  if (statusOutput) statusOutput.textContent = JSON.stringify(response, null, 2);
  if (!detailsVisible) {
    detailsVisible = true;
    statusDetails?.classList.remove('hidden');
    if (detailsToggle) detailsToggle.textContent = 'Hide details';
  }
}

async function handleStart(): Promise<void> {
  try {
    if (currentPrompts.length === 0) {
      currentPrompts = await getPrompts();
      renderPreview(currentPrompts);
    }

    const postGenerationDelayMs = Number(postDelayInput?.value ?? 70_000);
    const generationTimeoutMs = Number(timeoutInput?.value ?? 180_000);
    const queue = createPromptQueue(currentPrompts);
    const negativePrompt = negativePromptInput?.value?.trim() || undefined;
    const autoDownload = autoDownloadInput?.checked ?? false;

    const runState = createRunState({
      queue,
      postGenerationDelayMs,
      generationTimeoutMs,
      negativePrompt,
      autoDownload
    });

    currentRunner = new PromptRunner({ onStateChanged, onLog: writeLog });
    await currentRunner.run(runState);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown run error.';
    if (statusSummary) {
      statusSummary.textContent = `Error: ${msg}`;
      statusSummary.dataset.status = 'error';
    }
    if (dryRunButton) dryRunButton.disabled = false;
    if (startButton) startButton.disabled = false;
    if (pauseButton) {
      pauseButton.disabled = true;
      pauseButton.classList.remove('hidden');
    }
    if (resumeButton) resumeButton.classList.add('hidden');
    if (stopButton) stopButton.disabled = true;
    configPanel?.classList.remove('locked');
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

if (statusSummary) statusSummary.textContent = 'Idle - select prompts and press Start';
