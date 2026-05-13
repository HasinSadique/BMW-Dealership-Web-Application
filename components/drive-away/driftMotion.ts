import * as THREE from "three";

export const DRIFT_DURATION = 20.2;
export const CAMERA_SETTLE_DURATION = 2.4;
export const FINAL_REVEAL_TIME = DRIFT_DURATION + CAMERA_SETTLE_DURATION;
export const DRIFT_RADIUS = 5.2;
export const DRIFT_CENTER = new THREE.Vector3(0, 0, 2.25);

const DRIFT_LOOPS = 5;
const DRIFT_START_ORBIT = Math.PI * 0.84;
const DRIFT_SCREEN_DOWN_HEADING = Math.PI / 2;
const DRIFT_SCREEN_STEER_RANGE = Math.PI / 4;
const MODEL_FORWARD_YAW_OFFSET = Math.PI / 2;

export type DriftFrame = {
  driftProgress: number;
  transitionProgress: number;
  position: THREE.Vector3;
  carYaw: number;
  smokeHeading: number;
  bodyRoll: number;
  modelPitch: number;
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
};

export function calculateDriftFrame(
  handoffElapsed: number,
  time: number,
  camera: THREE.PerspectiveCamera,
): DriftFrame {
  const driftProgress = Math.min(handoffElapsed / DRIFT_DURATION, 1);
  const transitionProgress = smoothstep(
    THREE.MathUtils.clamp(
      (handoffElapsed - DRIFT_DURATION) / CAMERA_SETTLE_DURATION,
      0,
      1,
    ),
  );
  const orbit = DRIFT_START_ORBIT + driftProgress * Math.PI * 2 * DRIFT_LOOPS;
  const driftX = DRIFT_CENTER.x + Math.cos(orbit) * DRIFT_RADIUS;
  const driftZ = DRIFT_CENTER.z + Math.sin(orbit) * DRIFT_RADIUS;
  const position = new THREE.Vector3(
    THREE.MathUtils.lerp(driftX, 0, transitionProgress),
    0,
    THREE.MathUtils.lerp(driftZ, 0, transitionProgress),
  );

  const screenHeading = getDriftScreenHeading(driftX / DRIFT_RADIUS);
  const driftHeading = getWorldHeadingFromScreenHeading(camera, screenHeading);
  const finalHeading = Math.PI * 0.74;
  const visualHeading = lerpAngle(driftHeading, finalHeading, transitionProgress);
  const orbitTarget = new THREE.Vector3(DRIFT_CENTER.x, 0.22, DRIFT_CENTER.z);
  const finalTarget = new THREE.Vector3(0.15, 1.1, 0);
  const overheadCamera = new THREE.Vector3(
    DRIFT_CENTER.x,
    20.8,
    DRIFT_CENTER.z + 0.1,
  );
  const finalCamera = new THREE.Vector3(-2.3, 0.95, 2.85);

  return {
    driftProgress,
    transitionProgress,
    position,
    carYaw: visualHeading - MODEL_FORWARD_YAW_OFFSET,
    smokeHeading: visualHeading,
    bodyRoll: Math.sin(time * 3.5) * 0.045 * (1 - transitionProgress),
    modelPitch: Math.sin(time * 4.2) * 0.012 * (1 - transitionProgress),
    cameraPosition: overheadCamera.lerp(finalCamera, transitionProgress),
    cameraTarget: orbitTarget.lerp(finalTarget, transitionProgress),
  };
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function lerpAngle(start: number, end: number, alpha: number) {
  const delta = Math.atan2(Math.sin(end - start), Math.cos(end - start));
  return start + delta * alpha;
}

function getDriftScreenHeading(horizontalOrbitPosition: number) {
  const sideProgress = THREE.MathUtils.clamp(horizontalOrbitPosition, -1, 1);

  return DRIFT_SCREEN_DOWN_HEADING + sideProgress * DRIFT_SCREEN_STEER_RANGE;
}

function getWorldHeadingFromScreenHeading(
  camera: THREE.PerspectiveCamera,
  screenHeading: number,
) {
  camera.updateMatrixWorld();

  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const down = new THREE.Vector3()
    .setFromMatrixColumn(camera.matrixWorld, 1)
    .multiplyScalar(-1);
  const forward = right
    .multiplyScalar(Math.cos(screenHeading))
    .addScaledVector(down, Math.sin(screenHeading));

  forward.y = 0;

  if (forward.lengthSq() < 0.0001) {
    forward.set(Math.sin(screenHeading), 0, Math.cos(screenHeading));
  } else {
    forward.normalize();
  }

  return Math.atan2(forward.x, forward.z);
}
