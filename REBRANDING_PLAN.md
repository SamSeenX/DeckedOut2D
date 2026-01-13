# 🎮 DUNGEON OUTCAST: REBRANDING PLAN
## *A Fan Tribute to Decked Out 2 by Tango Tek*

> **Created:** 2026-01-13  
> **Branch:** `dev` (DO NOT merge to `main` without explicit user confirmation)  
> **Status:** ✅ Complete (Awaiting User Confirmation for Push/Merge)

---

## 📋 REBRANDING SUMMARY

| Category | Old Term | New Term | Status |
|----------|----------|----------|--------|
| **Game Title** | Decked Out 2D | Dungeon Outcast | ✅ |
| **Mechanic** | Clank | Haze | ✅ |
| **Enemy 1** | Ravager | Frost Beast | ✅ |
| **Enemy 2** | Vex | Phantom | ✅ |
| **Enemy 3** | Ghast | Specter | ✅ |

**Legend:** ⬜ Not Started | 🔄 In Progress | ✅ Complete

---

## 📁 PHASE 1: FILE RENAMES ✅

### 1.1 Enemy Module Files
- [x] `public/js/entities/ravager.js` → `public/js/entities/frostbeast.js`
- [x] `public/js/entities/vex.js` → `public/js/entities/phantom.js`
- [x] `public/js/entities/ghast.js` → `public/js/entities/specter.js`

### 1.2 Sprite Files
- [x] `public/assets/sprites/ravager.webp` → `public/assets/sprites/frostbeast.webp`
- [x] `public/assets/sprites/vex.webp` → `public/assets/sprites/phantom.webp`
- [x] `public/assets/sprites/ghast.webp` → `public/assets/sprites/specter.webp`

### 1.3 Sound Files
- [x] `public/assets/sounds/ravager_chase.json` → `public/assets/sounds/frostbeast_chase.json`
- [x] `public/assets/sounds/ravager_detect.json` → `public/assets/sounds/frostbeast_detect.json`
- [x] `public/assets/sounds/ravager_roam.json` → `public/assets/sounds/frostbeast_roam.json`
- [x] `public/assets/sounds/ravager_step_run.json` → `public/assets/sounds/frostbeast_step_run.json`
- [x] `public/assets/sounds/ravager_step_walk.json` → `public/assets/sounds/frostbeast_step_walk.json`

**Phase 1 Status:** ✅ Complete

---

## 📝 PHASE 2: CONFIGURATION FILES ✅

### 2.1 package.json
- [x] `"name": "deckedout2d"` → `"name": "dungeon-outcast"`

### 2.2 config.js - Clank → Haze Renames
- [x] `CLANK_SPEED_THRESHOLD` → `HAZE_SPEED_THRESHOLD`
- [x] `CLANK_WALK_INC` → `HAZE_WALK_INC`
- [x] `CLANK_RUN_INC` → `HAZE_RUN_INC`
- [x] `CLANK_MOVE_INC` → `HAZE_MOVE_INC`
- [x] `CLANK_MOVE_INTERVAL` → `HAZE_MOVE_INTERVAL`
- [x] `CLANK_JUMP_INC` → `HAZE_JUMP_INC`
- [x] `CLANK_DECAY_AMOUNT` → `HAZE_DECAY_AMOUNT`
- [x] `CLANK_DECAY_INTERVAL` → `HAZE_DECAY_INTERVAL`
- [x] `CLANK_CHANCE_MULTIPLIER` → `HAZE_CHANCE_MULTIPLIER`
- [x] `MAX_CLANK` → `MAX_HAZE`
- [x] `ARTIFACT_CLANK_PENALTY` → `ARTIFACT_HAZE_PENALTY`
- [x] All heartbeat comments updated

