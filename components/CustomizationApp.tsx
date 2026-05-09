"use client";

import { useState } from "react";
import type { CarModel } from "@/data/models";
import CustomizationViewer from "./CustomizationViewer";
import CustomizationPanel from "./CustomizationPanel";

export type WheelStyle = "classic" | "sport" | "aero";

type Props = {
  model: CarModel;
};

export default function CustomizationApp({ model }: Props) {
  const [exterior, setExterior] = useState<string>("#1f2937");
  const [interior, setInterior] = useState<string>("#0b1220");
  const [wheelColor, setWheelColor] = useState<string>("#cfd6df");
  const [wheelStyle, setWheelStyle] = useState<WheelStyle>("classic");
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [windowsDown, setWindowsDown] = useState(false);
  const [lightsOn, setLightsOn] = useState(false);
  const [wheelFocusKey, setWheelFocusKey] = useState(0);

  const focusWheelAfterSelection = () => {
    setWheelFocusKey((key) => key + 1);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-none px-4 py-4 lg:px-8">
      <div className="grid min-h-0 w-full grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 左边全屏车辆视窗 */}
        <div className="relative h-[calc(100vh-128px)] min-w-0 overflow-hidden rounded-2xl border border-white/15">
          <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-xl rounded-xl border border-white/10 bg-black/35 px-4 py-3 shadow-lg backdrop-blur">
            <p className="m-0 text-xs uppercase tracking-[0.22em] text-[#4f8de6]">
              Model Customization
            </p>
            <h1 className="my-1 text-3xl font-bold text-slate-100">
              {model.name}
            </h1>
            <p className="text-sm text-slate-300">{model.description}</p>
          </div>
          <CustomizationViewer
            model={model}
            exteriorColor={exterior}
            interiorColor={interior}
            wheelColor={wheelColor}
            wheelStyle={wheelStyle}
            doorsOpen={doorsOpen}
            windowsDown={windowsDown}
            lightsOn={lightsOn}
            wheelFocusKey={wheelFocusKey}
          />
        </div>

        {/* 右边控制栏 */}
        <div className="min-h-0 min-w-0 lg:sticky lg:top-[88px] lg:h-[calc(100vh-120px)] lg:overflow-y-auto">
          <CustomizationPanel
            model={model}
            doorsOpen={doorsOpen}
            windowsDown={windowsDown}
            lightsOn={lightsOn}
            onExteriorChange={(c: string) => setExterior(c)}
            onInteriorChange={(c: string) => setInterior(c)}
            onWheelColorChange={(c: string) => {
              setWheelColor(c);
              focusWheelAfterSelection();
            }}
            onWheelStyleChange={(style) => {
              setWheelStyle(style);
              focusWheelAfterSelection();
            }}
            onDoorsOpenChange={setDoorsOpen}
            onWindowsDownChange={setWindowsDown}
            onLightsOnChange={setLightsOn}
          />
        </div>
      </div>
    </div>
  );
}