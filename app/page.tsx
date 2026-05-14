"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Object3D } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  attachHomeModelViewer,
  type ExitSpin,
  type HomeModelSize,
} from "@/lib/homeModelViewer";

const HERO_COPY = [
  {
    title: "Bold by Design",
    body: "A striking BMW presence shaped by clean lines, premium details, and a performance-focused attitude.",
    showCta: true,
  },
  {
    title: "Commanding Front",
    body: "Sharp headlights, sculpted edges, and a fierce front built to lead every path towards your goals.",
    showCta: false,
  },
  {
    title: "Built Around You",
    body: "A refined cabin with premium materials, smart controls, and every detail focused on the driver.",
    showCta: false,
  },
] as const;

const HERO_STATS = [
  {
    label: "0-100 km/h",
    value: "3.8s",
    detail: "M4 COMPETITION",
    icon: "speed",
  },
  {
    label: "Power",
    value: "510 hp",
    detail: "3.0L TWINPOWER TURBO",
    icon: "power",
  },
  {
    label: "Heritage",
    value: "50+",
    detail: "YEARS OF M",
    icon: "heritage",
  },
] as const;

const NAVBAR_HEIGHT = 72;
const MOBILE_CANVAS_BREAKPOINT = 768;
const MOBILE_CANVAS_MIN_HEIGHT = 220;
const MOBILE_MODEL_YAW = 0.45;

function HeroStatIcon({ icon }: { icon: (typeof HERO_STATS)[number]["icon"] }) {
  if (icon === "speed") {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-9 w-9 text-white"
        aria-hidden
      >
        <path d="M7 22a9 9 0 1118 0" />
        <path d="M16 13l5 5" />
        <path d="M9 22h14" />
        <path d="M10.5 11.5l1.8 1.8" />
        <path d="M21.5 11.5l-1.8 1.8" />
      </svg>
    );
  }

  if (icon === "power") {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-9 w-9 text-white"
        aria-hidden
      >
        <path d="M7 14h3l2-3h8l2 3h3v8h-3l-2 2H12l-2-2H7z" />
        <path d="M13 8h6" />
        <path d="M16 15v5" />
        <path d="M13.5 17.5H18.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 56 24" className="h-9 w-16" aria-hidden>
      <path d="M6 22h11L27 2H16z" fill="#0066b1" />
      <path d="M19 22h11L40 2H29z" fill="#1c69d4" />
      <path d="M32 22h11L53 2H42z" fill="#e22718" />
      <path
        d="M43.5 22V6.5h4.2l3.2 7.3 3.2-7.3H56V22h-3V11.6L49.4 19h-1.7L44 11.6V22z"
        fill="#fff"
      />
    </svg>
  );
}

