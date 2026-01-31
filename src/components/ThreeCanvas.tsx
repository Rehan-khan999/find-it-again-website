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
  HAND_POSITION: 'genie-hand-position',
};

export interface GenieState {
  isOut: boolean;
  isAnimating: boolean;
  currentGesture: string | null;
}

// Create spiral helix emergence path
const createSpiralPath = (radius: number, height: number, turns: number, segments: number): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * turns * Math.PI * 2;
    const y = t * height;
    const x = Math.sin(angle) * radius * (1 - t * 0.3); // Decreasing radius spiral
    const z = Math.cos(angle) * radius * (1 - t * 0.3);
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
};

// Particle system for magical effects
class MagicParticles {
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private velocities: Float32Array;
  private lifetimes: Float32Array;
  private particleCount = 100;
  private isActive = false;

  constructor(parent: THREE.Object3D) {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.lifetimes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.03;
      this.velocities[i * 3 + 1] = Math.random() * 0.05 + 0.02;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
      this.lifetimes[i] = 0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create glowing star texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(100, 180, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(80, 160, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(50, 130, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(30, 100, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.06,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    parent.add(this.particles);
  }

  emerge(duration: number) {
    this.isActive = true;
    gsap.to(this.material, {
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out',
    });
    
    // Reset particles for emergence
    const positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.15;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.random() * 0.1;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      this.lifetimes[i] = Math.random() * duration;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  fadeOut() {
    gsap.to(this.material, {
      opacity: 0,
      duration: 1.5,
      ease: 'power2.in',
      onComplete: () => {
        this.isActive = false;
      },
    });
  }

  update(delta: number, time: number) {
    if (!this.isActive) return;

    const positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] += this.velocities[i * 3];
      positions[i * 3 + 1] += this.velocities[i * 3 + 1];
      positions[i * 3 + 2] += this.velocities[i * 3 + 2];

      // Spiral upward motion
      const angle = time * 3 + i * 0.15;
      positions[i * 3] += Math.sin(angle) * 0.003;
      positions[i * 3 + 2] += Math.cos(angle) * 0.003;

      this.lifetimes[i] -= delta;
      if (this.lifetimes[i] <= 0) {
        const resetAngle = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.1;
        positions[i * 3] = Math.cos(resetAngle) * r;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(resetAngle) * r;
        this.lifetimes[i] = 1.5 + Math.random() * 2;
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
  private spriteCount = 8;
  private sprites: THREE.Sprite[] = [];
  private angles: number[] = [];

  constructor(parent: THREE.Object3D) {
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
      sprite.scale.set(0.08, 0.08, 0.08);
      this.sprites.push(sprite);
      this.angles.push((i / this.spriteCount) * Math.PI * 2);
      this.stars.add(sprite);
    }

    parent.add(this.stars);
  }

  setPosition(x: number, y: number, z: number) {
    this.stars.position.set(x, y, z);
  }

  show() {
    this.sprites.forEach((sprite, i) => {
      gsap.to(sprite.material, {
        opacity: 0.9,
        duration: 0.4,
        delay: i * 0.05,
      });
    });
  }

  hide() {
    this.sprites.forEach((sprite) => {
      gsap.to(sprite.material, {
        opacity: 0,
        duration: 0.6,
      });
    });
  }

  update(time: number) {
    const radius = 0.4;
    const speed = 0.6;
    
    this.sprites.forEach((sprite, i) => {
      const angle = this.angles[i] + time * speed;
      sprite.position.x = Math.cos(angle) * radius;
      sprite.position.y = Math.sin(time * 2.5 + i) * 0.08;
      sprite.position.z = Math.sin(angle) * radius;
      
      // Pulsing scale
      const scale = 0.06 + Math.sin(time * 3.5 + i) * 0.02;
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
  private baseRotationY = 0;
  private chatRotationY = 0;

  setGenie(genie: THREE.Group) {
    this.genie = genie;
  }

  setBaseRotation(y: number) {
    this.baseRotationY = y;
    this.chatRotationY = y - (15 * Math.PI / 180); // Additional -15 degrees when chat opens
  }

  // Play emergence gesture sequence: wave + grin
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

    // Friendly wave (side-to-side rotation)
    this.timeline
      .to(this.genie.rotation, {
        z: 0.12,
        duration: 0.25,
        ease: 'power2.out',
      })
      .to(this.genie.rotation, {
        z: -0.12,
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
        duration: 0.25,
        ease: 'power2.out',
      })
      // Big grin (head tilt forward)
      .to(this.genie.rotation, {
        x: -0.12,
        duration: 0.35,
        ease: 'back.out(2)',
      }, '+=0.15')
      .to(this.genie.rotation, {
        x: 0,
        duration: 0.25,
        ease: 'power2.out',
      });
  }

  // Rotate to chat position (additional -15 degrees)
  rotateToChatPosition(onComplete?: () => void) {
    if (!this.genie) return;

    gsap.to(this.genie.rotation, {
      y: this.chatRotationY - this.baseRotationY, // Local rotation offset
      duration: 0.5,
      ease: 'power2.out',
      onComplete,
    });
  }

  // Rotate back from chat
  rotateFromChatPosition() {
    if (!this.genie) return;

    gsap.to(this.genie.rotation, {
      y: 0, // Back to base rotation
      duration: 0.4,
      ease: 'power2.out',
    });
  }

  // Micro-animations for chat responses
  playReaction(type: 'nod' | 'thumbsUp' | 'sparkle' | 'wink' | 'blink') {
    if (!this.genie) return;

    // Don't interrupt ongoing gestures completely, but allow reactions
    this.currentGesture = type;
    
    const tl = gsap.timeline({
      onComplete: () => {
        this.currentGesture = null;
        window.dispatchEvent(new CustomEvent(GENIE_EVENTS.REACTION, {
          detail: { type }
        }));
      }
    });

    switch (type) {
      case 'nod':
        tl.to(this.genie.rotation, { x: 0.18, duration: 0.18, ease: 'power2.out' })
          .to(this.genie.rotation, { x: -0.06, duration: 0.12, ease: 'power2.inOut' })
          .to(this.genie.rotation, { x: 0.12, duration: 0.12, ease: 'power2.inOut' })
          .to(this.genie.rotation, { x: 0, duration: 0.18, ease: 'power2.out' });
        break;
      
      case 'thumbsUp':
        tl.to(this.genie.position, { y: '+=0.08', duration: 0.25, ease: 'back.out(2)' })
          .to(this.genie.rotation, { z: 0.08, duration: 0.18, ease: 'power2.out' }, '<')
          .to(this.genie.position, { y: '-=0.08', duration: 0.25, ease: 'power2.out' })
          .to(this.genie.rotation, { z: 0, duration: 0.18, ease: 'power2.out' }, '<');
        break;

      case 'sparkle':
        tl.to(this.genie.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.18, ease: 'power2.out' })
          .to(this.genie.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
        break;

      case 'wink':
        tl.to(this.genie.rotation, { z: 0.06, duration: 0.15, ease: 'power2.out' })
          .to(this.genie.scale, { x: 1.42, y: 1.38, z: 1.4, duration: 0.1, ease: 'power2.out' }, '<')
          .to(this.genie.rotation, { z: 0, duration: 0.25, ease: 'power2.out' })
          .to(this.genie.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.2, ease: 'power2.out' }, '<');
        break;

      case 'blink':
        tl.to(this.genie.scale, { y: 1.35, duration: 0.08, ease: 'power2.out' })
          .to(this.genie.scale, { y: 1.4, duration: 0.1, ease: 'power2.out' });
        break;
    }
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
    lamp: THREE.Group | null;
    genie: THREE.Group | null;
    spoutMarker: THREE.Object3D | null;
    genieLight: THREE.PointLight | null;
    isOut: boolean;
    animating: boolean;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    particles: MagicParticles | null;
    starSprites: StarSprites | null;
    gestures: GestureSystem;
    spiralPath: THREE.CatmullRomCurve3;
    clock: THREE.Clock;
  } | null>(null);

  // Handle genie reactions from chat
  const handleChatReaction = useCallback((event: CustomEvent<{ type: 'nod' | 'thumbsUp' | 'sparkle' | 'wink' | 'blink' }>) => {
    if (sceneRef.current?.isOut && !sceneRef.current.animating) {
      sceneRef.current.gestures.playReaction(event.detail.type);
    }
  }, []);

  // Broadcast genie hand position for chat panel positioning
  const broadcastHandPosition = useCallback((camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, genie: THREE.Group) => {
    // Hand position in local genie space (right hand raised)
    const handLocal = new THREE.Vector3(0.3, 0.5, 0.2);
    const handWorld = handLocal.clone();
    genie.localToWorld(handWorld);
    
    // Project to screen
    const handScreen = handWorld.clone().project(camera);
    const rect = renderer.domElement.getBoundingClientRect();
    
    const screenX = rect.left + (handScreen.x + 1) * rect.width / 2;
    const screenY = rect.top + (-handScreen.y + 1) * rect.height / 2;
    
    window.dispatchEvent(new CustomEvent(GENIE_EVENTS.HAND_POSITION, {
      detail: { x: screenX, y: screenY }
    }));
  }, []);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const scene = new THREE.Scene();
    const clock = new THREE.Clock();

    // Fixed 420x420 canvas
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0.8, 3.5);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(420, 420);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // CRITICAL: Canvas has pointer-events: none to allow scrolling
    renderer.domElement.style.pointerEvents = 'none';
    
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(2, 4, 3);
    scene.add(mainLight);

    // Blue genie glow light (starts off)
    const genieLight = new THREE.PointLight(0x4488ff, 0, 4);
    scene.add(genieLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const gestures = new GestureSystem();

    // Create spiral emergence path: radius 0.25, height 1.2, 1.5 turns
    const spiralPoints = createSpiralPath(0.25, 1.2, 1.5, 50);
    const spiralPath = new THREE.CatmullRomCurve3(spiralPoints);

    sceneRef.current = {
      scene,
      renderer,
      camera,
      lamp: null,
      genie: null,
      spoutMarker: null,
      genieLight,
      isOut: false,
      animating: false,
      raycaster,
      mouse,
      particles: null,
      starSprites: null,
      gestures,
      spiralPath,
      clock,
    };

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // Load lamp and anchor at world position (1.2, -0.9, 0)
    loader.load('/models/lamp.glb', (lampGltf) => {
      if (!sceneRef.current) return;
      
      const lamp = lampGltf.scene;
      
      // Lamp anchored at bottom-right position
      lamp.position.set(1.2, -0.9, 0);
      lamp.scale.set(2.2, 2.2, 2.2);
      lamp.rotation.set(0, 0, 0);
      
      scene.add(lamp);
      sceneRef.current.lamp = lamp;

      // Create spout marker (invisible, used as parent for genie)
      const spoutMarker = new THREE.Object3D();
      spoutMarker.position.set(0.1, 0.35, 0.15); // Position at lamp spout in local space
      lamp.add(spoutMarker);
      sceneRef.current.spoutMarker = spoutMarker;

      // Add particles to spout
      const particles = new MagicParticles(spoutMarker);
      sceneRef.current.particles = particles;

      // Load genie - parented to spout
      loader.load('/models/genie.glb', (genieGltf) => {
        if (!sceneRef.current || !sceneRef.current.spoutMarker) return;
        
        const genie = genieGltf.scene;
        
        // Initial state: hidden
        genie.visible = false;
        genie.scale.set(0, 0, 0);
        genie.position.set(0, 0, 0); // Local to spout marker
        
        // Final facing: -150 degrees Y rotation to face user
        const finalRotationY = -150 * (Math.PI / 180);
        genie.rotation.set(0, finalRotationY, 0);
        
        // Parent genie to spout marker (all movement is now relative to lamp)
        spoutMarker.add(genie);
        sceneRef.current.genie = genie;
        
        gestures.setGenie(genie);
        gestures.setBaseRotation(finalRotationY);

        // Add star sprites around genie
        const starSprites = new StarSprites(genie);
        sceneRef.current.starSprites = starSprites;
      });
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update particle systems
      if (sceneRef.current) {
        sceneRef.current.particles?.update(delta, elapsed);
        sceneRef.current.starSprites?.update(elapsed);

        // Idle floating animation when out
        if (sceneRef.current.isOut && sceneRef.current.genie && !sceneRef.current.animating) {
          const genie = sceneRef.current.genie;
          // Subtle floating
          genie.position.y = -0.4 + 1.1 + Math.sin(elapsed * 1.5) * 0.02;
        }

        // Update genie light position
        if (sceneRef.current.genieLight && sceneRef.current.genie && sceneRef.current.isOut) {
          const worldPos = new THREE.Vector3();
          sceneRef.current.genie.getWorldPosition(worldPos);
          sceneRef.current.genieLight.position.copy(worldPos);
        }

        // Broadcast hand position if chat is open
        if (sceneRef.current.isOut && sceneRef.current.genie) {
          broadcastHandPosition(camera, renderer, sceneRef.current.genie);
        }
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
      sceneRef.current?.particles?.dispose();
      sceneRef.current?.starSprites?.dispose();
      gestures.dispose();
      sceneRef.current = null;
    };
  }, [handleChatReaction, broadcastHandPosition]);

  // Click handler - ONLY on lamp mesh via raycasting
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!sceneRef.current) return;
      const { lamp, genie, spoutMarker, isOut, animating, raycaster, mouse, camera, renderer, spiralPath, particles, starSprites, gestures, genieLight } = sceneRef.current;
      if (!lamp || !genie || !spoutMarker || animating) return;

      // Get canvas bounds
      const rect = renderer.domElement.getBoundingClientRect();
      
      // Check if click is within canvas bounds
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) {
        return;
      }

      // Calculate mouse position relative to canvas
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Only check lamp meshes (exclude genie and its children)
      const lampMeshes: THREE.Object3D[] = [];
      lamp.traverse((child) => {
        if (child.type === 'Mesh') {
          // Exclude genie and children
          let isGenieChild = false;
          let current: THREE.Object3D | null = child;
          while (current) {
            if (current === genie) {
              isGenieChild = true;
              break;
            }
            current = current.parent;
          }
          if (!isGenieChild) {
            lampMeshes.push(child);
          }
        }
      });
      
      const intersects = raycaster.intersectObjects(lampMeshes, false);
      if (intersects.length === 0) return;

      sceneRef.current.animating = true;

      if (!isOut) {
        // ========== EMERGENCE ANIMATION ==========
        genie.visible = true;
        genie.position.set(0, 0, 0);
        genie.scale.set(0, 0, 0);
        
        // Start particles
        particles?.emerge(2.5);
        
        // Final position relative to spout: (-0.4, 1.1, 0.2)
        const finalPos = { x: -0.4, y: 1.1, z: 0.2 };
        
        // Animate genie along spiral path
        const duration = 2.5;
        const progress = { value: 0 };
        
        // Scale up during first half of emergence
        gsap.to(genie.scale, {
          x: 1.4,
          y: 1.4,
          z: 1.4,
          duration: 1.2,
          ease: 'back.out(1.3)',
        });

        // Animate genie light
        if (genieLight) {
          gsap.to(genieLight, {
            intensity: 2.5,
            duration: 1.5,
            ease: 'power2.out',
          });
        }

        // Move along spiral curve path
        gsap.to(progress, {
          value: 1,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            const point = spiralPath.getPoint(progress.value);
            // Blend spiral with final position
            const blend = Math.pow(progress.value, 0.7);
            genie.position.set(
              point.x * (1 - blend) + finalPos.x * blend,
              point.y * (1 - blend) + finalPos.y * blend,
              point.z * (1 - blend) + finalPos.z * blend
            );
          },
          onComplete: () => {
            // Ensure final position
            genie.position.set(finalPos.x, finalPos.y, finalPos.z);
            
            // Show star sprites
            starSprites?.show();
            
            // Play wave + grin sequence
            gestures.playEmergenceSequence(() => {
              // After emergence sequence, rotate to chat position and dispatch event
              gestures.rotateToChatPosition(() => {
                if (sceneRef.current) {
                  sceneRef.current.animating = false;
                  sceneRef.current.isOut = true;
                  
                  // Dispatch emerged event
                  window.dispatchEvent(new CustomEvent(GENIE_EVENTS.EMERGED));
                }
              });
            });
          },
        });
      } else {
        // ========== RETURN ANIMATION ==========
        // Dispatch hidden event first
        window.dispatchEvent(new CustomEvent(GENIE_EVENTS.HIDDEN));
        
        // Hide stars first
        starSprites?.hide();
        
        // Rotate back
        gestures.rotateFromChatPosition();
        
        // Fade genie light
        if (genieLight) {
          gsap.to(genieLight, {
            intensity: 0,
            duration: 2,
            ease: 'power2.in',
          });
        }

        // Current position
        const startPos = { ...genie.position };
        
        // Reverse along spiral curve
        const progress = { value: 1 };
        gsap.to(progress, {
          value: 0,
          duration: 2,
          ease: 'power2.in',
          onUpdate: () => {
            const point = spiralPath.getPoint(progress.value);
            const blend = 1 - progress.value;
            genie.position.set(
              point.x * blend + startPos.x * (1 - blend),
              point.y * blend,
              point.z * blend + startPos.z * (1 - blend)
            );
          },
        });

        // Scale down
        gsap.to(genie.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.5,
          delay: 0.5,
          ease: 'power2.in',
          onComplete: () => {
            genie.visible = false;
            genie.position.set(0, 0, 0);
            particles?.fadeOut();
            if (sceneRef.current) {
              sceneRef.current.animating = false;
              sceneRef.current.isOut = false;
            }
          },
        });
      }
    };

    // Listen on document but filter by canvas bounds (not window to avoid scroll issues)
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <div 
      id="genie-container"
      ref={containerRef} 
      className="fixed z-40"
      style={{ 
        bottom: '20px',
        right: '20px',
        width: '420px',
        height: '420px',
        pointerEvents: 'none', // Allow scrolling through
      }}
    />
  );
};

// Utility function to trigger genie reactions from outside
export const triggerGenieReaction = (type: 'nod' | 'thumbsUp' | 'sparkle' | 'wink' | 'blink') => {
  window.dispatchEvent(new CustomEvent('genie-react', { detail: { type } }));
};
