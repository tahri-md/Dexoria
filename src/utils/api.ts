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
                power: moveData.power || 0,
                accuracy: moveData.accuracy || 100,
                pp: moveData.pp,
                maxPp: moveData.pp,
                type: moveData.type.name
            };
        })
    );

    const stats = pokemonData.stats.reduce((acc: any, stat: any) => {
        const statName = stat.stat.name;
        const baseValue = stat.base_stat;
        
        switch(statName) {
            case 'attack':
                acc.attack = baseValue;
                break;
            case 'defense':
                acc.defense = baseValue;
                break;
            case 'speed':
                acc.speed = baseValue;
                break;
            case 'sp-atk':
                acc.spAtk = baseValue;
                break;
        }
        return acc;
    }, { attack: 50, defense: 50, speed: 50, spAtk: 50 });

    const maxHp = 300;

    return {
        name: pokemonData.name,
        hp: maxHp,
        maxHp: maxHp,
        is_alive: true,
        stats: stats,
        moves: movesData
    };
}
