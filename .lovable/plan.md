
# Hard-Set Three.js Scene Values - Remove All Auto-Calculations

## Overview
Remove all auto-centering, auto-scaling, and bounding-box calculations from the Three.js scene. Replace with explicit hard-coded values for camera, lamp, and genie positioning/rotation.

## Changes Summary

### 1. Camera Configuration
**Current:** `position(0, 1.0, 4)`, `lookAt(0, 0.2, 0)`  
**New:** `position(0, 2, 4)`, `lookAt(0, 1, 0)`

### 2. Lamp Configuration
**Remove:** Bounding box calculation (lines 84-88)  
**Set explicitly:**
- `rotation = (-Math.PI/2, Math.PI, 0)`
- `position = (0, 0, 0)`
- `scale = (1, 1, 1)`

### 3. Genie Configuration
**Remove:** Auto-scale calculation using bounding box (lines 132-136)  
**Set explicitly:**
- `rotation = (-Math.PI/2, Math.PI, 0)`
- `initial position = (0, -0.6, 0)`
- `scale = (0, 0, 0)` initially, target `(1, 1, 1)`

### 4. Animation Updates
- **Emerge:** Move genie to `(0, 1.8, 0.6)` over 2.5s
- **Return:** Move genie to `(0, -0.6, 0)` over 2s

---

## Technical Details

### Lines to Modify in ThreeCanvas.tsx

| Lines | Action |
|-------|--------|
| 37-39 | Update camera position and lookAt |
| 84-88 | **Delete** - Remove bounding box auto-scaling for lamp |
| 92-95 | Replace with hard-set lamp values |
| 127-128 | Update genie rotation |
| 132-136 | **Delete** - Remove bounding box auto-scaling for genie |
| 137-144 | Replace with hard-set genie initial values |
| 199-213 | Update emerge animation target position |
| 227-232 | Update return animation target position |

### Final Code Structure

**Camera setup:**
```javascript
camera.position.set(0, 2, 4);
camera.lookAt(0, 1, 0);
```

**Lamp loading (no auto-fit):**
```javascript
const lamp = lampGltf.scene;
lamp.scale.set(1, 1, 1);
lamp.position.set(0, 0, 0);
lamp.rotation.set(-Math.PI/2, Math.PI, 0);
scene.add(lamp);
```

**Genie loading (no auto-fit):**
```javascript
const genie = genieGltf.scene;
genie.rotation.set(-Math.PI/2, Math.PI, 0);
genie.scale.set(0, 0, 0);  // Hidden initially
genie.position.set(0, -0.6, 0);
genie.userData.targetScale = 1;
genie.userData.emergePosition = { x: 0, y: 1.8, z: 0.6 };
genie.userData.startPosition = { x: 0, y: -0.6, z: 0 };
lamp.add(genie);
```

**Emerge animation:**
```javascript
tl.to(genie.position, {
  x: 0, y: 1.8, z: 0.6,
  duration: 2.5,
  ease: 'power3.out'
}, 0.8);
```

**Return animation:**
```javascript
tl.to(genie.position, {
  x: 0, y: -0.6, z: 0,
  duration: 2,
  ease: 'power3.in'
}, 0);
```

---

## Expected Result
- Camera positioned at eye level, looking down at the scene center
- Lamp at world origin with fixed scale and rotation
- Genie starts hidden inside lamp (-0.6 on Y axis)
- On click: genie rises to (0, 1.8, 0.6) - clearly above and slightly forward
- On second click: genie returns to start position over 2 seconds
- No automatic calculations - all values are explicit constants
