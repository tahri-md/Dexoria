import type { Player, Pokemon } from "../models/index.ts";
import { MenuPart, showPauseMenu, showLoadGameMenu } from "../views/MenuPart.ts";
import { GAME_STATE, PAUSE_MENU_OPTIONS } from "../utils/constants.ts";
import inquirer from "inquirer";
import { createRequire } from "node:module";
import { fetchPokemonByName, fetchPokemonById, parsePokemonData } from "../utils/api.ts";
import { playerSelectMove, botSelectMoveRandom, playerSelectPokemon, botSelectPokemonRandom, displayBattleStatus, displayAttack, displayPokemonFainted } from "../utils/battle.ts";
import { SaveManager } from "../persistence/index.ts";
import { SocketClient } from "./client/Client.ts";

const require = createRequire(import.meta.url);
const keypress: (stream: NodeJS.ReadWriteStream) => void = require("keypress");

type MultiplayerRole = "host" | "guest";

type MultiplayerWireMessage =
    | { type: "room_created"; code: string }
    | { type: "room_joined"; code: string }
    | { type: "player_joined"; code: string }
    | { type: "game_start" }
    | { type: "error"; message?: string }
    | { type: "battle_setup"; player: { name: string; pokemons: string[] } }
    | { type: "active_pokemon"; pokemonName: string }
    | { type: "battle_move"; moveName: string };

export { GAME_STATE };

export class Game {
    gameState: typeof GAME_STATE[keyof typeof GAME_STATE];
    player: Player;
    bot: Player;
    isPaused: boolean = false;
    turnCounter: number = 0;
    gamePhase: "ongoing" | "playerWon" | "botWon" = "ongoing";
    isLoadedGame: boolean = false;

    constructor(gameState: typeof GAME_STATE[keyof typeof GAME_STATE], player: Player, bot: Player) {
        this.gameState = gameState;
        this.player = player;
        this.bot = bot;
    }

    private setupKeyboardListener() {
        keypress(process.stdin);
        process.stdin.on("keypress", (ch, key) => {
            if (key && key.name === "escape") {
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

        console.log("\n");
        const choice = await showPauseMenu();

        switch (choice) {
            case PAUSE_MENU_OPTIONS.RESUME:
                this.isPaused = false;
                this.gameState = GAME_STATE.IN_GAME;
                this.setupKeyboardListener();
                console.log("\nBattle resumed...\n");
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
                    type: "input",
                    name: "name",
                    message: "Enter save name (or press enter for auto-name)",
                    default: `save_${new Date().toISOString().split("T")[0]}`,
                },
            ]);

            await SaveManager.saveGameState(
                this.player,
                this.bot,
                this.turnCounter,
                this.gamePhase,
                saveName
            );

            console.log("Game saved! Resuming battle...");
        } catch (error) {
            console.error("Failed to save game:", error);
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
            console.error("Error loading game:", error);
            return false;
        }
    }

    private async resumeLoadedGame(): Promise<void> {
        this.setupKeyboardListener();
        console.log(`\nResuming battle: ${this.player.name} vs Bot`);
        console.log(`Current turn: ${this.turnCounter}`);
        console.log("(Press ESC to pause)\n");

        await this.game_start();
    }

    async in_game() {
        if (!this.isLoadedGame) {
            await this.playerInfos();
            await this.botChoosePokemon();
            console.log("\nBattle is starting...");
        }

        await this.game_start();
    }

