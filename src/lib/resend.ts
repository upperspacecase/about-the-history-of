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
    console.warn("RESEND_API_KEY missing — skipping welcome email");
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
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 16px;">If you're not a student of history, everything feels unprecedented. We&rsquo;re here to fix that — one headline at a time.</p>
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 28px;">Pick a headline. We&rsquo;ll show you the timeline, the precedent, the pattern.</p>
                <p style="margin:0 0 28px;">
                  <a href="https://thelongview.org" style="display:inline-block;background:#c0392b;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;padding:12px 22px;border-radius:6px;">Read today&rsquo;s history</a>
                </p>
                <p style="font-size:14px;line-height:1.55;color:#6b6b6b;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">History doesn&rsquo;t repeat but it does rhyme.</p>
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

If you're not a student of history, everything feels unprecedented. We're here to fix that — one headline at a time.

Pick a headline. We'll show you the timeline, the precedent, the pattern.

Read today's history: https://thelongview.org

— The Long View

History doesn't repeat but it does rhyme.`;

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
    console.warn("RESEND_API_KEY missing — skipping subscribe confirmation");
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
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 16px;">Each morning we take a headline and show you the history behind it — the precedent, the pattern, the part that makes today legible.</p>
                <p style="font-size:17px;line-height:1.55;color:#333;margin:0 0 28px;">If you&rsquo;re not a student of history, everything feels unprecedented. Now you&rsquo;ve got context.</p>
                <p style="margin:0 0 28px;">
                  <a href="https://thelongview.org" style="display:inline-block;background:#c0392b;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;padding:12px 22px;border-radius:6px;">Read today&rsquo;s Long View</a>
                </p>
                <p style="font-size:14px;line-height:1.55;color:#6b6b6b;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">History doesn&rsquo;t repeat but it does rhyme.</p>
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

Each morning we take a headline and show you the history behind it — the precedent, the pattern, the part that makes today legible.

If you're not a student of history, everything feels unprecedented. Now you've got context.

Read today's Long View: https://thelongview.org

— The Long View

History doesn't repeat but it does rhyme.`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "You're on the list — The Long View",
    html,
    text,
  });
}

export interface DigestStory {
  headline: string;
  truthHeadline: string;
  significance: number;
  significanceReason: string;
}

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
    console.warn("RESEND_API_KEY missing — skipping daily digest");
    return;
  }

  const site = "https://thelongview.org";
  const sans =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

  const storyBlocks = stories
    .map((s) => {
      const link = `${site}/history?headline=${encodeURIComponent(s.headline)}`;
      return `
        <tr><td style="padding:0 0 28px;">
          <p style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#c0392b;margin:0 0 8px;font-family:${sans};">Significance ${s.significance}/10</p>
          <p style="font-size:21px;line-height:1.3;font-weight:700;color:#6b6b6b;text-decoration:line-through;margin:0 0 4px;">${s.headline}</p>
          <a href="${link}" style="display:block;font-size:22px;line-height:1.3;font-weight:700;color:#15803d;text-decoration:none;margin:0 0 8px;">${s.truthHeadline}</a>
          <p style="font-size:15px;line-height:1.5;color:#555;margin:0 0 10px;">${s.significanceReason}</p>
          <a href="${link}" style="font-size:14px;color:#c0392b;text-decoration:none;font-weight:600;font-family:${sans};">Read the history &rarr;</a>
        </td></tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#faf9f6;font-family:Georgia,'Times New Roman',serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f6;padding:40px 20px;"><tr><td align="center">
    <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #e0ddd8;border-radius:10px;padding:40px;">
      <tr><td>
        ${MASTHEAD}
        <h1 style="font-size:26px;line-height:1.2;font-weight:700;margin:0 0 6px;">The 3 headlines that matter today</h1>
        <p style="font-size:15px;color:#6b6b6b;margin:0 0 28px;">And the history behind them.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${storyBlocks}</table>
        <p style="border-top:1px solid #e0ddd8;padding-top:20px;font-size:14px;color:#6b6b6b;margin:8px 0 0;font-family:${sans};">History doesn&rsquo;t repeat but it does rhyme. &mdash; <a href="${site}" style="color:#c0392b;text-decoration:none;">thelongview.org</a></p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#9a9a9a;margin:18px 0 0;font-family:${sans};">
      You signed up for the daily Long View. <a href="${unsubscribeUrl}" style="color:#9a9a9a;">Unsubscribe</a>.<br/>
      The Long View &middot; 129 Pritchards Rd, London, UK
    </p>
  </td></tr></table>
</body></html>`;

  const text =
    "The 3 headlines that matter today — and the history behind them.\n\n" +
    stories
      .map(
        (s) =>
          `Significance ${s.significance}/10\n${s.headline}\n↳ ${s.truthHeadline}\n${s.significanceReason}\n${site}/history?headline=${encodeURIComponent(s.headline)}`
      )
      .join("\n\n") +
    `\n\n— The Long View · thelongview.org · 129 Pritchards Rd, London, UK\nUnsubscribe: ${unsubscribeUrl}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "The 3 headlines that matter today — and the history behind them",
    html,
    text,
  });
}
