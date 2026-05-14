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

export type HomeModelSize = {
  width: number;
  height: number;
  depth: number;
};

export type HomeModelViewerRefs = {
  modelRootRef: MutableRefObject<THREE.Object3D | null>;
  controlsRef: MutableRefObject<OrbitControls | null>;
  exitSpinRef: MutableRefObject<ExitSpin | null>;
  /** 0 = full rotating hero, 1 = front close-up, 2 = interior through glass */
  activeHeroRef: MutableRefObject<number>;
  onLoadingChange?: (isLoading: boolean) => void;
  onModelSizeChange?: (size: HomeModelSize) => void;
};

export function attachHomeModelViewer(
  mountNode: HTMLDivElement,
  {
    modelRootRef,
    controlsRef,
    exitSpinRef,
    activeHeroRef,
    onLoadingChange,
    onModelSizeChange,
  }: HomeModelViewerRefs,
): () => void {
  let frameId: number;
  let renderer: THREE.WebGLRenderer | null = null;
  let isDisposed = false;

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
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

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

  const hero0Position = new THREE.Vector3();
  const hero0Target = new THREE.Vector3();
  const hero1Position = new THREE.Vector3();
  const hero1Target = new THREE.Vector3();
  const hero2Position = new THREE.Vector3();
  const hero2Target = new THREE.Vector3();

  let modelReady = false;
  let settledHero = -1;
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

  function updateHero12Presets() {
    if (!group.children.length) return;

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const mx = Math.max(size.x, size.y, size.z, 0.01);

    // Front close-up (grille / headlamps toward +Z is typical after centering).
    hero1Position
      .copy(center)
      .add(new THREE.Vector3(-4, mx * -0.01, mx * 0.75));
    hero1Target.copy(center).add(new THREE.Vector3(0, mx * 0.06, mx * 0.02));

    // Side quarter through glass toward cabin.
    hero2Position
      .copy(center)
      .add(new THREE.Vector3(mx * 0.35, mx * 0.2, mx * 0.1));
    hero2Target
      .copy(center)
      .add(new THREE.Vector3(mx * 0.1, mx * 0.11, mx * 0.02));
  }

  function fitModelToViewport(applyCamera: boolean = true) {
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
    hero0Target.copy(modelCenter);
    hero0Position.set(
      modelCenter.x + cameraDistance * 0.86,
      modelCenter.y + cameraDistance * 0.34,
      modelCenter.z + cameraDistance * 1.4,
    );

    if (applyCamera) {
      controls.target.copy(modelCenter);
      camera.position.copy(hero0Position);
      camera.near = Math.max(0.1, cameraDistance / 100);
      camera.far = cameraDistance * 100;
      camera.updateProjectionMatrix();
      controls.update();
    }

    fitShadowCameraToModel();
    updateHero12Presets();
  }

  const loader = new GLTFLoader();
  onLoadingChange?.(true);
  loader.load(
    "/models/bmw_m4_f82.glb",
    (gltf) => {
      if (isDisposed) return;

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
      const finalSize = finalBox.getSize(new THREE.Vector3());
      const groundCenter = finalBox.getCenter(new THREE.Vector3());
      shadowCatcher.position.set(
        groundCenter.x,
        finalBox.min.y - 0.02,
        groundCenter.z,
      );
      onModelSizeChange?.({
        width: finalSize.x,
        height: finalSize.y,
        depth: finalSize.z,
      });

      fitModelToViewport();
      modelReady = true;
      settledHero = 0;
      onLoadingChange?.(false);
    },
    undefined,
    (loadError) => {
      if (isDisposed) return;

      onLoadingChange?.(false);
      console.error("Could not load 3D model.", loadError);
    },
  );

  function onResize() {
    const w = mountNode.clientWidth;
    const h = mountNode.clientHeight;
    if (w === 0 || h === 0) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer!.setSize(w, h, false);
    const applyCamera =
      !modelReady || THREE.MathUtils.clamp(activeHeroRef.current, 0, 2) === 0;
    fitModelToViewport(applyCamera);
    if (modelReady && !applyCamera) {
      settledHero = -1;
    }
  }

  function onPointerDown() {
    stopAutoRotateOnInteraction();
  }

  let resizeObserver: ResizeObserver | null = null;
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mountNode);
  } else {
    window.addEventListener("resize", onResize);
  }

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

    if (modelReady) {
      const hero = THREE.MathUtils.clamp(activeHeroRef.current, 0, 2);
      const goalPos =
        hero === 0 ? hero0Position : hero === 1 ? hero1Position : hero2Position;
      const goalTarget =
        hero === 0 ? hero0Target : hero === 1 ? hero1Target : hero2Target;

      if (hero === 2) {
        controls.minPolarAngle = Math.PI * 0.12;
        controls.maxPolarAngle = Math.PI * 0.52;
      } else {
        controls.minPolarAngle = Math.PI * 0.25;
        controls.maxPolarAngle = Math.PI * 0.8;
      }

      if (hero !== settledHero) {
        controls.autoRotate = false;
        camera.position.lerp(goalPos, 0.078);
        controls.target.lerp(goalTarget, 0.078);
        if (
          camera.position.distanceTo(goalPos) < 0.06 &&
          controls.target.distanceTo(goalTarget) < 0.045
        ) {
          camera.position.copy(goalPos);
          controls.target.copy(goalTarget);
          settledHero = hero;
        }
      } else if (hero === 0) {
        controls.autoRotate = !hasUserInteracted;
      } else {
        controls.autoRotate = false;
      }
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
    isDisposed = true;
    cancelAnimationFrame(frameId);
    if (resizeObserver) {
      resizeObserver.disconnect();
    } else {
      window.removeEventListener("resize", onResize);
    }
    renderer?.domElement.removeEventListener("pointerdown", onPointerDown);
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
