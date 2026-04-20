export interface Pokemon {
    name: string;
    hp: number;
    maxHp: number;
    is_alive: boolean;
    stats: {
        attack: number;
        defense: number;
        speed: number;
        spAtk: number; // Special Attack
    };
    moves: Array<{
        name: string;
        power: number | null;
        accuracy: number | null;
        pp: number;
        maxPp: number;
        type: string;
    }>;
}
