# Meta API setup — The Long View auto-posting

Goal: one Meta app + one long-lived **Page access token** that can publish Reels to
both your Instagram account and your Facebook Page.

Because you are only posting to accounts **you own**, this is **Standard Access** —
**no App Review and no Business Verification required** (verified against
developers.facebook.com, 2026-06-03). Expect ~30–45 minutes, mostly clicking.

> The exact dashboard menu labels move around. The parts that are stable and verified
> are the **scopes** and the **API calls** in steps 3–4 — those are what actually matter.

---

## Prerequisites (in the Instagram + Facebook apps)

1. Set your Instagram account to **Business** or **Creator** (IG app → Settings → Account type).
2. Have a **Facebook Page** you administer, and **link your Instagram account to that Page**.
   The Facebook-Login publishing path requires the IG account be connected to a Page.
3. **Complete Page Publishing Authorization (PPA)** on that Page if it's prompted (Meta
   Business Suite → your Page → Settings). A Page that requires PPA silently rejects API
   publishes until PPA is done — this is the single most common first-post blocker.

## 1. Create a Meta app

- developers.facebook.com → **My Apps → Create App** → type **Business**.
- Add products: **Facebook Login for Business** and **Instagram** (Instagram Graph API).
- Copy your **App ID** and **App Secret** (App Settings → Basic).

## 2. Grant scopes and get a short-lived user token

- Open **Tools → Graph API Explorer**, select your app.
- Add these permissions, then **Generate Access Token** and approve:
  - `instagram_basic`
  - `instagram_content_publish`
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`
- Copy the generated token as `SHORT_USER_TOKEN` (it lasts ~1 hour — that's fine, the next step trades it in).

## 3. Exchange for a non-expiring Page token (verified API calls)

```bash
# 3a. short-lived user token -> long-lived user token (~60 days)
curl -s "https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_USER_TOKEN"
# -> { "access_token": "LONG_USER_TOKEN", ... }

# 3b. long-lived user token -> Page access token (this Page token does NOT expire)
curl -s "https://graph.facebook.com/v25.0/me/accounts?access_token=LONG_USER_TOKEN"
# -> in data[]: "access_token" is your PAGE_TOKEN, "id" is your FB_PAGE_ID
```

## 4. Get your Instagram user ID (the IG account linked to the Page)

```bash
curl -s "https://graph.facebook.com/v25.0/FB_PAGE_ID?fields=instagram_business_account&access_token=PAGE_TOKEN"
# -> { "instagram_business_account": { "id": "IG_USER_ID" }, ... }
```

## 5. Set the secrets

Add these wherever the pipeline runs (your `.env.local` for local runs, and GitHub
Actions repo secrets for the daily cron):

| Secret | Value |
|---|---|
| `META_PAGE_ACCESS_TOKEN` | the `PAGE_TOKEN` from 3b |
| `IG_USER_ID` | the `IG_USER_ID` from step 4 |
| `FB_PAGE_ID` | the `FB_PAGE_ID` from 3b |
| `BLOB_READ_WRITE_TOKEN` | from Vercel → Storage → your Blob store |
| `ANTHROPIC_API_KEY` | existing |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | existing |

## Notes

- The long-lived **user** token is valid ~60 days (confirmed). Long-lived **Page** tokens
  derived from it are documented as effectively non-expiring, so the cron likely needs no
  refresh logic — but confirm this in your browser on the Facebook Login access-tokens page
  (it wouldn't render for automated verification). If your Page token does expire, we add a
  ~50-day refresh job. A Page token also invalidates if you change your password, reset the
  app secret, or lose your Page role.
- If your **Page role was granted via Business Manager**, the app additionally needs the
  `ads_management` and `ads_read` scopes — add them in the Graph API Explorer alongside the
  others if your first publish attempt fails with a permissions error.
- **Rate caps are far above our use:** IG ~50 published posts / 24h, FB Reels 30 / 24h.
  We post 3/day.
- One quirk to confirm on the **first real post**: Meta prefers the MP4 `moov` atom at
  the front (faststart). Our Remotion render plays fine and Meta transcodes server-side,
  so it usually accepts it — if a post rejects, we add a one-line ffmpeg faststart pass.
