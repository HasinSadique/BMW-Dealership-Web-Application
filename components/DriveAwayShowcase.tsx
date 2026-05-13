"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CarModel } from "@/data/models";
import type { WheelStyle } from "./CustomizationApp";
import {
  calculateDriftFrame,
  DRIFT_CENTER,
  DRIFT_RADIUS,
  FINAL_REVEAL_TIME,
} from "./drive-away/driftMotion";
import {
  createDriftSmoke,
  spawnDriftSmoke,
  updateDriftSmoke,
} from "./drive-away/driftSmoke";

type DriveAwayShowcaseProps = {
  model: CarModel;
  exteriorColor?: string;
  interiorColor?: string;
  wheelColor?: string;
  wheelStyle?: WheelStyle;
  doorsOpen?: boolean;
  windowsDown?: boolean;
  lightsOn?: boolean;
};

const pathMap: Record<string, string> = {
  "bmw-m3-cs-touring": "/models/2025_bmw_m3_cs_touring.glb",
  "bmw-m4-competition": "/models/2025_bmw_m4_competition.glb",
  "bmw-m4-f82": "/models/bmw_m4_f82.glb",
  "bmw-m3-topaz": "/models/bmw_m3_sedan_topaz_blue_car.glb",
  "bmw-x3": "/models/bmw_x3_m40i.glb",
  "bmw-z8": "/models/bmw_z8__www.vecarz.com.glb",
};

const DRIVE_AWAY_MODEL_SIZE = 3.15;
const DRIVE_AWAY_AUDIO_SRC =
  "/audio/Tokyo%20Drift%20-%20Teriyaki%20Boyz%20%5B%20MUSIC%20VIDEO%20%5D%20HD.mp3";