    async game_start() {
        this.setupKeyboardListener();
        console.log("(Press ESC to pause)\n");

        await playerSelectPokemon(this.player);
        const alivePokemons = this.bot.pokemons.filter(pokemon => pokemon.is_alive);
        await this.botSelectPokemonRound(alivePokemons);

        console.log(`\n=== BATTLE START ===`);
        console.log(`${this.player.name} vs Bot\n`);

        let playerHasAlive = true;
        let botHasAlive = true;

        while (playerHasAlive && botHasAlive) {
            if (this.isPaused) {
                await this.handlePause();
            }

            while (this.player.pokemon_on_play.is_alive && this.bot.pokemon_on_play.is_alive) {
                if (this.isPaused) {
                    await this.handlePause();
                }

                displayBattleStatus(this.player, this.bot);

                const playerMove = await playerSelectMove(this.player.pokemon_on_play);
                const playerDamage = playerMove.power || 0;
                this.bot.pokemon_on_play.hp -= playerDamage;
                displayAttack(this.player.pokemon_on_play.name, playerMove, playerDamage);

                if (this.bot.pokemon_on_play.hp <= 0) {
                    displayPokemonFainted(this.bot.pokemon_on_play.name);
                    this.bot.pokemon_on_play.is_alive = false;
                    break;
                }

                const botMove = botSelectMoveRandom(this.bot.pokemon_on_play);
                const botDamage = botMove.power || 0;
                this.player.pokemon_on_play.hp -= botDamage;
                displayAttack(this.bot.pokemon_on_play.name, botMove, botDamage);

                if (this.player.pokemon_on_play.hp <= 0) {
                    displayPokemonFainted(this.player.pokemon_on_play.name);
                    this.player.pokemon_on_play.is_alive = false;
                    break;
                }

                this.turnCounter++;
            }

            if (!this.player.pokemon_on_play.is_alive) {
                const alivePlayer = this.player.pokemons.filter(pokemon => pokemon.is_alive);
                if (alivePlayer.length > 0) {
                    console.log(`${this.player.name}, choose your next pokemon!`);
                    await playerSelectPokemon(this.player);
                } else {
                    playerHasAlive = false;
                    console.log(`${this.player.name} is out of pokemon!`);
                }
            }

            if (!this.bot.pokemon_on_play.is_alive) {
                const aliveBot = this.bot.pokemons.filter(pokemon => pokemon.is_alive);
                if (aliveBot.length > 0) {
                    await this.botSelectPokemonRound(aliveBot);
                    console.log(`Bot sent out: ${this.bot.pokemon_on_play.name}`);
                } else {
                    botHasAlive = false;
                    console.log(`Bot is out of pokemon!`);
                }
            }
        }

        this.stopKeyboardListener();
        console.log(`\n=== BATTLE END ===`);
        if (playerHasAlive) {
            this.gamePhase = "playerWon";
            console.log(`${this.player.name} WINS!`);
        } else {
            this.gamePhase = "botWon";
            console.log(`Bot WINS!`);
        }
    }

    async botSelectPokemonRound(alivePokemons: Pokemon[]) {
        const selected = botSelectPokemonRandom(alivePokemons);
        this.bot.pokemon_on_play = selected;
        console.log(`Bot sent out: ${this.bot.pokemon_on_play.name}`);
    }

    async playerInfos() {
        const { name } = await inquirer.prompt([
            {
                type: "input",
                name: "name",
                message: "Enter your trainer name",
            },
        ]);

        this.player.name = name;

        for (let i = 0; i < 3; i++) {
            const { pokemonName } = await inquirer.prompt([
                {
                    type: "input",
                    name: "pokemonName",
                    message: `Enter pokemon name (${i + 1}/3)`,
                },
            ]);

            const data = await fetchPokemonByName(pokemonName);
            const pokemon = await parsePokemonData(data);
            this.player.pokemons.push(pokemon);
            this.player.pokemons.forEach(pokemonEntry => (pokemonEntry.is_alive = true));
        }
    }

    async botChoosePokemon() {
        console.log("Bot is selecting its team...");

        for (let i = 0; i < 3; i++) {
            const randomId = Math.floor(Math.random() * 1025) + 1;

            try {
                const data = await fetchPokemonById(randomId);
                const pokemon = await parsePokemonData(data);
                this.bot.pokemons.push(pokemon);
                console.log(`  - ${pokemon.name}`);
            } catch (error) {
                i--;
            }
        }

        this.player.pokemons.forEach(pokemon => (pokemon.is_alive = true));
    }

    private async buildPlayerFromTeam(name: string, pokemonNames: string[]): Promise<Player> {
        const pokemons: Pokemon[] = [];

        for (const pokemonName of pokemonNames) {
            const data = await fetchPokemonByName(pokemonName);
            const pokemon = await parsePokemonData(data);
            pokemons.push(pokemon);
        }

        pokemons.forEach(pokemon => {
            pokemon.is_alive = true;
        });

        return {
            name,
            pokemons,
            hearts: 3,
            pokemon_on_play: pokemons[0] as Pokemon,
        };
    }

    private findMoveByName(pokemon: Pokemon, moveName: string) {
        const move = pokemon.moves.find(candidate => candidate.name === moveName);

        if (!move) {
            throw new Error(`Move ${moveName} was not found on ${pokemon.name}`);
        }

        return move;
    }

    private applyMove(attacker: Pokemon, defender: Pokemon, moveName: string): void {
        const move = this.findMoveByName(attacker, moveName);
        const damage = move.power || 0;

        defender.hp -= damage;
        displayAttack(attacker.name, move, damage);

        if (defender.hp <= 0) {
            defender.hp = 0;
            defender.is_alive = false;
            displayPokemonFainted(defender.name);
        }
    }

