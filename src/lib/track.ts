import type { ClickTarget } from "@/lib/metrics";

// Fire-and-forget click ping for the marketing metrics loop. Never blocks or
// throws into the caller — a failed ping must not break the user's action.
export function trackClick(target: ClickTarget): void {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
    keepalive: true,
  }).catch(() => {
    /* metrics are best-effort */
  });
}