### 2.3 config.js - Ravager → Frost Beast Renames
- [x] `RAVAGER_SPEED` → `FROST_BEAST_SPEED`
- [x] `RAVAGER_ACCEL` → `FROST_BEAST_ACCEL`
- [x] `RAVAGER_CHASE_SPEED_MULT` → `FROST_BEAST_CHASE_SPEED_MULT`
- [x] `RAVAGER_DETECTION_RANGE` → `FROST_BEAST_DETECTION_RANGE`
- [x] `RAVAGER_IDLE_FPS` → `FROST_BEAST_IDLE_FPS`
- [x] `RAVAGER_CHASE_FPS` → `FROST_BEAST_CHASE_FPS`
- [x] Section comment updated

### 2.4 config.js - Vex → Phantom Renames
- [x] `VEX_ORBIT_SPEED` → `PHANTOM_ORBIT_SPEED`
- [x] `VEX_SWOOP_SPEED` → `PHANTOM_SWOOP_SPEED`
- [x] `VEX_SWOOP_COOLDOWN` → `PHANTOM_SWOOP_COOLDOWN`
- [x] `VEX_START_CLANK` → `PHANTOM_START_HAZE`
- [x] `VEX_SPAWN_INTERVAL` → `PHANTOM_SPAWN_INTERVAL`
- [x] `VEX_SPAWN_CHANCE` → `PHANTOM_SPAWN_CHANCE`
- [x] Section comment updated

### 2.5 config.js - Ghast → Specter Renames
- [x] `GHAST_SPEED` → `SPECTER_SPEED`
- [x] `GHAST_DETECTION_RANGE` → `SPECTER_DETECTION_RANGE`
- [x] `GHAST_ATTACK_COOLDOWN` → `SPECTER_ATTACK_COOLDOWN`
- [x] Section comment updated

**Phase 2 Status:** ✅ Complete

---

## 🎮 PHASE 3: CORE GAME FILES ✅

### 3.1 state.js
- [x] `clank: 0` → `haze: 0`

### 3.2 game.js - Imports
- [x] Import path: `ravager.js` → `frostbeast.js`
- [x] Import path: `vex.js` → `phantom.js`
- [x] Import path: `ghast.js` → `specter.js`
- [x] Class import: `Ravager` → `FrostBeast`
- [x] Class import: `Vex` → `Phantom`
- [x] Class import: `Ghast` → `Specter`

### 3.3 game.js - Config Imports
- [x] All `CLANK_*` → `HAZE_*` imports
- [x] All `VEX_*` → `PHANTOM_*` imports

### 3.4 game.js - Logic Updates
- [x] `gameState.clank` → `gameState.haze` (all occurrences)
- [x] `lastVexSpawnClank` → `lastPhantomSpawnHaze`
- [x] `new Ravager()` → `new FrostBeast()`
- [x] `new Vex()` → `new Phantom()`
- [x] `new Ghast()` → `new Specter()`
- [x] `cell.spawn === 'ravager'` → `cell.spawn === 'frostbeast'`
- [x] `cell.spawn === 'ghast'` → `cell.spawn === 'specter'`
- [x] `enemy.type === 'vex'` → `enemy.type === 'phantom'`
- [x] Toast message: `"A Phantom has been summoned!"`
- [x] All comments updated

### 3.5 ui.js
- [x] `clank-meter-container` → `haze-meter-container`
- [x] `clank-debug-value` → `haze-debug-value`
- [x] `gameState.clank` → `gameState.haze`
- [x] All comments updated

### 3.6 player.js - Imports
- [x] All `CLANK_*` imports → `HAZE_*`
- [x] `ARTIFACT_CLANK_PENALTY` → `ARTIFACT_HAZE_PENALTY`

### 3.7 player.js - Logic Updates
- [x] `lastMoveClankTime` → `lastMoveHazeTime`
- [x] `gameState.clank` → `gameState.haze` (all occurrences)
- [x] Victory card watermark: `'DUNGEON OUTCAST | do.samseen.dev'`
- [x] All comments updated

**Phase 3 Status:** ✅ Complete

