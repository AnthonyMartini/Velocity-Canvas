export interface ProjectDocument {
  id?: string | null;
  name?: string;
  tree?: any[];
  canvasW?: number;
  canvasH?: number;
  canvasTheme?: any;
  updatedAt?: any;
  isNew?: boolean;
}

async function getAuthHeaders(user: { getIdToken: () => Promise<string> }) {
  const idToken = await user.getIdToken();
  return { Authorization: `Bearer ${idToken}` };
}

export async function listProjects(user: { getIdToken: () => Promise<string> }): Promise<ProjectDocument[]> {
  const res = await fetch("/api/projects", {
    headers: await getAuthHeaders(user),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch projects");
  }

  return data.projects || [];
}

export async function loadProjectById(
  user: { getIdToken: () => Promise<string> },
  projectId: string,
): Promise<ProjectDocument | null> {
  const res = await fetch(`/api/projects?id=${encodeURIComponent(projectId)}`, {
    headers: await getAuthHeaders(user),
  });
  const data = await res.json();

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(data.error || "Failed to load project");
  }

  return data.project ?? null;
}

export async function saveProjectDocument(
  user: { getIdToken: () => Promise<string> },
  payload: Record<string, any>,
) {
  const headers = await getAuthHeaders(user);
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to save project");
  }

  return data;
}

export async function deleteProjectById(user: { getIdToken: () => Promise<string> }, projectId: string) {
  const res = await fetch(`/api/projects?id=${projectId}`, {
    method: "DELETE",
    headers: await getAuthHeaders(user),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete project");
  }

  return data;
}
