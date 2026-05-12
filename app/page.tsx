"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Object3D } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { attachHomeModelViewer, type ExitSpin } from "@/lib/homeModelViewer";

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

  useEffect(() => {
    if (!mountRef.current) return;
    const mountNode = mountRef.current;
    return attachHomeModelViewer(mountNode, {
      modelRootRef,
      controlsRef,
      exitSpinRef,
      activeHeroRef,
    });
  }, []);

  const forwardWheelToScroll = (event: React.WheelEvent) => {
    const sc = scrollRef.current;
    if (!sc) return;
    sc.scrollTop += event.deltaY;
    event.preventDefault();
  };

  return (
    <div className="relative h-[calc(100vh-72px)] w-full overflow-hidden bg-[radial-gradient(circle_at_18%_22%,#102a4f_0%,#081629_38%,#050d18_72%,#040a14_100%)] text-slate-100">
      <div
        className="pointer-events-auto fixed left-0 top-[72px] z-30 h-[calc(100vh-72px)] w-full md:w-[65%]"
        onWheel={forwardWheelToScroll}
      >
        <div
          ref={mountRef}
          className="h-full w-full cursor-grab active:cursor-grabbing"
        />
      </div>

      <div
        ref={scrollRef}
        className="h-[calc(100vh-72px)] snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain"
      >
        {HERO_COPY.map((hero, index) => (
          <section
            key={hero.title}
            data-hero-panel
            data-hero-index={index}
            className="grid min-h-[calc(100vh-72px)] snap-start snap-always grid-cols-1 md:grid-cols-[65%_35%]"
          >
            <div className="min-h-[42vh] shrink-0 md:min-h-0" aria-hidden />
            <aside
              id={index === 0 ? "homepage_intro" : undefined}
              className={`relative z-10 flex min-h-0 flex-col justify-center bg-[#060d1b] px-8 pb-16 pt-24 transition-all duration-700 md:px-12 ${
                index === 0 && isExiting
                  ? "pointer-events-none translate-x-full opacity-0 animate-slideOutRight"
                  : ""
              }`}
            >
              <h1 className="max-w-[14ch] text-5xl font-semibold uppercase leading-[0.92] tracking-[0.02em] text-white md:max-w-[9ch] md:text-7xl">
                {hero.title}
              </h1>
              <p className="mt-6 max-w-[42ch] text-sm leading-7 text-slate-300">
                {hero.body}
              </p>
              {hero.showCta ? (
                <button
                  type="button"
                  onClick={handleStartCustomising}
                  className="mt-8 inline-flex w-fit items-center gap-3 rounded-full border border-[#6d9fe8] bg-[#0b1b32]/70 px-6 py-3 text-sm font-medium text-[#d7e8ff] transition hover:bg-[#133059]"
                >
                  Start Customising
                  <span className="grid h-6 w-6 place-items-center rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09A1.65 1.65 0 008.5 5V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82c.2.5.67.84 1.17.84H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                      />
                    </svg>
                  </span>
                </button>
              ) : null}
            </aside>
          </section>
        ))}
      </div>
    </div>
  );
}
