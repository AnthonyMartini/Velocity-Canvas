"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  LoaderCircle,
  Sparkles,
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


export default function LandingPage({ onAuthenticated }: { onAuthenticated: (signedInUser?: any) => void }) {
  const [signingIn, setSigningIn] = useState(false);

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
          markRedirectSignInPending();
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
                    : "bg-[#FFFFFF] text-[#031017] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_40px_rgba(0,209,255,0.28)] hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_55px_rgba(0,209,255,0.38)]"
                }`}
              >
                <span className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.5),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                {signingIn ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                <span className="relative">{signingIn ? "Signing in..." : "Continue with Google"}</span>
              </button>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
