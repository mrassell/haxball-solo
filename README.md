# Haxball Solo

A single-player version of the classic [Haxball](https://www.haxball.com/) game, built from scratch with TypeScript and a custom physics engine.

## 🎮 Play Now

**[Play the game here →](https://vercel.com/mrassells-projects/haxball-solo-29wg/DTRr7u8DHo5gweExFSitYGrzv6qe)**

## Why I Built This

Haxball.com is an amazing multiplayer soccer game, but sometimes you just want to practice or play solo without waiting for other players. I took matters into my own hands to create AI opponents and teammates that actually feel smart and challenging.

This project is my love letter to Haxball - I wanted to recreate that same satisfying physics and gameplay, but with CPU players that:
- Actually work as a team
- Make intelligent passes
- Position themselves strategically
- Adapt to different game modes (1v1, 2v2, 3v3)

## Inspiration

This game is heavily inspired by [Haxball.com](https://www.haxball.com/) - the physics, the gameplay mechanics, and the overall feel are all designed to match that classic experience. If you've played Haxball, you'll feel right at home here.

## Features

- **Custom Physics Engine** - Circle-circle collision detection with impulse-based resolution
- **Smart AI** - Bots that attack, defend, and coordinate as a team
- **Multiple Game Modes** - 1v1, 2v2, and 3v3 matches
- **Realistic Ball Physics** - Bouncy ball with proper collision response
- **Team Coordination** - AI teammates that pass, position, and support you
- **Fixed Timestep Physics** - Consistent gameplay regardless of frame rate

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **HTML5 Canvas** - Rendering system
- **Custom Physics** - Built from scratch (no external physics libraries)

## How to Run Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Controls

- **WASD** or **Arrow Keys** - Move your player
- **Spacebar** - Kick the ball
- **P** - Pause/Unpause

## Game Mechanics

### Kicking
Press spacebar when the ball is within your kick radius (35 pixels). The ball will go in the direction it's positioned relative to you - just like in Haxball!

### AI Behavior
- **Offense**: Bots predict where the ball will be and intercept it
- **Defense**: Bots position themselves between the ball and their goal
- **Passing**: AI teammates actively look for passing opportunities
- **Team Spacing**: Players automatically spread out to avoid clumping

## Project Structure

```
src/
├── game/
│   ├── Game.ts       # Main game loop and orchestration
│   ├── World.ts      # Game world and entity management
│   ├── Physics.ts    # Collision detection and resolution
│   ├── Entities.ts   # Player and Ball classes
│   ├── Input.ts      # Keyboard input handling
│   ├── Render.ts     # Canvas rendering
│   ├── Bot.ts        # AI logic for computer players
│   └── Utils.ts      # Vector math utilities
└── main.ts           # Entry point
```

## Physics Explained

The game uses a custom physics engine with:
- **Circle-circle collision detection** - Distance-based collision checking
- **Impulse method** - Realistic collision response using mass and restitution
- **Fixed timestep** - 60Hz physics updates for consistent gameplay
- **Positional correction** - Prevents entities from sinking into each other

For a detailed explanation of the physics and AI systems, check out the code comments or watch the [YouTube video explaining everything](link-to-video).

## Deployment

This project is deployed on [Vercel](https://vercel.com) for easy access and fast loading times.

## License

This project is for educational purposes and is inspired by Haxball.com. All game mechanics and physics are implemented from scratch.

## Acknowledgments

- Inspired by [Haxball.com](https://www.haxball.com/) - an amazing multiplayer soccer game
- Built with love for the Haxball community

---

**Note**: This is a fan project created for learning and fun. Haxball.com is the original game and trademark of its respective owners.
