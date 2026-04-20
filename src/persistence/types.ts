import type { Player, Pokemon } from "../models/index.ts";

export interface SaveFileData {
  version: string;
  timestamp: string;
  playerName: string;
  turn: number;
  gamePhase: "ongoing" | "playerWon" | "botWon";
  player: {
    name: string;
    pokemons: SerializedPokemon[];
    pokemon_on_play_index: number;
    hearts: number;
  };
  bot: {
    name: string;
    pokemons: SerializedPokemon[];
    pokemon_on_play_index: number;
    hearts: number;
  };
}

export interface SerializedPokemon {
  name: string;
  hp: number;
  maxHp: number;
  is_alive: boolean;
  stats: {
    attack: number;
    defense: number;
    speed: number;
    spAtk: number;
  };
  moves: Array<{
    name: string;
    power: number | null;
    accuracy: number | null;
    pp: number;
    maxPp: number;
    type: string;
  }>;
}

export interface SaveMetadata {
  fileName: string;
  playerName: string;
  timestamp: string;
  gamePhase: string;
}
