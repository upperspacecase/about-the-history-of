# TODO: turn on Instagram insights

The marketing loop ships and runs today, but the **reel + account insights**
half is gated on an access token with insights permission. Everything else
(email signups, customers, on-site click tracking, the `/admin` dashboard,
the weekly report's funnel section) works without it.

## What's missing

`collect-insights.ts` calls the Instagram insights endpoints. Those require an
insights permission that the **current `META_PAGE_ACCESS_TOKEN` does not have** —
it's a Facebook/Meta Page token, and that app's permission list doesn't even
offer `instagram_manage_insights` (confirmed in the Graph API Explorer).

## Two ways to unblock it

1. **Facebook-Login flavor (matches the current code).** Add
   `instagram_manage_insights` to the app, then regenerate the Page token with
   it. Host stays `graph.facebook.com`; `scripts/lib/meta-insights.ts` needs no
   changes. This permission usually requires Advanced Access via App Review.

2. **Instagram-Login flavor (a separate Instagram token).** Use an Instagram
   access token with `instagram_business_manage_insights`. This talks to
   `graph.instagram.com`, **not** `graph.facebook.com` — so `meta-insights.ts`
   (and the `IG_USER_ID` source) would need to target that host/account.

## Verify a candidate token

```
node scripts/check-insights.mjs
```

Prints the token's type, expiry, full scope list, whether it has the insights
scope, and a live insights probe. (For an Instagram-Login token, update the host
in the script to `graph.instagram.com` first.)

## Until then

The daily collector logs which metrics returned and skips the rest, so it runs
cleanly with no insights access — the reel/follower columns on `/admin` just stay
empty until a token with insights access is in place.
