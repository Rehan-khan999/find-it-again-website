import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';

// Event to communicate with chat overlay
export const GENIE_EVENTS = {
  EMERGED: 'genie-emerged',
  HIDDEN: 'genie-hidden',
  GENIE_POSITION: 'genie-position',
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

  // Broadcast genie screen position for chat panel positioning
  const broadcastGeniePosition = useCallback(() => {
    if (!sceneRef.current?.genie || !sceneRef.current?.isOut) return;
    
    const { genie, camera, renderer } = sceneRef.current;
    
    // Get genie world position
    const genieWorldPos = new THREE.Vector3();
    genie.getWorldPosition(genieWorldPos);
    
    // Project to screen coordinates
    const screenPos = genieWorldPos.clone().project(camera);
    const rect = renderer.domElement.getBoundingClientRect();
    
    const screenX = rect.left + (screenPos.x + 1) * rect.width / 2;
    const screenY = rect.top + (-screenPos.y + 1) * rect.height / 2;
    
    window.dispatchEvent(new CustomEvent(GENIE_EVENTS.GENIE_POSITION, {
      detail: { x: screenX, y: screenY, canvasRect: rect }
    }));
  }, []);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const scene = new THREE.Scene();

    // Camera positioned to see both lamp at bottom and genie above
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 1, 4.5);
    camera.lookAt(0, 0.3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(420, 420);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Strong lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(2, 5, 4);
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x88ccff, 1);
    fillLight.position.set(-3, 2, 2);
    scene.add(fillLight);
    
    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(0, 2, -3);
    scene.add(backLight);

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

    // Load lamp - positioned at bottom center of canvas view
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      lamp.position.set(0.5, -0.8, 0); // Center-right, at bottom
      lamp.scale.set(2.0, 2.0, 2.0);
      lamp.rotation.set(0, -0.5, 0); // Slight angle facing left
      
      scene.add(lamp);
      sceneRef.current.lamp = lamp;

      console.log('Lamp loaded at position:', lamp.position);

      // Load genie - will be positioned above lamp when emerged
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current) return;
        
        const genie = genieGltf.scene;
        
        // Initial state - hidden
        genie.visible = false;
        genie.scale.set(0, 0, 0);
        // Start at lamp spout position
        genie.position.set(0.3, 0.3, 0.1);
        // Genie faces LEFT (toward where chat will appear)
        // Rotation: facing -X direction (left side of screen)
        genie.rotation.set(0, Math.PI * 0.3, 0); // ~55 degrees, facing toward chat
        
        // Add genie to scene (not lamp, for easier positioning)
        scene.add(genie);
        sceneRef.current.genie = genie;
        
        console.log('Genie loaded, initial state set');
      }, undefined, (error) => {
        console.error('Error loading genie:', error);
      });
    }, undefined, (error) => {
      console.error('Error loading lamp:', error);
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Broadcast genie position when out
      if (sceneRef.current?.isOut) {
        broadcastGeniePosition();
        
        // Subtle floating animation
        if (sceneRef.current.genie && !sceneRef.current.animating) {
          const time = Date.now() * 0.001;
          sceneRef.current.genie.position.y = 1.2 + Math.sin(time * 1.5) * 0.05;
        }
      }
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      dracoLoader.dispose();
      sceneRef.current = null;
    };
  }, [broadcastGeniePosition]);

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
        lampMeshes.push(child);
      }
    });
    
    const intersects = raycaster.intersectObjects(lampMeshes, false);
    if (intersects.length === 0) return;

    console.log('Lamp clicked!', isOut ? 'Closing genie' : 'Opening genie');
    sceneRef.current.animating = true;

    if (!isOut) {
      // ========== EMERGE ==========
      genie.visible = true;
      genie.scale.set(0.01, 0.01, 0.01);
      genie.position.set(0.5, -0.3, 0);

      // Scale up and move to final position (standing above lamp, facing left toward chat)
      gsap.to(genie.scale, {
        x: 1.0,
        y: 1.0,
        z: 1.0,
        duration: 1.0,
        ease: 'back.out(1.5)',
      });

      gsap.to(genie.position, {
        x: 0.5,   // Right side (adjacent to chat on left)
        y: 0.8,   // Above lamp
        z: 0.3,
        duration: 1.0,
        ease: 'power2.out',
        onComplete: () => {
          if (sceneRef.current) {
            sceneRef.current.animating = false;
            sceneRef.current.isOut = true;
            console.log('Genie emerged');
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
        duration: 0.7,
        ease: 'power2.in',
      });

      gsap.to(genie.position, {
        x: 0.3,
        y: 0.3,
        z: 0.1,
        duration: 0.7,
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
