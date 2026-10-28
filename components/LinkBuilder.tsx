"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { appStoreLink, playLink, slug, websiteLink, type Tag } from "@/lib/links";

const CHANNELS = [
  { id: "tiktok", label: "TikTok", medium: "paid" },
  { id: "meta", label: "Meta (Facebook / Instagram)", medium: "paid" },
  { id: "applovin", label: "AppLovin", medium: "paid" },
  { id: "partner", label: "Pet store, rescue or shelter", medium: "partner" },
  { id: "email", label: "Email outreach", medium: "email" },
  { id: "social", label: "Organic social post", medium: "social" },
  { id: "other", label: "Other", medium: "referral" },
];

function Row({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="link-row">
      <span className="muted">{label}</span>
      <code>{value}</code>
      <button
        type="button"
        className="mini-btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            window.prompt("Copy this link:", value);
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function LinkBuilder({ providerToken }: { providerToken?: string }) {
  const [channel, setChannel] = useState(CHANNELS[3].id);
  const [partner, setPartner] = useState("Happy Paws Rescue");
  const [campaign, setCampaign] = useState("Fall 2026 flyer");
  const [origin, setOrigin] = useState("");
  const [qr, setQr] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const ch = CHANNELS.find((c) => c.id === channel)!;
  const tag: Tag = useMemo(
    () => ({
      source: channel === "partner" ? slug(partner) || "partner" : channel,
      medium: ch.medium,
      campaign: slug(campaign) || "general",
    }),
    [channel, partner, campaign, ch.medium],
  );
  const smart = `${origin}/go?${new URLSearchParams({ s: tag.source, m: tag.medium, c: tag.campaign })}`;

  useEffect(() => {
    if (!origin) return;
    QRCode.toDataURL(smart, { width: 480, margin: 2, color: { dark: "#11302b", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [smart, origin]);

  return (
    <div className="builder">
      <form className="builder-form" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="lb-channel">Channel</label>
        <select id="lb-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
          {CHANNELS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        {channel === "partner" && (
          <>
            <label htmlFor="lb-partner">Partner name</label>
            <input id="lb-partner" value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="e.g. Happy Paws Rescue" />
          </>
        )}
        <label htmlFor="lb-campaign">Campaign name</label>
        <input id="lb-campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. Fall 2026 flyer" />
        <p className="note">
          Shows in the dashboard as <b>{tag.source} / {tag.medium}</b>, campaign <b>{tag.campaign}</b>.
        </p>
      </form>

      <div className="builder-out">
        <Row label="Smart link (one link for all phones)" value={smart} />
        <Row label="iPhone (App Store)" value={appStoreLink(tag, providerToken)} />
        <Row label="Android (Google Play)" value={playLink(tag)} />
        <Row label="Website" value={websiteLink(tag)} />
        {qr && (
          <div className="qr">
            <img src={qr} alt={`QR code for ${tag.source} ${tag.campaign}`} width={200} height={200} />
            <a className="mini-btn" href={qr} download={`alltails-qr-${tag.source}-${tag.campaign}.png`}>
              Download QR code
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
