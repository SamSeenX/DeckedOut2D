import { map } from "../data/map.js";
import { BLOCK_DEFS, DEFAULT_BLOCK } from "../world/tiles.js";
import { PLAYER_RADIUS } from "../data/config.js";

/**
 * Original radius-based collision check (for player and simple entities)
 * Uses 4 corners of a square centered on the entity
 */
export function checkWallCollision(targetX, targetY, radius = PLAYER_RADIUS) {
  const corners = [
    { x: targetX - radius, y: targetY - radius },
    { x: targetX + radius, y: targetY - radius },
    { x: targetX - radius, y: targetY + radius },
    { x: targetX + radius, y: targetY + radius },
  ];

  for (let point of corners) {
    let tileX = Math.floor(point.x);
    let tileY = Math.floor(point.y);

    if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= map[0].length)
      return true;

    let cell = map[tileY][tileX];
    let tileId = typeof cell === "object" ? cell.id || 0 : cell;

    let block = BLOCK_DEFS[tileId] || DEFAULT_BLOCK;
    if (block.solid) return true;
  }
  return false;
}

/**
 * AABB (Axis-Aligned Bounding Box) collision check
 * Uses asymmetric insets to create a more accurate collision box
 *
 * @param {number} targetX - Entity center X position (tiles)
 * @param {number} targetY - Entity center Y position (tiles)
 * @param {object} bounds - Bounding box definition
 * @param {number} bounds.left - Distance from center to left edge (tiles)
 * @param {number} bounds.right - Distance from center to right edge (tiles)
 * @param {number} bounds.top - Distance from center to top edge (tiles)
 * @param {number} bounds.bottom - Distance from center to bottom edge (tiles)
 * @returns {boolean} True if collision detected
 */
export function checkAABBCollision(targetX, targetY, bounds) {
  // Calculate the 4 corners of the bounding box
  const corners = [
    { x: targetX - bounds.left, y: targetY - bounds.top }, // Top-left
    { x: targetX + bounds.right, y: targetY - bounds.top }, // Top-right
    { x: targetX - bounds.left, y: targetY + bounds.bottom }, // Bottom-left
    { x: targetX + bounds.right, y: targetY + bounds.bottom }, // Bottom-right
  ];

  for (let point of corners) {
    let tileX = Math.floor(point.x);
    let tileY = Math.floor(point.y);

    // Out of bounds = collision
    if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= map[0].length)
      return true;

    let cell = map[tileY][tileX];
    let tileId = typeof cell === "object" ? cell.id || 0 : cell;

    let block = BLOCK_DEFS[tileId] || DEFAULT_BLOCK;
    if (block.solid) return true;
  }
  return false;
}

/**
 * Calculate AABB bounds from sprite scale with configurable insets
 *
 * Insets: percentage of visual size to cut from each side
 * - topInset: 0.4 = cut 40% from top (excludes horns/head decorations)
 * - sideInset: 0.25 = cut 25% from each side (excludes arms/wings)
 * - bottomInset: 0.1 = cut 10% from bottom (excludes shadow)
 *
 * @param {number} scaleW - Sprite width multiplier (from animation data)
 * @param {number} scaleH - Sprite height multiplier (from animation data)
 * @param {object} insets - Inset percentages (optional, has defaults)
 * @returns {object} Bounds object with left, right, top, bottom distances
 */
export function calculateAABBBounds(scaleW = 1, scaleH = 1, insets = {}) {
  const topInset = insets.top !== undefined ? insets.top : 0.4;
  const sideInset = insets.side !== undefined ? insets.side : 0.25;
  const bottomInset = insets.bottom !== undefined ? insets.bottom : 0.1;

  // Visual half-dimensions
  const halfW = scaleW / 2;
  const halfH = scaleH / 2;

  // Apply insets (as percentage of full dimension, not half)
  // For horizontal: cut 25% from each side
  const leftDist = halfW * (1 - sideInset * 2);
  const rightDist = halfW * (1 - sideInset * 2);

  // For vertical: asymmetric (more from top, less from bottom)
  // Top: cut 40% of full height from top
  // Bottom: cut 10% of full height from bottom
  const topDist = halfH * (1 - topInset * 2); // Distance from center to top edge
  const bottomDist = halfH * (1 - bottomInset * 2); // Distance from center to bottom edge

  // Shift the center point to account for asymmetric cuts
  // If we cut 40% from top and 10% from bottom, the box shifts down
  const verticalShift = ((topInset - bottomInset) * scaleH) / 2;

  return {
    left: leftDist,
    right: rightDist,
    top: topDist - verticalShift,
    bottom: bottomDist + verticalShift,
    // Store for debug rendering
    _scaleW: scaleW,
    _scaleH: scaleH,
    _insets: { top: topInset, side: sideInset, bottom: bottomInset },
  };
}

