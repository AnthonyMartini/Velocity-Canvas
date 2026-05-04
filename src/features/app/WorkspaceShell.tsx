"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brackets, Moon, Sun } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAppShell } from "./AppShellProvider";
import { auth, db } from "@/lib/firebase";

const LIGHT_THEME_OVERRIDES: CSSProperties & Record<string, string> = {
  "--vc-color-base": "#e9edf4",
  "--vc-color-base-rgb": "233 237 244",
  "--vc-color-surface": "#f6f8fc",
  "--vc-color-surface-rgb": "246 248 252",
  "--vc-color-overlay": "#c8d1de",
  "--vc-color-overlay-rgb": "200 209 222",
  "--vc-color-accent": "#0e639c",
  "--vc-color-accent-rgb": "14 99 156",
  "--vc-color-accent-dark": "#0b5688",
  "--vc-color-accent-dark-rgb": "11 86 136",
  "--vc-color-text": "#111827",
  "--vc-color-text-rgb": "17 24 39",
  "--vc-color-subtext": "#5b6474",
  "--vc-color-subtext-rgb": "91 100 116",
  "--vc-color-green": "#0f9d78",
  "--vc-color-green-rgb": "15 157 120",
  "--vc-color-red": "#d14343",
  "--vc-color-red-rgb": "209 67 67",
  "--vc-color-yellow": "#b7791f",
  "--vc-color-yellow-rgb": "183 121 31",
  "--vc-color-white": "#ffffff",
  "--vc-color-panel": "#e6ebf3",
  "--vc-color-panel-scrim": "rgba(15, 23, 42, 0.12)",
  "--vc-color-canvas-workspace": "#e4eaf2",
  "--vc-color-canvas-surface": "#f7f9fc",
  "--vc-color-canvas-grid-dot": "#d1d9e5",
  "--vc-color-selection": "#0e639c",
  "--vc-color-selection-soft": "rgba(14, 99, 156, 0.14)",
  "--vc-color-selection-strong": "rgba(14, 99, 156, 0.26)",
  "--vc-color-gallery-selection": "#7c3aed",
  "--vc-color-gallery-selection-soft": "rgba(124, 58, 237, 0.16)",
  "--vc-color-gallery-selection-strong": "rgba(124, 58, 237, 0.28)",
  "--vc-color-control-text": "#111827",
  "--vc-color-control-text-muted": "#64748b",
  "--vc-color-control-border": "#c7d0dd",
  "--vc-color-control-border-strong": "#aab7ca",
  "--vc-color-control-surface": "#f8fafd",
  "--vc-color-control-disabled": "#94a3b8",
  "--vc-color-control-disabled-fill": "#e7edf4",
  "--vc-color-placeholder": "#94a3b8",
  "--vc-gradient-ask-ai": "linear-gradient(180deg,#38bdf8 0%,#0ea5e9 45%,#0284c7 100%)",
  "--vc-shadow-selection": "0 0 0 3px rgba(14, 99, 156, 0.16)",
  "--vc-shadow-selection-inset": "0 0 0 2px rgba(14, 99, 156, 0.9) inset",
  "--vc-shadow-gallery-selection": "0 0 0 3px rgba(124, 58, 237, 0.18)",
  "--vc-shadow-gallery-selection-inset": "0 0 0 2px rgba(124, 58, 237, 0.8) inset",
  "--vc-shadow-canvas": "0 18px 36px rgba(15, 23, 42, 0.07), 0 0 0 1px rgba(15,23,42,0.05)",
  "--vc-shadow-control-rest": "0 8px 20px rgba(15, 23, 42, 0.07)",
  "--vc-shadow-drag-guide": "0 0 6px rgba(14, 99, 156, 0.18)",
  "--vc-shadow-floating-panel": "0 24px 64px rgba(15, 23, 42, 0.18)",
  "--vc-shadow-spotlight": "0 0 24px rgba(14, 99, 156, 0.12)",
  "--vc-shadow-chat-dock": "0 -14px 40px rgba(15, 23, 42, 0.1)",
};

const ProjectsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.99 9a.75.75 0 11-1.06 1.06L20 13.43V20.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4H10v4a.75.75 0 01-.75.75H4.75a.75.75 0 01-.75-.75v-7.07l-.47.47a.75.75 0 11-1.06-1.06l8.99-9z" />
  </svg>
);

const DocsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c1.68 0 3.282.515 4.75 1.407A.75.75 0 0 0 24 19.462V5.212a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
  </svg>
);

const AdminIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path
      fillRule="evenodd"
      d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.097.078.16.208.16.336a7.158 7.158 0 0 0 0 1.954c0 .128-.063.258-.16.336l-.84.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.31.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.675-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.098-.078-.161-.208-.161-.336a7.158 7.158 0 0 0 0-1.954c0-.128.063-.258.16-.336l.84-.692a1.875 1.875 0 0 0 .432-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"
      clipRule="evenodd"
    />
  </svg>
);

const LAST_PROJECT_ROUTE_KEY = "velocity-canvas:last-project-route";

const FormulaParserNavIcon = () => <Brackets className="h-4 w-4" />;

function isPathActive(pathname: string, href: string) {
  if (href === "/projects") return pathname.startsWith("/projects");
  return pathname === href;
}

type FeedbackType = "bug" | "suggestion" | "other";

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const [projectsHref, setProjectsHref] = useState("/projects");
  const { user, authLoading, credits, isAdmin, isDarkMode, isImmersiveMode, setIsDarkMode, signOutUser } =
    useAppShell();

  // Feedback state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [wantsReply, setWantsReply] = useState(true);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Close feedback dropdown on outside click
  useEffect(() => {
    if (!feedbackOpen) return;
    function handleOutside(e: MouseEvent) {
      if (feedbackRef.current && !feedbackRef.current.contains(e.target as Node)) {
        setFeedbackOpen(false);
        setFeedbackSuccess(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [feedbackOpen]);

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim() || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          type: feedbackType,
          message: feedbackMessage.trim(),
          wantsReply: wantsReply && Boolean(user?.email),
          email: user?.email ?? null,
          path: pathname ?? "/",
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit feedback');
      }

      setFeedbackMessage("");
      setFeedbackSuccess(true);
      setTimeout(() => {
        setFeedbackOpen(false);
        setFeedbackSuccess(false);
      }, 2200);
    } catch (err) {
      console.error("Feedback submit error:", err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedRoute = window.sessionStorage.getItem(LAST_PROJECT_ROUTE_KEY);
    if (savedRoute?.startsWith("/projects/")) {
      setProjectsHref(savedRoute);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (currentPath.startsWith("/projects/")) {
      window.sessionStorage.setItem(LAST_PROJECT_ROUTE_KEY, currentPath);
      setProjectsHref(currentPath);
      return;
    }

    if (currentPath === "/projects") {
      setProjectsHref("/projects");
    }
  }, [currentPath]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-base">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const navItems = [
    { href: projectsHref, matchHref: "/projects", label: "Projects", Icon: ProjectsIcon },
    { href: "/docs", label: "Documentation", Icon: DocsIcon },
    ...(isAdmin ? [{ href: "/formula-builder", label: "Formula builder", Icon: FormulaParserNavIcon }] : []),
    ...(isAdmin ? [{ href: "/admin", matchHref: "/admin", label: "Admin", Icon: AdminIcon }] : []),
  ];

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-base"
      style={isDarkMode ? undefined : LIGHT_THEME_OVERRIDES}
    >
      {!isImmersiveMode && (
        <header className="sticky top-0 z-10 shrink-0 border-b border-surface/60 bg-base/90 backdrop-blur-sm">
          <div className="relative flex items-center justify-between px-6 py-3">
            <Link
              href="/projects"
              onClick={(e) => {
                if (currentPath.startsWith("/projects/")) {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("velocity-canvas:exit-editor"));
                }
              }}
              className="flex items-center gap-3"
            >
              <Image
                src={logo}
                alt="Velocity Canvas Logo"
                width={45}
                height={45}
                className="h-11 w-11"
              />
              <div>
                <h1 className="text-lg font-bold leading-tight tracking-tight text-text">Velocity Canvas</h1>
                <p className="text-xs leading-tight text-subtext">Power Apps UI Generator</p>
              </div>
            </Link>

            <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-overlay/40 bg-surface/50 p-1">
              {navItems.map(({ href, matchHref, label, Icon }) => {
                const active = isPathActive(currentPath, matchHref ?? href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-accent text-base shadow-md shadow-accent/30"
                        : "text-subtext hover:bg-overlay/40 hover:text-text"
                    }`}
                  >
                    <Icon />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              {/* Feedback Button */}
              <div ref={feedbackRef} className="relative">
                <button
                  type="button"
                  id="feedback-trigger"
                  onClick={() => { setFeedbackOpen((prev) => !prev); setFeedbackSuccess(false); }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
                    feedbackOpen
                      ? "bg-accent-dark text-white scale-95 shadow-inner"
                      : "bg-accent text-white hover:bg-accent-dark hover:scale-105 shadow-accent/20 animate-soft-pulse"
                  }`}
                  title="Send feedback"
                  aria-label="Send feedback"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>

                {feedbackOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-overlay/30 shadow-[var(--vc-shadow-floating-panel)]"
                    style={{ backgroundColor: "var(--vc-color-surface)" }}
                  >
                    {feedbackSuccess ? (
                      <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                          <svg className="h-6 w-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text">Thanks for the feedback!</p>
                          <p className="mt-1 text-xs text-subtext">We really appreciate you taking the time.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="border-b border-overlay/20 px-4 py-3">
                          <p className="text-sm font-semibold text-text">Send Feedback</p>
                          <p className="mt-0.5 text-xs text-subtext">Help us improve Velocity Canvas</p>
                        </div>

                        <div className="px-4 py-3">
                          {/* Feedback type pills */}
                          <div className="mb-3 flex gap-1.5">
                            {(["suggestion", "bug", "other"] as FeedbackType[]).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setFeedbackType(t)}
                                className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold capitalize transition-all ${
                                  feedbackType === t
                                    ? t === "bug"
                                      ? "bg-red/15 text-red border border-red/30"
                                      : t === "suggestion"
                                      ? "bg-accent/15 text-accent border border-accent/30"
                                      : "bg-overlay/40 text-text border border-overlay/40"
                                    : "border border-overlay/25 text-subtext hover:bg-overlay/20 hover:text-text"
                                }`}
                              >
                                {t === "bug" ? "🐛 Bug" : t === "suggestion" ? "💡 Idea" : "💬 Other"}
                              </button>
                            ))}
                          </div>

                          {/* Message textarea */}
                          <textarea
                            rows={4}
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                            placeholder={feedbackType === "bug" ? "Describe what went wrong..." : feedbackType === "suggestion" ? "Share your idea or feature request..." : "What's on your mind?"}
                            className="w-full resize-none rounded-xl border border-overlay/30 bg-base/80 px-3 py-2.5 text-sm text-text placeholder:text-subtext/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all"
                          />

                          {/* Reply checkbox */}
                          <label className="mt-2.5 flex cursor-pointer items-start gap-2.5">
                            <div className="relative mt-0.5 shrink-0">
                              <input
                                type="checkbox"
                                checked={wantsReply}
                                onChange={(e) => setWantsReply(e.target.checked)}
                                className="peer sr-only"
                                id="feedback-wants-reply"
                              />
                              <div className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                                wantsReply
                                  ? "border-accent bg-accent"
                                  : "border-overlay/50 bg-base/80 hover:border-overlay"
                              }`}>
                                {wantsReply && (
                                  <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="leading-snug">
                              <span className="text-xs font-medium text-text">Reply to my email</span>
                              {user?.email && (
                                <p className="mt-0.5 text-[10px] text-subtext/70 truncate max-w-[210px]">{user.email}</p>
                              )}
                            </div>
                          </label>

                          <button
                            type="button"
                            disabled={!feedbackMessage.trim() || feedbackSubmitting}
                            onClick={handleFeedbackSubmit}
                            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {feedbackSubmitting ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            ) : (
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m22 2-7 20-4-9-9-4Z" />
                                <path d="M22 2 11 13" />
                              </svg>
                            )}
                            {feedbackSubmitting ? "Sending..." : "Send Feedback"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Dark mode toggle */}
              <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-overlay/40 bg-surface/55 text-subtext shadow-sm transition-all duration-200 hover:bg-overlay/35 hover:text-text"
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {credits !== null && (
                <Link
                  href="/plans"
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm transition-all duration-200 ${
                    currentPath === "/plans"
                      ? "border-accent bg-accent text-base ring-2 ring-accent/20"
                      : "border-accent/20 bg-accent/10 hover:border-accent/30 hover:bg-accent/20"
                  }`}
                >
                  <div className="flex flex-col items-center leading-none">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        currentPath === "/plans" ? "text-base/70" : "text-accent/70"
                      }`}
                    >
                      Credits
                    </span>
                    <span className={`text-sm font-black ${currentPath === "/plans" ? "text-base" : "text-text"}`}>
                      {credits}
                    </span>
                  </div>
                </Link>
              )}

              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? "User"}
                    className="h-7 w-7 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                )}
                <button
                  onClick={() => void signOutUser()}
                  className="cursor-pointer text-xs text-subtext transition-colors hover:text-text"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
