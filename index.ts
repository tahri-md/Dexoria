#!/usr/bin/env node
// Entry point - delegates to reorganized src/index.ts
import { Game, GAME_STATE } from "./src/game/Game.ts";
import type { Player } from "./src/models/index.ts"

async function main() {
    let player: Player = { name: "", pokemons: [], hearts: 3, pokemon_on_play: {} as any }
    let bot: Player = { name: "BOT", pokemons: [], hearts: 3, pokemon_on_play: {} as any }
    const game = new Game(GAME_STATE.MENU_PART, player, bot);
    await game.play();
}

main();