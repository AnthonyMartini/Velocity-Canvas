"use client";

import AdminPage from "@/components/AdminPage";
import { useAppShell } from "@/features/app/AppShellProvider";

export default function WorkspaceAdminPage() {
  const { user, isAdmin } = useAppShell();

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center bg-base px-6">
        <div className="max-w-md rounded-3xl border border-overlay/30 bg-surface/50 p-8 text-center shadow-xl">
          <h2 className="text-2xl font-black text-text">Admin access required</h2>
          <p className="mt-3 text-sm text-subtext">
            This route is reserved for administrators. If you should have access, check your admin profile flag.
          </p>
        </div>
      </div>
    );
  }

  return <AdminPage user={user} />;
}
