import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';

// Event to communicate with chat overlay
export const GENIE_EVENTS = {
  EMERGED: 'genie-emerged',
  HIDDEN: 'genie-hidden',
  HAND_POSITION: 'genie-hand-position',
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

  // Broadcast genie hand position for chat panel positioning
  const broadcastHandPosition = useCallback(() => {
    if (!sceneRef.current?.genie || !sceneRef.current?.isOut) return;
    
    const { genie, camera, renderer } = sceneRef.current;
    
    // Get genie world position and project to screen
    const genieWorldPos = new THREE.Vector3();
    genie.getWorldPosition(genieWorldPos);
    
    // Offset for "hand" position (slightly to the left and up from genie center)
    const handOffset = new THREE.Vector3(-0.3, 0.4, 0);
    const handWorldPos = genieWorldPos.add(handOffset);
    
    // Project to screen coordinates
    const handScreen = handWorldPos.clone().project(camera);
    const rect = renderer.domElement.getBoundingClientRect();
    
    const screenX = rect.left + (handScreen.x + 1) * rect.width / 2;
    const screenY = rect.top + (-handScreen.y + 1) * rect.height / 2;
    
    window.dispatchEvent(new CustomEvent(GENIE_EVENTS.HAND_POSITION, {
      detail: { x: screenX, y: screenY }
    }));
  }, []);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const scene = new THREE.Scene();

    // Fixed 420x420 canvas
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0.5, 4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(420, 420);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(3, 5, 4);
    scene.add(mainLight);
    
    // Add fill light for better visibility
    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.8);
    fillLight.position.set(-2, 2, -1);
    scene.add(fillLight);

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

    // Load lamp - positioned bottom-right in view
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      lamp.position.set(0.8, -1.2, 0);
      lamp.scale.set(2.5, 2.5, 2.5);
      lamp.rotation.set(0, -0.3, 0); // Slight rotation to face camera
      
      scene.add(lamp);
      sceneRef.current.lamp = lamp;

      console.log('Lamp loaded successfully');

      // Load genie - add directly to lamp (not scene)
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current || !sceneRef.current.lamp) return;
        
        const genie = genieGltf.scene;
        
        // Initial state - hidden inside lamp
        genie.visible = false;
        genie.scale.set(0, 0, 0);
        genie.position.set(0, 0.2, 0.1); // Start position at lamp spout area
        genie.rotation.set(0, -2.6, 0); // Face toward user
        
        // Add genie as child of lamp
        lamp.add(genie);
        sceneRef.current.genie = genie;
        
        console.log('Genie loaded and attached to lamp');
      }, undefined, (error) => {
        console.error('Error loading genie:', error);
      });
    }, undefined, (error) => {
      console.error('Error loading lamp:', error);
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Broadcast hand position when genie is out
      if (sceneRef.current?.isOut) {
        broadcastHandPosition();
      }
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      dracoLoader.dispose();
      sceneRef.current = null;
    };
  }, [broadcastHandPosition]);

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

    console.log('Lamp clicked!', isOut ? 'Closing genie' : 'Opening genie');
    sceneRef.current.animating = true;

    if (!isOut) {
      // ========== EMERGE ==========
      genie.visible = true;
      genie.scale.set(0.01, 0.01, 0.01); // Start very small but not zero
      genie.position.set(0, 0.2, 0.1); // Start at lamp spout

      // Animate scale and position
      gsap.to(genie.scale, {
        x: 1.3,
        y: 1.3,
        z: 1.3,
        duration: 1.5,
        ease: 'elastic.out(1, 0.5)',
      });

      gsap.to(genie.position, {
        x: -0.2,
        y: 0.9,
        z: 0.2,
        duration: 1.2,
        ease: 'power2.out',
        onComplete: () => {
          if (sceneRef.current) {
            sceneRef.current.animating = false;
            sceneRef.current.isOut = true;
            console.log('Genie emerged, dispatching event');
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
        y: 0.2,
        z: 0.1,
        duration: 0.8,
        ease: 'power2.in',
        onComplete: () => {
          genie.visible = false;
          if (sceneRef.current) {
            sceneRef.current.animating = false;
            sceneRef.current.isOut = false;
            console.log('Genie hidden');
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
        pointerEvents: 'auto',
        zIndex: 10,
      }}
    />
  );
};

// Utility function to trigger genie reactions from outside
export const triggerGenieReaction = (type: 'nod' | 'thumbsUp' | 'sparkle' | 'wink' | 'blink') => {
  window.dispatchEvent(new CustomEvent('genie-react', { detail: { type } }));
};
