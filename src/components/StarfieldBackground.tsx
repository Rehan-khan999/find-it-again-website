import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  maxOpacity: number;
  twinkleSpeed: number;
  fallSpeed: number;
}

export const StarfieldBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const stars: Star[] = [];

    const createStars = () => {
      const starCount = Math.floor((canvas.width * canvas.height) / 8000);
      
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.2,
          maxOpacity: Math.random() * 0.6 + 0.4,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          fallSpeed: Math.random() * 0.3 + 0.1,
        });
      }
    };
    createStars();

    let animationFrame: number;
    let twinkleDirection: number[] = stars.map(() => 1);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star, i) => {
        // Gentle falling motion
        star.y += star.fallSpeed;
        
        // Reset star when it goes below screen
        if (star.y > canvas.height + 10) {
          star.y = -10;
          star.x = Math.random() * canvas.width;
        }

        // Twinkle effect
        star.opacity += twinkleDirection[i] * star.twinkleSpeed;
        if (star.opacity >= star.maxOpacity || star.opacity <= 0.1) {
          twinkleDirection[i] *= -1;
        }

        // Draw star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();

        // Soft glow for larger stars
        if (star.radius > 1) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.radius * 3
          );
          gradient.addColorStop(0, `rgba(200, 220, 255, ${star.opacity * 0.3})`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};
