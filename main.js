import * as THREE from
  "https://unpkg.com/three@0.160.0/build/three.module.js";

// --- Scene setup ---
const canvas = document.getElementById("scene");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// --- Lighting ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
keyLight.position.set(3, 2, 4);
scene.add(keyLight);

// --- VHS geometry (vertical) ---
const geometry = new THREE.BoxGeometry(1.6, 3.0, 0.4);

// Texture loader
const loader = new THREE.TextureLoader();
const coverTexture = loader.load("./lib/phasmo_capsule.png");

coverTexture.colorSpace = THREE.SRGBColorSpace;
coverTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

// Materials
const plastic = new THREE.MeshStandardMaterial({
  color: 0x121212,
  roughness: 0.6,
  metalness: 0.05,
});

const label = new THREE.MeshStandardMaterial({
  map: coverTexture,
  roughness: 0.9,
  metalness: 0.0,
});

// Face order
const materials = [
  plastic, // right
  plastic, // left
  plastic, // top
  plastic, // bottom
  label,   // front
  plastic, // back
];

const vhs = new THREE.Mesh(geometry, materials);
scene.add(vhs);

// Initial tilt
vhs.rotation.y = -0.2;
vhs.rotation.x = 0.05;

// --- Mouse interaction ---
const mouse = { x: 0, y: 0 };
const targetRotation = { x: 0, y: 0 };

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;

  targetRotation.y = mouse.x * 0.6;
  targetRotation.x = mouse.y * 0.4;
});

// --- Resize handling ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation loop ---
function animate() {
  requestAnimationFrame(animate);

  vhs.rotation.y += (targetRotation.y - vhs.rotation.y) * 0.08;
  vhs.rotation.x += (targetRotation.x - vhs.rotation.x) * 0.08;

  renderer.render(scene, camera);
}

animate();