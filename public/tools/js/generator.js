// js/generator.js - Smart Dungeon Generator for Dungeon Outcast
// Version 4: Added final connectivity pass to eliminate all isolated areas
// Uses a "Digger" algorithm for layout and Voronoi-based biome painting

import { BLOCK_DEFS, BIOME_DEFS } from "/js/data/tiles.js";

// ===== Constants =====
const MARKER_WALL = 999;
const MARKER_FLOOR = 888;

/**
 * Builds a palette of tiles organized by biome ID and type (wall/floor)
 * @returns {Object} Palette with biome IDs as keys, each containing walls and floors arrays
 */
export function buildBiomePalette() {
  const palette = {
    universal: {
      walls: [],
      floors: [],
    },
  };

  // Initialize palette for each defined biome
  Object.keys(BIOME_DEFS).forEach((biomeId) => {
    palette[biomeId] = { walls: [], floors: [] };
  });

  Object.entries(BLOCK_DEFS).forEach(([idStr, def]) => {
    const id = parseInt(idStr);

    // Skip special tiles (like Artifact) or hidden tiles (Berry/Bush)
    if (id === 99 || def.hidden) return;

    const isSolid = def.solid === true;
    const hasDamage = def.damage && def.damage > 0;

    // Skip damaging tiles for floors (like Lava) - they shouldn't be walked on
    if (!isSolid && hasDamage) {
      console.log(
        `Excluding tile ${id} (${def.name}) from floors due to damage property`
      );
      return;
    }
    const biomes = def.biomes;

    if (biomes && Array.isArray(biomes) && biomes.length > 0) {
      // Tile belongs to specific biomes (by ID)
      biomes.forEach((biomeId) => {
        if (palette[biomeId]) {
          if (isSolid) {
            palette[biomeId].walls.push(id);
          } else {
            palette[biomeId].floors.push(id);
          }
        }
      });
    } else {
      // Universal tile (no biomes specified)
      if (isSolid) {
        palette.universal.walls.push(id);
      } else {
        palette.universal.floors.push(id);
      }
    }
  });

  console.log("Built biome palette:", palette);
  return palette;
}

/**
 * Generates a generic dungeon layout using the "Digger" algorithm
 * @param {number} width - Map width in tiles
 * @param {number} height - Map height in tiles
 * @param {Object} settings - Generation settings
 * @returns {Object} Object containing the map and list of rooms
 */
