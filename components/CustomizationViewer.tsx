"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CarModel } from "@/data/models";
import type { WheelStyle } from "./CustomizationApp";

type Props = {
  model: CarModel;
  modelPath?: string;
  exteriorColor?: string;
  interiorColor?: string;
  wheelColor?: string;
  wheelStyle?: WheelStyle;
  doorsOpen?: boolean;
  windowsDown?: boolean;
  lightsOn?: boolean;
  wheelFocusKey?: number;
};

const pathMap: Record<string, string> = {
  "bmw-m3-cs-touring": "/models/2025_bmw_m3_cs_touring.glb",
  "bmw-m4-competition": "/models/2025_bmw_m4_competition.glb",
  "bmw-m4-f82": "/models/bmw_m4_f82.glb",
  "bmw-m3-topaz": "/models/bmw_m3_sedan_topaz_blue_car.glb",
  "bmw-x3": "/models/bmw_x3_m40i.glb",
  "bmw-z8": "/models/bmw_z8__www.vecarz.com.glb",
};

const SCENE_BACKGROUND = 0x050915;

/**
 * 车模型整体大小。
 * 数值越大，模型越大。
 */
const MODEL_TARGET_SIZE = 9.6;

/**
 * 相机距离系数。
 * 数值越小，车越大。
 */
const CAMERA_PADDING = 0.46;

/**
 * 车在画面里的填充比例。
 * 数值越大，车越撑满画布。
 */
const CAMERA_FILL_RATIO = 0.78;
const KEYBOARD_TRANSLATE_STEP = 0.22;

const FLOOR_TOP_Y = -0.42;
const MODEL_FLOOR_GAP = 0.02;

/**
 * 如果白色前灯出现在车尾，把这里改成 -1。
 */
const FRONT_SIGN: 1 | -1 = 1;

/**
 * 模型里真实的灯光材质名。
 */
const REAL_LIGHT_MATERIAL_NAME = "m4car_emissive1";

/**
 * 车灯内嵌发光强度。
 */
const FRONT_LIGHT_POWER = 3.4;
const REAR_LIGHT_POWER = 2.7;

const FRONT_LIGHT_OPACITY = 0.82;
const REAR_LIGHT_OPACITY = 0.78;

/**
 * 从真实灯光 mesh 中切前灯/尾灯三角面的判定范围。
 */
const EDGE_RATIO = 0.2;
const SIDE_RATIO = 0.36;
const MIN_HEIGHT_RATIO = 0.28;
const MAX_HEIGHT_RATIO = 0.72;

type LightPlacement = "front" | "rear";

