# Decked Out 2D - Development Tracker

**Repository:** Private
**Status:** Pre-Alpha / Core Loop Prototype

---
## 📚 Project Overview
Decked Out 2D is a 2D recreation of the original Decked Out 2 by TangoTek from Hermetcraft SMP. It is an action-adventure game where players navigate through procedurally generated dungeons, avoiding enemies and collecting artifacts while managing their resources.

## 📁 Folder Structure
```
root
├── public/             # Game distribution folder
│   ├── assets/         # Sprites and tilesets
│   ├── css/            # Stylesheets (style.css, toast.css)
│   ├── js/             # Game Logic
│   │   ├── core/       # Engine, input, audio, UI
│   │   ├── entities/   # Player, Enemies (Ravager, Ghast, Vex)
│   │   ├── utils/      # Helpers (collision, constants)
│   │   ├── world/      # Map data, tiles, lighting
│   │   ├── main.js     # Entry point
│   │   └── mapmaker.js # Map Editor logic
│   ├── index.html      # Game entry point
│   └── mapmaker.html   # Map Editor tool
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
    *   [x] Map Maker Tool (Internal tool for level design).

*   **Gameplay Mechanics**
    *   [x] **Clank System**: Running generates noise; sneaking is silent.
    *   [x] **Health & Damage**: Player HP, visual damage feedback (Red Flash), Game Over state.
    *   [x] **Hazards**: Floor hazards (Lava/Damage blocks).
    *   [x] **Interactions**: Healing blocks (Berries).

*   **AI & Enemies**
    *   [x] **Ravager**: Physics-based chaser AI.
    *   [x] **Ghast**: Ranged attacker with projectile logic.
    *   [x] **Vex**: Dynamic swarm enemy. Spawns based on Clank level (Start > 60, Interval 10). Orbits and swoops.

### 🚧  Current Focus
*   Refining Vex spawn rates and difficulty curves.
*   Polishing movement feel and collision hitboxes.
*   Integrating new tileset options into Map Maker.

---

## �️ Future Roadmap

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
*   *Map Maker data is stored in `js/map.js` manually right now.*


## Start commands 
* python3 -m http.server -d public
* npx serve public