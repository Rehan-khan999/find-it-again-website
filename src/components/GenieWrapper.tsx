import { ThreeCanvas } from './ThreeCanvas';
import { GenieChatPanel } from './GenieChatPanel';

/**
 * GenieWrapper - Contains both the 3D genie canvas and the chat panel.
 * The genie canvas overlays the chat panel with higher z-index so only the 
 * genie's head/neck peeks above the chat window.
 */
export const GenieWrapper = () => {
  return (
    <>
      {/* Chat panel - positioned fixed, lower z-index */}
      <GenieChatPanel />
      
      {/* Genie canvas - positioned fixed, higher z-index to peek above chat */}
      <ThreeCanvas />
    </>
  );
};
