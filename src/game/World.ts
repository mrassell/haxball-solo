import { Player, Ball, Entity, ENTITY_CONSTANTS } from './Entities';
import { vec2, vec2Sub, vec2Normalize, vec2Distance, vec2Dot, vec2Length } from './Utils';
import { detectCircleCollision, resolveCircleCollision, detectWallCollision, resolveWallCollision, checkGoal } from './Physics';

/**
 * Game modes
 */
export enum GameMode {
  OneVsOne = '1v1',
  TwoVsTwo = '2v2',
  ThreeVsThree = '3v3',
}

/**
 * Game world containing all entities and game state
 */

export class World {
  humanPlayer: Player;
  humanTeam: Player[]; // All players on human team (including human)
  botTeam: Player[]; // All players on bot team
  ball: Ball;
  score: { human: number; bot: number };
  kickoffFreezeTime: number;
  isPaused: boolean;
  gameMode: GameMode;

  constructor(gameMode: GameMode = GameMode.OneVsOne) {
    // Initialize all properties first
    this.humanTeam = [];
    this.botTeam = [];
    this.score = { human: 0, bot: 0 };
    this.kickoffFreezeTime = 0;
    this.isPaused = false;
    this.gameMode = gameMode;
    
    const centerX = ENTITY_CONSTANTS.ARENA_WIDTH / 2;
    const centerY = ENTITY_CONSTANTS.ARENA_HEIGHT / 2;

    // Always create human player first
    this.humanPlayer = new Player(vec2(250, centerY), true);
    this.humanTeam.push(this.humanPlayer);

    // Create players based on game mode - use strict equality checks
    if (gameMode === GameMode.OneVsOne) {
      // 1v1: 1 human vs 1 bot
      const bot = new Player(vec2(650, centerY), false);
      this.botTeam.push(bot);
    } else if (gameMode === GameMode.TwoVsTwo) {
      // 2v2: 1 human + 1 bot teammate vs 2 bots
      const teammate = new Player(vec2(300, centerY - 80), true);
      this.humanTeam.push(teammate);
      
      const bot1 = new Player(vec2(650, centerY), false);
      const bot2 = new Player(vec2(600, centerY - 80), false);
      this.botTeam.push(bot1, bot2);
    } else if (gameMode === GameMode.ThreeVsThree) {
      // 3v3: 1 human + 2 bot teammates vs 3 bots
      const teammate1 = new Player(vec2(300, centerY - 100), true);
      const teammate2 = new Player(vec2(300, centerY + 100), true);
      this.humanTeam.push(teammate1, teammate2);
      
      const bot1 = new Player(vec2(650, centerY), false);
      const bot2 = new Player(vec2(600, centerY - 100), false);
      const bot3 = new Player(vec2(600, centerY + 100), false);
      this.botTeam.push(bot1, bot2, bot3);
    }

    // Create ball last
    this.ball = new Ball(vec2(centerX, centerY));
  }

  getAllPlayers(): Player[] {
    return [...this.humanTeam, ...this.botTeam];
  }

  update(dt: number, botAccelerationMultiplier: number = 1.0): 'left' | 'right' | null {
    if (this.isPaused) {
      return null;
    }

    // Update kickoff freeze timer
    if (this.kickoffFreezeTime > 0) {
      this.kickoffFreezeTime -= dt;
      if (this.kickoffFreezeTime <= 0 && this.ball.isFrozen) {
        this.ball.isFrozen = false;
      }
    }

    // Update all entities
    if (this.humanPlayer) {
      this.humanPlayer.update(dt, 1.0);
    }
    for (const player of this.humanTeam) {
      if (player && player !== this.humanPlayer) {
        player.update(dt, 1.0);
      }
    }
    for (const player of this.botTeam) {
      if (player) {
        player.update(dt, botAccelerationMultiplier);
      }
    }
    if (this.ball) {
      this.ball.update(dt);
    }

    // Check for goal
    const goal = checkGoal(this.ball);
    if (goal) {
      if (goal === 'left') {
        this.score.human++;
      } else {
        this.score.bot++;
      }
      this.resetKickoff();
      return goal;
    }

    // Collision detection and resolution
    this.resolveCollisions(dt);

    return null;
  }

