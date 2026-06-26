"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CarModel } from "@/data/models";
import type { WheelStyle } from "./CustomizationApp";

type DriveVerseShowcaseProps = {
  model: CarModel;
  exteriorColor?: string;
  interiorColor?: string;
  wheelColor?: string;
  wheelStyle?: WheelStyle;
  doorsOpen?: boolean;
  windowsDown?: boolean;
  lightsOn?: boolean;
};

type WheelSlot = "front-left" | "front-right" | "rear-left" | "rear-right";

type WheelPivot = {
  slot: WheelSlot;
  steerPivot: THREE.Group;
  rollPivot: THREE.Group;
  isFront: boolean;
  rollAxis: "x" | "y" | "z";
  rollSign: number;
};

type CarDriveMetrics = {
  forwardYaw: number;
  wheelbase: number;
  wheelRadius: number;
};

const pathMap: Record<string, string> = {
  "bmw-m3-cs-touring": "/models/2025_bmw_m3_cs_touring.glb",
  "bmw-m4-competition": "/models/2025_bmw_m4_competition.glb",
  "bmw-m4-f82": "/models/bmw_m4_f82.glb",
  "bmw-m3-topaz": "/models/bmw_m3_sedan_topaz_blue_car.glb",
  "bmw-x3": "/models/bmw_x3_m40i.glb",
  "bmw-z8": "/models/bmw_z8__www.vecarz.com.glb",
};

const TRACK_PATH = "/models/drift_race_track_free.glb";
const TRACK_TARGET_SPAN = 280;
const MODEL_SIZE = 5;
const MAX_SPEED = 30;
const MAX_REVERSE = 10;
const ACCELERATION = 8;
const BRAKE_FORCE = 32;
const HANDBRAKE_FORCE = 58;
const HANDBRAKE_YAW_MULT = 3.4;
const HANDBRAKE_DRIFT_SPEED_DECAY = 5.2;
const HANDBRAKE_PIVOT_RATE = 4.2;
const HANDBRAKE_MIN_DRIFT_SPEED = 0.7;
const COAST_DRAG = 2.2;
const STEER_ANGLE = (42 * Math.PI) / 180;
const STEER_SPEED = 3.2;
const MAX_YAW_RATE = 1.45;
const YAW_RATE_ACCEL = 5.5;
const YAW_RATE_DECEL = 4.8;
const GTA_LOW_SPEED_PIVOT = 2.2;
const WHEELBASE = 2.4;
const REFERENCE_WHEEL_RADIUS = 0.35;
const CAM_DISTANCE = 5.0;
const CAM_HEIGHT = 3.0;
const CAM_LOOK_FORWARD = 5.5;
const CAM_LOOK_HEIGHT = 1.1;
const CAM_SPEED_PULLBACK = 3.2;
const SPEED_TO_KMH = 270 / MAX_SPEED;
const CAR_COLLISION_RADIUS = 1.25;

const MOVEMENT_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
]);

