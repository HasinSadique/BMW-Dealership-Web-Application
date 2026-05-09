"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CarModel } from "@/data/models";

type ModelCardProps = {
  models: CarModel[];
};

type StageCar = {
  id: string;
  name: string;
  series: string;
  modelPath: string;
  customizationSlug: string;
  stageSize?: number;
  groundOffset?: number;
  initialYaw?: number;
  price: number;
  horsepower: number;
  torque: string;
  acceleration: string;
  topSpeed: string;
  description: string;
};

const stageCars: StageCar[] = [
  {
    id: "bmw-z8",
    name: "BMW Z8 Roadster",
    series: "Heritage Roadster",
    modelPath: "/models/bmw_z8__www.vecarz.com.glb",
    customizationSlug: "bmw-z8",
    stageSize: 6.15,
    groundOffset: 0.05,
    initialYaw: Math.PI / 2 - 0.12,
    price: 248900,
    horsepower: 395,
    torque: "500 Nm",
    acceleration: "4.7s",
    topSpeed: "250 km/h",
    description: "A low-slung collector roadster tuned for sharp response and cinematic presence.",
  },
  {
    id: "bmw-m3-cs-touring",
    name: "BMW M3 CS Touring",
    series: "Track Wagon",
    modelPath: "/models/2025_bmw_m3_cs_touring.glb",
    customizationSlug: "bmw-m3-cs-touring",
    stageSize: 6.1,
    groundOffset: 0.05,
    initialYaw: Math.PI / 2 - 0.12,
    price: 186500,
    horsepower: 543,
    torque: "650 Nm",
    acceleration: "3.5s",
    topSpeed: "302 km/h",
    description: "A carbon-focused performance wagon with all-wheel drive traction and daily usable pace.",
  },
  {
    id: "bmw-m4-f82",
    name: "BMW M4 F82",
    series: "M Coupe",
    modelPath: "/models/bmw_m4_f82.glb",
    customizationSlug: "bmw-m4-f82",
    stageSize: 5.9,
    groundOffset: 0.07,
    initialYaw: Math.PI / 2 - 0.12,
    price: 164800,
    horsepower: 503,
    torque: "600 Nm",
    acceleration: "3.9s",
    topSpeed: "290 km/h",
    description: "A compact M coupe built around aggressive aero, rear-biased balance, and fast exits.",
  },
  {
    id: "bmw-m4-competition",
    name: "BMW M4 Competition",
    series: "M Coupe",
    modelPath: "/models/2025_bmw_m4_competition.glb",
    customizationSlug: "bmw-m4-competition",
    stageSize: 5.95,
    groundOffset: 0.07,
    initialYaw: Math.PI / 2 - 0.12,
    price: 174900,
    horsepower: 503,
    torque: "650 Nm",
    acceleration: "3.6s",
    topSpeed: "290 km/h",
    description: "Competition-spec M coupe tuned for aggressive track-focused response and precision.",
  },
  {
    id: "bmw-x3",
    name: "BMW X3 M40i",
    series: "SUV",
    modelPath: "/models/bmw_x3_m40i.glb",
    customizationSlug: "bmw-x3",
    stageSize: 6.0,
    groundOffset: 0.06,
    initialYaw: Math.PI / 2 - 0.12,
    price: 96200,
    horsepower: 382,
    torque: "500 Nm",
    acceleration: "4.6s",
    topSpeed: "240 km/h",
    description: "Performance-oriented compact SUV with sporty chassis tuning and dynamic handling.",
  },
  {
    id: "bmw-m3-topaz",
    name: "BMW M3 Topaz Blue",
    series: "Performance Sedan",
    modelPath: "/models/bmw_m3_sedan_topaz_blue_car.glb",
    customizationSlug: "bmw-m3-topaz",
    stageSize: 6.15,
    groundOffset: 0.08,
    initialYaw: 0.08,
    price: 151200,
    horsepower: 473,
    torque: "550 Nm",
    acceleration: "4.1s",
    topSpeed: "280 km/h",
    description: "A vivid sports sedan with a planted stance, precise steering, and an elevated street tune.",
  },
];

