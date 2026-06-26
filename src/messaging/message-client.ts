import type { ExtensionMessage, ExtensionResponse } from './extension-messages';

export async function getActiveLeonardoTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab?.id || !activeTab.url) {
    return null;
  }

  if (!activeTab.url.includes('leonardo.ai')) {
    return null;
  }

  return activeTab;
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
    return {
      ok: false,
      error: 'Failed to communicate with the Leonardo.ai content script. Reload the page and extension.',
      details: error
    };
  }
}
