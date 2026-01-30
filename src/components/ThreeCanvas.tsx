import { useEffect } from 'react';

export const ThreeCanvas = () => {
  useEffect(() => {
    // The canvas is rendered, main.js will pick it up
    // Dispatch custom event to notify that canvas is ready
    window.dispatchEvent(new CustomEvent('three-canvas-ready'));
  }, []);

  return (
    <canvas
      id="three-canvas"
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};
