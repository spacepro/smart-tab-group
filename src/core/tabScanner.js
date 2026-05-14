import { classifyTab } from "./tabClassifier.js";
import { getCanonicalPath, normalizeUrl } from "./urlNormalizer.js";

function extractHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export async function scanTabs() {
  const tabs = await chrome.tabs.query({});

  return tabs.map((tab) => {
    const hostname = extractHostname(tab.url);
    const normalizedUrl = normalizeUrl(tab.url);
    const classification = classifyTab({
      ...tab,
      hostname
    });

    return {
      id: tab.id,
      windowId: tab.windowId,
      title: tab.title || "",
      url: tab.url || "",
      hostname,
      normalizedUrl,
      canonicalPath: getCanonicalPath(tab.url),
      active: Boolean(tab.active),
      pinned: Boolean(tab.pinned),
      groupId: typeof tab.groupId === "number" ? tab.groupId : -1,
      category: classification.category,
      groupTitle: classification.groupTitle,
      groupColor: classification.color,
      entity: classification.entity
    };
  });
}
