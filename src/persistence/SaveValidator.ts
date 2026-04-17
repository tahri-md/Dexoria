import type { SaveFileData } from "./types.ts";

export class SaveValidator {
  static validateSaveData(data: any): data is SaveFileData {
    if (!data) {
      console.error("Save data is empty");
      return false;
    }

    if (!data.version || typeof data.version !== "string") {
      console.error("Invalid or missing version");
      return false;
    }

    if (!data.timestamp || typeof data.timestamp !== "string") {
      console.error("Invalid or missing timestamp");
      return false;
    }

    if (!data.playerName || typeof data.playerName !== "string") {
      console.error("Invalid or missing player name");
      return false;
    }

    if (typeof data.turn !== "number") {
      console.error("Invalid turn counter");
      return false;
    }

    if (
      !["ongoing", "playerWon", "botWon"].includes(data.gamePhase)
    ) {
      console.error("Invalid game phase");
      return false;
    }

    if (!data.player || !data.bot) {
      console.error("Missing player or bot data");
      return false;
    }

    if (
      !Array.isArray(data.player.pokemons) ||
      !Array.isArray(data.bot.pokemons)
    ) {
      console.error("Invalid pokemon arrays");
      return false;
    }

    if (
      typeof data.player.pokemon_on_play_index !== "number" ||
      typeof data.bot.pokemon_on_play_index !== "number"
    ) {
      console.error("Invalid active pokemon index");
      return false;
    }

    return true;
  }

  static validatePokemonData(pokemon: any): boolean {
    if (!pokemon.name || typeof pokemon.name !== "string") {
      console.error("Invalid pokemon name");
      return false;
    }

    if (typeof pokemon.hp !== "number" || pokemon.hp < 0) {
      console.error("Invalid pokemon HP");
      return false;
    }

    if (typeof pokemon.is_alive !== "boolean") {
      console.error("Invalid pokemon alive status");
      return false;
    }

    if (!Array.isArray(pokemon.moves)) {
      console.error("Invalid pokemon moves");
      return false;
    }

    return true;
  }
}