  private resolveCollisions(dt: number): void {
    const allPlayers = this.getAllPlayers();
    const entities: Entity[] = [...allPlayers, this.ball];

    // Entity-entity collisions
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const collision = detectCircleCollision(entities[i], entities[j]);
        if (collision) {
          resolveCircleCollision(collision, dt);
        }
      }
    }

    // Wall collisions for all entities
    for (const entity of entities) {
      const wallCollision = detectWallCollision(entity);
      if (wallCollision) {
        resolveWallCollision(wallCollision, dt);
      }
    }
  }

  resetKickoff(): void {
    const centerX = ENTITY_CONSTANTS.ARENA_WIDTH / 2;
    const centerY = ENTITY_CONSTANTS.ARENA_HEIGHT / 2;

    // Reset human player
    if (this.humanPlayer) {
      this.humanPlayer.position = vec2(250, centerY);
      this.humanPlayer.velocity = vec2(0, 0);
    }

    // Reset human team (skip index 0 which is human player)
    if (this.gameMode === GameMode.TwoVsTwo && this.humanTeam.length > 1) {
      this.humanTeam[1].position = vec2(300, centerY - 80);
      this.humanTeam[1].velocity = vec2(0, 0);
    } else if (this.gameMode === GameMode.ThreeVsThree) {
      if (this.humanTeam.length > 1) {
        this.humanTeam[1].position = vec2(300, centerY - 100);
        this.humanTeam[1].velocity = vec2(0, 0);
      }
      if (this.humanTeam.length > 2) {
        this.humanTeam[2].position = vec2(300, centerY + 100);
        this.humanTeam[2].velocity = vec2(0, 0);
      }
    }

    // Reset bot team
    if (this.gameMode === GameMode.OneVsOne && this.botTeam.length > 0) {
      this.botTeam[0].position = vec2(650, centerY);
      this.botTeam[0].velocity = vec2(0, 0);
    } else if (this.gameMode === GameMode.TwoVsTwo) {
      if (this.botTeam.length > 0) {
        this.botTeam[0].position = vec2(650, centerY);
        this.botTeam[0].velocity = vec2(0, 0);
      }
      if (this.botTeam.length > 1) {
        this.botTeam[1].position = vec2(600, centerY - 80);
        this.botTeam[1].velocity = vec2(0, 0);
      }
    } else if (this.gameMode === GameMode.ThreeVsThree) {
      if (this.botTeam.length > 0) {
        this.botTeam[0].position = vec2(650, centerY);
        this.botTeam[0].velocity = vec2(0, 0);
      }
      if (this.botTeam.length > 1) {
        this.botTeam[1].position = vec2(600, centerY - 100);
        this.botTeam[1].velocity = vec2(0, 0);
      }
      if (this.botTeam.length > 2) {
        this.botTeam[2].position = vec2(600, centerY + 100);
        this.botTeam[2].velocity = vec2(0, 0);
      }
    }

    if (this.ball) {
      this.ball.position = vec2(centerX, centerY);
      this.ball.velocity = vec2(0, 0);
      this.ball.freeze(1.0); // 1 second freeze
    }
    this.kickoffFreezeTime = 1.0;
  }

  reset(): void {
    this.score = { human: 0, bot: 0 };
    this.resetKickoff();
  }

  tryKick(player: Player): boolean {
    try {
      if (!player || !this.ball) {
        return false;
      }

      // Check if positions are valid
      if (!isFinite(player.position.x) || !isFinite(player.position.y) ||
          !isFinite(this.ball.position.x) || !isFinite(this.ball.position.y)) {
        return false;
      }

      // Check if ball is within kick radius
      const dist = vec2Distance(player.position, this.ball.position);
      const kickRadius = ENTITY_CONSTANTS.KICK_RADIUS;
      
      if (isFinite(dist) && dist <= kickRadius && !this.ball.isFrozen) {
        // Simple kick: use player's input direction, or velocity if no input, or forward if stationary
        let direction: { x: number; y: number };
        
        // Check if player has input (movement keys pressed)
        const inputMag = Math.sqrt(player.inputAcceleration.x * player.inputAcceleration.x + player.inputAcceleration.y * player.inputAcceleration.y);
        const velocityMag = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
        
        // Priority 1: Use input direction if player is pressing keys
        if (inputMag > 0.001) {
          direction = vec2Normalize(player.inputAcceleration);
        }
        // Priority 2: Use velocity direction if player is moving
        else if (velocityMag > 1) {
          direction = vec2Normalize(player.velocity);
        }
        // Priority 3: Kick forward (toward opponent goal) if stationary
        else {
          // Human players kick right, bot players kick left
          const forwardX = player.isHuman ? 1 : -1;
          direction = vec2Normalize({ x: forwardX, y: 0 });
        }
        
        // Apply kick force in the determined direction
        if (direction && isFinite(direction.x) && isFinite(direction.y)) {
          const dirMag = vec2Length(direction);
          if (dirMag > 0.1) {
            const kickForce = ENTITY_CONSTANTS.KICK_FORCE;
            this.ball.velocity.x = direction.x * kickForce;
            this.ball.velocity.y = direction.y * kickForce;
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error in tryKick:', error);
      return false;
    }
  }

  tryPass(player: Player): Player | null {
    try {
      if (!player || !this.ball || !this.humanTeam || !this.botTeam) {
        return null;
      }

      // Check if player has ball
      if (!isFinite(player.position.x) || !isFinite(player.position.y) ||
          !isFinite(this.ball.position.x) || !isFinite(this.ball.position.y)) {
        return null;
      }

      const distToBall = vec2Distance(player.position, this.ball.position);
      if (!isFinite(distToBall) || distToBall > ENTITY_CONSTANTS.KICK_RADIUS || this.ball.isFrozen) {
        return null;
      }

      // Find nearest teammate - check by reference
      let isHumanTeam = false;
      for (const p of this.humanTeam) {
        if (p === player) {
          isHumanTeam = true;
          break;
        }
      }

      const teammates = isHumanTeam 
        ? this.humanTeam.filter(p => p && p !== player && isFinite(p.position.x) && isFinite(p.position.y))
        : this.botTeam.filter(p => p && p !== player && isFinite(p.position.x) && isFinite(p.position.y));

      if (teammates.length === 0) {
        return null;
      }

      // If teammate is passing, prioritize human player heavily
      const humanPlayer = this.humanTeam[0];
      if (isHumanTeam && humanPlayer && humanPlayer !== player) {
        const distToHuman = vec2Distance(player.position, humanPlayer.position);
        const humanAhead = humanPlayer.position.x > player.position.x;
        const humanInGoodPosition = humanPlayer.position.x > ENTITY_CONSTANTS.ARENA_WIDTH / 2 - 100;
        const humanOpen = distToHuman > 30 && distToHuman < 500;
        
        // Human gets very high priority if they're in a good position
        if (humanOpen && (humanAhead || humanInGoodPosition)) {
          // Calculate pass with lead
          const humanSpeed = Math.sqrt(humanPlayer.velocity.x ** 2 + humanPlayer.velocity.y ** 2);
          const passLead = Math.min(humanSpeed * 0.45, 85);
          const humanDirection = humanSpeed > 5 
            ? vec2Normalize(humanPlayer.velocity)
            : vec2Normalize(vec2Sub(humanPlayer.position, player.position));
          
          if (humanDirection && isFinite(humanDirection.x)) {
            const passTarget = vec2(
              humanPlayer.position.x + humanDirection.x * passLead,
              humanPlayer.position.y + humanDirection.y * passLead
            );
            
            // Clamp to valid area
            passTarget.x = Math.max(0, Math.min(ENTITY_CONSTANTS.ARENA_WIDTH, passTarget.x));
            passTarget.y = Math.max(80, Math.min(ENTITY_CONSTANTS.ARENA_HEIGHT - 80, passTarget.y));
            
            // Pass the ball toward predicted human position
            const passDirection = vec2Normalize(vec2Sub(passTarget, this.ball.position));
            if (passDirection && isFinite(passDirection.x) && isFinite(passDirection.y)) {
              const passForce = ENTITY_CONSTANTS.KICK_FORCE * 0.92;
              this.ball.velocity.x = passDirection.x * passForce;
              this.ball.velocity.y = passDirection.y * passForce;
              return humanPlayer;
            }
          }
        }
      }

    // Find best teammate to pass to (closest and in good position)
    let bestTeammate: Player | null = null;
    let bestScore = Infinity;

      for (const teammate of teammates) {
        if (!teammate) continue;
        
        const dist = vec2Distance(player.position, teammate.position);
        if (!isFinite(dist) || dist < 0.1 || dist > 500) continue; // Skip if invalid or too close/far
        
        const passAngle = Math.atan2(
          teammate.position.y - player.position.y,
          teammate.position.x - player.position.x
        );
        if (!isFinite(passAngle)) continue;

        const ballToTeammate = vec2Sub(teammate.position, this.ball.position);
        const ballToTeammateNorm = vec2Normalize(ballToTeammate);
        const passDirNorm = vec2Normalize({ x: Math.cos(passAngle), y: Math.sin(passAngle) });
        
        if (!ballToTeammateNorm || !passDirNorm) continue;
        
        const teammateAhead = vec2Dot(ballToTeammateNorm, passDirNorm);
        if (!isFinite(teammateAhead)) continue;

        // Prefer teammates that are ahead and not too close/far
        const score = dist + (teammateAhead < 0 ? 1000 : 0) - (teammateAhead * 50);
        if (dist < 400 && dist > 30 && score < bestScore && isFinite(score)) {
          bestScore = score;
          bestTeammate = teammate;
        }
      }

      if (bestTeammate && isFinite(bestTeammate.position.x) && isFinite(bestTeammate.position.y)) {
        // Pass the ball toward teammate with lead
        const targetSpeed = Math.sqrt(bestTeammate.velocity.x ** 2 + bestTeammate.velocity.y ** 2);
        const passLead = Math.min(targetSpeed * 0.35, 70);
        const targetDirection = targetSpeed > 5 
          ? vec2Normalize(bestTeammate.velocity)
          : vec2Normalize(vec2Sub(bestTeammate.position, player.position));
        
        const passTarget = targetDirection && isFinite(targetDirection.x)
          ? vec2(
              bestTeammate.position.x + targetDirection.x * passLead,
              bestTeammate.position.y + targetDirection.y * passLead
            )
          : bestTeammate.position;
        
        // Clamp to valid area
        passTarget.x = Math.max(0, Math.min(ENTITY_CONSTANTS.ARENA_WIDTH, passTarget.x));
        passTarget.y = Math.max(80, Math.min(ENTITY_CONSTANTS.ARENA_HEIGHT - 80, passTarget.y));
        
        const passDirection = vec2Normalize(vec2Sub(passTarget, this.ball.position));
        if (passDirection && isFinite(passDirection.x) && isFinite(passDirection.y)) {
          const passForce = ENTITY_CONSTANTS.KICK_FORCE * 0.9; // Slightly less than kick
          this.ball.velocity.x = passDirection.x * passForce;
          this.ball.velocity.y = passDirection.y * passForce;
          return bestTeammate;
        }
      }

      return null;
    } catch (error) {
      console.error('Error in tryPass:', error);
      return null;
    }
  }
}
