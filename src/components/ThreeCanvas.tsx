import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface SceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  lamp: THREE.Group | null;
  lid: THREE.Object3D | null;
  genie: THREE.Group | null;
  isOpen: boolean;
  animationId: number | null;
}

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneState | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambLight);

    // Add test cube to verify scene is rendering
    const testGeometry = new THREE.BoxGeometry(1, 1, 1);
    const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const testCube = new THREE.Mesh(testGeometry, testMaterial);
    testCube.position.set(0, 0, 0);
    scene.add(testCube);

    // Store refs
    sceneRef.current = {
      scene,
      camera,
      renderer,
      lamp: null,
      lid: null,
      genie: null,
      isOpen: false,
      animationId: null
    };

    // Load models
    const loader = new GLTFLoader();
    
    loader.load('/models/lamp.glb', (gltf) => {
      if (!sceneRef.current) return;
      
      const lamp = gltf.scene;
      scene.add(lamp);
      sceneRef.current.lamp = lamp;
      
      const lid = lamp.getObjectByName('Lid');
      sceneRef.current.lid = lid || null;

      loader.load('/models/genie.glb', (gltf2) => {
        if (!sceneRef.current) return;
        
        const genie = gltf2.scene;
        genie.scale.set(0, 0, 0);
        genie.position.set(0, -0.6, 0);
        lamp.add(genie);
        sceneRef.current.genie = genie;

        // Add glow effect
        genie.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const material = mesh.material as THREE.MeshStandardMaterial;
            if (material.emissive) {
              material.emissive = new THREE.Color(0x00aaff);
              material.emissiveIntensity = 1;
            }
          }
        });
      });
    });

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      
      sceneRef.current.animationId = requestAnimationFrame(animate);
      
      if (sceneRef.current.genie && sceneRef.current.isOpen) {
        sceneRef.current.genie.position.y += Math.sin(Date.now() * 0.002) * 0.002;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current) return;
      
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Handle click for lamp toggle
    const handleClick = () => {
      if (!sceneRef.current || !sceneRef.current.lid || !sceneRef.current.genie) return;
      
      const { lid, genie, isOpen } = sceneRef.current;
      
      if (!isOpen) {
        // Open lamp animation
        const openAnimation = () => {
          if (!sceneRef.current) return;
          
          if (lid.rotation.x > -1.2) {
            lid.rotation.x -= 0.05;
            requestAnimationFrame(openAnimation);
          } else {
            const scaleUp = () => {
              if (!sceneRef.current) return;
              if (genie.scale.x < 1) {
                genie.scale.x += 0.05;
                genie.scale.y += 0.05;
                genie.scale.z += 0.05;
                requestAnimationFrame(scaleUp);
              } else {
                const moveUp = () => {
                  if (!sceneRef.current) return;
                  if (genie.position.y < 1.5) {
                    genie.position.y += 0.05;
                    requestAnimationFrame(moveUp);
                  }
                };
                moveUp();
              }
            };
            scaleUp();
          }
        };
        openAnimation();
      } else {
        // Close lamp animation
        const moveDown = () => {
          if (!sceneRef.current) return;
          if (genie.position.y > -0.6) {
            genie.position.y -= 0.05;
            requestAnimationFrame(moveDown);
          } else {
            const scaleDown = () => {
              if (!sceneRef.current) return;
              if (genie.scale.x > 0) {
                genie.scale.x -= 0.05;
                genie.scale.y -= 0.05;
                genie.scale.z -= 0.05;
                requestAnimationFrame(scaleDown);
              } else {
                const closeLid = () => {
                  if (!sceneRef.current) return;
                  if (lid.rotation.x < 0) {
                    lid.rotation.x += 0.05;
                    requestAnimationFrame(closeLid);
                  }
                };
                closeLid();
              }
            };
            scaleDown();
          }
        };
        moveDown();
      }
      
      sceneRef.current.isOpen = !isOpen;
    };
    
    const container = containerRef.current;
    container.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container?.removeEventListener('click', handleClick);
      
      if (sceneRef.current?.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0"
      style={{ cursor: 'pointer', zIndex: 9999 }}
      aria-hidden="true"
    />
  );
};
