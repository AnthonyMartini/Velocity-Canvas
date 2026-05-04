"use client";

import RendererPage from "@/components/RendererPage";
import { useState } from "react";

export default function E2EPlayground() {
  const dummyUser = { uid: "test-user-id", email: "test@example.com", getIdToken: async () => "dummy-token" } as any;
  const [activeProject, setActiveProject] = useState<any>({
    id: "test-project",
    name: "Test E2E Project",
    isNew: false,
  });

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-base">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <RendererPage
          user={dummyUser}
          onCreditDeduction={() => {}}
          activeProject={activeProject}
          projectSessionKey="test-e2e-session"
          setActiveProject={setActiveProject}
        />
      </main>
    </div>
  );
}
