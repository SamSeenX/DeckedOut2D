# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-11

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
