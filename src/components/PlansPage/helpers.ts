export function formatActivityDate(timestamp: string | number | Date) {
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatActivityTime(timestamp: string | number | Date) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
