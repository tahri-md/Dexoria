import type { Pokemon } from "./Pokemon.ts"

export interface Player {
    name: string;
    pokemons: Pokemon[];
    hearts:number,
    pokemon_on_play:Pokemon
}
