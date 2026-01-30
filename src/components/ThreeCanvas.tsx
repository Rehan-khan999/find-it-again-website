import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    sceneRef.current = {
      scene, camera, renderer,
      lamp: null, lid: null, genie: null,
      isOpen: false, animationId: null
    };

    const loader = new GLTFLoader();
    
    loader.load('/models/lamp.glb', (gltf) => {
      if (!sceneRef.current) return;
      const lamp = gltf.scene;
      scene.add(lamp);
      sceneRef.current.lamp = lamp;
      sceneRef.current.lid = lamp.getObjectByName('Lid') || null;

      loader.load('/models/genie.glb', (gltf2) => {
        if (!sceneRef.current) return;
        const genie = gltf2.scene;
        genie.scale.set(0, 0, 0);
        genie.position.set(0, -0.6, 0);
        lamp.add(genie);
        sceneRef.current.genie = genie;
      });
    });

    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);
      if (sceneRef.current.genie && sceneRef.current.isOpen) {
        sceneRef.current.genie.position.y += Math.sin(Date.now() * 0.002) * 0.002;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!sceneRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleClick = () => {
      if (!sceneRef.current?.lid || !sceneRef.current?.genie) return;
      const { lid, genie, isOpen } = sceneRef.current;
      
      if (!isOpen) {
        gsap.timeline()
          .to(lid.rotation, { x: -1.2, duration: 0.6, ease: 'power2.out' })
          .to(genie.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.7)' })
          .to(genie.position, { y: 1.5, duration: 1, ease: 'power3.out' });
      } else {
        gsap.timeline()
          .to(genie.position, { y: -0.6, duration: 0.8, ease: 'power2.in' })
          .to(genie.scale, { x: 0, y: 0, z: 0, duration: 0.4, ease: 'power2.in' })
          .to(lid.rotation, { x: 0, duration: 0.6, ease: 'power2.inOut' });
      }
      sceneRef.current.isOpen = !isOpen;
    };
    
    containerRef.current.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current?.animationId) cancelAnimationFrame(sceneRef.current.animationId);
      renderer.dispose();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0"
      style={{ cursor: 'pointer', zIndex: 50 }}
      aria-hidden="true"
    />
  );
};
