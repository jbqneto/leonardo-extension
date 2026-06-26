import type { ExtensionMessage, ExtensionResponse } from './extension-messages';

export async function getActiveLeonardoTab(): Promise<chrome.tabs.Tab | null> {
  const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const activeTab =
    activeTabs.find((tab) => isLeonardoTab(tab)) ??
    (await chrome.tabs.query({ active: true, currentWindow: true })).find((tab) => isLeonardoTab(tab));

  if (activeTab) {
    return activeTab;
  }

  const leonardoTabs = await chrome.tabs.query({ url: ['https://*.leonardo.ai/*'] });
  return leonardoTabs.find((tab) => tab.active) ?? leonardoTabs[0] ?? null;
}

export async function sendMessageToActiveLeonardoTab(
  message: ExtensionMessage
): Promise<ExtensionResponse> {
  const tab = await getActiveLeonardoTab();

  if (!tab?.id) {
    return {
      ok: false,
      error: 'No active Leonardo.ai tab found. Open Leonardo.ai and try again.'
    };
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    try {
      await injectLeonardoContentScript(tab.id);
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (retryError) {
      return {
        ok: false,
        error:
          'Failed to communicate with the Leonardo.ai content script. Reload the Leonardo.ai tab, then click Diagnostics.',
        details: {
          firstError: getErrorMessage(error),
          retryError: getErrorMessage(retryError)
        }
      };
    }
  }
}

function isLeonardoTab(tab: chrome.tabs.Tab): boolean {
  return Boolean(tab.id && tab.url?.includes('leonardo.ai'));
}

async function injectLeonardoContentScript(tabId: number): Promise<void> {
  if (!chrome.scripting?.executeScript) {
    throw new Error('chrome.scripting.executeScript is not available.');
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['assets/leonardo-content-script.js']
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}
