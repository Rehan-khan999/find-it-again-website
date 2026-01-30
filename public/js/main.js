let scene, camera, renderer;
let lamp, lid, genie;
let isOpen = false;

init();
loadModels();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.5, 5);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.position = "fixed";
  renderer.domElement.style.top = "0";
  renderer.domElement.style.left = "0";
  renderer.domElement.style.zIndex = "9999";
  renderer.domElement.style.pointerEvents = "auto";
  document.body.appendChild(renderer.domElement);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambLight);

  window.addEventListener("resize", onResize);
  window.addEventListener("click", toggleLamp);

  // Test cube - truth detector
  const testCube = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  scene.add(testCube);
}

function loadModels() {
  const loader = new THREE.GLTFLoader();

  loader.load("/models/lamp.glb", (gltf) => {
    lamp = gltf.scene;
    scene.add(lamp);

    lid = lamp.getObjectByName("Lid");

    loader.load("/models/genie.glb", (gltf2) => {
      genie = gltf2.scene;
      genie.scale.set(0, 0, 0);
      genie.position.set(0, -0.6, 0);
      lamp.add(genie);
      addGlow();
    });
  });
}

function toggleLamp() {
  if (!lid || !genie) return;
  if (!isOpen) openLamp();
  else closeLamp();
  isOpen = !isOpen;
}

function openLamp() {
  const tl = gsap.timeline();
  tl.to(lid.rotation, {
    x: -1.2,
    duration: 0.6,
    ease: "power2.out"
  });
  tl.to(genie.scale, {
    x: 1, y: 1, z: 1,
    duration: 0.5
  });
  tl.to(genie.position, {
    y: 1.5,
    duration: 1,
    ease: "power3.out"
  });
}

function closeLamp() {
  const tl = gsap.timeline();
  tl.to(genie.position, {
    y: -0.6,
    duration: 0.8
  });
  tl.to(genie.scale, {
    x: 0, y: 0, z: 0,
    duration: 0.4
  });
  tl.to(lid.rotation, {
    x: 0,
    duration: 0.6
  });
}

function addGlow() {
  genie.traverse(obj => {
    if (obj.isMesh) {
      obj.material.emissive = new THREE.Color(0x00aaff);
      obj.material.emissiveIntensity = 1;
    }
  });
  gsap.to(genie.children[0].material, {
    emissiveIntensity: 2,
    duration: 1,
    yoyo: true,
    repeat: -1
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (genie && isOpen) {
    genie.position.y += Math.sin(Date.now() * 0.002) * 0.002;
  }
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