export default function CustomizationViewer({
  model,
  modelPath,
  exteriorColor,
  interiorColor,
  wheelColor,
  wheelStyle = "classic",
  doorsOpen = false,
  windowsDown = false,
  lightsOn = false,
  wheelFocusKey = 0,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  const [hasModelLoaded, setHasModelLoaded] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const modelRef = useRef<THREE.Group | null>(null);
  const stageRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const exteriorColorRef = useRef<string | undefined>(exteriorColor);
  const interiorColorRef = useRef<string | undefined>(interiorColor);
  const wheelColorRef = useRef<string | undefined>(wheelColor);
  const wheelStyleRef = useRef<WheelStyle>(wheelStyle);
  const doorsOpenRef = useRef(doorsOpen);
  const windowsDownRef = useRef(windowsDown);
  const lightsOnRef = useRef(lightsOn);
  const previousInteriorColorRef = useRef<string | undefined>(interiorColor);
  const previousWheelColorRef = useRef<string | undefined>(wheelColor);
  const previousWheelStyleRef = useRef<WheelStyle>(wheelStyle);

  useEffect(() => {
    exteriorColorRef.current = exteriorColor;
    interiorColorRef.current = interiorColor;
    wheelColorRef.current = wheelColor;
    wheelStyleRef.current = wheelStyle;
    doorsOpenRef.current = doorsOpen;
    windowsDownRef.current = windowsDown;
    lightsOnRef.current = lightsOn;
  }, [exteriorColor, interiorColor, wheelColor, wheelStyle, doorsOpen, windowsDown, lightsOn]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_BACKGROUND);
    sceneRef.current = scene;

    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);

    const camera = new THREE.PerspectiveCamera(22, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(SCENE_BACKGROUND, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;

    if ("physicallyCorrectLights" in renderer) {
      (renderer as any).physicallyCorrectLights = true;
    }

    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.9;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.autoRotate = false;
    controls.target.set(0, 0, 0);
    controls.update();

    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight("#eef6ff", "#101a2c", 2.15);
    scene.add(hemi);

    const ambientFill = new THREE.AmbientLight("#dcecff", 0.72);
    scene.add(ambientFill);

    const overheadFill = new THREE.DirectionalLight("#ffffff", 3.35);
    overheadFill.position.set(0, 10.5, 2.2);
    scene.add(overheadFill);

    const frontPanelFill = new THREE.DirectionalLight("#d7ecff", 1.65);
    frontPanelFill.position.set(0, 4.4, 8.8);
    scene.add(frontPanelFill);

    const topDownSpot = new THREE.SpotLight(
      "#ffffff",
      640,
      22,
      Math.PI / 4.4,
      0.5,
      0.92,
    );
    topDownSpot.position.set(0, 9.8, 1.2);
    scene.add(topDownSpot);

    const keyLight = new THREE.SpotLight(
      "#b9d8ff",
      560,
      30,
      Math.PI / 5,
      0.35,
      1.1,
    );
    keyLight.position.set(-4.8, 7.2, 6.8);
    scene.add(keyLight);

    const rimLight = new THREE.SpotLight(
      "#ffffff",
      320,
      24,
      Math.PI / 6,
      0.4,
      1.2,
    );
    rimLight.position.set(5.5, 5.2, -5.8);
    scene.add(rimLight);

    const stageGroup = new THREE.Group();
    stageGroup.name = "__customization_stage";
    stageRef.current = stageGroup;
    scene.add(stageGroup);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.2, 0.32, 160),
      new THREE.MeshStandardMaterial({
        color: "#071331",
        metalness: 0.84,
        roughness: 0.24,
      }),
    );
    floor.position.y = -0.56;
    stageGroup.add(floor);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6.95, 0.04, 12, 192),
      new THREE.MeshBasicMaterial({
        color: "#6eb7ff",
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.4;
    stageGroup.add(ring);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.9, 0.02, 8, 160),
      new THREE.MeshBasicMaterial({
        color: "#245b9d",
        transparent: true,
        opacity: 0.65,
      }),
    );
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = -0.37;
    stageGroup.add(innerRing);

    let rafId: number | null = null;

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);

      rafId = requestAnimationFrame(animate);
    };

    const onResize = () => {
      const nextWidth = Math.max(host.clientWidth, 1);
      const nextHeight = Math.max(host.clientHeight, 1);

      renderer.setSize(nextWidth, nextHeight, false);

      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();

      if (modelRef.current) {
        fitCameraToObject(modelRef.current, camera, controlsRef.current);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        orbitCameraWithKeyboard(camera, controls, -0.14, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        orbitCameraWithKeyboard(camera, controls, 0.14, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        orbitCameraWithKeyboard(camera, controls, 0, -0.1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        orbitCameraWithKeyboard(camera, controls, 0, 0.1);
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomCameraWithKeyboard(camera, controls, 0.84);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomCameraWithKeyboard(camera, controls, 1.18);
      } else if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        translateModelWithKeyboard(camera, modelRef.current, stageRef.current, -KEYBOARD_TRANSLATE_STEP, 0);
      } else if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        translateModelWithKeyboard(camera, modelRef.current, stageRef.current, KEYBOARD_TRANSLATE_STEP, 0);
      } else if (event.key.toLowerCase() === "w") {
        event.preventDefault();
        translateModelWithKeyboard(camera, modelRef.current, stageRef.current, 0, KEYBOARD_TRANSLATE_STEP);
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        translateModelWithKeyboard(camera, modelRef.current, stageRef.current, 0, -KEYBOARD_TRANSLATE_STEP);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(host);
    } else {
      window.addEventListener("resize", onResize);
    }

    animate();
    onResize();

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener("resize", onResize);
      }

      window.removeEventListener("keydown", onKeyDown);

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      controls.dispose();

      if (host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }

      disposeObject3D(scene);
      renderer.dispose();

      modelRef.current = null;
      stageRef.current = null;
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const threeScene = sceneRef.current;
    if (!threeScene) return;

    const resolvedPath = modelPath ?? model.modelPath ?? pathMap[model.id] ?? "";

    const removeCurrentModel = () => {
      if (!modelRef.current) return;

      threeScene.remove(modelRef.current);
      disposeObject3D(modelRef.current);
      modelRef.current = null;
    };

    removeCurrentModel();

    setHasModelLoaded(false);
    setProgress(0);
    setLoadError(null);

    if (!resolvedPath) {
      console.warn("CustomizationViewer: no GLB for model id", model.id);
      return;
    }

    let cancelled = false;
    const loader = new GLTFLoader();

    loader.load(
      resolvedPath,
      (gltf) => {
        if (cancelled || !sceneRef.current) {
          disposeObject3D(gltf.scene);
          return;
        }

        const modelScene = gltf.scene;

        modelScene.updateMatrixWorld(true);

        const originalBox = new THREE.Box3().setFromObject(modelScene);
        const originalCenter = originalBox.getCenter(new THREE.Vector3());
        const originalSize = originalBox.getSize(new THREE.Vector3());

        const maxAxis = Math.max(
          originalSize.x,
          originalSize.y,
          originalSize.z,
        );

        const scale = maxAxis > 0 ? MODEL_TARGET_SIZE / maxAxis : 1;

        /**
         * 1. 把 GLB 模型自身中心移到原点
         * 2. 整体缩放
         * 3. 把模型底部放到展示台上
         */
        const centeredGroup = new THREE.Group();
        centeredGroup.add(modelScene);
        centeredGroup.position.set(
          -originalCenter.x,
          -originalCenter.y,
          -originalCenter.z,
        );

        const group = new THREE.Group();
        group.add(centeredGroup);
        group.scale.setScalar(scale);

        group.updateMatrixWorld(true);

        const scaledBox = new THREE.Box3().setFromObject(group);
        group.position.y = FLOOR_TOP_Y - scaledBox.min.y + MODEL_FLOOR_GAP;

        group.updateMatrixWorld(true);

        modelRef.current = group;
        sceneRef.current.add(group);

        applyColorsToScene(
          group,
          exteriorColorRef.current,
          interiorColorRef.current,
        );
        applyWheelCustomization(group, wheelColorRef.current, wheelStyleRef.current);
        applyDoorState(group, doorsOpenRef.current);
        applyWindowState(group, windowsDownRef.current);

        /**
         * 把车灯发光效果嵌入真实 m4car_emissive1 车灯 mesh，并用可控光源补强。
         */
        applyEmbeddedCarLights(modelScene, originalBox);
        setEmbeddedLightVisibility(group, lightsOnRef.current);
        applySimulatedHeadlights(group, lightsOnRef.current);

        if (cameraRef.current) {
          fitCameraToObject(group, cameraRef.current, controlsRef.current);
        }

        setHasModelLoaded(true);
        setProgress(100);

        console.info("CustomizationViewer: loaded", {
          path: resolvedPath,
          originalSize,
          originalCenter,
          scale,
        });
      },
      (xhr) => {
        if (cancelled) return;

        if (xhr.loaded && xhr.total) {
          setProgress(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err) => {
        if (cancelled) return;

        console.error("CustomizationViewer load error", err);
        setLoadError("Failed to load 3D model.");
        setHasModelLoaded(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [model.id, model.modelPath, modelPath]);

  useEffect(() => {
    if (!modelRef.current) return;

    applyColorsToScene(modelRef.current, exteriorColor, interiorColor);
    applyDoorState(modelRef.current, doorsOpenRef.current);

    if (interiorColor && previousInteriorColorRef.current !== interiorColor) {
      focusCameraOnInterior(modelRef.current, cameraRef.current, controlsRef.current);
    }

    previousInteriorColorRef.current = interiorColor;
  }, [exteriorColor, interiorColor]);

  useEffect(() => {
    if (!modelRef.current) return;

    applyWheelCustomization(modelRef.current, wheelColor, wheelStyle);

    if (
      (wheelColor && previousWheelColorRef.current !== wheelColor) ||
      previousWheelStyleRef.current !== wheelStyle
    ) {
      focusCameraOnWheels(modelRef.current, cameraRef.current, controlsRef.current);
    }

    previousWheelColorRef.current = wheelColor;
    previousWheelStyleRef.current = wheelStyle;
  }, [wheelColor, wheelStyle]);

  useEffect(() => {
    if (!modelRef.current || wheelFocusKey === 0) return;

    focusCameraOnWheels(modelRef.current, cameraRef.current, controlsRef.current);
  }, [wheelFocusKey]);

  useEffect(() => {
    if (!modelRef.current) return;

    applyDoorState(modelRef.current, doorsOpen);

    if (doorsOpen) {
      focusCameraOnDoors(modelRef.current, cameraRef.current, controlsRef.current);
    }
  }, [doorsOpen]);

  useEffect(() => {
    if (!modelRef.current) return;

    applyWindowState(modelRef.current, windowsDown);
  }, [windowsDown]);

  useEffect(() => {
    if (!modelRef.current) return;

    setEmbeddedLightVisibility(modelRef.current, lightsOn);
    applySimulatedHeadlights(modelRef.current, lightsOn);

    if (lightsOn) {
      focusCameraOnLights(modelRef.current, cameraRef.current, controlsRef.current);
    }
  }, [lightsOn]);

  const resolvedPath = modelPath ?? model.modelPath ?? pathMap[model.id] ?? "";

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-lg bg-[#050915]">
      <div
        ref={hostRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        tabIndex={0}
        aria-label="3D vehicle viewport. Drag left or right to rotate, use arrow keys to orbit, use plus or minus to zoom, and use W A S D to move the vehicle and stage."
      />

      {!resolvedPath && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-300">
          No 3D model available for this car. Add a <code>modelPath</code> to{" "}
          <code>data/models.json</code> or update the <code>pathMap</code>.
        </div>
      )}

      {resolvedPath && loadError && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-300">
          {loadError}
        </div>
      )}

      {resolvedPath && !loadError && !hasModelLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-slate-300">
            Loading 3D model... {progress}%
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-white/15 bg-black/60 px-4 py-2 text-sm text-white shadow-lg backdrop-blur">
        3D viewport — arrows orbit, +/- zoom, W/A/S/D move the vehicle and stage
      </div>
    </div>
  );
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

function translateModelWithKeyboard(
  camera: THREE.PerspectiveCamera,
  model: THREE.Group | null,
  stage: THREE.Group | null,
  deltaScreenX: number,
  deltaScreenY: number,
) {
  if (!model) return;

  /**
   * Translate in screen space instead of fixed world x/y. This keeps A/D moving
   * visually left/right after the camera has orbited to a side view, instead of
   * accidentally pushing the car forward/backward in depth.
   */
  const screenRight = new THREE.Vector3();
  const screenUp = new THREE.Vector3();
  camera.updateMatrixWorld(true);
  camera.matrixWorld.extractBasis(screenRight, screenUp, new THREE.Vector3());

  const movement = screenRight
    .multiplyScalar(deltaScreenX)
    .add(screenUp.multiplyScalar(deltaScreenY));

  model.position.add(movement);
  model.updateMatrixWorld(true);

  if (stage) {
    stage.position.add(movement);
    stage.updateMatrixWorld(true);
  }
}

function orbitCameraWithKeyboard(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  azimuthDelta: number,
  polarDelta: number,
) {
  const target = controls.target.clone();
  const offset = camera.position.clone().sub(target);
  const spherical = new THREE.Spherical().setFromVector3(offset);

  spherical.theta += azimuthDelta;
  spherical.phi = THREE.MathUtils.clamp(
    spherical.phi + polarDelta,
    0.18,
    Math.PI - 0.18,
  );

  offset.setFromSpherical(spherical);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  controls.update();
}

function zoomCameraWithKeyboard(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  factor: number,
) {
  const target = controls.target.clone();
  const offset = camera.position.clone().sub(target);
  const currentDistance = offset.length();
  const nextDistance = THREE.MathUtils.clamp(
    currentDistance * factor,
    controls.minDistance || 0.1,
    controls.maxDistance || currentDistance * 8,
  );

  offset.setLength(nextDistance);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  controls.update();
}

function fitCameraToObject(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls | null,
) {
  object.updateMatrixWorld(true);

  const box = getCleanWorldBox(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxSize = Math.max(size.x, size.y, size.z, 1);

  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);

  /**
   * Initial load must show a normal full-car view. Use the largest horizontal
   * axis instead of assuming x is width; several GLBs are length-aligned on z,
   * and fitting only x can place the camera inside the cabin/body.
   */
  const fitHeightDistance =
    size.y / (2 * Math.tan(verticalFov / 2) * CAMERA_FILL_RATIO);

  const fitWidthDistance =
    Math.max(size.x, size.z) /
    (2 * Math.tan(horizontalFov / 2) * CAMERA_FILL_RATIO);

  const distance =
    Math.max(fitHeightDistance, fitWidthDistance) * CAMERA_PADDING * 1.18;

  const metrics = getCarMetrics(object as THREE.Group);
  const target = new THREE.Vector3(
    center.x,
    center.y + size.y * 0.08,
    center.z,
  );

  const cameraPosition = target.clone();
  setAxisValue(
    cameraPosition,
    metrics.lengthAxis,
    getAxisValue(center, metrics.lengthAxis) + distance * 0.72,
  );
  setAxisValue(
    cameraPosition,
    metrics.widthAxis,
    getAxisValue(center, metrics.widthAxis) + distance * 0.46,
  );
  cameraPosition.y = center.y + size.y * 0.5;

  camera.position.copy(cameraPosition);
  camera.lookAt(target);

  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance + maxSize * 10;
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(target);
    controls.minDistance = Math.max(distance * 0.55, 1);
    controls.maxDistance = Math.max(distance * 2.2, maxSize * 2);
    controls.update();
  }
}

function applyEmbeddedCarLights(root: THREE.Object3D, rootBox: THREE.Box3) {
  removeExistingEmbeddedLightOverlays(root);

  root.updateMatrixWorld(true);

  const rootSize = rootBox.getSize(new THREE.Vector3());
  if (!isFiniteVector3(rootSize)) return;

  const lengthAxis: "x" | "z" = rootSize.x >= rootSize.z ? "x" : "z";
  const widthAxis: "x" | "z" = lengthAxis === "x" ? "z" : "x";

  const frontEdge =
    FRONT_SIGN === 1
      ? getAxisValue(rootBox.max, lengthAxis)
      : getAxisValue(rootBox.min, lengthAxis);

  const rearEdge =
    FRONT_SIGN === 1
      ? getAxisValue(rootBox.min, lengthAxis)
      : getAxisValue(rootBox.max, lengthAxis);

  const widthCenter =
    (getAxisValue(rootBox.min, widthAxis) +
      getAxisValue(rootBox.max, widthAxis)) /
    2;

  const totalLength = Math.abs(frontEdge - rearEdge);
  const totalWidth = Math.abs(
    getAxisValue(rootBox.max, widthAxis) -
      getAxisValue(rootBox.min, widthAxis),
  );
  const totalHeight = Math.abs(rootBox.max.y - rootBox.min.y);

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (!meshUsesRealLightMaterial(obj)) return;

    addEmbeddedOverlayToLightMesh({
      mesh: obj,
      root,
      rootBox,
      lengthAxis,
      widthAxis,
      frontEdge,
      rearEdge,
      widthCenter,
      totalLength,
      totalWidth,
      totalHeight,
    });
  });
}

function meshUsesRealLightMaterial(mesh: THREE.Mesh) {
  const meshName = (mesh.name || "").toLowerCase();

  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  return materials.some((material) => {
    if (!material) return false;

    const materialName = ((material as any).name || "").toLowerCase();
    const combinedName = `${meshName} ${materialName}`;

    return (
      combinedName.includes(REAL_LIGHT_MATERIAL_NAME) ||
      materialName.includes("emissive1")
    );
  });
}

function addEmbeddedOverlayToLightMesh({
  mesh,
  root,
  rootBox,
  lengthAxis,
  widthAxis,
  frontEdge,
  rearEdge,
  widthCenter,
  totalLength,
  totalWidth,
  totalHeight,
}: {
  mesh: THREE.Mesh;
  root: THREE.Object3D;
  rootBox: THREE.Box3;
  lengthAxis: "x" | "z";
  widthAxis: "x" | "z";
  frontEdge: number;
  rearEdge: number;
  widthCenter: number;
  totalLength: number;
  totalWidth: number;
  totalHeight: number;
}) {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position") as
    | THREE.BufferAttribute
    | undefined;

  if (!position || position.count < 3) return;

  const index = geometry.getIndex();

  const frontTriangles: number[] = [];
  const rearTriangles: number[] = [];

  const localA = new THREE.Vector3();
  const localB = new THREE.Vector3();
  const localC = new THREE.Vector3();
  const localCenter = new THREE.Vector3();

  const triangleCount = index
    ? Math.floor(index.count / 3)
    : Math.floor(position.count / 3);

  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
    const ia = getTriangleVertexIndex(index, triangleIndex, 0);
    const ib = getTriangleVertexIndex(index, triangleIndex, 1);
    const ic = getTriangleVertexIndex(index, triangleIndex, 2);

    if (
      ia < 0 ||
      ib < 0 ||
      ic < 0 ||
      ia >= position.count ||
      ib >= position.count ||
      ic >= position.count
    ) {
      continue;
    }

    localA.set(position.getX(ia), position.getY(ia), position.getZ(ia));
    localB.set(position.getX(ib), position.getY(ib), position.getZ(ib));
    localC.set(position.getX(ic), position.getY(ic), position.getZ(ic));

    if (
      !isFiniteVector3(localA) ||
      !isFiniteVector3(localB) ||
      !isFiniteVector3(localC)
    ) {
      continue;
    }

    localCenter.copy(localA).add(localB).add(localC).multiplyScalar(1 / 3);

    const rootPoint = toRootSpace(localCenter, mesh, root);
    if (!isFiniteVector3(rootPoint)) continue;

    const placement = classifyTrianglePlacement({
      rootPoint,
      rootBox,
      lengthAxis,
      widthAxis,
      frontEdge,
      rearEdge,
      widthCenter,
      totalLength,
      totalWidth,
      totalHeight,
    });

    if (placement === "front") {
      pushTriangle(frontTriangles, localA, localB, localC);
    } else if (placement === "rear") {
      pushTriangle(rearTriangles, localA, localB, localC);
    }
  }

  if (frontTriangles.length > 0) {
    createEmbeddedOverlayMesh({
      parent: mesh,
      name: "__embedded_front_light_overlay",
      positions: frontTriangles,
      color: "#ffffff",
      opacity: FRONT_LIGHT_OPACITY,
      power: FRONT_LIGHT_POWER,
    });
  }

  if (rearTriangles.length > 0) {
    createEmbeddedOverlayMesh({
      parent: mesh,
      name: "__embedded_rear_light_overlay",
      positions: rearTriangles,
      color: "#ff2b2b",
      opacity: REAR_LIGHT_OPACITY,
      power: REAR_LIGHT_POWER,
    });
  }

  enhanceOriginalLightMaterial(mesh);
}

function classifyTrianglePlacement({
  rootPoint,
  rootBox,
  lengthAxis,
  widthAxis,
  frontEdge,
  rearEdge,
  widthCenter,
  totalLength,
  totalWidth,
  totalHeight,
}: {
  rootPoint: THREE.Vector3;
  rootBox: THREE.Box3;
  lengthAxis: "x" | "z";
  widthAxis: "x" | "z";
  frontEdge: number;
  rearEdge: number;
  widthCenter: number;
  totalLength: number;
  totalWidth: number;
  totalHeight: number;
}): LightPlacement | null {
  const lengthValue = getAxisValue(rootPoint, lengthAxis);
  const widthValue = getAxisValue(rootPoint, widthAxis);

  const distFront = Math.abs(frontEdge - lengthValue);
  const distRear = Math.abs(lengthValue - rearEdge);

  const edgeThreshold = totalLength * EDGE_RATIO;
  const widthHalf = totalWidth / 2;
  const sideOffset = Math.abs(widthValue - widthCenter);
  const sideEnough = sideOffset >= widthHalf * SIDE_RATIO;

  const minY = rootBox.min.y + totalHeight * MIN_HEIGHT_RATIO;
  const maxY = rootBox.min.y + totalHeight * MAX_HEIGHT_RATIO;
  const heightOkay = rootPoint.y >= minY && rootPoint.y <= maxY;

  if (!sideEnough || !heightOkay) return null;

  if (distFront <= edgeThreshold && distFront < distRear) {
    return "front";
  }

  if (distRear <= edgeThreshold && distRear < distFront) {
    return "rear";
  }

  return null;
}

function createEmbeddedOverlayMesh({
  parent,
  name,
  positions,
  color,
  opacity,
  power,
}: {
  parent: THREE.Mesh;
  name: string;
  positions: number[];
  color: string;
  opacity: number;
  power: number;
}) {
  if (parent.children.some((child) => child.name === name)) return;

  const overlayGeometry = new THREE.BufferGeometry();
  overlayGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );

  const overlayMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  overlayMaterial.color.multiplyScalar(power);
  overlayMaterial.toneMapped = false;

  const overlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
  overlayMesh.name = name;
  overlayMesh.renderOrder = 100;
  overlayMesh.frustumCulled = false;
  overlayMesh.userData.__embeddedLightOverlay = true;

  parent.add(overlayMesh);
}

