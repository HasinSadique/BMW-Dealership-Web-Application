import * as THREE from "three";

export type SmokePuff = {
  sprite: THREE.Sprite;
  bornAt: number;
  life: number;
  velocity: THREE.Vector3;
  size: number;
};

const SMOKE_REAR_OFFSET = 2.35;
const SMOKE_SIDE_OFFSET = 0.92;
const SMOKE_TRAIL_OFFSET = 0.28;
const SMOKE_PUFF_COUNT = 64;

export function createDriftSmoke(scene: THREE.Scene): SmokePuff[] {
  const texture = createSmokeTexture();

  return Array.from({ length: SMOKE_PUFF_COUNT }, () => {
    const material = new THREE.SpriteMaterial({
      color: "#d1cec4",
      depthTest: true,
      depthWrite: false,
      map: texture,
      opacity: 0,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.renderOrder = 2;
    scene.add(sprite);

    return {
      sprite,
      bornAt: -999,
      life: 1.8,
      velocity: new THREE.Vector3(),
      size: 1,
    };
  });
}

function createSmokeTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(58, 58, 8, 64, 64, 58);
  gradient.addColorStop(0, "rgba(255,255,255,0.55)");
  gradient.addColorStop(0.32, "rgba(235,232,222,0.34)");
  gradient.addColorStop(0.68, "rgba(186,181,168,0.16)");
  gradient.addColorStop(1, "rgba(150,145,135,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  context.globalCompositeOperation = "screen";
  for (let i = 0; i < 7; i += 1) {
    const x = 36 + ((i * 19) % 58);
    const y = 34 + ((i * 31) % 62);
    const radius = 16 + (i % 4) * 5;
    const puff = context.createRadialGradient(x, y, 2, x, y, radius);
    puff.addColorStop(0, "rgba(255,255,255,0.18)");
    puff.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = puff;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function spawnDriftSmoke(
  smokePuffs: SmokePuff[],
  position: THREE.Vector3,
  heading: number,
  time: number,
) {
  const forward = getForwardFromHeading(heading);
  const rearAxle = position.clone().addScaledVector(forward, -SMOKE_REAR_OFFSET);
  const lateral = new THREE.Vector3(forward.z, 0, -forward.x);
  const smokeDrift = forward.clone().multiplyScalar(-0.7);

  [-1, 1].forEach((side) => {
    const puff = smokePuffs.reduce((oldest, current) =>
      current.bornAt < oldest.bornAt ? current : oldest,
    );
    const jitter = Math.sin((time + side) * 18.7) * 0.22;
    const sideOffset = side * (SMOKE_SIDE_OFFSET + Math.abs(jitter) * 0.18);

    puff.bornAt = time;
    puff.life = 0.95 + Math.abs(Math.sin(time * 2.1 + side)) * 0.35;
    puff.size = 0.5 + Math.abs(Math.cos(time * 3.3 + side)) * 0.22;
    puff.velocity
      .copy(smokeDrift)
      .addScaledVector(lateral, side * 0.18 + jitter * 0.08);
    puff.sprite.position
      .copy(rearAxle)
      .addScaledVector(forward, -SMOKE_TRAIL_OFFSET)
      .addScaledVector(lateral, sideOffset);
    puff.sprite.position.y = 0.22 + Math.abs(jitter) * 0.08;
    puff.sprite.scale.setScalar(puff.size);
    puff.sprite.visible = true;
  });
}

export function updateDriftSmoke(
  smokePuffs: SmokePuff[],
  time: number,
  transitionProgress: number,
  camera: THREE.PerspectiveCamera,
) {
  const fadeOut = 1 - transitionProgress;

  smokePuffs.forEach((puff) => {
    const age = time - puff.bornAt;

    if (age < 0 || age > puff.life || fadeOut <= 0) {
      puff.sprite.visible = false;
      puff.sprite.material.opacity = 0;
      return;
    }

    const normalizedAge = age / puff.life;
    const lift = 0.16 * normalizedAge;
    const expansion = 1 + normalizedAge * 2.2;

    puff.sprite.visible = true;
    puff.sprite.position.addScaledVector(puff.velocity, 0.016);
    puff.sprite.position.y += lift * 0.016;
    puff.sprite.scale.setScalar(puff.size * expansion);
    puff.sprite.material.rotation += 0.0025;
    puff.sprite.material.opacity =
      Math.sin(normalizedAge * Math.PI) *
      0.34 *
      (1 - normalizedAge * 0.22) *
      fadeOut;
    puff.sprite.lookAt(camera.position);
  });
}

function getForwardFromHeading(heading: number) {
  return new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
}
