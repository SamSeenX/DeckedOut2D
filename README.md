# Decked Out 2D - Development Tracker

**Repository:** Private
**Status:** Beta Release (v0.1.0)

---
## 📚 Project Overview
Decked Out 2D is a 2D recreation of the original Decked Out 2 by TangoTek from Hermitcraft. It is an action-adventure game where players navigate through procedurally generated dungeons, avoiding enemies and collecting artifacts while managing their resources.

## 📁 Folder Structure
```
root
├── dist/               # Production build output (minified & bundled)
├── public/             # Game distribution folder
│   ├── assets/         # Sprites and tilesets
│   ├── css/            # Stylesheets (style.css, toast.css)
│   ├── js/             # Game Logic
│   │   ├── core/       # Engine, input, audio, UI
│   │   ├── data/       # Game Data (constants, map.js, artifacts)
│   │   ├── entities/   # Player, Enemies (Ravager, Ghast, Vex)
│   │   ├── utils/      # Helpers (collision)
│   │   ├── world/      # Tiles logic, lighting
│   │   ├── main.js     # Entry point
│   │   └── mapmaker.js # Map Editor logic
│   ├── index.html      # Game entry point
│   └── mapmaker.html   # Map Editor tool
├── tools/              # Dev Tools Source
└── temp/               # Master assets and work-in-progress
```


## 📅 Progress Tracker

### ✅ Completed Features
*   **Core Systems**
    *   [x] Modular ES6 Javascript Architecture.
    *   [x] 2.5D Rendering Engine (Pseudo-3D layered rendering).
    *   [x] Fog of War / Field of View system.
    *   [x] Physics-based movement (Velocity, Friction, Collision).
    *   [x] Sprite Animation System (Player).
    *   [x] Map Parsing & Entity Spawning.
    *   [x] **Map Maker v2**: Full JS integration, Variant Support, Pick Tool.

*   **Gameplay Mechanics**
    *   [x] **Clank System**: Running generates noise; sneaking is silent.
    *   [x] **Health & Damage**: Player HP, visual damage feedback (Red Flash), Game Over state.
    *   [x] **Hazards**: Floor hazards (Lava/Damage blocks).
    *   [x] **Interactions**: Healing blocks (Berries), Ember collection.

*   **AI & Enemies**
    *   [x] **Ravager**: Physics-based chaser AI.
    *   [x] **Ghast**: Ranged attacker with projectile logic.
    *   [x] **Vex**: Dynamic swarm enemy. Spawns based on Clank level (Start > 60, Interval 10). Orbits and swoops.

### 🚧  Current Focus
*   Expanding the tile set with more aesthetic variants.
*   Implementing the Card Deck system.
*   Polishing UI and HUD elements.

---

## 🛠️ Tooling & Map Maker
The Map Maker tool (`tools.sh` / `tools/mapmaker.html`) has been significantly upgraded.

**Key Features:**
*   **Direct JS Support**: The tool now Loads and Saves directly to `public/js/data/map.js`. No more converting JSON files manually.
*   **Tile Variants**: Paint with specific variants (e.g. cracked stone, mossy brick) and they will be saved and rendered in-game.
*   **Pick Tool (I)**: Use the 'I' key or the Eyedropper icon to sample tiles from the map.
*   **Keyboard Shortcuts**:
    *   `P` - Paint
    *   `F` - Fill
    *   `I` - Pick Tile
    *   `E` - Erase

**Workflow:**
1.  Run `./tools.sh` (or `npm run tools`) to open the Map Maker.
2.  Click **Load Map** and select `public/js/data/map.js` to edit the current game map.
3.  Edit your level.
4.  Click **Save Map**. This downloads a new `map.js`.
5.  Overwrite the file in `public/js/data/map.js` with your download.

---

## 🔮 Future Roadmap

### Phase 1: The Deck Mechanic (Priority)
- [ ] **Card System UI**: HUD element to show hand/deck.
- [ ] **Deck Logic**: Drawing, Shuffling, Discarding.
- [ ] **Card Effects**:
    - *Stealth Card*: Reduced visibility radius.
    - *Sprint Card*: Temporary speed boost without Clank.
    - *Stumble Card*: Random noise generation (Debuff).

### Phase 2: Game Loop & Economy
- [ ] **Artifacts**: proper collection logic and "dashing out" to secure them.
- [ ] **Currency (Embers)**: Persistent currency stored between runs.
- [ ] **The Shop**: Menu to buy new cards/upgrades with Embers.

### Phase 3: Content Expansion
- [ ] **New Levels**: Ice Caverns, Black Mines.
- [ ] **New Enemies**: Warden (Sound-based boss), Slimes.
- [ ] **Sound Design**:
    - [ ] Footstep SFX (Materials based).
    - [ ] Heartbeat (Low HP).
    - [ ] Ambient dungeon drones.

### Phase 4: Polish & Juice
- [ ] **Particle Effects**: Dust when running, sparkles for loot.
- [ ] **Lighting 2.0**: Torch flickers, colored lighting zones.
- [ ] **UI Overhaul**: Pixel-art themed menus and HUD.

---

## 📝 Notes
*   *Vex spawning is currently hardcoded to start at 60 Clank.*
*   *The Game Engine treats tile variants as visual-only unless specific logic is added to `tiles.js`.*


## 🚀 Production Build
The project uses **Vite** for building and bundling the game for production.

*   **Build Command**: `npm run build`
    *   This command bundles all source code from `public/`, minifies JavaScript and CSS, and optimizes assets.
    *   The output is generated in the **`dist/`** folder.
*   **Preview Production**: `npm run preview`
    *   Starts a local server serving the optimized `dist/` folder to test the production build.

---

## Start commands 
*   **Development**: `npm run dev` (Starts dev server with HMR)
*   **Map Maker**: `./tools.sh` (Opens Map Maker tool)
*   **Production Build**: `npm run build`
*   **Production Preview**: `npm run preview`