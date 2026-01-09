# DeckedOut2D - Artifact Hunt & Map Maker Design

## 1. Feature Overview
The goal is to implement a complete "Artifact Hunt" loop where the player must:
1.  Navigate the dungeon using a compass.
2.  Find the hidden artifact location (randomized each run).
3.  Recover the artifact.
4.  Escape to an Exit Point.

Additionally, we will add a currency system (Embers) and Inventory management (Food).

## 2. Data Structure Updates
### A. Map Attributes
Tiles will now support metadata attributes in `js/world/map.js`.
Structure change:
```javascript
// Old: Simple ID
[1, 0, 1]

// New: Object with attributes
[
    1,
    { id: 0, isArtifactSpot: true },  // Possible spawn location for artifact
    { id: 0, isTreasure: true },      // Embers can drop here
    { id: 0, isExit: true }           // Win condition point
]
```

### B. Game State (`gameState`)
Extend `js/core/state.js`:
```javascript
gameState = {
    // ... existing
    targetArtifact: { x: 0, y: 0 }, // The chosen spot for this run
    hasArtifact: false,
    embers: 0,
    inventory: {
        food: 0
    },
    gameWon: false
}
```

## 3. Map Maker Updates (`js/mapmaker.js`)
We need to allow the user to paint these attributes.
1.  **UI Addition**: Add an "Attributes" tool palette.
    - [ ] Toggle Button: "Artifact Spot"
    - [ ] Toggle Button: "Treasure Spot"
    - [ ] Toggle Button: "Exit Point"
2.  **Painting Logic**: When clicking a tile, apply the selected attribute instead of changing the ID (if in attribute mode).
3.  **Visualization**: Draw colored borders or icons over tiles with attributes.
    - Red Border: Artifact Spot
    - Gold Border: Treasure Spot
    - Green Border: Exit Point
4.  **Export**: Update `saveMapAsJS` to include these keys in the exported object.

## 4. Systems & Logic
### A. Artifact System
1.  **Initialization**: On game start, find all tiles with `isArtifactSpot: true`. Randomly pick one. Set `gameState.targetArtifact`.
2.  **Compass**:
    - Create a HUD Compass element.
    - Math: `Math.atan2(target.y - player.y, target.x - player.x)`.
    - If `hasArtifact` is true, point to nearest `isExit` tile instead.
3.  **Interaction**:
    - Player presses 'E' or clicks "Check Location".
    - If `player.x, player.y` matches `targetArtifact` -> `hasArtifact = true`, show Toast, update Compass.

### B. Ember System
1.  **Drop Logic**:
    - In `updatePlayer`, check if player is near a `isTreasure` tile.
    - Small random chance to spawn an `Ember` entity.
2.  **Entity**: `js/entities/ember.js`
    - Logic: Float, bob up and down, despawn after 10s.
    - Pickup: Collision with player -> `gameState.embers++`.

### C. Inventory (Food)
1.  **Berry Bushes**:
    - Stepping on bush (ID 8) -> `inventory.food += rand(1,3)`.
    - Change tile to empty bush (ID 7).
    - Do NOT heal immediately.
2.  **Eating**:
    - Player presses 'F' or clicks HUD button.
    - `inventory.food--`, `player.hp += 2`.

## 5. UI/HUD
- [ ] **Compass**: Arrow rotating based on angle.
- [ ] **Counters**: Ember Icon + Count, Food Icon + Count.
- [ ] **Artifact Status**: Slot waiting for item.
- [ ] **End Game Screen**: Summary card on win.

## 6. Implementation Steps
1.  **Artifacts Data**: `js/data/artifacts.js`
2.  **Game State**: Update `js/core/state.js`
3.  **Map Maker**: Add attribute painting tools.
4.  **Player Logic**: Add interactions and inventory.
5.  **Entities**: Create `Ember` class.
6.  **UI**: Build the new HUD.