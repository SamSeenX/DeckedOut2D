Here is the fully updated technical design document. It incorporates the **Block Registry**, **Smart AI**, **Dynamic Camera**, and **Mouse-Weighted Flashlight** mechanics.

You can save this as `PLAN.md`.

---

# Project Plan: Decked Out 2D (Web Edition)

## 1. Project Overview

A 2D top-down dungeon crawler based on *Decked Out 2*, built with vanilla JavaScript.

* **Core Loop:** Stealth → Dungeon Exploration → Artifact Retrieval → Escape.
* **Key Mechanics:**
* **Fog of War:** Directional "Flashlight" visibility based on mouse cursor.
* **Dynamic Camera:** Follows the player within a viewport.
* **Smart AI:** Enemies patrol zones and chase players based on line-of-sight.
* **Interactive Terrain:** Slow-down mud, damaging lava, healing berries, and enemy-blocking salt.



---

## 2. Core Architecture

### A. The Block Registry (Configuration)

Instead of hardcoding IDs, we use a central definition object.

* **Properties:** `solid` (wall), `speed` (mud), `damage` (lava), `heal` (food), `enemyBlocked` (safe zones).

```javascript
const BLOCK_DEFS = {
    0: { name: "Stone", color: "#222", solid: false },
    1: { name: "Wall", color: "#666", solid: true },
    6: { name: "Salt", color: "#eee", enemyBlocked: true }, // Safe Zone
    7: { name: "Bush (Empty)", color: "#242" },
    8: { name: "Bush (Full)", color: "#f0f", heal: 2 },
    9: { name: "Lava", color: "orange", damage: 1 }
};

```

### B. Global Game State

```javascript
const gameState = {
    clank: 0,        // Noise level
    hazard: 0,       // Difficulty scaling
    running: true,   // Pause/Play
    mapWidth: 50,    // Dimensions
    mapHeight: 50
};

```

### C. The Camera System

We render a subset of the map (Viewport) to fill the canvas.

* **Viewport:** ~20x15 tiles (fits standard monitor aspect ratios).
* **Logic:** Center on player → Clamp to map edges.

---

## 3. Implementation Phases

### Phase 1: Engine & Registry

* [ ] **Setup:** `index.html` + `canvas`.
* [ ] **Input Handling:**
* [ ] `ArrowKeys`: Movement inputs.
* [ ] `MouseMove`: Track cursor position relative to screen center (-1.0 to 1.0).


* [ ] **Physics Engine:**
* [ ] **Collision:** Check `BLOCK_DEFS[id].solid`.
* [ ] **Speed Mod:** Enforce delays for "Slow" blocks (Soul Sand).
* [ ] **Event Triggers:** Check for Damage or Healing after every step.



### Phase 2: Rendering (Camera & Lighting)

* [ ] **Camera Logic:** Calculate `camX` and `camY` to keep player centered but strictly inside map bounds.
* [ ] **Directional Fog (The Flashlight):**
* [ ] Calculate `FocusPoint`: Player Position + (Mouse Offset * Sensitivity).
* [ ] **Raycasting:** Check Line of Sight from Player to Tile.
* [ ] **Brightness:** Calculate distance from Tile to `FocusPoint` (not Player).


* [ ] **Draw Loop:** Iterate only through tiles inside the Camera Viewport.

### Phase 3: The Ecosystem (Dynamic Map)

* [ ] **Berry Growth:**
* [ ] `setInterval` (5s): Randomly convert ID `7` (Empty) to `8` (Full).


* [ ] **Eating:**
* [ ] On step: If tile is `8`, `player.hp += heal`, revert tile to `7`.


* [ ] **Hazards:**
* [ ] On step: If tile has `damage`, subtract HP.
* [ ] **Lethal:** If tile is `void`, trigger Game Over immediately.



### Phase 4: Enemy AI (The Ravager)

* [ ] **Data Structure:**
* [ ] `spawnPoint` (Home), `zoneRadius` (Patrol limit), `state` (ROAM/CHASE).


* [ ] **State Machine:**
* [ ] **Detect:** If `dist(Player, Ravager) < 5`, Switch to **CHASE**.
* [ ] **Leash:** If `dist(Spawn, Ravager) > zoneRadius`, Switch to **ROAM**.


* [ ] **Navigation:**
* [ ] **Chase:** Move axis closer to player.
* [ ] **Roam:** Random movement or return to spawn.
* [ ] **Constraints:** Respect `solid` walls AND `enemyBlocked` (Salt) tiles.



---

## 4. Technical Snippets (Copy-Paste Ready)

### The Camera Calculation

```javascript
const VIEW_W = 20;
const VIEW_H = 15;

function getCamera() {
    // 1. Center on Player
    let x = player.x - Math.floor(VIEW_W / 2);
    let y = player.y - Math.floor(VIEW_H / 2);
    
    // 2. Clamp to Map Boundaries
    x = Math.max(0, Math.min(x, map[0].length - VIEW_W));
    y = Math.max(0, Math.min(y, map.length - VIEW_H));
    
    return { x, y };
}

```

### The Weighted "Flashlight" Focus

```javascript
// Mouse tracking (-1 to 1)
let mouse = { x: 0, y: 0 }; 
const LOOK_OFFSET = 6; // How far the light "leans"

function getFocusPoint() {
    return {
        x: player.x + (mouse.x * LOOK_OFFSET),
        y: player.y + (mouse.y * LOOK_OFFSET)
    };
}

```

### The AI Move Validator

```javascript
function canEnemyMove(x, y) {
    // 1. Bounds Check
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return false;
    
    // 2. Block Logic
    let block = BLOCK_DEFS[map[y][x]] || DEFAULT_BLOCK;
    if (block.solid) return false;        // Hits Wall
    if (block.enemyBlocked) return false; // Hits Salt Barrier
    
    return true;
}

```

---

## 5. Next Steps Checklist

1. Create `index.html`.
2. Define your `BLOCK_DEFS` constant.
3. Draw a small test map (2D array) containing at least:
* 1 Safe Room (surrounded by ID 6/Salt).
* 1 Hazard strip (ID 9/Lava).
* 1 Bush patch.


4. Implement the **Camera Loop** first (so you can see).