function enhanceOriginalLightMaterial(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  materials.forEach((material) => {
    if (!material) return;

    const mat = material as any;
    const materialName = (mat.name || "").toLowerCase();

    if (
      !materialName.includes(REAL_LIGHT_MATERIAL_NAME) &&
      !materialName.includes("emissive1")
    ) {
      return;
    }

    if (mat.color) {
      try {
        mat.color.set("#f4f8ff");
      } catch {
        // ignore
      }
    }

    if ("emissive" in mat && mat.emissive) {
      try {
        mat.emissive.set("#ffffff");
        mat.emissiveIntensity = 1.8;
      } catch {
        // ignore
      }
    }

    mat.needsUpdate = true;
  });
}

function removeExistingEmbeddedLightOverlays(root: THREE.Object3D) {
  root.traverse((obj) => {
    const childrenToRemove = obj.children.filter(
      (child) => child.userData?.__embeddedLightOverlay,
    );

    childrenToRemove.forEach((child) => {
      obj.remove(child);
      disposeObject3D(child);
    });
  });
}

function toRootSpace(
  localPoint: THREE.Vector3,
  mesh: THREE.Mesh,
  root: THREE.Object3D,
) {
  const worldPoint = mesh.localToWorld(localPoint.clone());
  return root.worldToLocal(worldPoint);
}

