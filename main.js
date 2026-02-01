import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// --- Scene setup ---
const canvas = document.getElementById("scene");
const scene = new THREE.Scene();
//scene.fog = new THREE.Fog(0x06070b, 2.8, 8.5);
//document.body.style.cursor = "default";
//  zap stuff
let zapTriggered = false;
let zapTimer = 0;
let postZapInteractive = false;
let lastTime = performance.now(); // global
//  Movement with zoom
let scrollProgress = 0; // 0 → 1
let targetCameraZ = 20; // start far away

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 20.0;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x07080c, 1);  //  To help avoid clear cutoff

//  Texture loader for VHS
const loader = new THREE.TextureLoader();

// Ambient light for subtle fill
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.15);
fillLight.position.set(-3, 1, 2);
scene.add(fillLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 0.3);
keyLight.position.set(0, 0, 5);
keyLight.target.position.set(0, 0, 0);
scene.add(keyLight);
scene.add(keyLight.target);

//  Noise texture
/*
const noiseTexture = loader.load("./lib/vhs_noise.png");
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
noiseTexture.colorSpace = THREE.SRGBColorSpace;

const noiseMaterial = new THREE.MeshBasicMaterial({
  map: noiseTexture,
  transparent: true,
  opacity: 0.05,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const noisePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  noiseMaterial
);

noisePlane.position.z = 3.0;
scene.add(noisePlane);
*/

// --- Load textures ---

const baseTexture = loader.load("./lib/phasmo_capsule.png");
const grungeTexture = loader.load("./lib/vhs_front_texture.png"); // optional scratches overlay
const normalTexture = loader.load("./lib/vhs_front_normal.png"); // optional normal map

// Side + Top textures
const sidebaseT = loader.load("./lib/vhs_side_capsule.png");
const sideTexture = loader.load("./lib/vhs_side_texture.png");
const sideNormal = loader.load("./lib/vhs_side_normal.png");

const topbaseT = loader.load("./lib/vhs_top_capsule.png");
const topTexture = loader.load("./lib/vhs_top_texture.png");
const topNormal = loader.load("./lib/vhs_top_normal.png");

const bottombaseT = loader.load("./lib/vhs_bottom_capsule.png");
const bottomNormal = loader.load("./lib/vhs_bottom_normal.png");


// Correct color space
baseTexture.colorSpace = THREE.SRGBColorSpace;
grungeTexture.colorSpace = THREE.SRGBColorSpace;
normalTexture.colorSpace = THREE.SRGBColorSpace;

sidebaseT.colorSpace = THREE.SRGBColorSpace;
sideTexture.colorSpace = THREE.SRGBColorSpace;
sideNormal.colorSpace = THREE.SRGBColorSpace;

topbaseT.colorSpace = THREE.SRGBColorSpace;
topTexture.colorSpace = THREE.SRGBColorSpace;
topNormal.colorSpace = THREE.SRGBColorSpace;

bottombaseT.colorSpace = THREE.SRGBColorSpace;
bottomNormal.colorSpace = THREE.SRGBColorSpace;

// Optional: repeat/wrap
grungeTexture.wrapS = grungeTexture.wrapT = THREE.RepeatWrapping;
normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;


// --- Create materials ---
const plastic = new THREE.MeshStandardMaterial({
  color: 0x121212,
  roughness: 0.6,
  metalness: 0.05,
});

// Front label (with grunge + normal)
const labelMaterial = new THREE.MeshStandardMaterial({
  map: baseTexture,
  roughnessMap: grungeTexture,
  roughness: 0.85,
  metalness: 0.05,
  normalMap: normalTexture,
  normalScale: new THREE.Vector2(0.05, 0.05),
});

// Sides (reuse for left & right + back)
const sideMaterial = new THREE.MeshStandardMaterial({
  map: sidebaseT,
  roughnessMap: sideTexture,
  normalMap: sideNormal,
  roughness: 0.7,
  metalness: 0.05,
  normalScale: new THREE.Vector2(0.05, 0.05),
});

// Top + bottom
const topMaterial = new THREE.MeshStandardMaterial({
  map: topbaseT,
  roughnessMap: topTexture,
  normalMap: topNormal,
  roughness: 0.7,
  metalness: 0.05,
  normalScale: new THREE.Vector2(0.05, 0.05),
});

// Top + bottom
const bottomMaterial = new THREE.MeshStandardMaterial({
  map: bottombaseT,
  roughnessMap: topTexture,
  normalMap: bottomNormal,
  roughness: 0.7,
  metalness: 0.05,
  normalScale: new THREE.Vector2(0.05, 0.05),
});


// --- Box geometry (vertical VHS) ---
const geometry = new THREE.BoxGeometry(1.6, 3.0, 0.4);

const materials = [
  sideMaterial,  // right
  sideMaterial,  // left
  topMaterial,   // top
  bottomMaterial,   // bottom
  labelMaterial, // front
  sideMaterial,  // back
];

