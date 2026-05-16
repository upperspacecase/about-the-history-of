"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { getClientAuth, googleProvider } from "./client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async () => {
        const result = await signInWithPopup(getClientAuth(), googleProvider);
        const created = result.user.metadata.creationTime;
        const last = result.user.metadata.lastSignInTime;
        if (created && last) {
          const diff = Math.abs(
            new Date(created).getTime() - new Date(last).getTime()
          );
          if (diff < 5000) {
            try {
              window.localStorage.setItem("lv_first_signin", "1");
            } catch {
              /* storage disabled — popup just won't show this session */
            }
          }
        }
        const idToken = await result.user.getIdToken();
        // Fire-and-forget: creates Firestore user doc + sends welcome email on first sign-in
        fetch("/api/users/init", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        }).catch(() => {
          /* non-blocking */
        });
      },
      signOut: async () => {
        await fbSignOut(getClientAuth());
      },
      getIdToken: async () => {
        const current = getClientAuth().currentUser;
        return current ? current.getIdToken() : null;
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
