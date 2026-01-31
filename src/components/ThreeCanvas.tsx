import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';

// Event to communicate with chat overlay
export const GENIE_EVENTS = {
  EMERGED: 'genie-emerged',
  HIDDEN: 'genie-hidden',
};

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
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

    // Fixed 420x420 canvas
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0.8, 3.5);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(420, 420);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sceneRef.current = {
      scene,
      renderer,
      camera,
      lamp: null,
      genie: null,
      isOut: false,
      animating: false,
      raycaster,
      mouse,
    };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Load lamp - anchored at bottom-right position (1.1, -0.8, 0)
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      lamp.position.set(1.1, -0.8, 0);
      lamp.scale.set(2.2, 2.2, 2.2);
      lamp.rotation.set(0, 0, 0);
      
      scene.add(lamp);
      sceneRef.current.lamp = lamp;

      // Find spout object or create marker at spout position
      let spout = lamp.getObjectByName('spout') || lamp.getObjectByName('Spout');
      if (!spout) {
        // Create spout marker if not found
        spout = new THREE.Object3D();
        spout.name = 'spout';
        spout.position.set(0.1, 0.35, 0.15);
        lamp.add(spout);
      }

      // Load genie - parented directly to spout
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current) return;
        
        const genie = genieGltf.scene;
        
        // Initial state
        genie.visible = false;
        genie.scale.set(0, 0, 0);
        genie.position.set(0, 0, 0); // Local to spout
        genie.rotation.set(0, -2.6, 0); // Only Y rotation: -2.6 radians
        
        // Parent genie directly to spout
        spout.add(genie);
        sceneRef.current.genie = genie;
      });
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      dracoLoader.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Click handler via raycaster - ONLY lamp mesh is clickable
  const handleContainerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!sceneRef.current) return;
    const { lamp, genie, isOut, animating, raycaster, mouse, camera } = sceneRef.current;
    if (!lamp || !genie || animating) return;

    // Get container bounds
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Calculate mouse position relative to container
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Only check lamp meshes (exclude genie)
    const lampMeshes: THREE.Mesh[] = [];
    lamp.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Check if this mesh is part of genie
        let isGenieChild = false;
        let current: THREE.Object3D | null = child;
        while (current) {
          if (current === genie) {
            isGenieChild = true;
            break;
          }
          current = current.parent;
        }
        if (!isGenieChild) {
          lampMeshes.push(child);
        }
      }
    });
    
    const intersects = raycaster.intersectObjects(lampMeshes, false);
    if (intersects.length === 0) return;

    sceneRef.current.animating = true;

    if (!isOut) {
      // ========== EMERGE ==========
      genie.visible = true;
      genie.scale.set(0, 0, 0);
      genie.position.set(0, 0, 0);

      // Clean emerge: scale 0 → 1.3, y 0 → 1.05
      gsap.to(genie.scale, {
        x: 1.3,
        y: 1.3,
        z: 1.3,
        duration: 1.2,
        ease: 'back.out(1.4)',
      });

      gsap.to(genie.position, {
        x: -0.35,
        y: 1.05,
        z: 0.15,
        duration: 1.2,
        ease: 'power2.out',
        onComplete: () => {
          if (sceneRef.current) {
            sceneRef.current.animating = false;
            sceneRef.current.isOut = true;
            window.dispatchEvent(new CustomEvent(GENIE_EVENTS.EMERGED));
          }
        },
      });
    } else {
      // ========== RETURN ==========
      window.dispatchEvent(new CustomEvent(GENIE_EVENTS.HIDDEN));

      gsap.to(genie.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.8,
        ease: 'power2.in',
      });

      gsap.to(genie.position, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.8,
        ease: 'power2.in',
        onComplete: () => {
          genie.visible = false;
          if (sceneRef.current) {
            sceneRef.current.animating = false;
            sceneRef.current.isOut = false;
          }
        },
      });
    }
  }, []);

  return (
    <div 
      id="genie-container"
      ref={containerRef} 
      onClick={handleContainerClick}
      className="fixed cursor-pointer"
      style={{ 
        bottom: '20px',
        right: '20px',
        width: '420px',
        height: '420px',
        pointerEvents: 'auto', // Container captures clicks for raycasting
        zIndex: 10,
      }}
    />
  );
};

// Utility function to trigger genie reactions from outside
export const triggerGenieReaction = (type: 'nod' | 'thumbsUp' | 'sparkle' | 'wink' | 'blink') => {
  window.dispatchEvent(new CustomEvent('genie-react', { detail: { type } }));
};
