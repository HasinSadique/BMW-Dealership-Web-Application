import { notFound } from "next/navigation";
import DriveVerseShowcase from "@/components/DriveVerseShowcase";
import { getModelById } from "@/data/models";
import type { WheelStyle } from "@/components/CustomizationApp";

type DriveVersePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    exterior?: string;
    interior?: string;
    wheel?: string;
    wheelStyle?: string;
    doorsOpen?: string;
    windowsDown?: string;
    lightsOn?: string;
  }>;
};

export default async function DriveVersePage({
  params,
  searchParams,
}: DriveVersePageProps) {
  const { slug } = await params;
  const model = getModelById(slug);

  if (!model) {
    notFound();
  }

  const query = await searchParams;
  const wheelStyle = isWheelStyle(query.wheelStyle) ? query.wheelStyle : undefined;
  const exteriorColor = normalizeColorParam(query.exterior);
  const interiorColor = normalizeColorParam(query.interior);
  const wheelColor = normalizeColorParam(query.wheel);

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#030711] p-3 sm:p-4">
      <DriveVerseShowcase
        model={model}
        exteriorColor={exteriorColor}
        interiorColor={interiorColor}
        wheelColor={wheelColor}
        wheelStyle={wheelStyle}
        doorsOpen={isEnabled(query.doorsOpen)}
        windowsDown={isEnabled(query.windowsDown)}
        lightsOn={isEnabled(query.lightsOn)}
      />
    </section>
  );
}

function isWheelStyle(value: string | undefined): value is WheelStyle {
  return value === "classic" || value === "sport" || value === "aero";
}

function isEnabled(value: string | undefined) {
  return value === "true" || value === "1" || value === "yes";
}

function normalizeColorParam(value: string | undefined) {
  if (!value) return undefined;

  const decoded = safeDecodeURIComponent(value).trim();
  const color = decoded.startsWith("#") ? decoded : `#${decoded}`;

  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color) ? color : undefined;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
