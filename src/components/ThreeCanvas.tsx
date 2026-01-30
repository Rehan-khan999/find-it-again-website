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
  genieLight: THREE.PointLight | null;
  isOut: boolean;
  animating: boolean;
  animationId: number | null;
}

// Widget dimensions
const WIDGET_WIDTH = 300;
const WIDGET_HEIGHT = 300;

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene - transparent background
    const scene = new THREE.Scene();

    // Camera - positioned for widget view
    const camera = new THREE.PerspectiveCamera(
      50,
      WIDGET_WIDTH / WIDGET_HEIGHT,
      0.1,
      1000
    );
    camera.position.set(0, 1, 3);
    camera.lookAt(0, 0.6, 0);

    // Renderer - transparent alpha, sized to widget
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(WIDGET_WIDTH, WIDGET_HEIGHT);
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

    // Load lamp - centered in widget
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      
      // Lamp centered at bottom of widget view
      lamp.position.set(0, -0.6, 0);
      lamp.scale.set(0.6, 0.6, 0.6);
      
      scene.add(lamp);
      sceneRef.current.lamp = lamp;

      // Load genie as child of lamp
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current || !sceneRef.current.lamp) return;
        
        const genie = genieGltf.scene;
        
        // Genie rotation to face camera
        genie.rotation.set(0, -Math.PI / 2, 0);
        
        // Initial scale = (0, 0, 0) - fully invisible on load
        genie.scale.set(0, 0, 0);
        
        // Initial position - relative to lamp
        genie.position.set(0, 0.2, 0.2);
        
        // Create blue magical light attached to genie tail area
        const genieLight = new THREE.PointLight(0x00aaff, 0, 3);
        genieLight.position.set(0, -0.3, 0);
        genie.add(genieLight);
        sceneRef.current.genieLight = genieLight;
        
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
        // EMERGE: Scale up then rise
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = true;
            }
          }
        });

        // Step 1: Scale from (0,0,0) → (1,1,1) over 1.2s
        tl.to(genie.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 1.2,
          ease: 'power2.out'
        });

        // Step 2: Move genie up to emerge position
        tl.to(genie.position, {
          x: 0,
          y: 1.2,
          z: 0.2,
          duration: 2.5,
          ease: 'power3.out'
        });

        // Step 3: Bow forward
        tl.to(genie.rotation, {
          x: 0.4,
          duration: 0.6,
          ease: 'power2.out'
        });

        // Step 4: Hold bow pose for 2 seconds
        tl.to({}, { duration: 2 });

        // Step 5: Return to upright
        tl.to(genie.rotation, {
          x: 0,
          duration: 0.6,
          ease: 'power2.in'
        });

        // Animate blue magic light
        const light = sceneRef.current.genieLight;
        if (light) {
          gsap.to(light, {
            intensity: 2,
            duration: 1,
            ease: 'power2.out'
          });
        }

      } else {
        // RETURN: Descend then shrink
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = false;
            }
          }
        });

        // Step 1: Move genie back down
        tl.to(genie.position, {
          x: 0,
          y: 0.2,
          z: 0.2,
          duration: 2,
          ease: 'power2.in'
        });

        // Step 2: Scale to zero
        tl.to(genie.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1,
          ease: 'power2.in'
        });

        // Fade out light
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
      id="genie-widget"
      ref={containerRef} 
      className="cursor-pointer"
      style={{ 
        position: 'fixed',
        bottom: '80px',
        right: '40px',
        width: `${WIDGET_WIDTH}px`,
        height: `${WIDGET_HEIGHT}px`,
        zIndex: 5,
        pointerEvents: 'auto'
      }}
      aria-hidden="true"
    />
  );
};
