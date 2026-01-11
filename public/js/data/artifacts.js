export const ARTIFACTS = [
    {
        id: "crown_of_souls",
        name: "Crown of Souls",
        description: "A jagged iron crown, cold to the touch. Whispers of past kings echo when held.",
        value: 18,
        icon: "👑" // Placeholder, can be replaced with sprite coordinates later
    },
    {
        id: "ember_heart",
        name: "Ember Heart",
        description: "A pulsating stone of pure heat. It keeps you warm in the ice caverns.",
        value: 22,
        icon: "❤️‍🔥"
    },
    {
        id: "frost_fang",
        name: "Frost Fang",
        description: "A tooth from a beast long extinct, dripping with permafrost.",
        value: 26,
        icon: "🦷"
    },
    {
        id: "shadow_compass",
        name: "Shadow Compass",
        description: "It doesn't point north, but deeper into the darkness.",
        value: 28,
        icon: "🧭"
    }
];

export function getRandomArtifact() {
    return ARTIFACTS[Math.floor(Math.random() * ARTIFACTS.length)];
}
