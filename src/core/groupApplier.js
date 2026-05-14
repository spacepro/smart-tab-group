export async function applyGroups(plans, { dryRunMode = true } = {}) {
  if (dryRunMode) {
    return {
      dryRun: true,
      applied: 0,
      planned: plans.length
    };
  }

  let applied = 0;

  for (const plan of plans) {
    if (plan.tabs.length < 2) {
      continue;
    }

    const groupId = await chrome.tabs.group({
      tabIds: plan.tabs
    });

    await chrome.tabGroups.update(groupId, {
      title: plan.title,
      color: plan.color || "grey"
    });

    applied += 1;
  }

  return {
    dryRun: false,
    applied,
    planned: plans.length
  };
}

export async function ungroupAllTabs() {
  const tabs = await chrome.tabs.query({});
  const groupedTabIds = tabs
    .filter((tab) => typeof tab.groupId === "number" && tab.groupId >= 0)
    .map((tab) => tab.id);

  if (groupedTabIds.length) {
    await chrome.tabs.ungroup(groupedTabIds);
  }

  return {
    ungrouped: groupedTabIds.length
  };
}
