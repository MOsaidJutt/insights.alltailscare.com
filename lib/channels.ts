// Groups GA's first-user source/medium into the marketing channels AllTails uses.
// Links made with the dashboard's link builder follow these conventions:
//   utm_source = tiktok | meta | applovin | <partner-name> | website
//   utm_medium = paid | social | partner | email

export const CHANNELS = [
  "Apple Search Ads",
  "App Store organic",
  "Google Play organic",
  "TikTok",
  "Meta",
  "AppLovin",
  "Partners",
  "Website",
  "Other",
] as const;

export type Channel = (typeof CHANNELS)[number];

export function channelOf(source: string, medium: string): Channel {
  const s = source.toLowerCase();
  const m = medium.toLowerCase();
  if (s === "apple" && m === "search") return "Apple Search Ads";
  if (s.includes("tiktok")) return "TikTok";
  if (/facebook|instagram|meta|^fb$|^ig$/.test(s)) return "Meta";
  if (s.includes("applovin")) return "AppLovin";
  if (m === "partner") return "Partners";
  if (s.includes("alltailscare") || s === "website") return "Website";
  if (s === "google-play" && m === "organic") return "Google Play organic";
  if (s === "(direct)") return "App Store organic";
  return "Other";
}

export const CHANNEL_NOTES: Partial<Record<Channel, string>> = {
  "App Store organic": "iPhone installs Google Analytics can’t attribute, mostly App Store search and browse",
  Partners: "Pet stores, rescues and shelters using a partner link or QR code",
};
