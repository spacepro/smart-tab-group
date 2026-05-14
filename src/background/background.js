import { buildDuplicateReport, findExistingDuplicate } from "../core/duplicateDetector.js";
import { applyGroups, ungroupAllTabs } from "../core/groupApplier.js";
import { planGroups } from "../core/groupPlanner.js";
import { getSettings, updateSettings } from "../core/settings.js";
import { scanTabs } from "../core/tabScanner.js";
import { log, warn, error } from "../utils/logger.js";

const SCAN_RESULTS_KEY = "smartTabGroup.scanResults";
const GROUP_HISTORY_KEY = "smartTabGroup.groupHistory";
const DUPLICATE_HISTORY_KEY = "smartTabGroup.duplicateHistory";
const pendingDuplicateChecks = new Set();

chrome.runtime.onInstalled.addListener(async () => {
  await getSettings();
  log("Extension installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((err) => {
      error("Message handling failed", err);
      sendResponse({ ok: false, error: err.message });
    });

  return true;
});

chrome.tabs.onCreated.addListener((tab) => {
  scheduleDuplicateCheck(tab.id, 600);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    scheduleDuplicateCheck(tabId, changeInfo.status === "complete" ? 0 : 300);
  }

  if (changeInfo.status === "complete") {
    maybeAutoGroup(tab.windowId).catch((err) => warn("Auto group failed", err));
  }
});

async function handleMessage(message) {
  switch (message?.type) {
    case "scanTabs":
      return runFullScan();
    case "applyGrouping":
      return applyGrouping();
    case "closeDuplicates":
      return closeDuplicates();
    case "ungroupAll":
      return ungroupTabs();
    case "getSummary":
      return getSummary();
    case "getSettings":
      return { settings: await getSettings() };
    case "updateSettings":
      return { settings: await updateSettings(message.payload || {}) };
    default:
      throw new Error(`Unknown message type: ${message?.type}`);
  }
}

async function runFullScan() {
  const settings = await getSettings();
  const tabs = await scanTabs();
  const duplicateReport = buildDuplicateReport(tabs, settings.ignoredDomains);
  const groupPlans = planGroups(tabs, settings);
  const summary = buildSummary(tabs, duplicateReport, groupPlans);

  await chrome.storage.local.set({
    [SCAN_RESULTS_KEY]: {
      timestamp: Date.now(),
      tabs,
      duplicateReport,
      groupPlans,
      summary
    }
  });

  return {
    tabs,
    duplicateReport,
    groupPlans,
    summary
  };
}

async function applyGrouping() {
  const scan = await runFullScan();
  const settings = await getSettings();
  const result = await applyGroups(scan.groupPlans, settings);
  await appendHistory(GROUP_HISTORY_KEY, {
    timestamp: Date.now(),
    result,
    planCount: scan.groupPlans.length
  });
  const refreshed = await runFullScan();
  return {
    result,
    summary: refreshed.summary
  };
}

async function closeDuplicates() {
  const scan = await runFullScan();
  const duplicateIds = scan.duplicateReport.duplicateSets.flatMap((set) =>
    set.duplicates.map((tab) => tab.id)
  );

  if (duplicateIds.length) {
    await chrome.tabs.remove(duplicateIds);
  }

  await appendHistory(DUPLICATE_HISTORY_KEY, {
    timestamp: Date.now(),
    action: "bulkClose",
    tabIds: duplicateIds
  });

  return {
    closed: duplicateIds.length,
    summary: (await runFullScan()).summary
  };
}

async function ungroupTabs() {
  const result = await ungroupAllTabs();
  return {
    result,
    summary: (await runFullScan()).summary
  };
}

async function getSummary() {
  return runFullScan();
}

function scheduleDuplicateCheck(tabId, delayMs) {
  if (!tabId || pendingDuplicateChecks.has(tabId)) {
    return;
  }

  pendingDuplicateChecks.add(tabId);
  setTimeout(async () => {
    try {
      await handlePotentialDuplicate(tabId);
    } finally {
      pendingDuplicateChecks.delete(tabId);
    }
  }, delayMs);
}

async function handlePotentialDuplicate(tabId) {
  const settings = await getSettings();
  if (!settings.autoFocusDuplicates) {
    return;
  }

  let rawTab;
  try {
    rawTab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }

  if (!rawTab.url || rawTab.url === "about:blank") {
    return;
  }

  const tabs = await scanTabs();
  const candidate = tabs.find((tab) => tab.id === tabId);
  if (!candidate) {
    return;
  }

  const match = findExistingDuplicate(candidate, tabs, settings.ignoredDomains);
  if (!match) {
    return;
  }

  await chrome.tabs.update(match.id, { active: true });
  await chrome.windows.update(match.windowId, { focused: true });

  await appendHistory(DUPLICATE_HISTORY_KEY, {
    timestamp: Date.now(),
    action: "focusExisting",
    sourceTabId: candidate.id,
    targetTabId: match.id,
    url: candidate.url
  });

  if (settings.autoCloseNewDuplicate) {
    try {
      await chrome.tabs.remove(candidate.id);
    } catch (err) {
      warn("Failed to remove duplicate tab", err);
    }
  }
}

async function maybeAutoGroup(windowId) {
  const settings = await getSettings();
  if (!settings.autoGrouping || settings.dryRunMode) {
    return;
  }

  const tabs = await scanTabs();
  const windowTabs = tabs.filter((tab) => tab.windowId === windowId);
  const plans = planGroups(windowTabs, settings);
  if (!plans.length) {
    return;
  }

  await applyGroups(plans, settings);
}

function buildSummary(tabs, duplicateReport, groupPlans) {
  const currentGroups = new Set(tabs.filter((tab) => tab.groupId >= 0).map((tab) => tab.groupId));
  return {
    totalTabs: tabs.length,
    duplicateCount: duplicateReport.duplicateCount,
    suggestedGroups: groupPlans.length,
    currentGroups: currentGroups.size
  };
}

async function appendHistory(key, item) {
  const stored = await chrome.storage.local.get(key);
  const current = stored[key] || [];
  const next = [item, ...current].slice(0, 50);
  await chrome.storage.local.set({
    [key]: next
  });
}