export function generateGenericLayout(width, height, settings) {
  const {
    maxRooms = 15,
    minRoomSize = 4,
    maxRoomSize = 8,
    minCorridorWidth = 1,
    maxCorridorWidth = 2,
    maxCorridorLength = 6,
  } = settings;

  // Helper to get random corridor width
  function getCorridorWidth() {
    return randomInt(minCorridorWidth, maxCorridorWidth);
  }

  // Initialize map with walls
  const map = [];
  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      map[y][x] = MARKER_WALL;
    }
  }

  const rooms = [];

  // Helper: Check if a room fits without overlapping others (with padding)
  function canPlaceRoom(rx, ry, rw, rh, padding = 1) {
    const startX = rx - padding;
    const startY = ry - padding;
    const endX = rx + rw + padding;
    const endY = ry + rh + padding;

    if (startX < 1 || startY < 1 || endX >= width - 1 || endY >= height - 1) {
      return false;
    }

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (map[y][x] === MARKER_FLOOR) {
          return false;
        }
      }
    }
    return true;
  }

  // Helper: Carve a room with random shape
  // Shape types: 0=Rectangle, 1=L-Shaped, 2=Cross, 3=Circular, 4=Diamond
  function carveRoom(rx, ry, rw, rh) {
    const shapeType = randomInt(0, 4);

    switch (shapeType) {
      case 0:
        // RECTANGLE - Standard box shape
        carveRectangle(rx, ry, rw, rh);
        break;

      case 1:
        // L-SHAPED - Two overlapping rectangles forming an L
        carveLShape(rx, ry, rw, rh);
        break;

      case 2:
        // CROSS/PLUS - Horizontal and vertical bars crossing
        carveCross(rx, ry, rw, rh);
        break;

      case 3:
        // CIRCULAR/OVAL - Ellipse shape
        carveCircle(rx, ry, rw, rh);
        break;

      case 4:
        // DIAMOND - Rotated square
        carveDiamond(rx, ry, rw, rh);
        break;

      default:
        carveRectangle(rx, ry, rw, rh);
    }
  }

  // Shape: Standard Rectangle
  function carveRectangle(rx, ry, rw, rh) {
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
          map[y][x] = MARKER_FLOOR;
        }
      }
    }
  }

  // Shape: L-Shaped room
  function carveLShape(rx, ry, rw, rh) {
    // Determine L orientation (4 possible rotations)
    const rotation = randomInt(0, 3);

    // Split the room into two parts
    const halfW = Math.max(2, Math.floor(rw / 2));
    const halfH = Math.max(2, Math.floor(rh / 2));

    switch (rotation) {
      case 0: // ┌─ shape (top-right missing)
        carveRectangle(rx, ry, halfW, rh); // Left vertical bar
        carveRectangle(rx, ry + rh - halfH, rw, halfH); // Bottom horizontal bar
        break;
      case 1: // ─┐ shape (top-left missing)
        carveRectangle(rx + rw - halfW, ry, halfW, rh); // Right vertical bar
        carveRectangle(rx, ry + rh - halfH, rw, halfH); // Bottom horizontal bar
        break;
      case 2: // └─ shape (bottom-right missing)
        carveRectangle(rx, ry, halfW, rh); // Left vertical bar
        carveRectangle(rx, ry, rw, halfH); // Top horizontal bar
        break;
      case 3: // ─┘ shape (bottom-left missing)
        carveRectangle(rx + rw - halfW, ry, halfW, rh); // Right vertical bar
        carveRectangle(rx, ry, rw, halfH); // Top horizontal bar
        break;
    }
  }

  // Shape: Cross/Plus shaped room
  function carveCross(rx, ry, rw, rh) {
    // Horizontal bar (full width, partial height)
    const hBarHeight = Math.max(2, Math.floor(rh * 0.4));
    const hBarY = ry + Math.floor((rh - hBarHeight) / 2);
    carveRectangle(rx, hBarY, rw, hBarHeight);

    // Vertical bar (partial width, full height)
    const vBarWidth = Math.max(2, Math.floor(rw * 0.4));
    const vBarX = rx + Math.floor((rw - vBarWidth) / 2);
    carveRectangle(vBarX, ry, vBarWidth, rh);
  }

  // Shape: Circular/Oval room
  function carveCircle(rx, ry, rw, rh) {
    const centerX = rx + rw / 2;
    const centerY = ry + rh / 2;
    const radiusX = rw / 2;
    const radiusY = rh / 2;

    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        // Check if point is inside ellipse
        const dx = (x + 0.5 - centerX) / radiusX;
        const dy = (y + 0.5 - centerY) / radiusY;
        if (dx * dx + dy * dy <= 1.0) {
          if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
            map[y][x] = MARKER_FLOOR;
          }
        }
      }
    }
  }

  // Shape: Diamond (rotated square)
  function carveDiamond(rx, ry, rw, rh) {
    const centerX = rx + rw / 2;
    const centerY = ry + rh / 2;

    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        // Diamond check: |x - centerX| / halfW + |y - centerY| / halfH <= 1
        const dx = Math.abs(x + 0.5 - centerX) / (rw / 2);
        const dy = Math.abs(y + 0.5 - centerY) / (rh / 2);
        if (dx + dy <= 1.0) {
          if (y >= 1 && y < height - 1 && x >= 1 && x < width - 1) {
            map[y][x] = MARKER_FLOOR;
          }
        }
      }
    }
  }

  // Helper: Carve a robust L-shaped corridor to guarantee connectivity
  // Creates a 2x2 junction at the bend to ensure cardinal (not diagonal) connections
  function carveCorridor(x1, y1, x2, y2) {
    const corridorWidth = getCorridorWidth();

    // Determine junction point (the "elbow" of the L)
    // Randomly decide whether to go Horizontal-Vertical or Vertical-Horizontal
    const horizontalFirst = Math.random() < 0.5;

    let junctionX, junctionY;

    if (horizontalFirst) {
      // Horizontal then Vertical: junction is at (x2, y1)
      junctionX = x2;
      junctionY = y1;

      // Horizontal segment from x1 to x2 at y1
      const hStartX = Math.min(x1, x2);
      const hEndX = Math.max(x1, x2);
      carveRect(hStartX, y1, hEndX - hStartX + 1, corridorWidth);

      // Vertical segment from y1 to y2 at x2
      const vStartY = Math.min(y1, y2);
      const vEndY = Math.max(y1, y2);
      carveRect(x2, vStartY, corridorWidth, vEndY - vStartY + 1);
    } else {
      // Vertical then Horizontal: junction is at (x1, y2)
      junctionX = x1;
      junctionY = y2;

      // Vertical segment from y1 to y2 at x1
      const vStartY = Math.min(y1, y2);
      const vEndY = Math.max(y1, y2);
      carveRect(x1, vStartY, corridorWidth, vEndY - vStartY + 1);

      // Horizontal segment from x1 to x2 at y2
      const hStartX = Math.min(x1, x2);
      const hEndX = Math.max(x1, x2);
      carveRect(hStartX, y2, hEndX - hStartX + 1, corridorWidth);
    }

    // CRITICAL: Carve a 2x2 block at the junction to guarantee cardinal connectivity
    // This prevents diagonal-only connections at the L-bend
    const junctionSize = Math.max(2, corridorWidth);
    carveRect(
      junctionX - Math.floor(junctionSize / 2),
      junctionY - Math.floor(junctionSize / 2),
      junctionSize,
      junctionSize
    );
  }

  // Helper: Simple rectangle carver for corridors
  function carveRect(x, y, w, h) {
    for (let ky = y; ky < y + h; ky++) {
      for (let kx = x; kx < x + w; kx++) {
        if (ky >= 1 && ky < height - 1 && kx >= 1 && kx < width - 1) {
          map[ky][kx] = MARKER_FLOOR;
        }
      }
    }
  }

  // Generate rooms - Fill until we can't fit any more
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 200; // High threshold to ensure we pack the map
  const safetyMaxRooms = 999; // Absolute sanity limit

  while (
    consecutiveFailures < maxConsecutiveFailures &&
    rooms.length < safetyMaxRooms
  ) {
    const rw = randomInt(minRoomSize, maxRoomSize);
    const rh = randomInt(minRoomSize, maxRoomSize);

    let rx, ry;
    let placed = false;

    // --- STRATEGY 1: TIGHT CLUSTERING ---
    // Try multiple times to place this room near an existing room
    if (rooms.length > 0) {
      const clusterAttempts = 20;
      for (let a = 0; a < clusterAttempts && !placed; a++) {
        // Pick a "host" room to grow from.
        // Bias towards recent rooms to create "snake-like" or "branching" structures,
        // but occasionally pick older rooms to "fill in" holes.
        // 70% chance to pick from last 5 rooms, 30% chance to pick any room.
        let hostRoom;
        if (Math.random() < 0.7) {
          const recentCount = Math.min(rooms.length, 5);
          hostRoom = rooms[rooms.length - 1 - randomInt(0, recentCount - 1)];
        } else {
          hostRoom = rooms[randomInt(0, rooms.length - 1)];
        }

        // Calculate a tight position
        // Distance = (Average Radius) + (Corridor Length)
        // We force short corridors here for density: 1 to maxCorridorLength
        const dist = Math.floor(
          (rw + rh) / 2 + randomInt(1, Math.min(4, maxCorridorLength))
        );
        const angle = Math.random() * Math.PI * 2;

        rx = Math.floor(hostRoom.centerX + Math.cos(angle) * dist - rw / 2);
        ry = Math.floor(hostRoom.centerY + Math.sin(angle) * dist - rh / 2);

        // Map Bounds Validation
        if (rx < 2 || ry < 2 || rx + rw >= width - 2 || ry + rh >= height - 2) {
          continue;
        }

        if (canPlaceRoom(rx, ry, rw, rh)) {
          carveRoom(rx, ry, rw, rh);
          const center = {
            x: Math.floor(rx + rw / 2),
            y: Math.floor(ry + rh / 2),
          };
          rooms.push({
            x: rx,
            y: ry,
            width: rw,
            height: rh,
            centerX: center.x,
            centerY: center.y,
          });

          // Connect to the host immediately
          carveCorridor(hostRoom.centerX, hostRoom.centerY, center.x, center.y);

          placed = true;
          consecutiveFailures = 0;
        }
      }
    } else {
      // First room: placing in center-ish area
      rx = Math.floor(width / 2 - rw / 2);
      ry = Math.floor(height / 2 - rh / 2);
      if (canPlaceRoom(rx, ry, rw, rh)) {
        carveRoom(rx, ry, rw, rh);
        rooms.push({
          x: rx,
          y: ry,
          width: rw,
          height: rh,
          centerX: Math.floor(rx + rw / 2),
          centerY: Math.floor(ry + rh / 2),
        });
        placed = true;
      }
    }

    // --- STRATEGY 2: RANDOM PLACEMENT WITH DISTANCE CHECK ---
    // If clustering failed, try random spots, BUT reject them if they are too far away.
    // This prevents "long corridor" issues by enforcing locality.
    if (!placed && rooms.length > 0) {
      const randomAttempts = 20;
      for (let a = 0; a < randomAttempts && !placed; a++) {
        rx = randomInt(2, width - rw - 2);
        ry = randomInt(2, height - rh - 2);

        if (canPlaceRoom(rx, ry, rw, rh)) {
          const center = {
            x: Math.floor(rx + rw / 2),
            y: Math.floor(ry + rh / 2),
          };

          // Find closest existing room
          let closest = null;
          let minDist = Infinity;
          for (const other of rooms) {
            // Manhattan distance roughly approximates pathing difficulty here
            const dist =
              Math.abs(other.centerX - center.x) +
              Math.abs(other.centerY - center.y);
            if (dist < minDist) {
              minDist = dist;
              closest = other;
            }
          }

          // CRITICAL: Reject if too far.
          // Threshold: Room Size + Max Corridor * 1.5
          // If the closest room is e.g. > 15 tiles away, we do NOT want this room.
          const threshold =
            (rw + rh) / 2 + maxCorridorLength * 1.5 + Math.max(rw, rh);

          // Only accept if within reasonable distance
          if (closest && minDist <= threshold) {
            carveRoom(rx, ry, rw, rh);
            rooms.push({
              x: rx,
              y: ry,
              width: rw,
              height: rh,
              centerX: center.x,
              centerY: center.y,
            });

            // Connect to that closest room
            carveCorridor(closest.centerX, closest.centerY, center.x, center.y);

            placed = true;
            consecutiveFailures = 0;
          }
        }
      }
    }

    if (!placed) {
      consecutiveFailures++;
    }
  }

  // Add some extra corridors for connectivity (loops)
  // Only link rooms that are reasonably close to avoid giant cross-map lines
  const extraCorridors = Math.floor(rooms.length / 4);
  let extraAttempts = 0;
  let connectedExtras = 0;
  const maxAttempts = 1000; // Limit attempts to prevent infinite loops

  while (connectedExtras < extraCorridors && extraAttempts < maxAttempts) {
    extraAttempts++;
    const i1 = randomInt(0, rooms.length - 1);
    const i2 = randomInt(0, rooms.length - 1);

    if (i1 !== i2) {
      const r1 = rooms[i1];
      const r2 = rooms[i2];
      // Check distance
      const dx = r1.centerX - r2.centerX;
      const dy = r1.centerY - r2.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only connect if fairly close (Strict limit to avoid long cuts)
      if (dist < maxCorridorLength * 2 + maxRoomSize) {
        carveCorridor(r1.centerX, r1.centerY, r2.centerX, r2.centerY);
        connectedExtras++;
      }
    }
  }

  // --- PRUNING PASS: Remove unconnected islands ---
  if (rooms.length > 0) {
    const startRoom = rooms[0];
    const visited = new Set();
    const stack = [{ x: startRoom.centerX, y: startRoom.centerY }];
    visited.add(`${startRoom.centerX},${startRoom.centerY}`);

    // Flood fill reachable floors
    while (stack.length > 0) {
      const { x, y } = stack.pop();

      const neighbors = [
        { x: x + 1, y: y },
        { x: x - 1, y: y },
        { x: x, y: y + 1 },
        { x: x, y: y - 1 },
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
          const key = `${n.x},${n.y}`;
          if (!visited.has(key) && map[n.y][n.x] === MARKER_FLOOR) {
            visited.add(key);
            stack.push(n);
          }
        }
      }
    }

    // Prune walls
    let prunedCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (map[y][x] === MARKER_FLOOR && !visited.has(`${x},${y}`)) {
          map[y][x] = MARKER_WALL;
          prunedCount++;
        }
      }
    }
    console.log(`Pruned ${prunedCount} unreachable tiles.`);

    // Update rooms list (remove rooms that are no longer accessible)
    // We check if the room's center is still a floor (it should be visited)
    // Actually checking if center is in visited set is safest
    const keptRooms = [];
    for (const r of rooms) {
      if (visited.has(`${r.centerX},${r.centerY}`)) {
        keptRooms.push(r);
      }
    }
    // Replace rooms list, but we can't reassign const 'rooms'.
    // We must modify array in place or return new list.
    // Since 'rooms' is const array, we clear and push.
    rooms.length = 0;
    rooms.push(...keptRooms);

    console.log(`Pruned disconnected rooms. Remaining: ${rooms.length}`);
  }

  // --- FIX DIAGONAL-ONLY CONNECTIONS ---
  // Find floor tiles that have diagonal floor neighbors but NO cardinal floor neighbors
  // These create unreachable areas. Fix them by adding a bridge tile or removing them.
  let diagonalFixCount = 0;
  let changed = true;

  while (changed) {
    changed = false;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (map[y][x] !== MARKER_FLOOR) continue;

        // Count cardinal floor neighbors
        const cardinalNeighbors = [
          { x: x + 1, y: y },
          { x: x - 1, y: y },
          { x: x, y: y + 1 },
          { x: x, y: y - 1 },
        ];

        let cardinalFloorCount = 0;
        for (const n of cardinalNeighbors) {
          if (map[n.y][n.x] === MARKER_FLOOR) {
            cardinalFloorCount++;
          }
        }

        // If this floor tile has NO cardinal floor neighbors, it's a problem
        if (cardinalFloorCount === 0) {
          // Check diagonal neighbors for floor tiles
          const diagonalNeighbors = [
            { x: x + 1, y: y + 1 },
            { x: x + 1, y: y - 1 },
            { x: x - 1, y: y + 1 },
            { x: x - 1, y: y - 1 },
          ];

          let fixedViaBridge = false;

          for (const d of diagonalNeighbors) {
            if (
              d.x >= 1 &&
              d.x < width - 1 &&
              d.y >= 1 &&
              d.y < height - 1 &&
              map[d.y][d.x] === MARKER_FLOOR
            ) {
              // Found a diagonal floor neighbor - try to bridge
              // Bridge options: (x, d.y) or (d.x, y)
              const bridge1 = { x: x, y: d.y };
              const bridge2 = { x: d.x, y: y };

              // Prefer the bridge that's currently a wall
              if (map[bridge1.y][bridge1.x] === MARKER_WALL) {
                map[bridge1.y][bridge1.x] = MARKER_FLOOR;
                diagonalFixCount++;
                fixedViaBridge = true;
                changed = true;
                break;
              } else if (map[bridge2.y][bridge2.x] === MARKER_WALL) {
                map[bridge2.y][bridge2.x] = MARKER_FLOOR;
                diagonalFixCount++;
                fixedViaBridge = true;
                changed = true;
                break;
              }
            }
          }

          // If we couldn't bridge, remove this isolated floor tile
          if (!fixedViaBridge) {
            map[y][x] = MARKER_WALL;
            diagonalFixCount++;
            changed = true;
          }
        }
      }
    }
  }

  if (diagonalFixCount > 0) {
    console.log(`Fixed ${diagonalFixCount} diagonal-only connection issues.`);
  }

  console.log(`Generated layout with ${rooms.length} rooms`);
  return { map, rooms };
}

