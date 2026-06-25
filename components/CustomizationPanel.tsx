"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

type CustomizationPanelProps = {
  driveAwayHref: string;
  driveVerseHref: string;
  showDriveVerse?: boolean;
  onExteriorChange?: (hex: string) => void;
  onInteriorChange?: (hex: string) => void;
};

type SectionKey = "paint" | "interior";

const colorOptions: Record<string, string> = {
  "Alpine White": "#F8F8F4",
  "Black Sapphire": "#0B1220",
  "Portimao Blue": "#0B67D0",
  "Frozen Grey": "#9BA3A8",
  "Racing Red": "#B00020",
  "Sunset Orange": "#F97316",
  "M Isle Green": "#00A884",
};

const interiors: Record<string, string> = {
  "Black Leather": "#111217",
  "Cognac Leather": "#8B4B2E",
  "Ivory White": "#F2EEE9",
  "Fiona Red": "#8f1720",
};

export default function CustomizationPanel({
  driveAwayHref,
  driveVerseHref,
  showDriveVerse = true,
  onExteriorChange,
  onInteriorChange,
}: CustomizationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(
    null,
  );
  const toggleSection = (section: SectionKey) => {
    setExpandedSection((current) => (current === section ? null : section));
  };

  return (
    <>
      <button
        className="mb-3 inline-block w-full rounded-lg border border-white/15 bg-gradient-to-r from-[#1e4a86] to-[#2962ae] px-3 py-2 text-sm font-medium text-slate-100 lg:hidden"
        onClick={() => setIsOpen(true)}
      >
        Open Customization Drawer
      </button>
      <div
        className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"} lg:static lg:z-auto lg:pointer-events-auto`}
      >
        <aside
          className={`absolute right-0 top-0 z-[7] h-full w-[min(360px,85vw)] translate-x-full overflow-y-auto border-l border-white/15 bg-gradient-to-b from-[rgba(22,39,65,0.95)] to-[rgba(8,13,24,0.98)] p-4 transition-transform ${isOpen ? "translate-x-0" : ""} lg:relative lg:h-auto lg:w-auto lg:translate-x-0 lg:rounded-2xl lg:border lg:border-white/15 lg:bg-gradient-to-b lg:from-[rgba(22,39,65,0.8)] lg:to-[rgba(8,13,24,0.88)]`}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Customize</h2>
            <button
              className="rounded-md border border-white/15 px-2.5 py-1.5 text-sm text-slate-100 lg:hidden"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>

          <AccordionSection
            title="Paint"
            isExpanded={expandedSection === "paint"}
            onToggle={() => toggleSection("paint")}
          >
            {Object.keys(colorOptions).map((label) => (
              <button
                key={label}
                onClick={() => onExteriorChange?.(colorOptions[label])}
                className="mb-2 flex w-full items-center gap-3 rounded-md border border-white/15 bg-[rgba(9,18,31,0.65)] px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
              >
                <span
                  className="inline-block h-5 w-10 rounded"
                  style={{ background: colorOptions[label] }}
                />
                <span>{label}</span>
              </button>
            ))}
          </AccordionSection>

          <AccordionSection
            title="Interior"
            isExpanded={expandedSection === "interior"}
            onToggle={() => toggleSection("interior")}
          >
            <p className="mb-2 text-xs text-slate-400">
              Selecting an interior color moves the camera into the cabin.
            </p>
            {Object.keys(interiors).map((label) => (
              <button
                key={label}
                onClick={() => onInteriorChange?.(interiors[label])}
                className="mb-2 flex w-full items-center gap-3 rounded-md border border-white/15 bg-[rgba(9,18,31,0.65)] px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
              >
                <span
                  className="inline-block h-5 w-10 rounded"
                  style={{ background: interiors[label] }}
                />
                <span>{label}</span>
              </button>
            ))}
          </AccordionSection>

          <section className="mt-6 border-t border-white/10 pt-4">
            <Link
              href={driveAwayHref}
              className="block w-full rounded-xl bg-gradient-to-r from-[#2f7de1] to-[#65b7ff] px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_16px_40px_rgba(47,125,225,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_20px_48px_rgba(101,183,255,0.42)]"
            >
              Drive Away
            </Link>
          </section>

          {showDriveVerse ? (
            <section className="mt-6 border-t border-white/10 pt-4">
              <Link
                href={driveVerseHref}
                className="block w-full rounded-xl bg-gradient-to-r from-[#2f7de1] to-[#65b7ff] px-4 py-3 text-center text-sm font-bold tracking-[0.18em] text-white shadow-[0_16px_40px_rgba(47,125,225,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_20px_48px_rgba(101,183,255,0.42)]"
                style={{
                  textTransform: "none",
                  letterSpacing: "0.1em",
                  fontSize: "1.1rem",
                  fontFamily: "var(--font-sans, inherit)",
                  userSelect: "none",
                }}
              >
                <span style={{ fontWeight: 700, color: "#4bf1fa" }}>Drive</span>
                <span style={{ fontWeight: 800, color: "#eaea50" }}>Verse</span>
              </Link>
            </section>
          ) : null}
        </aside>
        <button
          type="button"
          aria-label="Close customization drawer"
          className="absolute inset-0 z-[5] border-0 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      </div>
    </>
  );
}

function AccordionSection({
  title,
  isExpanded,
  children,
  onToggle,
}: {
  title: string;
  isExpanded: boolean;
  children: ReactNode;
  onToggle: () => void;
}) {
  return (
    <section className="mb-3 overflow-hidden rounded-lg border border-white/15 bg-[rgba(9,18,31,0.42)]">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/10"
      >
        <span>{title}</span>
        <span
          aria-hidden="true"
          className={`text-lg leading-none text-[#8cc8ff] transition-transform ${isExpanded ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-white/10 px-3 pb-3 pt-3">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
