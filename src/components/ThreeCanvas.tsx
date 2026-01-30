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
  isOut: boolean;
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

    // Camera - positioned to see lamp nicely
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 0.5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    containerRef.current.appendChild(renderer.domElement);

    // Strong lighting from multiple angles
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const frontLight = new THREE.DirectionalLight(0xffffff, 2);
    frontLight.position.set(0, 3, 5);
    scene.add(frontLight);
    
    const topLight = new THREE.DirectionalLight(0xffffff, 1.5);
    topLight.position.set(0, 5, 0);
    scene.add(topLight);
    
    const fillLight = new THREE.DirectionalLight(0x8888ff, 1);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // Glow intensity tracker
    const glowIntensity = { value: 0 };

    // Initialize state
    sceneRef.current = {
      scene,
      camera,
      renderer,
      lamp: null,
      genie: null,
      isOut: false,
      animating: false,
      animationId: null,
      glowIntensity
    };

    // Setup loaders
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Load lamp
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      
      // Auto-fit lamp to reasonable size
      const box = new THREE.Box3().setFromObject(lamp);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? 1.5 / maxDim : 1;
      lamp.scale.setScalar(scale);
      
      // Center lamp and rotate to face camera
      const center = box.getCenter(new THREE.Vector3());
      lamp.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      lamp.rotation.set(0, Math.PI, 0); // Face front

      scene.add(lamp);
      sceneRef.current.lamp = lamp;
      
      console.log('Lamp loaded, size:', size, 'scale:', scale);

      // Load genie after lamp
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current) return;
        
        const genie = genieGltf.scene;
        
        // Auto-fit genie
        const genieBox = new THREE.Box3().setFromObject(genie);
        const genieSize = genieBox.getSize(new THREE.Vector3());
        const genieMaxDim = Math.max(genieSize.x, genieSize.y, genieSize.z);
        const genieScale = genieMaxDim > 0 ? 1.2 / genieMaxDim : 1;
        
        // Start hidden inside lamp (scale 0, position at lamp top)
        genie.scale.set(0, 0, 0);
        genie.position.set(0, 0.3, 0); // Start at lamp opening
        genie.rotation.set(0, Math.PI, 0); // Face front like lamp
        
        // Store target scale
        genie.userData.targetScale = genieScale;
        genie.userData.startY = 0.3;
        genie.userData.emergeY = 1.8; // Where genie floats when out

        // Apply glowing material to genie
        genie.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            const glowMat = new THREE.MeshStandardMaterial({
              color: mat?.color?.clone() || new THREE.Color(0x6699ff),
              emissive: new THREE.Color(0x3366ff),
              emissiveIntensity: 0,
              metalness: 0.2,
              roughness: 0.6,
              transparent: true,
              opacity: 1
            });
            mesh.material = glowMat;
            mesh.userData.glowMaterial = glowMat;
          }
        });

        scene.add(genie);
        sceneRef.current.genie = genie;
        
        console.log('Genie loaded, scale:', genieScale);
      });
    });

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);
      
      const { genie, isOut, glowIntensity } = sceneRef.current;
      
      // Update glow on genie materials
      if (genie) {
        genie.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).userData.glowMaterial as THREE.MeshStandardMaterial;
            if (mat) {
              mat.emissiveIntensity = glowIntensity.value;
            }
          }
        });
        
        // Gentle floating when genie is out
        if (isOut && genie.scale.x > 0.5) {
          genie.position.y += Math.sin(Date.now() * 0.002) * 0.0005;
        }
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Click handler - cinematic emerge/return
    const handleClick = () => {
      if (!sceneRef.current) return;
      const { genie, isOut, animating, glowIntensity } = sceneRef.current;
      
      if (animating || !genie) return;
      sceneRef.current.animating = true;

      const targetScale = genie.userData.targetScale || 1;
      const startY = genie.userData.startY || 0.3;
      const emergeY = genie.userData.emergeY || 1.8;

      if (!isOut) {
        // EMERGE: Genie slowly rises out of lamp like a movie
        console.log('Genie emerging...');
        
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = true;
            }
          }
        });

        // First: slight glow appears
        tl.to(glowIntensity, {
          value: 0.5,
          duration: 0.5,
          ease: 'power1.out'
        }, 0);

        // Scale up from 0 to full size (emerge effect)
        tl.to(genie.scale, {
          x: targetScale,
          y: targetScale,
          z: targetScale,
          duration: 2.5,
          ease: 'power2.out'
        }, 0.3);

        // Rise up from lamp opening to floating position
        tl.to(genie.position, {
          y: emergeY,
          duration: 2.5,
          ease: 'power2.out'
        }, 0.3);

        // Intensify glow as genie rises
        tl.to(glowIntensity, {
          value: 1.2,
          duration: 2,
          ease: 'power2.out'
        }, 0.5);

        // Settle to a softer glow
        tl.to(glowIntensity, {
          value: 0.6,
          duration: 0.5,
          ease: 'power1.inOut'
        }, 2.5);

      } else {
        // RETURN: Genie slowly descends back into lamp
        console.log('Genie returning...');
        
        const tl = gsap.timeline({
          onComplete: () => {
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = false;
            }
          }
        });

        // Glow pulses before returning
        tl.to(glowIntensity, {
          value: 1.5,
          duration: 0.3,
          ease: 'power1.out'
        }, 0);

        // Descend back to lamp
        tl.to(genie.position, {
          y: startY,
          duration: 2,
          ease: 'power2.in'
        }, 0.3);

        // Shrink as going into lamp
        tl.to(genie.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 2,
          ease: 'power2.in'
        }, 0.3);

        // Fade glow
        tl.to(glowIntensity, {
          value: 0,
          duration: 1.5,
          ease: 'power2.in'
        }, 0.5);
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
