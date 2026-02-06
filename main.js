import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// --- Scene setup ---
const canvas = document.getElementById("scene");
const scene = new THREE.Scene();

//  Intro Text
const introText = document.getElementById("intro-text");
let introHidden = false;

function hideIntroText() {
  if (introHidden) return;
  introHidden = true;
  introText.style.opacity = "0";
  setTimeout(() => introText.remove(), 1300);
}


//  zap stuff
let zapTriggered = false;
let zapTimer = 0;
let postZapInteractive = false;
let lastTime = performance.now(); // global
//  Movement with zoom
let scrollProgress = 0; // 0 → 1

//#region Camera Setup
//  Init Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 20.0; //  Changed as scrolled
//  Realistic Camera Height
camera.position.set(0, 1.6, 20); // eye height
camera.lookAt(0, 0, 0);
//  Added Doly system set up
const cameraStart = new THREE.Vector3(0, 1.6, 20);
const cameraEnd = new THREE.Vector3(0, 1.6, 6.5);

//   Create Rnderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.physicallyCorrectLights = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

//#endregion

//  --- Simple Sky Fog
scene.fog = new THREE.FogExp2(0x06070b, 0.09);
renderer.setClearColor(0x06070b, 1);

//  Texture loader for VHS
const loader = new THREE.TextureLoader();

//#region Lighting
// Ambient light for subtle fill
const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambientLight);

//  Flashlight
const flashlight = new THREE.SpotLight(
  0xffffff,
  4.5,            // stronger base
  30,             // longer throw
  Math.PI / 7,    // wider initial cone
  0.45,           // soft edge
  2.0
);

flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, -0.3, -1);

camera.add(flashlight);
camera.add(flashlight.target);


scene.add(camera);

//  Spill Light (Helps with pitch-black clipping)
const spillLight = new THREE.PointLight(0xffffff, 0.3, 10, 2);
spillLight.position.set(0, 0, 0);
camera.add(spillLight);

//  Read light after zap
const readLight = new THREE.DirectionalLight(0x99ccff, 0);
scene.add(readLight);
scene.add(readLight.target);

//#endregion

//#region Render Ground
// Store base ground values
const groundBaseNormal = 0.6;
const groundZapNormal  = 1.2;

let groundRipple = 0;

// --- Ground textures ---
const groundAlbedo = loader.load("./lib/ground_dark_albedo.webp");
//const groundNormal = loader.load("./lib/ground_dark_normal.webp");
const groundRough  = loader.load("./lib/ground_dark_roughness.webp");

// Color space
groundAlbedo.colorSpace = THREE.SRGBColorSpace;

// Repeat so it doesn’t stretch
groundAlbedo.wrapS = groundAlbedo.wrapT = THREE.RepeatWrapping;
//groundNormal.wrapS = groundNormal.wrapT = THREE.RepeatWrapping;
groundRough.wrapS  = groundRough.wrapT  = THREE.RepeatWrapping;

const groundRepeat = 20;
groundAlbedo.repeat.set(groundRepeat, groundRepeat);
//groundNormal.repeat.set(groundRepeat, groundRepeat);
groundRough.repeat.set(groundRepeat, groundRepeat);

//  Create mesh and add to scene
const groundMaterial = new THREE.MeshStandardMaterial({
  map: groundAlbedo,
  //normalMap: groundNormal,
  roughnessMap: groundRough,
  roughness: 1.0,
  metalness: 0.5,
  //normalScale: new THREE.Vector2(0.6, 0.6), // key value
});

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  groundMaterial
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.6;
ground.receiveShadow = false;
scene.add(ground);

//#endregion

//#region Render VHS Tape
// --- Load textures ---

const baseTexture = loader.load("./lib/phasmo_capsule.webp");
const grungeTexture = loader.load("./lib/vhs_front_texture.webp"); // optional scratches overlay
const normalTexture = loader.load("./lib/vhs_front_normal.webp"); // optional normal map

// Side + Top textures
const sidebaseT = loader.load("./lib/vhs_side_capsule.webp");
const sideTexture = loader.load("./lib/vhs_side_texture.png");
const sideNormal = loader.load("./lib/vhs_side_normal.png");

const topbaseT = loader.load("./lib/vhs_top_capsule.webp");
const topTexture = loader.load("./lib/vhs_top_texture.webp");
const topNormal = loader.load("./lib/vhs_top_normal.webp");

const bottombaseT = loader.load("./lib/vhs_bottom_capsule.webp");
const bottomNormal = loader.load("./lib/vhs_bottom_normal.webp");


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

