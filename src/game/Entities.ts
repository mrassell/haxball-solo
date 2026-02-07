import { Vec2, vec2, vec2Zero } from './Utils';

/**
 * Entity types and constants
 */

export const ENTITY_CONSTANTS = {
  // Player properties
  PLAYER_RADIUS: 18,
  PLAYER_MASS: 2.2,
  PLAYER_RESTITUTION: 0.35,
  PLAYER_MAX_SPEED: 180, // px/s (slower for kick-focused gameplay)
  PLAYER_ACCELERATION: 500, // px/s^2 (slower acceleration)
  PLAYER_DAMPING: 0.991, // per tick at 60Hz (increased for smoother deceleration)
  KICK_RADIUS: 35, // Radius around player to detect ball for kicking
  KICK_FORCE: 320, // Force applied when kicking the ball (px/s) - reduced for slower kicks

  // Ball properties
  BALL_RADIUS: 10,
  BALL_MASS: 0.9,
  BALL_RESTITUTION: 0.88, // increased for air hockey-like bounciness
  BALL_MAX_SPEED: 350, // px/s (further reduced for slower ball movement)
  BALL_DAMPING: 0.992, // per tick at 60Hz (increased damping for faster deceleration)

  // Arena dimensions
  ARENA_WIDTH: 900,
  ARENA_HEIGHT: 540,
  GOAL_HEIGHT: 160,
  WALL_THICKNESS: 20, // Increased for better visibility

  // Physics constants
  COLLISION_SLOP: 0.1, // Positional correction threshold
  POSITION_CORRECTION_PERCENT: 0.8, // How much to correct overlap
} as const;

export enum EntityType {
  Player = 'player',
  Ball = 'ball',
}

export class Entity {
  type: EntityType;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  mass: number;
  restitution: number;
  maxSpeed: number;
  damping: number;

  constructor(
    type: EntityType,
    position: Vec2,
    radius: number,
    mass: number,
    restitution: number,
    maxSpeed: number,
    damping: number
  ) {
    this.type = type;
    this.position = vec2(position.x, position.y);
    this.velocity = vec2Zero();
    this.radius = radius;
    this.mass = mass;
    this.restitution = restitution;
    this.maxSpeed = maxSpeed;
    this.damping = damping;
  }

  get invMass(): number {
    return this.mass > 0 ? 1 / this.mass : 0;
  }

  update(dt: number): void {
    // Apply damping
    this.velocity.x *= this.damping;
    this.velocity.y *= this.damping;

    // Clamp speed
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
    }

    // Update position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }

  applyImpulse(impulse: Vec2): void {
    this.velocity.x += impulse.x * this.invMass;
    this.velocity.y += impulse.y * this.invMass;
  }
}

export class Player extends Entity {
  isHuman: boolean;
  inputAcceleration: Vec2;

  constructor(position: Vec2, isHuman: boolean) {
    super(
      EntityType.Player,
      position,
      ENTITY_CONSTANTS.PLAYER_RADIUS,
      ENTITY_CONSTANTS.PLAYER_MASS,
      ENTITY_CONSTANTS.PLAYER_RESTITUTION,
      ENTITY_CONSTANTS.PLAYER_MAX_SPEED,
      ENTITY_CONSTANTS.PLAYER_DAMPING
    );
    this.isHuman = isHuman;
    this.inputAcceleration = vec2Zero();
  }

  update(dt: number, accelerationMultiplier: number = 1.0): void {
    // Apply input acceleration
    const accel = ENTITY_CONSTANTS.PLAYER_ACCELERATION * accelerationMultiplier;
    this.velocity.x += this.inputAcceleration.x * accel * dt;
    this.velocity.y += this.inputAcceleration.y * accel * dt;

    // Call parent update for damping and clamping
    super.update(dt);
  }
}

export class Ball extends Entity {
  isFrozen: boolean;
  freezeTime: number;

  constructor(position: Vec2) {
    super(
      EntityType.Ball,
      position,
      ENTITY_CONSTANTS.BALL_RADIUS,
      ENTITY_CONSTANTS.BALL_MASS,
      ENTITY_CONSTANTS.BALL_RESTITUTION,
      ENTITY_CONSTANTS.BALL_MAX_SPEED,
      ENTITY_CONSTANTS.BALL_DAMPING
    );
    this.isFrozen = false;
    this.freezeTime = 0;
  }

  update(dt: number): void {
    if (this.isFrozen) {
      this.freezeTime -= dt;
      if (this.freezeTime <= 0) {
        this.isFrozen = false;
      } else {
        // Ball is frozen, don't update
        return;
      }
    }
    super.update(dt);
  }

  freeze(duration: number): void {
    this.isFrozen = true;
    this.freezeTime = duration;
    this.velocity = vec2Zero();
  }
}
