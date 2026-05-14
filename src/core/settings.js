const STORAGE_KEY = "smartTabGroup.settings";

export const DEFAULT_SETTINGS = {
  autoFocusDuplicates: true,
  autoCloseNewDuplicate: false,
  autoGrouping: false,
  dryRunMode: true,
  ignoredDomains: []
};

export async function getSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(stored[STORAGE_KEY] || {})
  };
}

export async function updateSettings(partial) {
  const next = {
    ...(await getSettings()),
    ...partial
  };
  await chrome.storage.local.set({
    [STORAGE_KEY]: next
  });
  return next;
}
