const summaryIds = ["totalTabs", "duplicateCount", "suggestedGroups", "currentGroups"];

document.addEventListener("DOMContentLoaded", async () => {
  bindAction("scanTabs", "scanTabs", "Scan completed.");
  bindAction("applyGrouping", "applyGrouping", "Grouping request completed.");
  bindAction("ungroupAll", "ungroupAll", "Ungrouped current tab groups.");
  bindAction("closeDuplicates", "closeDuplicates", "Duplicate tabs closed.");
  document.getElementById("saveSettings").addEventListener("click", saveSettings);

  await loadSettings();
  await refreshSummary();
});

function bindAction(elementId, messageType, successText) {
  document.getElementById(elementId).addEventListener("click", async () => {
    setStatus("Working...");
    const response = await sendMessage({ type: messageType });
    if (!response.ok) {
      setStatus(response.error || "Action failed.");
      return;
    }

    if (response.summary) {
      renderSummary(response.summary);
    } else {
      await refreshSummary();
    }

    if (messageType === "closeDuplicates") {
      setStatus(`Closed ${response.closed || 0} duplicate tabs.`);
      return;
    }

    if (messageType === "applyGrouping") {
      const result = response.result || {};
      const suffix = result.dryRun ? `Dry run: ${result.planned} groups planned.` : `${result.applied} groups applied.`;
      setStatus(suffix);
      return;
    }

    setStatus(successText);
  });
}

async function refreshSummary() {
  const response = await sendMessage({ type: "getSummary" });
  if (response.ok && response.summary) {
    renderSummary(response.summary);
  }
}

async function loadSettings() {
  const response = await sendMessage({ type: "getSettings" });
  if (!response.ok) {
    setStatus(response.error || "Failed to load settings.");
    return;
  }

  const settings = response.settings;
  document.getElementById("autoFocusDuplicates").checked = settings.autoFocusDuplicates;
  document.getElementById("autoCloseNewDuplicate").checked = settings.autoCloseNewDuplicate;
  document.getElementById("autoGrouping").checked = settings.autoGrouping;
  document.getElementById("dryRunMode").checked = settings.dryRunMode;
  document.getElementById("ignoredDomains").value = (settings.ignoredDomains || []).join("\n");
}

async function saveSettings() {
  const ignoredDomains = document.getElementById("ignoredDomains").value
    .split("\n")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const payload = {
    autoFocusDuplicates: document.getElementById("autoFocusDuplicates").checked,
    autoCloseNewDuplicate: document.getElementById("autoCloseNewDuplicate").checked,
    autoGrouping: document.getElementById("autoGrouping").checked,
    dryRunMode: document.getElementById("dryRunMode").checked,
    ignoredDomains
  };

  const response = await sendMessage({
    type: "updateSettings",
    payload
  });

  setStatus(response.ok ? "Settings saved." : response.error || "Failed to save settings.");
}

function renderSummary(summary) {
  for (const id of summaryIds) {
    document.getElementById(id).textContent = String(summary[id] || 0);
  }
}

function setStatus(message) {
  document.getElementById("actionStatus").textContent = message;
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}
