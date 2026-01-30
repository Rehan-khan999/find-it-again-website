// Three.js Scene - Custom Logic
// This file is loaded after Three.js and GSAP are available globally

(function() {
  'use strict';

  // Wait for the canvas to be available
  const canvas = document.getElementById('three-canvas');
  if (!canvas) {
    console.warn('Three.js canvas not found. Make sure #three-canvas exists.');
    return;
  }

  // Check if Three.js is loaded
  if (typeof THREE === 'undefined') {
    console.error('Three.js is not loaded. Check your script includes.');
    return;
  }

  console.log('🚀 Three.js scene initialized');
  console.log('📦 Three.js version:', THREE.REVISION);
  console.log('🎬 GSAP available:', typeof gsap !== 'undefined');

  // ============================================
  // YOUR CUSTOM THREE.JS SCENE CODE GOES HERE
  // ============================================

  // Example: Basic scene setup (you can replace this)
  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true // Transparent background
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Example: Simple rotating cube (replace with your own geometry)
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0x00d4ff,
    wireframe: true 
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Handle window resize
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onWindowResize);

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    
    // Example animation (customize as needed)
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    
    renderer.render(scene, camera);
  }
  animate();

  // Example GSAP animation (if GSAP is loaded)
  if (typeof gsap !== 'undefined') {
    gsap.to(cube.scale, {
      x: 1.5,
      y: 1.5,
      z: 1.5,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut'
    });
  }

  // ============================================
  // END OF EXAMPLE CODE
  // ============================================

})();