const vhs = new THREE.Mesh(geometry, materials);
vhs.rotation.y = -0.2;
vhs.rotation.x = 0.05;
vhs.frustumCulled = false;
scene.add(vhs);

// --- Mouse interaction ---
const mouse = { x: 0, y: 0 };
const targetRotation = { x: 0, y: 0 };

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;

  targetRotation.y = mouse.x * 0.6;
  targetRotation.x = mouse.y * 0.4;
});

window.addEventListener("wheel", (e) => {
  scrollProgress += e.deltaY * 0.002;
  scrollProgress = THREE.MathUtils.clamp(scrollProgress, 0, 1);

  // Map scroll to camera distance
  targetCameraZ = THREE.MathUtils.lerp(20, 6, scrollProgress);
});

// --- Raycaster + mouse setup ---
const raycaster = new THREE.Raycaster();
const mouseVec = new THREE.Vector2();

// --- Hover / click handler ---
function updateMouse(event) {
  const rect = canvas.getBoundingClientRect();
  mouseVec.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouseVec.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseVec, camera);

  if (postZapInteractive) {
    const intersects = raycaster.intersectObject(vhs, true);
    document.body.style.cursor = intersects.length > 0 ? "pointer" : "default";
  } else {
    document.body.style.cursor = "default";
  }
}

window.addEventListener("mousemove", updateMouse);

// --- Click handler ---
window.addEventListener("click", (event) => {
  if (!postZapInteractive) return;

  updateMouse(event); // update raycaster with click position
  const intersects = raycaster.intersectObject(vhs, true);

  if (intersects.length > 0) {
    window.location.href = "https://store.steampowered.com/app/2654210/Phasmonauts/";
  }
});

// --- Idle sway setup ---
const clock = new THREE.Clock();

// --- Resize handling ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});



// --- Animation loop ---
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000; // in seconds
  lastTime = now;

  const t = clock.getElapsedTime();

 
  

  // Idle sway
  const idleY = Math.sin(t * 0.6) * 0.08;
  const idleX = Math.sin(t * 0.4) * 0.04;
  const finalY = targetRotation.y + idleY;
  const finalX = targetRotation.x + idleX;

  // Smooth interpolation
  vhs.rotation.y += (finalY - vhs.rotation.y) * 0.06;
  vhs.rotation.x += (finalX - vhs.rotation.x) * 0.06;
  vhs.rotation.z = Math.sin(t * 0.3) * 0.015;

  // --- Lighting tied to scroll ---
  ambientLight.intensity = THREE.MathUtils.lerp(0.15, 0.45, scrollProgress);
  fillLight.intensity    = THREE.MathUtils.lerp(0.1,  0.35, scrollProgress);
  keyLight.intensity     = THREE.MathUtils.lerp(0.3,  1.1,  scrollProgress);

  //  Perlin static
  //noiseTexture.offset.y -= 0.004;
  //noiseTexture.offset.x += 0.001;

  //noisePlane.position.x = (Math.random() - 0.5) * 0.05;
  //noisePlane.position.y = (Math.random() - 0.5) * 0.05;

  //  Animate fog
  //scene.fog.near = 2.6 + Math.sin(t * 0.4) * 0.2;
  //scene.fog.far  = 8.5 + Math.sin(t * 0.3) * 0.3;

  //  Animate smoothly going towards camera
  camera.position.z += (targetCameraZ - camera.position.z) * 0.08;

  //  Grow vhs tape
  const scale = THREE.MathUtils.lerp(0.85, 1.0, scrollProgress);
  vhs.scale.set(scale, scale, scale);
  //  Far vhs jitter
  const distanceJitter = (1 - scrollProgress) * 0.02;
  vhs.rotation.z += Math.sin(t * 10.5) * distanceJitter;
    // Lightning zap — only once
  if (!zapTriggered && scrollProgress >= 0.999) {
    console.log("Zap triggered!", scrollProgress);
    scrollProgress = 1.0; // ensure it reaches exact 1.0
    zapTriggered = true;
    zapTimer = 0.15;
    renderer.toneMappingExposure = 1.2;
    keyLight.color.set(0xbfd9ff);
    ambientLight.intensity = 0.8;
    
  }

  // Zap countdown
  if (zapTriggered && zapTimer > 0) {
      // Apply z wiggle for the zap
      vhs.rotation.z += Math.sin(t * 40) * 0.2;

      // Decrease the timer using delta
      zapTimer -= delta;
      if (zapTimer < 0) zapTimer = 0;

      console.log("zap right now", zapTimer.toFixed(3));
  }

  // Post-zap stable state
  if (zapTriggered && zapTimer <= 0 && !postZapInteractive) {
      keyLight.intensity = 1.2;
      ambientLight.intensity = 0.45;
      keyLight.color.set(0xffffff);
      renderer.toneMappingExposure = 1.0;
      vhs.rotation.z = 0.0;
      postZapInteractive = true;
      console.log("Post-zap interactive state active!");
  }



  renderer.render(scene, camera);
}

animate();