    private async runMultiplayerBattle(
        client: SocketClient,
        role: MultiplayerRole,
        opponent: Player,
        waitForMessage: (predicate: (msg: MultiplayerWireMessage) => boolean) => Promise<MultiplayerWireMessage>
    ): Promise<void> {
        this.bot = opponent;
        this.gameState = GAME_STATE.IN_GAME;
        this.setupKeyboardListener();

        console.log("(Press ESC to pause)\n");
        console.log(`\n=== MULTIPLAYER BATTLE START ===`);
        console.log(`${this.player.name} vs ${this.bot.name}\n`);

        await playerSelectPokemon(this.player);
        client.send({
            type: "active_pokemon",
            pokemonName: this.player.pokemon_on_play.name,
        });

        const remoteOpeningActive = await waitForMessage(msg => msg.type === "active_pokemon");
        const remoteOpeningName = String((remoteOpeningActive as { pokemonName: string }).pokemonName);
        const opponentOpeningPokemon = this.bot.pokemons.find(pokemon => pokemon.name === remoteOpeningName);

        if (!opponentOpeningPokemon) {
            throw new Error(`Opponent opening pokemon ${remoteOpeningName} not found`);
        }

        this.bot.pokemon_on_play = opponentOpeningPokemon;
        this.bot.pokemon_on_play.is_alive = true;
        this.bot.pokemon_on_play.hp = 300;
        console.log(`${this.bot.name} sent out: ${this.bot.pokemon_on_play.name}`);

        let playerHasAlive = true;
        let botHasAlive = true;

        while (playerHasAlive && botHasAlive) {
            if (this.isPaused) {
                await this.handlePause();
            }

            while (this.player.pokemon_on_play.is_alive && this.bot.pokemon_on_play.is_alive) {
                if (this.isPaused) {
                    await this.handlePause();
                }

                displayBattleStatus(this.player, this.bot);

                const localMove = await playerSelectMove(this.player.pokemon_on_play);
                client.send({
                    type: "battle_move",
                    moveName: localMove.name,
                });

                const remoteMoveMessage = await waitForMessage(msg => msg.type === "battle_move");
                const remoteMoveName = String((remoteMoveMessage as { moveName: string }).moveName);

                const hostMoveName = role === "host" ? localMove.name : remoteMoveName;
                const guestMoveName = role === "host" ? remoteMoveName : localMove.name;

                const hostAttacker = role === "host" ? this.player.pokemon_on_play : this.bot.pokemon_on_play;
                const hostDefender = role === "host" ? this.bot.pokemon_on_play : this.player.pokemon_on_play;
                const guestAttacker = role === "host" ? this.bot.pokemon_on_play : this.player.pokemon_on_play;
                const guestDefender = role === "host" ? this.player.pokemon_on_play : this.bot.pokemon_on_play;

                this.applyMove(hostAttacker, hostDefender, hostMoveName);

                if (hostDefender.is_alive) {
                    this.applyMove(guestAttacker, guestDefender, guestMoveName);
                }

                this.turnCounter++;
            }

            if (!this.player.pokemon_on_play.is_alive) {
                const alivePlayer = this.player.pokemons.filter(pokemon => pokemon.is_alive);

                if (alivePlayer.length > 0) {
                    console.log(`${this.player.name}, choose your next pokemon!`);
                    await playerSelectPokemon(this.player);
                    client.send({
                        type: "active_pokemon",
                        pokemonName: this.player.pokemon_on_play.name,
                    });
                } else {
                    playerHasAlive = false;
                    console.log(`${this.player.name} is out of pokemon!`);
                }
            }

            if (!this.bot.pokemon_on_play.is_alive) {
                const aliveBot = this.bot.pokemons.filter(pokemon => pokemon.is_alive);

                if (aliveBot.length > 0) {
                    const remoteNextActive = await waitForMessage(msg => msg.type === "active_pokemon");
                    const remoteNextName = String((remoteNextActive as { pokemonName: string }).pokemonName);
                    const nextPokemon = this.bot.pokemons.find(pokemon => pokemon.name === remoteNextName);

                    if (!nextPokemon) {
                        throw new Error(`Opponent pokemon ${remoteNextName} not found`);
                    }

                    this.bot.pokemon_on_play = nextPokemon;
                    this.bot.pokemon_on_play.is_alive = true;
                    this.bot.pokemon_on_play.hp = 300;
                    console.log(`${this.bot.name} sent out: ${this.bot.pokemon_on_play.name}`);
                } else {
                    botHasAlive = false;
                    console.log(`${this.bot.name} is out of pokemon!`);
                }
            }
        }

        this.stopKeyboardListener();
        console.log("\n=== MULTIPLAYER BATTLE END ===");
        if (playerHasAlive) {
            this.gamePhase = "playerWon";
            console.log(`${this.player.name} WINS!`);
        } else {
            this.gamePhase = "botWon";
            console.log(`${this.bot.name} WINS!`);
        }
    }

