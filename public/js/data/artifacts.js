export const ARTIFACTS = [
    {
        id: "crown_of_souls",
        name: "Crown of Souls",
        description: "Forged in the fires of the Nether, this iron crown was once worn by the mad King Thrandor. It is said that the souls of his betrayed generals are bound to its jagged spikes.",
        value: 18,
        icon: "crown_of_souls.webp",
        glow: "#ffcc00"
    },
    {
        id: "ember_heart",
        name: "Ember Heart",
        description: "A pulsating core extracted from a dormant Volcanic Golem. Even centuries later, it radiates an undying heat that can never be extinguished.",
        value: 22,
        icon: "ember_heart.webp",
        glow: "#ffcc00"
    },
    {
        id: "frost_fang",
        name: "Frost Fang",
        description: "A massive, crystalline fang shed by the Great Wyrm of the North. It remains perpetually frozen, instantly turning moisture in the air into snow.",
        value: 26,
        icon: "frost_fang.webp",
        glow: "#ffcc00"
    },
    {
        id: "shadow_compass",
        name: "Shadow Compass",
        description: "This navigational instrument defies magnetism. Its needle spins wildly in daylight but locks onto the purest sources of darkness at night.",
        value: 28,
        icon: "shadow_compass.webp",
        glow: "#ffcc00"
    },
    {
        id: "void_lantern",
        name: "Void Lantern",
        description: "A lantern that burns with a cold, black flame. It illuminates nothing, but reveals things that should remain unseen.",
        value: 30,
        icon: "void_lantern.webp",
        glow: "#ffcc00"
    },
    {
        id: "crystal_skull",
        name: "Crystal Skull",
        description: "Carved from a single block of star-glass. Staring into its eyes for too long induces visions of worlds that have long since burned to ash.",
        value: 25,
        icon: "crystal_skull.webp",
        glow: "#ffcc00"
    },
    {
        id: "golden_scarab",
        name: "Golden Scarab",
        description: "An ancient mechanical automaton from the Desert of Sands. It ticks faintly, counting down to an apocalypse predicted millennia ago.",
        value: 19,
        icon: "golden_scarab.webp",
        glow: "#ffcc00"
    },
    {
        id: "phoenix_feather",
        name: "Phoenix Feather",
        description: "A single feather that feels warm to the touch. It is said to turn to ash and reform at dawn, eternal and undying.",
        value: 24,
        icon: "phoenix_feather.webp",
        glow: "#ffcc00"
    },
    {
        id: "obsidian_dagger",
        name: "Obsidian Dagger",
        description: "A blade so sharp it cuts the very air. Used by the Cult of the Deep to sever ties with the mortal realm.",
        value: 17,
        icon: "obsidian_dagger.webp",
        glow: "#ffcc00"
    },
    {
        id: "lunar_chalice",
        name: "Lunar Chalice",
        description: "A goblet made of moonstone. Water poured into it glows with specific luminescence, granting clarity of mind to those who drink.",
        value: 21,
        icon: "lunar_chalice.webp",
        glow: "#ffcc00"
    },
    {
        id: "storm_caller",
        name: "Storm Caller",
        description: "A horn carved from a thunder beast's bone. One blow summons storm clouds, two summons lightning, three summons the end.",
        value: 29,
        icon: "storm_caller.webp",
        glow: "#ffcc00"
    },
    {
        id: "emerald_tablet",
        name: "Emerald Tablet",
        description: "A stone tablet inscribed with the secrets of alchemy. It is said to hold the formula for the Elixir of Life, but the language is dead.",
        value: 32,
        icon: "emerald_tablet.webp",
        glow: "#ffcc00"
    },
    {
        id: "cursed_coin",
        name: "Cursed Coin",
        description: "Gold from a pirate lord's treasure. It always returns to its owner, but brings misfortune and sea storms with it.",
        value: 66,
        icon: "cursed_coin.webp",
        glow: "#ffcc00"
    },
    {
        id: "spectral_mirror",
        name: "Spectral Mirror",
        description: "A hand mirror that shows not your reflection, but the entity standing directly behind you.",
        value: 23,
        icon: "spectral_mirror.webp",
        glow: "#ffcc00"
    },
    {
        id: "ancient_mask",
        name: "Ancient Mask",
        description: "A wooden mask from a lost civilization. Wearing it grants strength, but the wearer slowly forgets their own name.",
        value: 20,
        icon: "ancient_mask.webp",
        glow: "#ffcc00"
    },
    {
        id: "titan_gauntlet",
        name: "Titan Gauntlet",
        description: "A glove sized for a giant, made of unbreaking metal. It hums with the kinetic energy of a thousand earthquakes.",
        value: 35,
        icon: "titan_gauntlet.webp",
        glow: "#ffcc00"
    },
    {
        id: "star_map",
        name: "Star Map",
        description: "A scroll depicting constellations that do not exist in the current sky. It charts a course to the edge of the universe.",
        value: 31,
        icon: "star_map.webp",
        glow: "#ffcc00"
    },
    {
        id: "soul_gem",
        name: "Soul Gem",
        description: "A purple gem that swirls with trapped mists. Sometimes, faint tapping can be heard from within.",
        value: 27,
        icon: "soul_gem.webp",
        glow: "#ffcc00"
    },
    {
        id: "dragon_egg",
        name: "Dragon Egg",
        description: "A heavy, scaled egg that is scorching hot. It vibrates with a heartbeat that is slow, powerful, and terrifying.",
        value: 40,
        icon: "dragon_egg.webp",
        glow: "#ffcc00"
    },
    {
        id: "runic_hourglass",
        name: "Runic Hourglass",
        description: "The sand inside flows upwards. It is rumored to be able to turn back time by exactly one minute, once every century.",
        value: 33,
        icon: "runic_hourglass.webp",
        glow: "#ffcc00"
    },
    {
        id: "whispering_key",
        name: "Whispering Key",
        description: "A skeleton key made of bone. It fits into any lock, and the door it opens always leads to somewhere... else.",
        value: 15,
        icon: "whispering_key.webp",
        glow: "#ffcc00"
    }
];

export function getRandomArtifact() {
    return ARTIFACTS[Math.floor(Math.random() * ARTIFACTS.length)];
}
