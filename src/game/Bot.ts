import { Vec2, vec2, vec2Sub, vec2Normalize, vec2Distance, vec2Scale, vec2Add, vec2Dot } from './Utils';
import { Player, Ball, ENTITY_CONSTANTS } from './Entities';
import { GameMode } from './World';

/**
 * Bot AI with teammate support and passing
 */

export class Bot {
  private ballHistory: Vec2[];
  private historySize: number;

  constructor() {
    this.ballHistory = [];
    this.historySize = 20; // Store last 20 positions
  }

  updateBallPosition(ballPos: Vec2): void {
    this.ballHistory.push(vec2(ballPos.x, ballPos.y));
    if (this.ballHistory.length > this.historySize) {
      this.ballHistory.shift();
    }
  }

  getDesiredDirection(
    bot: Player,
    ball: Ball,
    humanPlayer: Player,
    humanTeam: Player[],
    botTeam: Player[],
    isTeammate: boolean,
    gameMode?: GameMode
  ): Vec2 {
    try {
      const centerX = ENTITY_CONSTANTS.ARENA_WIDTH / 2;
      const centerY = ENTITY_CONSTANTS.ARENA_HEIGHT / 2;
      const botGoalCenter = vec2(ENTITY_CONSTANTS.ARENA_WIDTH, centerY);
      const humanGoalCenter = vec2(0, centerY);
      
      const ballOnBotSide = ball.position.x > centerX;
      const botHasBallControl = vec2Distance(bot.position, ball.position) < ENTITY_CONSTANTS.KICK_RADIUS + 20;
      const ballDistToBotGoal = vec2Distance(ball.position, botGoalCenter);
      const ballDistToHumanGoal = vec2Distance(ball.position, humanGoalCenter);
      
      // Calculate separation from nearby players (avoid clumping)
      const separationForce = this.calculateSeparation(bot, humanTeam, botTeam, isTeammate);
      
      // Predict ball future position (with safety checks)
      const ballSpeed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
      let timeToIntercept = 0;
      if (ballSpeed > 10) {
        const distToBall = vec2Distance(bot.position, ball.position);
        const denominator = ballSpeed * 0.8;
        if (denominator > 0.1 && isFinite(distToBall) && isFinite(denominator)) {
          timeToIntercept = Math.min(distToBall / denominator, 2.0);
          timeToIntercept = Math.max(0, Math.min(timeToIntercept, 2.0)); // Clamp between 0 and 2
        }
      }
      
      const predictedBallPos = vec2(
        ball.position.x + (isFinite(ball.velocity.x) ? ball.velocity.x * timeToIntercept : 0),
        ball.position.y + (isFinite(ball.velocity.y) ? ball.velocity.y * timeToIntercept : 0)
      );
      
      // Clamp predicted position
      const { ARENA_WIDTH, ARENA_HEIGHT } = ENTITY_CONSTANTS;
      predictedBallPos.x = Math.max(-100, Math.min(ARENA_WIDTH + 100, predictedBallPos.x));
      predictedBallPos.y = Math.max(-100, Math.min(ARENA_HEIGHT + 100, predictedBallPos.y));
      
      // Ensure predicted position is finite
      if (!isFinite(predictedBallPos.x) || !isFinite(predictedBallPos.y)) {
        predictedBallPos.x = ball.position.x;
        predictedBallPos.y = ball.position.y;
      }

      let target: Vec2;

      if (isTeammate) {
        // 3V3 MODE: Complex winger/playmaker logic with aggressive ball chasing
        if (gameMode === GameMode.ThreeVsThree) {
          // In 3v3, teammates should actively chase ball and look for passes
          const distToBall = vec2Distance(bot.position, ball.position);
          const distToHuman = humanPlayer ? vec2Distance(bot.position, humanPlayer.position) : Infinity;
          const humanHasBall = humanPlayer && vec2Distance(humanPlayer.position, ball.position) < 40;
          
          // Priority 1: If human has ball, position for passes/runs
          if (humanHasBall) {
            target = this.get3v3TeammatePosition(bot, ball, humanPlayer, humanTeam, ballOnBotSide, centerX, centerY, humanGoalCenter, false);
          }
          // Priority 2: If ball is close and human doesn't have it, chase it aggressively
          else if (!botHasBallControl && distToBall < 300) {
            // Chase ball to get it, then pass to human
            // But only if we're closer than human or human is far
            if (distToBall < distToHuman || distToHuman > 200) {
              target = vec2(predictedBallPos.x, predictedBallPos.y);
            } else {
              // Human is closer, support positioning
              target = this.get3v3TeammatePosition(bot, ball, humanPlayer, humanTeam, ballOnBotSide, centerX, centerY, humanGoalCenter, false);
            }
          }
          // Priority 3: If we have ball, use winger logic to pass/find human
          else if (botHasBallControl) {
            target = this.get3v3TeammatePosition(bot, ball, humanPlayer, humanTeam, ballOnBotSide, centerX, centerY, humanGoalCenter, true);
          }
          // Priority 4: Support positioning
          else {
            target = this.get3v3TeammatePosition(bot, ball, humanPlayer, humanTeam, ballOnBotSide, centerX, centerY, humanGoalCenter, false);
          }
        } else {
          // TEAMMATE AI: Support human player with better spacing (1v1, 2v2)
          if (botHasBallControl) {
            // Has ball - actively look for human to pass to
            if (humanPlayer && isFinite(humanPlayer.position.x) && isFinite(humanPlayer.position.y)) {
              const distToHuman = vec2Distance(bot.position, humanPlayer.position);
              const humanAhead = humanPlayer.position.x > bot.position.x;
              const humanInGoodPosition = humanPlayer.position.x > centerX - 100;
              
              // Priority 1: Human is ahead and in good position - lead the pass
              if (humanAhead && humanInGoodPosition && distToHuman < 400 && distToHuman > 40) {
                const humanSpeed = Math.sqrt(humanPlayer.velocity.x ** 2 + humanPlayer.velocity.y ** 2);
                const passLead = Math.min(humanSpeed * 0.35, 70);
                const humanDirection = humanSpeed > 5 
                  ? vec2Normalize(humanPlayer.velocity)
                  : vec2Normalize(vec2Sub(humanGoalCenter, humanPlayer.position));
                
                if (humanDirection && isFinite(humanDirection.x)) {
                  target = vec2(
                    humanPlayer.position.x + humanDirection.x * passLead,
                    humanPlayer.position.y + humanDirection.y * passLead
                  );
                  target.x = Math.max(0, Math.min(ENTITY_CONSTANTS.ARENA_WIDTH, target.x));
                  target.y = Math.max(80, Math.min(ENTITY_CONSTANTS.ARENA_HEIGHT - 80, target.y));
                } else {
                  target = vec2(humanPlayer.position.x, humanPlayer.position.y);
                }
              }
              // Priority 2: Human is in range - pass to them
              else if (distToHuman < 350 && distToHuman > 40 && isFinite(distToHuman)) {
                target = vec2(humanPlayer.position.x, humanPlayer.position.y);
              }
              // Priority 3: Human is too close - move forward to create space
              else if (distToHuman < 50) {
                target = vec2(Math.min(bot.position.x + 80, humanGoalCenter.x - 60), bot.position.y);
              }
              // Priority 4: Move toward goal but keep human in mind
              else {
                target = vec2(humanGoalCenter.x, humanGoalCenter.y);
              }
            } else {
              // Fallback to goal
              target = vec2(humanGoalCenter.x, humanGoalCenter.y);
            }
          } else {
            // Support positioning with spacing from other teammates
            const teammateIndex = humanTeam.indexOf(bot);
            const spacingOffset = teammateIndex * 120 - 60; // Spread teammates vertically
            
            if (ballOnBotSide) {
              // On offensive side - support attack with spacing
              const supportX = Math.max(0, Math.min(ENTITY_CONSTANTS.ARENA_WIDTH, ball.position.x - 100));
              const supportY = Math.max(60, Math.min(ENTITY_CONSTANTS.ARENA_HEIGHT - 60, ball.position.y + spacingOffset));
              target = vec2(supportX, supportY);
            } else {
              // On defensive side - help defend with spacing
              const defendX = Math.max(0, Math.min(ENTITY_CONSTANTS.ARENA_WIDTH, centerX + 120));
              const defendY = Math.max(60, Math.min(ENTITY_CONSTANTS.ARENA_HEIGHT - 60, ball.position.y + spacingOffset));
              target = vec2(defendX, defendY);
            }
          }
        }
      } else {
        // OPPONENT AI: Coordinated play with passing and spacing (2v2, 3v3)
        const is2v2 = gameMode === GameMode.TwoVsTwo;
        const is3v3 = gameMode === GameMode.ThreeVsThree;
        const isMultiplayer = is2v2 || is3v3;
        
        if (isMultiplayer) {
          // Multiplayer mode: Coordinated positioning with passing
          target = this.getOpponentCoordinatedPosition(
            bot,
            ball,
            botTeam,
            ballOnBotSide,
            centerX,
            centerY,
            humanGoalCenter,
            botHasBallControl,
            predictedBallPos,
            gameMode
          );
        } else {
          // 1v1: Simple attack/defend
          const shouldAttack = ballOnBotSide && (botHasBallControl || ballDistToHumanGoal < ballDistToBotGoal + 100);
          
          if (shouldAttack) {
            // OFFENSIVE MODE
            if (botHasBallControl) {
              target = humanGoalCenter;
              const goalOffset = (Math.random() - 0.5) * 60;
              target.y += goalOffset;
            } else {
              const ballToGoal = vec2Sub(humanGoalCenter, ball.position);
              const approachAngle = Math.atan2(ballToGoal.y, ballToGoal.x);
              const approachDistance = 40;
              target = vec2(
                ball.position.x - Math.cos(approachAngle) * approachDistance,
                ball.position.y - Math.sin(approachAngle) * approachDistance
              );
            }
          } else {
            // Normal defensive mode for 1v1, 2v2
            const ballToBotGoal = vec2Sub(botGoalCenter, ball.position);
            const ballToGoalDist = vec2Distance(ball.position, botGoalCenter);
            
            // Safety check for division
            if (ballToGoalDist < 0.1) {
              target = vec2(botGoalCenter.x, botGoalCenter.y);
            } else if (ballSpeed > 20 && isFinite(ballSpeed)) {
              const ballSpeedVec = vec2Normalize(ball.velocity);
              const ballToBotGoalNorm = vec2Normalize(ballToBotGoal);
              const dotProduct = vec2Dot(ballSpeedVec, ballToBotGoalNorm);
              
              if (isFinite(dotProduct) && dotProduct > -0.3) {
                target = vec2(predictedBallPos.x, predictedBallPos.y);
                const interceptDistToGoal = vec2Distance(target, botGoalCenter);
                if (interceptDistToGoal < 120 && isFinite(interceptDistToGoal)) {
                  const defendDistance = 100;
                  const t = Math.min(1, Math.max(0, defendDistance / ballToGoalDist));
                  if (isFinite(t)) {
                    const scaled = vec2Scale(ballToBotGoal, t);
                    target = vec2Add(ball.position, scaled);
                  }
                }
              } else {
                const defendDistance = 120;
                const t = Math.min(1, Math.max(0, defendDistance / ballToGoalDist));
                if (isFinite(t)) {
                  const scaled = vec2Scale(ballToBotGoal, t);
                  target = vec2Add(ball.position, scaled);
                } else {
                  target = vec2(ball.position.x, ball.position.y);
                }
              }
            } else {
              const defendDistance = 120;
              const t = Math.min(1, Math.max(0, defendDistance / ballToGoalDist));
              if (isFinite(t) && ballToGoalDist > 0.1) {
                const scaled = vec2Scale(ballToBotGoal, t);
                target = vec2Add(ball.position, scaled);
              } else {
                target = vec2(ball.position.x, ball.position.y);
              }
            }
            
            // Clamp target position
            target.x = Math.max(centerX + 50, Math.min(ENTITY_CONSTANTS.ARENA_WIDTH, target.x));
            target.y = Math.max(0, Math.min(ENTITY_CONSTANTS.ARENA_HEIGHT, target.y));
            
            // Final safety check
            if (!isFinite(target.x) || !isFinite(target.y)) {
              target = vec2(ball.position.x, ball.position.y);
            }
          }
        }
      }

      // Calculate direction to target
      let direction = vec2Sub(target, bot.position);
      const distToTarget = vec2Distance(bot.position, target);

      // Safety check
      if (!isFinite(distToTarget) || distToTarget < 0.1) {
        direction = vec2(1, 0);
      }
      
      // Ensure direction is finite before further processing
      if (!isFinite(direction.x) || !isFinite(direction.y)) {
        direction = vec2(1, 0);
      }

      // Apply separation to avoid clumping (stronger in 3v3)
      if (separationForce && (separationForce.x !== 0 || separationForce.y !== 0)) {
        const is3v3 = gameMode === GameMode.ThreeVsThree;
        const separationWeight = is3v3 ? 0.5 : 0.4; // Stronger separation in 3v3
        direction = vec2Add(
          vec2Scale(direction, 1 - separationWeight),
          vec2Scale(separationForce, separationWeight)
        );
      }

      // Fine-tune for teammates
      if (isTeammate && distToTarget < 80 && distToTarget > 0.1) {
        const goalDirection = vec2Sub(humanGoalCenter, bot.position);
        const goalDist = vec2Distance(bot.position, humanGoalCenter);
        if (goalDist > 0.1) {
          const blendFactor = 0.2;
          direction = vec2Add(
            vec2Scale(direction, 1 - blendFactor),
            vec2Scale(goalDirection, blendFactor)
          );
        }
      }

      const normalized = vec2Normalize(direction);
      
      // Safety check
      if (!isFinite(normalized.x) || !isFinite(normalized.y)) {
        return vec2(1, 0);
      }
      
      return normalized;
    } catch (error) {
      console.error('Bot AI error:', error);
      const fallbackDir = vec2Sub(ball.position, bot.position);
      const normalized = vec2Normalize(fallbackDir);
      return isFinite(normalized.x) && isFinite(normalized.y) ? normalized : vec2(1, 0);
    }
  }

