# Pokemon Battle Game - TUI Edition

A turn-based Pokemon battle game built with TypeScript and Node.js. Battle against a bot, select your team from real Pokemon, and compete in dynamic terminal-based combat.

## 🎮 Quick Start

```bash
npm install
npm start
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
- **Clean UI** - Interactive prompts and clear battle display

## 🚧 Coming Soon

- Save & load game progress
- Move accuracy and critical hits
- PP (Power Points) system
- Pokemon stats (Attack, Defense, Speed, Special)
- Speed-based turn order
- Status effects (poison, paralysis, burn, etc.)
- Smarter bot AI
- Multiplayer battles
- Standalone executable (no ts-node needed)

## 📝 Commands

```bash
npm start    # Play the game
npm run dev  # Same as start
```

---

**Ready to battle? Just run `npm start`!** 🎮
