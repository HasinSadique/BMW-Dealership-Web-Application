"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { CarModel } from "@/data/models";
import type { WheelStyle } from "./CustomizationApp";

type CustomizationPanelProps = {
  model: CarModel;
  doorsOpen: boolean;
  windowsDown: boolean;
  lightsOn: boolean;
  onExteriorChange?: (hex: string) => void;
  onInteriorChange?: (hex: string) => void;
  onWheelColorChange?: (hex: string) => void;
  onWheelStyleChange?: (style: WheelStyle) => void;
  onDoorsOpenChange?: (open: boolean) => void;
  onWindowsDownChange?: (down: boolean) => void;
  onLightsOnChange?: (on: boolean) => void;
};

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

const wheelColors: Record<string, string> = {
  "Brushed Silver": "#cfd6df",
  "Orbit Grey": "#4f5864",
  "Jet Black": "#07090d",
  "Champagne Gold": "#c6a15b",
};

const wheelStyles: Array<{ label: string; value: WheelStyle }> = [
  { label: "Classic Multi-spoke", value: "classic" },
  { label: "M Sport Split-spoke", value: "sport" },
  { label: "Aero Disc", value: "aero" },
];

export default function CustomizationPanel({
  model,
  doorsOpen,
  windowsDown,
  lightsOn,
  onExteriorChange,
  onInteriorChange,
  onWheelColorChange,
  onWheelStyleChange,
  onDoorsOpenChange,
  onWindowsDownChange,
  onLightsOnChange,
}: CustomizationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasRealDoorNodes = !["bmw-z8", "bmw-m3-cs-touring", "bmw-m3-topaz", "bmw-x5"].includes(model.id);

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

          <section className="mb-5">
            <h3 className="mb-2 text-sm font-semibold">Paint</h3>
            {Object.keys(colorOptions).map((label) => (
              <button
                key={label}
                onClick={() => onExteriorChange?.(colorOptions[label])}
                className="mb-2 flex w-full items-center gap-3 rounded-md border border-white/15 bg-[rgba(9,18,31,0.65)] px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
              >
                <span className="inline-block h-5 w-10 rounded" style={{ background: colorOptions[label] }} />
                <span>{label}</span>
              </button>
            ))}
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-sm font-semibold">Wheels</h3>
            <p className="mb-2 text-xs text-slate-400">
              Change wheel finish or style. The camera zooms to the car’s actual wheel after selection.
            </p>
            {Object.keys(wheelColors).map((label) => (
              <button
                key={label}
                onClick={() => onWheelColorChange?.(wheelColors[label])}
                className="mb-2 flex w-full items-center gap-3 rounded-md border border-white/15 bg-[rgba(9,18,31,0.65)] px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
              >
                <span className="inline-block h-5 w-10 rounded" style={{ background: wheelColors[label] }} />
                <span>{label}</span>
              </button>
            ))}
            <div className="grid grid-cols-1 gap-2 pt-1">
              {wheelStyles.map((style) => (
                <button
                  key={style.value}
                  onClick={() => onWheelStyleChange?.(style.value)}
                  className="rounded-md border border-[#4f8de6]/40 bg-[#0b2344]/70 px-3 py-2 text-left text-xs font-medium text-slate-100 transition hover:bg-[#163a6d]"
                >
                  {style.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-sm font-semibold">Interior</h3>
            <p className="mb-2 text-xs text-slate-400">
              Selecting an interior color moves the camera into the cabin.
            </p>
            {Object.keys(interiors).map((label) => (
              <button
                key={label}
                onClick={() => onInteriorChange?.(interiors[label])}
                className="mb-2 flex w-full items-center gap-3 rounded-md border border-white/15 bg-[rgba(9,18,31,0.65)] px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
              >
                <span className="inline-block h-5 w-10 rounded" style={{ background: interiors[label] }} />
                <span>{label}</span>
              </button>
            ))}
          </section>

          <section className="mb-5">
            <h3 className="mb-2 text-sm font-semibold">Interactive Features</h3>
            <div className="space-y-2">
              <ToggleButton
                active={doorsOpen}
                disabled={!hasRealDoorNodes}
                onClick={() => onDoorsOpenChange?.(!doorsOpen)}
              >
                {hasRealDoorNodes
                  ? doorsOpen ? "Close doors" : "Open doors"
                  : "Real doors unavailable for this model"}
              </ToggleButton>
              <ToggleButton active={windowsDown} onClick={() => onWindowsDownChange?.(!windowsDown)}>
                {windowsDown ? "Roll windows up" : "Roll windows down"}
              </ToggleButton>
              <ToggleButton active={lightsOn} onClick={() => onLightsOnChange?.(!lightsOn)}>
                {lightsOn ? "Turn lights off" : "Turn lights on"}
              </ToggleButton>
            </div>
          </section>

          <p className="text-sm text-slate-300">Customization controls for {model.name}.</p>
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

function ToggleButton({
  active,
  children,
  disabled = false,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-md border px-3 py-2 text-left text-sm font-medium transition ${
        disabled
          ? "cursor-not-allowed border-white/10 bg-[rgba(9,18,31,0.35)] text-slate-500"
          : active
            ? "border-[#6eb7ff] bg-[#1e4a86] text-white shadow-[0_0_18px_rgba(110,183,255,0.22)]"
            : "border-white/15 bg-[rgba(9,18,31,0.65)] text-slate-100 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}