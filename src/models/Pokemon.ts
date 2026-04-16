export interface Pokemon {
    name: string;
    hp: number;
    is_alive:boolean;
    moves: Array<{
        name: string;
        power: number | null;
        accuracy: number | null;
        pp: number;
        type: string;
    }>;
}
