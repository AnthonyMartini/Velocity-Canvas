import type { ProjectDocument } from "./api";

const PROJECT_SESSION_PREFIX = "velocity-canvas:project-session:";

export interface ProjectSessionSnapshot extends ProjectDocument {
  historyState?: {
    items: any[];
    index: number;
  };
  activeScreenId?: string | null;
  savedAt: number;
}

function getStorageKey(sessionKey: string) {
  return `${PROJECT_SESSION_PREFIX}${sessionKey}`;
}

export function readProjectSession(sessionKey: string): ProjectSessionSnapshot | null {
  if (typeof window === "undefined" || !sessionKey) return null;

  try {
    const raw = window.sessionStorage.getItem(getStorageKey(sessionKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return parsed as ProjectSessionSnapshot;
  } catch {
    return null;
  }
}

export function writeProjectSession(sessionKey: string, snapshot: ProjectDocument) {
  if (typeof window === "undefined" || !sessionKey) return;

  try {
    window.sessionStorage.setItem(
      getStorageKey(sessionKey),
      JSON.stringify({
        ...snapshot,
        savedAt: Date.now(),
      } satisfies ProjectSessionSnapshot),
    );
  } catch {
    // Ignore storage quota or serialization failures and keep the editor usable.
  }
}

export function clearProjectSession(sessionKey: string) {
  if (typeof window === "undefined" || !sessionKey) return;

  try {
    window.sessionStorage.removeItem(getStorageKey(sessionKey));
  } catch {
    // Ignore storage cleanup failures.
  }
}
