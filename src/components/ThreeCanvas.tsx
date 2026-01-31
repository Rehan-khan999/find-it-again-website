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
    parentGroup: THREE.Group | null;
    isOut: boolean;
    animating: boolean;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  } | null>(null);

  // Broadcast genie screen position for chat panel positioning
  const broadcastGeniePosition = useCallback(() => {
    if (!sceneRef.current?.genie || !sceneRef.current?.isOut) return;
    
    const { genie, camera, renderer } = sceneRef.current;
    
    // Get genie world position (hand area - right side)
    const genieWorldPos = new THREE.Vector3();
    genie.getWorldPosition(genieWorldPos);
    // Offset to right hand position
    genieWorldPos.x += 0.3;
    genieWorldPos.y += 0.2;
    
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

    // Camera - viewing the scene from front
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    camera.position.set(0, 0.5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(420, 420);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Strong lighting for visibility
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(3, 5, 5);
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0x88ccff, 1.2);
    fillLight.position.set(-3, 3, 3);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xffffff, 1);
    rimLight.position.set(0, 0, -3);
    scene.add(rimLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Create parent group for rotation control
    // This group will be rotated 325 degrees right (285 + 40 = 325 degrees)
    const parentGroup = new THREE.Group();
    parentGroup.rotation.y = (325 * Math.PI) / 180; // 325 degrees right
    scene.add(parentGroup);

    sceneRef.current = {
      scene,
      renderer,
      camera,
      lamp: null,
      genie: null,
      parentGroup,
      isOut: false,
      animating: false,
      raycaster,
      mouse,
    };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Load lamp first
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      
      // Lamp positioned at bottom-left of the scene (genie's left side)
      // So layout is: LAMP (left) - GENIE (center) - CHAT (right)
      lamp.position.set(-0.8, -1.2, 0);
      lamp.scale.set(1.8, 1.8, 1.8);
      lamp.rotation.set(0, 0.3, 0); // Slight angle toward center
      
      parentGroup.add(lamp);
      sceneRef.current.lamp = lamp;

      console.log('Lamp loaded');

      // Load genie
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current) return;
        
        const genie = genieGltf.scene;
        
        // Initial state - hidden inside lamp
        genie.visible = false;
        genie.scale.set(0, 0, 0);
        
        // Start position at lamp spout (tail position)
        genie.position.set(-0.5, -0.8, 0);
        
        // Genie body faces RIGHT toward the chat panel
        genie.rotation.set(0, -Math.PI / 2, 0);
        
        // Find and rotate only the head/face to look upward
        genie.traverse((child) => {
          const name = child.name.toLowerCase();
          if (name.includes('head') || name.includes('face') || name.includes('skull')) {
            child.rotation.x = -0.4; // Tilt head upward (~23 degrees)
            console.log('Found head bone:', child.name);
          }
        });
        
        parentGroup.add(genie);
        sceneRef.current.genie = genie;
        
        console.log('Genie loaded');
      }, undefined, (error) => {
        console.error('Error loading genie:', error);
      });
    }, undefined, (error) => {
      console.error('Error loading lamp:', error);
    });

    // Animation loop
    let floatOffset = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Broadcast genie position when out
      if (sceneRef.current?.isOut) {
        broadcastGeniePosition();
        
        // Subtle floating animation for genie
        if (sceneRef.current.genie && !sceneRef.current.animating) {
          floatOffset = Math.sin(Date.now() * 0.002) * 0.03;
          // Don't override the y position, just add float
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
    const { lamp, genie, isOut, animating, raycaster, mouse, camera, scene } = sceneRef.current;
    if (!lamp || !genie || animating) return;

    // Get container bounds
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Calculate mouse position relative to container
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Check all objects in scene for intersection
    const allObjects: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        allObjects.push(child);
      }
    });
    
    const intersects = raycaster.intersectObjects(allObjects, true);
    if (intersects.length === 0) return;

    // Check if clicked object is part of lamp (not genie)
    let clickedLamp = false;
    for (const intersect of intersects) {
      let obj: THREE.Object3D | null = intersect.object;
      while (obj) {
        if (obj === lamp) {
          clickedLamp = true;
          break;
        }
        if (obj === genie) {
          break; // Don't trigger on genie clicks
        }
        obj = obj.parent;
      }
      if (clickedLamp) break;
    }
    
    if (!clickedLamp) return;

    console.log('Lamp clicked!', isOut ? 'Closing genie' : 'Opening genie');
    sceneRef.current.animating = true;

    if (!isOut) {
      // ========== EMERGE ==========
      genie.visible = true;
      genie.scale.set(0.01, 0.01, 0.01);
      // Start at lamp spout position (tail touches lamp)
      genie.position.set(-0.5, -0.8, 0);

      // Animate scale - larger genie
      gsap.to(genie.scale, {
        x: 1.8,
        y: 1.8,
        z: 1.8,
        duration: 1.2,
        ease: 'elastic.out(1, 0.5)',
      });

      // Animate position - genie rises but tail stays near lamp
      // Final position: above and slightly right of lamp
      // Genie is positioned so it can "hold" the chat on its right
      gsap.to(genie.position, {
        x: -0.2,  // Slightly right of lamp (center-ish)
        y: -0.3,  // Down, low position (tail touching lamp area)
        z: 0.2,
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
        duration: 0.6,
        ease: 'power2.in',
      });

      gsap.to(genie.position, {
        x: -0.5,
        y: -0.8,
        z: 0,
        duration: 0.6,
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
        bottom: '10px',
        right: '10px',
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
