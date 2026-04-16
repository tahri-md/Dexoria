import type { Pokemon, Player } from "../models/index.ts";
import inquirer from "inquirer";

export async function playerSelectMove(pokemon: Pokemon): Promise<any> {
    const move_choices = pokemon.moves.map(m => m.name);
    const player_move_choice = await inquirer.prompt([{
        type: "list",
        name: "move",
        message: "Choose your move",
        choices: move_choices
    }]);
    return pokemon.moves.find(m => m.name === player_move_choice.move)!;
}

export function botSelectMoveRandom(pokemon: Pokemon): any {
    const randomIndex = Math.floor(Math.random() * pokemon.moves.length);
    return pokemon.moves[randomIndex]!;
}

export async function playerSelectPokemon(player: Player): Promise<void> {
    const player_pokemons = player.pokemons.filter(e => e.is_alive).map(e => e.name);
    const pokemon = await inquirer.prompt([{
        type: "list",
        name: "pokemon",
        message: "Choose your pokemon",
        choices: player_pokemons
    }]);
    
    player.pokemon_on_play = player.pokemons.find(pk => pk.name == pokemon.pokemon)!;
    player.pokemon_on_play.is_alive = true;
    player.pokemon_on_play.hp = 300;

    console.log(`${player.pokemon_on_play.name} enters the battle!`);
}

export function botSelectPokemonRandom(alive_pokemons: Pokemon[]): Pokemon {
    if (alive_pokemons.length === 0) {
        throw new Error("No alive pokemon for bot to choose from");
    }
    const randomIndex = Math.floor(Math.random() * alive_pokemons.length);
    const selected = alive_pokemons[randomIndex]!;
    selected.is_alive = true;
    selected.hp = 300;
    return selected;
}

export function displayBattleStatus(player: Player, bot: Player): void {
    console.log(`\n${player.pokemon_on_play.name} (HP: ${player.pokemon_on_play.hp}) vs ${bot.pokemon_on_play.name} (HP: ${bot.pokemon_on_play.hp})`);
}

export function displayAttack(attacker: string, move: any, damage: number): void {
    console.log(`${attacker} used ${move.name}! Dealt ${damage} damage.`);
}

export function displayPokemonFainted(pokemonName: string): void {
    console.log(`${pokemonName} fainted!`);
}
