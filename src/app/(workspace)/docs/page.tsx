"use client";

import ComponentLibraryPage from "@/ComponentLibraryPage";
import { useAppShell } from "@/features/app/AppShellProvider";

export default function DocsPage() {
  const { user } = useAppShell();

  if (!user) return null;

  return <ComponentLibraryPage user={user} />;
}
