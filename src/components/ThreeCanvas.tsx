import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ animationId: number | null }>({ animationId: null });

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('=== THREE.JS INIT ===');

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // Camera - positioned to see origin
    const camera = new THREE.PerspectiveCamera(
      75,
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
    containerRef.current.appendChild(renderer.domElement);

    // STRONG LIGHTS (mandatory for visibility)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Add a reference cube at origin to prove rendering works
    const testCube = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    );
    scene.add(testCube);
    console.log('Green wireframe cube added at origin');

    // Setup loaders with DRACO support
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    
    console.log('Starting lamp.glb load...');
    
    loader.load(
      '/models/lamp.glb',
      (gltf) => {
        console.log('=== LAMP ONLOAD CALLBACK FIRED ===');
        const lamp = gltf.scene;

        // Compute bounding box to understand model size
        const box = new THREE.Box3().setFromObject(lamp);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        console.log('RAW SIZE:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2));
        console.log('RAW CENTER:', center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2));
        
        // Auto-scale to fit in view (target size ~2 units)
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = maxDim > 0 ? 2 / maxDim : 1;
        lamp.scale.setScalar(scaleFactor);
        
        // Re-center after scaling
        lamp.position.set(
          -center.x * scaleFactor,
          -center.y * scaleFactor + 0.5,
          -center.z * scaleFactor
        );
        
        console.log('APPLIED SCALE:', scaleFactor.toFixed(4));

        scene.add(lamp);
        
        // Remove test cube once lamp is loaded
        scene.remove(testCube);
        console.log('Lamp added to scene, test cube removed');
        
        // List all meshes
        lamp.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            console.log('MESH:', child.name || '(unnamed)', 'visible:', child.visible);
          }
        });
      },
      (progress) => {
        if (progress.total > 0) {
          const pct = (progress.loaded / progress.total * 100).toFixed(1);
          console.log('Loading lamp:', pct + '%');
        }
      },
      (error) => {
        console.error('LAMP LOAD ERROR:', error);
      }
    );

    // Animation loop
    const animate = () => {
      sceneRef.current.animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId);
      }
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0"
      style={{ zIndex: 50 }}
      aria-hidden="true"
    />
  );
};
