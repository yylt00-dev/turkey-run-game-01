// Keyboard, mouse and touch input. The game listens for edges (a press
// is one action) and the main loop polls the held state for sliding.
// Space / ArrowUp / W / click / tap = jump (twice = flap). ArrowDown / S
// = slide. Enter = start / restart. P = pause. M = mute.
export class Input {
  constructor(canvas, onAction) {
    this.jumpQueued = false;
    this.slideHeld = false;
    this.onAction = onAction; // ('start' | 'restart' | 'pause' | 'mute')
    this.keys = new Set();

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      const code = event.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(code)) {
        event.preventDefault();
      }
      this.keys.add(code);
      if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.jumpQueued = true;
      if (code === 'ArrowDown' || code === 'KeyS') this.slideHeld = true;
      if (code === 'Enter') this.onAction('confirm');
      if (code === 'KeyP') this.onAction('pause');
      if (code === 'KeyM') this.onAction('mute');
      if (code === 'KeyR') this.onAction('restart');
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      if (event.code === 'ArrowDown' || event.code === 'KeyS') this.slideHeld = false;
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.slideHeld = false;
    });

    // Mouse and touch: a press anywhere on the canvas is a jump. Buttons
    // on the title / end screens are real DOM buttons, so clicks on them
    // do not reach here.
    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.jumpQueued = true;
    });
  }

  /** Take the queued jump, if any; call once per simulation step. */
  takeJump() {
    const jump = this.jumpQueued;
    this.jumpQueued = false;
    return jump;
  }

  isSliding() {
    return this.slideHeld;
  }
}