// Front label (with grunge + normal)
const labelMaterial = new THREE.MeshStandardMaterial({
  map: baseTexture,
  roughnessMap: grungeTexture,
  roughness: 0.85,
  metalness: 0.05,
  normalMap: normalTexture,
  normalScale: new THREE.Vector2(0.18, 0.18),
  
});

labelMaterial.emissive = new THREE.Color(0x111111);
labelMaterial.emissiveIntensity = 0.0;

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
vhs.position.y = -0.85;  //  in ground
//vhs.rotation.x = -0.1;
vhs.rotation.y = -0.2;
vhs.rotation.x = 0.05;
vhs.frustumCulled = false;
scene.add(vhs);

//#endregion

//#region Fade out logo
/* const poster = document.getElementById("lcp-poster");

poster.style.transition = "opacity 0.8s ease";
poster.style.opacity = "0";

setTimeout(() => {
  poster.remove();
}, 900); */
//#endregion


//#region Touch Controls
let isTouching = false;
let lastTouchX = 0;
let lastTouchY = 0;
let lastPinchDist = 0;

window.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isTouching = true;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
  }

  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastPinchDist = Math.sqrt(dx * dx + dy * dy);
  }
}, { passive: false });

window.addEventListener("touchmove", (e) => {
  e.preventDefault();

  // ---- ROTATION (after zap only) ----
  if (zapTriggered && e.touches.length === 1 && isTouching) {
    const touch = e.touches[0];

    const dx = touch.clientX - lastTouchX;
    const dy = touch.clientY - lastTouchY;

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;

    targetRotation.y += dx * 0.004;
    targetRotation.x += dy * 0.003;
    targetRotation.x = THREE.MathUtils.clamp(targetRotation.x, -0.6, 0.6);
  }

  // ---- PINCH = SCROLL ----
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const delta = dist - lastPinchDist;
    lastPinchDist = dist;

    scrollProgress += delta * 0.002;
    scrollProgress = THREE.MathUtils.clamp(scrollProgress, 0, 1);

    hideIntroText();
  }
}, { passive: false });

window.addEventListener("touchend", () => {
  isTouching = false;
});

window.addEventListener("touchend", (e) => {
  if (!postZapInteractive) return;
  if (e.changedTouches.length !== 1) return;

  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();

  mouseVec.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
  mouseVec.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseVec, camera);
  const intersects = raycaster.intersectObject(vhs, true);

  if (intersects.length > 0) {
    window.location.href =
      "https://store.steampowered.com/app/2654210/Phasmonauts/";
  }
});


//#endregion

window.addEventListener("mousemove", (e) => {
  if (zapTriggered) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;

    targetRotation.y = mouse.x * 0.6;
    targetRotation.x = mouse.y * 0.4;
  }
});

