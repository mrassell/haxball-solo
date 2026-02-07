import { World, GameMode } from './World';
import { Input } from './Input';
import { Bot } from './Bot';
import { Render } from './Render';

/**
 * Main game loop with fixed timestep physics
 */

export class Game {
  private world: World;
  private input: Input;
  private bot: Bot;
  private render: Render;
  private lastTime: number;
  private accumulator: number;
  private readonly FIXED_DT = 1 / 60; // 60Hz physics
  private onScoreUpdate?: (score: { human: number; bot: number }) => void;

  constructor(canvas: HTMLCanvasElement, gameMode: GameMode = GameMode.OneVsOne) {
    this.canvas = canvas;
    this.world = new World(gameMode);
    this.input = new Input();
    this.bot = new Bot();
    this.render = new Render(canvas);
    this.lastTime = performance.now();
    this.accumulator = 0;
  }

  setGameMode(gameMode: GameMode): void {
    try {
      // Don't recreate if it's the same mode
      if (this.world && this.world.gameMode === gameMode) {
        return;
      }

      const currentScore = this.world ? this.world.score : { human: 0, bot: 0 };
      const wasPaused = this.world ? this.world.isPaused : false;
      
      // Create new world with the selected game mode
      const newWorld = new World(gameMode);
      newWorld.score = currentScore; // Preserve score
      newWorld.isPaused = wasPaused; // Preserve pause state
      
      // Atomically replace the world
      this.world = newWorld;
      
      // Reset bot state
      this.bot = new Bot();
      
      // Reset accumulator to prevent timing issues
      this.accumulator = 0;
      this.lastTime = performance.now();
    } catch (error) {
      console.error('Error in setGameMode:', error);
      throw error;
    }
  }

  setShowDebug(show: boolean): void {
    this.render.setShowDebug(show);
  }

  setShowVelocity(show: boolean): void {
    this.render.setShowVelocity(show);
  }

  setOnScoreUpdate(callback: (score: { human: number; bot: number }) => void): void {
    this.onScoreUpdate = callback;
  }

  reset(): void {
    this.world.reset();
  }

