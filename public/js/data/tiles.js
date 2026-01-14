export const SHEET_TILE_SIZE = 32;

// ===== Biome Definitions =====
// Defines the available biomes for procedural generation
export const BIOME_DEFS = {
  0: {
    id: 0,
    name: "Ice",
    color: "#00bcd4",
    description: "Frozen caverns with slippery floors",
  },
  1: {
    id: 1,
    name: "Dark",
    color: "#5d4037",
    description: "Shadowy depths with hazardous terrain",
  },
  2: {
    id: 2,
    name: "Ruins",
    color: "#666666",
    description: "Ancient stone structures",
  },
};

// ===== Block/Tile Definitions =====
export const BLOCK_DEFS = {
  0: {
    name: "Stone",
    color: "#222",
    solid: false,
    slideFactor: 0.8,
    sheetIndex: [
      [6, 6],
      [7, 7],
    ],
    biomes: [1, 2], // Dark, Ruins
  },
  1: {
    name: "Ice Wall",
    color: "#9dc8cda5",
    solid: true,
    biomes: [0], // Ice
    sheetIndex: [
      [2, 1],
      [3, 1],
      [2, 0],
      [3, 0],
    ],
  },
  2: {
    name: "Ice Floor",
    color: "#00bcd4",
    solid: false,
    biomes: [0], // Ice
    slideFactor: 0.96,
    sheetIndex: [
      [4, 0],
      [5, 0],
      [5, 1],
      [4, 1],
    ],
  },
  4: {
    name: "Wall",
    color: "#666",
    solid: true,
    biomes: [2], // Ruins
    sheetIndex: [
      [0, 1],
      [1, 0],
    ],
  },
  5: {
    name: "Wall2",
    color: "#444",
    solid: true,
    biomes: [1], // Dark
    sheetIndex: [
      [0, 2],
      [1, 3],
      [1, 2],
      [0, 3],
    ],
  },
  6: {
    name: "Salt",
    color: "#ddd",
    solid: false, // No biomes = Universal floor tile
    enemyBlocked: true,
    slideFactor: 0.8,
    sheetIndex: [
      [7, 2],
      [6, 2],
      [6, 3],
      [7, 3],
    ],
  },
  7: {
    name: "Bush",
    color: "#343",
    solid: false,
    slideFactor: 0.7,
    sheetIndex: [1, 6], // No biomes = Universal decoration
    hidden: true,
  },
  8: {
    name: "Berry",
    color: "#f0f",
    solid: false,
    slideFactor: 0.7,
    sheetIndex: [0, 6], // No biomes = Universal decoration
    hidden: true,
  },
  9: {
    name: "Lava",
    color: "#d32f2f",
    solid: false,
    biomes: [1], // Dark
    damage: 1,
    slideFactor: 0.8,
    sheetIndex: [
      [4, 4],
      [5, 4],
      [5, 5],
      [4, 5],
    ],
  },
  11: {
    name: "Void",
    color: "#111",
    solid: true,
    sheetIndex: [
      [1, 5],
      [0, 4],
      [1, 4],
      [0, 5],
    ], // No biomes = Universal wall (border)
  },
  12: {
    name: "Mud",
    color: "#5d4037",
    solid: false,
    biomes: [1], // Dark
    slideFactor: 0.4,
    z: -1,
    sheetIndex: [
      [3, 2],
      [2, 2],
      [2, 3],
      [3, 3],
    ],
  },
  13: {
    name: "Water",
    color: "#29b6f6",
    solid: false,
    slideFactor: 0.6,
    z: -1,
    sheetIndex: [
      [4, 2],
      [4, 3],
      [5, 3],
      [5, 2],
    ], // No biomes = Universal floor tile
  },
  99: {
    name: "Artifact",
    color: "#000000",
    solid: false,
    slideFactor: 0.8,
    sheetIndex: [3, 11], // No biomes = Special placement tile
  },
};

export const DEFAULT_BLOCK = {
  name: "Void",
  color: "magenta",
  solid: true,
  sheetIndex: [0, 3],
};
