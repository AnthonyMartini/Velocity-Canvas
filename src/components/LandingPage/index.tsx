"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  LoaderCircle,
  Linkedin,
  Check,
  Sparkles,
  Zap,
  ClipboardCopy,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { auth, googleProvider, upsertUserProfile } from "@/lib/firebase";
import {
  browserLocalPersistence,
  getRedirectResult,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { REDIRECT_PENDING_KEY } from "./constants";
import { clamp, clearRedirectSessionState, markRedirectSignInPending } from "./helpers";

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

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.55-.21-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.27-2.1 3.57-5.2 3.57-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.87-3c-1.08.72-2.46 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.98H1.25v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.25A7.2 7.2 0 0 1 4.88 12c0-.78.13-1.54.37-2.25V6.66H1.25A12 12 0 0 0 0 12c0 1.94.47 3.77 1.25 5.34l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.1 15.23 0 12 0A12 12 0 0 0 1.25 6.66l4 3.09c.95-2.86 3.61-4.98 6.75-4.98Z"
      />
    </svg>
  );
}


export default function LandingPage({ onAuthenticated }: { onAuthenticated: (signedInUser?: any) => void }) {
  const [signingIn, setSigningIn] = useState(false);
  const popupFlowIdRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleRestartDemo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play();
    }
  };

  const isPopupDismissError = (errorCode: string) =>
    errorCode === "auth/popup-closed-by-user" ||
    errorCode === "auth/cancelled-popup-request" ||
    errorCode === "auth/user-cancelled" ||
    errorCode.startsWith("auth/popup-") ||
    errorCode.includes("cancel");

  useEffect(() => {
    let cancelled = false;

    const restoreRedirectSignIn = async () => {
      try {
        const result = await getRedirectResult(auth);
        const user = result?.user;
        if (!user) return;

        clearRedirectSessionState();
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


  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    popupFlowIdRef.current += 1;
    const flowId = popupFlowIdRef.current;

    const resetIfStillPending = () => {
      if (popupFlowIdRef.current !== flowId) return;
      if (!auth.currentUser) {
        setSigningIn(false);
      }
    };

    const onWindowFocus = () => {
      window.setTimeout(resetIfStillPending, 150);
    };
    window.addEventListener("focus", onWindowFocus, { once: true });
    const loadingGuardTimeout = window.setTimeout(resetIfStillPending, 15000);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      popupFlowIdRef.current += 1;
      const user = result.user;
      await upsertUserProfile(user);
      onAuthenticated(user);
    } catch (error: any) {
      const errorCode = String(error?.code || "");

      if (isPopupDismissError(errorCode)) {
        popupFlowIdRef.current += 1;
        setSigningIn(false);
        return;
      }

      if (errorCode === "auth/popup-blocked") {
        alert("Google sign-in popup was blocked by your browser. Please allow popups and try again.");
        return;
      }

      if (error?.code === "auth/internal-error") {
        try {
          await setPersistence(auth, browserLocalPersistence);
          markRedirectSignInPending();
          popupFlowIdRef.current += 1;
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
      window.clearTimeout(loadingGuardTimeout);
      window.removeEventListener("focus", onWindowFocus);
      setSigningIn(false);
    }
  };

  
  return (
    <div className="overflow-x-hidden bg-[#050505] text-white selection:bg-[#00D1FF]/30 selection:text-white">
      <div
        className="relative min-h-screen"
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
              <Image src={logo} alt="Velocity Canvas logo" width={36} height={36} className="rounded-2xl" priority />
              <span className="text-base font-semibold tracking-[-0.02em] text-white">Velocity Canvas</span>
            </div>

            <nav className="hidden items-center gap-1 md:flex">
              <a
                href="#demo"
                className="px-4 py-2 text-sm text-[#b3bfd4] transition-colors hover:text-white"
              >
                Product
              </a>
              <a
                href="#pricing"
                className="px-4 py-2 text-sm text-[#b3bfd4] transition-colors hover:text-white"
              >
                Pricing
              </a>
            </nav>
          </div>
        </motion.header>

        <section id="product" className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 py-16 sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
              className="max-w-5xl text-balance text-[3rem] font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-[4.7rem] lg:text-[6.25rem]"
              style={{ fontFamily: "Selawik, Segoe UI, Helvetica Neue, Arial, sans-serif" }}
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
                    ? "cursor-wait bg-[#FFFFFF] text-[#031017] opacity-90"
                    : "bg-[#FFFFFF] text-[#031017] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,209,255,0.28)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_55px_rgba(0,209,255,0.38)]"
                }`}
              >
                <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.5),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {signingIn ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
                <span className="relative">{signingIn ? "Signing in..." : "Continue with Google"}</span>
              </button>
            </motion.div>

            <motion.a
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], delay: 0.32 }}
              href="#demo"
              className="mt-16 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/90 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 hover:text-white"
              aria-label="Scroll to demo section"
            >
              <ArrowDown className="h-5 w-5" />
            </motion.a>
          </div>
        </section>
      </div>

      <section id="demo" className="flex min-h-screen items-center bg-[#020202] px-4 py-24 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Left Side: Features */}
            <div className="order-2 lg:order-1">
              <p className="text-xs uppercase tracking-[0.28em] text-[#6f7a92]">Product Demo</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                See Velocity Canvas in action
              </h2>
              
              <div className="mt-12 space-y-10">
                <div className="flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00D1FF]/10 text-[#00D1FF] shadow-[0_0_20px_rgba(0,209,255,0.1)]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">AI-Powered Creation</h3>
                    <p className="mt-2 text-[#94a0b8] leading-relaxed">
                      Prompt your way to professional layouts. The AI understands Power Apps logic and generates native YAML instantly.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00D1FF]/10 text-[#00D1FF] shadow-[0_0_20px_rgba(0,209,255,0.1)]">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Familiar Canvas Experience</h3>
                    <p className="mt-2 text-[#94a0b8] leading-relaxed">
                      Design in a workspace that mirrors the look and feel of Power Apps Studio. Transition your skills seamlessly with zero learning curve.
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00D1FF]/10 text-[#00D1FF] shadow-[0_0_20px_rgba(0,209,255,0.1)]">
                    <ClipboardCopy className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Seamless Integration</h3>
                    <p className="mt-2 text-[#94a0b8] leading-relaxed">
                      Copy-paste directly into Power Apps Studio. Your layouts are fully editable and native once imported.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Smaller Video */}
            <div className="relative order-1 lg:order-2">
              <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-tr from-[#00D1FF]/20 to-transparent blur-3xl opacity-50" />
              <div className="relative flex flex-col items-center">
                <div className="overflow-hidden rounded-[2rem] border border-[#00D1FF]/30 bg-[#070707] shadow-2xl">
                  <video
                    ref={videoRef}
                    className="w-full"
                    autoPlay
                    muted
                    loop
                    playsInline
                  >
                    <source src="/videos/preview.webm" type="video/webm" />
                    <source src="/videos/preview.mp4" type="video/mp4" />
                  </video>
                </div>
                <button
                  onClick={handleRestartDemo}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium text-[#6f7a92] transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restart Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#050505] px-4 py-32 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[#6f7a92]">Simple Pricing</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Built for fast-moving teams
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:max-w-4xl lg:mx-auto">
            {/* Free Plan */}
            <div className="flex flex-col rounded-3xl border border-white/5 bg-[#0A0A0A] p-8 transition-all hover:border-white/10">
              <div>
                <h3 className="text-lg font-medium text-white">Starter</h3>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-white">$0</span>
                  <span className="text-sm font-semibold text-[#6f7a92]">/one-time</span>
                </p>
                <p className="mt-6 text-sm leading-6 text-[#94a0b8]">
                  Perfect for trying out the AI builder and exploring the workspace.
                </p>
                <ul className="mt-8 space-y-4 text-sm leading-6 text-[#b3bfd4]">
                  <li className="flex gap-3">
                    <Check className="h-5 w-5 flex-none text-[#00D1FF]" />
                    25 one-time credits
                  </li>
                  <li className="flex gap-3">
                    <Check className="h-5 w-5 flex-none text-[#00D1FF]" />
                    Unlimited local projects
                  </li>
                  <li className="flex gap-3">
                    <Check className="h-5 w-5 flex-none text-[#00D1FF]" />
                    Full export to Power Apps
                  </li>
                </ul>
              </div>
              <button 
                onClick={handleGoogleSignIn}
                className="mt-10 block w-full rounded-2xl bg-[#00D1FF] py-4 px-4 text-center text-sm font-bold text-[#050505] transition hover:bg-[#00D1FF]/90 active:scale-[0.98]"
              >
                Start for Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative flex flex-col rounded-3xl border border-[#00D1FF]/20 bg-[#0A0A0A] p-8 transition-all hover:border-[#00D1FF]/40">
              <div className="absolute -top-4 left-8 rounded-full bg-[#00D1FF]/10 border border-[#00D1FF]/35 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#00D1FF]">
                Pro Plan
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Early Access Pro</h3>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-white">$10</span>
                  <span className="text-sm font-semibold text-[#6f7a92]">/month</span>
                </p>
                <p className="mt-6 text-sm leading-6 text-[#94a0b8]">
                  For power users who need high-volume AI generations every month.
                </p>
                <ul className="mt-8 space-y-4 text-sm leading-6 text-[#b3bfd4]">
                  <li className="flex gap-3">
                    <Check className="h-5 w-5 flex-none text-[#00D1FF]" />
                    Everything in Starter
                  </li>
                  <li className="flex gap-3">
                    <Check className="h-5 w-5 flex-none text-[#00D1FF]" />
                    500 credits per month
                  </li>
                  <li className="flex gap-3">
                    <Check className="h-5 w-5 flex-none text-[#00D1FF]" />
                    Priority access to models
                  </li>
                </ul>
              </div>
              <button 
                onClick={handleGoogleSignIn}
                className="mt-10 block w-full rounded-2xl border border-white/10 bg-white/5 py-4 px-4 text-center text-sm font-bold text-white transition hover:bg-white/10 active:scale-[0.98] cursor-pointer"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#020202] py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <p className="text-sm text-[#6f7a92]">
              Created by <span className="text-white font-medium">Anthony Martini</span>
            </p>
            
            <div className="flex items-center gap-8">
              <a 
                href="/terms" 
                className="text-sm text-[#6f7a92] transition-colors hover:text-white"
              >
                Terms of Service
              </a>
              <a 
                href="/privacy" 
                className="text-sm text-[#6f7a92] transition-colors hover:text-white"
              >
                Privacy Policy
              </a>
              <a 
                href="https://www.linkedin.com/in/anthony-martini/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#6f7a92] transition-colors hover:text-white"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
