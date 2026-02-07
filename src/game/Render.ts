import { World } from './World';
import { Player, Ball, ENTITY_CONSTANTS } from './Entities';
import { vec2Distance } from './Utils';

/**
 * Rendering system for canvas drawing
 */

export class Render {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private showDebug: boolean;
  private showVelocity: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2d context');
    }
    this.ctx = context;
    this.showDebug = false;
    this.showVelocity = false;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = ENTITY_CONSTANTS.ARENA_WIDTH * dpr;
    this.canvas.height = ENTITY_CONSTANTS.ARENA_HEIGHT * dpr;
    this.canvas.style.width = `${ENTITY_CONSTANTS.ARENA_WIDTH}px`;
    this.canvas.style.height = `${ENTITY_CONSTANTS.ARENA_HEIGHT}px`;
    this.ctx.scale(dpr, dpr);
  }

  setShowDebug(show: boolean): void {
    this.showDebug = show;
  }

  setShowVelocity(show: boolean): void {
    this.showVelocity = show;
  }

  render(world: World): void {
    const { ARENA_WIDTH, ARENA_HEIGHT, GOAL_HEIGHT, WALL_THICKNESS } = ENTITY_CONSTANTS;
    const centerX = ARENA_WIDTH / 2;
    const centerY = ARENA_HEIGHT / 2;

    // Clear canvas
    this.ctx.fillStyle = '#2d5016';
    this.ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Draw center line
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, 0);
    this.ctx.lineTo(centerX, ARENA_HEIGHT);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Draw center circle
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw goals
    const goalTop = centerY - GOAL_HEIGHT / 2;
    const goalBottom = centerY + GOAL_HEIGHT / 2;

    // Left goal
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, goalTop);
    this.ctx.lineTo(0, 0);
    this.ctx.moveTo(0, goalBottom);
    this.ctx.lineTo(0, ARENA_HEIGHT);
    this.ctx.stroke();

    // Right goal
    this.ctx.beginPath();
    this.ctx.moveTo(ARENA_WIDTH, goalTop);
    this.ctx.lineTo(ARENA_WIDTH, 0);
    this.ctx.moveTo(ARENA_WIDTH, goalBottom);
    this.ctx.lineTo(ARENA_WIDTH, ARENA_HEIGHT);
    this.ctx.stroke();

    // Draw walls (box boundaries - only ball collides, players can move outside)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 3;
    
    // Top wall
    this.ctx.fillRect(0, 0, ARENA_WIDTH, WALL_THICKNESS);
    this.ctx.strokeRect(0, 0, ARENA_WIDTH, WALL_THICKNESS);
    
    // Bottom wall
    this.ctx.fillRect(0, ARENA_HEIGHT - WALL_THICKNESS, ARENA_WIDTH, WALL_THICKNESS);
    this.ctx.strokeRect(0, ARENA_HEIGHT - WALL_THICKNESS, ARENA_WIDTH, WALL_THICKNESS);
    
    // Left wall (above goal)
    this.ctx.fillRect(0, 0, WALL_THICKNESS, goalTop);
    this.ctx.strokeRect(0, 0, WALL_THICKNESS, goalTop);
    
    // Left wall (below goal)
    this.ctx.fillRect(0, goalBottom, WALL_THICKNESS, ARENA_HEIGHT - goalBottom);
    this.ctx.strokeRect(0, goalBottom, WALL_THICKNESS, ARENA_HEIGHT - goalBottom);
    
    // Right wall (above goal)
    this.ctx.fillRect(ARENA_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, goalTop);
    this.ctx.strokeRect(ARENA_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, goalTop);
    
    // Right wall (below goal)
    this.ctx.fillRect(ARENA_WIDTH - WALL_THICKNESS, goalBottom, WALL_THICKNESS, ARENA_HEIGHT - goalBottom);
    this.ctx.strokeRect(ARENA_WIDTH - WALL_THICKNESS, goalBottom, WALL_THICKNESS, ARENA_HEIGHT - goalBottom);

    // Draw entities - all players
    const humanTeamColor = '#4a9eff'; // Blue
    const botTeamColor = '#ff6b6b'; // Red
    
    // Draw human team
    if (world.humanTeam && Array.isArray(world.humanTeam)) {
      for (const player of world.humanTeam) {
        if (player) {
          this.drawPlayer(player, humanTeamColor);
        }
      }
    }
    
    // Draw bot team
    if (world.botTeam && Array.isArray(world.botTeam)) {
      for (const player of world.botTeam) {
        if (player) {
          this.drawPlayer(player, botTeamColor);
        }
      }
    }
    
    // Draw ball
    if (world.ball) {
      this.drawBall(world.ball);
    }

    // Draw kick radius indicator for human player
    if (world.humanPlayer && world.ball) {
      this.drawKickRadius(world.humanPlayer, world.ball);
    }

    // Debug rendering
    if (this.showDebug) {
      this.drawDebug(world);
    }
  }

  private drawPlayer(player: Player, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(player.position.x, player.position.y, player.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw direction indicator
    const speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
    if (speed > 5) {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(player.position.x, player.position.y);
      this.ctx.lineTo(
        player.position.x + player.velocity.x * 0.1,
        player.position.y + player.velocity.y * 0.1
      );
      this.ctx.stroke();
    }
  }

  private drawBall(ball: Ball): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    if (this.showVelocity) {
      this.ctx.strokeStyle = '#ffff00';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(ball.position.x, ball.position.y);
      this.ctx.lineTo(
        ball.position.x + ball.velocity.x * 0.1,
        ball.position.y + ball.velocity.y * 0.1
      );
      this.ctx.stroke();
    }

    if (ball.isFrozen) {
      this.ctx.strokeStyle = '#ff0000';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(ball.position.x, ball.position.y, ball.radius + 3, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  private drawKickRadius(player: Player, ball: Ball): void {
    const { KICK_RADIUS } = ENTITY_CONSTANTS;
    const dist = vec2Distance(player.position, ball.position);
    
    // Draw kick radius circle
    this.ctx.strokeStyle = dist <= KICK_RADIUS ? '#00ff00' : '#4a9eff';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.arc(player.position.x, player.position.y, KICK_RADIUS, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawDebug(world: World): void {
    // Draw collision normals and penetration (simplified)
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 1;
    // Could add more debug info here
  }
}