/**
 * Applies dynamic biomes to the map using a growing region algorithm
 * Biomes grow from seed points to random sizes until the whole map is covered
 * @param {Array} map - 2D array with MARKER_WALL and MARKER_FLOOR
 * @param {number} width - Map width
 * @param {number} height - Map height
 * @param {Object} palette - Biome palette from buildBiomePalette()
 * @param {Object} settings - Optional settings including minBiomeSize and maxBiomeSize
 * @returns {Array} Final map with real tile IDs
 */
export function applyDynamicBiomes(map, width, height, palette, settings = {}) {
  const { minBiomeSize = 80, maxBiomeSize = 200 } = settings;

  // Get available biome IDs (excluding 'universal')
  const biomeIds = Object.keys(palette).filter((b) => b !== "universal");

  if (biomeIds.length === 0) {
    console.warn("No specific biomes found. All tiles will be universal.");
  }

  // Create a biome assignment map (tracks which biome each tile belongs to)
  const biomeMap = [];
  for (let y = 0; y < height; y++) {
    biomeMap[y] = [];
    for (let x = 0; x < width; x++) {
      biomeMap[y][x] = null; // null = unassigned
    }
  }

  // Track total tiles and assigned tiles
  const totalTiles = width * height;
  let assignedTiles = 0;

  // Keep growing biomes until the whole map is filled
  let biomeIndex = 0;
  const maxIterations = 1000; // Safety limit
  let iterations = 0;

  while (assignedTiles < totalTiles && iterations < maxIterations) {
    iterations++;

    // Pick a random biome type
    const biomeType =
      biomeIds.length > 0
        ? biomeIds[randomInt(0, biomeIds.length - 1)]
        : "universal";

    // Calculate target size for this biome (random within range)
    const targetSize = randomInt(minBiomeSize, maxBiomeSize);

    // Find a starting point - prefer unassigned tiles
    let startX, startY;
    let found = false;

    // Try to find an unassigned tile adjacent to an existing biome (for organic growth)
    // or any unassigned tile if this is the first biome
    const attempts = 100;
    for (let a = 0; a < attempts && !found; a++) {
      const testX = randomInt(0, width - 1);
      const testY = randomInt(0, height - 1);

      if (biomeMap[testY][testX] === null) {
        startX = testX;
        startY = testY;
        found = true;
      }
    }

    if (!found) {
      // No more unassigned tiles found
      break;
    }

    // Grow biome from seed point using flood-fill style growth
    const frontier = [{ x: startX, y: startY }];
    let grown = 0;

    while (frontier.length > 0 && grown < targetSize) {
      // Pick a random tile from frontier for organic growth
      const idx = randomInt(0, frontier.length - 1);
      const { x, y } = frontier.splice(idx, 1)[0];

      // Skip if already assigned
      if (biomeMap[y][x] !== null) continue;

      // Assign biome
      biomeMap[y][x] = biomeType;
      grown++;
      assignedTiles++;

      // Add unassigned neighbors to frontier
      const neighbors = [
        { x: x + 1, y: y },
        { x: x - 1, y: y },
        { x: x, y: y + 1 },
        { x: x, y: y - 1 },
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
          if (biomeMap[n.y][n.x] === null) {
            // Check if not already in frontier
            if (!frontier.some((f) => f.x === n.x && f.y === n.y)) {
              frontier.push(n);
            }
          }
        }
      }
    }

    biomeIndex++;
    console.log(`Biome ${biomeIndex} (${biomeType}): grew ${grown} tiles`);
  }

  console.log(
    `Created ${biomeIndex} biomes, assigned ${assignedTiles}/${totalTiles} tiles`
  );

  // --- FILL HOLES PASS ---
  // Ensure 100% coverage by filling remaining nulls with nearest neighbor's biome
  if (assignedTiles < totalTiles) {
    console.log(`Filling ${totalTiles - assignedTiles} unassigned tiles...`);

    // We iterate until all filled. In worst case (disconnected chunks),
    // simply scan and propagate.
    let changed = true;
    while (changed) {
      changed = false;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (biomeMap[y][x] === null) {
            // Check neighbors for a valid biome
            const neighbors = [
              { x: x + 1, y: y },
              { x: x - 1, y: y },
              { x: x, y: y + 1 },
              { x: x, y: y - 1 },
            ];

            // Shuffle neighbors to avoid directional bias
            for (let i = neighbors.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
            }

            for (const n of neighbors) {
              if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                const neighborBiome = biomeMap[n.y][n.x];
                if (neighborBiome !== null) {
                  biomeMap[y][x] = neighborBiome;
                  assignedTiles++;
                  changed = true;
                  break; // Found a biome, move to next tile
                }
              }
            }
          }
        }
      }

      // Safety break if we get stuck (e.g. isolated islands of nulls - shouldn't happen with this algo but safe is good)
      // If we did a full pass and nothing changed but we still have nulls, force assign a random biome
      if (!changed && assignedTiles < totalTiles) {
        // Force fill one tile to restart propagation
        let forced = false;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (biomeMap[y][x] === null) {
              biomeMap[y][x] =
                biomeIds[randomInt(0, biomeIds.length - 1)] || "universal";
              assignedTiles++;
              changed = true;
              forced = true;
              break;
            }
          }
          if (forced) break;
        }
      }
    }
  }

  // Helper: Get the number of variants available for a tile ID
  function getVariantCount(tileId) {
    const def = BLOCK_DEFS[tileId];
    if (!def || !def.sheetIndex) return 1;

    // If sheetIndex is a single [x, y] pair, there's 1 variant
    if (!Array.isArray(def.sheetIndex[0])) return 1;

    // Otherwise, count the array entries
    return def.sheetIndex.length;
  }

  // Helper: Get a random tile ID from a biome's list, with fallback
  function getTileId(biome, isWall) {
    const type = isWall ? "walls" : "floors";

    // Try specific biome first
    if (palette[biome] && palette[biome][type].length > 0) {
      return palette[biome][type][
        randomInt(0, palette[biome][type].length - 1)
      ];
    }

    // Fallback to universal
    if (palette.universal[type].length > 0) {
      return palette.universal[type][
        randomInt(0, palette.universal[type].length - 1)
      ];
    }

    // Ultimate fallback: Stone (0) for floors, Void (11) for walls
    return isWall ? 11 : 0;
  }

  // Apply biomes to map based on biomeMap assignments
  const finalMap = [];
  for (let y = 0; y < height; y++) {
    finalMap[y] = [];
    for (let x = 0; x < width; x++) {
      const marker = map[y][x];
      const isWall = marker === MARKER_WALL;

      // Get biome for this tile
      const biome = biomeMap[y][x] || "universal";
      let tileId = getTileId(biome, isWall);

      // Safeguard: ensure tileId is never null/undefined
      if (tileId === null || tileId === undefined) {
        tileId = isWall ? 11 : 0;
      }

      // Get a random variant for this tile (1-indexed)
      const variantCount = getVariantCount(tileId);
      const variant = randomInt(1, variantCount);

      // Optimize output: use plain number if just id with default variant
      if (variant === 1) {
        finalMap[y][x] = tileId;
      } else {
        finalMap[y][x] = { id: tileId, v: variant };
      }
    }
  }

  // --- LAST PASS: Ensure layout floors are respected ---
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (map[y][x] === MARKER_FLOOR) {
        const finalT = finalMap[y][x];

        // If tile is missing/undefined, OR if it's solid (wall/void) but should be floor
        if (!finalT) {
          console.log(
            `Fixing missing tile at ${x},${y} (Layout: Floor, Final: missing)`
          );
          finalMap[y][x] = { id: 0, v: 1 }; // Force Stone Floor
          continue;
        }

        const finalId = typeof finalT === "number" ? finalT : finalT.id;
        const def = BLOCK_DEFS[finalId];

        // If layout is floor but final is solid (wall/void), fix it!
        if (def && def.solid) {
          console.log(
            `Fixing mismatched tile at ${x},${y} (Layout: Floor, Final: ${finalId})`
          );
          finalMap[y][x] = { id: 0, v: 1 }; // Force Stone Floor
        }
      }
    }
  }

  return finalMap;
}

