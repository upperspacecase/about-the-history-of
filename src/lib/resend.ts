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
                <h1 style="font-size:30px;line-height:1.2;font-weight:700;margin:0 0 18px;letter-spacing:-0.01em;">You&rsquo;re on the list.</h1>
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 16px;">Each morning we send up to three stories ranked by historical significance: the verdict, the precedent, and the crucial difference.</p>
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 28px;">It takes less than five minutes to read, and on a quiet day we will say so rather than invent significance.</p>
                <p style="margin:0 0 28px;">
                  <a href="https://thelongview.org" style="display:inline-block;background:#c0392b;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;padding:12px 22px;border-radius:6px;">Read today&rsquo;s Long View</a>
                </p>
                <p style="font-size:14px;line-height:1.55;color:#6b6b6b;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Know what changed. Ignore what didn&rsquo;t.</p>
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

  const text = `You're on the list.

Each morning we send up to three stories ranked by historical significance: the verdict, the precedent, and the crucial difference.

It takes less than five minutes to read, and on a quiet day we will say so rather than invent significance.

Read today's Long View: https://thelongview.org

The Long View

Know what changed. Ignore what didn't.`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "You're on The Long View list",
    html,
    text,
  });
}

export interface DigestStory {
  /** The original source headline. */
  headline: string;
  publisher?: string;
  /** The Long View verdict headline. */
  truthHeadline: string;
  significance: number;
  /** Verbal significance label; shown more prominently than the number. */
  label: string;
  significanceReason: string;
  confidence?: string;
  role?: "shift" | "pattern" | "noise";
}

const ROLE_KICKERS: Record<NonNullable<DigestStory["role"]>, string> = {
  shift: "The shift",
  pattern: "The pattern",
  noise: "The noise check",
};

export async function sendDailyDigestEmail({
  to,
  stories,
  unsubscribeUrl,
}: {
  to: string;
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

  const quietDay = stories.length === 0;

  const storyBlocks = stories
    .map((s) => {
      const link = `${site}/history?headline=${encodeURIComponent(s.headline)}`;
      const kicker = s.role ? ROLE_KICKERS[s.role] : "Today";
      const publisher = s.publisher ? `${s.publisher}: ` : "";
      const confidence = s.confidence ? ` &middot; ${s.confidence} confidence` : "";
      return `
        <tr><td style="padding:0 0 30px;">
          <p style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#c0392b;margin:0 0 8px;font-family:${sans};">${kicker}</p>
          <p style="font-size:14px;line-height:1.4;color:#6b6b6b;text-decoration:line-through;margin:0 0 6px;">${publisher}${s.headline}</p>
          <p style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#15803d;margin:0 0 2px;font-family:${sans};">Our read</p>
          <a href="${link}" style="display:block;font-size:22px;line-height:1.3;font-weight:700;color:#15803d;text-decoration:none;margin:0 0 10px;">${s.truthHeadline}</a>
          <p style="font-size:16px;font-weight:700;color:#111;margin:0 0 2px;">${s.label}</p>
          <p style="font-size:12px;color:#6b6b6b;margin:0 0 8px;font-family:${sans};">Provisional significance: ${s.significance}/10${confidence}</p>
          <p style="font-size:15px;line-height:1.5;color:#555;margin:0 0 10px;">${s.significanceReason}</p>
          <a href="${link}" style="font-size:14px;color:#c0392b;text-decoration:none;font-weight:600;font-family:${sans};">Precedent, score breakdown and sources &rarr;</a>
        </td></tr>`;
    })
    .join("");

  const heading = quietDay
    ? "A quiet day"
    : stories.length === 1
      ? "The one story that matters today"
      : `The ${stories.length} stories that matter today`;

  const intro = quietDay
    ? `<p style="font-size:15px;line-height:1.55;color:#555;margin:0 0 8px;">Nothing that broke overnight cleared our bar for significance. That is a real conclusion, not a gap: today you can safely ignore the noise.</p>`
    : `<p style="font-size:15px;color:#6b6b6b;margin:0 0 28px;">Ranked by historical significance. Read in under five minutes.</p>`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#faf9f6;font-family:Georgia,'Times New Roman',serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:40px 20px;"><tr><td align="center">
    <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #e0ddd8;border-radius:10px;padding:40px;">
      <tr><td>
        ${MASTHEAD}
        <h1 style="font-size:26px;line-height:1.2;font-weight:700;margin:0 0 6px;">${heading}</h1>
        ${intro}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${storyBlocks}</table>
        <p style="border-top:1px solid #e0ddd8;padding-top:20px;font-size:14px;color:#6b6b6b;margin:8px 0 0;font-family:${sans};">Know what changed. Ignore what didn&rsquo;t. &mdash; <a href="${site}" style="color:#c0392b;text-decoration:none;">thelongview.org</a></p>
        <p style="padding-top:14px;font-size:11px;line-height:1.5;color:#9a9a9a;margin:0;font-family:${sans};">The Long View is produced by an automated analysis system using linked reporting and historical sources. Every story passes automated sourcing, consistency, similarity, and confidence checks. Analysis remains provisional and may be updated as evidence changes.</p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#9a9a9a;margin:18px 0 0;font-family:${sans};">
      You signed up for the daily Long View. <a href="${unsubscribeUrl}" style="color:#9a9a9a;">Unsubscribe</a>.<br/>
      The Long View &middot; 129 Pritchards Rd, London, UK
    </p>
  </td></tr></table>
</body></html>`;

  const subject = quietDay
    ? "Today's Long View: a quiet day"
    : stories.length === 1
      ? "Today's Long View: the one story that matters"
      : `Today's Long View: the ${stories.length} stories that matter`;

  const text = quietDay
    ? "A quiet day.\n\nNothing that broke overnight cleared our bar for significance. That is a real conclusion, not a gap: today you can safely ignore the noise.\n\nKnow what changed. Ignore what didn't. thelongview.org\nUnsubscribe: " +
      unsubscribeUrl
    : `${heading}. Ranked by historical significance.\n\n` +
      stories
        .map((s) => {
          const kicker = s.role ? ROLE_KICKERS[s.role] : "Today";
          const confidence = s.confidence ? ` / ${s.confidence} confidence` : "";
          return `${kicker}\n${s.publisher ? `${s.publisher}: ` : ""}${s.headline}\nOur read: ${s.truthHeadline}\n${s.label}. Provisional significance ${s.significance}/10${confidence}\n${s.significanceReason}\n${site}/history?headline=${encodeURIComponent(s.headline)}`;
        })
        .join("\n\n") +
      `\n\nKnow what changed. Ignore what didn't. thelongview.org\nUnsubscribe: ${unsubscribeUrl}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
  });
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