  update(): void {
    try {
      const currentTime = performance.now();

      // Handle pause
      if (this.input.isPaused()) {
        this.world.isPaused = true;
        this.lastTime = currentTime;
        this.render.render(this.world); // Still render when paused
        return;
      } else {
        this.world.isPaused = false;
      }

      // Fixed timestep with accumulator
      let deltaTime = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      // Cap delta time to prevent large jumps
      deltaTime = Math.min(deltaTime, 0.1);
      if (!isFinite(deltaTime) || deltaTime <= 0) {
        deltaTime = 0.016; // Default to 60fps
      }

      this.accumulator += deltaTime;

      // Update bot's ball history
      try {
        this.bot.updateBallPosition(this.world.ball.position);
      } catch (e) {
        console.error('Bot history update error:', e);
      }

      // Process human input
      const playerInput = this.input.getPlayerInput();
      this.world.humanPlayer.inputAcceleration = playerInput;

      // Handle kick/pass (spacebar)
      if (this.input.isKickJustPressed()) {
        // Try to pass first, then kick if no teammate available
        const passedTo = this.world.tryPass(this.world.humanPlayer);
        if (!passedTo) {
          this.world.tryKick(this.world.humanPlayer);
        }
      }

      // Update all bot players (opponents and teammates)
      const botAccelMultiplier = 1.2; // Fixed at 100% difficulty
      
      // Update opponent bots
      if (this.world.botTeam && Array.isArray(this.world.botTeam)) {
        for (const bot of this.world.botTeam) {
          if (!bot) continue;
          
          try {
            const botDirection = this.bot.getDesiredDirection(
              bot,
              this.world.ball,
              this.world.humanPlayer,
              this.world.humanTeam || [],
              this.world.botTeam || [],
              false, // is opponent
              this.world.gameMode
            );
            if (botDirection && isFinite(botDirection.x) && isFinite(botDirection.y)) {
              bot.inputAcceleration = botDirection;
            } else {
              bot.inputAcceleration = { x: 0, y: 0 };
            }
          } catch (e) {
            console.error('Bot direction error:', e);
            bot.inputAcceleration = { x: 0, y: 0 };
          }

          // Handle bot kick/pass (with passing in 2v2, 3v3)
          try {
            if (this.bot.shouldKick(bot, this.world.ball, 1.0, false, undefined, this.world.gameMode)) {
              // In 2v2 and 3v3, try to pass to teammates first
              if (this.world.gameMode === GameMode.TwoVsTwo || this.world.gameMode === GameMode.ThreeVsThree) {
                const passedTo = this.world.tryPass(bot);
                if (!passedTo) {
                  this.world.tryKick(bot);
                }
              } else {
                this.world.tryKick(bot);
              }
            }
          } catch (e) {
            console.error('Bot kick error:', e);
          }
        }
      }

      // Update teammate bots (on human team)
      if (this.world.humanTeam && Array.isArray(this.world.humanTeam)) {
        for (const teammate of this.world.humanTeam) {
          if (!teammate || teammate === this.world.humanPlayer) continue; // Skip human player
          
          try {
            const teammateDirection = this.bot.getDesiredDirection(
              teammate,
              this.world.ball,
              this.world.humanPlayer,
              this.world.humanTeam || [],
              this.world.botTeam || [],
              true, // is teammate
              this.world.gameMode
            );
            if (teammateDirection && isFinite(teammateDirection.x) && isFinite(teammateDirection.y)) {
              teammate.inputAcceleration = teammateDirection;
            } else {
              teammate.inputAcceleration = { x: 0, y: 0 };
            }
          } catch (e) {
            console.error('Teammate direction error:', e);
            teammate.inputAcceleration = { x: 0, y: 0 };
          }

          // Handle teammate pass/kick
          try {
            if (this.bot.shouldKick(teammate, this.world.ball, 1.0, true, this.world.humanPlayer, this.world.gameMode)) {
              // Teammates prefer passing to human player (especially in 3v3)
              const passedTo = this.world.tryPass(teammate);
              if (!passedTo) {
                this.world.tryKick(teammate);
              }
            }
          } catch (e) {
            console.error('Teammate kick error:', e);
          }
        }
      }

      // Fixed timestep physics updates
      // Safety: limit max iterations to prevent infinite loops
      let maxIterations = 3; // Reduced further for safety
      const startTime = performance.now();
      const maxTime = 16; // Max 16ms per frame
      
      while (this.accumulator >= this.FIXED_DT && maxIterations > 0) {
        // Safety: check if we're taking too long
        if (performance.now() - startTime > maxTime) {
          console.warn('Physics update taking too long, breaking');
          break;
        }
        
        try {
          const goal = this.world.update(this.FIXED_DT, botAccelMultiplier);
          
          if (goal && this.onScoreUpdate) {
            this.onScoreUpdate(this.world.score);
          }
        } catch (e) {
          console.error('Error in world update:', e);
          break;
        }

        this.accumulator -= this.FIXED_DT;
        maxIterations--;
        
        // Safety: prevent accumulator from growing too large
        if (this.accumulator > this.FIXED_DT * 5) {
          this.accumulator = this.FIXED_DT * 2;
          break;
        }
      }
      
      // If we hit max iterations, reset accumulator to prevent spiral
      if (maxIterations === 0 && this.accumulator > this.FIXED_DT * 2) {
        this.accumulator = this.FIXED_DT * 2;
      }

      // Clear just-pressed keys after processing
      this.input.clearJustPressed();

      // Render
      this.render.render(this.world);
    } catch (error) {
      console.error('Game update error:', error);
      // Try to render anyway to keep UI responsive
      try {
        this.render.render(this.world);
      } catch (e) {
        console.error('Render error:', e);
      }
    }
  }

  start(): void {
    const gameLoop = () => {
      this.update();
      requestAnimationFrame(gameLoop);
    };
    gameLoop();
  }
}
