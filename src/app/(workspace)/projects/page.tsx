"use client";

import { useRouter } from "next/navigation";
import HomePage from "@/HomePage";
import { useAppShell } from "@/features/app/AppShellProvider";
import type { ProjectDocument } from "@/features/projects/api";

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAppShell();

  if (!user) return null;

  const handleOpenProject = (project: ProjectDocument) => {
    if (project?.isNew) {
      const name = encodeURIComponent(project.name?.trim() || "Untitled Project");
      router.push(`/projects/new?name=${name}`);
      return;
    }

    if (project?.id) {
      router.push(`/projects/${project.id}`);
    }
  };

  return <HomePage user={user} onOpenProject={handleOpenProject} />;
}
