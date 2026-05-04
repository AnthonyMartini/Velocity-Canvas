"use client";

import { notFound } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import the E2EPlayground to keep it out of the main production bundle
const E2EPlayground = dynamic(() => import("@/features/testing/E2EPlayground"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-base text-subtext">
      Loading E2E Test Environment...
    </div>
  ),
});

export default function TestE2EPage() {
  return <E2EPlayground />;
}
