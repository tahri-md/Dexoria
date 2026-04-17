import type { Player, Pokemon } from "../models/index.ts";
import { MenuPart, showPauseMenu, showLoadGameMenu } from "../views/MenuPart.ts";
import { GAME_STATE, PAUSE_MENU_OPTIONS } from "../utils/constants.ts";
import inquirer from "inquirer";
import keypress from "keypress";
import { fetchPokemonByName, fetchPokemonById, parsePokemonData } from "../utils/api.ts";
import { playerSelectMove, botSelectMoveRandom, playerSelectPokemon, botSelectPokemonRandom, displayBattleStatus, displayAttack, displayPokemonFainted } from "../utils/battle.ts";
import { SaveManager } from "../persistence/index.ts";

export { GAME_STATE };

export class Game {
    gameState: typeof GAME_STATE[keyof typeof GAME_STATE];
    player: Player
    bot: Player
    isPaused: boolean = false
    turnCounter: number = 0
    gamePhase: "ongoing" | "playerWon" | "botWon" = "ongoing"
    isLoadedGame: boolean = false

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
                await this.saveCurrentGame();
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

    private async saveCurrentGame(): Promise<void> {
        try {
            const { name: saveName } = await inquirer.prompt([
                {
                    type: 'string',
                    name: 'name',
                    message: 'Enter save name (or press enter for auto-name)',
                    default: `save_${new Date().toISOString().split('T')[0]}`
                }
            ]);

            await SaveManager.saveGameState(
                this.player,
                this.bot,
                this.turnCounter,
                this.gamePhase,
                saveName
            );
            
            console.log('Game saved! Resuming battle...');
        } catch (error) {
            console.error('Failed to save game:', error);
        }
    }

    private async loadGameFromSave(fileName: string): Promise<boolean> {
        try {
            const loaded = await SaveManager.loadGameState(fileName);
            if (loaded) {
                this.player = loaded.player;
                this.bot = loaded.bot;
                this.turnCounter = loaded.turn;
                this.gamePhase = loaded.gamePhase as "ongoing" | "playerWon" | "botWon";
                console.log(`\nGame loaded! Turn ${this.turnCounter}\n`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading game:', error);
            return false;
        }
    }

    private async resumeLoadedGame(): Promise<void> {
        this.setupKeyboardListener();
        console.log(`\nResuming battle: ${this.player.name} vs Bot`);
        console.log(`Current turn: ${this.turnCounter}`);
        console.log('(Press ESC to pause)\n');
        
        await this.game_start();
    }

    async in_game() {
        if (!this.isLoadedGame) {
            await this.playerInfos()
            await this.botChoosePokemon()
            console.log("\nBattle is starting...")
        }
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

                this.turnCounter++
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
            this.gamePhase = "playerWon"
            console.log(`${this.player.name} WINS!`)
        } else {
            this.gamePhase = "botWon"
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
                const menuChoice = await MenuPart(this.gameState);
                
                if (menuChoice === 'NEW_GAME') {
                    this.gameState = GAME_STATE.IN_GAME;
                    await this.in_game();
                } else if (menuChoice === 'LOAD_GAME') {
                    const saveFile = await showLoadGameMenu();
                    if (saveFile) {
                        const loaded = await this.loadGameFromSave(saveFile);
                        if (loaded) {
                            this.isLoadedGame = true;
                            this.gameState = GAME_STATE.IN_GAME;
                            await this.resumeLoadedGame();
                        } else {
                            console.log('Failed to load game. Returning to menu...');
                            await this.play();
                        }
                    } else {
                        await this.play();
                    }
                }
                break;
            case GAME_STATE.IN_GAME:
                await this.in_game();
                break;
            default:
                console.log("Unknown state");
        }
    }
}
