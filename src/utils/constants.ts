export const GAME_STATE = {
    MENU_PART: 0,
    PAUSED: 1,
    IN_GAME: 2,
    ENDED: 3
} as const;

export const PAUSE_MENU_OPTIONS = {
    RESUME: "Resume Battle",
    SAVE: "Save Game",
    MAIN_MENU: "Return to Main Menu"
} as const;
