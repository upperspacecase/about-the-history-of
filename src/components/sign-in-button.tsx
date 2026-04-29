"use client";

import { useAuth } from "@/lib/firebase/auth-context";

export function SignInButton() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <div className="w-20 h-7 bg-border/50 rounded animate-pulse-bar" />;
  }

  if (user) {
    return (
      <button
        onClick={() => signOut()}
        className="text-xs text-muted hover:text-accent transition-colors"
        title={user.email ?? user.displayName ?? "Signed in"}
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="text-xs font-medium text-accent hover:underline"
    >
      Sign in with Google
    </button>
  );
}
