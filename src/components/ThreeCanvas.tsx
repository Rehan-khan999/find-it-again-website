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
  lid: THREE.Object3D | null;
  genie: THREE.Group | null;
  isOpen: boolean;
  animating: boolean;
  animationId: number | null;
}

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);

    // Strong lighting
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0x8888ff, 1);
    backLight.position.set(-3, 2, -3);
    scene.add(backLight);

    // Initialize state
    sceneRef.current = {
      scene,
      camera,
      renderer,
      lamp: null,
      lid: null,
      genie: null,
      isOpen: false,
      animating: false,
      animationId: null
    };

    // Setup loaders with DRACO support
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Load lamp first
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;

      // Auto-scale lamp to fit view
      const box = new THREE.Box3().setFromObject(lamp);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scaleFactor = maxDim > 0 ? 2 / maxDim : 1;
      
      lamp.scale.setScalar(scaleFactor);
      lamp.position.set(
        -center.x * scaleFactor,
        -center.y * scaleFactor,
        -center.z * scaleFactor
      );

      scene.add(lamp);
      sceneRef.current.lamp = lamp;

      // Find the lid (try common naming conventions)
      let lid: THREE.Object3D | null = null;
      lamp.traverse((child) => {
        const name = child.name.toLowerCase();
        if (name.includes('lid') || name.includes('cap') || name.includes('top') || name.includes('cover')) {
          lid = child;
        }
      });
      
      // If no lid found, use the first child as a fallback for animation
      if (!lid && lamp.children.length > 0) {
        lamp.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && !lid) {
            lid = child.parent || child;
          }
        });
      }
      sceneRef.current.lid = lid;

      // Load genie and attach to lamp
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current) return;
        
        const genie = genieGltf.scene;

        // Auto-scale genie relative to lamp
        const genieBox = new THREE.Box3().setFromObject(genie);
        const genieSize = genieBox.getSize(new THREE.Vector3());
        const genieMaxDim = Math.max(genieSize.x, genieSize.y, genieSize.z);
        const genieScale = genieMaxDim > 0 ? 1.5 / genieMaxDim : 1;
        
        // Apply scale and hide initially
        genie.scale.set(0, 0, 0);
        genie.userData.targetScale = genieScale;
        
        // Position genie at lamp opening (will emerge from here)
        genie.position.set(0, 0.3 / scaleFactor, 0);
        
        // Attach genie to lamp so it moves with it
        lamp.add(genie);
        sceneRef.current.genie = genie;
      });
    });

    // Animation loop with genie floating effect
    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);
      
      // Floating animation for genie when visible
      const { genie, isOpen } = sceneRef.current;
      if (genie && isOpen && genie.scale.x > 0.1) {
        genie.position.y += Math.sin(Date.now() * 0.003) * 0.001;
        genie.rotation.y += 0.002;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Click handler for open/close animation
    const handleClick = () => {
      if (!sceneRef.current) return;
      const { lid, genie, isOpen, animating } = sceneRef.current;
      
      if (animating || !genie) return;
      sceneRef.current.animating = true;

      const targetScale = genie.userData.targetScale || 1;

      if (!isOpen) {
        // OPEN: Rotate lid and emerge genie
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOpen = true;
            }
          }
        });

        // Open lid (rotate on X axis)
        if (lid) {
          tl.to(lid.rotation, {
            x: -1.2,
            duration: 0.6,
            ease: 'power2.out'
          }, 0);
        }

        // Scale up and rise genie
        tl.to(genie.scale, {
          x: targetScale,
          y: targetScale,
          z: targetScale,
          duration: 0.8,
          ease: 'back.out(1.7)'
        }, 0.3);

        tl.to(genie.position, {
          y: genie.position.y + 1.5,
          duration: 1,
          ease: 'power3.out'
        }, 0.3);

      } else {
        // CLOSE: Return genie and close lid
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOpen = false;
            }
          }
        });

        // Lower and shrink genie
        tl.to(genie.position, {
          y: genie.position.y - 1.5,
          duration: 0.8,
          ease: 'power2.in'
        }, 0);

        tl.to(genie.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.5,
          ease: 'power2.in'
        }, 0.4);

        // Close lid
        if (lid) {
          tl.to(lid.rotation, {
            x: 0,
            duration: 0.5,
            ease: 'power2.inOut'
          }, 0.7);
        }
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
