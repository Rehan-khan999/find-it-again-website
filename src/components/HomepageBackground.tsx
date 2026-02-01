import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  maxOpacity: number;
  twinkleSpeed: number;
  speed: number;
}

export const HomepageBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    // Only run galaxy animation in dark mode
    if (!isDark) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    const stars: Star[] = [];

    const createStars = () => {
      stars.length = 0;
      // Higher density for galaxy effect
      const starCount = Math.floor((canvas.width * canvas.height) / 4000);
      
      for (let i = 0; i < starCount; i++) {
        const isBright = Math.random() < 0.1; // 10% are brighter stars
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: isBright ? Math.random() * 2.5 + 1.5 : Math.random() * 1.2 + 0.3,
          opacity: Math.random() * 0.5 + 0.3,
          maxOpacity: isBright ? 0.9 : Math.random() * 0.7 + 0.3,
          twinkleSpeed: Math.random() * 0.015 + 0.005,
          speed: (Math.random() * 0.15 + 0.05) * 0.2, // starSpeed = 0.2
        });
      }
    };
    createStars();

    let animationFrame: number;
    const twinkleDirection: number[] = stars.map(() => (Math.random() > 0.5 ? 1 : -1));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star, i) => {
        // Slow drift movement
        star.y += star.speed;
        star.x += star.speed * 0.3;
        
        // Wrap around screen
        if (star.y > canvas.height + 10) {
          star.y = -10;
          star.x = Math.random() * canvas.width;
        }
        if (star.x > canvas.width + 10) {
          star.x = -10;
        }

        // Twinkle effect with brightness variation
        star.opacity += twinkleDirection[i] * star.twinkleSpeed;
        if (star.opacity >= star.maxOpacity) {
          star.opacity = star.maxOpacity;
          twinkleDirection[i] = -1;
        } else if (star.opacity <= 0.15) {
          star.opacity = 0.15;
          twinkleDirection[i] = 1;
        }

        // Draw star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.7})`;
        ctx.fill();

        // Draw glow effect for stars
        if (star.radius > 0.8) {
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.radius * 4
          );
          gradient.addColorStop(0, `rgba(255, 250, 240, ${star.opacity * 0.5})`);
          gradient.addColorStop(0.3, `rgba(255, 255, 255, ${star.opacity * 0.2})`);
          gradient.addColorStop(1, 'transparent');
          
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 4, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Extra bright glow for the brightest stars
        if (star.radius > 2) {
          const outerGlow = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.radius * 8
          );
          outerGlow.addColorStop(0, `rgba(255, 255, 240, ${star.opacity * 0.3})`);
          outerGlow.addColorStop(0.5, `rgba(255, 255, 255, ${star.opacity * 0.1})`);
          outerGlow.addColorStop(1, 'transparent');
          
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 8, 0, Math.PI * 2);
          ctx.fillStyle = outerGlow;
          ctx.fill();
        }
      });

      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isDark]);

  // Light mode: CSS gradient background
  if (!isDark) {
    return (
      <div
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{
          zIndex: 0,
          background: `
            linear-gradient(
              135deg,
              hsl(0, 0%, 100%) 0%,
              hsl(180, 60%, 95%) 25%,
              hsl(180, 70%, 85%) 50%,
              hsl(175, 60%, 70%) 75%,
              hsl(170, 55%, 55%) 100%
            )
          `,
        }}
        aria-hidden="true"
      />
    );
  }

  // Dark mode: Canvas with galaxy stars
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ 
        zIndex: 0,
        background: 'linear-gradient(to bottom, hsl(240, 20%, 3%), hsl(240, 25%, 8%), hsl(240, 20%, 5%))'
      }}
      aria-hidden="true"
    />
  );
};
