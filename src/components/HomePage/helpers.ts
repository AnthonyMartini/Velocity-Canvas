import { DEFAULT_PROJECT_NAME } from "./constants";

export function getProjectDisplayName(name?: string | null) {
  return name || DEFAULT_PROJECT_NAME;
}

export function getProjectUpdatedLabel(updatedAt?: any) {
  if (!updatedAt) {
    return "Just now";
  }

  const rawValue = updatedAt._seconds ? updatedAt._seconds * 1000 : updatedAt;
  return new Date(rawValue).toLocaleDateString();
}