export default function DriveAwayShowcase({
  model,
  exteriorColor,
  interiorColor,
  wheelColor,
  wheelStyle,
  doorsOpen = false,
  windowsDown = false,
  lightsOn = false,
}: DriveAwayShowcaseProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const resolvedPath = model.modelPath ?? pathMap[model.id] ?? "";
  const [status, setStatus] = useState("Preparing your BMW drift handoff...");
  const [isComplete, setIsComplete] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const handoffStatus = resolvedPath ? status : "No 3D model is available for this handoff.";

  const startAudio = useCallback(async () => {
    if (!audioRef.current) {
      const audio = new Audio(DRIVE_AWAY_AUDIO_SRC);
      audio.loop = true;
      audio.volume = 0.55;
      audio.preload = "auto";
      audioRef.current = audio;
    }

    try {
      await audioRef.current.play();
      setIsAudioPlaying(true);
    } catch {
      setIsAudioPlaying(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;

    if (audio) audio.pause();
    setIsAudioPlaying(false);
  }, []);

  const toggleAudio = useCallback(() => {
    if (isAudioPlaying) {
      stopAudio();
      return;
    }

    startAudio();
  }, [isAudioPlaying, startAudio, stopAudio]);

  useEffect(() => {
    const autoplayId = window.setTimeout(() => {
      startAudio();
    }, 0);

    return () => {
      window.clearTimeout(autoplayId);
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [startAudio]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    setIsComplete(false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050608");
    scene.fog = new THREE.Fog("#050608", 10, 38);

    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 220);
    camera.position.set(0, 10.5, 0.12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    host.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight("#dce8f8", "#171a20", 1.65);
    scene.add(hemi);

    const key = new THREE.DirectionalLight("#ffffff", 3.8);
    key.position.set(-6, 10, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const sideFill = new THREE.DirectionalLight("#d9ecff", 2.35);
    sideFill.position.set(5, 5, -6);
    scene.add(sideFill);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 20),
      new THREE.MeshStandardMaterial({
        color: "#2a2824",
        metalness: 0.12,
        roughness: 0.68,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    addGarageDetails(scene);
    addParkingLines(scene);
    const tireMarks = createTireMarks(scene);
    const smokePuffs = createDriftSmoke(scene);
    const carRoot = new THREE.Group();
    scene.add(carRoot);

    let disposed = false;
    let animationId = 0;
    let loadedCar: THREE.Group | null = null;
    let completionAnnounced = false;
    let handoffStartTime: number | null = null;
    const loader = new GLTFLoader();

    if (resolvedPath) {
      loader.load(
        resolvedPath,
        (gltf) => {
          if (disposed) {
            disposeObject3D(gltf.scene);
            return;
          }

          const modelScene = gltf.scene;
          normalizeCarModel(modelScene, DRIVE_AWAY_MODEL_SIZE);
          applyDriveAwayConfiguration(
            modelScene,
            exteriorColor,
            interiorColor,
            wheelColor,
            wheelStyle,
            doorsOpen,
            windowsDown,
            lightsOn,
          );
          modelScene.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
            }
          });
          carRoot.add(modelScene);
          loadedCar = modelScene;
          requestAnimationFrame(() => {
            if (!disposed) {
              applyDriveAwayConfiguration(
                modelScene,
                exteriorColor,
                interiorColor,
                wheelColor,
                wheelStyle,
                doorsOpen,
                windowsDown,
                lightsOn,
              );
            }
          });
          setStatus("Your customized BMW is ready to drift into the handoff bay.");
        },
        undefined,
        () => {
          if (!disposed) setStatus("Unable to load this BMW handoff animation.");
        },
      );
    }

    const clock = new THREE.Clock();
    let lastSmokeSpawn = 0;

    const animate = () => {
      const t = clock.getElapsedTime();
      if (loadedCar && handoffStartTime === null) {
        handoffStartTime = t;
      }

      const handoffElapsed = handoffStartTime === null ? 0 : t - handoffStartTime;
      const driftFrame = calculateDriftFrame(handoffElapsed, t, camera);

      carRoot.position.copy(driftFrame.position);
      carRoot.rotation.z = driftFrame.bodyRoll;

      if (loadedCar) {
        loadedCar.rotation.x = driftFrame.modelPitch;
      }

      tireMarks.forEach((mark, index) => {
        const material = mark.material as THREE.MeshBasicMaterial;
        material.opacity =
          0.1 +
          Math.min(driftFrame.driftProgress * 1.5, 1) *
            (index === 0 ? 0.52 : 0.34);
      });

      camera.position.copy(driftFrame.cameraPosition);
      camera.lookAt(driftFrame.cameraTarget);
      carRoot.rotation.y = driftFrame.carYaw;

      if (
        driftFrame.driftProgress < 0.98 &&
        driftFrame.transitionProgress < 0.1 &&
        t - lastSmokeSpawn > 0.085
      ) {
        spawnDriftSmoke(smokePuffs, carRoot.position, driftFrame.smokeHeading, t);
        lastSmokeSpawn = t;
      }
      updateDriftSmoke(smokePuffs, t, driftFrame.transitionProgress, camera);

      if (!completionAnnounced && handoffElapsed >= FINAL_REVEAL_TIME) {
        completionAnnounced = true;
        setIsComplete(true);
        setStatus("Thanks for booking. Your BMW is staged and ready.");
      }

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    const resize = () => {
      const nextWidth = Math.max(host.clientWidth, 1);
      const nextHeight = Math.max(host.clientHeight, 1);
      renderer.setSize(nextWidth, nextHeight, false);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", resize);
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, [
    model,
    resolvedPath,
    exteriorColor,
    interiorColor,
    wheelColor,
    wheelStyle,
    doorsOpen,
    windowsDown,
    lightsOn,
  ]);

  return (
    <div className="relative min-h-[calc(100vh-96px)] overflow-hidden rounded-2xl border border-white/10 bg-[#050608]">
      <div ref={hostRef} className="h-[calc(100vh-96px)] min-h-[680px] w-full" />
      <div className="pointer-events-none absolute left-6 top-6 max-w-xl rounded-2xl border border-white/10 bg-black/55 p-5 shadow-2xl backdrop-blur">
        <p className="m-0 text-xs uppercase tracking-[0.28em] text-[#68a7ff]">Drive Away</p>
        <h1 className="mt-2 text-4xl font-bold text-white">{model.name}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{handoffStatus}</p>
      </div>
      <div
        className={`pointer-events-none absolute right-6 top-6 max-w-md rounded-3xl border border-white/15 bg-black/60 px-6 py-5 text-right shadow-[0_24px_90px_rgba(0,0,0,0.65)] backdrop-blur transition duration-700 ${
          isComplete ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.36em] text-[#8cc8ff]">BMW Dealership</p>
        <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.14em] text-white sm:text-4xl">
          Thanks for booking
        </h2>
        <p className="mt-3 text-sm text-slate-300">Your configured BMW is ready for the next step.</p>
      </div>
      <button
        type="button"
        aria-pressed={isAudioPlaying}
        aria-label={isAudioPlaying ? "Pause drive away music" : "Play drive away music"}
        onClick={toggleAudio}
        className="absolute bottom-6 left-6 z-10 rounded-full border border-[#68a7ff]/40 bg-black/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d9ecff] shadow-xl backdrop-blur transition hover:border-[#9bd0ff]/70 hover:bg-[#0b2344]/80"
      >
        {isAudioPlaying ? "Audio On" : "Audio Off"}
      </button>
    </div>
  );
}

function addGarageDetails(scene: THREE.Scene) {
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 20),
    new THREE.MeshStandardMaterial({ color: "#15110d", roughness: 0.9 }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 5.6;
  ceiling.receiveShadow = true;
  scene.add(ceiling);

  const pipeMaterial = new THREE.MeshStandardMaterial({ color: "#6b3a2c", roughness: 0.58 });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 15, 16), pipeMaterial);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(0, 5.15, -6.9);
  scene.add(pipe);

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 6),
    new THREE.MeshStandardMaterial({ color: "#111318", roughness: 0.85 }),
  );
  wall.position.set(0, 2.9, -9.8);
  scene.add(wall);
}

function addParkingLines(scene: THREE.Scene) {
  const lineMaterial = new THREE.MeshBasicMaterial({ color: "#d0a44a", transparent: true, opacity: 0.42 });
  [-7.2, 7.2].forEach((x) => {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 18), lineMaterial);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.012, 0);
    scene.add(line);
  });
}

function createTireMarks(scene: THREE.Scene) {
  return [
    { radius: DRIFT_RADIUS, thickness: 0.07, opacity: 0.58 },
    { radius: DRIFT_RADIUS - 0.48, thickness: 0.055, opacity: 0.38 },
    { radius: DRIFT_RADIUS + 0.44, thickness: 0.045, opacity: 0.28 },
  ].map(({ radius, thickness, opacity }) => {
    const mark = new THREE.Mesh(
      new THREE.TorusGeometry(radius, thickness, 10, 220),
      new THREE.MeshBasicMaterial({ color: "#090908", transparent: true, opacity }),
    );
    mark.rotation.x = Math.PI / 2;
    mark.position.set(DRIFT_CENTER.x, 0.026, DRIFT_CENTER.z);
    scene.add(mark);
    return mark;
  });
}

function normalizeCarModel(object: THREE.Object3D, targetSize: number) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z);
  const scale = targetSize / (maxAxis || 1);

  object.scale.setScalar(scale);
  object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  object.updateMatrixWorld(true);

  const normalizedBox = new THREE.Box3().setFromObject(object);
  object.position.y += -normalizedBox.min.y;
  object.rotation.y = Math.PI / 2;
}

function applyDriveAwayConfiguration(
  root: THREE.Object3D,
  exteriorColor = "#F8F8F4",
  interiorColor = "#0b1220",
  wheelColor = "#cfd6df",
  wheelStyle: WheelStyle = "classic",
  doorsOpen = false,
  windowsDown = false,
  lightsOn = false,
) {
  applyDriveAwayColors(root, exteriorColor, interiorColor);
  applyDriveAwayWheels(root, wheelColor, wheelStyle);
  applyDriveAwayDoorState(root, doorsOpen);
  applyDriveAwayWindowState(root, windowsDown);
  applyDriveAwayLightState(root, lightsOn);
}

function applyDriveAwayColors(
  root: THREE.Object3D,
  exteriorColor = "#F8F8F4",
  interiorColor = "#0b1220",
) {
  const exterior = normalizeHexColor(exteriorColor, "#F8F8F4");
  const interior = normalizeHexColor(interiorColor, "#0b1220");

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const meshName = (obj.name || "").toLowerCase();
    getMaterials(obj).forEach((material) => {
      const mat = material as any;
      if (!mat?.color) return;

      const materialName = (mat.name || "").toLowerCase();
      const name = `${meshName} ${materialName}`;

      if (isRealLightMaterialName(name) || isGlassLike(name) || isWheelLike(name)) {
        return;
      }

      if (isInteriorLike(name)) {
        try {
          mat.color.set(interior);
          mat.needsUpdate = true;
        } catch {
          // Ignore malformed color values from manually edited URLs.
        }
        return;
      }

      if (isExteriorLike(name, mat) || mat.roughness < 0.8) {
        try {
          mat.color.set(exterior);
          mat.needsUpdate = true;
        } catch {
          // Ignore malformed color values from manually edited URLs.
        }
      }
    });
  });
}

function applyDriveAwayWheels(
  root: THREE.Object3D,
  wheelColor = "#cfd6df",
  wheelStyle: WheelStyle = "classic",
) {
  const wheel = normalizeHexColor(wheelColor, "#cfd6df");

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = getObjectSearchName(obj);
    if (!isWheelLike(name)) return;

    if (isDecorativeWheelBlurName(name)) {
      obj.visible = false;
      return;
    }

    obj.visible = true;
    obj.material = cloneMeshMaterials(obj);
    getMaterials(obj).forEach((material) => {
      const mat = material as any;
      if (!mat?.color) return;

      if (name.includes("tyre") || name.includes("tire")) {
        mat.color.set("#050609");
        mat.roughness = Math.max(mat.roughness ?? 0.7, 0.7);
      } else {
        mat.color.set(wheel);
        mat.metalness = wheelStyle === "sport" ? 0.95 : 0.82;
        mat.roughness = wheelStyle === "aero" ? 0.18 : 0.32;
      }

      mat.needsUpdate = true;
    });
  });
}

function cloneMeshMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material)
    ? mesh.material.map((material) => material.clone())
    : mesh.material.clone();
}

function applyDriveAwayDoorState(root: THREE.Object3D, open: boolean) {
  if (!open) return;

  root.traverse((obj) => {
    const name = (obj.name || "").toLowerCase();
    if (!name.includes("door")) return;

    obj.rotation.y += name.includes("left") || name.includes("driver") ? 0.68 : -0.68;
  });
}

function applyDriveAwayWindowState(root: THREE.Object3D, down: boolean) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = getObjectSearchName(obj);
    const isWindow =
      name.includes("window") ||
      name.includes("glass") ||
      name.includes("windshield") ||
      name.includes("windscreen");

    if (!isWindow) return;

    if (down && name.includes("window")) {
      obj.position.y -= 0.28;
    }

    getMaterials(obj).forEach((material) => {
      const mat = material as any;
      if (mat.opacity === undefined) return;

      mat.transparent = true;
      mat.opacity = down ? 0.08 : mat.opacity;
      mat.depthWrite = !down;
      mat.needsUpdate = true;
    });
  });
}

function applyDriveAwayLightState(root: THREE.Object3D, on: boolean) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = getObjectSearchName(obj);
    if (!isRealLightMaterialName(name) && !name.includes("headlight") && !name.includes("drl")) {
      return;
    }

    getMaterials(obj).forEach((material) => {
      const mat = material as any;
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = on ? 4.5 : 0.05;
      }
      if (mat.emissive && on) {
        mat.emissive.set("#ffffff");
      }
      mat.needsUpdate = true;
    });
  });
}

function getMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function getMaterialNames(mesh: THREE.Mesh) {
  return getMaterials(mesh)
    .map((material) => (material as any)?.name || "")
    .join(" ");
}

function getObjectSearchName(obj: THREE.Mesh) {
  return `${obj.name || ""} ${getMaterialNames(obj)}`.toLowerCase();
}

function isWheelLike(name: string) {
  return (
    name.includes("wheel") ||
    name.includes("rim") ||
    name.includes("rims") ||
    name.includes("alloy") ||
    name.includes("tire") ||
    name.includes("tyre") ||
    name.includes("tnrrims")
  );
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  if (!value) return fallback;

  const color = value.startsWith("#") ? value : `#${value}`;

  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color) ? color : fallback;
}

function isDecorativeWheelBlurName(name: string) {
  return (
    name.includes("tireblur") ||
    name.includes("tyreblur") ||
    name.includes("tire_blur") ||
    name.includes("tyre_blur") ||
    name.includes("wheelblur") ||
    name.includes("wheel_blur") ||
    name.includes("wheel1a_alpha")
  );
}

function isGlassLike(name: string) {
  return (
    name.includes("glass") ||
    name.includes("windshield") ||
    name.includes("windscreen") ||
    name.includes("window")
  );
}

function isInteriorLike(name: string) {
  return (
    name.includes("arm4_color_interior") ||
    name.includes("arm4_inter") ||
    name.includes("arm4_int_") ||
    name.includes("arm4_interior") ||
    name.includes("arm4_alcnt") ||
    name.includes("int_") ||
    name.includes("interior") ||
    name.includes("seat") ||
    name.includes("leather") ||
    name.includes("cockpit") ||
    name.includes("carpet") ||
    name.includes("plastic_black") ||
    name.includes("spec_interior") ||
    name.includes("dashboard") ||
    name.includes("steering")
  );
}

function isExteriorLike(name: string, material: any) {
  return (
    name.includes("arm4_main") ||
    name.includes("arm4_rgb") ||
    name.includes("ext_") ||
    name.includes("paint") ||
    name.includes("body") ||
    name.includes("carpaint") ||
    name.includes("car_paint") ||
    name.includes("exterior") ||
    name.includes("bodywork") ||
    name.includes("matte_colors") ||
    name.includes("skin_base") ||
    material.metalness > 0.2
  );
}

function isRealLightMaterialName(name: string) {
  return (
    name.includes("m4car_emissive1") ||
    name.includes("emissive1") ||
    name.includes("ext_lights") ||
    name.includes("lights_misc")
  );
}

function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    child.geometry?.dispose();
    getMaterials(child).forEach((material) => {
      if (!material) return;
      const mat = material as any;
      Object.keys(mat).forEach((key) => {
        const value = mat[key];
        if (value?.isTexture) value.dispose();
      });
      material.dispose();
    });
  });
}
