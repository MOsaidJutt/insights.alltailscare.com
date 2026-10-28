// Store links for the app, with attribution parameters added.
export const APP_STORE_ID = "6737822424";
export const PLAY_PACKAGE = "com.valykhan.alltailscare";
export const WEBSITE = "https://www.alltailscare.com/";

export type Tag = { source: string; medium: string; campaign: string };

export const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const utm = (t: Tag) => `utm_source=${t.source}&utm_medium=${t.medium}&utm_campaign=${t.campaign}`;

// `pt` is the App Store Connect provider token; campaign tokens only show in App Store Connect analytics.
export function appStoreLink(t: Tag, providerToken?: string) {
  const q = new URLSearchParams({ ct: `${t.source}-${t.campaign}`.slice(0, 40), mt: "8" });
  if (providerToken) q.set("pt", providerToken);
  return `https://apps.apple.com/app/apple-store/id${APP_STORE_ID}?${q}`;
}

export const playLink = (t: Tag) =>
  `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&referrer=${encodeURIComponent(utm(t))}`;

export const websiteLink = (t: Tag) => `${WEBSITE}?${utm(t)}`;
