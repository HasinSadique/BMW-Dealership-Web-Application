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

const HERO_SECONDARY = [
  {
    eyebrow: "Exterior Presence",
    titleLine1: "COMMANDING",
    titleLine2: "FRONT.",
    highlights: [
      { label: "Adaptive LED", value: "Laser-light tech", icon: "light" },
      { label: "Kidney Grille", value: "M mesh design", icon: "grille" },
      { label: "Front Aero", value: "Track-tuned flow", icon: "aero" },
    ],
  },
  {
    eyebrow: "Interior Craft",
    titleLine1: "BUILT AROUND",
    titleLine2: "YOU.",
    highlights: [
      { label: "M Sport Seats", value: "Bolstered support", icon: "seat" },
      { label: "Curved Display", value: "iDrive 8.5", icon: "display" },
      { label: "Premium Trim", value: "Alcantara & leather", icon: "trim" },
    ],
  },
] as const;

type HeroLiteIcon =
  (typeof HERO_SECONDARY)[number]["highlights"][number]["icon"];

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
const MOBILE_HERO_CANVAS_MAX_RATIO = 0.4;
const MOBILE_MODEL_YAW = 0.45;

function HeroStatIcon({
  icon,
  compact = false,
}: {
  icon: (typeof HERO_STATS)[number]["icon"];
  compact?: boolean;
}) {
  const iconClass = compact ? "h-7 w-7 text-white" : "h-9 w-9 text-white";
  const mLogoClass = compact ? "h-7 w-12" : "h-9 w-16";
  if (icon === "speed") {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={iconClass}
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
        className={iconClass}
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
    <svg viewBox="0 0 56 24" className={mLogoClass} aria-hidden>
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

function HeroPrimaryPanel({
  body,
  onStartCustomising,
  onExploreModels,
}: {
  body: string;
  onStartCustomising: () => void;
  onExploreModels: () => void;
}) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(18,58,120,0.25),transparent_42%),linear-gradient(180deg,#020812_0%,#040913_48%,#050a14_100%)] px-5 py-4 sm:px-7 sm:py-5 md:px-8 md:py-5 lg:px-9">
        <p className="text-[clamp(0.62rem,1.05dvh,0.72rem)] font-medium uppercase tracking-[0.38em] text-[#1b66df] sm:tracking-[0.42em]">
          The Ultimate Driving Machine
        </p>

        <div className="mt-[clamp(0.5rem,1.6dvh,1.25rem)]">
          <h1 className="text-[clamp(1.85rem,5.8dvh,3.15rem)] font-semibold uppercase leading-[0.88] tracking-[-0.04em] text-white">
            BOLD BY
          </h1>
          <h1 className="mt-0.5 text-[clamp(1.85rem,5.8dvh,3.15rem)] font-semibold uppercase leading-[0.88] tracking-[-0.04em] text-[#0d66e9]">
            DESIGN.
          </h1>
        </div>

        <div className="mt-[clamp(0.5rem,1.8dvh,1.25rem)] flex items-center gap-1.5">
          <span className="h-[2px] w-8 rounded-full bg-white/95 sm:h-[3px] sm:w-10" />
          <span className="h-[2px] w-11 rounded-full bg-[#0066b1] sm:h-[3px] sm:w-14" />
          <span className="h-[2px] w-6 rounded-full bg-[#e22718] sm:h-[3px] sm:w-8" />
        </div>

        <p className="mt-[clamp(0.5rem,1.8dvh,1.25rem)] max-w-[26ch] text-[clamp(0.82rem,1.65dvh,1.05rem)] leading-[1.55] text-slate-300 md:max-w-[28ch]">
          {body}
        </p>

        <div className="mt-[clamp(0.65rem,2.2dvh,1.35rem)] grid grid-cols-2 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onStartCustomising}
            className="inline-flex min-h-[clamp(2.65rem,7dvh,3.35rem)] items-center justify-center gap-2 rounded-xl border border-[#2f7cff] bg-[linear-gradient(180deg,#1f73ff_0%,#0a57d9_100%)] px-3 text-[clamp(0.78rem,1.55dvh,0.98rem)] font-semibold text-white shadow-[0_14px_32px_rgba(5,50,130,0.3)] transition hover:brightness-110 sm:gap-3 sm:rounded-2xl sm:px-4"
          >
            <span>Start Customising</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-[clamp(1rem,2.2dvh,1.35rem)] w-[clamp(1rem,2.2dvh,1.35rem)] shrink-0"
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
            onClick={onExploreModels}
            className="inline-flex min-h-[clamp(2.65rem,7dvh,3.35rem)] items-center justify-center rounded-xl border border-white/20 bg-black/30 px-3 text-[clamp(0.78rem,1.55dvh,0.98rem)] font-semibold text-white transition hover:border-white/35 hover:bg-white/5 sm:rounded-2xl sm:px-4"
          >
            Explore Models
          </button>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/8 bg-[linear-gradient(180deg,rgba(8,13,23,0.96)_0%,rgba(4,8,15,0.98)_100%)]">
        <div className="grid grid-cols-3">
          {HERO_STATS.map((stat, statIndex) => (
            <div
              key={stat.label}
              className={`px-3 py-3 sm:px-5 sm:py-4 md:px-5 md:py-4 ${
                statIndex === 0 ? "" : "border-l border-white/8"
              }`}
            >
              <HeroStatIcon icon={stat.icon} compact />
              <p className="mt-1.5 text-[clamp(0.68rem,1.25dvh,0.82rem)] text-slate-300 sm:mt-2">
                {stat.label}
              </p>
              <p className="mt-1 text-[clamp(1.35rem,3.2dvh,1.85rem)] font-semibold leading-none tracking-[-0.03em] text-white sm:mt-1.5">
                {stat.value}
              </p>
              <p className="mt-1 text-[clamp(0.62rem,1.1dvh,0.72rem)] uppercase tracking-[0.06em] text-slate-400">
                {stat.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function HeroLiteIcon({ icon }: { icon: HeroLiteIcon }) {
  const className = "h-7 w-7 shrink-0 text-[#4d9dff]";

  if (icon === "light") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className={className}
        aria-hidden
      >
        <path d="M12 3v2" strokeLinecap="round" />
        <path d="M5.6 5.6l1.4 1.4" strokeLinecap="round" />
        <path d="M3 12h2" strokeLinecap="round" />
        <path d="M19 12h2" strokeLinecap="round" />
        <path d="M17 5.6l-1.4 1.4" strokeLinecap="round" />
        <circle cx="12" cy="13" r="4.5" />
        <path d="M9.5 18.5c1 1.5 2.2 2.5 2.5 2.5s1.5-1 2.5-2.5" />
      </svg>
    );
  }

  if (icon === "grille") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className={className}
        aria-hidden
      >
        <path d="M6 5h5v14H6z" />
        <path d="M13 5h5v14h-5z" />
        <path d="M8 9h1M8 12h1M8 15h1M15 9h1M15 12h1M15 15h1" />
      </svg>
    );
  }

  if (icon === "aero") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className={className}
        aria-hidden
      >
        <path d="M4 14c4-2 8-2 12 0s8 2 12 0" />
        <path d="M6 10c3-1.5 6-1.5 9 0" />
        <path d="M8 6c2-.8 4-.8 6 0" />
      </svg>
    );
  }

  if (icon === "seat") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className={className}
        aria-hidden
      >
        <path d="M8 6h8v5a4 4 0 01-4 4H8z" />
        <path d="M8 15v3h8v-3" />
        <path d="M10 18v2M14 18v2" />
      </svg>
    );
  }

  if (icon === "display") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className={className}
        aria-hidden
      >
        <path d="M5 7c0-1 1-2 3-2h8c2 0 3 1 3 2v8c0 1-1 2-3 2H8c-2 0-3-1-3-2z" />
        <path d="M9 10h6" />
        <path d="M12 17v2" />
        <path d="M9 19h6" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden
    >
      <path d="M5 8h14v10H5z" />
      <path d="M8 8V6h8v2" />
      <path d="M9 13h6" />
    </svg>
  );
}