export default function DriveVerseShowcase({
  model,
  exteriorColor,
  interiorColor,
  wheelColor,
  wheelStyle,
  doorsOpen = false,
  windowsDown = false,
  lightsOn = false,
}: DriveVerseShowcaseProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const resolvedPath = model.modelPath ?? pathMap[model.id] ?? "";
  const [speedKmh, setSpeedKmh] = useState(0);
  const displayedSpeedRef = useRef(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !resolvedPath) return;

    const pressedKeys = new Set<string>();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        pressedKeys.add(" ");
        return;
      }
      const key = event.key.toLowerCase();
      if (!MOVEMENT_KEYS.has(key)) return;
      event.preventDefault();
      pressedKeys.add(key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.key === " ") {
        pressedKeys.delete(" ");
        return;
      }
      pressedKeys.delete(event.key.toLowerCase());
    };
    const onBlur = () => pressedKeys.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#6aacd4");
    scene.fog = new THREE.Fog("#8ec4e6", 80, 420);

    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 800);
    camera.position.set(0, CAM_HEIGHT + 3, -CAM_DISTANCE);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.width = "100%";
    host.appendChild(renderer.domElement);

    const cameraOffset = new THREE.Vector3();
    const cameraLookAt = new THREE.Vector3();

    const hemi = new THREE.HemisphereLight("#fff0d4", "#3a5a48", 1.55);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight("#ffe8c8", 3.1);
    sun.position.set(30, 50, 20);
    sun.target.position.set(0, 0, 0);
    scene.add(sun.target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 220;
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    scene.add(sun);

    const fill = new THREE.DirectionalLight("#c8e0ff", 0.65);
    fill.position.set(-20, 12, -15);
    scene.add(fill);

    const trackRoot = new THREE.Group();
    scene.add(trackRoot);

    const carWrapper = new THREE.Group();
    scene.add(carWrapper);

    const carBodyTilt = new THREE.Group();
    carWrapper.add(carBodyTilt);

    const trackMeshes: THREE.Mesh[] = [];
    let roadMeshes: THREE.Mesh[] = [];
    let treeColliders: TreeCollider[] = [];
    const groundRay = new THREE.Raycaster();
    const rayOrigin = new THREE.Vector3();
    const downVector = new THREE.Vector3(0, -1, 0);
    const upNormal = new THREE.Vector3(0, 1, 0);

    let wheelPivots: WheelPivot[] = [];
    let modelForwardYaw = Math.PI / 2;
    let driveWheelbase = WHEELBASE;
    let driveWheelRadius = REFERENCE_WHEEL_RADIUS;
    let carHeading = 0;
    let carPosition = new THREE.Vector3(0, 0, 0);
    let velocity = 0;
    let wheelSpin = 0;
    let bodyRoll = 0;
    let bodyPitch = 0;
    let currentSteerAngle = 0;
    let yawRate = 0;
    let spawnHeading = 0;
    let trackReady = false;
    let carReady = false;
    let disposed = false;
    let animationId = 0;
    const loader = new GLTFLoader();
    const clock = new THREE.Clock();

    const placeCarOnTrack = () => {
      if (!trackReady || !carReady) return;

      const surface = sampleTrackSurface(
        carPosition.x,
        carPosition.z,
        roadMeshes,
        groundRay,
        rayOrigin,
        downVector,
        upNormal,
      );
      carPosition.y = (surface.hit ? surface.y : 0) + 0.06;
      carWrapper.position.copy(carPosition);
      carHeading = spawnHeading;
      carWrapper.rotation.y = carHeading;
    };

    loader.load(
      TRACK_PATH,
      (gltf) => {
        if (disposed) {
          disposeObject3D(gltf.scene);
          return;
        }

        const track = gltf.scene;
        normalizeTrack(track, TRACK_TARGET_SPAN);
        track.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.receiveShadow = true;
            obj.castShadow = true;
            trackMeshes.push(obj);
          }
        });

        const preparedTrack = prepareTrackMeshes(trackMeshes);
        roadMeshes = preparedTrack.road;
        treeColliders = buildTreeColliders(preparedTrack.trees);
        trackRoot.add(track);

        const trackBox = new THREE.Box3().setFromObject(track);
        const spawn = findRoadSpawn(
          roadMeshes,
          trackBox,
          groundRay,
          rayOrigin,
          downVector,
          upNormal,
        );

        carPosition.set(spawn.x, spawn.y + 0.06, spawn.z);
        spawnHeading = spawn.heading;
        trackReady = true;
        placeCarOnTrack();
      },
      undefined,
      () => {},
    );

    loader.load(
      resolvedPath,
      (gltf) => {
        if (disposed) {
          disposeObject3D(gltf.scene);
          return;
        }

        const car = gltf.scene;
        const driveMetrics = normalizeCarModelForDrive(car, MODEL_SIZE);
        modelForwardYaw = driveMetrics.forwardYaw;
        driveWheelbase = driveMetrics.wheelbase;
        driveWheelRadius = driveMetrics.wheelRadius;
        applyDriveVerseConfiguration(
          car,
          exteriorColor,
          interiorColor,
          wheelColor,
          wheelStyle,
          doorsOpen,
          windowsDown,
          lightsOn,
        );

        car.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });

        wheelPivots = setupWheelPivots(car);
        const pivotMetrics = computeDriveMetricsFromPivots(wheelPivots, car);
        if (pivotMetrics.wheelbase > 0) driveWheelbase = pivotMetrics.wheelbase;
        if (pivotMetrics.wheelRadius > 0) {
          driveWheelRadius = pivotMetrics.wheelRadius;
        }
        carBodyTilt.add(car);
        carReady = true;
        placeCarOnTrack();
      },
      undefined,
      () => {},
    );

    const resize = () => {
      const nextWidth = Math.max(host.clientWidth, 1);
      const nextHeight = Math.max(host.clientHeight, 1);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight, false);
    };

    window.addEventListener("resize", resize);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      const forward = pressedKeys.has("w") || pressedKeys.has("arrowup");
      const backward = pressedKeys.has("s") || pressedKeys.has("arrowdown");
      const steerLeft = pressedKeys.has("a") || pressedKeys.has("arrowleft");
      const steerRight = pressedKeys.has("d") || pressedKeys.has("arrowright");
      const handbrake = pressedKeys.has(" ");
      const throttle = forward ? 1 : backward ? -1 : 0;

      if (handbrake) {
        const handbrakeDrag = HANDBRAKE_FORCE * dt;
        if (Math.abs(velocity) <= handbrakeDrag) velocity = 0;
        else velocity -= Math.sign(velocity) * handbrakeDrag;

        if (throttle > 0) {
          if (velocity < 0) velocity += BRAKE_FORCE * 0.45 * dt;
          else velocity += ACCELERATION * 0.3 * dt;
        } else if (throttle < 0) {
          if (velocity > 0) velocity -= BRAKE_FORCE * 0.45 * dt;
          else velocity -= ACCELERATION * 0.22 * dt;
        }
      } else if (throttle > 0) {
        if (velocity < 0) velocity += BRAKE_FORCE * dt;
        else velocity += ACCELERATION * dt;
      } else if (throttle < 0) {
        if (velocity > 0) velocity -= BRAKE_FORCE * dt;
        else velocity -= ACCELERATION * 0.65 * dt;
      } else {
        const drag = COAST_DRAG * dt;
        if (Math.abs(velocity) <= drag) velocity = 0;
        else velocity -= Math.sign(velocity) * drag;
      }

      velocity = THREE.MathUtils.clamp(velocity, -MAX_REVERSE, MAX_SPEED);

      let targetSteerAngle = 0;
      if (steerLeft) targetSteerAngle = STEER_ANGLE;
      else if (steerRight) targetSteerAngle = -STEER_ANGLE;

      const steerDelta = targetSteerAngle - currentSteerAngle;
      const maxSteerStep = STEER_SPEED * dt;
      if (Math.abs(steerDelta) <= maxSteerStep) {
        currentSteerAngle = targetSteerAngle;
      } else {
        currentSteerAngle += Math.sign(steerDelta) * maxSteerStep;
      }

      if (Math.abs(currentSteerAngle) > 0.001) {
        const steerInput = currentSteerAngle / STEER_ANGLE;
        const speedAbs = Math.abs(velocity);
        const speedFactor = THREE.MathUtils.clamp(speedAbs / MAX_SPEED, 0, 1);
        const turnStrength = THREE.MathUtils.lerp(2.35, 1.05, speedFactor);
        const effectiveSpeed = Math.max(speedAbs, throttle !== 0 ? 1.5 : 0);

        let targetYawRate = steerInput * effectiveSpeed * turnStrength * 0.36;

        if (velocity < -0.35) {
          targetYawRate *= -1;
        }

        if (handbrake && speedAbs > HANDBRAKE_MIN_DRIFT_SPEED) {
          const driftFactor = THREE.MathUtils.clamp(
            speedAbs / (MAX_SPEED * 0.5),
            0.35,
            1,
          );
          targetYawRate =
            steerInput *
            driftFactor *
            HANDBRAKE_YAW_MULT *
            MAX_YAW_RATE *
            Math.sign(velocity || throttle || 1);

          const driftDecay =
            HANDBRAKE_DRIFT_SPEED_DECAY * Math.abs(steerInput) * dt;
          if (speedAbs <= driftDecay) velocity = 0;
          else velocity -= Math.sign(velocity) * driftDecay;
        } else if (handbrake && speedAbs <= HANDBRAKE_MIN_DRIFT_SPEED) {
          targetYawRate =
            steerInput *
            HANDBRAKE_PIVOT_RATE *
            (throttle !== 0 ? Math.sign(throttle) : 1);
        } else if (speedAbs < 2.8 && throttle !== 0) {
          targetYawRate =
            steerInput * GTA_LOW_SPEED_PIVOT * Math.sign(throttle);
        }

        targetYawRate = THREE.MathUtils.clamp(
          targetYawRate,
          handbrake ? -MAX_YAW_RATE * 1.35 : -MAX_YAW_RATE,
          handbrake ? MAX_YAW_RATE * 1.35 : MAX_YAW_RATE,
        );

        const yawRateDelta = targetYawRate - yawRate;
        const maxYawStep = YAW_RATE_ACCEL * dt;
        if (Math.abs(yawRateDelta) <= maxYawStep) {
          yawRate = targetYawRate;
        } else {
          yawRate += Math.sign(yawRateDelta) * maxYawStep;
        }
      } else {
        const yawRateDelta = -yawRate;
        const maxYawStep = YAW_RATE_DECEL * dt;
        if (Math.abs(yawRateDelta) <= maxYawStep) {
          yawRate = 0;
        } else {
          yawRate += Math.sign(yawRateDelta) * maxYawStep;
        }
      }

      carHeading += yawRate * dt;

      const visualHeading = carHeading + modelForwardYaw;

      if (Math.abs(velocity) > 0.01) {
        const prevX = carPosition.x;
        const prevZ = carPosition.z;

        carPosition.x += Math.sin(visualHeading) * velocity * dt;
        carPosition.z += Math.cos(visualHeading) * velocity * dt;

        const constrained = constrainCarPosition(
          carPosition.x,
          carPosition.z,
          prevX,
          prevZ,
          roadMeshes,
          groundRay,
          rayOrigin,
          downVector,
          upNormal,
        );

        carPosition.x = constrained.x;
        carPosition.z = constrained.z;

        const treeHit = resolveTreeCollisions(
          carPosition.x,
          carPosition.z,
          prevX,
          prevZ,
          treeColliders,
          CAR_COLLISION_RADIUS,
        );

        carPosition.x = treeHit.x;
        carPosition.z = treeHit.z;

        const afterTrees = constrainCarPosition(
          carPosition.x,
          carPosition.z,
          prevX,
          prevZ,
          roadMeshes,
          groundRay,
          rayOrigin,
          downVector,
          upNormal,
        );

        carPosition.x = afterTrees.x;
        carPosition.z = afterTrees.z;

        if (treeHit.blocked || constrained.blocked || afterTrees.blocked) {
          velocity *= 0.28;
        }

        const spinDirection = velocity > 0 ? -1 : 1;
        wheelSpin +=
          (Math.abs(velocity) / Math.max(driveWheelRadius, 0.2)) *
          spinDirection *
          dt;
      }

      const surface = sampleTrackSurface(
        carPosition.x,
        carPosition.z,
        roadMeshes,
        groundRay,
        rayOrigin,
        downVector,
        upNormal,
      );
      carPosition.y = THREE.MathUtils.lerp(
        carPosition.y,
        (surface.hit ? surface.y : carPosition.y) + 0.06,
        trackReady ? 0.35 : 1,
      );

      const steerNorm = currentSteerAngle / STEER_ANGLE;
      const speedNorm = velocity / MAX_SPEED;
      const handbrakeSlide =
        handbrake && Math.abs(velocity) > 1 && Math.abs(steerNorm) > 0.05;
      const targetBodyRoll = THREE.MathUtils.clamp(
        -steerNorm * speedNorm * (handbrakeSlide ? 0.38 : 0.22),
        handbrakeSlide ? -0.28 : -0.18,
        handbrakeSlide ? 0.28 : 0.18,
      );

      let targetBodyPitch = 0;
      if (handbrakeSlide) {
        targetBodyPitch = 0.05;
      } else if (throttle > 0 && velocity >= 0) {
        targetBodyPitch = -0.05 * (1 - Math.abs(speedNorm) * 0.5);
      } else if (throttle < 0 && velocity > 0.5) {
        targetBodyPitch = 0.07;
      } else if (throttle < 0 && velocity < 0) {
        targetBodyPitch = 0.035;
      } else if (handbrake && Math.abs(velocity) > 0.5) {
        targetBodyPitch = 0.06;
      }

      bodyRoll = THREE.MathUtils.lerp(bodyRoll, targetBodyRoll, 0.14);
      bodyPitch = THREE.MathUtils.lerp(bodyPitch, targetBodyPitch, 0.14);
      carBodyTilt.rotation.z = bodyRoll;
      carBodyTilt.rotation.x = bodyPitch;

      carWrapper.position.copy(carPosition);
      carWrapper.rotation.y = carHeading;

      for (const pivot of wheelPivots) {
        pivot.rollPivot.rotation.set(0, 0, 0);
        pivot.rollPivot.rotation[pivot.rollAxis] = wheelSpin * pivot.rollSign;

        if (pivot.isFront) {
          pivot.steerPivot.rotation.set(0, currentSteerAngle, 0);
        } else {
          pivot.steerPivot.rotation.set(0, 0, 0);
        }
      }

      const snapX = Math.floor(carPosition.x / 120) * 120;
      const snapZ = Math.floor(carPosition.z / 120) * 120;
      sun.position.set(snapX + 30, 50, snapZ + 20);
      sun.target.position.set(snapX, 0, snapZ);
      sun.target.updateMatrixWorld();

      const speedNormCam = THREE.MathUtils.clamp(
        Math.abs(velocity) / MAX_SPEED,
        0,
        1,
      );
      const camDistance = CAM_DISTANCE + speedNormCam * CAM_SPEED_PULLBACK;
      const camHeight = CAM_HEIGHT + speedNormCam * 0.6;
      const behindHeading = visualHeading + Math.PI;

      cameraOffset.set(
        Math.sin(behindHeading) * camDistance,
        camHeight,
        Math.cos(behindHeading) * camDistance,
      );

      camera.position.set(
        carPosition.x + cameraOffset.x,
        carPosition.y + cameraOffset.y,
        carPosition.z + cameraOffset.z,
      );
      cameraLookAt.set(
        carPosition.x + Math.sin(visualHeading) * CAM_LOOK_FORWARD,
        carPosition.y + CAM_LOOK_HEIGHT,
        carPosition.z + Math.cos(visualHeading) * CAM_LOOK_FORWARD,
      );
      camera.lookAt(cameraLookAt);

      const nextSpeedKmh = Math.round(Math.abs(velocity) * SPEED_TO_KMH);
      if (nextSpeedKmh !== displayedSpeedRef.current) {
        displayedSpeedRef.current = nextSpeedKmh;
        setSpeedKmh(nextSpeedKmh);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      disposed = true;
      displayedSpeedRef.current = 0;
      setSpeedKmh(0);
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", resize);
      disposeObject3D(trackRoot);
      disposeObject3D(carWrapper);
      renderer.dispose();
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [
    resolvedPath,
    exteriorColor,
    interiorColor,
    wheelColor,
    wheelStyle,
    doorsOpen,
    windowsDown,
    lightsOn,
  ]);

  if (!resolvedPath) {
    return (
      <div className="flex h-full min-h-[calc(100vh-96px)] items-center justify-center rounded-2xl border border-white/15 bg-[#030711] text-slate-300">
        No 3D model is available for DriveVerse.
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-96px)] min-h-[520px] overflow-hidden rounded-2xl border border-white/15">
      <div ref={hostRef} className="h-full w-full" tabIndex={0} />

      {/* <div className="pointer-events-none absolute left-5 top-5 z-10 max-w-sm rounded-xl border border-white/10 bg-black/45 px-4 py-3 shadow-lg backdrop-blur">
        <p className="m-0 text-xs uppercase tracking-[0.22em] text-[#4bf1fa]">
          Drive
          <span className="text-[#eaea50]">Verse</span>
        </p>
        <h1 className="my-1 text-2xl font-bold text-slate-100">{model.name}</h1>
        
      </div> */}

      <div className="pointer-events-none absolute bottom-5 left-5 z-10 rounded-xl border border-white/10 bg-black/50 px-5 py-3 text-center shadow-lg backdrop-blur">
        <p className="m-0 text-xs uppercase tracking-[0.18em] text-slate-400">
          Controls
        </p>
        <p className="mb-0 mt-1 text-sm text-slate-200">
          <span className="font-semibold text-white">W / ↑</span> Forward
          {" · "}
          <span className="font-semibold text-white">S / ↓</span> Backward
          {" · "}
          <span className="font-semibold text-white">A / ←</span> Steer Left
          {" · "}
          <span className="font-semibold text-white">D / →</span> Steer Right
          {" · "}
          <span className="font-semibold text-white">Space</span> Handbrake
        </p>
      </div>

      <div className="pointer-events-none absolute bottom-5 right-5 z-10 min-w-[112px] rounded-xl border border-white/10 bg-black/55 px-4 py-3 text-right shadow-lg backdrop-blur">
        <p className="m-0 text-[10px] uppercase tracking-[0.22em] text-slate-400"></p>
        <p className="my-0.5 text-4xl font-bold tabular-nums leading-none text-white">
          {speedKmh}
        </p>
        <p className="m-0 text-xs font-medium uppercase tracking-[0.16em] text-[#4bf1fa]">
          km/h
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4bf1fa] to-[#eaea50] transition-[width] duration-100"
            style={{
              width: `${Math.min((speedKmh / 270) * 100, 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function normalizeTrack(object: THREE.Object3D, targetSpan: number) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const horizontalSpan = Math.max(size.x, size.z);
  const scale = targetSpan / (horizontalSpan || 1);

  object.scale.setScalar(scale);
  object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  object.updateMatrixWorld(true);

  const normalizedBox = new THREE.Box3().setFromObject(object);
  object.position.y += -normalizedBox.min.y;
}

type TrackSurfaceSample = {
  y: number;
  normal: THREE.Vector3;
  hit: boolean;
};

type TrackSpawn = {
  x: number;
  z: number;
  y: number;
  heading: number;
};

type TreeCollider = {
  x: number;
  z: number;
  radius: number;
};

type PreparedTrackMeshes = {
  road: THREE.Mesh[];
  trees: THREE.Mesh[];
};

function prepareTrackMeshes(meshes: THREE.Mesh[]): PreparedTrackMeshes {
  const metrics = meshes.map((mesh) => {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    return {
      mesh,
      footprint: Math.max(size.x * size.z, 0.0001),
      height: size.y,
      luminance: getMeshAverageLuminance(mesh),
    };
  });

  const maxFootprint = Math.max(
    ...metrics.map((entry) => entry.footprint),
    0.0001,
  );
  const road: THREE.Mesh[] = [];
  const trees: THREE.Mesh[] = [];

  for (const entry of metrics) {
    const name = getTrackMeshSearchName(entry.mesh);

    if (isVegetationLikeName(name)) {
      entry.mesh.visible = true;
      entry.mesh.castShadow = true;
      entry.mesh.receiveShadow = true;
      ensureAncestorsVisible(entry.mesh);
      trees.push(entry.mesh);
      continue;
    }

    if (shouldKeepRoadMesh(entry, maxFootprint)) {
      entry.mesh.visible = true;
      entry.mesh.castShadow = true;
      entry.mesh.receiveShadow = true;
      road.push(entry.mesh);
      continue;
    }

    entry.mesh.visible = false;
    entry.mesh.castShadow = false;
  }

  if (road.length === 0) {
    const largest = [...metrics].sort((a, b) => b.footprint - a.footprint)[0];
    if (largest) {
      largest.mesh.visible = true;
      largest.mesh.castShadow = true;
      largest.mesh.receiveShadow = true;
      road.push(largest.mesh);
    }
  }

  return { road, trees };
}

function buildTreeColliders(meshes: THREE.Mesh[]): TreeCollider[] {
  return meshes.map((mesh) => {
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.z) * 0.4 + 0.12;

    return { x: center.x, z: center.z, radius };
  });
}

function resolveTreeCollisions(
  x: number,
  z: number,
  prevX: number,
  prevZ: number,
  colliders: TreeCollider[],
  carRadius: number,
) {
  if (!colliders.length) {
    return { x, z, blocked: false };
  }

  let nextX = x;
  let nextZ = z;
  let blocked = false;

  for (let pass = 0; pass < 3; pass += 1) {
    let pushed = false;

    for (const tree of colliders) {
      const dx = nextX - tree.x;
      const dz = nextZ - tree.z;
      const minDist = carRadius + tree.radius;
      const distSq = dx * dx + dz * dz;

      if (distSq >= minDist * minDist) continue;

      blocked = true;
      pushed = true;

      if (distSq < 1e-6) {
        return { x: prevX, z: prevZ, blocked: true };
      }

      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      nextX += (dx / dist) * overlap;
      nextZ += (dz / dist) * overlap;
    }

    if (!pushed) break;
  }

  return { x: nextX, z: nextZ, blocked };
}

type TrackMeshMetrics = {
  mesh: THREE.Mesh;
  footprint: number;
  height: number;
  luminance: number;
};

function shouldKeepRoadMesh(entry: TrackMeshMetrics, maxFootprint: number) {
  const { footprint, height, luminance } = entry;
  const footprintRatio = footprint / maxFootprint;
  const name = getTrackMeshSearchName(entry.mesh);

  if (isFenceLikeName(name)) return false;

  // Generic Sketchfab names: hide black/dark fence rails and posts.
  if (luminance < 0.16) return false;

  const flatEnough = height <= Math.max(Math.sqrt(footprint) * 0.45, 2.5);

  if (
    height > Math.max(Math.sqrt(footprint) * 0.55, 1.8) &&
    footprintRatio < 0.08
  ) {
    return false;
  }

  if (footprintRatio >= 0.035 && flatEnough) return true;

  if (
    footprintRatio >= 0.004 &&
    flatEnough &&
    height <= 0.8 &&
    luminance >= 0.16
  ) {
    return true;
  }

  return false;
}

function getMeshAverageLuminance(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  let total = 0;
  let count = 0;

  for (const material of materials) {
    const color = (material as THREE.MeshStandardMaterial)?.color;
    if (!color) continue;
    total += 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
    count += 1;
  }

  return count > 0 ? total / count : 0.45;
}

function getTrackMeshSearchName(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  const materialNames = materials
    .map((material) => material?.name || "")
    .join(" ");
  const ancestorNames: string[] = [];
  let current: THREE.Object3D | null = mesh.parent;

  while (current) {
    if (current.name) ancestorNames.push(current.name);
    current = current.parent;
  }

  return `${mesh.name || ""} ${ancestorNames.join(" ")} ${materialNames}`.toLowerCase();
}

function isVegetationLikeName(name: string) {
  return (
    name.includes("bush") ||
    name.includes("tree") ||
    name.includes("plant") ||
    name.includes("foliage") ||
    name.includes("vegetation") ||
    name.includes("leafs") ||
    name.includes("leaves")
  );
}

function ensureAncestorsVisible(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object.parent;

  while (current) {
    current.visible = true;
    current = current.parent;
  }
}

function isFenceLikeName(name: string) {
  return (
    name.includes("fence") ||
    name.includes("barrier") ||
    name.includes("guard") ||
    name.includes("rail") ||
    name.includes("border") ||
    name.includes("curb") ||
    name.includes("kerb") ||
    name.includes("wall") ||
    name.includes("post") ||
    name.includes("pole") ||
    name.includes("net") ||
    name.includes("wire") ||
    name.includes("concrete") ||
    name.includes("steel")
  );
}

function findRoadSpawn(
  roadMeshes: THREE.Mesh[],
  trackBox: THREE.Box3,
  groundRay: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
  downVector: THREE.Vector3,
  fallbackNormal: THREE.Vector3,
): TrackSpawn {
  const center = trackBox.getCenter(new THREE.Vector3());
  const size = trackBox.getSize(new THREE.Vector3());
  const runsAlongZ = size.z >= size.x;
  let best: { x: number; z: number; y: number; score: number } | null = null;

  for (let u = -0.4; u <= 0.4; u += 0.03) {
    for (let v = -0.4; v <= 0.4; v += 0.03) {
      const x = center.x + u * size.x;
      const z = center.z + v * size.z;
      const sample = sampleTrackSurface(
        x,
        z,
        roadMeshes,
        groundRay,
        rayOrigin,
        downVector,
        fallbackNormal,
      );

      if (!sample.hit) continue;

      const centerBias = 1 - (Math.abs(u) + Math.abs(v)) * 0.85;
      const startBias = runsAlongZ ? -v * 0.25 : -u * 0.25;
      const score = centerBias + startBias;

      if (!best || score > best.score) {
        best = { x, z, y: sample.y, score };
      }
    }
  }

  const heading = runsAlongZ ? -Math.PI / 2 : 0;

  if (best) {
    return { x: best.x, z: best.z, y: best.y, heading };
  }

  const fallback = sampleTrackSurface(
    center.x,
    center.z,
    roadMeshes,
    groundRay,
    rayOrigin,
    downVector,
    fallbackNormal,
  );

  return {
    x: center.x,
    z: center.z,
    y: fallback.hit ? fallback.y : 0,
    heading,
  };
}

function constrainCarPosition(
  x: number,
  z: number,
  prevX: number,
  prevZ: number,
  roadMeshes: THREE.Mesh[],
  groundRay: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
  downVector: THREE.Vector3,
  fallbackNormal: THREE.Vector3,
) {
  const road = sampleTrackSurface(
    x,
    z,
    roadMeshes,
    groundRay,
    rayOrigin,
    downVector,
    fallbackNormal,
  );

  if (!road.hit) {
    return { x: prevX, z: prevZ, blocked: true };
  }

  const midX = (x + prevX) * 0.5;
  const midZ = (z + prevZ) * 0.5;
  const midRoad = sampleTrackSurface(
    midX,
    midZ,
    roadMeshes,
    groundRay,
    rayOrigin,
    downVector,
    fallbackNormal,
  );

  if (!midRoad.hit) {
    return { x: prevX, z: prevZ, blocked: true };
  }

  return { x, z, blocked: false };
}

function sampleTrackSurface(
  x: number,
  z: number,
  meshes: THREE.Mesh[],
  groundRay: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
  downVector: THREE.Vector3,
  fallbackNormal: THREE.Vector3,
): TrackSurfaceSample {
  if (!meshes.length) {
    return { y: 0, normal: fallbackNormal, hit: false };
  }

  rayOrigin.set(x, 200, z);
  groundRay.set(rayOrigin, downVector);
  const hits = groundRay.intersectObjects(meshes, true);
  if (!hits.length) {
    return { y: 0, normal: fallbackNormal, hit: false };
  }

  const hit = hits[0];
  let normal = fallbackNormal.clone();
  if (hit.face) {
    normal = hit.face.normal
      .clone()
      .transformDirection(hit.object.matrixWorld)
      .normalize();
  }

  return { y: hit.point.y, normal, hit: true };
}

function setupWheelPivots(car: THREE.Group): WheelPivot[] {
  const metrics = getCarMetrics(car);
  const maxModelAxis = Math.max(
    metrics.size.x,
    metrics.size.y,
    metrics.size.z,
    1,
  );

  const buckets = new Map<
    WheelSlot,
    { meshes: THREE.Mesh[]; center: THREE.Vector3 }
  >();

  car.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = getObjectSearchName(obj);
    if (!isWheelLike(name) || isDecorativeWheelBlurName(name)) return;

    obj.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(obj);
    const meshSize = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(meshSize.x, meshSize.y, meshSize.z);
    const minDim = Math.min(meshSize.x, meshSize.y, meshSize.z);

    if (
      !Number.isFinite(maxDim) ||
      maxDim <= 0 ||
      maxDim > maxModelAxis * 0.45 ||
      minDim <= 0
    ) {
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const side =
      getAxisValue(center, metrics.widthAxis) >=
      (metrics.widthMin + metrics.widthMax) / 2
        ? "right"
        : "left";
    const axle =
      getAxisValue(center, metrics.lengthAxis) >=
      (metrics.lengthMin + metrics.lengthMax) / 2
        ? "front"
        : "rear";
    const slot = `${axle}-${side}` as WheelSlot;

    const bucket = buckets.get(slot) ?? {
      meshes: [],
      center: new THREE.Vector3(),
    };
    bucket.meshes.push(obj);
    bucket.center.add(center);
    buckets.set(slot, bucket);
  });

  const pivots: WheelPivot[] = [];

  buckets.forEach((bucket, slot) => {
    if (bucket.meshes.length === 0) return;

    bucket.center.divideScalar(bucket.meshes.length);
    car.worldToLocal(bucket.center);

    const steerPivot = new THREE.Group();
    steerPivot.name = `__driveverse_steer_${slot}`;
    steerPivot.position.copy(bucket.center);

    const rollPivot = new THREE.Group();
    rollPivot.name = `__driveverse_roll_${slot}`;
    steerPivot.add(rollPivot);

    car.add(steerPivot);

    for (const mesh of bucket.meshes) {
      rollPivot.attach(mesh);
    }

    const side = slot.includes("right") ? "right" : "left";
    const rollAxis = detectWheelRollAxis(bucket.meshes, car, side);

    pivots.push({
      slot,
      steerPivot,
      rollPivot,
      isFront: slot.startsWith("front"),
      rollAxis: rollAxis.axis,
      rollSign: rollAxis.sign,
    });
  });

  return pivots;
}

type CarMetrics = {
  size: THREE.Vector3;
  lengthAxis: "x" | "z";
  widthAxis: "x" | "z";
  lengthMin: number;
  lengthMax: number;
  widthMin: number;
  widthMax: number;
};

function getCarMetrics(group: THREE.Group): CarMetrics {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const lengthAxis: "x" | "z" = size.x >= size.z ? "x" : "z";
  const widthAxis: "x" | "z" = lengthAxis === "x" ? "z" : "x";

  return {
    size,
    lengthAxis,
    widthAxis,
    lengthMin: getAxisValue(box.min, lengthAxis),
    lengthMax: getAxisValue(box.max, lengthAxis),
    widthMin: getAxisValue(box.min, widthAxis),
    widthMax: getAxisValue(box.max, widthAxis),
  };
}

function getAxisValue(vector: THREE.Vector3, axis: "x" | "z") {
  return axis === "x" ? vector.x : vector.z;
}

function normalizeCarModelForDrive(
  object: THREE.Object3D,
  targetSize: number,
): CarDriveMetrics {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z);
  const scale = targetSize / (maxAxis || 1);

  object.scale.setScalar(scale);
  object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  object.rotation.set(0, 0, 0);
  object.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(object);
  object.position.y += -scaledBox.min.y;
  object.updateMatrixWorld(true);

  const forwardYaw = alignCarToDriveFrame(object as THREE.Group);
  const wheelHints = collectWheelHints(object as THREE.Group);
  const wheelbase =
    estimateWheelbaseFromHints(wheelHints, object as THREE.Group) ||
    estimateWheelbaseFromBody(object as THREE.Group);
  const wheelRadius =
    estimateWheelRadiusFromHints(wheelHints) || REFERENCE_WHEEL_RADIUS;

  return {
    forwardYaw,
    wheelbase,
    wheelRadius,
  };
}

function alignCarToDriveFrame(car: THREE.Group): number {
  const hints = collectWheelHints(car);

  if (hints.length >= 2) {
    const fronts = hints.filter((hint) => hint.isFront);
    const rears = hints.filter((hint) => !hint.isFront);

    if (fronts.length > 0 && rears.length > 0) {
      const frontCenter = averageWheelCenters(fronts);
      const rearCenter = averageWheelCenters(rears);
      const forward = frontCenter.sub(rearCenter);
      forward.y = 0;

      if (forward.lengthSq() > 0.0001) {
        forward.normalize();
        car.rotation.y = -Math.atan2(forward.x, forward.z);
        return car.rotation.y;
      }
    }
  }

  const metrics = getCarMetrics(car);
  car.rotation.y = metrics.lengthAxis === "x" ? Math.PI / 2 : 0;
  return car.rotation.y;
}

type WheelHint = {
  center: THREE.Vector3;
  radius: number;
  isFront: boolean;
  side: "left" | "right";
};

function collectWheelHints(car: THREE.Group): WheelHint[] {
  const metrics = getCarMetrics(car);
  const maxModelAxis = Math.max(
    metrics.size.x,
    metrics.size.y,
    metrics.size.z,
    1,
  );
  const hints: WheelHint[] = [];

  car.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = getObjectSearchName(obj);
    if (!isWheelLike(name) || isDecorativeWheelBlurName(name)) return;

    obj.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(obj);
    const meshSize = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(meshSize.x, meshSize.y, meshSize.z);
    const minDim = Math.min(meshSize.x, meshSize.y, meshSize.z);

    if (
      !Number.isFinite(maxDim) ||
      maxDim <= 0 ||
      maxDim > maxModelAxis * 0.45 ||
      minDim <= 0
    ) {
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    car.worldToLocal(center);

    const side =
      getAxisValue(center, metrics.widthAxis) >=
      (metrics.widthMin + metrics.widthMax) / 2
        ? "right"
        : "left";
    const isFront =
      getAxisValue(center, metrics.lengthAxis) >=
      (metrics.lengthMin + metrics.lengthMax) / 2;

    hints.push({
      center,
      radius: maxDim * 0.5,
      isFront,
      side,
    });
  });

  return hints;
}

function averageWheelCenters(hints: WheelHint[]) {
  const center = new THREE.Vector3();
  for (const hint of hints) center.add(hint.center);
  return center.divideScalar(hints.length);
}

function estimateWheelbaseFromHints(hints: WheelHint[], car: THREE.Group) {
  const fronts = hints.filter((hint) => hint.isFront);
  const rears = hints.filter((hint) => !hint.isFront);
  if (!fronts.length || !rears.length) return 0;

  const metrics = getCarMetrics(car);
  const frontAxis =
    fronts.reduce(
      (sum, hint) => sum + getAxisValue(hint.center, metrics.lengthAxis),
      0,
    ) / fronts.length;
  const rearAxis =
    rears.reduce(
      (sum, hint) => sum + getAxisValue(hint.center, metrics.lengthAxis),
      0,
    ) / rears.length;

  return Math.abs(frontAxis - rearAxis);
}

function estimateWheelbaseFromBody(car: THREE.Group) {
  const metrics = getCarMetrics(car);
  return Math.abs(metrics.lengthMax - metrics.lengthMin) * 0.62;
}

function estimateWheelRadiusFromHints(hints: WheelHint[]) {
  if (!hints.length) return 0;

  const total = hints.reduce((sum, hint) => sum + hint.radius, 0);
  return total / hints.length;
}

function computeDriveMetricsFromPivots(pivots: WheelPivot[], car: THREE.Group) {
  const hints = pivots.map((pivot) => {
    const center = new THREE.Vector3();
    pivot.rollPivot.getWorldPosition(center);
    car.worldToLocal(center);
    return {
      center,
      isFront: pivot.isFront,
      radius: pivot.rollPivot.children.reduce((max, child) => {
        if (!(child instanceof THREE.Mesh)) return max;
        const box = new THREE.Box3().setFromObject(child);
        const size = box.getSize(new THREE.Vector3());
        return Math.max(max, Math.max(size.x, size.y, size.z) * 0.5);
      }, 0),
    };
  });

  const metrics = getCarMetrics(car);
  const fronts = hints.filter((hint) => hint.isFront);
  const rears = hints.filter((hint) => !hint.isFront);

  let wheelbase = 0;
  if (fronts.length && rears.length) {
    const frontAxis =
      fronts.reduce(
        (sum, hint) => sum + getAxisValue(hint.center, metrics.lengthAxis),
        0,
      ) / fronts.length;
    const rearAxis =
      rears.reduce(
        (sum, hint) => sum + getAxisValue(hint.center, metrics.lengthAxis),
        0,
      ) / rears.length;
    wheelbase = Math.abs(frontAxis - rearAxis);
  }

  const wheelRadius = hints.length
    ? hints.reduce((sum, hint) => sum + hint.radius, 0) / hints.length
    : 0;

  return { wheelbase, wheelRadius };
}

function detectWheelRollAxis(
  meshes: THREE.Mesh[],
  car: THREE.Group,
  side: "left" | "right",
): { axis: "x" | "y" | "z"; sign: number } {
  const box = new THREE.Box3();
  car.updateMatrixWorld(true);

  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    box.union(new THREE.Box3().setFromObject(mesh));
  }

  const carInverse = car.matrixWorld.clone().invert();
  box.applyMatrix4(carInverse);
  const size = box.getSize(new THREE.Vector3());

  let axis: "x" | "y" | "z" = "x";
  if (size.y <= size.x && size.y <= size.z) axis = "y";
  else if (size.z <= size.x && size.z <= size.y) axis = "z";

  return { axis, sign: side === "right" ? 1 : -1 };
}

function applyDriveVerseConfiguration(
  root: THREE.Object3D,
  exteriorColor = "#F8F8F4",
  interiorColor = "#0b1220",
  wheelColor = "#cfd6df",
  wheelStyle: WheelStyle = "classic",
  doorsOpen = false,
  windowsDown = false,
  lightsOn = false,
) {
  applyColors(root, exteriorColor, interiorColor);
  applyWheels(root, wheelColor, wheelStyle);
  applyDoorState(root, doorsOpen);
  applyWindowState(root, windowsDown);
  applyLightState(root, lightsOn);
}

function applyColors(
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
      const mat = material as THREE.MeshStandardMaterial;
      if (!mat?.color) return;

      const materialName = (mat.name || "").toLowerCase();
      const name = `${meshName} ${materialName}`;

      if (
        isRealLightMaterialName(name) ||
        isGlassLike(name) ||
        isWheelLike(name)
      ) {
        return;
      }

      if (isInteriorLike(name)) {
        mat.color.set(interior);
        mat.needsUpdate = true;
        return;
      }

      if (isExteriorLike(name, mat) || (mat.roughness ?? 1) < 0.8) {
        mat.color.set(exterior);
        mat.needsUpdate = true;
      }
    });
  });
}

function applyWheels(
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
      const mat = material as THREE.MeshStandardMaterial;
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

function applyDoorState(root: THREE.Object3D, open: boolean) {
  if (!open) return;

  root.traverse((obj) => {
    const name = (obj.name || "").toLowerCase();
    if (!name.includes("door")) return;

    obj.rotation.y +=
      name.includes("left") || name.includes("driver") ? 0.68 : -0.68;
  });
}

function applyWindowState(root: THREE.Object3D, down: boolean) {
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
      const mat = material as THREE.MeshStandardMaterial;
      if (mat.opacity === undefined) return;

      mat.transparent = true;
      mat.opacity = down ? 0.08 : mat.opacity;
      mat.depthWrite = !down;
      mat.needsUpdate = true;
    });
  });
}

function applyLightState(root: THREE.Object3D, on: boolean) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;

    const name = getObjectSearchName(obj);
    if (
      !isRealLightMaterialName(name) &&
      !name.includes("headlight") &&
      !name.includes("drl")
    ) {
      return;
    }

    getMaterials(obj).forEach((material) => {
      const mat = material as THREE.MeshStandardMaterial;
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

function cloneMeshMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material)
    ? mesh.material.map((material) => material.clone())
    : mesh.material.clone();
}

function getMaterials(mesh: THREE.Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function getMaterialNames(mesh: THREE.Mesh) {
  return getMaterials(mesh)
    .map((material) => (material as THREE.Material)?.name || "")
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
  // TNRRims TireBlur meshes are solid tire rubber on models like M4 Competition,
  // not motion-blur decorations.
  if (
    name.includes("tnrrims") &&
    (name.includes("tireblur") || name.includes("tyreblur"))
  ) {
    return false;
  }

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

function isExteriorLike(name: string, material: THREE.MeshStandardMaterial) {
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
    (material.metalness ?? 0) > 0.2
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
      const mat = material as THREE.MeshStandardMaterial & {
        [key: string]: unknown;
      };
      Object.keys(mat).forEach((key) => {
        const value = mat[key];
        if (value && typeof value === "object" && "isTexture" in value) {
          (value as THREE.Texture).dispose();
        }
      });
      material.dispose();
    });
  });
}