function pushTriangle(
  target: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
) {
  target.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}

function getTriangleVertexIndex(
  index: THREE.BufferAttribute | null,
  triangleIndex: number,
  corner: 0 | 1 | 2,
) {
  if (!index) {
    return triangleIndex * 3 + corner;
  }

  const value = index.getX(triangleIndex * 3 + corner);

  if (!Number.isFinite(value)) return -1;

  return Math.floor(value);
}

function getAxisValue(vector: THREE.Vector3, axis: "x" | "z") {
  return axis === "x" ? vector.x : vector.z;
}

function isFiniteVector3(vector: THREE.Vector3) {
  return (
    Number.isFinite(vector.x) &&
    Number.isFinite(vector.y) &&
    Number.isFinite(vector.z)
  );
}

function applyColorsToScene(
  group: THREE.Group,
  exterior?: string,
  interior?: string,
) {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const meshName = (obj.name || "").toLowerCase();
    const materials = Array.isArray(obj.material)
      ? obj.material
      : [obj.material];

    materials.forEach((material) => {
      if (!material) return;

      const mat = material as any;

      if (!mat.color) return;

      const materialName = (mat.name || "").toLowerCase();
      const name = `${meshName} ${materialName}`;

      /**
       * 不改真实灯光材质颜色。
       */
      if (
        name.includes(REAL_LIGHT_MATERIAL_NAME) ||
        materialName.includes("emissive1")
      ) {
        return;
      }

      const isGlass =
        name.includes("glass") ||
        name.includes("windshield") ||
        name.includes("window") ||
        /transparent|glass/.test(mat.type || "");

      const isWheel =
        name.includes("wheel") ||
        name.includes("tyre") ||
        name.includes("tire") ||
        name.includes("rim");

      if (isGlass || isWheel) return;

      const isInterior =
        name.includes("interior") ||
        name.includes("seat") ||
        name.includes("leather") ||
        name.includes("dashboard") ||
        name.includes("steering");

      const isExterior =
        name.includes("paint") ||
        name.includes("body") ||
        name.includes("carpaint") ||
        name.includes("car_paint") ||
        name.includes("exterior") ||
        name.includes("bodywork") ||
        mat.metalness > 0.2;

      if (interior && isInterior) {
        try {
          mat.color.set(interior);
          mat.needsUpdate = true;
        } catch {
          // ignore invalid color values
        }

        return;
      }

      if (exterior && isExterior) {
        try {
          mat.color.set(exterior);
          mat.needsUpdate = true;
        } catch {
          // ignore invalid color values
        }

        return;
      }

      if (exterior && mat.roughness !== undefined && mat.roughness < 0.8) {
        try {
          mat.color.set(exterior);
          mat.needsUpdate = true;
        } catch {
          // ignore invalid color values
        }
      }
    });
  });
}


