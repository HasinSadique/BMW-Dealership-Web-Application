import type { MutableRefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

export type ExitSpin = {
  start: number;
  duration: number;
  fromY: number;
  toY: number;
};

export type HomeModelViewerRefs = {
  modelRootRef: MutableRefObject<THREE.Object3D | null>;
  controlsRef: MutableRefObject<OrbitControls | null>;
  exitSpinRef: MutableRefObject<ExitSpin | null>;
};

export function attachHomeModelViewer(
  mountNode: HTMLDivElement,
  { modelRootRef, controlsRef, exitSpinRef }: HomeModelViewerRefs,
): () => void {
  let frameId: number;
  let renderer: THREE.WebGLRenderer | null = null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#060d1b");

  const camera = new THREE.PerspectiveCamera(
    45,
    mountNode.clientWidth / mountNode.clientHeight,
    0.1,
    2000,
  );
  camera.position.set(4, 1, 5.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setClearAlpha(1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.38;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mountNode.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controlsRef.current = controls;
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = Math.PI * 0.25;
  controls.maxPolarAngle = Math.PI * 0.8;
  controls.enableRotate = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.9;

  let hasUserInteracted = false;
  const stopAutoRotateOnInteraction = () => {
    if (hasUserInteracted) return;
    hasUserInteracted = true;
    controls.autoRotate = false;
  };

  const ambient = new THREE.AmbientLight(0xffffff, 1.55);
  scene.add(ambient);
  const hemiLight = new THREE.HemisphereLight(0xc8e2ff, 0x0c1828, 0.95);
  scene.add(hemiLight);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(8, 10, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 80;
  keyLight.shadow.camera.left = -20;
  keyLight.shadow.camera.right = 20;
  keyLight.shadow.camera.top = 20;
  keyLight.shadow.camera.bottom = -20;
  keyLight.shadow.bias = -0.00008;
  keyLight.shadow.normalBias = 0.012;
  keyLight.shadow.radius = 2.5;
  scene.add(keyLight);
  scene.add(keyLight.target);
  const coolFill = new THREE.DirectionalLight(0x9ec5ff, 0.85);
  coolFill.position.set(-6, 7, -4);
  scene.add(coolFill);
  const rim = new THREE.DirectionalLight(0xa8d4ff, 0.65);
  rim.position.set(1, 8, -9);
  scene.add(rim);
  const frontKey = new THREE.DirectionalLight(0xf2f6ff, 0.55);
  frontKey.position.set(0, 2.5, 14);
  scene.add(frontKey);
  scene.add(frontKey.target);
  const frontFill = new THREE.SpotLight(
    0xe8f2ff,
    2.1,
    130,
    Math.PI / 3.2,
    0.45,
    1.15,
  );
  frontFill.position.set(0, 5.2, 12);
  frontFill.target.position.set(0, 0, 0);
  scene.add(frontFill);
  scene.add(frontFill.target);

  const leftSpot = new THREE.SpotLight(
    0xd4e6ff,
    1.45,
    100,
    Math.PI / 4,
    0.55,
    1.1,
  );
  leftSpot.position.set(-9, 4.5, 5);
  scene.add(leftSpot);
  scene.add(leftSpot.target);

  const rightSpot = new THREE.SpotLight(
    0xcfe4ff,
    1.45,
    100,
    Math.PI / 4,
    0.55,
    1.1,
  );
  rightSpot.position.set(9, 4.5, 5);
  scene.add(rightSpot);
  scene.add(rightSpot.target);

  const topSpot = new THREE.SpotLight(
    0xffffff,
    1.15,
    90,
    Math.PI / 5,
    0.6,
    1.05,
  );
  topSpot.position.set(0, 14, 4);
  scene.add(topSpot);
  scene.add(topSpot.target);

  const lowFrontSpot = new THREE.SpotLight(
    0xfff4e8,
    0.95,
    80,
    Math.PI / 3.5,
    0.65,
    1.2,
  );
  lowFrontSpot.position.set(0, 1.2, 11);
  scene.add(lowFrontSpot);
  scene.add(lowFrontSpot.target);

  const pointFrontL = new THREE.PointLight(0xe0edff, 2.2, 28, 1.8);
  pointFrontL.position.set(-4, 2.2, 8);
  scene.add(pointFrontL);
  const pointFrontR = new THREE.PointLight(0xe0edff, 2.2, 28, 1.8);
  pointFrontR.position.set(4, 2.2, 8);
  scene.add(pointFrontR);
  const pointUnder = new THREE.PointLight(0x7ab0ff, 1.1, 16, 2);
  pointUnder.position.set(0, 0.5, 0);
  scene.add(pointUnder);

  const modelFacingSpots: THREE.SpotLight[] = [
    frontFill,
    leftSpot,
    rightSpot,
    topSpot,
    lowFrontSpot,
  ];

  const group = new THREE.Group();
  scene.add(group);
  const modelCenter = new THREE.Vector3(0, 0, 0);
  const floorSize = 10;
  const reflectionFloor = new Reflector(
    new THREE.PlaneGeometry(floorSize, floorSize),
    {
      clipBias: 0.03,
      textureWidth: Math.floor(mountNode.clientWidth * window.devicePixelRatio),
      textureHeight: Math.floor(
        mountNode.clientHeight * window.devicePixelRatio,
      ),
      color: new THREE.Color("#0a2b45"),
    },
  );
  reflectionFloor.rotation.x = -Math.PI / 2;
  reflectionFloor.position.y = -1.18;
  scene.add(reflectionFloor);

  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.ShadowMaterial({ opacity: 0.58 }),
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = -1.2;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  function fitShadowCameraToModel() {
    if (!group.children.length) return;

    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 2);
    const extent = maxDim * 1.35;

    keyLight.shadow.camera.left = -extent;
    keyLight.shadow.camera.right = extent;
    keyLight.shadow.camera.top = extent;
    keyLight.shadow.camera.bottom = -extent;
    keyLight.shadow.camera.near = 0.2;
    keyLight.shadow.camera.far = extent * 6;
    keyLight.shadow.camera.updateProjectionMatrix();
  }

  function fitModelToViewport() {
    if (!group.children.length) return;

    const fittedBox = new THREE.Box3().setFromObject(group);
    const size = fittedBox.getSize(new THREE.Vector3());
    const center = fittedBox.getCenter(new THREE.Vector3());

    const fitHeight =
      size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const fitWidth =
      size.x /
      (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const fitDepth = size.z * 0.8;
    const cameraDistance = Math.max(fitHeight, fitWidth, fitDepth) * 0.8;

    modelCenter.copy(center);
    controls.target.copy(modelCenter);
    camera.position.set(
      modelCenter.x + cameraDistance * 0.86,
      modelCenter.y + cameraDistance * 0.34,
      modelCenter.z + cameraDistance * 1.4,
    );
    camera.near = Math.max(0.1, cameraDistance / 100);
    camera.far = cameraDistance * 100;
    camera.updateProjectionMatrix();
    controls.update();
    fitShadowCameraToModel();
  }

  const loader = new GLTFLoader();
  loader.load(
    "/models/bmw_m4_f82.glb",
    (gltf) => {
      gltf.scene.rotation.y = -0.45;
      gltf.scene.scale.setScalar(1.85);

      const boundingBox = new THREE.Box3().setFromObject(gltf.scene);
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      gltf.scene.position.x -= center.x;
      gltf.scene.position.y -= center.y;
      gltf.scene.position.z -= center.z;
      gltf.scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.SkinnedMesh
        ) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      group.add(gltf.scene);
      modelRootRef.current = gltf.scene;

      const finalBox = new THREE.Box3().setFromObject(group);
      const groundCenter = finalBox.getCenter(new THREE.Vector3());
      shadowCatcher.position.set(
        groundCenter.x,
        finalBox.min.y - 0.02,
        groundCenter.z,
      );

      fitModelToViewport();
    },
    undefined,
    (loadError) => {
      console.error("Could not load 3D model.", loadError);
    },
  );

  function onResize() {
    const w = mountNode.clientWidth;
    const h = mountNode.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer!.setSize(w, h, false);
    fitModelToViewport();
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    stopAutoRotateOnInteraction();
    controls.rotateLeft(event.deltaY * 0.0022);
    controls.update();
  }

  function onPointerDown() {
    stopAutoRotateOnInteraction();
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", onResize);
  onResize();
  function animate() {
    const spin = exitSpinRef.current;
    if (spin && modelRootRef.current) {
      const elapsed = performance.now() - spin.start;
      const t = Math.min(1, elapsed / spin.duration);
      const eased = 1 - (1 - t) ** 3;
      modelRootRef.current.rotation.y =
        spin.fromY + (spin.toY - spin.fromY) * eased;
      if (t >= 1) exitSpinRef.current = null;
    }

    controls.update();
    keyLight.target.position.copy(controls.target);
    keyLight.position.copy(camera.position).add(new THREE.Vector3(5, 5.8, 2.6));
    keyLight.target.updateMatrixWorld();

    frontKey.target.position.copy(controls.target);
    frontKey.target.updateMatrixWorld();

    modelFacingSpots.forEach((spot) => {
      spot.target.position.copy(controls.target);
      spot.target.updateMatrixWorld();
    });

    pointFrontL.position
      .copy(controls.target)
      .add(new THREE.Vector3(-4, 2.2, 8));
    pointFrontR.position
      .copy(controls.target)
      .add(new THREE.Vector3(4, 2.2, 8));
    pointUnder.position
      .copy(controls.target)
      .add(new THREE.Vector3(0, 0.55, 0));

    reflectionFloor.position.x = controls.target.x;
    reflectionFloor.position.z = controls.target.z;

    renderer!.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }
  animate();

  return () => {
    cancelAnimationFrame(frameId);
    window.removeEventListener("resize", onResize);
    renderer?.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer?.domElement.removeEventListener("wheel", onWheel);
    controlsRef.current = null;
    modelRootRef.current = null;
    exitSpinRef.current = null;
    controls.dispose();
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss?.();
      mountNode.removeChild(renderer.domElement);
    }
    while (scene.children.length) {
      scene.remove(scene.children[0]);
    }
  };
}
