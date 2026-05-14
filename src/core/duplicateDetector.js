export function buildDuplicateReport(tabs, ignoredDomains = []) {
  const exactByUrl = new Map();
  const entityById = new Map();
  const canonicalByPath = new Map();
  const duplicateSets = [];
  const seenKeys = new Set();

  for (const tab of tabs) {
    if (!shouldConsider(tab, ignoredDomains)) {
      continue;
    }

    addToMap(exactByUrl, tab.normalizedUrl, tab);
    addToMap(entityById, tab.entity?.id, tab);
    addToMap(canonicalByPath, tab.canonicalPath, tab);
  }

  for (const [reason, map] of [
    ["normalizedUrl", exactByUrl],
    ["entity", entityById],
    ["canonicalPath", canonicalByPath]
  ]) {
    for (const [, groupedTabs] of map.entries()) {
      if (groupedTabs.length < 2) {
        continue;
      }

      const sorted = sortTabs(groupedTabs);
      const signature = sorted.map((tab) => tab.id).join(":");
      if (seenKeys.has(signature)) {
        continue;
      }

      seenKeys.add(signature);
      duplicateSets.push({
        reason,
        keep: sorted[0],
        duplicates: sorted.slice(1)
      });
    }
  }

  return {
    duplicateSets,
    duplicateCount: duplicateSets.reduce((sum, item) => sum + item.duplicates.length, 0)
  };
}

export function findExistingDuplicate(candidateTab, tabs, ignoredDomains = []) {
  if (!shouldConsider(candidateTab, ignoredDomains)) {
    return null;
  }

  const rules = [
    (tab) => candidateTab.normalizedUrl && tab.normalizedUrl === candidateTab.normalizedUrl,
    (tab) => candidateTab.entity?.id && tab.entity?.id === candidateTab.entity.id,
    (tab) => candidateTab.canonicalPath && tab.canonicalPath === candidateTab.canonicalPath
  ];

  for (const rule of rules) {
    const match = sortTabs(
      tabs.filter((tab) => tab.id !== candidateTab.id && shouldConsider(tab, ignoredDomains) && rule(tab))
    )[0];
    if (match) {
      return match;
    }
  }

  return null;
}

function addToMap(map, key, tab) {
  if (!key) {
    return;
  }
  const current = map.get(key) || [];
  current.push(tab);
  map.set(key, current);
}

function shouldConsider(tab, ignoredDomains) {
  if (!tab || !tab.id || !tab.url || tab.url === "about:blank") {
    return false;
  }

  if (!/^https?:|^file:/i.test(tab.url)) {
    return false;
  }

  return !ignoredDomains.includes(tab.hostname);
}

function sortTabs(tabs) {
  return [...tabs].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }
    return a.id - b.id;
  });
}
