import { humanizeHostname } from "./tabClassifier.js";

export function planGroups(tabs, settings = {}) {
  const ignoredDomains = settings.ignoredDomains || [];
  const buckets = new Map();

  for (const tab of tabs) {
    if (!isGroupable(tab, ignoredDomains)) {
      continue;
    }

    const bucketKey = getBucketKey(tab);
    if (!bucketKey) {
      continue;
    }

    const item = buckets.get(bucketKey) || {
      key: bucketKey,
      windowId: tab.windowId,
      title: getBucketTitle(tab),
      color: tab.groupColor || "grey",
      tabs: []
    };

    item.tabs.push(tab.id);
    buckets.set(bucketKey, item);
  }

  return [...buckets.values()]
    .filter((bucket) => bucket.tabs.length >= 2)
    .sort((a, b) => b.tabs.length - a.tabs.length);
}

function isGroupable(tab, ignoredDomains) {
  if (!tab.id || tab.pinned || !tab.url || ignoredDomains.includes(tab.hostname)) {
    return false;
  }

  return /^https?:|^file:/i.test(tab.url);
}

function getBucketKey(tab) {
  if (tab.entity?.id) {
    return `${tab.windowId}:entity:${tab.entity.id}`;
  }

  if (tab.category && tab.category !== "unknown") {
    return `${tab.windowId}:category:${tab.category}:${tab.groupTitle}`;
  }

  if (tab.hostname) {
    return `${tab.windowId}:host:${tab.hostname}`;
  }

  return null;
}

function getBucketTitle(tab) {
  if (tab.groupTitle && tab.groupTitle !== "Workspace") {
    return tab.groupTitle;
  }

  return humanizeHostname(tab.hostname) || "Workspace";
}