/**
 * Main entry point: Generate a complete smart dungeon
 * @param {number} width - Map width in tiles
 * @param {number} height - Map height in tiles
 * @param {Object} settings - Generation settings
 * @param {Function} onProgress - Optional callback for progress updates: (step, message, mapData) => void
 * @returns {Array} Complete map data ready for use in the map maker
 */
export function generateSmartDungeon(
  width,
  height,
  settings = {},
  onProgress = null
) {
  console.log(`Generating smart dungeon V4: ${width}x${height}`, settings);

  // Helper to report progress
  function reportProgress(step, message, mapData = null) {
    console.log(`[${step}] ${message}`);
    if (onProgress) {
      onProgress(step, message, mapData);
    }
  }

  reportProgress("init", "Starting dungeon generation...");

  // Build the palette from BLOCK_DEFS
  const palette = buildBiomePalette();
  reportProgress("palette", "Built biome palette");

  // Generate the layout (rooms + corridors)
  reportProgress("layout", "Generating rooms and corridors...");
  const { map: layoutMap, rooms } = generateGenericLayout(
    width,
    height,
    settings
  );
  reportProgress("layout_done", `Created ${rooms.length} rooms`);

  // Apply biome painting
  reportProgress("biomes", "Painting biomes...");
  const finalMap = applyDynamicBiomes(
    layoutMap,
    width,
    height,
    palette,
    settings
  );
  reportProgress("biomes_done", "Biome painting complete");

  // Ensure a tile is an object (not just a number) so we can add properties
  function ensureTileObject(y, x) {
    const tile = finalMap[y][x];
    if (typeof tile === "number") {
      finalMap[y][x] = { id: tile, v: 1 };
    }
    return finalMap[y][x];
  }

  // --- FEATURE PLACEMENT ---
  reportProgress("features", "Placing features...");

  // 1. Player Spawns (start from first room)
  if (rooms.length > 0 && settings.spawnCount > 0) {
    const count = Math.min(settings.spawnCount, rooms.length);
    for (let i = 0; i < count; i++) {
      const room = rooms[i];
      const tile = ensureTileObject(room.centerY, room.centerX);
      tile.spawn = "player";
      // Don't mark as used for other things if possible, but spawns are critical
    }
  }

  // 2. Exits (start from last room)
  if (rooms.length > 1 && settings.exitCount > 0) {
    const count = Math.min(
      settings.exitCount,
      rooms.length - settings.spawnCount
    ); // Avoid overlapping spawns if possible

    for (let i = 0; i < count; i++) {
      // Pick room from the end
      const roomIdx = rooms.length - 1 - i;
      if (roomIdx < 0) break;

      const room = rooms[roomIdx];
      const exitPos = findExitWallPosition(finalMap, width, height, room);

      if (exitPos) {
        // Valid wall position found - convert wall to floor and mark as exit
        // This makes the wall tile passable (like a door)
        const tile = ensureTileObject(exitPos.y, exitPos.x);
        tile.id = 0; // Convert to stone floor (passable)
        tile.v = 1;
        tile.isExit = true;
      } else {
        // Fallback: Place exit on a floor tile INSIDE the room
        // Find a floor tile in the room that has at least one cardinal floor neighbor
        let placed = false;
        for (let ry = room.y; ry < room.y + room.height && !placed; ry++) {
          for (let rx = room.x; rx < room.x + room.width && !placed; rx++) {
            const checkTile = finalMap[ry] && finalMap[ry][rx];
            if (!checkTile) continue;

            const checkId =
              typeof checkTile === "number" ? checkTile : checkTile.id;
            const checkDef = BLOCK_DEFS[checkId];

            // Must be a floor tile
            if (checkDef && !checkDef.solid) {
              // Verify cardinal accessibility
              const neighbors = [
                { x: rx + 1, y: ry },
                { x: rx - 1, y: ry },
                { x: rx, y: ry + 1 },
                { x: rx, y: ry - 1 },
              ];

              let hasCardinalFloor = false;
              for (const n of neighbors) {
                if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                  const nTile = finalMap[n.y] && finalMap[n.y][n.x];
                  if (nTile) {
                    const nId = typeof nTile === "number" ? nTile : nTile.id;
                    const nDef = BLOCK_DEFS[nId];
                    if (nDef && !nDef.solid) {
                      hasCardinalFloor = true;
                      break;
                    }
                  }
                }
              }

              if (hasCardinalFloor) {
                const tile = ensureTileObject(ry, rx);
                tile.isExit = true;
                placed = true;
              }
            }
          }
        }

        // Ultimate fallback: room center (should always work for valid rooms)
        if (!placed) {
          const tile = ensureTileObject(room.centerY, room.centerX);
          tile.isExit = true;
        }
      }
    }
  }

  // Track used rooms for artifacts and treasures
  // We'll consider the first few (spawns) and last few (exits) as "used" to avoid cluttering them
  const usedRooms = new Set();
  for (let i = 0; i < settings.spawnCount; i++) usedRooms.add(i);
  for (let i = 0; i < settings.exitCount; i++)
    usedRooms.add(rooms.length - 1 - i);

  // Optional: Add artifact spots in random rooms (at random positions)
  if (settings.artifactCount > 0 && rooms.length > 2) {
    // Try to place requested number of artifacts, but cap at available rooms
    const actualCount = Math.min(settings.artifactCount, rooms.length - 2);

    for (let i = 0; i < actualCount; i++) {
      const roomIdx = getUnusedRoomIndex(rooms, usedRooms);
      if (roomIdx !== -1) {
        usedRooms.add(roomIdx);
        const room = rooms[roomIdx];

        // Find a random floor tile within the room (not center)
        // Try multiple random positions to find a valid floor
        let placed = false;
        for (let attempt = 0; attempt < 20 && !placed; attempt++) {
          const ax = room.x + randomInt(0, room.width - 1);
          const ay = room.y + randomInt(0, room.height - 1);

          if (finalMap[ay] && finalMap[ay][ax]) {
            const checkTile = finalMap[ay][ax];
            const checkId =
              typeof checkTile === "number" ? checkTile : checkTile.id;
            const checkDef = BLOCK_DEFS[checkId];

            // Only place on valid floor tiles
            if (checkDef && !checkDef.solid) {
              const tile = ensureTileObject(ay, ax);
              tile.isArtifactSpot = true;
              placed = true;
            }
          }
        }

        // Fallback to center if random attempts failed
        if (!placed) {
          const tile = ensureTileObject(room.centerY, room.centerX);
          tile.isArtifactSpot = true;
        }
      }
    }
  }

  // Optional: Add treasure spots in random rooms (at random positions)
  if (settings.treasureCount > 0 && rooms.length > 1) {
    // Treasures can share rooms with artifacts if needed, or stick to unused ones
    const actualCount = settings.treasureCount;

    for (let i = 0; i < actualCount; i++) {
      let roomIdx = getUnusedRoomIndex(rooms, usedRooms);

      // If no unused rooms left, pick a random used room (excluding start/end)
      if (roomIdx === -1 && rooms.length > 2) {
        roomIdx = randomInt(1, rooms.length - 2);
      }

      if (roomIdx !== -1 && roomIdx < rooms.length) {
        usedRooms.add(roomIdx);
        const room = rooms[roomIdx];

        // Find a random floor tile within the room
        // Try multiple random positions to find a valid floor
        let placed = false;
        for (let attempt = 0; attempt < 20 && !placed; attempt++) {
          const tx = room.x + randomInt(0, room.width - 1);
          const ty = room.y + randomInt(0, room.height - 1);

          if (finalMap[ty] && finalMap[ty][tx]) {
            const checkTile = finalMap[ty][tx];
            const checkId =
              typeof checkTile === "number" ? checkTile : checkTile.id;
            const checkDef = BLOCK_DEFS[checkId];

            // Only place on valid floor tiles
            if (checkDef && !checkDef.solid) {
              const tile = ensureTileObject(ty, tx);
              tile.isTreasure = true;
              placed = true;
            }
          }
        }

        // Fallback to center if random attempts failed
        if (!placed) {
          const tile = ensureTileObject(room.centerY, room.centerX);
          tile.isTreasure = true;
        }
      }
    }
  }

  // === ENEMY PLACEMENT PASS ===
  // Iterate through all rooms to possibly place enemies
  if (rooms.length > 0) {
    reportProgress("features", "Placing enemies...");

    const placeEnemy = (room, type) => {
      let placed = false;
      // Try multiple random positions to find a valid floor
      for (let attempt = 0; attempt < 20 && !placed; attempt++) {
        const tx = room.x + randomInt(0, room.width - 1);
        const ty = room.y + randomInt(0, room.height - 1);

        if (finalMap[ty] && finalMap[ty][tx]) {
          const tile = ensureTileObject(ty, tx); // Ensure object to access properties
          const tileId = tile.id;
          const def = BLOCK_DEFS[tileId];

          // Check:
          // 1. Is floor (not solid)
          // 2. Not occupied by other features
          if (
            def &&
            !def.solid &&
            !tile.isArtifactSpot &&
            !tile.isTreasure &&
            !tile.isExit &&
            !tile.spawn
          ) {
            tile.spawn = type;
            placed = true;
          }
        }
      }
      return placed;
    };

    for (const room of rooms) {
      // Check if room has a player spawn ANYWHERE
      // This is more robust than just checking the center
      let hasPlayerSpawn = false;
      for (let ry = room.y; ry < room.y + room.height; ry++) {
        for (let rx = room.x; rx < room.x + room.width; rx++) {
          const t = finalMap[ry]?.[rx];
          if (t && typeof t === "object" && t.spawn === "player") {
            hasPlayerSpawn = true;
            break;
          }
        }
        if (hasPlayerSpawn) break;
      }

      if (hasPlayerSpawn) continue;

      // Dynamic Probabilities from Settings
      const pFrostBeast =
        settings.probFrostBeast !== undefined ? settings.probFrostBeast : 0.2;
      const pSpecter =
        settings.probSpecter !== undefined ? settings.probSpecter : 0.05;

      // Chance for Frost Beast
      if (Math.random() < pFrostBeast) {
        placeEnemy(room, "frostbeast");
      }

      // Chance for Specter
      if (Math.random() < pSpecter) {
        placeEnemy(room, "specter");
      }
    }
  }

  // === BERRY BUSH PLACEMENT ===
  // Chance per room to have 1 or 2 berry bushes
  // Priority: "Nook" spots (3+ walls) -> Standard spots (2+ walls)
  if (rooms.length > 0) {
    reportProgress("features", "Placing berry bushes...");

    // Dynamic Berry Probability
    const pBerry = settings.probBerry !== undefined ? settings.probBerry : 0.1;

    for (const room of rooms) {
      if (Math.random() < pBerry) {
        // Decide count: 1 or 2
        // Threshhold: Area > 30 tiles -> 2 bushes
        let count = room.width * room.height > 30 ? 2 : 1;
        let placedCount = 0;

        // --- STEP 1: Scan for Nooks (3+ walls) ---
        // We scan the room area to find ideal little corners
        const nookCandidates = [];

        for (let ry = room.y; ry < room.y + room.height; ry++) {
          for (let rx = room.x; rx < room.x + room.width; rx++) {
            // Validation checks (must be floor, empty, etc)
            if (!finalMap[ry] || !finalMap[ry][rx]) continue;

            const tile = ensureTileObject(ry, rx);
            const tileId = tile.id;
            const def = BLOCK_DEFS[tileId];

            // Must be floor and valid
            if (!def || def.solid) continue;
            if (
              tile.isArtifactSpot ||
              tile.isTreasure ||
              tile.isExit ||
              tile.spawn ||
              tile.isBerryBush
            )
              continue;

            // Count Wall Neighbors
            let wallNeighborCount = 0;
            const neighbors = [
              { x: rx + 1, y: ry },
              { x: rx - 1, y: ry },
              { x: rx, y: ry + 1 },
              { x: rx, y: ry - 1 },
            ];

            for (const n of neighbors) {
              if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                const nTile = finalMap[n.y][n.x];
                if (nTile) {
                  const nId = typeof nTile === "object" ? nTile.id : nTile;
                  const nDef = BLOCK_DEFS[nId];
                  if (!nDef || nDef.solid) wallNeighborCount++;
                }
              } else {
                wallNeighborCount++; // Bounds are walls
              }
            }

            // If it's a nook (>= 3 walls), add to candidates
            if (wallNeighborCount >= 3) {
              nookCandidates.push({ x: rx, y: ry });
            }
          }
        }

        // Place in Nooks first
        while (placedCount < count && nookCandidates.length > 0) {
          // Pick random nook
          const idx = randomInt(0, nookCandidates.length - 1);
          const pos = nookCandidates.splice(idx, 1)[0];

          const tile = ensureTileObject(pos.y, pos.x);
          tile.isBerryBush = true;
          placedCount++;
        }

        // --- STEP 2: Fallback to standard 2-wall spots ---
        let attempts = 0;
        const maxAttempts = 30;

        while (placedCount < count && attempts < maxAttempts) {
          attempts++;
          const tx = room.x + randomInt(0, room.width - 1);
          const ty = room.y + randomInt(0, room.height - 1);

          if (!finalMap[ty] || !finalMap[ty][tx]) continue;

          const tile = ensureTileObject(ty, tx);
          const tileId = tile.id;
          const def = BLOCK_DEFS[tileId];

          // 1. Must be floor
          if (!def || def.solid) continue;

          // 2. Must be empty of other features
          if (
            tile.isArtifactSpot ||
            tile.isTreasure ||
            tile.isExit ||
            tile.spawn ||
            tile.isBerryBush
          )
            continue;

          // 3. Must be connected to at least 2 walls, but NOT opposite walls
          // This prevents blocking corridors (e.g. walls on left/right but open top/bottom)
          const isWall = (tx, ty) => {
            if (tx < 0 || tx >= width || ty < 0 || ty >= height) return true; // Bounds are walls
            const t = finalMap[ty][tx];
            if (!t) return false;
            const tid = typeof t === "object" ? t.id : t;
            const tdef = BLOCK_DEFS[tid];
            return !tdef || tdef.solid;
          };

          const wRight = isWall(tx + 1, ty);
          const wLeft = isWall(tx - 1, ty);
          const wBottom = isWall(tx, ty + 1);
          const wTop = isWall(tx, ty - 1);

          let wallCount = 0;
          if (wRight) wallCount++;
          if (wLeft) wallCount++;
          if (wBottom) wallCount++;
          if (wTop) wallCount++;

          if (wallCount >= 2) {
            // Check for Blocking Configuration (Opposite Walls)
            // If strictly 2 walls, ensure they are NOT opposite
            if (wallCount === 2) {
              if ((wRight && wLeft) || (wTop && wBottom)) {
                // Opposite walls = Blocking or Corridor = Skip
                continue;
              }
            }

            tile.isBerryBush = true;
            placedCount++;
          }
        }
      }
    }
  }

  // === FINAL CONNECTIVITY PASS ===
  // This is the definitive fix - ensure ALL floor tiles in the final map
  // are cardinally connected to the spawn point (or first room center)
  reportProgress("connectivity", "Running connectivity validation...");

  // Helper to check if a tile ID is a floor (non-solid)
  function isFloorTile(tile) {
    if (!tile) return false;
    const id = typeof tile === "number" ? tile : tile.id;
    if (id === undefined || id === null || id === -1) return false;
    const def = BLOCK_DEFS[id];
    if (!def) return false;
    return def.solid !== true; // Explicitly check for non-solid
  }

  // Helper to convert a tile to wall
  function convertToWall(y, x) {
    const existingTile = finalMap[y][x];
    if (typeof existingTile === "object") {
      // Preserve any special properties but change to wall
      finalMap[y][x] = { ...existingTile, id: 11, v: 1 };
    } else {
      finalMap[y][x] = { id: 11, v: 1 };
    }
  }

  // Find the spawn point or first room center as our connectivity anchor
  let anchorX = Math.floor(width / 2);
  let anchorY = Math.floor(height / 2);

  if (rooms.length > 0) {
    anchorX = rooms[0].centerX;
    anchorY = rooms[0].centerY;
  }

  console.log(`Anchor point: (${anchorX}, ${anchorY})`);

  // Make sure anchor is a floor tile
  if (!isFloorTile(finalMap[anchorY]?.[anchorX])) {
    console.log("Anchor is not a floor tile, searching for valid anchor...");
    // Find any floor tile as anchor
    let found = false;
    for (let y = 0; y < height && !found; y++) {
      for (let x = 0; x < width && !found; x++) {
        if (isFloorTile(finalMap[y]?.[x])) {
          anchorX = x;
          anchorY = y;
          found = true;
          console.log(`Found new anchor at: (${anchorX}, ${anchorY})`);
        }
      }
    }
    if (!found) {
      console.error("No floor tiles found in map!");
      return finalMap;
    }
  }

  // Flood fill from anchor using CARDINAL directions only
  const visited = new Set();
  const stack = [{ x: anchorX, y: anchorY }];
  visited.add(`${anchorX},${anchorY}`);

  while (stack.length > 0) {
    const { x, y } = stack.pop();

    const neighbors = [
      { x: x + 1, y: y },
      { x: x - 1, y: y },
      { x: x, y: y + 1 },
      { x: x, y: y - 1 },
    ];

    for (const n of neighbors) {
      if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
        const key = `${n.x},${n.y}`;
        if (!visited.has(key) && isFloorTile(finalMap[n.y]?.[n.x])) {
          visited.add(key);
          stack.push(n);
        }
      }
    }
  }

  console.log(`Flood fill found ${visited.size} reachable floor tiles`);

  // Convert all unreachable floor tiles to walls
  let unreachableCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        finalMap[y]?.[x] &&
        isFloorTile(finalMap[y][x]) &&
        !visited.has(`${x},${y}`)
      ) {
        // This floor tile is not reachable - convert to wall
        convertToWall(y, x);
        unreachableCount++;
      }
    }
  }

  console.log(
    `Converted ${unreachableCount} unreachable floor tiles to walls.`
  );

  // === FIX DIAGONAL-ONLY FLOOR TILES ===
  // Even after pruning, check for floor tiles with NO cardinal floor neighbors
  let diagonalFixes = 0;
  let fixChanged = true;

  while (fixChanged) {
    fixChanged = false;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (!isFloorTile(finalMap[y][x])) continue;

        // Count cardinal floor neighbors
        let cardinalFloors = 0;
        const cardinals = [
          { x: x + 1, y: y },
          { x: x - 1, y: y },
          { x: x, y: y + 1 },
          { x: x, y: y - 1 },
        ];

        for (const c of cardinals) {
          if (isFloorTile(finalMap[c.y]?.[c.x])) {
            cardinalFloors++;
          }
        }

        // If no cardinal floor neighbors, this tile is isolated - remove it
        if (cardinalFloors === 0) {
          finalMap[y][x] = { id: 11, v: 1 }; // Convert to wall
          diagonalFixes++;
          fixChanged = true;
        }
      }
    }
  }

  if (diagonalFixes > 0) {
    reportProgress("diagonal_fix", `Fixed ${diagonalFixes} diagonal tiles`);
  }

  reportProgress("complete", "Dungeon generation complete!", finalMap);
  return finalMap;
}

