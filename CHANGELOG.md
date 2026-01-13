# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-14

### Rebranding (Dungeon Outcast)
- **Title Change**: Rebranded game from "Decked Out 2D" to "Dungeon Outcast" across all HTML files.
- **Lore**: Replaced references to "Nether" with "Infernal Realm" to avoid trademark issues.
- **Guide**: Updated lore to reflect the "Frost/Ice" theme of the dungeon enemies.
- **SEO**: Updated meta tags, titles, and descriptions for generic fantasy branding.

### Added
- **Audio Experience**: 
    - Added procedural `playStartSequence()` (Pentatonic scale) on game start.
    - Added `playDoorRumble()` (Low frequency rumble + noise) for the intro door animation.
    - Added `cursor: crosshair` to the game canvas for better aim feel.
- **Visuals**:
    - **Frost Shards**: Specters now fire custom "Frost Shard" projectiles (rotated blue/white crystals) instead of generic orange dots.
    - **Directional Harvest**: Player now plays the "Walk" animation facing the bush when harvesting berries, instead of a generic eat animation.

### Changed
- **Audio Tuning**:
    - **Heartbeat**: Slowed down initial heartbeat (2000ms interval) and lowered minimum volume significantly (0.005) for a more subtle start. This scales up with Haze.
    - Removed `ready.opus` (unused voice clip).
- **Player Mechanics**:
    - **Action Priority**: Interaction ('F') now prioritizes Harvesting Berries over Eating Food if a bush is nearby.
    - **Harvest Radius**: Increased harvest detection radius to 2.0 blocks to match the UI prompt.
    - **Eating**: Eating is still bound to 'F' fallback but properly sets the 'Eat' animation.

### Fixed
- **Audio Bug**: Fixed heartbeat volume floor issue where decay was set too high (-40dB), preventing the sound from reaching true silence / low volume.


### Added
- **Sprite Editor Overhaul**:
  - **Collapsible Layout**: Added expandable/collapsible sidebars (Toggle `F`).
  - **Tools Palette**: Paint (`B`), Eraser (`E`), Picker (`I`), Onion Skin (`O`).
  - **Visual Brush**: Circular cursor showing brush size (`[` / `]`).
  - **Multi-Line Animation**: Added "Animation Rows" configuration for sheets that wrap.
  - **Canvas Controls**: Pan (`Space`), Zoom (`+`/`-`), Background Toggle (`1-7`).
  - **Persistence**: Settings and State (Brush, Color, etc.) are saved to local storage.
- **Lighting System Upgrades**:
  - Implemented `FLASHLIGHT_RADIUS` (clear vision) and `DIM_VIEW_RADIUS` (peripheral vision).
  - Blocks outside line-of-sight but within `DIM_VIEW_RADIUS` are now rendered at 20% opacity instead of being completely invisible.
  - Adjusted global shadow gradient to allow dim blocks to be visible.
- **Screen Shake**: Added visual feedback effect when the player takes damage.
- **Map Maker Tools**:
  - Added "Pick Tile" (Eyedropper) tool using 'I' key.
  - Added Flood Fill tool.
  - Integrated direct saving/loading of `map.js`.
  - Added visual keyboard shortcut indicators to the UI.

### Changed
- **Architecture**:
  - Refactored entire codebase to use native ES Modules (`import`/`export`).
  - Centralized game constants into `public/js/data/constants.js`.
  - Moved map data to `public/js/data/map.js`.
- **Game Balance**:
  - Player can no longer run and sneak simultaneously.
  - Running and Sneaking speed multipliers are now applied correctly to max speed.

### Fixed
- Fixed issue where walls would disappear completely when raycasting failed; they now fade to dim if nearby.
