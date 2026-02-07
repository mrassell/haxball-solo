import { Vec2, vec2Zero, vec2Normalize } from './Utils';

/**
 * Input handling for keyboard controls
 */

export class Input {
  private keys: Set<string>;
  private paused: boolean;
  private justPressedKeys: Set<string>;

  constructor() {
    this.keys = new Set();
    this.justPressedKeys = new Set();
    this.paused = false;
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      
      // Prevent default behavior for spacebar (page scroll)
      if (key === ' ' || key === 'space') {
        e.preventDefault();
      }
      
      if (!this.keys.has(key)) {
        this.justPressedKeys.add(key);
      }
      this.keys.add(key);
      if (key === 'p') {
        this.paused = !this.paused;
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      
      // Prevent default behavior for spacebar
      if (key === ' ' || key === 'space') {
        e.preventDefault();
      }
      
      this.keys.delete(key);
    });
  }

  clearJustPressed(): void {
    this.justPressedKeys.clear();
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  isPaused(): boolean {
    return this.paused;
  }

  getPlayerInput(): Vec2 {
    const input = vec2Zero();

    // WASD or Arrow keys
    if (this.isKeyPressed('w') || this.isKeyPressed('arrowup')) {
      input.y -= 1;
    }
    if (this.isKeyPressed('s') || this.isKeyPressed('arrowdown')) {
      input.y += 1;
    }
    if (this.isKeyPressed('a') || this.isKeyPressed('arrowleft')) {
      input.x -= 1;
    }
    if (this.isKeyPressed('d') || this.isKeyPressed('arrowright')) {
      input.x += 1;
    }

    // Normalize diagonal input so diagonals aren't faster
    return vec2Normalize(input);
  }

  isKickJustPressed(): boolean {
    return this.justPressedKeys.has(' ');
  }
}
