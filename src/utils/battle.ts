import type { Pokemon, Player } from "../models/index.ts";
import inquirer from "inquirer";

export async function playerSelectMove(attacker: Pokemon, defender: Pokemon): Promise<any> {
    const availableMoves = attacker.moves.filter(m => m.pp > 0);
    
    if (availableMoves.length === 0) {
        console.log(`${attacker.name} has no moves with PP remaining!`);
        return {
            name: "Struggle",
            power: 50,
            accuracy: 100,
            pp: 1,
            maxPp: 1,
            type: "normal"
        };
    }
    
    const move_choices = availableMoves.map(m => {
        const damage = calculateDamage(attacker, defender, m);
        return `${m.name} (DMG: ${damage} | PP: ${m.pp}/${m.maxPp})`;
    });
    const player_move_choice = await inquirer.prompt([{
        type: "list",
        name: "move",
        message: "Choose your move",
        choices: move_choices
    }]);
    
    const selectedMoveName = player_move_choice.move.split(" (")[0];
    return attacker.moves.find(m => m.name === selectedMoveName)!;
}

export function botSelectMoveRandom(pokemon: Pokemon): any {
    const availableMoves = pokemon.moves.filter(m => m.pp > 0);
    
    if (availableMoves.length === 0) {
        return {
            name: "Struggle",
            power: 50,
            accuracy: 100,
            pp: 1,
            maxPp: 1,
            type: "normal"
        };
    }
    
    const randomIndex = Math.floor(Math.random() * availableMoves.length);
    return availableMoves[randomIndex]!;
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
    player.pokemon_on_play.hp = player.pokemon_on_play.maxHp;

    console.log(`${player.pokemon_on_play.name} enters the battle!`);
}

export function botSelectPokemonRandom(alive_pokemons: Pokemon[]): Pokemon {
    if (alive_pokemons.length === 0) {
        throw new Error("No alive pokemon for bot to choose from");
    }
    const randomIndex = Math.floor(Math.random() * alive_pokemons.length);
    const selected = alive_pokemons[randomIndex]!;
    selected.is_alive = true;
    selected.hp = selected.maxHp;
    return selected;
}

export function displayBattleStatus(player: Player, bot: Player): void {
    console.log(`\n${player.pokemon_on_play.name} (HP: ${player.pokemon_on_play.hp}/${player.pokemon_on_play.maxHp}) vs ${bot.pokemon_on_play.name} (HP: ${bot.pokemon_on_play.hp}/${bot.pokemon_on_play.maxHp})`);
}

export function displayAttack(attacker: string, move: any, damage: number, isCritical: boolean = false, isAccurate: boolean = true): void {
    const criticalText = isCritical ? " (CRITICAL HIT!)" : "";
    const accuracyText = !isAccurate ? " (missed!)" : "";
    console.log(`${attacker} used ${move.name}!${accuracyText}${criticalText} Dealt ${damage} damage.`);
}

export function displayPokemonFainted(pokemonName: string): void {
    console.log(`${pokemonName} fainted!`);
}

export function calculateDamage(attacker: Pokemon, defender: Pokemon, move: any): number {
    const level = 50;
    
    let attackStat = attacker.stats.attack;
    let defenseStat = defender.stats.defense;
    
    if (move.type === 'special' || move.type === 'psychic' || move.type === 'fire' || move.type === 'water') {
        attackStat = attacker.stats.spAtk;
    }
    
    const baseDamage = ((2 * level / 5 + 2) * (move.power || 50) * attackStat / defenseStat / 50 + 2);
    const randomModifier = 0.85 + Math.random() * 0.15;
    
    return Math.floor(baseDamage * randomModifier);
}

export function checkAccuracy(move: any): boolean {
    const accuracy = move.accuracy || 100;
    const roll = Math.random() * 100;
    return roll <= accuracy;
}

export function checkCriticalHit(attacker: Pokemon): boolean {
    const critChance = 6.25 + (attacker.stats.speed / 2000);
    const roll = Math.random() * 100;
    return roll <= critChance;
}

export function consumeMovePP(move: any): void {
    if (move.pp > 0) {
        move.pp--;
    }
}