/**
 * Find a wall position that has floor on exactly one side (good for door placement)
 */
function findExitWallPosition(map, width, height, room) {
  const candidates = [];

  // Check along room edges
  for (let x = room.x; x < room.x + room.width; x++) {
    // Top edge
    const topY = room.y - 1;
    if (topY > 0 && isValidExitWall(map, x, topY, width, height)) {
      candidates.push({ x, y: topY });
    }
    // Bottom edge
    const bottomY = room.y + room.height;
    if (
      bottomY < height - 1 &&
      isValidExitWall(map, x, bottomY, width, height)
    ) {
      candidates.push({ x, y: bottomY });
    }
  }

  for (let y = room.y; y < room.y + room.height; y++) {
    // Left edge
    const leftX = room.x - 1;
    if (leftX > 0 && isValidExitWall(map, leftX, y, width, height)) {
      candidates.push({ x: leftX, y });
    }
    // Right edge
    const rightX = room.x + room.width;
    if (rightX < width - 1 && isValidExitWall(map, rightX, y, width, height)) {
      candidates.push({ x: rightX, y });
    }
  }

  if (candidates.length > 0) {
    return candidates[randomInt(0, candidates.length - 1)];
  }
  return null;
}

/**
 * Check if a wall tile has floor on exactly one side (N/S/E/W)
 */
