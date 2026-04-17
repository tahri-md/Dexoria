import type { Player, Pokemon } from "../models/index.ts";
import { MenuPart, showPauseMenu } from "../views/MenuPart.ts";
import { GAME_STATE, PAUSE_MENU_OPTIONS } from "../utils/constants.ts";
import inquirer from "inquirer";
import keypress from "keypress";
import { fetchPokemonByName, fetchPokemonById, parsePokemonData } from "../utils/api.ts";
import { playerSelectMove, botSelectMoveRandom, playerSelectPokemon, botSelectPokemonRandom, displayBattleStatus, displayAttack, displayPokemonFainted } from "../utils/battle.ts";

export { GAME_STATE };

export class Game {
    gameState: typeof GAME_STATE[keyof typeof GAME_STATE];
    player: Player
    bot: Player
    isPaused: boolean = false

    constructor(gameState: typeof GAME_STATE[keyof typeof GAME_STATE], player: Player, bot: Player) {
        this.gameState = gameState;
        this.player = player
        this.bot = bot
    }

    private setupKeyboardListener() {
        keypress(process.stdin);
        process.stdin.on('keypress', (ch, key) => {
            if (key && key.name === 'escape') {
                this.isPaused = true;
            }
        });
        process.stdin.setRawMode(true);
        process.stdin.resume();
    }

    private stopKeyboardListener() {
        process.stdin.setRawMode(false);
        process.stdin.pause();
    }

    private async handlePause() {
        this.gameState = GAME_STATE.PAUSED;
        this.stopKeyboardListener();
        
        console.log('\n');
        const choice = await showPauseMenu();
        
        switch (choice) {
            case PAUSE_MENU_OPTIONS.RESUME:
                this.isPaused = false;
                this.gameState = GAME_STATE.IN_GAME;
                this.setupKeyboardListener();
                console.log('\nBattle resumed...\n');
                break;
            case PAUSE_MENU_OPTIONS.SAVE:
                console.log("\nSave game feature coming soon!");
                this.isPaused = false;
                this.gameState = GAME_STATE.IN_GAME;
                this.setupKeyboardListener();
                break;
            case PAUSE_MENU_OPTIONS.MAIN_MENU:
                this.stopKeyboardListener();
                console.log("\nReturning to main menu...");
                process.exit(0);
                break;
        }
    }

    async in_game() {
        await this.playerInfos()
        await this.botChoosePokemon()

        console.log("\nBattle is starting...")
        this.game_start()
    }

    async game_start() {
        this.setupKeyboardListener();
        console.log('(Press ESC to pause)\n');
        
        await playerSelectPokemon(this.player)
        const alivePokemons = this.bot.pokemons.filter(p => p.is_alive)
        await this.botSelectPokemonRound(alivePokemons)

        console.log(`\n=== BATTLE START ===`)
        console.log(`${this.player.name} vs Bot\n`)
        
        let playerHasAlive = true
        let botHasAlive = true
        
        while (playerHasAlive && botHasAlive) {
            if (this.isPaused) {
                await this.handlePause();
            }

            while (this.player.pokemon_on_play.is_alive && this.bot.pokemon_on_play.is_alive) {
                if (this.isPaused) {
                    await this.handlePause();
                }

                displayBattleStatus(this.player, this.bot)
                
                const player_move = await playerSelectMove(this.player.pokemon_on_play)
                const player_damage = player_move.power || 0
                this.bot.pokemon_on_play.hp -= player_damage
                displayAttack(this.player.pokemon_on_play.name, player_move, player_damage)
                
                if (this.bot.pokemon_on_play.hp <= 0) {
                    displayPokemonFainted(this.bot.pokemon_on_play.name)
                    this.bot.pokemon_on_play.is_alive = false
                    break
                }
                
                const bot_move = botSelectMoveRandom(this.bot.pokemon_on_play)
                const bot_damage = bot_move.power || 0
                this.player.pokemon_on_play.hp -= bot_damage
                displayAttack(this.bot.pokemon_on_play.name, bot_move, bot_damage)
                
                if (this.player.pokemon_on_play.hp <= 0) {
                    displayPokemonFainted(this.player.pokemon_on_play.name)
                    this.player.pokemon_on_play.is_alive = false
                    break
                }
            }
            
            if (!this.player.pokemon_on_play.is_alive) {
                const alivePlayer = this.player.pokemons.filter(p => p.is_alive)
                if (alivePlayer.length > 0) {
                    console.log(`${this.player.name}, choose your next pokemon!`)
                    await playerSelectPokemon(this.player)
                } else {
                    playerHasAlive = false
                    console.log(`${this.player.name} is out of pokemon!`)
                }
            }
            
            if (!this.bot.pokemon_on_play.is_alive) {
                const aliveBot = this.bot.pokemons.filter(p => p.is_alive)
                if (aliveBot.length > 0) {
                    await this.botSelectPokemonRound(aliveBot)
                    console.log(`Bot sent out: ${this.bot.pokemon_on_play.name}`)
                } else {
                    botHasAlive = false
                    console.log(`Bot is out of pokemon!`)
                }
            }
        }
        
        this.stopKeyboardListener();
        console.log(`\n=== BATTLE END ===`)
        if (playerHasAlive) {
            console.log(`${this.player.name} WINS!`)
        } else {
            console.log(`Bot WINS!`)
        }
    }

    async botSelectPokemonRound(alivePokemons: Pokemon[]) {
        const selected = botSelectPokemonRandom(alivePokemons)
        this.bot.pokemon_on_play = selected
        console.log(`Bot sent out: ${this.bot.pokemon_on_play.name}`)
    }

    async playerInfos() {
        const { name } = await inquirer.prompt([{
            type: 'string',
            name: 'name',
            message: 'Enter your trainer name',
        }])

        this.player.name = name

        for (let i = 0; i < 3; i++) {
            const { pokemonName } = await inquirer.prompt([{
                type: 'string',
                name: 'pokemonName',
                message: `Enter pokemon name (${i + 1}/3)`,
            }])
            
            const data = await fetchPokemonByName(pokemonName)
            const pokemon = await parsePokemonData(data)
            this.player.pokemons.push(pokemon)
            this.player.pokemons.forEach(p => p.is_alive = true)
        }
    }

    async botChoosePokemon() {
        console.log("Bot is selecting its team...");

        for (let i = 0; i < 3; i++) {
            const randomId = Math.floor(Math.random() * 1025) + 1;

            try {
                const data = await fetchPokemonById(randomId)
                const pokemon = await parsePokemonData(data)
                this.bot.pokemons.push(pokemon)
                console.log(`  - ${pokemon.name}`)
            } catch (error) {
                i--
            }
        }
        this.player.pokemons.forEach(pokemon => pokemon.is_alive = true)
    }

    async play() {
        switch (this.gameState) {
            case GAME_STATE.MENU_PART:
                await MenuPart(this.gameState);
            case GAME_STATE.IN_GAME:
                await this.in_game();
                break;
            default:
                console.log("Unknown state");
        }
    }
}
