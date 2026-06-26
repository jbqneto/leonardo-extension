chrome.runtime.onInstalled.addListener(() => {
  console.info('[Leonardo Prompt Runner] Extension installed.');
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    console.error('[Leonardo Prompt Runner] Failed to open side panel.', error);
  }
});
