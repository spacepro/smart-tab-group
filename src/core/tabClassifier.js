const HOST_PRESETS = [
  { match: ["github.com"], category: "github", title: "GitHub", color: "blue" },
  { match: ["gitlab.com"], category: "gitlab", title: "GitLab", color: "blue" },
  { match: ["jira.", ".atlassian.net"], category: "jira", title: "Jira", color: "orange" },
  { match: ["confluence.", "wiki."], category: "wiki", title: "Wiki", color: "cyan" },
  { match: ["mail.google.com", "outlook.office.com", "mail."], category: "mail", title: "Mail", color: "green" },
  { match: ["calendar.google.com"], category: "calendar", title: "Calendar", color: "green" },
  { match: ["docs.google.com", "developer.", "docs."], category: "docs", title: "Docs", color: "cyan" },
  { match: ["youtube.com"], category: "video", title: "YouTube", color: "red" },
  { match: ["amazon.", "shopping.", "store."], category: "shopping", title: "Shopping", color: "yellow" },
  { match: ["x.com", "twitter.com", "linkedin.com", "facebook.com", "instagram.com"], category: "social", title: "Social", color: "pink" },
  { match: ["google.com/search", "bing.com/search", "duckduckgo.com"], category: "search", title: "Search", color: "grey" },
  { match: ["news."], category: "news", title: "News", color: "yellow" },
  { match: ["aws.amazon.com", "console.aws.amazon.com", "portal.azure.com", "console.cloud.google.com"], category: "cloud", title: "Cloud", color: "purple" },
  { match: ["chat.openai.com", "claude.ai", "gemini.google.com", "perplexity.ai"], category: "ai", title: "AI Tools", color: "purple" }
];

const KEYWORD_CATEGORIES = [
  { pattern: /\b(log|grafana|kibana|datadog|dashboard|metrics)\b/i, category: "logs", title: "Logs & Dashboards", color: "grey" },
  { pattern: /\b(pull request|merge request|repo|repository)\b/i, category: "oss", title: "OSS", color: "blue" },
  { pattern: /\b(chat|slack|discord|teams)\b/i, category: "chat", title: "Chat", color: "green" },
  { pattern: /\b(stock|price|portfolio|trading|finance)\b/i, category: "finance", title: "Finance", color: "green" },
  { pattern: /\b(devtools|inspect|localhost|127\.0\.0\.1)\b/i, category: "devtools", title: "Dev Tools", color: "grey" },
  { pattern: /\b(map|route|direction)\b/i, category: "unknown", title: "Maps", color: "cyan" }
];

export function extractEntityInfo(tab) {
  const url = tab.url || "";
  const title = tab.title || "";
  const jiraMatch = url.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
  if (jiraMatch) {
    return { type: "jiraIssue", id: jiraMatch[1], label: `Jira ${jiraMatch[1].split("-")[0]}` };
  }

  const githubPrMatch = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/i);
  if (githubPrMatch) {
    return { type: "githubPr", id: githubPrMatch[0], label: `${githubPrMatch[1]} PRs` };
  }

  const githubIssueMatch = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/issues\/(\d+)/i);
  if (githubIssueMatch) {
    return { type: "githubIssue", id: githubIssueMatch[0], label: `${githubIssueMatch[1]} Issues` };
  }

  const gitlabMrMatch = url.match(/\/merge_requests\/(\d+)/i);
  if (gitlabMrMatch) {
    return { type: "gitlabMr", id: gitlabMrMatch[0], label: "GitLab MRs" };
  }

  const docsMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) {
    return { type: "document", id: docsMatch[1], label: "Docs" };
  }

  const idMatch = url.match(/[?&](id|docId|issue|ticket|dashboard)=([^&#]+)/i);
  if (idMatch) {
    return { type: "entity", id: `${idMatch[1]}:${idMatch[2]}`, label: title.split("|")[0].trim() || "Entity" };
  }

  return null;
}

export function classifyTab(tab) {
  const url = tab.url || "";
  const hostname = tab.hostname || "";
  const haystack = `${hostname} ${url} ${tab.title || ""}`.toLowerCase();
  const entity = extractEntityInfo(tab);

  for (const preset of HOST_PRESETS) {
    if (preset.match.some((fragment) => haystack.includes(fragment.toLowerCase()))) {
      return {
        category: preset.category,
        groupTitle: entity?.label || preset.title,
        color: preset.color,
        entity
      };
    }
  }

  for (const preset of KEYWORD_CATEGORIES) {
    if (preset.pattern.test(haystack)) {
      return {
        category: preset.category,
        groupTitle: entity?.label || preset.title,
        color: preset.color,
        entity
      };
    }
  }

  if (entity) {
    return {
      category: entity.type,
      groupTitle: entity.label,
      color: "blue",
      entity
    };
  }

  return {
    category: "unknown",
    groupTitle: humanizeHostname(hostname) || "Workspace",
    color: "grey",
    entity: null
  };
}

export function humanizeHostname(hostname) {
  if (!hostname) {
    return "";
  }

  const stripped = hostname
    .replace(/^www\./, "")
    .replace(/\.(com|net|org|io|dev|app|co|ai)$/i, "");

  return stripped
    .split(".")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
