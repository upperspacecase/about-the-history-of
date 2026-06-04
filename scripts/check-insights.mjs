// One-off check: does META_PAGE_ACCESS_TOKEN have working Instagram insights?
// Run from the project root:
//   node scripts/check-insights.mjs
// Prints Meta's raw response, then a plain verdict. Never prints the token.

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local in cwd — fall back to whatever is already in the environment.
}

const ig = process.env.IG_USER_ID;
const token = process.env.META_PAGE_ACCESS_TOKEN;

if (!ig || !token) {
  console.error("Missing IG_USER_ID or META_PAGE_ACCESS_TOKEN in .env.local");
  process.exit(1);
}

// Token metadata: type, expiry, and the full granted scope list.
try {
  const dbg = await fetch(
    `https://graph.facebook.com/v25.0/debug_token?input_token=${encodeURIComponent(token)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const meta = (await dbg.json()).data;
  if (meta) {
    const fmt = (t) =>
      t === 0 ? "never" : t ? new Date(t * 1000).toISOString() : "unknown";
    const scopes = meta.scopes ?? [];
    console.log("Token type:          ", meta.type ?? "unknown");
    console.log("Expires:             ", fmt(meta.expires_at));
    console.log("Data access expires: ", fmt(meta.data_access_expires_at));
    console.log("Scopes:              ", scopes.join(", ") || "(none returned)");
    console.log(
      "Has insights scope:  ",
      scopes.includes("instagram_manage_insights") ? "YES" : "no",
    );
    console.log("");
  } else {
    console.log("(Could not read token metadata — see above.)\n");
  }
} catch {
  console.log("(Token metadata check failed — debug_token may need an app token.)\n");
}

const url = `https://graph.facebook.com/v25.0/${ig}/insights?metric=reach&period=day&metric_type=total_value`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
const json = await res.json();

console.log(JSON.stringify(json, null, 2));

if (json.error) {
  const msg = String(json.error.message ?? "").toLowerCase();
  const scopeIssue =
    msg.includes("instagram_manage_insights") ||
    msg.includes("permission") ||
    json.error.code === 10 ||
    json.error.code === 200;
  console.log(
    scopeIssue
      ? "\n=> The insights scope looks MISSING."
      : "\n=> Errored, but not obviously a scope problem — read the message above.",
  );
} else {
  console.log("\n=> Insights scope is WORKING.");
}
