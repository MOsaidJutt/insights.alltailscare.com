import { Card, Head, Shell } from "@/components/Shell";
import { LinkBuilder } from "@/components/LinkBuilder";
import { readParams, type SearchParams } from "@/lib/periods";

export default async function Links({ searchParams }: { searchParams: SearchParams }) {
  const { period, os } = await readParams(searchParams);
  const providerToken = process.env.ASC_PROVIDER_TOKEN;

  return (
    <Shell active="/links" period={period} os={os} showPeriod={false} showPlatform={false}>
      <Head eyebrow="Attribution" title="Tracked links and QR codes" />

      <Card title="Create a link" src="Use a different link for every ad, partner and campaign">
        <LinkBuilder providerToken={providerToken} />
      </Card>

      <Card title="How each link is measured">
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Link</th><th style={{ textAlign: "left" }}>Where the results show</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Android (Google Play)</td>
                <td style={{ textAlign: "left", whiteSpace: "normal" }}>This dashboard, under Acquisition, from the first install.</td>
              </tr>
              <tr>
                <td>iPhone (App Store)</td>
                <td style={{ textAlign: "left", whiteSpace: "normal" }}>
                  App Store Connect campaign reports. These join the dashboard with the App Store Connect milestone. Apple doesn’t
                  pass campaign details to Google Analytics.
                  {!providerToken && " Add the App Store provider token (ASC_PROVIDER_TOKEN) so Apple can attribute these links."}
                </td>
              </tr>
              <tr>
                <td>Website</td>
                <td style={{ textAlign: "left", whiteSpace: "normal" }}>Website visits in your site’s analytics, before people go to the store.</td>
              </tr>
              <tr>
                <td>Smart link and QR code</td>
                <td style={{ textAlign: "left", whiteSpace: "normal" }}>
                  Sends each phone to the right store with the right tags. Best for flyers in pet stores and shelters, emails and bios.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="note">
          For paid ads on TikTok, Meta and AppLovin, the ad networks’ own install numbers are more complete than links alone. A
          mobile attribution tool (AppsFlyer, Adjust or Branch) connects them; we can add it when those campaigns start.
        </p>
      </Card>
    </Shell>
  );
}
