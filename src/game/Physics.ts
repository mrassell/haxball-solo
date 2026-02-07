import { Entity, Player, Ball, ENTITY_CONSTANTS, EntityType } from './Entities';
import { Vec2, vec2, vec2Sub, vec2Normalize, vec2Dot, vec2Scale, vec2Add, vec2Length } from './Utils';

/**
 * Physics collision detection and resolution
 */

export interface Collision {
  entityA: Entity;
  entityB: Entity;
  normal: Vec2;
  penetration: number;
}

export interface WallCollision {
  entity: Entity;
  normal: Vec2;
  penetration: number;
}

/**
 * Detect circle-circle collision
 */
export function detectCircleCollision(a: Entity, b: Entity): Collision | null {
  const dx = b.position.x - a.position.x;
  const dy = b.position.y - a.position.y;
  const distSq = dx * dx + dy * dy;
  const minDist = a.radius + b.radius;

  if (distSq >= minDist * minDist) {
    return null;
  }

  const dist = Math.sqrt(distSq);
  const penetration = minDist - dist;

  // Normal points from A to B
  const normal = dist > 0.0001 ? vec2Normalize(vec2(dx, dy)) : vec2(1, 0);

  return {
    entityA: a,
    entityB: b,
    normal,
    penetration,
  };
}

/**
 * Resolve circle-circle collision using impulse method
 */
export function resolveCircleCollision(collision: Collision, dt: number): void {
  const { entityA, entityB, normal, penetration } = collision;

  // Positional correction to prevent sinking
  if (penetration > ENTITY_CONSTANTS.COLLISION_SLOP) {
    const correction = ENTITY_CONSTANTS.POSITION_CORRECTION_PERCENT * penetration;
    const totalInvMass = entityA.invMass + entityB.invMass;
    if (totalInvMass > 0) {
      const correctionA = correction * (entityA.invMass / totalInvMass);
      const correctionB = correction * (entityB.invMass / totalInvMass);
      entityA.position.x -= normal.x * correctionA;
      entityA.position.y -= normal.y * correctionA;
      entityB.position.x += normal.x * correctionB;
      entityB.position.y += normal.y * correctionB;
    }
  }

  // Relative velocity
  const relativeVel = vec2Sub(entityB.velocity, entityA.velocity);
  const velAlongNormal = vec2Dot(relativeVel, normal);

  // Don't resolve if velocities are separating
  if (velAlongNormal > 0) {
    return;
  }

  // Restitution (use minimum of both)
  const e = Math.min(entityA.restitution, entityB.restitution);

  // Impulse scalar
  const invMassSum = entityA.invMass + entityB.invMass;
  if (invMassSum === 0) return;

  const impulseScalar = -(1 + e) * velAlongNormal / invMassSum;
  const impulse = vec2Scale(normal, impulseScalar);

  // Apply impulse
  entityA.applyImpulse(vec2Scale(impulse, -1));
  entityB.applyImpulse(impulse);
}

/**
 * Detect collision with arena walls
 */
export function detectWallCollision(entity: Entity): WallCollision | null {
  const { ARENA_WIDTH, ARENA_HEIGHT, GOAL_HEIGHT, WALL_THICKNESS } = ENTITY_CONSTANTS;
  const centerY = ARENA_HEIGHT / 2;
  const goalTop = centerY - GOAL_HEIGHT / 2;
  const goalBottom = centerY + GOAL_HEIGHT / 2;

  let normal: Vec2 | null = null;
  let penetration = 0;

  // Left wall (with goal opening)
  if (entity.position.x - entity.radius < WALL_THICKNESS) {
    // Players cannot pass through goal opening (treat as wall), but ball can
    const isPlayer = entity.type === EntityType.Player;
    if (isPlayer || entity.position.y < goalTop || entity.position.y > goalBottom) {
      // Hit wall (players always hit, ball only hits if above/below goal)
      normal = vec2(1, 0);
      penetration = WALL_THICKNESS - (entity.position.x - entity.radius);
    }
    // Ball in goal opening can pass through (for scoring)
  }

  // Right wall (with goal opening)
  if (entity.position.x + entity.radius > ARENA_WIDTH - WALL_THICKNESS) {
    // Players cannot pass through goal opening (treat as wall), but ball can
    const isPlayer = entity.type === EntityType.Player;
    if (isPlayer || entity.position.y < goalTop || entity.position.y > goalBottom) {
      // Hit wall (players always hit, ball only hits if above/below goal)
      normal = vec2(-1, 0);
      penetration = (entity.position.x + entity.radius) - (ARENA_WIDTH - WALL_THICKNESS);
    }
    // Ball in goal opening can pass through (for scoring)
  }

  // Top wall
  if (entity.position.y - entity.radius < WALL_THICKNESS) {
    normal = vec2(0, 1);
    penetration = WALL_THICKNESS - (entity.position.y - entity.radius);
  }

  // Bottom wall
  if (entity.position.y + entity.radius > ARENA_HEIGHT - WALL_THICKNESS) {
    normal = vec2(0, -1);
    penetration = (entity.position.y + entity.radius) - (ARENA_HEIGHT - WALL_THICKNESS);
  }

  if (normal && penetration > 0) {
    return { entity, normal, penetration };
  }

  return null;
}

/**
 * Resolve wall collision
 */
export function resolveWallCollision(collision: WallCollision, dt: number): void {
  const { entity, normal, penetration } = collision;

  // Positional correction
  if (penetration > ENTITY_CONSTANTS.COLLISION_SLOP) {
    const correction = ENTITY_CONSTANTS.POSITION_CORRECTION_PERCENT * penetration;
    entity.position.x += normal.x * correction;
    entity.position.y += normal.y * correction;
  }

  // Reflect velocity
  const velAlongNormal = vec2Dot(entity.velocity, normal);
  if (velAlongNormal < 0) {
    const reflectedVel = vec2Scale(normal, -2 * velAlongNormal * entity.restitution);
    entity.velocity.x += reflectedVel.x;
    entity.velocity.y += reflectedVel.y;
  }
}

/**
 * Check if ball scored (crossed goal line)
 */
export function checkGoal(ball: Ball): 'left' | 'right' | null {
  const { ARENA_WIDTH, ARENA_HEIGHT, GOAL_HEIGHT } = ENTITY_CONSTANTS;
  const centerY = ARENA_HEIGHT / 2;
  const goalTop = centerY - GOAL_HEIGHT / 2;
  const goalBottom = centerY + GOAL_HEIGHT / 2;

  // Left goal
  if (ball.position.x - ball.radius < 0 && ball.position.y >= goalTop && ball.position.y <= goalBottom) {
    return 'right'; // Right team scored (ball went into left goal)
  }

  // Right goal
  if (ball.position.x + ball.radius > ARENA_WIDTH && ball.position.y >= goalTop && ball.position.y <= goalBottom) {
    return 'left'; // Left team scored (ball went into right goal)
  }

  return null;
}
