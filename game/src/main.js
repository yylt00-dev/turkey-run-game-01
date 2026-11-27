// Turkey Run — entry point. Owns the screen state machine (title, play,
// caught, escaped), the animation loop, the DOM buttons and the status
// line, and wires input, world, rendering and sound together.
// A ?shot=start|play|end URL stages a screenshot scene instead of
// starting the interactive game, and ?seed= fixes the world's dice.
import { STEP, SCREENS, RUN } from './config.js';
import { World, EVENT_HIT, EVENT_CORN, EVENT_FEATHER, EVENT_OVER, EVENT_ESCAPED, EVENT_SHOUT } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'turkey-run-best-score';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed')) || (Date.now() % 2147483647);

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');

const world = new World(seed);
const renderer = new Renderer(canvas);
const sounds = new SoundBank();
const ui = {
  best: Number(window.localStorage.getItem(BEST_KEY)) || 0,
  muted: false,
};

let screen = SCREENS.TITLE;
let paused = false;
let accumulator = 0;
let lastTime = performance.now();

function setStatus(message) {
  statusEl.textContent = message;
}

function saveBest() {
  if (world.score > ui.best) {
    ui.best = world.score;
    window.localStorage.setItem(BEST_KEY, String(ui.best));
  }
}

function startRun() {
  sounds.unlock();
  sounds.click();
  world.reset();
  screen = SCREENS.PLAY;
  paused = false;
  sounds.startMusic();
  showButtons();
  setStatus('Running! Jump with Space, slide with Down arrow. The farmer is behind you.');
}

function endRun(escaped) {
  saveBest();
  sounds.stopMusic();
  if (escaped) {
    sounds.escaped();
    setStatus(`Escaped! You ran ${Math.floor(world.distance)} metres and scored ${world.score} points.`);
  } else {
    sounds.caught();
    setStatus(`Caught after ${Math.floor(world.distance)} metres, ${world.score} points. Press Enter to run again.`);
  }
  showButtons();
}

function showButtons() {
  if (screen === SCREENS.TITLE) {
    startButton.hidden = false;
    restartButton.hidden = true;
  } else if (screen === SCREENS.OVER || screen === SCREENS.ESCAPED) {
    startButton.hidden = true;
    restartButton.hidden = false;
  } else {
    startButton.hidden = true;
    restartButton.hidden = true;
  }
}

const input = new Input(canvas, (action) => {
  if (action === 'confirm') {
    if (screen === SCREENS.TITLE) startRun();
    else if (screen === SCREENS.OVER || screen === SCREENS.ESCAPED) startRun();
  } else if (action === 'restart') {
    if (screen !== SCREENS.TITLE) startRun();
  } else if (action === 'pause') {
    if (screen === SCREENS.PLAY) {
      paused = !paused;
      setStatus(paused ? 'Paused. Press P to keep running.' : 'Running!');
    }
  } else if (action === 'mute') {
    ui.muted = !ui.muted;
    sounds.setMuted(ui.muted);
    setStatus(ui.muted ? 'Sound muted.' : 'Sound on.');
  }
});

startButton.addEventListener('click', () => startRun());
restartButton.addEventListener('click', () => startRun());
canvas.addEventListener('pointerdown', () => {
  // A click on the title or end screen starts (or restarts) the run;
  // during play the same click is a jump, handled by Input.
  if (screen === SCREENS.TITLE || screen === SCREENS.OVER || screen === SCREENS.ESCAPED) startRun();
});
window.addEventListener('resize', () => renderer.resize());
window.addEventListener('pointerdown', () => sounds.unlock(), { once: true });
window.addEventListener('keydown', () => sounds.unlock(), { once: true });

/** Apply one simulation step's events to sound and screens. */
function handleEvents(events) {
  if (events & EVENT_CORN) sounds.corn();
  if (events & EVENT_FEATHER) sounds.feather();
  if (events & EVENT_HIT) {
    sounds.hit();
    setStatus(`Ouch! ${world.lives} ${world.lives === 1 ? 'life' : 'lives'} left — the farmer is closing in!`);
  }
  if (events & EVENT_SHOUT) sounds.shout();
  if (events & EVENT_OVER) {
    screen = SCREENS.OVER;
    endRun(false);
  } else if (events & EVENT_ESCAPED) {
    screen = SCREENS.ESCAPED;
    endRun(true);
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (screen === SCREENS.PLAY && !paused) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const jump = input.takeJump();
      const events = world.step(STEP, jump, input.isSliding());
      if (jump && world.lastJumpKind === 'jump') sounds.jump();
      if (jump && world.lastJumpKind === 'flap') sounds.flap();
      handleEvents(events);
      if (screen !== SCREENS.PLAY) break;
    }
  } else {
    // Drain queued input so a click on the end screen does not jump the next run.
    input.takeJump();
  }
  renderer.draw(world, screen, ui);
}

// Screenshot mode: stage the named scene once and draw it still.
if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  if (screen === SCREENS.OVER || screen === SCREENS.ESCAPED) saveBest();
  document.title = `Turkey Run — ${shotName}`;
  showButtons();
  renderer.draw(world, screen, ui);
  setStatus(`Screenshot scene: ${shotName}.`);
} else {
  showButtons();
  setStatus('Turkey Run. Press Enter or click to start running from the farmer.');
  requestAnimationFrame(frame);
}
