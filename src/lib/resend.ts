import { Resend } from "resend";

const FROM = "The Long View <welcome@thelongview.org>";

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
                <p style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#6b6b6b;margin:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">The Long View</p>
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
