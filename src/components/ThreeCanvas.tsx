import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    genie: THREE.Group | null;
    isOut: boolean;
    animating: boolean;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene
    const scene = new THREE.Scene();

    // Camera - fullscreen
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 5);
    camera.lookAt(0, 0, 0);

    // Renderer - fullscreen
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    // State
    sceneRef.current = {
      renderer,
      genie: null,
      isOut: false,
      animating: false
    };

    // Loaders
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Load lamp
    loader.load('/models/lamp.glb', (lampGltf) => {
      const lamp = lampGltf.scene;
      lamp.position.set(0, -1, 0);
      lamp.scale.set(1, 1, 1);
      scene.add(lamp);

      // Load genie
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current) return;
        
        const genie = genieGltf.scene;
        genie.rotation.set(0, -Math.PI / 2, 0);
        genie.scale.set(1, 1, 1);
        // Hidden below lamp
        genie.position.set(0.5, -2, 0);
        scene.add(genie);
        sceneRef.current.genie = genie;
      });
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Click handler
    const handleClick = () => {
      if (!sceneRef.current) return;
      const { genie, isOut, animating } = sceneRef.current;
      if (!genie || animating) return;

      sceneRef.current.animating = true;

      if (!isOut) {
        // Rise up
        gsap.to(genie.position, {
          y: 0.5,
          duration: 2,
          ease: 'power2.out',
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = true;
            }
          }
        });
      } else {
        // Go back down
        gsap.to(genie.position, {
          y: -2,
          duration: 1.5,
          ease: 'power2.in',
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = false;
            }
          }
        });
      }
    };
    containerRef.current.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeEventListener('click', handleClick);
      renderer.dispose();
      dracoLoader.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-10 cursor-pointer"
      style={{ pointerEvents: 'auto' }}
    />
  );
};
