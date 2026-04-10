"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RendererPage from "@/RendererPage";
import { useAppShell } from "@/features/app/AppShellProvider";
import { loadProjectById, type ProjectDocument } from "./api";

interface ProjectEditorRouteProps {
  mode: "new" | "existing";
  projectId?: string;
  initialName?: string;
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-base">
      <div className="flex items-center gap-3 text-sm text-subtext">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function ProjectEditorRoute({ mode, projectId, initialName }: ProjectEditorRouteProps) {
  const router = useRouter();
  const { user, refreshCredits } = useAppShell();
  const [loading, setLoading] = useState(mode === "existing");
  const [error, setError] = useState<string | null>(null);
  const [hasInitializedProject, setHasInitializedProject] = useState(mode === "new");
  const [activeProject, setActiveProjectState] = useState<ProjectDocument | null>(
    mode === "new"
      ? {
          name: initialName?.trim() || "Untitled Project",
          isNew: true,
        }
      : null,
  );

  useEffect(() => {
    if (mode !== "existing" || !user || !projectId) return;

    let cancelled = false;

    const loadProject = async () => {
      try {
        setLoading(true);
        setError(null);
        const project = await loadProjectById(user, projectId);

        if (cancelled) return;

        if (!project) {
          setError("We couldn't find that project.");
          setActiveProjectState(null);
          setHasInitializedProject(true);
          return;
        }

        setActiveProjectState(project);
        setHasInitializedProject(true);
      } catch (loadError: any) {
        if (cancelled) return;
        setError(loadError?.message || "Failed to load project.");
        setActiveProjectState(null);
        setHasInitializedProject(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [mode, user, projectId]);

  useEffect(() => {
    if (mode === "new" && activeProject?.id) {
      router.replace(`/projects/${activeProject.id}`);
    }
  }, [mode, activeProject?.id, router]);

  useEffect(() => {
    if (hasInitializedProject && !loading && !error && activeProject === null) {
      router.push("/projects");
    }
  }, [hasInitializedProject, loading, error, activeProject, router]);

  const editorKey = useMemo(() => {
    if (mode === "new") return `new:${initialName ?? "untitled"}`;
    return `project:${projectId ?? "unknown"}`;
  }, [mode, projectId, initialName]);

  if (loading || !user) {
    return <LoadingState label={mode === "new" ? "Starting a new project..." : "Loading project..."} />;
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-base px-6">
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center shadow-xl">
          <h2 className="text-2xl font-black text-text">Project unavailable</h2>
          <p className="mt-3 text-sm text-subtext">{error}</p>
          <Link
            href="/projects"
            className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-bold text-base shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!activeProject) {
    return <LoadingState label="Preparing workspace..." />;
  }

  return (
    <RendererPage
      key={editorKey}
      user={user}
      onCreditDeduction={() => void refreshCredits(user)}
      activeProject={activeProject}
      setActiveProject={setActiveProjectState}
    />
  );
}
