import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  opacity: number;
  maxOpacity: number;
  opacityDirection: number;
  layer: number; // Depth layer (0 = far, 2 = close)
  color: string;
}

export const StarfieldBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle colors based on depth
    const colors = [
      { rgb: '147, 197, 253', name: 'blue' },    // Soft blue
      { rgb: '196, 181, 253', name: 'violet' },  // Soft violet
      { rgb: '255, 255, 255', name: 'white' },   // White
    ];

    // Create particles with depth layers
    const particles: Particle[] = [];

    const createParticles = () => {
      // Calculate particle count based on screen size
      const baseCount = Math.floor((canvas.width * canvas.height) / 6000);
      
      // Layer 0: Far away particles (smallest, slowest, most transparent)
      for (let i = 0; i < baseCount * 0.4; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 0.5 + 0.3,
          vx: (Math.random() - 0.5) * 0.05,
          vy: (Math.random() - 0.5) * 0.05,
          opacity: Math.random() * 0.2 + 0.1,
          maxOpacity: 0.3,
          opacityDirection: (Math.random() - 0.5) * 0.003,
          layer: 0,
          color: color.rgb,
        });
      }

      // Layer 1: Mid-distance particles
      for (let i = 0; i < baseCount * 0.4; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1 + 0.5,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          opacity: Math.random() * 0.3 + 0.2,
          maxOpacity: 0.5,
          opacityDirection: (Math.random() - 0.5) * 0.005,
          layer: 1,
          color: color.rgb,
        });
      }

      // Layer 2: Close particles (largest, fastest, brightest)
      for (let i = 0; i < baseCount * 0.2; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.8,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          opacity: Math.random() * 0.4 + 0.3,
          maxOpacity: 0.7,
          opacityDirection: (Math.random() - 0.5) * 0.007,
          layer: 2,
          color: color.rgb,
        });
      }
    };
    createParticles();

    // Animation loop
    let animationFrame: number;
    const animate = () => {
      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0B0F19');
      gradient.addColorStop(0.5, '#151923');
      gradient.addColorStop(1, '#1A1F2B');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sort particles by layer (far to close) for proper depth rendering
      particles.sort((a, b) => a.layer - b.layer);

      // Draw and update particles
      particles.forEach((particle) => {
        // Update position with smooth drifting
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges with smooth transition
        if (particle.x < -50) particle.x = canvas.width + 50;
        if (particle.x > canvas.width + 50) particle.x = -50;
        if (particle.y < -50) particle.y = canvas.height + 50;
        if (particle.y > canvas.height + 50) particle.y = -50;

        // Update opacity for organic twinkling
        particle.opacity += particle.opacityDirection;
        if (particle.opacity <= 0.05 || particle.opacity >= particle.maxOpacity) {
          particle.opacityDirection *= -1;
        }

        // Apply blur based on layer depth
        const blurAmount = particle.layer === 0 ? 2 : particle.layer === 1 ? 1 : 0;
        if (blurAmount > 0) {
          ctx.filter = `blur(${blurAmount}px)`;
        } else {
          ctx.filter = 'none';
        }

        // Draw main particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particle.color}, ${particle.opacity})`;
        ctx.fill();

        // Add soft glow effect for larger/closer particles
        if (particle.layer >= 1 && particle.radius > 0.7) {
          ctx.filter = 'none';
          ctx.beginPath();
          const glowRadius = particle.radius * (particle.layer === 2 ? 4 : 3);
          ctx.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
          
          const glowGradient = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            glowRadius
          );
          
          // Color-specific glow
          const glowOpacity = particle.opacity * 0.15;
          glowGradient.addColorStop(0, `rgba(${particle.color}, ${glowOpacity})`);
          glowGradient.addColorStop(0.5, `rgba(${particle.color}, ${glowOpacity * 0.5})`);
          glowGradient.addColorStop(1, 'transparent');
          
          ctx.fillStyle = glowGradient;
          ctx.fill();
        }
      });

      // Reset filter
      ctx.filter = 'none';

      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ 
        zIndex: 0,
        mixBlendMode: 'screen',
        opacity: 0.8
      }}
    />
  );
};
