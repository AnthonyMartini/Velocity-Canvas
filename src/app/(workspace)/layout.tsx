import type { ReactNode } from "react";
import WorkspaceShell from "@/features/app/WorkspaceShell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
