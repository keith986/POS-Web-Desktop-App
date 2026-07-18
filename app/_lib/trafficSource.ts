/* ─────────────────────────────────────────────────────────
   Traffic source classification
   Works out whether a visitor came from Facebook, Instagram,
   TikTok, WhatsApp, Twitter/X, YouTube, LinkedIn, Google/Bing,
   went direct, or something else — using UTM params first
   (most reliable) and falling back to the browser referrer.
   Pure logic, no browser/node-only APIs, safe to import from
   both client components and API routes.
───────────────────────────────────────────────────────── */

export type TrafficSource =
  | "facebook" | "instagram" | "tiktok" | "whatsapp" | "twitter"
  | "youtube"  | "linkedin"  | "pinterest" | "snapchat" | "telegram"
  | "google"   | "bing"      | "direct"  | "other";

export const SOURCE_LABELS: Record<TrafficSource, string> = {
  facebook:  "Facebook",
  instagram: "Instagram",
  tiktok:    "TikTok",
  whatsapp:  "WhatsApp",
  twitter:   "Twitter / X",
  youtube:   "YouTube",
  linkedin:  "LinkedIn",
  pinterest: "Pinterest",
  snapchat:  "Snapchat",
  telegram:  "Telegram",
  google:    "Google",
  bing:      "Bing",
  direct:    "Direct / None",
  other:     "Other",
};

const HOST_MAP: [RegExp, TrafficSource][] = [
  [/(^|\.)facebook\.com$/i, "facebook"],
  [/(^|\.)fb\.com$/i,       "facebook"],
  [/(^|\.)m\.facebook\.com$/i, "facebook"],
  [/(^|\.)instagram\.com$/i, "instagram"],
  [/(^|\.)tiktok\.com$/i,   "tiktok"],
  [/(^|\.)whatsapp\.com$/i, "whatsapp"],
  [/(^|\.)wa\.me$/i,        "whatsapp"],
  [/(^|\.)twitter\.com$/i,  "twitter"],
  [/(^|\.)x\.com$/i,        "twitter"],
  [/(^|\.)t\.co$/i,         "twitter"],
  [/(^|\.)youtube\.com$/i,  "youtube"],
  [/(^|\.)youtu\.be$/i,     "youtube"],
  [/(^|\.)linkedin\.com$/i, "linkedin"],
  [/(^|\.)pinterest\./i,    "pinterest"],
  [/(^|\.)snapchat\.com$/i, "snapchat"],
  [/(^|\.)telegram\.org$/i, "telegram"],
  [/(^|\.)t\.me$/i,         "telegram"],
  [/(^|\.)google\./i,       "google"],
  [/(^|\.)bing\.com$/i,     "bing"],
];

/** Normalizes free-text utm_source values (e.g. "FB", "ig", "insta") to a known bucket. */
function normalizeUtmSource(raw: string): TrafficSource {
  const v = raw.trim().toLowerCase();
  if (["fb", "facebook", "meta"].includes(v)) return "facebook";
  if (["ig", "insta", "instagram"].includes(v)) return "instagram";
  if (["tiktok", "tt"].includes(v)) return "tiktok";
  if (["whatsapp", "wa"].includes(v)) return "whatsapp";
  if (["twitter", "x"].includes(v)) return "twitter";
  if (["youtube", "yt"].includes(v)) return "youtube";
  if (["linkedin"].includes(v)) return "linkedin";
  if (["pinterest"].includes(v)) return "pinterest";
  if (["snapchat", "snap"].includes(v)) return "snapchat";
  if (["telegram", "tg"].includes(v)) return "telegram";
  if (["google", "adwords", "google-ads"].includes(v)) return "google";
  if (["bing"].includes(v)) return "bing";
  return "other";
}

export function hostFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function classifyHost(host: string | null): TrafficSource | null {
  if (!host) return null;
  for (const [re, source] of HOST_MAP) {
    if (re.test(host)) return source;
  }
  return null;
}

/**
 * Classify a visit. UTM params (explicit, set by whoever shared the link)
 * take priority; the browser referrer is the fallback signal.
 */
export function classifyTrafficSource(opts: {
  referrer?: string | null;
  utmSource?: string | null;
  currentHost?: string | null; // used to detect "direct" vs external referrer on same site
}): TrafficSource {
  const { referrer, utmSource, currentHost } = opts;

  if (utmSource && utmSource.trim()) {
    return normalizeUtmSource(utmSource);
  }

  const refHost = hostFromUrl(referrer);
  if (!refHost) return "direct";
  if (currentHost && refHost === currentHost) return "direct";

  return classifyHost(refHost) ?? "other";
}
