import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';

const CONTAINER_WIDTH = 260;
const CONTAINER_HEIGHT = 260;

interface SceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  lamp: THREE.Group | null;
  genie: THREE.Group | null;
  genieLight: THREE.PointLight | null;
  isOut: boolean;
  animating: boolean;
  animationId: number | null;
}

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene - transparent background
    const scene = new THREE.Scene();

    // Camera - centered for the widget container
    const camera = new THREE.PerspectiveCamera(
      50,
      CONTAINER_WIDTH / CONTAINER_HEIGHT,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);
    camera.lookAt(0, 0, 0);

    // Renderer - sized to container
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(CONTAINER_WIDTH, CONTAINER_HEIGHT);
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
    fillLight.position.set(-2, 2, -2);
    scene.add(fillLight);

    // State
    sceneRef.current = {
      scene,
      camera,
      renderer,
      lamp: null,
      genie: null,
      genieLight: null,
      isOut: false,
      animating: false,
      animationId: null
    };

    // Loaders
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Load lamp - centered in container
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      
      // Lamp centered at bottom of view
      lamp.position.set(0, -0.6, 0);
      lamp.scale.set(1, 1, 1);
      
      scene.add(lamp);
      sceneRef.current.lamp = lamp;

      // Load genie as child of lamp
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current || !sceneRef.current.lamp) return;
        
        const genie = genieGltf.scene;
        
        // Genie rotation to face camera
        genie.rotation.set(0, -Math.PI / 2, 0);
        
        // Initial scale = 0 (invisible)
        genie.scale.set(0, 0, 0);
        
        // Initial position - genie base (tail touches lamp)
        genie.position.set(0.6, 0.6, 0.3);
        
        // Blue magical light
        const genieLight = new THREE.PointLight(0x00aaff, 0, 3);
        genieLight.position.set(0, -0.3, 0);
        genie.add(genieLight);
        sceneRef.current.genieLight = genieLight;
        
        // Attach to lamp
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

    // Click handler - triggers on any click within container
    const handleClick = (event: MouseEvent) => {
      if (!sceneRef.current || !sceneRef.current.lamp) return;
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      // Calculate mouse position relative to container
      mouse.x = ((event.clientX - rect.left) / CONTAINER_WIDTH) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / CONTAINER_HEIGHT) * 2 + 1;
      
      // Update raycaster
      raycaster.setFromCamera(mouse, camera);
      
      // Check for lamp intersection
      const lampObjects: THREE.Object3D[] = [];
      sceneRef.current.lamp.traverse((child) => lampObjects.push(child));
      const intersects = raycaster.intersectObjects(lampObjects, true);
      
      if (intersects.length === 0) return; // Click not on lamp
      
      const { genie, isOut, animating } = sceneRef.current;
      if (animating || !genie) return;
      
      sceneRef.current.animating = true;

      if (!isOut) {
        // EMERGE
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = true;
            }
          }
        });

        // Scale up
        tl.to(genie.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.2,
          ease: 'power2.out'
        });

        // Rise up - genie emerges but tail stays touching lamp
        tl.to(genie.position, {
          x: 0.6,
          y: 1.0,
          z: 0.3,
          duration: 2.5,
          ease: 'power3.out'
        });

        // Bow forward
        tl.to(genie.rotation, {
          x: 0.4,
          duration: 0.6,
          ease: 'power2.out'
        });

        // Hold
        tl.to({}, { duration: 2 });

        // Return upright
        tl.to(genie.rotation, {
          x: 0,
          duration: 0.6,
          ease: 'power2.in'
        });

        // Light up
        const light = sceneRef.current.genieLight;
        if (light) {
          gsap.to(light, {
            intensity: 2,
            duration: 1,
            ease: 'power2.out'
          });
        }

      } else {
        // RETURN
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = false;
            }
          }
        });

        // Descend back to base position
        tl.to(genie.position, {
          x: 0.6,
          y: 0.6,
          z: 0.3,
          duration: 2,
          ease: 'power2.in'
        });

        // Shrink
        tl.to(genie.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1,
          ease: 'power2.in'
        });

        // Fade light
        const light = sceneRef.current.genieLight;
        if (light) {
          gsap.to(light, {
            intensity: 0,
            duration: 1,
            ease: 'power2.in'
          });
        }
      }
    };

    containerRef.current.addEventListener('click', handleClick);

    return () => {
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
      id="genie-container"
      ref={containerRef} 
      className="cursor-pointer"
      style={{ 
        position: 'fixed',
        bottom: 90,
        right: 40,
        width: CONTAINER_WIDTH,
        height: CONTAINER_HEIGHT,
        zIndex: 9999,
        pointerEvents: 'auto'
      }}
      aria-hidden="true"
    />
  );
};