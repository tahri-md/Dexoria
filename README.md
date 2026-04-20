# Pokemon Battle Game - TUI Edition

A turn-based Pokemon battle game built with TypeScript and Node.js. Battle against a bot, select your team from real Pokemon, and compete in dynamic terminal-based combat.

## 🎮 Quick Start

**Development (with ts-node):**
```bash
npm install
npm run dev
```

**Standalone Executable (no ts-node needed):**
```bash
npm install
npm run build
npm start
```

Or run the compiled executable directly:
```bash
./dist/index.js
```

## 🎯 How to Play

1. Select **NEW_GAME** from the menu
2. Enter your trainer name
3. Pick 3 Pokemon by name (try: pikachu, charizard, blastoise)
4. Battle the bot's randomly selected team
5. Choose moves and defeat all opponent Pokemon to win

## 📁 Project Structure

```
src/
├── index.ts              # Entry point
├── game/Game.ts          # Battle system & game loop
├── models/               # Pokemon & Player types
├── views/MenuPart.ts     # Menu UI
└── utils/                # API calls, battle helpers, constants
```

## ✅ Features

- **Live Pokemon Data** - Real Pokemon from PokéAPI with actual moves
- **Turn-Based Combat** - Player moves first, bot responds
- **Team Management** - Select and switch Pokemon during battle
- **HP Tracking** - Pokemon faint when HP reaches 0
- **Pokemon Stats System** - Attack, Defense, Speed, Special Attack influence battle outcomes
- **Stat-Based Damage Calculation** - Damage formula uses attacker/defender stats for realistic combat
- **Move Accuracy** - Moves can miss based on accuracy stat
- **Critical Hits** - Chance to deal 1.5x damage based on speed stat (6.25% base + speed bonus)
- **PP (Power Points) System** - Moves have limited uses; Struggle move as fallback
- **Move Damage Display** - See predicted damage for each move before selecting
- **Clean UI** - Interactive prompts and clear battle display
- **Multiplayer Lobby/Battle** - Host or join a room and play synchronized turns
- **Save & Load Game** - Persist and resume battle progress

## 🚧 Coming Soon

- Speed-based turn order
- Status effects (poison, paralysis, burn, etc.)
- Smarter bot AI
- Type effectiveness multipliers
- Standalone executable (no ts-node needed)

## 📝 Commands

```bash
npm start             # Play single-player from menu
npm run start:server  # Start WebSocket multiplayer server (port 8101)
npm run dev           # Same as start
npm run dev:server    # Same as start:server
```

---

**Ready to battle? Just run `npm start`!** 🎮
