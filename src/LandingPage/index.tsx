"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Bot,
  Boxes,
  LoaderCircle,
  PanelTop,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import { auth, googleProvider, upsertUserProfile } from "@/lib/firebase";
import {
  browserLocalPersistence,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

const REDIRECT_PENDING_KEY = "velocity-canvas-auth-redirect-pending";
const REDIRECT_ORIGIN_KEY = "velocity-canvas-auth-redirect-origin";
const PROMPT_TEXT = "Generate a responsive inventory dashboard...";
const YAML_LINES = [
  "Screens:",
  "  InventoryDashboard As screen:",
  "    Fill: =RGBA(5, 5, 5, 1)",
  '    HeaderTitle: ="Inventory Overview"',
  "    Components:",
  "      - Type: Container",
  "        Layout: Horizontal",
  "        Gap: 24",
  "      - Type: Gallery",
  '        Items: =Filter(Inventory, Status = "In Stock")',
  "      - Type: ModernButton",
  '        Text: ="Create Report"',
];

const FEATURE_CARDS = [
  {
    title: "AI-Powered YAML",
    icon: WandSparkles,
    eyebrow: "Prompt to structure",
    description:
      "Describe a screen in plain English and watch Velocity Canvas draft production-ready Power Apps YAML with layout, controls, and formulas already aligned.",
    stats: ['Prompt latency < 1 min', 'YAML-first editing'],
  },
  {
    title: "Live Canvas Preview",
    icon: PanelTop,
    eyebrow: "Design with feedback",
    description:
      "See every screen rendered in a live canvas as the AI edits it, so layout, spacing, and interaction choices stay visible while you iterate.",
    stats: ['Visual parity loop', 'Immediate validation'],
  },
  {
    title: "Component Library",
    icon: Boxes,
    eyebrow: "Reusable building blocks",
    description:
      "Save polished controls, remix them with AI, and keep a reusable inventory of components your team can ship across projects without drift.",
    stats: ['Team-ready assets', 'Library reuse flow'],
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function AmbientDataCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;
    let mouseX = width / 2;
    let mouseY = height / 2;
    let mouseActive = false;
    let lastFrameTime = performance.now();

    const DOT_SPACING = 22;
    const DOT_RADIUS = 1.15;
    const PULSE_RADIUS = 280;
    const pulseOffsets = new Map<string, number>();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handlePointerMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = event.clientX - rect.left;
      targetMouseY = event.clientY - rect.top;
      mouseActive = true;
    };

    const handlePointerLeave = () => {
      mouseActive = false;
    };

    const getPulseOffset = (x: number, y: number) => {
      const key = `${x}:${y}`;
      if (!pulseOffsets.has(key)) {
        pulseOffsets.set(key, Math.random() * Math.PI * 2);
      }
      return pulseOffsets.get(key) || 0;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      const now = performance.now();
      const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;
      const time = now * 0.0012;
      const idleDriftX = mouseActive
        ? Math.sin(time * 1.7) * 12 + Math.sin(time * 0.83 + 1.4) * 7
        : 0;
      const idleDriftY = mouseActive
        ? Math.cos(time * 1.45 + 0.6) * 10 + Math.sin(time * 0.72 + 2.1) * 6
        : 0;
      const driftTargetX = targetMouseX + idleDriftX;
      const driftTargetY = targetMouseY + idleDriftY;
      const chaseDx = driftTargetX - mouseX;
      const chaseDy = driftTargetY - mouseY;
      const chaseDistance = Math.hypot(chaseDx, chaseDy);
      const chaseSpeed = 500;

      if (chaseDistance > 0.001) {
        const step = Math.min(chaseDistance, chaseSpeed * deltaSeconds);
        mouseX += (chaseDx / chaseDistance) * step;
        mouseY += (chaseDy / chaseDistance) * step;
      }

      const startX = ((width % DOT_SPACING) / 2) - DOT_SPACING;
      const startY = ((height % DOT_SPACING) / 2) - DOT_SPACING;

      for (let x = startX; x <= width + DOT_SPACING; x += DOT_SPACING) {
        for (let y = startY; y <= height + DOT_SPACING; y += DOT_SPACING) {
          const dx = x - mouseX;
          const dy = y - mouseY;
          const distance = Math.hypot(dx, dy);
          const withinPulse = mouseActive && distance < PULSE_RADIUS;
          const distanceFactor = withinPulse ? 1 - distance / PULSE_RADIUS : 0;
          const dotOffset = getPulseOffset(x, y);
          const pulseWave = withinPulse
            ? (Math.sin(time * 3.8 + dotOffset) + 1) / 2
            : 0;
          const cursorIntensity = distanceFactor * (0.4 + pulseWave * 0.78);
          const breath = (Math.sin(time * 0.7) + 1) / 2;
          const shoreWave =
            (Math.sin(y * 0.018 - time * 2.35 + x * 0.0045 + dotOffset * 0.4) + 1) / 2;
          const ambientIntensity = Math.pow(shoreWave, 3) * (0.08 + breath * 0.07);
          const totalIntensity = clamp(cursorIntensity + ambientIntensity, 0, 1.35);
          const blueMix = clamp(cursorIntensity + ambientIntensity * 0.85, 0, 1);
          const radius = DOT_RADIUS + ambientIntensity * 1.15 + cursorIntensity * 2.15;
          const alpha = 0.24 + ambientIntensity * 0.2 + cursorIntensity * 0.34;
          const red = Math.round(92 - blueMix * 30);
          const green = Math.round(98 + blueMix * 108);
          const blue = Math.round(112 + blueMix * 143);

          context.beginPath();
          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          context.shadowColor =
            totalIntensity > 0.01 ? "rgba(0, 209, 255, 0.2)" : "rgba(0, 0, 0, 0)";
          context.shadowBlur =
            totalIntensity > 0.01 ? 3 + ambientIntensity * 9 + cursorIntensity * 15 : 0;
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fill();
        }
      }

      context.shadowBlur = 0;

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseleave", handlePointerLeave);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
      aria-hidden="true"
    />
  );
}

function FeatureCard({
  title,
  eyebrow,
  description,
  icon: Icon,
  delay,
}: {
  title: string;
  eyebrow: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className="group relative min-h-[260px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,19,28,0.92),rgba(8,10,15,0.92))] p-7 backdrop-blur-xl transition-colors hover:border-[#00D1FF]/25 hover:bg-[linear-gradient(180deg,rgba(18,22,30,0.95),rgba(9,11,16,0.94))]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#7f8aa1]">{eyebrow}</p>
          <div className="rounded-2xl bg-[#00D1FF]/10 p-3 text-[#8ef0ff]">
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-2xl font-black tracking-[-0.03em] text-white">{title}</h3>
          <p className="mt-4 max-w-[28ch] text-sm leading-7 text-[#96a0b5]">{description}</p>
        </div>
      </div>
    </motion.article>
  );
}

function FloatingIdeWindow({
  promptText,
  shownLines,
}: {
  promptText: string;
  shownLines: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="relative w-full overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.055] shadow-[0_32px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,209,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.18),transparent_34%)]" />

      <div className="relative z-10 border-b border-white/8 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2f]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#95a0b5]">
              Velocity Canvas IDE
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00D1FF]/20 bg-[#00D1FF]/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#8ef0ff]">
            <Bot className="h-3.5 w-3.5" />
            AI Session Live
          </div>
        </div>
      </div>

      <div className="relative z-10 grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-white/8 p-5 lg:border-b-0 lg:border-r">
          <div className="rounded-[26px] border border-white/8 bg-[#05070b]/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-3 border-b border-white/6 pb-4">
              <div className="rounded-2xl bg-[#00D1FF]/10 p-3 text-[#8ef0ff]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#7b859a]">Ghost Prompt</p>
                <p className="mt-1 text-sm text-[#d8e7f6]">Prompting the AI editor with layout intent</p>
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.02] p-5">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#7f8aa1]">
                <span className="h-2 w-2 rounded-full bg-[#00D1FF]" />
                ide.input.prompt
              </div>
              <div className="font-mono text-[15px] leading-8 text-[#dff8ff]">
                <span className="text-[#6a7487]">&gt;</span>{" "}
                {promptText}
                <motion.span
                  animate={{ opacity: [0.15, 1, 0.15] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  className="ml-1 inline-block h-[1.1em] w-[10px] translate-y-[3px] rounded-sm bg-[#00D1FF]"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7f8aa1]">Context</p>
                <p className="mt-3 text-sm leading-7 text-[#c9d7e8]">
                  AI-integrated IDE for Power Apps with layout-aware generation, formula-safe updates, and exportable YAML.
                </p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#7f8aa1]">Response Mode</p>
                <div className="mt-3 space-y-3 text-sm text-[#d7e4f2]">
                  <div className="flex items-center justify-between">
                    <span>Schema-safe output</span>
                    <span className="text-[#8ef0ff]">Enabled</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Preview sync</span>
                    <span className="text-[#8ef0ff]">Realtime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="rounded-[26px] border border-white/8 bg-[#040608]/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between border-b border-white/6 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#7b859a]">Generated YAML</p>
                <p className="mt-1 text-sm text-[#d8e7f6]">Rendered incrementally inside the editor</p>
              </div>
              <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 font-mono text-xs text-[#7f8aa1]">
                powerapps.yaml
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-white/8 bg-[#020304] px-0 py-2">
              {shownLines.map((line, index) => (
                <motion.div
                  key={`${line}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="grid grid-cols-[46px_1fr] gap-0 px-4 py-1.5 font-mono text-sm"
                >
                  <span className="select-none pr-4 text-right text-[#4b5568]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[#d8ecff]">{line}</span>
                </motion.div>
              ))}
              <div className="grid grid-cols-[46px_1fr] gap-0 px-4 py-1.5 font-mono text-sm">
                <span className="pr-4 text-right text-[#374151]">{String(shownLines.length + 1).padStart(2, "0")}</span>
                <motion.span
                  animate={{ opacity: [0.18, 1, 0.18] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  className="h-5 w-3 rounded-sm bg-[#00D1FF]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage({ onAuthenticated }: { onAuthenticated: (signedInUser?: any) => void }) {
  const [signingIn, setSigningIn] = useState(false);
  const [typedCount, setTypedCount] = useState(0);
  const [visibleLineCount, setVisibleLineCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const restoreRedirectSignIn = async () => {
      try {
        const result = await getRedirectResult(auth);
        const user = result?.user;
        if (!user) return;

        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(REDIRECT_PENDING_KEY);
          window.sessionStorage.removeItem(REDIRECT_ORIGIN_KEY);
        }
        if (cancelled) return;

        await upsertUserProfile(user);
        if (!cancelled) onAuthenticated(user);
      } catch (error: any) {
        if (cancelled) return;
        if (error?.code) {
          alert(`Firebase Sign-In Error: ${error.message || "Unable to complete Google sign-in."}`);
        }
      } finally {
        if (
          !auth.currentUser &&
          typeof window !== "undefined" &&
          window.sessionStorage.getItem(REDIRECT_PENDING_KEY) === "1" &&
          !cancelled
        ) {
          setSigningIn(false);
        }
      }
    };

    void restoreRedirectSignIn();

    return () => {
      cancelled = true;
    };
  }, [onAuthenticated]);

  useEffect(() => {
    setTypedCount(0);
    setVisibleLineCount(0);

    let typingTimer: number | undefined;
    let lineTimer: number | undefined;

    const typeNext = () => {
      setTypedCount((current) => {
        const next = current + 1;
        if (next < PROMPT_TEXT.length) {
          typingTimer = window.setTimeout(typeNext, 36);
        } else {
          lineTimer = window.setTimeout(() => {
            setVisibleLineCount(1);
          }, 240);
        }
        return next;
      });
    };

    typingTimer = window.setTimeout(typeNext, 420);

    const interval = window.setInterval(() => {
      setVisibleLineCount((current) => {
        if (current === 0 || current >= YAML_LINES.length) return current;
        return current + 1;
      });
    }, 160);

    return () => {
      window.clearTimeout(typingTimer);
      window.clearTimeout(lineTimer);
      window.clearInterval(interval);
    };
  }, []);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await upsertUserProfile(user);
      onAuthenticated(user);
    } catch (error: any) {
      if (error?.code === "auth/internal-error") {
        try {
          await setPersistence(auth, browserLocalPersistence);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(REDIRECT_PENDING_KEY, "1");
            window.sessionStorage.setItem(REDIRECT_ORIGIN_KEY, window.location.origin);
          }
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: any) {
          alert(`Firebase Sign-In Error: ${redirectError?.message || "Unable to start Google sign-in."}`);
          return;
        }
      }

      if (error?.code === "permission-denied") {
        alert('Permission Denied: Your Firestore rules may be blocking access to the "users" collection.');
      } else {
        alert(`Firebase Sign-In Error: ${error?.message || "Unknown error"}`);
      }

      if (auth.currentUser) {
        onAuthenticated(auth.currentUser);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const promptText = PROMPT_TEXT.slice(0, typedCount);
  const shownLines = useMemo(() => YAML_LINES.slice(0, clamp(visibleLineCount, 0, YAML_LINES.length)), [visibleLineCount]);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#050505] text-white selection:bg-[#00D1FF]/30 selection:text-white"
      style={{
        backgroundImage:
          "radial-gradient(circle at 15% 20%, rgba(67,56,202,0.16), transparent 28%), radial-gradient(circle at 78% 18%, rgba(51,65,85,0.25), transparent 24%), radial-gradient(circle at 60% 70%, rgba(14,165,233,0.09), transparent 28%), linear-gradient(180deg, rgba(5,5,5,1), rgba(5,5,5,0.98))",
      }}
    >
      <AmbientDataCanvas />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.045),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%,transparent_78%,rgba(255,255,255,0.02))]" />

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-0 top-0 z-20 px-4 pt-5 sm:px-6"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-1 py-2">
          <div className="flex items-center gap-3">
            <img src={logo.src} alt="Velocity Canvas logo" className="h-9 w-9 rounded-2xl" />
            <span className="text-base font-semibold tracking-[-0.02em] text-white">Velocity Canvas</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <a
              href="#"
              className="px-4 py-2 text-sm text-[#b3bfd4] transition-colors hover:text-white"
            >
              Product
            </a>
            <a
              href="#"
              className="px-4 py-2 text-sm text-[#b3bfd4] transition-colors hover:text-white"
            >
              Pricing
            </a>
          </nav>
        </div>
      </motion.header>

      <main className="relative z-10">
        <section id="product" className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-16 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
              className="max-w-5xl text-balance text-[3rem] font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-[4.7rem] lg:text-[6.25rem]"
              style={{ fontFamily: "Inter, Segoe UI, Helvetica Neue, Arial, sans-serif" }}
            >
              Build Power Apps at the speed of thought.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
              className="mt-8 max-w-3xl text-lg leading-8 text-[#9aa5bb] sm:text-xl"
            >
              Velocity Canvas blends AI prompting, live canvas rendering, and Power Apps YAML authoring into a single immersive workspace built for fast, exacting product teams.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], delay: 0.24 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
            >
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className={`group relative inline-flex min-w-[230px] items-center justify-center gap-3 overflow-hidden rounded-full px-7 py-4 text-base font-bold transition-all ${
                  signingIn
                    ? "cursor-wait bg-[#00D1FF] text-[#031017] opacity-80"
                    : "bg-[#00D1FF] text-[#031017] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,209,255,0.28)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_55px_rgba(0,209,255,0.38)]"
                }`}
              >
                <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.5),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {signingIn ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                <span className="relative">{signingIn ? "Signing in..." : "Continue with Google"}</span>
              </button>

              <a
                href="#features"
                className="inline-flex min-w-[190px] items-center justify-center gap-3 rounded-full border border-white/12 bg-white/[0.04] px-7 py-4 text-base font-semibold text-[#d8e7f6] transition-all hover:-translate-y-0.5 hover:border-[#00D1FF]/25 hover:bg-[#00D1FF]/8"
              >
                <BookOpen className="h-5 w-5 text-[#8ef0ff]" />
                Explore Docs
              </a>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
