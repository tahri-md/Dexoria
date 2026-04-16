import type { Pokemon } from "../models/Pokemon.ts";

export async function fetchPokemonByName(pokemonName: string): Promise<any> {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
    return response.json();
}

export async function fetchPokemonById(id: number): Promise<any> {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    return response.json();
}

export async function fetchMoveDetails(moveUrl: string): Promise<any> {
    const response = await fetch(moveUrl);
    return response.json();
}

export async function parsePokemonData(pokemonData: any): Promise<Pokemon> {
    const movesData = await Promise.all(
        pokemonData.moves.slice(0, 4).map(async (move: any) => {
            const moveData = await fetchMoveDetails(move.move.url);
            return {
                name: moveData.name,
                power: moveData.power,
                accuracy: moveData.accuracy,
                pp: moveData.pp,
                type: moveData.type.name
            };
        })
    );

    return {
        name: pokemonData.name,
        hp: 300,
        is_alive: true,
        moves: movesData
    };
}
