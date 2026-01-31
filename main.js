import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// --- Scene setup ---
const canvas = document.getElementById("scene");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 7;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Ambient light for subtle fill
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const fillLight = new THREE.DirectionalLight(0xffffff, 0.2);
fillLight.position.set(-3, 1, 2);
scene.add(fillLight);

// Key directional light: almost front-facing
const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
keyLight.position.set(0, 0, 5); // in front of the VHS
keyLight.target.position.set(0, 0, 0); // point at the center
scene.add(keyLight);
scene.add(keyLight.target); // must add target to scene

// --- Load textures ---
const loader = new THREE.TextureLoader();
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

  renderer.render(scene, camera);
}

animate();