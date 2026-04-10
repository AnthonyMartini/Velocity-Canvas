"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "@/LandingPage";
import { useAppShell } from "@/features/app/AppShellProvider";

export default function Home() {
  const router = useRouter();
  const { user, authLoading } = useAppShell();
  const handleAuthenticated = useCallback(() => {
    router.push("/projects");
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/projects");
    }
  }, [authLoading, user, router]);

  if (authLoading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-base">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return <LandingPage onAuthenticated={handleAuthenticated} />;
}
