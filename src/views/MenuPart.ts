import inquirer from 'inquirer';
import { GAME_STATE, PAUSE_MENU_OPTIONS } from '../utils/constants.ts';

export async function MenuPart(gameState: typeof GAME_STATE[keyof typeof GAME_STATE]) {
    const { menu } = await inquirer.prompt([
  {
    type: 'list',
    name: 'menu',
    message: 'Welcome to Dexoria',
    choices: ['NEW_GAME', 'SAVED_GAME', 'SETTINGS']
  }
]);
    switch (menu) {
        case "NEW_GAME":
            gameState === GAME_STATE.IN_GAME
            break;
        case "SAVED_GAME":
            break;
        case "SETTINGS":
            break;
    }

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
