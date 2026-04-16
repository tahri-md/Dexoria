import inquirer from 'inquirer';
import { GAME_STATE } from '../utils/constants.ts';

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
