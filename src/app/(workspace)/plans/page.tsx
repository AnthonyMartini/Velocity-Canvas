"use client";

import PlansPage from "@/PlansPage";
import { useAppShell } from "@/features/app/AppShellProvider";

export default function BillingPlansPage() {
  const { user } = useAppShell();

  if (!user) return null;

  return <PlansPage user={user} />;
}