  private get3v3TeammatePosition(
    bot: Player,
    ball: Ball,
    humanPlayer: Player,
    humanTeam: Player[],
    ballOnBotSide: boolean,
    centerX: number,
    centerY: number,
    humanGoalCenter: Vec2,
    botHasBallControl: boolean
  ): Vec2 {
    const { ARENA_WIDTH, ARENA_HEIGHT } = ENTITY_CONSTANTS;
    const teammateIndex = humanTeam.indexOf(bot);
    const isLeftWinger = teammateIndex === 1; // First teammate (left winger)
    const isRightWinger = teammateIndex === 2; // Second teammate (right winger)
    
    // Winger positions - wide on the field
    const topWingerY = centerY - 120;
    const bottomWingerY = centerY + 120;
    
    if (botHasBallControl) {
      // HAS BALL: Advanced passing logic - prioritize human player
      if (humanPlayer && isFinite(humanPlayer.position.x) && isFinite(humanPlayer.position.y)) {
        const distToHuman = vec2Distance(bot.position, humanPlayer.position);
        const humanAhead = humanPlayer.position.x > bot.position.x;
        const humanInGoodPosition = humanPlayer.position.x > centerX - 100;
        
        // Priority 1: Human is ahead and in good position - pass to them (with better leading)
        if (humanAhead && humanInGoodPosition && distToHuman < 450 && distToHuman > 40) {
          // Predict where human will be (lead the pass more aggressively)
          const humanSpeed = Math.sqrt(humanPlayer.velocity.x ** 2 + humanPlayer.velocity.y ** 2);
          const passLead = Math.min(humanSpeed * 0.5, 90); // More aggressive lead
          const humanDirection = humanSpeed > 5 
            ? vec2Normalize(humanPlayer.velocity)
            : vec2Normalize(vec2Sub(humanGoalCenter, humanPlayer.position));
          
          if (humanDirection && isFinite(humanDirection.x)) {
            const passTarget = vec2(
              humanPlayer.position.x + humanDirection.x * passLead,
              humanPlayer.position.y + humanDirection.y * passLead
            );
            // Clamp to valid area
            passTarget.x = Math.max(0, Math.min(ARENA_WIDTH, passTarget.x));
            passTarget.y = Math.max(80, Math.min(ARENA_HEIGHT - 80, passTarget.y));
            return passTarget;
          }
        }
        
        // Priority 1.5: Human is in range (even if not ahead) - still try to pass
        if (distToHuman < 400 && distToHuman > 40 && humanInGoodPosition) {
          const humanSpeed = Math.sqrt(humanPlayer.velocity.x ** 2 + humanPlayer.velocity.y ** 2);
          const passLead = Math.min(humanSpeed * 0.4, 70);
          const humanDirection = humanSpeed > 5 
            ? vec2Normalize(humanPlayer.velocity)
            : vec2Normalize(vec2Sub(humanGoalCenter, humanPlayer.position));
          
          if (humanDirection && isFinite(humanDirection.x)) {
            const passTarget = vec2(
              humanPlayer.position.x + humanDirection.x * passLead,
              humanPlayer.position.y + humanDirection.y * passLead
            );
            passTarget.x = Math.max(0, Math.min(ARENA_WIDTH, passTarget.x));
            passTarget.y = Math.max(80, Math.min(ARENA_HEIGHT - 80, passTarget.y));
            return passTarget;
          }
        }
        
        // Priority 2: Human is behind but close - move forward to create space, then pass
        if (!humanAhead && distToHuman < 200) {
          const spaceAhead = vec2(
            Math.min(bot.position.x + 100, humanGoalCenter.x - 60),
            bot.position.y
          );
          return spaceAhead;
        }
        
        // Priority 3: Human too close - move away to create passing angle
        if (distToHuman < 50) {
          const angleAway = isLeftWinger 
            ? vec2(bot.position.x, Math.max(80, bot.position.y - 80))
            : vec2(bot.position.x, Math.min(ARENA_HEIGHT - 80, bot.position.y + 80));
          return angleAway;
        }
      }
      
      // No good pass option - advance toward goal
      return vec2(humanGoalCenter.x - 100, bot.position.y);
    } else {
      // WITHOUT BALL: Advanced positioning as winger/playmaker
      const humanHasBall = humanPlayer && vec2Distance(humanPlayer.position, ball.position) < 40;
      
      if (ballOnBotSide) {
        // OFFENSIVE: Complex winger positioning
        if (isLeftWinger) {
          if (humanHasBall) {
            // Human has ball - make intelligent runs
            // Option 1: Make overlapping run (cut inside)
            if (humanPlayer.position.x > centerX + 50) {
              const overlapRun = vec2(
                Math.min(humanPlayer.position.x + 80, humanGoalCenter.x - 40),
                Math.max(80, Math.min(ARENA_HEIGHT - 80, centerY - 60))
              );
              return overlapRun;
            }
            
            // Option 2: Stay wide for cross/through ball
            const widePosition = vec2(
              Math.max(ball.position.x - 40, centerX - 30),
              Math.max(80, Math.min(ARENA_HEIGHT - 80, topWingerY))
            );
            return widePosition;
          } else {
            // Ball with opponent or teammate - support positioning
            const supportX = Math.max(ball.position.x - 80, centerX - 60);
            const supportY = Math.max(80, Math.min(ARENA_HEIGHT - 80, topWingerY));
            return vec2(supportX, supportY);
          }
        } else if (isRightWinger) {
          if (humanHasBall) {
            // Human has ball - make intelligent runs
            // Option 1: Make overlapping run (cut inside)
            if (humanPlayer.position.x > centerX + 50) {
              const overlapRun = vec2(
                Math.min(humanPlayer.position.x + 80, humanGoalCenter.x - 40),
                Math.max(80, Math.min(ARENA_HEIGHT - 80, centerY + 60))
              );
              return overlapRun;
            }
            
            // Option 2: Stay wide for cross/through ball
            const widePosition = vec2(
              Math.max(ball.position.x - 40, centerX - 30),
              Math.max(80, Math.min(ARENA_HEIGHT - 80, bottomWingerY))
            );
            return widePosition;
          } else {
            // Ball with opponent or teammate - support positioning
            const supportX = Math.max(ball.position.x - 80, centerX - 60);
            const supportY = Math.max(80, Math.min(ARENA_HEIGHT - 80, bottomWingerY));
            return vec2(supportX, supportY);
          }
        }
      } else {
        // DEFENSIVE: Wingers track back but maintain width for counter-attack
        if (isLeftWinger) {
          const defendX = Math.max(centerX + 100, ball.position.x - 120);
          const defendY = Math.max(80, Math.min(ARENA_HEIGHT - 80, topWingerY));
          return vec2(defendX, defendY);
        } else if (isRightWinger) {
          const defendX = Math.max(centerX + 100, ball.position.x - 120);
          const defendY = Math.max(80, Math.min(ARENA_HEIGHT - 80, bottomWingerY));
          return vec2(defendX, defendY);
        }
      }
    }
    
    // Fallback: stay in position
    return vec2(bot.position.x, bot.position.y);
  }