window.addEventListener("wheel", (e) => {
  scrollProgress += e.deltaY * 0.002;
  scrollProgress = THREE.MathUtils.clamp(scrollProgress, 0, 1);

  hideIntroText();
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


//#endregion

//#region Lightning Setup
// Lightning setup
const lightningMaterial = new THREE.LineBasicMaterial({ color: 0x99ccff });
const lightningPoints = [ new THREE.Vector3(0, 20, 0), new THREE.Vector3(0, 0, 0) ];
const lightningGeometry = new THREE.BufferGeometry().setFromPoints(lightningPoints);
const lightning = new THREE.Line(lightningGeometry, lightningMaterial);
lightning.visible = false; // start hidden
scene.add(lightning);
//#endregion


// --- Idle sway setup ---
const clock = new THREE.Clock();

// --- Resize handling ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

//#region Animate (Function)
// --- Animation loop ---
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000; // in seconds
  lastTime = now;

  const t = clock.getElapsedTime();

  // Smooth interpolation
  if (zapTriggered) {
      // Idle sway
    const idleY = Math.sin(t * 0.6) * 0.08;
    const idleX = Math.sin(t * 0.4) * 0.04;
    const finalY = targetRotation.y + idleY;
    const finalX = targetRotation.x + idleX;

    vhs.rotation.y += (finalY - vhs.rotation.y) * 0.06;
    vhs.rotation.x += (finalX - vhs.rotation.x) * 0.06;
    vhs.rotation.z = Math.sin(t * 0.3) * 0.015;
  }

  // --- Lighting tied to scroll ---
  ambientLight.intensity = THREE.MathUtils.lerp(0.50, 1.1, scrollProgress);
  
  //  Animate smoothly going towards camera
  const dollyProgress = THREE.MathUtils.clamp(scrollProgress, 0, 0.85) / 0.85;
  const dollyPos = cameraStart.clone().lerp(cameraEnd, dollyProgress);
  camera.position.lerp(dollyPos, 0.08);

  // Always look slightly *down* at the tape
  camera.lookAt(
    vhs.position.x,
    vhs.position.y + 0.3,
    vhs.position.z
  );

  //  Animate Flashlight
  flashlight.position.set(
    0.06,
    0.18,
    0.25
  );
  flashlight.rotation.z = Math.sin(t * 12.0) * 0.002;

  flashlight.target.position.set(
    vhs.position.x,
    vhs.position.y + 0.25,
    vhs.position.z + 0.35
  );

  // Always look slightly *down* at the tape
  camera.lookAt(
    vhs.position.x,
    vhs.position.y + 0.3,
    vhs.position.z
  );

  //  Far vhs jitter
  const distanceJitter = (1 - scrollProgress) * 0.005;
  vhs.rotation.z += Math.sin(t * 10.5) * distanceJitter;

//#region Lightning ZAP
if (!zapTriggered && scrollProgress >= 0.999) {
    console.log("Zap triggered!", scrollProgress);
    scrollProgress = 1.0;
    zapTriggered = true;
    zapTimer = 0.15;

    ambientLight.intensity = 1.5;
    renderer.toneMappingExposure = 1.3;
    flashlight.intensity = 6.0;

    // Ground reacts to the zap
    /* groundMaterial.normalScale.set(
        THREE.MathUtils.lerp(groundBaseNormal, groundZapNormal, 1),
        THREE.MathUtils.lerp(groundBaseNormal, groundZapNormal, 1)
    ); */
}

// --- Zap countdown & VHS wiggle ---
if (zapTriggered && zapTimer > 0) {
    lightning.visible = true;

    // Flicker intensity / alpha
    const flicker = Math.random() * 0.8 + 0.2;
    lightningMaterial.color.setHSL(0.55, 1, flicker); // blueish lightning

    // Optionally move start XZ a bit for dynamic strike
    lightning.geometry.attributes.position.setXYZ(0, (Math.random() - 0.5) * 2, 20, (Math.random() - 0.5) * 2);
    lightning.geometry.attributes.position.needsUpdate = true;

    // Quick fade out after zap
    if (zapTimer < 0.05) lightning.visible = false;

    const shockStrength = Math.sin((0.15 - zapTimer) * Math.PI * 10) * 0.2;
    groundMaterial.emissive = new THREE.Color(0x0033ff);
    groundMaterial.emissiveIntensity = shockStrength;

    // Ripple the normal map for a magical shock
    //const normalScale = THREE.MathUtils.lerp(groundBaseNormal, groundZapNormal, shockStrength);
    //groundMaterial.normalScale.set(normalScale, normalScale);

    // VHS Z wiggle
    vhs.rotation.z += Math.sin(t * 40) * 0.25;

    // Smoothly lift VHS a bit during zap (0 → ~0.0)
    vhs.position.y = THREE.MathUtils.lerp(vhs.position.y, 0.0, 0.15);

    camera.position.x += (Math.random() - 0.5) * 0.05;
    camera.position.y += (Math.random() - 0.5) * 0.05;

    // Decrease timer
    zapTimer -= delta;
    if (zapTimer < 0) zapTimer = 0;
}

// --- Post-zap smooth transition to final Y ---
if (zapTriggered && zapTimer <= 0 && !postZapInteractive) {
    // Smoothly move VHS Y to final position
    vhs.position.y = THREE.MathUtils.lerp(vhs.position.y, 2.0, 0.08);
    // Activate read light
    readLight.intensity = 6.5;
    readLight.position.copy(camera.position);
    readLight.target.position.set(
        vhs.position.x,
        vhs.position.y + 0.4,
        vhs.position.z
    );
    readLight.castShadow = true;
    readLight.shadow.mapSize.width = 1024;
    readLight.shadow.mapSize.height = 1024;
    readLight.shadow.radius = 4;
    readLight.shadow.bias = -0.001;

    // Smoothly fade emissive back to 0
    groundMaterial.emissiveIntensity = THREE.MathUtils.lerp(
        groundMaterial.emissiveIntensity, 
        0,          // base emissive intensity
        0.05        // smooth factor (smaller = slower)
    );
    
    // Once VHS is nearly there, finalize post-zap state
    if (Math.abs(vhs.position.y - 2.0) < 0.01) {
        postZapInteractive = true;

        ambientLight.intensity = 1.1;
        renderer.toneMappingExposure = 1.0;

        flashlight.intensity = 3.2;
        flashlight.angle = Math.PI / 16;
        flashlight.penumbra = 0.2;

        // Reset normal scale
        //groundMaterial.normalScale.set(groundBaseNormal, groundBaseNormal);

        console.log("Post-zap interactive state active!");
    }
}
  //#endregion

  renderer.render(scene, camera);
}
//#endregion

animate();