type CarMetrics = {
  box: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
  lengthAxis: "x" | "z";
  widthAxis: "x" | "z";
  lengthMin: number;
  lengthMax: number;
  widthMin: number;
  widthMax: number;
};

type WheelAnchor = {
  box: THREE.Box3;
  center: THREE.Vector3;
  radius: number;
};

function getCarMetrics(group: THREE.Group): CarMetrics {
  group.updateMatrixWorld(true);

  const box = getCleanWorldBox(group);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const lengthAxis: "x" | "z" = size.x >= size.z ? "x" : "z";
  const widthAxis: "x" | "z" = lengthAxis === "x" ? "z" : "x";

  return {
    box,
    size,
    center,
    lengthAxis,
    widthAxis,
    lengthMin: getAxisValue(box.min, lengthAxis),
    lengthMax: getAxisValue(box.max, lengthAxis),
    widthMin: getAxisValue(box.min, widthAxis),
    widthMax: getAxisValue(box.max, widthAxis),
  };
}

function getCleanWorldBox(root: THREE.Object3D) {
  const box = new THREE.Box3();

  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (isCustomizationHelper(obj)) return;

    obj.updateWorldMatrix(true, false);
    const meshBox = new THREE.Box3().setFromObject(obj);
    if (!meshBox.isEmpty()) {
      box.union(meshBox);
    }
  });

  if (box.isEmpty()) {
    return new THREE.Box3().setFromObject(root);
  }

  return box;
}

function isCustomizationHelper(obj: THREE.Object3D) {
  return obj.name.startsWith("__custom_") || Boolean(obj.userData?.__customizationHelper);
}

function moveCameraTo(
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
  position: THREE.Vector3,
  target: THREE.Vector3,
  minDistance = 0.8,
  maxDistance?: number,
) {
  if (!camera) return;

  camera.position.copy(position);
  camera.lookAt(target);
  camera.near = 0.01;
  camera.far = Math.max(position.distanceTo(target) * 12, 100);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(target);
    const currentDistance = position.distanceTo(target);
    controls.minDistance = minDistance;
    controls.maxDistance = Math.max(maxDistance ?? currentDistance * 3, currentDistance * 3, 6);
    controls.update();
  }
}

