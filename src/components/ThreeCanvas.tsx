import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';

// Event to communicate with chat overlay
export const GENIE_EVENTS = {
  EMERGED: 'genie-emerged',
  HIDDEN: 'genie-hidden',
  GESTURE_COMPLETE: 'genie-gesture-complete',
  REACTION: 'genie-reaction',
};

export interface GenieState {
  isOut: boolean;
  isAnimating: boolean;
  currentGesture: string | null;
}

// Create emergence curve path
const createEmergenceCurve = () => {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.15, 0.4, 0.08),
    new THREE.Vector3(0.25, 0.8, 0.12),
    new THREE.Vector3(0.3, 1.1, 0.1),
  ]);
};

// Particle system for magical effects
class MagicParticles {
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private velocities: Float32Array;
  private lifetimes: Float32Array;
  private particleCount = 80;
  private isActive = false;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.lifetimes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 1] = Math.random() * 0.03;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      this.lifetimes[i] = 0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create star texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(100, 200, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(50, 150, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 100, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    scene.add(this.particles);
  }

  setPosition(x: number, y: number, z: number) {
    this.particles.position.set(x, y, z);
  }

  emerge(duration: number) {
    this.isActive = true;
    gsap.to(this.material, {
      opacity: 0.9,
      duration: 0.5,
      ease: 'power2.out',
    });
    
    // Reset particles for emergence
    const positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = Math.random() * 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      this.lifetimes[i] = Math.random() * duration;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  fadeOut() {
    gsap.to(this.material, {
      opacity: 0,
      duration: 1,
      ease: 'power2.in',
      onComplete: () => {
        this.isActive = false;
      },
    });
  }

  update(delta: number) {
    if (!this.isActive) return;

    const positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] += this.velocities[i * 3];
      positions[i * 3 + 1] += this.velocities[i * 3 + 1];
      positions[i * 3 + 2] += this.velocities[i * 3 + 2];

      // Spiral motion
      const angle = delta * 2 + i * 0.1;
      positions[i * 3] += Math.sin(angle) * 0.002;
      positions[i * 3 + 2] += Math.cos(angle) * 0.002;

      this.lifetimes[i] -= delta;
      if (this.lifetimes[i] <= 0) {
        // Reset particle
        positions[i * 3] = (Math.random() - 0.5) * 0.3;
        positions[i * 3 + 1] = Math.random() * 0.2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
        this.lifetimes[i] = 2 + Math.random() * 2;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// Star sprites that rotate around genie
class StarSprites {
  private stars: THREE.Group;
  private spriteCount = 6;
  private sprites: THREE.Sprite[] = [];
  private angles: number[] = [];

  constructor(scene: THREE.Scene) {
    this.stars = new THREE.Group();
    
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    // Draw 4-point star
    ctx.fillStyle = 'rgba(150, 220, 255, 1)';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(18, 14);
    ctx.lineTo(32, 16);
    ctx.lineTo(18, 18);
    ctx.lineTo(16, 32);
    ctx.lineTo(14, 18);
    ctx.lineTo(0, 16);
    ctx.lineTo(14, 14);
    ctx.closePath();
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas);

    for (let i = 0; i < this.spriteCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.1, 0.1, 0.1);
      this.sprites.push(sprite);
      this.angles.push((i / this.spriteCount) * Math.PI * 2);
      this.stars.add(sprite);
    }

    scene.add(this.stars);
  }

  setPosition(x: number, y: number, z: number) {
    this.stars.position.set(x, y, z);
  }

  show() {
    this.sprites.forEach((sprite, i) => {
      gsap.to(sprite.material, {
        opacity: 0.8,
        duration: 0.3,
        delay: i * 0.05,
      });
    });
  }

  hide() {
    this.sprites.forEach((sprite) => {
      gsap.to(sprite.material, {
        opacity: 0,
        duration: 0.5,
      });
    });
  }

  update(time: number) {
    const radius = 0.5;
    const speed = 0.5;
    
    this.sprites.forEach((sprite, i) => {
      const angle = this.angles[i] + time * speed;
      sprite.position.x = Math.cos(angle) * radius;
      sprite.position.y = Math.sin(time * 2 + i) * 0.1 + 0.3;
      sprite.position.z = Math.sin(angle) * radius;
      
      // Pulsing scale
      const scale = 0.08 + Math.sin(time * 3 + i) * 0.02;
      sprite.scale.set(scale, scale, scale);
    });
  }

  dispose() {
    this.sprites.forEach((sprite) => sprite.material.dispose());
  }
}

// Gesture system with GSAP timeline
class GestureSystem {
  private genie: THREE.Group | null = null;
  private timeline: gsap.core.Timeline | null = null;
  private currentGesture: string | null = null;

  setGenie(genie: THREE.Group) {
    this.genie = genie;
  }

  // Play emergence gesture sequence
  playEmergenceSequence(onComplete?: () => void) {
    if (!this.genie) return;

    this.currentGesture = 'emergence';
    this.timeline = gsap.timeline({
      onComplete: () => {
        this.currentGesture = null;
        window.dispatchEvent(new CustomEvent(GENIE_EVENTS.GESTURE_COMPLETE, {
          detail: { gesture: 'emergence' }
        }));
        onComplete?.();
      }
    });

    // Friendly wave (simulate with rotation)
    this.timeline
      .to(this.genie.rotation, {
        z: 0.1,
        duration: 0.3,
        ease: 'power2.out',
      })
      .to(this.genie.rotation, {
        z: -0.1,
        duration: 0.2,
        ease: 'power2.inOut',
      })
      .to(this.genie.rotation, {
        z: 0.1,
        duration: 0.2,
        ease: 'power2.inOut',
      })
      .to(this.genie.rotation, {
        z: 0,
        duration: 0.3,
        ease: 'power2.out',
      })
      // Head tilt (big grin)
      .to(this.genie.rotation, {
        x: -0.1,
        duration: 0.4,
        ease: 'back.out(2)',
      }, '+=0.2')
      .to(this.genie.rotation, {
        x: 0,
        duration: 0.3,
        ease: 'power2.out',
      })
      // Subtle bob (rub hands simulation)
      .to(this.genie.position, {
        y: '+=0.05',
        duration: 0.2,
        yoyo: true,
        repeat: 3,
        ease: 'power1.inOut',
      })
      // Point right (lean right)
      .to(this.genie.rotation, {
        z: -0.15,
        y: 0.2,
        duration: 0.4,
        ease: 'power2.out',
      });
  }

  // Play reaction gestures
  playReaction(type: 'nod' | 'thumbsUp' | 'sparkle' | 'wink') {
    if (!this.genie) return;

    if (this.timeline) {
      this.timeline.kill();
    }

    this.currentGesture = type;
    this.timeline = gsap.timeline({
      onComplete: () => {
        this.currentGesture = null;
        window.dispatchEvent(new CustomEvent(GENIE_EVENTS.REACTION, {
          detail: { type }
        }));
      }
    });

    switch (type) {
      case 'nod':
        this.timeline
          .to(this.genie.rotation, { x: 0.15, duration: 0.2, ease: 'power2.out' })
          .to(this.genie.rotation, { x: -0.05, duration: 0.15, ease: 'power2.inOut' })
          .to(this.genie.rotation, { x: 0.1, duration: 0.15, ease: 'power2.inOut' })
          .to(this.genie.rotation, { x: 0, duration: 0.2, ease: 'power2.out' });
        break;
      
      case 'thumbsUp':
        this.timeline
          .to(this.genie.position, { y: '+=0.1', duration: 0.3, ease: 'back.out(2)' })
          .to(this.genie.rotation, { z: 0.1, duration: 0.2, ease: 'power2.out' }, '<')
          .to(this.genie.position, { y: '-=0.1', duration: 0.3, ease: 'power2.out' })
          .to(this.genie.rotation, { z: 0, duration: 0.2, ease: 'power2.out' }, '<');
        break;

      case 'sparkle':
        this.timeline
          .to(this.genie.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.2, ease: 'power2.out' })
          .to(this.genie.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
        break;

      case 'wink':
        this.timeline
          .to(this.genie.rotation, { y: 0.1, z: 0.05, duration: 0.2, ease: 'power2.out' })
          .to(this.genie.rotation, { y: 0, z: 0, duration: 0.3, ease: 'power2.out' });
        break;
    }
  }

  // Reset to default pointing pose
  resetToPointing() {
    if (!this.genie) return;
    
    gsap.to(this.genie.rotation, {
      x: 0,
      z: -0.15,
      y: 0.2,
      duration: 0.5,
      ease: 'power2.out',
    });
  }

  getCurrentGesture() {
    return this.currentGesture;
  }

  dispose() {
    if (this.timeline) {
      this.timeline.kill();
    }
  }
}

export const ThreeCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    genieRig: THREE.Group | null;
    lamp: THREE.Group | null;
    genie: THREE.Group | null;
    genieLight: THREE.PointLight | null;
    isOut: boolean;
    animating: boolean;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    particles: MagicParticles | null;
    starSprites: StarSprites | null;
    gestures: GestureSystem;
    emergenceCurve: THREE.CatmullRomCurve3;
    clock: THREE.Clock;
  } | null>(null);

  // Handle genie reactions from chat
  const handleChatReaction = useCallback((event: CustomEvent<{ type: 'nod' | 'thumbsUp' | 'sparkle' | 'wink' }>) => {
    if (sceneRef.current?.isOut && !sceneRef.current.animating) {
      sceneRef.current.gestures.playReaction(event.detail.type);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const scene = new THREE.Scene();
    const clock = new THREE.Clock();

    // Fixed 420x420 canvas
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0.5, 4);
    camera.lookAt(0, 0.3, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(420, 420);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    // Blue genie glow light (starts off)
    const genieLight = new THREE.PointLight(0x4488ff, 0, 3);
    genieLight.position.set(0, 0.5, 0);
    scene.add(genieLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const emergenceCurve = createEmergenceCurve();
    const gestures = new GestureSystem();

    // Particle systems
    const particles = new MagicParticles(scene);
    const starSprites = new StarSprites(scene);

    sceneRef.current = {
      scene,
      renderer,
      camera,
      genieRig: null,
      lamp: null,
      genie: null,
      genieLight,
      isOut: false,
      animating: false,
      raycaster,
      mouse,
      particles,
      starSprites,
      gestures,
      emergenceCurve,
      clock,
    };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Create parent rig group
    const genieRig = new THREE.Group();
    genieRig.position.set(0, -0.8, 0);
    genieRig.rotation.y = -Math.PI / 6; // 30 degrees right
    scene.add(genieRig);
    sceneRef.current.genieRig = genieRig;

    // Load lamp
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      lamp.position.set(0, 0, 0);
      lamp.scale.set(2.5, 2.5, 2.5);
      lamp.rotation.set(0, 0, 0);
      
      genieRig.add(lamp);
      sceneRef.current.lamp = lamp;

      // Load genie
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current || !sceneRef.current.lamp) return;
        
        const genie = genieGltf.scene;
        genie.rotation.set(0, 0, 0);
        genie.scale.set(0, 0, 0); // Start hidden
        genie.position.set(0.25, 0, 0.3); // Start at spout
        
        genieRig.add(genie);
        sceneRef.current.genie = genie;
        sceneRef.current.gestures.setGenie(genie);
        
        // Position particle systems at spout
        particles.setPosition(0.25, 0, 0.3);
        starSprites.setPosition(0.25, 0.5, 0.3);
      });
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update particle systems
      if (sceneRef.current) {
        sceneRef.current.particles?.update(delta);
        sceneRef.current.starSprites?.update(elapsed);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Listen for chat reactions
    window.addEventListener('genie-react' as any, handleChatReaction);

    return () => {
      window.removeEventListener('genie-react' as any, handleChatReaction);
      renderer.dispose();
      dracoLoader.dispose();
      particles.dispose();
      starSprites.dispose();
      gestures.dispose();
      sceneRef.current = null;
    };
  }, [handleChatReaction]);

  // Separate click handler setup - only on canvas element
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleCanvasClick = (event: MouseEvent) => {
      if (!sceneRef.current) return;
      const { lamp, genie, isOut, animating, raycaster, mouse, camera, emergenceCurve, particles, starSprites, gestures, genieLight } = sceneRef.current;
      if (!lamp || !genie || animating) return;

      // Get canvas bounds
      const rect = container.getBoundingClientRect();
      
      // Check if click is within canvas
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) {
        return;
      }

      // Calculate mouse position relative to canvas
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Only check lamp meshes (not genie)
      const lampMeshes: THREE.Object3D[] = [];
      lamp.traverse((child) => {
        if (child !== genie && !genie.children.includes(child)) {
          lampMeshes.push(child);
        }
      });
      
      const intersects = raycaster.intersectObjects(lampMeshes, true);
      if (intersects.length === 0) return;

      sceneRef.current.animating = true;

      if (!isOut) {
        // EMERGENCE ANIMATION
        // Start particles
        particles?.emerge(2.5);
        
        // Animate genie along curve
        const duration = 2.5;
        const progress = { value: 0 };
        
        // First scale up
        gsap.to(genie.scale, {
          x: 1.4,
          y: 1.4,
          z: 1.4,
          duration: 0.8,
          ease: 'back.out(1.5)',
        });

        // Animate genie light
        if (genieLight) {
          gsap.to(genieLight, {
            intensity: 2,
            duration: 1,
            ease: 'power2.out',
          });
        }

        // Move along curve path
        gsap.to(progress, {
          value: 1,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            const point = emergenceCurve.getPoint(progress.value);
            genie.position.set(
              0.25 + point.x,
              point.y,
              0.3 + point.z
            );
            // Update particle position to follow
            particles?.setPosition(0.25 + point.x, point.y, 0.3 + point.z);
            starSprites?.setPosition(0.25 + point.x, point.y + 0.3, 0.3 + point.z);
          },
          onComplete: () => {
            // Show star sprites
            starSprites?.show();
            
            // Play gesture sequence
            gestures.playEmergenceSequence(() => {
              if (sceneRef.current) {
                sceneRef.current.animating = false;
                sceneRef.current.isOut = true;
                
                // Dispatch emerged event
                window.dispatchEvent(new CustomEvent(GENIE_EVENTS.EMERGED));
              }
            });
          },
        });
      } else {
        // RETURN ANIMATION
        // Hide stars first
        starSprites?.hide();
        
        // Fade genie light
        if (genieLight) {
          gsap.to(genieLight, {
            intensity: 0,
            duration: 1.5,
            ease: 'power2.in',
          });
        }

        // Reset rotation
        gsap.to(genie.rotation, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.5,
        });

        // Reverse along curve
        const progress = { value: 1 };
        gsap.to(progress, {
          value: 0,
          duration: 2,
          ease: 'power2.in',
          onUpdate: () => {
            const point = emergenceCurve.getPoint(progress.value);
            genie.position.set(
              0.25 + point.x,
              point.y,
              0.3 + point.z
            );
            particles?.setPosition(0.25 + point.x, point.y, 0.3 + point.z);
          },
        });

        // Scale down
        gsap.to(genie.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.2,
          delay: 0.8,
          ease: 'power2.in',
          onComplete: () => {
            particles?.fadeOut();
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = false;
              
              // Dispatch hidden event
              window.dispatchEvent(new CustomEvent(GENIE_EVENTS.HIDDEN));
            }
          },
        });
      }
    };

    // Only attach to canvas, not window
    container.addEventListener('click', handleCanvasClick);

    return () => {
      container.removeEventListener('click', handleCanvasClick);
    };
  }, []);

  return (
    <div 
      id="genie-container"
      ref={containerRef} 
      className="fixed z-40 cursor-pointer"
      style={{ 
        bottom: '20px',
        right: '20px',
        width: '420px',
        height: '420px',
        pointerEvents: 'auto',
      }}
    />
  );
};

// Utility function to trigger genie reactions from outside
export const triggerGenieReaction = (type: 'nod' | 'thumbsUp' | 'sparkle' | 'wink') => {
  window.dispatchEvent(new CustomEvent('genie-react', { detail: { type } }));
};