function isValidExitWall(map, x, y, width, height) {
  const tile = map[y][x];
  if (tile === null || tile === undefined) return false;

  // Get tile ID - handle both number and object formats
  const tileId = typeof tile === "number" ? tile : tile.id;
  if (tileId === undefined) return false;

  // Check if this is a solid tile (wall)
  const def = BLOCK_DEFS[tileId];
  if (!def || !def.solid) return false;

  // Count adjacent floor tiles (Cardinal only)
  let floorCount = 0;
  const neighbors = [
    { dx: 0, dy: -1 }, // North
    { dx: 0, dy: 1 }, // South
    { dx: -1, dy: 0 }, // West
    { dx: 1, dy: 0 }, // East
  ];

  for (const n of neighbors) {
    const nx = x + n.dx;
    const ny = y + n.dy;

    // Bounds check
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

    const neighborTile = map[ny][nx];

    // Handle edge case where map data might be missing/null
    if (neighborTile === null || neighborTile === undefined) continue;

    const neighborId =
      typeof neighborTile === "number" ? neighborTile : neighborTile.id;

    // Safety check for neighborId
    if (neighborId === undefined || neighborId === -1) continue;

    const neighborDef = BLOCK_DEFS[neighborId];

    // If we can't find definition, assume it's solid (safe fallback)
    if (!neighborDef) continue;

    // Check strict solidity
    if (!neighborDef.solid) {
      floorCount++;
    }
  }

  // Exit wall MUST have exactly 1 adjacent floor tile (cardinal)
  return floorCount === 1;
}

/**
 * Get an unused room index from the rooms array
 */
function getUnusedRoomIndex(rooms, usedRooms) {
  if (usedRooms.size >= rooms.length) return -1;

  const availableIndices = [];
  for (let i = 0; i < rooms.length; i++) {
    if (!usedRooms.has(i)) {
      availableIndices.push(i);
    }
  }

  if (availableIndices.length === 0) return -1;
  return availableIndices[randomInt(0, availableIndices.length - 1)];
}

// ===== Utility Functions =====
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Export constants for external use
export { MARKER_WALL, MARKER_FLOOR };