---

## 👹 PHASE 4: ENTITY FILES ✅

### 4.1 frostbeast.js
- [x] Class name: `FrostBeast`
- [x] `this.type = 'frostbeast'`
- [x] Import: `SPRITES.frostbeast`
- [x] All `FROST_BEAST_*` config imports
- [x] Sound paths: `frostbeast_*.json`
- [x] All comments updated

### 4.2 phantom.js
- [x] Class name: `Phantom`
- [x] `this.type = 'phantom'`
- [x] Import: `SPRITES.phantom`
- [x] All `PHANTOM_*` config imports

### 4.3 specter.js
- [x] Class name: `Specter`
- [x] `this.type = 'specter'`
- [x] Import: `SPRITES.specter`
- [x] All `SPECTER_*` config imports

### 4.4 assets.js
- [x] `import frostbeastSprite`
- [x] `import phantomSprite`
- [x] `import specterSprite`
- [x] Import paths updated
- [x] `frostbeast: frostbeastSprite`
- [x] `phantom: phantomSprite`
- [x] `specter: specterSprite`

**Phase 4 Status:** ✅ Complete

---

## 🎨 PHASE 5: CSS FILES ✅

### 5.1 style.css
- [x] `#clank-meter-container` → `#haze-meter-container`
- [x] `.clank-bar` → `.haze-bar`
- [x] `.clank-bar.filled` → `.haze-bar.filled`
- [x] Comments updated

**Phase 5 Status:** ✅ Complete

---

## 🗺️ PHASE 6: MAP DATA ✅

### 6.1 map.js - Spawn Points
- [x] All `"spawn":"ravager"` → `"spawn":"frostbeast"`
- [x] All `"spawn":"ghast"` → `"spawn":"specter"`

**Phase 6 Status:** ✅ Complete

---

## 🌐 PHASE 7: HTML PAGES ✅

### 7.1 index.html
- [x] `<title>` tag: "Dungeon Outcast by SamSeen - A Fan Tribute to Decked Out 2"
- [x] Meta description updated
- [x] Meta keywords updated
- [x] OG title updated
- [x] OG description updated
- [x] Twitter title updated
- [x] Hero title: `DUNGEON OUTCAST`
- [x] All body text updated
- [x] All "Clank" → "Haze"
- [x] All enemy names updated
- [x] Disclaimer added

### 7.2 guide.html
- [x] `<title>` tag updated
- [x] Meta description updated
- [x] Page title updated
- [x] All "Clank" → "Haze"
- [x] All enemy names updated
- [x] Disclaimer added

### 7.3 devlog.html
- [x] `<title>` tag updated
- [x] Meta description updated
- [x] All "Decked Out 2D" → "Dungeon Outcast"
- [x] All "Clank" → "Haze"
- [x] All enemy names updated
- [x] TangoTek/Hermitcraft references retained as attribution
- [x] Disclaimer added

### 7.4 play.html
- [x] `<title>` tag updated
- [x] `CLANK:` → `HAZE:`
- [x] `haze-meter-container` updated

### 7.5 404.html
- [x] Easter egg messages updated (Frost Beast, Haze)

### 7.6 tools/index.html
- [x] Title updated

### 7.7 tools/mapmaker.html
- [x] Title updated
- [x] Specter spawn button updated

### 7.8 tools/audio-builder.html
- [x] Title updated

### 7.9 tools/definer.html
- [x] Title updated

### 7.10 tools/video-to-sprites.html
- [x] Title updated

**Phase 7 Status:** ✅ Complete

---

## 🔊 PHASE 8: SOUND JSON FILES ✅

### 8.1 Update Internal Names
- [x] `frostbeast_chase.json`: `"name": "Frost Beast Chase Bark"`
- [x] `frostbeast_detect.json`: `"name": "Frost Beast Detect"`
- [x] `frostbeast_roam.json`: `"name": "Frost Beast Roam Growl"`
- [x] `frostbeast_step_run.json`: `"name": "Frost Beast Step Run"`
- [x] `frostbeast_step_walk.json`: `"name": "Frost Beast Step Walk"`