  private getOpponentCoordinatedPosition(
    bot: Player,
    ball: Ball,
    botTeam: Player[],
    ballOnBotSide: boolean,
    centerX: number,
    centerY: number,
    humanGoalCenter: Vec2,
    botHasBallControl: boolean,
    predictedBallPos: Vec2,
    gameMode: GameMode
  ): Vec2 {
    const { ARENA_WIDTH, ARENA_HEIGHT } = ENTITY_CONSTANTS;
    const botIndex = botTeam.indexOf(bot);
    const is2v2 = gameMode === GameMode.TwoVsTwo;
    const is3v3 = gameMode === GameMode.ThreeVsThree;
    
    if (botHasBallControl) {
      // HAS BALL: Look for passing opportunities to teammates
      const teammates = botTeam.filter(p => p && p !== bot);
      
      if (teammates.length > 0) {
        // Find best teammate to pass to
        let bestTeammate: Player | null = null;
        let bestScore = Infinity;
        
        for (const teammate of teammates) {
          if (!teammate || !isFinite(teammate.position.x)) continue;
          
          const dist = vec2Distance(bot.position, teammate.position);
          const teammateAhead = teammate.position.x > bot.position.x;
          const teammateInGoodPosition = teammate.position.x > centerX - 80;
          const teammateOpen = dist > 50 && dist < 350;
          
          // Prefer teammates that are ahead, in good position, and open
          const score = dist + (teammateAhead ? -80 : 100) + (teammateInGoodPosition ? -50 : 50) + (teammateOpen ? -30 : 50);
          
          if (dist < 400 && dist > 40 && isFinite(score) && score < bestScore) {
            bestScore = score;
            bestTeammate = teammate;
          }
        }
        
        if (bestTeammate && isFinite(bestTeammate.position.x)) {
          // Pass to teammate - predict their position
          const teammateSpeed = Math.sqrt(bestTeammate.velocity.x ** 2 + bestTeammate.velocity.y ** 2);
          const passLead = Math.min(teammateSpeed * 0.3, 60);
          const teammateDir = teammateSpeed > 5 
            ? vec2Normalize(bestTeammate.velocity)
            : vec2Normalize(vec2Sub(humanGoalCenter, bestTeammate.position));
          
          if (teammateDir && isFinite(teammateDir.x)) {
            const passTarget = vec2(
              bestTeammate.position.x + teammateDir.x * passLead,
              bestTeammate.position.y + teammateDir.y * passLead
            );
            passTarget.x = Math.max(0, Math.min(ARENA_WIDTH, passTarget.x));
            passTarget.y = Math.max(80, Math.min(ARENA_HEIGHT - 80, passTarget.y));
            return passTarget;
          }
          
          return vec2(bestTeammate.position.x, bestTeammate.position.y);
        }
      }
      
      // No good pass - attack goal
      return vec2(humanGoalCenter.x, humanGoalCenter.y);
    } else {
      // WITHOUT BALL: Strategic positioning with spacing
      if (ballOnBotSide) {
        // OFFENSIVE: Spread out and support attack
        if (is2v2) {
          // 2v2: One chases, one supports
          if (botIndex === 0) {
            // First bot - chase ball
            const distToBall = vec2Distance(bot.position, ball.position);
            if (distToBall < 250) {
              return vec2(predictedBallPos.x, predictedBallPos.y);
            } else {
              // Support position
              return vec2(ball.position.x - 80, centerY);
            }
          } else {
            // Second bot - support wide
            const supportX = Math.max(ball.position.x - 100, centerX - 40);
            const supportY = botIndex === 1 ? centerY - 100 : centerY + 100;
            return vec2(supportX, Math.max(80, Math.min(ARENA_HEIGHT - 80, supportY)));
          }
        } else if (is3v3) {
          // 3v3: Center, left winger, right winger
          const isCenter = botIndex === 0;
          const isLeftWinger = botIndex === 1;
          const isRightWinger = botIndex === 2;
          
          if (isCenter) {
            // Center - chase ball or support
            const distToBall = vec2Distance(bot.position, ball.position);
            if (distToBall < 200) {
              return vec2(predictedBallPos.x, predictedBallPos.y);
            } else {
              return vec2(ball.position.x - 70, centerY);
            }
          } else if (isLeftWinger) {
            // Left winger - stay wide left
            const wingerX = Math.max(ball.position.x - 90, centerX - 50);
            const wingerY = Math.max(80, Math.min(ARENA_HEIGHT - 80, centerY - 110));
            return vec2(wingerX, wingerY);
          } else if (isRightWinger) {
            // Right winger - stay wide right
            const wingerX = Math.max(ball.position.x - 90, centerX - 50);
            const wingerY = Math.max(80, Math.min(ARENA_HEIGHT - 80, centerY + 110));
            return vec2(wingerX, wingerY);
          }
        }
      } else {
        // DEFENSIVE: Coordinate defense with spacing
        if (is2v2) {
          // 2v2: One defends goal, one intercepts
          if (botIndex === 0) {
            // First bot - defend goal area
            const defendX = Math.max(centerX + 100, ball.position.x - 100);
            return vec2(defendX, centerY);
          } else {
            // Second bot - intercept or wide defense
            const defendX = Math.max(centerX + 80, ball.position.x - 120);
            const defendY = botIndex === 1 ? centerY - 100 : centerY + 100;
            return vec2(defendX, Math.max(80, Math.min(ARENA_HEIGHT - 80, defendY)));
          }
        } else if (is3v3) {
          // 3v3: Coordinated defense
          const isCenter = botIndex === 0;
          const isLeftWinger = botIndex === 1;
          const isRightWinger = botIndex === 2;
          
          if (isCenter) {
            // Center - defend goal area
            const defendX = Math.max(centerX + 110, ball.position.x - 100);
            return vec2(defendX, centerY);
          } else if (isLeftWinger) {
            // Left defender - wide left
            const defendX = Math.max(centerX + 90, ball.position.x - 130);
            const defendY = Math.max(80, Math.min(ARENA_HEIGHT - 80, centerY - 100));
            return vec2(defendX, defendY);
          } else if (isRightWinger) {
            // Right defender - wide right
            const defendX = Math.max(centerX + 90, ball.position.x - 130);
            const defendY = Math.max(80, Math.min(ARENA_HEIGHT - 80, centerY + 100));
            return vec2(defendX, defendY);
          }
        }
      }
    }
    
    // Fallback
    return vec2(ball.position.x, ball.position.y);
  }

