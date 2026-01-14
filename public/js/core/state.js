export const gameState = {
  haze: 0,
  running: true,

  // Artifact Hunt
  targetArtifactLoc: null, // {x, y}
  targetArtifactItem: null, // The item definition
  hasArtifact: false,
  gameWon: false,

  // Exit locations (cached at start for efficient compass lookup)
  exitSpots: [],
  targetExitLoc: null, // The chosen exit (selected when artifact is picked up)

  // Inventory & Currency
  embers: 0,
  inventory: {
    food: 0,
  },

  // Session Stats
  startTime: Date.now(),
  embersCollected: 0,
};
