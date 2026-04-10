"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, upsertUserProfile } from "@/lib/firebase";

const THEME_STORAGE_KEY = "velocity-canvas-theme";

type CreditsState = number | string | null;

interface AppShellContextValue {
  user: User | null;
  authLoading: boolean;
  credits: CreditsState;
  isAdmin: boolean;
  isDarkMode: boolean;
  setIsDarkMode: Dispatch<SetStateAction<boolean>>;
  refreshCredits: (firebaseUser?: User | null) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

async function fetchCreditsForUser(firebaseUser: User): Promise<CreditsState> {
  const idToken = await firebaseUser.getIdToken();
  const res = await fetch("/api/user/credits", {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || "Unable to fetch credits.");
  }

  return data.credits ?? null;
}

async function fetchAdminStatus(firebaseUser: User): Promise<boolean> {
  const idToken = await firebaseUser.getIdToken();
  const res = await fetch("/api/admin/check", {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) return false;

  const data = await res.json();
  return Boolean(data.isAdmin);
}

export function AppShellProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [credits, setCredits] = useState<CreditsState>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const refreshCredits = useCallback(async (firebaseUser?: User | null) => {
    const targetUser = firebaseUser ?? auth.currentUser;
    if (!targetUser) {
      setCredits(null);
      return;
    }

    try {
      const nextCredits = await fetchCreditsForUser(targetUser);
      setCredits(nextCredits);
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits("Error");
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light") {
      setIsDarkMode(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? "dark" : "light");
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null);

      if (!firebaseUser) {
        setCredits(null);
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }

      try {
        await upsertUserProfile(firebaseUser);
      } catch (profileError) {
        console.warn("Unable to sync user profile after sign-in.", profileError);
      }

      await Promise.allSettled([
        refreshCredits(firebaseUser),
        fetchAdminStatus(firebaseUser).then(setIsAdmin).catch((error) => {
          console.error("Error fetching admin status:", error);
          setIsAdmin(false);
        }),
      ]);

      setAuthLoading(false);
    });

    return unsubscribe;
  }, [refreshCredits]);

  const value = useMemo<AppShellContextValue>(
    () => ({
      user,
      authLoading,
      credits,
      isAdmin,
      isDarkMode,
      setIsDarkMode,
      refreshCredits,
      signOutUser,
    }),
    [user, authLoading, credits, isAdmin, isDarkMode, refreshCredits, signOutUser],
  );

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const context = useContext(AppShellContext);

  if (!context) {
    throw new Error("useAppShell must be used within AppShellProvider.");
  }

  return context;
}