export default function HomeModelViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const modelRootRef = useRef<Object3D | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const exitSpinRef = useRef<ExitSpin | null>(null);
  const activeHeroRef = useRef(0);
  const navigateTimeoutRef = useRef<number | null>(null);
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelSize, setModelSize] = useState<HomeModelSize | null>(null);
  const [mobileCanvasHeight, setMobileCanvasHeight] = useState<number | null>(
    null,
  );

  useEffect(
    () => () => {
      if (navigateTimeoutRef.current != null) {
        window.clearTimeout(navigateTimeoutRef.current);
        navigateTimeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const panels = root.querySelectorAll<HTMLElement>("[data-hero-panel]");
    const observer = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!best?.target) return;
        const raw = (best.target as HTMLElement).dataset.heroIndex;
        const idx = raw != null ? Number.parseInt(raw, 10) : NaN;
        if (!Number.isNaN(idx) && idx >= 0 && idx <= 2) {
          activeHeroRef.current = idx;
        }
      },
      { root, rootMargin: "0px", threshold: [0.38, 0.52, 0.68] },
    );

    panels.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleStartCustomising = () => {
    if (isExiting) return;
    setIsExiting(true);

    const controls = controlsRef.current;
    if (controls) {
      controls.autoRotate = false;
      controls.enableRotate = false;
      controls.enabled = false;
    }

    const startY = modelRootRef.current?.rotation.y ?? -0.45;
    const endTarget = Math.PI / 4;
    const twoPi = Math.PI * 2;
    const remainder = (((endTarget - startY) % twoPi) + twoPi) % twoPi;
    const toY = startY + twoPi + remainder;

    exitSpinRef.current = {
      start: performance.now(),
      duration: 2200,
      fromY: startY,
      toY,
    };

    if (navigateTimeoutRef.current != null) {
      window.clearTimeout(navigateTimeoutRef.current);
    }
    navigateTimeoutRef.current = window.setTimeout(() => {
      navigateTimeoutRef.current = null;
      router.push("/customising/bmw-i4");
    }, 2200);
  };

  const handleExploreModels = () => {
    if (isExiting) return;
    router.push("/models");
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const mountNode = mountRef.current;
    return attachHomeModelViewer(mountNode, {
      modelRootRef,
      controlsRef,
      exitSpinRef,
      activeHeroRef,
      onLoadingChange: setIsModelLoading,
      onModelSizeChange: setModelSize,
    });
  }, []);

  useEffect(() => {
    const updateMobileCanvasHeight = () => {
      if (typeof window === "undefined") return;

      if (window.innerWidth >= MOBILE_CANVAS_BREAKPOINT || !modelSize) {
        setMobileCanvasHeight(null);
        return;
      }

      const availableHeight = Math.max(0, window.innerHeight - NAVBAR_HEIGHT);
      const rotatedWidth =
        Math.abs(modelSize.width * Math.cos(MOBILE_MODEL_YAW)) +
        Math.abs(modelSize.depth * Math.sin(MOBILE_MODEL_YAW));

      const fittedHeight = Math.round(
        (window.innerWidth * modelSize.height) / (rotatedWidth * 1.12),
      );

      setMobileCanvasHeight(
        Math.max(
          MOBILE_CANVAS_MIN_HEIGHT,
          Math.min(availableHeight, fittedHeight),
        ),
      );
    };

    updateMobileCanvasHeight();
    window.addEventListener("resize", updateMobileCanvasHeight);
    return () => window.removeEventListener("resize", updateMobileCanvasHeight);
  }, [modelSize]);

  const forwardWheelToScroll = (event: React.WheelEvent) => {
    const sc = scrollRef.current;
    if (!sc) return;
    sc.scrollTop += event.deltaY;
    event.preventDefault();
  };

  const mobileCanvasHeightStyle =
    mobileCanvasHeight == null
      ? undefined
      : ({ height: `${mobileCanvasHeight}px` } as React.CSSProperties);

  const mobileCanvasSpacerStyle =
    mobileCanvasHeight == null
      ? undefined
      : ({ minHeight: `${mobileCanvasHeight}px` } as React.CSSProperties);

  return (
    <div className="relative h-[calc(100dvh-72px)] w-full overflow-hidden bg-[radial-gradient(circle_at_18%_22%,#102a4f_0%,#081629_38%,#050d18_72%,#040a14_100%)] text-slate-100">
      <div
        style={mobileCanvasHeightStyle}
        className="pointer-events-auto fixed left-0 top-[72px] z-30 h-[42vh] w-full md:h-[calc(100dvh-72px)] md:w-[65%]"
        onWheel={forwardWheelToScroll}
      >
        {isModelLoading ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#04101d]/35">
            <div className="rounded-full border border-white/15 bg-[#081629]/70 px-5 py-2 text-sm font-medium uppercase tracking-[0.25em] text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
              Loading...
            </div>
          </div>
        ) : null}
        <div
          ref={mountRef}
          className={`h-full w-full transition duration-500 ${
            isModelLoading
              ? "pointer-events-none scale-[1.01] blur-md"
              : "cursor-grab blur-0 active:cursor-grabbing"
          }`}
        />
      </div>

      <div
        ref={scrollRef}
        className="h-[calc(100dvh-72px)] snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain"
      >
        {HERO_COPY.map((hero, index) => (
          <section
            key={hero.title}
            data-hero-panel
            data-hero-index={index}
            className="grid min-h-[calc(100dvh-72px)] snap-start snap-always grid-cols-1 md:grid-cols-[65%_35%]"
          >
            <div
              style={mobileCanvasSpacerStyle}
              className="min-h-[42vh] shrink-0 md:min-h-0"
              aria-hidden
            />
            <aside
              id={index === 0 ? "homepage_intro" : undefined}
              className={`relative z-10 flex min-h-0 flex-col overflow-hidden bg-[#060d1b] transition-all duration-700 ${
                index === 0 && isExiting
                  ? // ? "pointer-events-none translate-x-full opacity-0 animate-slideOutRight"
                    "pointer-events-none"
                  : ""
              }`}
            >
              {index === 0 ? (
                <>
                  <div className="flex-1 bg-[radial-gradient(circle_at_top_left,rgba(18,58,120,0.25),transparent_42%),linear-gradient(180deg,#020812_0%,#040913_48%,#050a14_100%)] px-6 pb-10 pt-10 sm:px-8 md:px-10 md:pb-12 md:pt-12">
                    <p className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-[#1b66df] sm:text-xs">
                      The Ultimate Driving Machine
                    </p>

                    <div className="mt-7">
                      <h1 className="text-[3.5rem] font-semibold uppercase leading-[0.86] tracking-[-0.04em] text-white sm:text-[4.7rem] md:text-[5.9rem]">
                        BOLD BY
                      </h1>
                      <h1 className="mt-1 text-[3.5rem] font-semibold uppercase leading-[0.86] tracking-[-0.04em] text-[#0d66e9] sm:text-[4.7rem] md:text-[5.9rem]">
                        DESIGN.
                      </h1>
                    </div>

                    <div className="mt-8 flex items-center gap-1.5">
                      <span className="h-[3px] w-10 rounded-full bg-white/95" />
                      <span className="h-[3px] w-14 rounded-full bg-[#0066b1]" />
                      <span className="h-[3px] w-8 rounded-full bg-[#e22718]" />
                    </div>

                    <p className="mt-8 max-w-[26ch] text-lg leading-[1.6] text-slate-300 md:max-w-[28ch] md:text-[1.15rem]">
                      {hero.body}
                    </p>

                    <div className="mt-10 grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={handleStartCustomising}
                        className="inline-flex min-h-16 items-center justify-center gap-4 rounded-2xl border border-[#2f7cff] bg-[linear-gradient(180deg,#1f73ff_0%,#0a57d9_100%)] px-6 text-lg font-semibold text-white shadow-[0_18px_40px_rgba(5,50,130,0.34)] transition hover:brightness-110"
                      >
                        <span>Start Customising</span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="h-6 w-6"
                          aria-hidden
                        >
                          <path d="M5 12h14" strokeLinecap="round" />
                          <path
                            d="M13 6l6 6-6 6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={handleExploreModels}
                        className="inline-flex min-h-16 items-center justify-center rounded-2xl border border-white/20 bg-black/30 px-6 text-lg font-semibold text-white transition hover:border-white/35 hover:bg-white/5"
                      >
                        Explore Models
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-white/8 bg-[linear-gradient(180deg,rgba(8,13,23,0.96)_0%,rgba(4,8,15,0.98)_100%)]">
                    <div className="grid grid-cols-3">
                      {HERO_STATS.map((stat, statIndex) => (
                        <div
                          key={stat.label}
                          className={`px-6 py-6 sm:px-7 ${
                            statIndex === 0 ? "" : "border-l border-white/8"
                          }`}
                        >
                          <HeroStatIcon icon={stat.icon} />
                          <p className="mt-3 text-[0.9rem] text-slate-300 sm:text-[1.05rem]">
                            {stat.label}
                          </p>
                          <p className="mt-2 text-[2.1rem] font-semibold leading-none tracking-[-0.03em] text-white sm:text-[3rem]">
                            {stat.value}
                          </p>
                          <p className="mt-2 text-[0.82rem] uppercase tracking-[0.08em] text-slate-400 sm:text-[0.92rem]">
                            {stat.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col justify-center bg-[#060d1b] px-8 pb-16 pt-24 md:px-12">
                  <h1 className="max-w-[14ch] text-5xl font-semibold uppercase leading-[0.92] tracking-[0.02em] text-white md:max-w-[9ch] md:text-7xl">
                    {hero.title}
                  </h1>
                  <p className="mt-6 max-w-[42ch] text-sm leading-7 text-slate-300">
                    {hero.body}
                  </p>
                </div>
              )}
            </aside>
          </section>
        ))}
      </div>
    </div>
  );
}
