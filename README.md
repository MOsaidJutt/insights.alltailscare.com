# AllTails Care Insights

User growth and funnel dashboard for AllTails Care, built on the Google Analytics 4 Data API.

- **Stack:** Next.js 15 (App Router, server components), no database. GA results are cached for 1 hour.
- **Pages:** User growth · Funnel · Where users come from · Retention · Engagement · Audience
- **Periods:** Daily (yesterday), Weekly (last 7 days), Monthly (last 30 days), each compared with the period before.
- **Login:** Sign in with Google for invited team members (Owner / Admin / Viewer roles). The owner can also use `DASHBOARD_PASSWORD`.
- **Team, Notes, Reports:** invite people, change roles, change history; chart notes; scheduled email reports (Resend).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` needs:

| Variable | What it is |
|---|---|
| `GA4_PROPERTY_ID` | GA4 property (458080625) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Service account key JSON on one line (`alltails-insights@alltails-care-f310d…`) with Viewer access to the GA4 property |
| `DASHBOARD_PASSWORD` | Password for the login page |
| `AUTH_SECRET` | Any long random string (signs session cookies) |
| `DATABASE_URL` | Neon Postgres (added automatically by the Vercel Neon integration). Tables are created on first use |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth web client. Redirect URI: `https://insights.alltailscare.com/api/auth/callback/google` |
| `OWNER_EMAIL` | The owner account (anjali@alltailscare.com) |
| `CRON_SECRET` | Protects the daily report job (`/api/cron/reports`, scheduled in `vercel.json`) |
| `RESEND_API_KEY` | Turns email on (invites, reports, shared links). Leave unset until the Resend DNS records are verified |
| `EMAIL_FROM` | Optional. Defaults to `AllTails Insights <reports@alltailscare.com>` |

## Deploy to Vercel

1. Push this `dashboard` folder to a private GitHub repo and import it in Vercel. Or run `npx vercel` from this folder.
2. In **Project → Settings → Environment Variables**, add the four variables above. Paste the JSON exactly as it appears in `.env.local`, without the surrounding single quotes.
3. Deploy.
4. To use the custom domain, open **Project → Settings → Domains** and add `insights.alltailscare.com`. Then add the CNAME record Vercel shows at the alltailscare.com DNS provider.

## Where things live

- `lib/events.ts` holds the funnel steps, paywall placements and features, mapped to the app's real event names. Edit this file to change the funnel.
- `lib/queries.ts` holds every GA query.
- `lib/ga.ts` handles Google sign-in (service account JWT) and caching.

## Known data gaps (tracking, not dashboard)

- `screen_view` events have no screen name, so there is no "top screens" report yet.
- Some event names are cut at 40 characters or misspelled (`persoalized_loading`). The dashboard matches them as they are.
- GA purchase events under-count sales. Revenue will come from RevenueCat (milestone 2).