  private calculateSeparation(
    bot: Player,
    humanTeam: Player[],
    botTeam: Player[],
    isTeammate: boolean
  ): Vec2 {
    const separationRadius = 100; // Increased radius in 3v3 to prevent clumping
    let separation = vec2(0, 0);
    let count = 0;

    // Check all players (both teams)
    const allPlayers = [...humanTeam, ...botTeam];
    
    for (const other of allPlayers) {
      if (!other || other === bot) continue;
      if (!isFinite(other.position.x) || !isFinite(other.position.y)) continue;

      const dist = vec2Distance(bot.position, other.position);
      
      if (dist < separationRadius && dist > 0.1) {
        // Calculate direction away from other player
        const away = vec2Normalize(vec2Sub(bot.position, other.position));
        if (away && isFinite(away.x) && isFinite(away.y)) {
          // Stronger separation when closer, especially for same team
          const isSameTeam = (isTeammate && humanTeam.includes(other)) || (!isTeammate && botTeam.includes(other));
          const baseStrength = (separationRadius - dist) / separationRadius;
          const strength = isSameTeam ? baseStrength * 1.5 : baseStrength; // Stronger separation from teammates/teammates
          separation = vec2Add(separation, vec2Scale(away, strength));
          count++;
        }
      }
    }

    if (count > 0 && (separation.x !== 0 || separation.y !== 0)) {
      return vec2Normalize(separation);
    }

    return vec2(0, 0);
  }

