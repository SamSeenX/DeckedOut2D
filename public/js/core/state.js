export const gameState = {
    clank: 0,
    running: true,

    // Artifact Hunt
    targetArtifactLoc: null, // {x, y}
    targetArtifactItem: null, // The item definition
    hasArtifact: false,
    gameWon: false,

    // Inventory & Currency
    embers: 0,
    inventory: {
        food: 0
    },

    // Session Stats
    startTime: Date.now(),
    embersCollected: 0
};