const panelStats = [
  { label: "Power", key: "horsepower" },
  { label: "Torque", key: "torque" },
  { label: "0-100", key: "acceleration" },
  { label: "V-Max", key: "topSpeed" },
] as const;

export default function ModelCard({ models }: ModelCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadState, setLoadState] = useState("Initializing stage");
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const carGroupRef = useRef<THREE.Group | null>(null);
  const rotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const zoomRef = useRef(10.9);
  const targetZoomRef = useRef(10.9);
  const preloaded = useRef<Record<string, any>>({});
  const hasFocusRef = useRef(false);
  const activeCar = stageCars[activeIndex];

  const preloadModel = (path: string) => {
    if (!path || preloaded.current[path]) return;
    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => {
        preloaded.current[path] = gltf;
      },
      undefined,
      () => {
        // ignore preload errors
      },
    );
  };

  const customizationHref = useMemo(() => {
    const fallbackSlug = models[0]?.id ?? "bmw-5-series";
    return `/customization/${activeCar.customizationSlug || fallbackSlug}`;
  }, [activeCar.customizationSlug, models]);

  const shiftModel = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + stageCars.length) % stageCars.length);
  };

  useEffect(() => {
    const host = canvasHostRef.current;

    if (!host) {
      return;
    }

    let animationId = 0;
    let isDragging = false;
    let previousX = 0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050915");
    scene.fog = new THREE.Fog("#050915", 10, 22);

    const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 100);
    camera.position.set(0, 1.55, zoomRef.current);
    camera.lookAt(0, 0.65, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = false;
    host.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);

    const carGroup = new THREE.Group();
    carGroupRef.current = carGroup;
    root.add(carGroup);

    const hemiLight = new THREE.HemisphereLight("#9fc6ff", "#08101f", 1.4);
    scene.add(hemiLight);

    const keyLight = new THREE.SpotLight("#8dbbff", 430, 30, Math.PI / 5, 0.35, 1.1);
    keyLight.position.set(-4.8, 7.2, 6.8);
    scene.add(keyLight);

    const rimLight = new THREE.SpotLight("#ffffff", 240, 24, Math.PI / 6, 0.4, 1.2);
    rimLight.position.set(5.5, 5.2, -5.8);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(6.4, 6.8, 0.26, 160),
      new THREE.MeshStandardMaterial({
        color: "#071331",
        metalness: 0.84,
        roughness: 0.24,
      }),
    );
    floor.position.y = -0.24;
    scene.add(floor);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6.55, 0.035, 12, 192),
      new THREE.MeshBasicMaterial({ color: "#6eb7ff" }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.06;
    scene.add(ring);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.6, 0.018, 8, 160),
      new THREE.MeshBasicMaterial({ color: "#245b9d", transparent: true, opacity: 0.65 }),
    );
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = -0.03;
    scene.add(innerRing);

    const grid = new THREE.GridHelper(15, 44, "#2d74d9", "#132944");
    grid.position.y = -0.38;
    scene.add(grid);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(260 * 3);

    for (let i = 0; i < particlePositions.length; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 16;
      particlePositions[i + 1] = Math.random() * 6 + 0.8;
      particlePositions[i + 2] = (Math.random() - 0.5) * 16;
    }

    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: "#7fb3ff",
        size: 0.025,
        transparent: true,
        opacity: 0.65,
      }),
    );
    scene.add(particles);

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const onPointerDown = (event: PointerEvent) => {
      isDragging = true;
      previousX = event.clientX;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }

      const deltaX = event.clientX - previousX;
      previousX = event.clientX;
      targetRotationRef.current += deltaX * 0.012;
    };

    const onPointerUp = (event: PointerEvent) => {
      isDragging = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetZoomRef.current = THREE.MathUtils.clamp(
        targetZoomRef.current + event.deltaY * 0.006,
        8.2,
        13.5,
      );
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerUp);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", resize);
    resize();

    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      rotationRef.current = THREE.MathUtils.lerp(rotationRef.current, targetRotationRef.current, 0.08);
      zoomRef.current = THREE.MathUtils.lerp(zoomRef.current, targetZoomRef.current, 0.08);
      carGroup.rotation.y = rotationRef.current + Math.sin(elapsed * 0.5) * 0.015;
      carGroup.position.y = Math.sin(elapsed * 1.4) * 0.025;
      ring.rotation.z = elapsed * 0.45;
      innerRing.rotation.z = -elapsed * 0.25;
      particles.rotation.y = elapsed * 0.03;
      camera.position.z = zoomRef.current;
      camera.lookAt(0, 0.65, 0);
      renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(animate);
    };

    animate();

    // focus tracking so keyboard navigation only applies when component has focus
    const onFocusIn = () => (hasFocusRef.current = true);
    const onFocusOut = () => (hasFocusRef.current = false);

    const onKey = (e: KeyboardEvent) => {
      if (!hasFocusRef.current) return;
      if (e.key === "ArrowLeft") shiftModel(-1);
      if (e.key === "ArrowRight") shiftModel(1);
    };

    const cont = containerRef.current;
    cont?.addEventListener("focusin", onFocusIn);
    cont?.addEventListener("focusout", onFocusOut);
    window.addEventListener("keydown", onKey);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerUp);
      renderer.domElement.removeEventListener("wheel", onWheel);
      host.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      carGroupRef.current = null;
      cont?.removeEventListener("focusin", onFocusIn);
      cont?.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const group = carGroupRef.current;

    if (!group) {
      return;
    }

    let cancelled = false;
    const loader = new GLTFLoader();
    setLoadState(`Loading ${activeCar.name}`);
    console.log("[ModelCard] loading model:", activeCar.modelPath);

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    loader.load(
      activeCar.modelPath,
      (gltf) => {
        if (cancelled) return;

        const model = gltf.scene;
        const pivot = new THREE.Group();
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z);
        const targetSize = activeCar.stageSize ?? 6;
        const scale = maxAxis > 0 ? targetSize / maxAxis : 1;

        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

        const normalizedBox = new THREE.Box3().setFromObject(model);
        model.position.y += -normalizedBox.min.y + (activeCar.groundOffset ?? 0.04);
        pivot.rotation.y = activeCar.initialYaw ?? 0;
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = false;
            object.receiveShadow = false;
            const materials = Array.isArray(object.material) ? object.material : [object.material];

            materials.forEach((material) => {
              if (material instanceof THREE.MeshStandardMaterial) {
                material.roughness = Math.max(material.roughness, 0.42);
                material.envMapIntensity = Math.min(material.envMapIntensity, 0.75);

                if (material.bumpMap) {
                  material.bumpScale = 0;
                }

                if (material.normalMap) {
                  material.normalScale.set(0.25, 0.25);
                }

                material.needsUpdate = true;
              }
            });
          }
        });

        pivot.add(model);
        group.add(pivot);
        targetRotationRef.current += Math.PI * 0.35;
        setLoadState("Ready");
      },
      (xhr) => {
        try {
          if (xhr?.loaded && xhr?.total) {
            const pct = Math.round((xhr.loaded / xhr.total) * 100);
            setLoadState(`Loading ${activeCar.name} — ${pct}%`);
          }
        } catch {
          // Ignore progress events with incomplete browser data.
        }
      },
      (error) => {
        console.error("[ModelCard] GLTF load error:", activeCar.modelPath, error);
        if (!cancelled) setLoadState(`Failed to load ${activeCar.name}`);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [activeCar]);

  const selectModel = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <section
      ref={(el) => {
        containerRef.current = el;
      }}
      tabIndex={0}
      className="h-full overflow-hidden rounded-2xl border border-[#26354a] bg-[linear-gradient(135deg,rgba(6,11,24,0.99),rgba(3,7,16,0.99)_52%,rgba(4,13,27,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
    >
      <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="relative min-h-[520px] overflow-hidden">
          <div className="absolute left-5 top-5 z-[2] sm:left-8 sm:top-8">
            <p className="m-0 text-sm uppercase tracking-[0.18em] text-[#68a7ff]">M Selection Stage</p>
            <h2 className="my-2 text-4xl font-bold leading-none text-white sm:text-5xl">Choose your BMW</h2>
          </div>

          <div className="absolute right-5 top-5 z-[2] flex gap-3 sm:right-8 sm:top-8">
            <button
              type="button"
              aria-label="Previous model"
              onClick={() => shiftModel(-1)}
              className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/30 text-2xl text-white backdrop-blur transition hover:border-[#78b4ff] hover:bg-white/15 sm:h-14 sm:w-14"
            >
              {"<"}
            </button>
            <button
              type="button"
              aria-label="Next model"
              onClick={() => shiftModel(1)}
              className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/30 text-2xl text-white backdrop-blur transition hover:border-[#78b4ff] hover:bg-white/15 sm:h-14 sm:w-14"
            >
              {">"}
            </button>
          </div>

          <div className="relative h-full min-h-[520px] w-full">
            <div
              ref={canvasHostRef}
              className="h-full min-h-[520px] w-full cursor-grab active:cursor-grabbing [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full"
            />

            {loadState !== "Ready" && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin h-10 w-10 rounded-full border-4 border-t-transparent border-white/60" />
                  <div className="text-sm text-white">{loadState}</div>
                </div>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#030711] via-[#030711]/76 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 z-[2] sm:bottom-7 sm:left-7 sm:right-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span
                role="status"
                aria-live="polite"
                className="rounded-full border border-[#68a7ff]/40 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d2e5ff] backdrop-blur"
              >
                {loadState}
              </span>
              <span className="hidden rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.14em] text-slate-300 backdrop-blur sm:inline-block">
                Drag to rotate
              </span>
            </div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stageCars.map((car, index) => {
                const isActive = index === activeIndex;

                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => selectModel(index)}
                    onMouseEnter={() => preloadModel(car.modelPath)}
                    onFocus={() => preloadModel(car.modelPath)}
                    aria-pressed={isActive}
                    className={`min-w-[215px] snap-center rounded-xl border px-5 py-4 text-left backdrop-blur transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#79adff] ${
                      isActive
                        ? "border-[#79adff] bg-[#12345f]/80 shadow-[0_0_28px_rgba(79,141,230,0.4)]"
                        : "border-white/10 bg-black/32 opacity-72 hover:border-white/25 hover:opacity-100"
                    }`}
                  >
                    <p className="m-0 text-xs uppercase tracking-[0.12em] text-[#68a7ff]">{car.series}</p>
                    <p className="m-0 mt-2 text-base font-semibold text-white">{car.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="flex min-h-[520px] flex-col border-t border-[#26354a] bg-[linear-gradient(180deg,rgba(5,12,25,0.92),rgba(2,7,15,0.96))] p-5 lg:border-l lg:border-t-0 lg:p-6">
          <p className="m-0 text-sm uppercase tracking-[0.18em] text-[#68a7ff]">{activeCar.series}</p>
          <h3 className="mb-4 mt-3 text-3xl font-bold leading-tight text-white">{activeCar.name}</h3>
          <p className="max-w-[34ch] text-base leading-7 text-slate-300">{activeCar.description}</p>

          <div className="my-6 grid grid-cols-2 gap-3">
            {panelStats.map((stat) => (
              <div key={stat.key} className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
                <p className="m-0 text-xs uppercase tracking-[0.12em] text-slate-400">{stat.label}</p>
                <p className="m-0 mt-3 text-base font-semibold text-white">
                  {stat.key === "horsepower" ? `${activeCar[stat.key]} hp` : activeCar[stat.key]}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#284465] bg-[linear-gradient(135deg,rgba(17,45,82,0.9),rgba(3,14,32,0.9))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
            <p className="m-0 text-xs uppercase tracking-[0.16em] text-slate-400">Starting from</p>
            <p className="m-0 mt-3 text-3xl font-bold text-white">
              ${activeCar.price.toLocaleString("en-AU")}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 lg:mt-auto">
            <Link
              href={customizationHref}
              className="rounded-lg bg-gradient-to-r from-[#24579f] to-[#3a7ddd] px-4 py-3.5 text-center text-base font-semibold text-white shadow-[0_12px_30px_rgba(58,125,221,0.28)] transition hover:brightness-110"
            >
              Customization
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}