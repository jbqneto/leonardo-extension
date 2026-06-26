import { sendMessageToActiveLeonardoTab } from '../messaging/message-client';
import { delay } from '../utils/delay';
import { logger } from '../utils/logger';
import type { RunState } from './run-state';
import { saveRunState } from './run-state';

export interface PromptRunnerEvents {
  onStateChanged: (state: RunState) => void;
  onLog: (message: string) => void;
}

export class PromptRunner {
  private isPaused = false;
  private isStopped = false;

  constructor(private readonly events: PromptRunnerEvents) {}

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  stop(): void {
    this.isStopped = true;
  }

  async run(runState: RunState): Promise<RunState> {
    runState.status = 'running';
    await this.persist(runState);

    for (let index = runState.currentIndex; index < runState.queue.length; index += 1) {
      if (this.isStopped) {
        runState.status = 'stopped';
        await this.persist(runState);
        return runState;
      }

      while (this.isPaused) {
        runState.status = 'paused';
        await this.persist(runState);
        await delay(500);
      }

      const item = runState.queue[index];

      if (item.status === 'completed') {
        continue;
      }

      item.status = 'running';
      runState.currentIndex = index;
      await this.persist(runState);

      this.events.onLog(`Submitting prompt ${index + 1}/${runState.totalPrompts}`);

      const response = await sendMessageToActiveLeonardoTab({
        type: 'SUBMIT_PROMPT',
        payload: {
          prompt: item.prompt,
          generationTimeoutMs: runState.generationTimeoutMs,
                    negativePrompt: runState.negativePrompt
        }
      });

      if (!response.ok) {
        item.status = 'failed';
        item.error = response.error;
        runState.failedPrompts += 1;
        runState.status = 'error';
        runState.lastError = response.error;
        await this.persist(runState);
        throw new Error(response.error);
      }

      item.status = 'completed';
      runState.completedPrompts += 1;
      runState.currentIndex = index + 1;
      await this.persist(runState);

      this.events.onLog(`Generation completed. Waiting ${runState.postGenerationDelayMs}ms before next prompt.`);
      await delay(runState.postGenerationDelayMs);
    }

    runState.status = 'completed';
    await this.persist(runState);
    logger.info('Run completed.', runState);
    return runState;
  }

  private async persist(runState: RunState): Promise<void> {
    runState.updatedAt = new Date().toISOString();
    await saveRunState(runState);
    this.events.onStateChanged(runState);
  }
}
