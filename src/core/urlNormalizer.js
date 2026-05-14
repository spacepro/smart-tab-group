const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src"
]);

export function normalizeUrl(rawUrl, options = {}) {
  if (!rawUrl || !/^https?:|^file:/i.test(rawUrl)) {
    return null;
  }

  const {
    ignoreHash = true
  } = options;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  url.hostname = url.hostname.toLowerCase();

  if ((url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }

  const nextParams = new URLSearchParams();
  const entries = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.has(key.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [key, value] of entries) {
    nextParams.append(key, value);
  }

  url.search = nextParams.toString();

  if (ignoreHash) {
    url.hash = "";
  }

  if (url.pathname.length > 1) {
    url.pathname = url.pathname.replace(/\/+$/, "");
    if (!url.pathname) {
      url.pathname = "/";
    }
  }

  return url.toString();
}

export function getCanonicalPath(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "") || "/"}`;
  } catch {
    return null;
  }
}