  shouldKick(
    bot: Player,
    ball: Ball,
    difficulty: number,
    isTeammate: boolean = false,
    humanPlayer?: Player,
    gameMode?: GameMode
  ): boolean {
    const dist = vec2Distance(bot.position, ball.position);
    const kickRadius = ENTITY_CONSTANTS.KICK_RADIUS;
    
    if (dist > kickRadius || ball.isFrozen) {
      return false;
    }

    const centerX = ENTITY_CONSTANTS.ARENA_WIDTH / 2;
    const ballOnBotSide = ball.position.x > centerX;
    const botOnOffensiveSide = bot.position.x > centerX - 100;
    
    const ballSpeed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
    
    // Teammates: Aggressive passing to human player (2v2 and 3v3)
    if (isTeammate && humanPlayer && (gameMode === GameMode.TwoVsTwo || gameMode === GameMode.ThreeVsThree)) {
      const distToHuman = vec2Distance(bot.position, humanPlayer.position);
      const humanAhead = humanPlayer.position.x > bot.position.x;
      const humanInGoodPosition = humanPlayer.position.x > centerX - 100; // Human is in offensive half
      const humanOpen = distToHuman > 40 && distToHuman < 450; // Human is open and in range
      
      // Very high priority: Human is ahead, in good position, and open - almost always pass
      if (humanAhead && humanInGoodPosition && humanOpen && ballSpeed < 280) {
        return Math.random() < 0.95; // 95% chance to pass
      }
      
      // High priority: Human is ahead and in range - pass most of the time
      if (humanAhead && humanOpen && ballSpeed < 260) {
        return Math.random() < 0.9; // 90% chance to pass
      }
      
      // Medium-high priority: Human is in good position and open
      if (humanInGoodPosition && humanOpen && ballSpeed < 240) {
        return Math.random() < 0.85; // 85% chance
      }
      
      // Medium priority: Human nearby and open - try to pass
      if (humanOpen && ballSpeed < 220) {
        return Math.random() < 0.8; // 80% chance
      }
      
      // Low-medium priority: Human anywhere in range - still try
      if (distToHuman < 500 && distToHuman > 30 && ballSpeed < 200) {
        return Math.random() < 0.65; // 65% chance
      }
      
      // Even if ball is moving faster, if human is very close and ahead, try to pass
      if (humanAhead && distToHuman < 200 && distToHuman > 40 && ballSpeed < 300) {
        return Math.random() < 0.7; // 70% chance
      }
    }
    
    const shouldKickForOffense = ballOnBotSide && botOnOffensiveSide && ballSpeed < 200;
    
    // In 2v2 and 3v3, opponents should pass more often
    if (!isTeammate && (gameMode === GameMode.TwoVsTwo || gameMode === GameMode.ThreeVsThree)) {
      // Higher chance to pass/kick for coordinated plays
      if (ballOnBotSide && botOnOffensiveSide && ballSpeed < 220) {
        return Math.random() < 0.75; // 75% chance to pass/kick
      }
      if (ballSpeed < 180) {
        return Math.random() < 0.6; // 60% chance even when slower
      }
    }
    
    const kickProbability = difficulty * 0.7 + 0.3;
    
    return shouldKickForOffense && Math.random() < kickProbability;
  }
}