    async mutli_mode() {
        const client = new SocketClient("ws://localhost:8101");
        const { type } = await inquirer.prompt([
            {
                type: "list",
                name: "type",
                message: "Choose your option",
                choices: ["ENTER_CODE", "GENERATE_CODE"],
            },
        ]);

        const role: MultiplayerRole = type === "GENERATE_CODE" ? "host" : "guest";
        const pendingMessages: MultiplayerWireMessage[] = [];
        const waiters: Array<{
            predicate: (msg: MultiplayerWireMessage) => boolean;
            resolve: (msg: MultiplayerWireMessage) => void;
        }> = [];

        const waitForMessage = (predicate: (msg: MultiplayerWireMessage) => boolean) => {
            const bufferedIndex = pendingMessages.findIndex(predicate);

            if (bufferedIndex >= 0) {
                const [message] = pendingMessages.splice(bufferedIndex, 1);
                return Promise.resolve(message as MultiplayerWireMessage);
            }

            return new Promise<MultiplayerWireMessage>((resolve) => {
                waiters.push({ predicate, resolve });
            });
        };

        client.onMessage((rawMessage) => {
            const msg = rawMessage as MultiplayerWireMessage;
            console.log("Game received:", msg);

            if (msg.type === "room_created") {
                console.log(`Room code: ${msg.code}`);
            }

            if (msg.type === "room_joined") {
                console.log(`Joined room: ${msg.code}`);
            }

            if (msg.type === "player_joined") {
                console.log("Another player joined the room.");
            }

            if (msg.type === "error") {
                console.log(msg.message ?? "An error occurred in multiplayer mode.");
            }

            const waiterIndex = waiters.findIndex(waiter => waiter.predicate(msg));
            if (waiterIndex >= 0) {
                const [waiter] = waiters.splice(waiterIndex, 1);
                waiter?.resolve(msg);
                return;
            }

            pendingMessages.push(msg);
        });

        if (type === "ENTER_CODE") {
            const { code } = await inquirer.prompt([
                {
                    type: "input",
                    name: "code",
                    message: "Enter the code",
                },
            ]);

            client.send({ type: "join_game", code });
        } else {
            client.send({ type: "create_game" });
            console.log("Waiting for another player to join...");
        }

        await waitForMessage(msg => msg.type === "game_start");
        console.log("Multiplayer lobby ready. Choosing teams...");

        await this.playerInfos();
        const playerTeamNames = this.player.pokemons.map(pokemon => pokemon.name);

        client.send({
            type: "battle_setup",
            player: {
                name: this.player.name,
                pokemons: playerTeamNames,
            },
        });

        const remoteSetup = await waitForMessage(msg => msg.type === "battle_setup");
        const remoteSetupPayload = remoteSetup as {
            type: "battle_setup";
            player: { name: string; pokemons: string[] };
        };

        const opponent = await this.buildPlayerFromTeam(
            remoteSetupPayload.player.name,
            remoteSetupPayload.player.pokemons
        );

        await this.runMultiplayerBattle(client, role, opponent, waitForMessage);
    }

    async play() {
        switch (this.gameState) {
            case GAME_STATE.MENU_PART: {
                const menuChoice = await MenuPart(this.gameState);

                if (menuChoice === "NEW_GAME") {
                    this.gameState = GAME_STATE.IN_GAME;
                    await this.in_game();
                } else if (menuChoice === "LOAD_GAME") {
                    const saveFile = await showLoadGameMenu();
                    if (saveFile) {
                        const loaded = await this.loadGameFromSave(saveFile);
                        if (loaded) {
                            this.isLoadedGame = true;
                            this.gameState = GAME_STATE.IN_GAME;
                            await this.resumeLoadedGame();
                        } else {
                            console.log("Failed to load game. Returning to menu...");
                            await this.play();
                        }
                    } else {
                        await this.play();
                    }
                } else if (menuChoice === "MULTIPLAYER") {
                    await this.mutli_mode();
                }

                break;
            }
            case GAME_STATE.IN_GAME:
                await this.in_game();
                break;
            default:
                console.log("Unknown state");
        }
    }
}