**Phase 8 Status:** ✅ Complete

---

## 💾 PHASE 9: LOCALSTORAGE KEYS ✅

### 9.1 touch.js
- [x] `deckedout_touch_enabled` → `dungeonoutcast_touch_enabled`

### 9.2 mapmaker.js
- [x] `deckedout_mapmaker_data` → `dungeonoutcast_mapmaker_data`
- [x] `deckedout_mapmaker_settings` → `dungeonoutcast_mapmaker_settings`
- [x] Spawn references updated

**Phase 9 Status:** ✅ Complete

---

## ⚠️ PHASE 10: DISCLAIMER BANNER ✅

### 10.1 Disclaimer Added to Pages
- [x] `index.html` - Added in footer section
- [x] `guide.html` - Added in footer section
- [x] `devlog.html` - Added in footer section

**Disclaimer Text:**
```
⚠️ Fan Project Disclaimer: This project is a fan work inspired by Tango Tek's "Decked Out 2". 
All assets are custom-made or AI-generated. Not affiliated with Mojang or Hermitcraft.
```

**Phase 10 Status:** ✅ Complete

---

## 📚 PHASE 11: DOCUMENTATION ✅

### 11.1 README.md
- [x] Title updated
- [x] Description updated
- [x] All "Clank" → "Haze"
- [x] All enemy names updated

### 11.2 NEXT_SESSION.md
- [x] All references updated

### 11.3 PLAN.md
- [x] All references updated

**Phase 11 Status:** ✅ Complete

---

## 🔨 PHASE 12: BUILD & TEST

### 12.1 Development Test
- [ ] Run `npm run dev`
- [ ] Verify game loads
- [ ] Verify all enemies spawn correctly
- [ ] Verify Haze meter works
- [ ] Verify all sounds play
- [ ] Verify victory card shows new name

### 12.2 Production Build
- [ ] Run `npm run build`
- [ ] Run `npm run preview`
- [ ] Verify production build works
- [ ] Verify all assets are bundled correctly

### 12.3 Clean Up
- [ ] Delete old dist folder files with old names
- [ ] Verify no old references remain

**Phase 12 Status:** 🔄 In Progress

---

## 🚀 PHASE 13: DEPLOYMENT

### 13.1 Git Commits
- [ ] Stage all changes
- [ ] Commit with message: `refactor: Complete rebranding to Dungeon Outcast`
- [ ] Push to `dev` branch (REQUIRES USER CONFIRMATION: "push to dev")

### 13.2 Merge to Main
- [ ] Create PR or direct merge (REQUIRES USER CONFIRMATION: "merge to main")
- [ ] Verify deployment

**Phase 13 Status:** ⬜ Awaiting User Confirmation

---

## 📊 PROGRESS TRACKER

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | File Renames | ✅ |
| 2 | Configuration Files | ✅ |
| 3 | Core Game Files | ✅ |
| 4 | Entity Files | ✅ |
| 5 | CSS Files | ✅ |
| 6 | Map Data | ✅ |
| 7 | HTML Pages | ✅ |
| 8 | Sound JSON Files | ✅ |
| 9 | LocalStorage Keys | ✅ |
| 10 | Disclaimer Banner | ✅ |
| 11 | Documentation | ✅ |
| 12 | Build & Test | 🔄 |
| 13 | Deployment | ⬜ |

**Overall Progress:** 11/13 Phases Complete

---

## 🛑 SAFETY REMINDERS

1. **NEVER** push to any branch without explicit user confirmation
2. **NEVER** merge to `main` without user saying exact words: "merge to main"
3. **ALWAYS** verify we're on `dev` branch before making changes
4. **ALWAYS** test with `npm run dev` before building for production
