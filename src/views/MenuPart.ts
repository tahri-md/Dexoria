import inquirer from 'inquirer';
import { GAME_STATE, PAUSE_MENU_OPTIONS } from '../utils/constants.ts';
import { SaveManager } from '../persistence/index.ts';

export async function MenuPart(gameState: typeof GAME_STATE[keyof typeof GAME_STATE]): Promise<string> {
    const { menu } = await inquirer.prompt([
        {
            type: 'list',
            name: 'menu',
            message: 'Welcome to Dexoria',
            choices: ['NEW_GAME', 'LOAD_GAME', 'SETTINGS']
        }
    ]);
    return menu;
}

export async function showPauseMenu(): Promise<string> {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: '\n=== GAME PAUSED ===\nWhat would you like to do?',
            choices: [
                PAUSE_MENU_OPTIONS.RESUME,
                PAUSE_MENU_OPTIONS.SAVE,
                PAUSE_MENU_OPTIONS.MAIN_MENU
            ]
        }
    ]);
    return action;
}

export async function showLoadGameMenu(): Promise<string | null> {
    const saves = await SaveManager.listAvailableSaves();
    
    if (saves.length === 0) {
        console.log('\nNo saved games found.');
        return null;
    }

    const choices: Array<{ name: string; value: string | null }> = saves.map(save => ({
        name: `${save.playerName} - Phase: ${save.gamePhase} - ${save.timestamp}`,
        value: save.fileName
    }));

    choices.push({ name: 'Cancel', value: null });

    const { saveFile } = await inquirer.prompt([
        {
            type: 'list',
            name: 'saveFile',
            message: 'Select a game to load:',
            choices: choices
        }
    ]);

    return saveFile;
}
