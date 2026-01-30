
# Fix Three.js Lamp Viewing Angle

## Problem Diagnosis
The lamp model displays at an awkward/bad viewing angle despite hard-setting camera and rotation values. This happens because:

1. **Model's native orientation doesn't match expectations** - The GLB was likely exported with a different "front" direction
2. **Single-axis rotation (Y only) isn't enough** - The model may need multi-axis rotation adjustment
3. **Bounding-box centering may shift the intended view point**

## Solution Overview
Implement a **multi-step rotation calibration** approach with adjustable values for precise control over the lamp's orientation.

---

## Technical Implementation

### Step 1: Add rotation controls for all three axes
Instead of only rotating on Y-axis, test combinations of X, Y, Z rotations:

```text
Current:  lamp.rotation.set(0, Math.PI, 0)
Test values:
  - Y rotation: 0, π/4, π/2, 3π/4, π, -π/2
  - X rotation: 0, -0.2, -0.4 (slight tilt adjustments)
  - Z rotation: 0 (usually stays 0)
```

### Step 2: Lower the camera's lookAt target
Move the `lookAt` point lower to frame the lamp better:

```text
Current:  camera.lookAt(0, 0.5, 0)
New:      camera.lookAt(0, 0.3, 0) or camera.lookAt(0, 0, 0)
```

### Step 3: Pull camera back slightly for wider framing
Increase Z distance for better perspective:

```text
Current:  camera.position.set(0, 1.2, 3)
New:      camera.position.set(0, 1.0, 4)
```

### Step 4: Disable auto-rotation from bounding box centering
The current code centers the model, but doesn't reset rotation before applying the hard-set. Need to ensure lamp rotation happens AFTER scale/position operations.

### Step 5: Add explicit front-facing rotation discovery
Add console logging to help identify which rotation value produces the desired front view:

```javascript
// Try each rotation and check visually
const rotationOptions = [0, Math.PI/4, Math.PI/2, Math.PI, -Math.PI/2];
lamp.rotation.y = rotationOptions[0]; // Change index to test
console.log("Testing Y rotation:", lamp.rotation.y);
```

---

## Changes to ThreeCanvas.tsx

| Line | Change |
|------|--------|
| 37-38 | Update camera position to `(0, 1.0, 4)` and lookAt to `(0, 0.3, 0)` |
| 90-91 | Set lamp position to `(0, -0.3, 0)` to lower it in frame |
| 91 | Test lamp Y rotation values: `0`, `Math.PI/2`, `-Math.PI/2`, `Math.PI` |
| 91 | Add small X rotation if lamp appears tilted: `lamp.rotation.x = -0.1` |

---

## Recommended Final Values (to test)

```javascript
// Camera - wider, lower angle
camera.position.set(0, 1.0, 4);
camera.lookAt(0, 0.2, 0);

// Lamp - centered and front-facing
lamp.position.set(0, -0.2, 0);
lamp.rotation.set(-0.1, Math.PI / 2, 0); // Test with π/2 first
```

---

## Expected Result
A front-facing, cinematically framed lamp that:
- Sits centered in the viewport
- Shows the "front" of the lamp (spout facing viewer or classic Aladdin pose)
- Has proper perspective with slight camera elevation
- Allows clear visibility of lid opening and genie emergence