function focusCameraOnWheels(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
) {
  const anchors = findWheelAnchors(group);
  const metrics = getCarMetrics(group);
  const length = Math.abs(metrics.lengthMax - metrics.lengthMin);
  const width = Math.abs(metrics.widthMax - metrics.widthMin);
  const anchor = anchors[0];
  const target = anchor?.center.clone() ?? new THREE.Vector3(metrics.center.x, metrics.box.min.y + metrics.size.y * 0.24, metrics.center.z);
  const radius = anchor?.radius ?? Math.max(metrics.size.y * 0.16, 0.55);

  if (!anchor) {
    setAxisValue(target, metrics.lengthAxis, metrics.lengthMin + length * 0.72);
    setAxisValue(target, metrics.widthAxis, metrics.widthMax);
  }

  /**
   * Aim at the wheel center and keep enough distance to frame the full tire.
   * This keeps the selected wheel in the middle of the viewport instead of
   * cropped against the bottom edge.
   */
  target.y += radius * 0.04;

  const sideDirection = getAxisValue(target, metrics.widthAxis) >=
    (metrics.widthMin + metrics.widthMax) / 2
    ? 1
    : -1;
  const distance = Math.max(radius * 3.4, width * 0.48, metrics.size.y * 0.7);
  const position = target.clone();
  setAxisValue(position, metrics.lengthAxis, getAxisValue(target, metrics.lengthAxis) + length * 0.08);
  setAxisValue(position, metrics.widthAxis, getAxisValue(target, metrics.widthAxis) + sideDirection * distance);
  position.y = target.y + radius * 0.18;

  /**
   * After focusing a wheel, users still need to zoom back out to inspect the
   * whole car. Keep the close wheel framing, but set a full-car max zoom range
   * instead of capping OrbitControls around the close-up distance.
   */
  const wholeCarZoomDistance = Math.max(length * 2.4, width * 4.2, metrics.size.y * 7.5, distance * 8);

  moveCameraTo(
    camera,
    controls,
    position,
    target,
    Math.max(radius * 0.35, 0.18),
    wholeCarZoomDistance,
  );
}

function focusCameraOnInterior(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
) {
  const metrics = getCarMetrics(group);
  const length = Math.abs(metrics.lengthMax - metrics.lengthMin);
  const width = Math.abs(metrics.widthMax - metrics.widthMin);
  const target = new THREE.Vector3(
    metrics.center.x,
    metrics.box.min.y + metrics.size.y * 0.58,
    metrics.center.z,
  );
  setAxisValue(target, metrics.lengthAxis, metrics.lengthMin + length * 0.5);

  /**
   * Use an elevated front-quarter cabin view instead of placing the camera deep
   * inside the dark dashboard. This frames seats/console through the windshield
   * or open cabin while avoiding a nearly black close-up surface.
   */
  const position = target.clone();
  setAxisValue(position, metrics.lengthAxis, metrics.lengthMin + length * 0.18);
  setAxisValue(position, metrics.widthAxis, metrics.widthMax + width * 0.28);
  position.y = metrics.box.min.y + metrics.size.y * 0.86;

  applyInteriorPreviewLight(group, target);
  moveCameraTo(camera, controls, position, target, 0.45, Math.max(length * 2.2, width * 4.2, 8));
}

function applyInteriorPreviewLight(group: THREE.Group, worldTarget: THREE.Vector3) {
  removeCustomChildren(group, "__custom_interior_preview_light");

  const metrics = getCarMetrics(group);
  const scale = getUniformWorldScale(group);
  const lightDistance = Math.max(metrics.size.x, metrics.size.y, metrics.size.z) * 0.75;
  const localTarget = group.worldToLocal(worldTarget.clone());

  const cabinPoint = new THREE.PointLight("#f5fbff", 95, lightDistance, 1.05);
  cabinPoint.name = "__custom_interior_preview_light";
  cabinPoint.userData.__customizationHelper = true;
  cabinPoint.position.copy(localTarget);
  cabinPoint.position.y += (metrics.size.y * 0.12) / scale;
  group.add(cabinPoint);

  const softFill = new THREE.SpotLight("#d9ecff", 70, lightDistance * 1.4, Math.PI / 3.2, 0.72, 1.1);
  softFill.name = "__custom_interior_preview_light";
  softFill.userData.__customizationHelper = true;
  softFill.position.copy(localTarget);
  softFill.position.y += (metrics.size.y * 0.55) / scale;
  const target = new THREE.Object3D();
  target.name = "__custom_interior_preview_light";
  target.userData.__customizationHelper = true;
  target.position.copy(localTarget);
  group.add(softFill, target);
  softFill.target = target;
}

function focusCameraOnDoors(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
) {
  const metrics = getCarMetrics(group);
  const width = Math.abs(metrics.widthMax - metrics.widthMin);
  const target = new THREE.Vector3(metrics.center.x, metrics.box.min.y + metrics.size.y * 0.48, metrics.center.z);
  setAxisValue(target, metrics.widthAxis, metrics.widthMax);

  const position = target.clone();
  setAxisValue(position, metrics.widthAxis, metrics.widthMax + width * 0.92);
  position.y += metrics.size.y * 0.12;

  moveCameraTo(camera, controls, position, target, 0.5);
}

function focusCameraOnLights(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
) {
  const metrics = getCarMetrics(group);
  const length = Math.abs(metrics.lengthMax - metrics.lengthMin);
  const target = new THREE.Vector3(metrics.center.x, metrics.box.min.y + metrics.size.y * 0.44, metrics.center.z);
  const front = FRONT_SIGN === 1 ? metrics.lengthMax : metrics.lengthMin;
  setAxisValue(target, metrics.lengthAxis, front);

  const position = target.clone();
  setAxisValue(
    position,
    metrics.lengthAxis,
    front + (FRONT_SIGN === 1 ? length * 0.62 : -length * 0.62),
  );
  position.y += metrics.size.y * 0.08;

  moveCameraTo(camera, controls, position, target, 0.45);
}

