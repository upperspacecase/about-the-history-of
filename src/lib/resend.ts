import { Resend } from "resend";

const FROM = "The Long View <welcome@thelongview.org>";

const SITE = "https://thelongview.org";
const MASTHEAD = `
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 18px;">
    <tr>
      <td style="vertical-align:middle;padding-right:10px;"><img src="${SITE}/logo.png" width="40" height="28" alt="The Long View" style="display:block;border:0;" /></td>
      <td style="vertical-align:middle;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#111111;">The Long View</td>
    </tr>
  </table>
  <div style="height:2px;background:#111111;margin:0 0 26px;"></div>`;

let cached: Resend | null = null;

function client(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name?: string;
}) {
  const resend = client();
  if (!resend) {
    console.warn("RESEND_API_KEY missing; skipping welcome email");
    return;
  }

  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi,";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#faf9f6;font-family:Georgia,'Times New Roman',serif;color:#111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #e0ddd8;border-radius:10px;padding:40px;">
            <tr>
              <td>
                ${MASTHEAD}
                <h1 style="font-size:30px;line-height:1.2;font-weight:700;margin:0 0 18px;letter-spacing:-0.01em;">Welcome.</h1>
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 16px;">${greeting}</p>
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 16px;">Not everything breaking is important. Each morning we rank the stories that matter by historical significance, so you know what changed and can ignore what didn&rsquo;t.</p>
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 28px;">Every story carries a provisional significance score, the closest precedent, and the crucial difference from it.</p>
                <p style="margin:0 0 28px;">
                  <a href="https://thelongview.org" style="display:inline-block;background:#c0392b;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;padding:12px 22px;border-radius:6px;">Read today&rsquo;s history</a>
                </p>
                <p style="font-size:14px;line-height:1.55;color:#6b6b6b;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Know what changed. Ignore what didn&rsquo;t.</p>
              </td>
            </tr>
          </table>
          <p style="font-size:11px;color:#6b6b6b;margin:18px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            You&rsquo;re receiving this because you signed in to The Long View at thelongview.org.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${greeting}

Not everything breaking is important. Each morning we rank the stories that matter by historical significance, so you know what changed and can ignore what didn't.

Every story carries a provisional significance score, the closest precedent, and the crucial difference from it.

Read today's history: https://thelongview.org

The Long View

Know what changed. Ignore what didn't.`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to The Long View",
    html,
    text,
  });
}

