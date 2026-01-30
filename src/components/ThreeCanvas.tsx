import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    lamp: THREE.Group | null;
    genie: THREE.Group | null;
    isOut: boolean;
    animating: boolean;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sceneRef.current = {
      renderer,
      camera,
      lamp: null,
      genie: null,
      isOut: false,
      animating: false,
      raycaster,
      mouse
    };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Load lamp - positioned at bottom-right
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      lamp.position.set(2, -1.5, 0);
      lamp.scale.set(1, 1, 1);
      scene.add(lamp);
      sceneRef.current.lamp = lamp;

      // Load genie as child of lamp
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current || !sceneRef.current.lamp) return;
        
        const genie = genieGltf.scene;
        
        // Face camera directly
        genie.rotation.set(0, -Math.PI / 2, 0);
        
        // Start completely hidden
        genie.scale.set(0, 0, 0);
        
        // Position relative to lamp (hidden below)
        genie.position.set(0.25, -0.8, 0.3);
        
        // Attach genie as child of lamp
        lamp.add(genie);
        sceneRef.current.genie = genie;
      });
    });

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Raycasting click handler - only lamp is clickable
    const handleClick = (event: MouseEvent) => {
      if (!sceneRef.current) return;
      const { lamp, genie, isOut, animating, raycaster, mouse, camera } = sceneRef.current;
      if (!lamp || !genie || animating) return;

      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update raycaster
      raycaster.setFromCamera(mouse, camera);

      // Check intersection with lamp only (exclude genie by checking lamp children minus genie)
      const lampMeshes: THREE.Object3D[] = [];
      lamp.traverse((child) => {
        if (child !== genie && !genie.children.includes(child)) {
          lampMeshes.push(child);
        }
      });
      
      const intersects = raycaster.intersectObjects(lampMeshes, true);
      
      // Only proceed if lamp was clicked
      if (intersects.length === 0) return;

      sceneRef.current.animating = true;

      if (!isOut) {
        // Emerge animation
        // Scale from 0 to 1.6 over 1.2s
        gsap.to(genie.scale, {
          x: 1.6,
          y: 1.6,
          z: 1.6,
          duration: 1.2,
          ease: 'back.out(1.7)'
        });
        
        // Move from -0.8 to -0.3 over 2.5s
        gsap.to(genie.position, {
          y: -0.3,
          duration: 2.5,
          ease: 'power3.out',
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = true;
            }
          }
        });
      } else {
        // Return animation
        // Move from -0.3 to -0.8 over 2s
        gsap.to(genie.position, {
          y: -0.8,
          duration: 2,
          ease: 'power2.in'
        });
        
        // Scale from 1.6 to 0 over 1s (starts after position animation)
        gsap.to(genie.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1,
          delay: 1,
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
    
    renderer.domElement.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
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
