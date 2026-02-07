import { Game } from './game/Game';
import { GameMode } from './game/World';
import './style.css';

/**
 * Entry point - initialize game and UI
 */

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

let game = new Game(canvas, GameMode.OneVsOne);
let isChangingMode = false;
let currentGameMode: GameMode = GameMode.OneVsOne;

// UI elements
const gameModeSelect = document.getElementById('gameModeSelect') as HTMLSelectElement;
const resetButton = document.getElementById('resetButton') as HTMLButtonElement;
const scoreDisplay = document.getElementById('scoreDisplay') as HTMLDivElement;

// Setup game mode selector with better protection
gameModeSelect.addEventListener('change', (e) => {
  // Prevent rapid changes and duplicate events
  if (isChangingMode) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  
  const mode = (e.target as HTMLSelectElement).value;
  let gameMode: GameMode;
  
  switch (mode) {
    case '1v1':
      gameMode = GameMode.OneVsOne;
      break;
    case '2v2':
      gameMode = GameMode.TwoVsTwo;
      break;
    case '3v3':
      gameMode = GameMode.ThreeVsThree;
      break;
    default:
      gameMode = GameMode.OneVsOne;
  }
  
  // Don't change if it's the same mode
  if (gameMode === currentGameMode) {
    return;
  }
  
  isChangingMode = true;
  gameModeSelect.disabled = true; // Disable during change
  
  try {
    game.setGameMode(gameMode);
    currentGameMode = gameMode;
    updateScore({ human: 0, bot: 0 });
  } catch (error) {
    console.error('Error changing game mode:', error);
    // Revert select to previous value on error
    switch (currentGameMode) {
      case GameMode.OneVsOne:
        gameModeSelect.value = '1v1';
        break;
      case GameMode.TwoVsTwo:
        gameModeSelect.value = '2v2';
        break;
      case GameMode.ThreeVsThree:
        gameModeSelect.value = '3v3';
        break;
    }
  } finally {
    // Re-enable and reset flag after change completes
    setTimeout(() => {
      isChangingMode = false;
      gameModeSelect.disabled = false;
    }, 200);
  }
});

// Setup reset button
resetButton.addEventListener('click', () => {
  game.reset();
  updateScore({ human: 0, bot: 0 });
});

// Setup score update callback
game.setOnScoreUpdate((score) => {
  updateScore(score);
});

function updateScore(score: { human: number; bot: number }): void {
  if (scoreDisplay) {
    scoreDisplay.textContent = `Human: ${score.human} - Bot: ${score.bot}`;
  }
}

// Initialize
updateScore({ human: 0, bot: 0 });

// Start game loop
game.start();
