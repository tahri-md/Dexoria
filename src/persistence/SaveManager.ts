import type { Player } from "../models/index.ts";
import { GameSaver } from "./GameSaver.ts";
import { SaveValidator } from "./SaveValidator.ts";
import type { SaveFileData, SaveMetadata } from "./types.ts";

export class SaveManager {
  static async saveGameState(
    player: Player,
    bot: Player,
    turn: number,
    gamePhase: "ongoing" | "playerWon" | "botWon",
    fileName: string
  ): Promise<string> {
    try {
      const playerOnPlayIndex = player.pokemons.indexOf(
        player.pokemon_on_play
      );
      const botOnPlayIndex = bot.pokemons.indexOf(bot.pokemon_on_play);

      const saveData: SaveFileData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        playerName: player.name,
        turn,
        gamePhase,
        player: {
          name: player.name,
          pokemons: player.pokemons.map((p) => ({
            name: p.name,
            hp: p.hp,
            is_alive: p.is_alive,
            moves: p.moves,
          })),
          pokemon_on_play_index: playerOnPlayIndex,
          hearts: player.hearts,
        },
        bot: {
          name: bot.name,
          pokemons: bot.pokemons.map((p) => ({
            name: p.name,
            hp: p.hp,
            is_alive: p.is_alive,
            moves: p.moves,
          })),
          pokemon_on_play_index: botOnPlayIndex,
          hearts: bot.hearts,
        },
      };

      const filePath = await GameSaver.saveGame(saveData, fileName);
      console.log(`\nGame saved successfully: ${filePath}\n`);
      return filePath;
    } catch (error) {
      console.error("Error saving game:", error);
      throw error;
    }
  }

  static async loadGameState(
    fileName: string
  ): Promise<{ player: Player; bot: Player; turn: number; gamePhase: string } | null> {
    try {
      const saveData = await GameSaver.loadGame(fileName);

      if (!SaveValidator.validateSaveData(saveData)) {
        console.error("Invalid save file data");
        return null;
      }

      const playerPokemons = saveData.player.pokemons.map((p) => ({
        name: p.name,
        hp: p.hp,
        is_alive: p.is_alive,
        moves: p.moves,
      }));

      const botPokemons = saveData.bot.pokemons.map((p) => ({
        name: p.name,
        hp: p.hp,
        is_alive: p.is_alive,
        moves: p.moves,
      }));

      const player: Player = {
        name: saveData.player.name,
        pokemons: playerPokemons,
        hearts: saveData.player.hearts,
        pokemon_on_play: playerPokemons[saveData.player.pokemon_on_play_index]!,
      };

      const bot: Player = {
        name: saveData.bot.name,
        pokemons: botPokemons,
        hearts: saveData.bot.hearts,
        pokemon_on_play: botPokemons[saveData.bot.pokemon_on_play_index]!,
      };

      return {
        player,
        bot,
        turn: saveData.turn,
        gamePhase: saveData.gamePhase,
      };
    } catch (error) {
      console.error("Error loading game:", error);
      return null;
    }
  }

  static async listAvailableSaves(): Promise<SaveMetadata[]> {
    return GameSaver.listSaves();
  }

  static async deleteSaveFile(fileName: string): Promise<void> {
    return GameSaver.deleteSave(fileName);
  }
}