export async function sendSubscribeConfirmation({ to }: { to: string }) {
  const resend = client();
  if (!resend) {
    console.warn("RESEND_API_KEY missing; skipping subscribe confirmation");
    return;
  }

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#faf9f6;font-family:Georgia,'Times New Roman',serif;color:#111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #e0ddd8;border-radius:10px;padding:40px;">
            <tr>
              <td>
                ${MASTHEAD}
                <h1 style="font-size:30px;line-height:1.2;font-weight:700;margin:0 0 18px;letter-spacing:-0.01em;">You&rsquo;re subscribed.</h1>
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 16px;">We&rsquo;ll send you a short daily briefing on what changed, with the background to make sense of it. You can read the briefing in the email or open a story for its sources and fuller history.</p>
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 28px;">When a familiar story changes, we&rsquo;ll explain the update. When we can&rsquo;t verify something, we&rsquo;ll say so.</p>
                <p style="margin:0 0 28px;">
                  <a href="https://thelongview.org" style="display:inline-block;background:#c0392b;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;padding:12px 22px;border-radius:6px;">Read the latest briefing</a>
                </p>
              </td>
            </tr>
          </table>
          <p style="font-size:11px;color:#6b6b6b;margin:18px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            You signed up for the daily email at thelongview.org.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `You're subscribed.

We'll send you a short daily briefing on what changed, with the background to make sense of it. You can read the briefing in the email or open a story for its sources and fuller history.

When a familiar story changes, we'll explain the update. When we can't verify something, we'll say so.

Read the latest briefing: https://thelongview.org

The Long View

You signed up at thelongview.org.`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "You're subscribed to The Long View",
    html,
    text,
  });
}

export interface DigestStory {
  /** The Long View editorial headline. */
  editorialHeadline: string;
  whatChanged: string;
  whyItMatters: string;
  /** The material uncertainty, when present. */
  uncertainty?: string;
  /** Absolute URL of the exact published story version. */
  versionUrl: string;
}

export interface DigestEdition {
  /** YYYY-MM-DD edition id. */
  id: string;
  readingMinutes: number;
  quiet: boolean;
  limitedCoverage?: boolean;
}

function editionDateLabel(id: string): string {
  return new Date(`${id}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * The daily email IS the briefing (§9): what changed and essential context
 * per story, not a list of teasers. Each item links to the same story
 * version shown in the edition.
 */
export async function sendDailyDigestEmail({
  to,
  edition,
  stories,
  unsubscribeUrl,
}: {
  to: string;
  edition: DigestEdition;
  stories: DigestStory[];
  unsubscribeUrl: string;
}) {
  const resend = client();
  if (!resend) {
    console.warn("RESEND_API_KEY missing; skipping daily digest");
    return;
  }

  const site = "https://thelongview.org";
  const sans =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
  const dateLabel = editionDateLabel(edition.id);
  const quietDay = edition.quiet || stories.length === 0;

  const coverageNotice = edition.limitedCoverage
    ? `<p style="font-size:14px;line-height:1.5;color:#8a6d3b;margin:0 0 20px;">We couldn&rsquo;t review all of our usual sources. This edition may miss important developments.</p>`
    : "";

  const storyBlocks = stories
    .map((s) => {
      const uncertainty = s.uncertainty
        ? `<p style="font-size:14px;line-height:1.5;color:#6b6b6b;margin:0 0 10px;">${s.uncertainty}</p>`
        : "";
      return `
        <tr><td style="padding:0 0 30px;">
          <a href="${s.versionUrl}" style="display:block;font-size:22px;line-height:1.3;font-weight:700;color:#111111;text-decoration:none;margin:0 0 10px;">${s.editorialHeadline}</a>
          <p style="font-size:15px;line-height:1.55;color:#333;margin:0 0 8px;"><strong>What changed:</strong> ${s.whatChanged}</p>
          <p style="font-size:15px;line-height:1.55;color:#333;margin:0 0 8px;"><strong>Why it matters:</strong> ${s.whyItMatters}</p>
          ${uncertainty}
          <a href="${s.versionUrl}" style="font-size:14px;color:#c0392b;text-decoration:none;font-weight:600;font-family:${sans};">Read the full story and sources &rarr;</a>
        </td></tr>`;
    })
    .join("");

  const intro = quietDay
    ? `<p style="font-size:15px;line-height:1.55;color:#555;margin:0 0 8px;">Among the stories we reviewed, we found no new developments substantial enough for another briefing. You can explore the background in the <a href="${site}/archive" style="color:#c0392b;">archive</a>.</p>`
    : `<p style="font-size:14px;color:#6b6b6b;margin:0 0 24px;">${dateLabel} &middot; About ${edition.readingMinutes} ${edition.readingMinutes === 1 ? "minute" : "minutes"}</p>`;

  const heading = quietDay
    ? "No substantial updates in this edition"
    : "Today's briefing";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#faf9f6;font-family:Georgia,'Times New Roman',serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:40px 20px;"><tr><td align="center">
    <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #e0ddd8;border-radius:10px;padding:40px;">
      <tr><td>
        ${MASTHEAD}
        <h1 style="font-size:26px;line-height:1.2;font-weight:700;margin:0 0 6px;">${heading}</h1>
        ${intro}
        ${coverageNotice}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${storyBlocks}</table>
        <p style="border-top:1px solid #e0ddd8;padding-top:20px;font-size:15px;font-weight:700;color:#111;margin:8px 0 4px;">You're caught up on this briefing.</p>
        <p style="font-size:13px;color:#6b6b6b;margin:0 0 12px;font-family:${sans};"><a href="${site}/briefing/${edition.id}" style="color:#c0392b;text-decoration:none;">Read this edition online</a></p>
        <p style="font-size:11px;line-height:1.5;color:#9a9a9a;margin:0;font-family:${sans};">Prepared with AI using the linked sources. Our analysis can be wrong and may change as evidence develops. How we work: <a href="${site}/how-it-works" style="color:#9a9a9a;">${site.replace("https://", "")}/how-it-works</a></p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#9a9a9a;margin:18px 0 0;font-family:${sans};">
      You signed up for The Long View briefing. <a href="${unsubscribeUrl}" style="color:#9a9a9a;">Unsubscribe</a>.<br/>
      The Long View &middot; 129 Pritchards Rd, London, UK
    </p>
  </td></tr></table>
</body></html>`;

  const lead = quietDay
    ? "No substantial updates"
    : stories[0].editorialHeadline.slice(0, 60);
  const subject = `The Long View · ${dateLabel} · ${lead}`;

  const text = quietDay
    ? `No substantial updates in this edition.\n\nAmong the stories we reviewed, we found no new developments substantial enough for another briefing. Explore the background: ${site}/archive\n\nPrepared with AI using linked sources. How we work: ${site}/how-it-works\nUnsubscribe: ${unsubscribeUrl}`
    : `The Long View · ${dateLabel} · About ${edition.readingMinutes} min\n\n` +
      stories
        .map(
          (s) =>
            `${s.editorialHeadline}\nWhat changed: ${s.whatChanged}\nWhy it matters: ${s.whyItMatters}${s.uncertainty ? `\n${s.uncertainty}` : ""}\nRead the full story and sources: ${s.versionUrl}`
        )
        .join("\n\n") +
      `\n\nYou're caught up on this briefing.\nRead this edition online: ${site}/briefing/${edition.id}\n\nPrepared with AI using the linked sources. Our analysis can be wrong and may change as evidence develops. How we work: ${site}/how-it-works\nUnsubscribe: ${unsubscribeUrl}`;

  const result = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
  });
  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
  return result.data?.id;
}

/**
 * Operational run report for the daily pipeline. Sends to a single operator
 * address (never the subscriber list). Plain text; it's an internal alert.
 */
export async function sendRunReport({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  const resend = client();
  if (!resend) {
    console.warn("RESEND_API_KEY missing; skipping run report");
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, text: body });
}
