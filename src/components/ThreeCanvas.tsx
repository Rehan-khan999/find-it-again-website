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
  isVisible: boolean;
  animating: boolean;
  animationId: number | null;
  glowIntensity: { value: number };
}

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // Fixed camera - no movement
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 1, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0x8888ff, 1);
    backLight.position.set(-3, 2, -3);
    scene.add(backLight);

    // Glow intensity tracker for animation
    const glowIntensity = { value: 0 };

    // Initialize state
    sceneRef.current = {
      scene,
      camera,
      renderer,
      lamp: null,
      genie: null,
      isVisible: false,
      animating: false,
      animationId: null,
      glowIntensity
    };

    // Setup loaders with DRACO support
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Load lamp - fixed front-facing pose, no rotations
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      
      // Fixed position - no rotations or transforms
      lamp.scale.set(1, 1, 1);
      lamp.position.set(0, 0, 0);
      // No rotation - keep model's native front-facing orientation

      scene.add(lamp);
      sceneRef.current.lamp = lamp;

      // Load genie
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current) return;
        
        const genie = genieGltf.scene;

        // Fixed position above lamp - no rotations
        genie.scale.set(0, 0, 0); // Hidden initially
        genie.position.set(0, 2, 0); // Fixed position above lamp

        // Apply emissive glow material to genie meshes
        genie.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const originalMaterial = mesh.material as THREE.MeshStandardMaterial;
              const glowMaterial = new THREE.MeshStandardMaterial({
                color: originalMaterial.color || new THREE.Color(0x4488ff),
                emissive: new THREE.Color(0x0066ff),
                emissiveIntensity: 0,
                metalness: 0.3,
                roughness: 0.5,
                transparent: true,
                opacity: 1
              });
              mesh.material = glowMaterial;
              mesh.userData.glowMaterial = glowMaterial;
            }
          }
        });

        scene.add(genie);
        sceneRef.current.genie = genie;
      });
    });

    // Animation loop - update glow effect
    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);
      
      const { genie, glowIntensity } = sceneRef.current;
      
      // Update glow intensity on all genie materials
      if (genie) {
        genie.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const material = mesh.userData.glowMaterial as THREE.MeshStandardMaterial;
            if (material) {
              material.emissiveIntensity = glowIntensity.value;
            }
          }
        });
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Click handler - simple fade in/out
    const handleClick = () => {
      if (!sceneRef.current) return;
      const { genie, isVisible, animating, glowIntensity } = sceneRef.current;
      
      if (animating || !genie) return;
      sceneRef.current.animating = true;

      if (!isVisible) {
        // FADE IN: Scale 0 → 1 over 2s with glow
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isVisible = true;
            }
          }
        });

        // Scale up genie
        tl.to(genie.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 2,
          ease: 'power2.out'
        }, 0);

        // Fade in glow effect
        tl.to(glowIntensity, {
          value: 1.5,
          duration: 1.5,
          ease: 'power2.out'
        }, 0);

        // Pulse glow after appearing
        tl.to(glowIntensity, {
          value: 0.8,
          duration: 0.5,
          ease: 'power2.inOut'
        }, 1.5);

      } else {
        // FADE OUT: Scale 1 → 0 over 2s
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isVisible = false;
            }
          }
        });

        // Fade out glow first
        tl.to(glowIntensity, {
          value: 0,
          duration: 1,
          ease: 'power2.in'
        }, 0);

        // Scale down genie
        tl.to(genie.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 2,
          ease: 'power2.in'
        }, 0);
      }
    };

    containerRef.current.addEventListener('click', handleClick);

    // Resize handler
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