function applyWheelCustomization(
  group: THREE.Group,
  color = "#cfd6df",
  style: WheelStyle = "classic",
) {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = getObjectSearchName(obj);
    if (!isWheelLikeName(name)) return;

    if (isDecorativeWheelBlurName(name)) {
      obj.visible = false;
      return;
    }

    obj.visible = true;

    getMaterials(obj).forEach((material) => {
      const mat = material as any;
      if (!mat.color) return;

      if (name.includes("tyre") || name.includes("tire")) {
        mat.color.set("#050609");
        mat.roughness = Math.max(mat.roughness ?? 0.7, 0.7);
      } else {
        mat.color.set(color);
        mat.metalness = style === "sport" ? 0.95 : 0.82;
        mat.roughness = style === "aero" ? 0.18 : 0.32;
      }

      mat.needsUpdate = true;
    });
  });

  /**
   * Do not add replacement wheel geometry here. The source model keeps its
   * original wheels; wheel controls only recolor/restyle existing wheel
   * materials and then move the camera close to the actual wheel.
   */
  removeCustomChildren(group, "__custom_wheel_proxy");
  removeLegacyWheelHelpers(group);
}

function findWheelAnchors(group: THREE.Group): WheelAnchor[] {
  const metrics = getCarMetrics(group);
  const maxModelAxis = Math.max(metrics.size.x, metrics.size.y, metrics.size.z, 1);
  const wheelBoxes = new Map<string, THREE.Box3>();

  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (isCustomizationHelper(obj)) return;

    const name = getObjectSearchName(obj);
    if (!isWheelLikeName(name) || isDecorativeWheelBlurName(name)) return;

    obj.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const minDim = Math.min(size.x, size.y, size.z);

    if (!Number.isFinite(maxDim) || maxDim <= 0 || maxDim > maxModelAxis * 0.45 || minDim <= 0) {
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const side = getAxisValue(center, metrics.widthAxis) >=
      (metrics.widthMin + metrics.widthMax) / 2
      ? "right"
      : "left";
    const axle = getAxisValue(center, metrics.lengthAxis) >=
      (metrics.lengthMin + metrics.lengthMax) / 2
      ? "front"
      : "rear";
    const key = `${side}-${axle}`;
    const existing = wheelBoxes.get(key);

    if (existing) {
      existing.union(box);
    } else {
      wheelBoxes.set(key, box.clone());
    }
  });

  const anchors = Array.from(wheelBoxes.values()).map((box) => {
    const size = box.getSize(new THREE.Vector3());
    return {
      box,
      center: box.getCenter(new THREE.Vector3()),
      radius: Math.max(size.x, size.y, size.z) * 0.5,
    };
  });

  anchors.sort((a, b) => {
    const aSide = getAxisValue(a.center, metrics.widthAxis);
    const bSide = getAxisValue(b.center, metrics.widthAxis);
    const sideSort = bSide - aSide;
    if (Math.abs(sideSort) > 0.01) return sideSort;
    return getAxisValue(b.center, metrics.lengthAxis) - getAxisValue(a.center, metrics.lengthAxis);
  });

  return anchors.slice(0, 4);
}

function applyDoorState(group: THREE.Group, open: boolean) {
  /**
   * Do not create fake/proxy doors. Only move real door nodes that exist in the
   * loaded GLB. Models without separate door objects will remain unchanged.
   */
  removeCustomChildren(group, "__custom_door_proxy");
  const metrics = getCarMetrics(group);

  group.traverse((obj) => {
    if (isCustomizationHelper(obj)) return;

    const name = (obj.name || "").toLowerCase();
    if (!name.includes("door")) return;

    restoreOriginalDoorTransform(obj);

    if (!open) return;

    rotateRealDoorAroundComputedHinge(obj, metrics);
  });
}

function restoreOriginalDoorTransform(obj: THREE.Object3D) {
  if (!obj.userData.__customOriginalPosition) {
    obj.userData.__customOriginalPosition = obj.position.clone();
    obj.userData.__customOriginalQuaternion = obj.quaternion.clone();
    obj.userData.__customOriginalScale = obj.scale.clone();
  }

  obj.position.copy(obj.userData.__customOriginalPosition as THREE.Vector3);
  obj.quaternion.copy(obj.userData.__customOriginalQuaternion as THREE.Quaternion);
  obj.scale.copy(obj.userData.__customOriginalScale as THREE.Vector3);
  obj.updateMatrixWorld(true);
}

function rotateRealDoorAroundComputedHinge(
  obj: THREE.Object3D,
  metrics: CarMetrics,
) {
  obj.updateWorldMatrix(true, true);

  const parent = obj.parent;
  if (!parent) return;

  const doorBox = new THREE.Box3().setFromObject(obj);
  if (doorBox.isEmpty()) return;

  const doorCenter = doorBox.getCenter(new THREE.Vector3());
  const sideCenter = (metrics.widthMin + metrics.widthMax) / 2;
  const sideSign = getAxisValue(doorCenter, metrics.widthAxis) >= sideCenter ? 1 : -1;
  const hingeLength = FRONT_SIGN === 1
    ? getAxisValue(doorBox.max, metrics.lengthAxis)
    : getAxisValue(doorBox.min, metrics.lengthAxis);
  const hingePoint = doorCenter.clone();
  setAxisValue(hingePoint, metrics.lengthAxis, hingeLength);

  const openAngle = sideSign > 0 ? -0.95 : 0.95;
  const parentWorldInverse = parent.matrixWorld.clone().invert();
  const originalWorld = obj.matrixWorld.clone();
  const hingeRotation = new THREE.Matrix4()
    .makeTranslation(hingePoint.x, hingePoint.y, hingePoint.z)
    .multiply(new THREE.Matrix4().makeRotationY(openAngle))
    .multiply(new THREE.Matrix4().makeTranslation(-hingePoint.x, -hingePoint.y, -hingePoint.z));
  const newWorld = hingeRotation.multiply(originalWorld);
  const newLocal = parentWorldInverse.multiply(newWorld);

  newLocal.decompose(obj.position, obj.quaternion, obj.scale);
  obj.updateMatrixWorld(true);
}