function HeroSecondaryPanel({
  panel,
  panelIndex,
}: {
  panel: (typeof HERO_SECONDARY)[number];
  panelIndex: number;
}) {
  const sectionNumber = panelIndex + 1;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col justify-center bg-[radial-gradient(circle_at_top_right,rgba(18,58,120,0.18),transparent_48%),linear-gradient(180deg,#020812_0%,#040913_52%,#050a14_100%)] px-6 py-10 sm:px-8 md:px-10 md:py-12">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.42em] text-[#1b66df] sm:text-[0.7rem]">
          {panel.eyebrow}
        </p>

        <div className="mt-5 md:mt-6">
          <h2 className="text-[2.35rem] font-semibold uppercase leading-[0.9] tracking-[-0.03em] text-white sm:text-[2.85rem] md:text-[3.35rem]">
            {panel.titleLine1}
          </h2>
          <h2 className="mt-0.5 text-[2.35rem] font-semibold uppercase leading-[0.9] tracking-[-0.03em] text-[#0d66e9] sm:text-[2.85rem] md:text-[3.35rem]">
            {panel.titleLine2}
          </h2>
        </div>

        <div className="mt-5 flex items-center gap-1.5 md:mt-6">
          <span className="h-[2px] w-8 rounded-full bg-white/95" />
          <span className="h-[2px] w-11 rounded-full bg-[#0066b1]" />
          <span className="h-[2px] w-6 rounded-full bg-[#e22718]" />
        </div>

        <p className="mt-5 max-w-[32ch] text-sm leading-[1.65] text-slate-300 sm:text-[0.95rem] md:mt-6">
          {HERO_COPY[panelIndex].body}
        </p>

        <ul className="mt-6 space-y-3.5 md:mt-7">
          {panel.highlights.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3.5 border-t border-white/8 pt-3.5 first:border-t-0 first:pt-0"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/4">
                <HeroLiteIcon icon={item.icon} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.22em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-0.5 text-[0.95rem] font-semibold text-white">
                  {item.value}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 border-t border-white/8 bg-[linear-gradient(180deg,rgba(8,13,23,0.96)_0%,rgba(4,8,15,0.98)_100%)] px-6 py-4 sm:px-8 md:px-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[0.72rem] font-medium uppercase tracking-[0.32em] text-slate-500">
            <span className="text-white">0{sectionNumber}</span>
            <span className="mx-2 text-slate-600">/</span>
            <span>03</span>
          </p>
          <div
            className="flex items-center gap-2"
            role="tablist"
            aria-label="Homepage sections"
          >
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                role="presentation"
                className={`h-1 rounded-full transition-all ${
                  dot === panelIndex ? "w-8 bg-[#1f73ff]" : "w-4 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
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
      const maxCanvasHeight = Math.round(
        availableHeight * MOBILE_HERO_CANVAS_MAX_RATIO,
      );

      setMobileCanvasHeight(
        Math.max(
          MOBILE_CANVAS_MIN_HEIGHT,
          Math.min(availableHeight, fittedHeight, maxCanvasHeight),
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

  const heroPanelGridStyle =
    mobileCanvasHeight == null
      ? undefined
      : ({
          gridTemplateRows: `${mobileCanvasHeight}px minmax(0, 1fr)`,
        } as React.CSSProperties);

  return (
    <div className="relative h-[calc(100dvh-72px)] w-full overflow-hidden bg-[radial-gradient(circle_at_18%_22%,#102a4f_0%,#081629_38%,#050d18_72%,#040a14_100%)] text-slate-100">
      <div
        style={mobileCanvasHeightStyle}
        className="pointer-events-auto fixed left-0 top-[72px] z-30 h-[40dvh] w-full md:h-[calc(100dvh-72px)] md:w-[65%]"
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
            style={index === 0 ? heroPanelGridStyle : undefined}
            className={
              index === 0
                ? "grid h-[calc(100dvh-72px)] max-h-[calc(100dvh-72px)] snap-start snap-always grid-cols-1 grid-rows-[40dvh_minmax(0,1fr)] overflow-hidden md:grid-rows-1 md:grid-cols-[65%_35%]"
                : "grid min-h-[calc(100dvh-72px)] snap-start snap-always grid-cols-1 md:grid-cols-[65%_35%]"
            }
          >
            <div
              style={index === 0 ? undefined : mobileCanvasSpacerStyle}
              className={
                index === 0
                  ? "min-h-0 md:min-h-0"
                  : "min-h-[42vh] shrink-0 md:min-h-0"
              }
              aria-hidden
            />
            <aside
              id={index === 0 ? "homepage_intro" : undefined}
              className={`relative z-10 flex min-h-0 flex-col overflow-hidden bg-[#060d1b] transition-all duration-700 ${
                index === 0 ? "h-full max-h-full" : ""
              } ${index === 0 && isExiting ? "pointer-events-none" : ""}`}
            >
              {index === 0 ? (
                <HeroPrimaryPanel
                  body={hero.body}
                  onStartCustomising={handleStartCustomising}
                  onExploreModels={handleExploreModels}
                />
              ) : (
                <HeroSecondaryPanel
                  panel={HERO_SECONDARY[index - 1]}
                  panelIndex={index}
                />
              )}
            </aside>
          </section>
        ))}
      </div>
    </div>
  );
}
