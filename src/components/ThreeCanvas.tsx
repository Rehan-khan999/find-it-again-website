import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';

interface SceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  lamp: THREE.Group | null;
  genie: THREE.Group | null;
  isOut: boolean;
  animating: boolean;
  animationId: number | null;
}

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // Camera - exact values
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 0.8, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const frontLight = new THREE.DirectionalLight(0xffffff, 2);
    frontLight.position.set(0, 3, 5);
    scene.add(frontLight);
    const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
    topLight.position.set(0, 5, 0);
    scene.add(topLight);
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.8);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // State
    sceneRef.current = {
      scene,
      camera,
      renderer,
      lamp: null,
      genie: null,
      isOut: false,
      animating: false,
      animationId: null
    };

    // Loaders
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Load lamp - NO rotation, NO scaling, NO normalization
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      // Keep original orientation - no transforms
      scene.add(lamp);
      sceneRef.current.lamp = lamp;

      // Load genie as child of lamp
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current || !sceneRef.current.lamp) return;
        
        const genie = genieGltf.scene;
        
        // EXPLICIT: Genie rotation to face camera
        genie.rotation.set(0, -Math.PI / 2, 0);
        
        // Initial scale = 0 (hidden)
        genie.scale.set(0, 0, 0);
        
        // Initial position (start position for emerge animation)
        genie.position.set(0.6, 0.2, 0.3);
        
        // Attach as child of lamp
        lamp.add(genie);
        sceneRef.current.genie = genie;
      });
    });

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Click handler
    const handleClick = () => {
      if (!sceneRef.current) return;
      const { genie, isOut, animating } = sceneRef.current;
      
      if (animating || !genie) return;
      sceneRef.current.animating = true;

      if (!isOut) {
        // EMERGE: First scale up, THEN rise out of lamp
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = true;
            }
          }
        });

        // Step 1: Scale from 0 → 1 over 1.2s
        tl.to(genie.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.2,
          ease: 'power2.out'
        });

        // Step 2: Move from (0.6, 0.2, 0.3) → (0.6, 0.6, 0.3) over 2.5s
        tl.to(genie.position, {
          x: 0.6,
          y: 0.6,
          z: 0.3,
          duration: 2.5,
          ease: 'power3.out'
        });

      } else {
        // RETURN: First descend into lamp, THEN shrink
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = false;
            }
          }
        });

        // Step 1: Move from (0.6, 0.6, 0.3) → (0.6, 0.2, 0.3) over 2.2s
        tl.to(genie.position, {
          x: 0.6,
          y: 0.2,
          z: 0.3,
          duration: 2.2,
          ease: 'power3.in'
        });

        // Step 2: Scale from 1 → 0 over 1s
        tl.to(genie.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1,
          ease: 'power2.in'
        });
      }
    };

    containerRef.current.addEventListener('click', handleClick);

    // Resize
    const handleResize = () => {
      if (!sceneRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeEventListener('click', handleClick);
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      renderer.dispose();
      dracoLoader.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 cursor-pointer"
      style={{ zIndex: 50 }}
      aria-hidden="true"
    />
  );
};