function applyWindowState(group: THREE.Group, down: boolean) {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = getObjectSearchName(obj);
    const isGlass =
      name.includes("window") ||
      name.includes("glass") ||
      name.includes("windshield") ||
      name.includes("windscreen");

    if (!isGlass) return;

    if (!obj.userData.__customOriginalPosition) {
      obj.userData.__customOriginalPosition = obj.position.clone();
    }

    const originalPosition = obj.userData.__customOriginalPosition as THREE.Vector3;
    obj.position.copy(originalPosition);
    if (down && name.includes("window")) {
      obj.position.y -= 0.28;
    }

    getMaterials(obj).forEach((material) => {
      const mat = material as any;

      if (mat.opacity !== undefined) {
        if (mat.userData && mat.userData.__customOriginalOpacity === undefined) {
          mat.userData.__customOriginalOpacity = mat.opacity;
        }

        mat.transparent = true;
        mat.opacity = down ? 0.08 : (mat.userData?.__customOriginalOpacity ?? mat.opacity);
        mat.depthWrite = !down;
      }

      mat.needsUpdate = true;
    });
  });
}

function applySimulatedHeadlights(group: THREE.Group, on: boolean) {
  removeCustomChildren(group, "__custom_headlight_proxy");
  if (!on) return;

  const metrics = getCarMetrics(group);
  const scale = getUniformWorldScale(group);
  const length = Math.abs(metrics.lengthMax - metrics.lengthMin);
  const width = Math.abs(metrics.widthMax - metrics.widthMin);
  const front = FRONT_SIGN === 1 ? metrics.lengthMax : metrics.lengthMin;
  const lightY = metrics.box.min.y + metrics.size.y * 0.43;
  const lightWidths = [metrics.widthMin + width * 0.3, metrics.widthMax - width * 0.3];
  const direction = FRONT_SIGN === 1 ? 1 : -1;

  lightWidths.forEach((widthPos) => {
    const worldBulb = new THREE.Vector3(metrics.center.x, lightY, metrics.center.z);
    setAxisValue(worldBulb, metrics.lengthAxis, front + direction * length * 0.012);
    setAxisValue(worldBulb, metrics.widthAxis, widthPos);

    const bulbRadius = Math.max(width * 0.055, metrics.size.y * 0.035) / scale;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(bulbRadius, 32, 16),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 1, toneMapped: false }),
    );
    bulb.name = "__custom_headlight_proxy";
    bulb.userData.__customizationHelper = true;
    bulb.position.copy(group.worldToLocal(worldBulb.clone()));
    group.add(bulb);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(bulbRadius * 2.8, 32, 16),
      new THREE.MeshBasicMaterial({
        color: "#9ed8ff",
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    glow.name = "__custom_headlight_proxy";
    glow.userData.__customizationHelper = true;
    glow.position.copy(bulb.position);
    group.add(glow);

    const beamLength = (length * 0.52) / scale;
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(width * 0.16, 0.18) / scale, beamLength, 36, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#8fd3ff",
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    beam.name = "__custom_headlight_proxy";
    beam.userData.__customizationHelper = true;
    beam.position.copy(group.worldToLocal(worldBulb.clone()));
    setAxisValue(beam.position, metrics.lengthAxis, getAxisValue(beam.position, metrics.lengthAxis) + direction * beamLength * 0.5);
    beam.rotation.x = metrics.lengthAxis === "z" ? Math.PI / 2 : 0;
    beam.rotation.z = metrics.lengthAxis === "x" ? -direction * Math.PI / 2 : 0;
    group.add(beam);

    const spot = new THREE.SpotLight("#dff4ff", 55, length * 2.2, Math.PI / 7, 0.45, 0.9);
    spot.name = "__custom_headlight_proxy";
    spot.userData.__customizationHelper = true;
    spot.position.copy(bulb.position);
    const target = new THREE.Object3D();
    target.name = "__custom_headlight_proxy";
    target.userData.__customizationHelper = true;
    const worldTarget = worldBulb.clone();
    setAxisValue(worldTarget, metrics.lengthAxis, front + direction * length * 0.9);
    target.position.copy(group.worldToLocal(worldTarget));
    group.add(spot, target);
    spot.target = target;
  });
}

function setEmbeddedLightVisibility(group: THREE.Group, visible: boolean) {
  group.traverse((obj) => {
    if (obj.userData?.__embeddedLightOverlay) {
      obj.visible = visible;
    }

    if (obj instanceof THREE.Mesh && meshUsesRealLightMaterial(obj)) {
      getMaterials(obj).forEach((material) => {
        const mat = material as any;
        if (mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = visible ? 4.5 : 0.05;
        }
        if (mat.emissive && visible) {
          mat.emissive.set("#ffffff");
        }
        mat.needsUpdate = true;
      });
    }
  });
}

function removeCustomChildren(parent: THREE.Object3D, name: string) {
  const toRemove: THREE.Object3D[] = [];

  parent.traverse((obj) => {
    obj.children.forEach((child) => {
      if (child.name === name || child.name.startsWith(`${name}_`)) {
        toRemove.push(child);
      }
    });
  });

  toRemove.forEach((child) => {
    child.parent?.remove(child);
    disposeObject3D(child);
  });
}

function removeLegacyWheelHelpers(parent: THREE.Object3D) {
  const toRemove: THREE.Object3D[] = [];

  parent.traverse((obj) => {
    obj.children.forEach((child) => {
      const name = (child.name || "").toLowerCase();
      if (name.includes("custom") && name.includes("wheel")) {
        toRemove.push(child);
      }
    });
  });

  toRemove.forEach((child) => {
    child.parent?.remove(child);
    disposeObject3D(child);
  });
}

function getObjectSearchName(obj: THREE.Mesh) {
  return `${obj.name || ""} ${getMaterialNames(obj)}`.toLowerCase();
}

function isWheelLikeName(name: string) {
  return (
    name.includes("wheel") ||
    name.includes("rim") ||
    name.includes("rims") ||
    name.includes("alloy") ||
    name.includes("tyre") ||
    name.includes("tire") ||
    name.includes("tnrrims")
  );
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

function getUniformWorldScale(object: THREE.Object3D) {
  const scale = object.getWorldScale(new THREE.Vector3());
  return Math.max(scale.x, scale.y, scale.z, 0.0001);
}

function getMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function getMaterialNames(mesh: THREE.Mesh) {
  return getMaterials(mesh)
    .map((material) => (material as any)?.name || "")
    .join(" ");
}

function setAxisValue(vector: THREE.Vector3, axis: "x" | "z", value: number) {
  if (axis === "x") {
    vector.x = value;
  } else {
    vector.z = value;
  }
}

function disposeObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    if (child.geometry) {
      child.geometry.dispose();
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!material) return;

      const mat = material as any;

      Object.keys(mat).forEach((key) => {
        const value = mat[key];

        if (value && value.isTexture) {
          value.dispose();
        }
      });

      material.dispose();
    });
  });
}