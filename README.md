# HaxBall Single Player

A single-player 2D top-down soccer mini-game inspired by HaxBall. Play against an AI bot in your browser!

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (typically `http://localhost:5173`)

## Controls

- **WASD** or **Arrow Keys**: Move your player
- **P**: Pause/Unpause
- **V**: Toggle velocity visualization

## Game Features

- Fixed timestep physics at 60Hz for consistent gameplay
- Custom circle-circle collision resolution with impulse physics
- Adjustable bot difficulty (0-100%)
- Score tracking
- Kickoff freeze (1 second after goals)

## Tuning Guide

To adjust the game feel to be closer to HaxBall, modify constants in `src/game/Entities.ts`:

### Player Movement
- `PLAYER_ACCELERATION` (default: 1200): Higher = faster acceleration, more responsive
- `PLAYER_DAMPING` (default: 0.985): Higher = less sliding, more control. Lower = more slidey
- `PLAYER_MAX_SPEED` (default: 360): Maximum player speed in px/s
- `PLAYER_RESTITUTION` (default: 0.35): Bounciness when colliding. Lower = less bouncy

### Ball Physics
- `BALL_DAMPING` (default: 0.993): Higher = ball slows down faster. Lower = ball maintains speed longer
- `BALL_MAX_SPEED` (default: 700): Maximum ball speed in px/s
- `BALL_RESTITUTION` (default: 0.65): Ball bounciness. Higher = more bouncy

### Collision Resolution
- `COLLISION_SLOP` (default: 0.1): Threshold for positional correction. Lower = more precise but potentially jittery
- `POSITION_CORRECTION_PERCENT` (default: 0.8): How much overlap to correct per frame. Lower = smoother but may allow sinking

### Recommended Tweaks for HaxBall Feel
- Increase `PLAYER_DAMPING` to 0.99 for tighter control
- Decrease `BALL_DAMPING` to 0.99 for longer ball movement
- Adjust `PLAYER_ACCELERATION` between 1000-1400 based on preference
- Fine-tune `BALL_RESTITUTION` between 0.6-0.7 for desired bounciness

## Project Structure

```
src/
  game/
    Entities.ts    - Player, Ball, and entity definitions
    Physics.ts     - Collision detection and resolution
    World.ts       - Game world and state management
    Input.ts       - Keyboard input handling
    Bot.ts         - AI bot logic
    Render.ts      - Canvas rendering
    Game.ts        - Main game loop with fixed timestep
    Utils.ts       - Vector math utilities
  main.ts          - Entry point
  style.css        - Styling
```

## Build

To build for production:
```bash
npm run build
```

The output will be in the `dist` directory.
