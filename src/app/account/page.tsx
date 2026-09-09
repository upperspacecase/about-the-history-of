"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useAuth } from "@/lib/firebase/auth-context";

interface UserStatus {
  isPaying: boolean;
}

// Existing-subscriber account view (§10, §14): shows the actual plan and
// entitlements. No new pricing, no billing changes; anonymous reading never
// requires this page.
export default function AccountPage() {
  const { user, signIn, signOut, getIdToken, loading } = useAuth();
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setStatus(null);
        return;
      }
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("status fetch failed");
        const data = (await res.json()) as UserStatus;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setError("We couldn't load your account details.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getIdToken]);

  return (
    <div className="flex flex-col flex-1">
      <SiteHeader compact />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Manage your subscription
        </h1>
        <p className="text-muted text-sm mt-1">
          View your current plan and billing details.
        </p>

        <div className="mt-6 border border-border rounded-lg p-6 bg-card text-[15px] leading-relaxed">
          {loading ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : !user ? (
            <div>
              <p>
                The briefing is free to read during the beta. Sign in only if
                you already have a subscription with us.
              </p>
              <button
                type="button"
                onClick={() => signIn()}
                className="mt-4 bg-foreground text-background text-sm font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity cursor-pointer"
              >
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">{user.email}</p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {status && (
                <p>
                  {status.isPaying ? (
                    <>
                      Your plan: <strong>The Daily Reader</strong> (active).
                      Your subscription continues unchanged while the public
                      beta runs. To change or cancel billing, reply to any of
                      our emails and we&apos;ll sort it out.
                    </>
                  ) : (
                    <>
                      You have no active paid subscription. The briefing is
                      free to read during the beta.
                    </>
                  )}
                </p>
              )}
              <button
                type="button"
                onClick={() => signOut()}
                className="text-sm text-muted hover:text-accent underline cursor-pointer"
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        <p className="mt-8 text-sm">
          <Link href="/" className="text-accent hover:underline">
            Back to the briefing
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
