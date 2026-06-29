import type { ExtensionMessage, ExtensionResponse } from '../messaging/extension-messages';
import { LeonardoDomAdapter } from './leonardo-dom-adapter';

const adapter = new LeonardoDomAdapter();
const contentLogger = {
  info(message: string, data?: unknown): void {
    console.info(`[Leonardo Prompt Runner] ${message}`, data ?? '');
  },

  error(message: string, data?: unknown): void {
    console.error(`[Leonardo Prompt Runner] ${message}`, data ?? '');
  }
};

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      contentLogger.error('Content script error.', error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown content script error.',
        details: error
      });
    });

  return true;
});

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.type) {
    case 'PING':
      return { ok: true, message: 'pong' };

    case 'DIAGNOSE_PAGE':
      return {
        ok: true,
        pageState: adapter.getPageState()
      };

    case 'SUBMIT_PROMPT':
      await adapter.submitPrompt(message.payload);
      return { ok: true, message: 'Prompt submitted and generation completed.' };

    case 'PAUSE_RUN':
      return { ok: true, message: 'Pause is controlled by the side panel runner.' };

    case 'STOP_RUN':
      return { ok: true, message: 'Stop is controlled by the side panel runner.' };

    default:
      return { ok: false, error: 'Unsupported message type.' };
  }
}

contentLogger.info('Content script loaded.');
