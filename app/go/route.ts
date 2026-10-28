import { NextResponse, type NextRequest } from "next/server";
import { appStoreLink, playLink, slug, websiteLink, type Tag } from "@/lib/links";

// Public smart link used in ads, emails and partner QR codes:
// sends iPhones to the App Store, Android to Google Play, everyone else to the website.
export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const tag: Tag = {
    source: slug(q.get("s") ?? "") || "unknown",
    medium: slug(q.get("m") ?? "") || "referral",
    campaign: slug(q.get("c") ?? "") || "general",
  };
  const ua = req.headers.get("user-agent") ?? "";
  const target = /iPhone|iPad|iPod/i.test(ua)
    ? appStoreLink(tag, process.env.ASC_PROVIDER_TOKEN)
    : /Android/i.test(ua)
      ? playLink(tag)
      : websiteLink(tag);
  return NextResponse.redirect(target, 302);
}
