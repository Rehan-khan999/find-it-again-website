document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initThreeJS, 100);
});

function initThreeJS() {
  // SCENE
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // CAMERA (cinematic hero angle)
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 2, 4);
  camera.lookAt(0, 1, 0);

  // RENDERER
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const canvas = renderer.domElement;
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = "99999";
  document.body.appendChild(canvas);

  // LIGHTING (strong and clean)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));

  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  // LOADERS
  const loader = new THREE.GLTFLoader();

  let lamp, lid, genie;
  let isOpen = false;

  // LOAD LAMP
  loader.load("/models/lamp.glb", (gltf) => {
    lamp = gltf.scene;

    // FORCE orientation (this fixes your angle problem)
    lamp.rotation.set(-Math.PI / 2, Math.PI, 0);
    lamp.position.set(0, 0, 0);

    // Normalize scale
    const box = new THREE.Box3().setFromObject(lamp);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 2 / Math.max(size.x, size.y, size.z);
    lamp.scale.setScalar(scale);

    scene.add(lamp);

    // Find lid
    lid = lamp.getObjectByName("Lid");

    // LOAD GENIE
    loader.load("/models/genie.glb", (gltf2) => {
      genie = gltf2.scene;

      genie.scale.set(0, 0, 0);
      genie.rotation.set(-Math.PI / 2, Math.PI, 0);
      genie.position.set(0, -0.6, 0);
      lamp.add(genie);

      addGlow(genie);
    });
  });

  // CLICK INTERACTION
  window.addEventListener("click", () => {
    if (!lamp || !genie || !lid) return;
    if (!isOpen) openLamp();
    else closeLamp();
    isOpen = !isOpen;
  });

  function openLamp() {
    const tl = gsap.timeline();

    tl.to(lid.rotation, {
      x: -1.2,
      duration: 1.2,
      ease: "power2.out"
    });

    tl.to(genie.scale, {
      x: 1, y: 1, z: 1,
      duration: 1
    });

   tl.to(genie.position, {
  y: 1.8,
  z: 0.6,
  duration: 2.5,
  ease: "power3.out"
});

  }

  function closeLamp() {
    const tl = gsap.timeline();

   tl.to(genie.position, {
  y: -0.6,
  z: 0,
  duration: 2,
  ease: "power3.in"
});


    tl.to(genie.scale, {
      x: 0, y: 0, z: 0,
      duration: 1
    });

    tl.to(lid.rotation, {
      x: 0,
      duration: 1.2,
      ease: "power2.in"
    });
  }

  function addGlow(obj) {
    obj.traverse((child) => {
      if (child.isMesh) {
        child.material.emissive = new THREE.Color(0x00aaff);
        child.material.emissiveIntensity = 1;
      }
    });

    gsap.to(obj.children[0].material, {
      emissiveIntensity: 2,
      duration: 1.5,
      yoyo: true,
      repeat: -1
    });
  }

  // RENDER LOOP
  function animate() {
    requestAnimationFrame(animate);

    if (genie && isOpen) {
      genie.position.y += Math.sin(Date.now() * 0.002) * 0.002;
    }

    renderer.render(scene, camera);
  }
  animate();

  // RESIZE
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
