import crypto from "node:crypto";
import { unstable_cache } from "next/cache";

// Thin client for the GA4 Data API (REST). Signs a service-account JWT,
// swaps it for an access token, and caches report results for an hour.

type Credentials = { client_email: string; private_key: string };

export type Row = { d: string[]; m: number[] };
export type Report = { dh: string[]; rows: Row[]; totals?: number[] };

let token: { value: string; expires: number } | null = null;

function credentials(): Credentials {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set.");
  return JSON.parse(raw);
}

function propertyId(): string {
  const id = process.env.GA4_PROPERTY_ID;
  if (!id) throw new Error("GA4_PROPERTY_ID is not set.");
  return id;
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const { client_email, private_key } = credentials();
  const now = Math.floor(Date.now() / 1000);
  const unsigned =
    b64({ alg: "RS256", typ: "JWT" }) +
    "." +
    b64({
      iss: client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${signature}`,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google sign-in failed: ${json.error_description ?? json.error}`);
  token = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return token.value;
}

type ApiValue = { value: string };
type ApiRow = { dimensionValues?: ApiValue[]; metricValues?: ApiValue[] };

async function fetchReport(body: object): Promise<Report> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId()}:runReport`, {
    method: "POST",
    headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google Analytics returned ${res.status}: ${json.error?.message ?? "unknown error"}`);
  return {
    dh: (json.dimensionHeaders ?? []).map((h: { name: string }) => h.name),
    rows: (json.rows ?? []).map((r: ApiRow) => ({
      d: (r.dimensionValues ?? []).map((v) => v.value),
      m: (r.metricValues ?? []).map((v) => Number(v.value)),
    })),
    totals: json.totals?.[0]?.metricValues?.map((v: ApiValue) => Number(v.value)),
  };
}

export function runReport(body: object): Promise<Report> {
  return unstable_cache(() => fetchReport(body), ["ga4", JSON.stringify(body)], { revalidate: 3600 })();
}