/**
 * Check which sides of an AABB are touching solid walls
 * Used for squeeze detection and push-away logic
 *
 * @param {number} targetX - Entity center X position (tiles)
 * @param {number} targetY - Entity center Y position (tiles)
 * @param {object} bounds - Bounding box definition with left, right, top, bottom
 * @returns {object} Object with left, right, top, bottom booleans
 */
export function checkAABBWallSides(targetX, targetY, bounds) {
  const result = {
    left: false,
    right: false,
    top: false,
    bottom: false,
    debugPoints: [],
  };

  // Helper to check if a tile is solid and save debug info
  const checkPoint = (x, y, side) => {
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    let solid = false;

    if (
      tileY < 0 ||
      tileY >= map.length ||
      tileX < 0 ||
      tileX >= map[0].length
    ) {
      solid = true;
    } else {
      const cell = map[tileY][tileX];
      const tileId = typeof cell === "object" ? cell.id || 0 : cell;
      const block = BLOCK_DEFS[tileId] || DEFAULT_BLOCK;
      solid = block.solid;
    }

    // Store debug info if window.debugMode is on
    if (window.debugMode) {
      result.debugPoints.push({ x, y, solid, side });
    }
    return solid;
  };

  // Check left side (sample multiple points along the edge)
  // Check BOTH outside and ON the edge to detect overlap
  const leftX = targetX - bounds.left;
  const topY = targetY - bounds.top;
  const bottomY = targetY + bounds.bottom;
  const centerY = targetY;
  const insetY = 0.1; // Inset from corners to avoid diagonal false-positives
  const searchDepth = 0.4; // Search deeper (0.4) to detect entrapment (enough for off-center but not too far)

  // Left edge: check points at edge and deeper inside
  if (
    checkPoint(leftX, topY + insetY, "left") ||
    checkPoint(leftX - searchDepth, topY + insetY, "left") ||
    checkPoint(leftX, centerY, "left") ||
    checkPoint(leftX - searchDepth, centerY, "left") ||
    checkPoint(leftX, bottomY - insetY, "left") ||
    checkPoint(leftX - searchDepth, bottomY - insetY, "left")
  ) {
    result.left = true;
  }

  // Right edge
  const rightX = targetX + bounds.right;
  if (
    checkPoint(rightX, topY + insetY, "right") ||
    checkPoint(rightX + searchDepth, topY + insetY, "right") ||
    checkPoint(rightX, centerY, "right") ||
    checkPoint(rightX + searchDepth, centerY, "right") ||
    checkPoint(rightX, bottomY - insetY, "right") ||
    checkPoint(rightX + searchDepth, bottomY - insetY, "right")
  ) {
    result.right = true;
  }

  // Top edge
  const leftXInner = targetX - bounds.left;
  const rightXInner = targetX + bounds.right;
  const centerX = targetX;
  const insetX = 0.1; // Inset from corners
  if (
    checkPoint(leftXInner + insetX, topY, "top") ||
    checkPoint(leftXInner + insetX, topY - searchDepth, "top") ||
    checkPoint(centerX, topY, "top") ||
    checkPoint(centerX, topY - searchDepth, "top") ||
    checkPoint(rightXInner - insetX, topY, "top") ||
    checkPoint(rightXInner - insetX, topY - searchDepth, "top")
  ) {
    result.top = true;
  }

  // Bottom edge
  if (
    checkPoint(leftXInner + insetX, bottomY, "bottom") ||
    checkPoint(leftXInner + insetX, bottomY + searchDepth, "bottom") ||
    checkPoint(centerX, bottomY, "bottom") ||
    checkPoint(centerX, bottomY + searchDepth, "bottom") ||
    checkPoint(rightXInner - insetX, bottomY, "bottom") ||
    checkPoint(rightXInner - insetX, bottomY + searchDepth, "bottom")
  ) {
    result.bottom = true;
  }

  return result;
}
