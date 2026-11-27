// The screenshot scenes behind ?shot=start|play|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot, so every frame is what a short game
// really looks like and the same seed always gives the same frame.
import { STEP, SCREENS } from './config.js';
import { OBSTACLES } from './config.js';
import { EVENT_OVER, EVENT_ESCAPED } from './world.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 16;
const END_LIMIT_SECONDS = 600;
const SAMPLE = STEP;

/** Should the turkey jump now? True when a jump-over obstacle is close ahead. */
function shouldJump(world) {
  const p = world.player;
  if (!p.grounded) return false;
  const nose = p.x + p.width;
  for (const o of world.obstacles) {
    if (!o.active) continue;
    const def = OBSTACLES[o.kind];
    if (def.slide) continue; // slide obstacles are ducked, not jumped
    const gap = o.x - nose;
    // Jump when the obstacle is about one jump's warning away: early
    // enough that the turkey is still high while the obstacle passes
    // under it, late enough that the jump does not end short of it.
    if (gap > 0 && gap < world.speed * 0.42) return true;
  }
  return false;
}

/** Mid-air flap to stay up when a tall obstacle is already under the turkey. */
function shouldFlap(world) {
  const p = world.player;
  if (p.grounded || p.vy <= 0 || p.flaps <= 0) return false;
  for (const o of world.obstacles) {
    if (!o.active || OBSTACLES[o.kind].slide) continue;
    if (o.x < p.x + p.width - 10 && o.x + o.width > p.x + 10) return true;
    const gap = o.x - (p.x + p.width);
    if (gap > 0 && gap < 110) return true;
  }
  return false;
}

/** Hop for a high corn cob or feather when it is close ahead. */
function shouldHopForPickup(world) {
  const p = world.player;
  if (!p.grounded) return false;
  for (const item of world.pickups) {
    if (!item.active) continue;
    const gap = item.x - (p.x + p.width);
    if (item.y < 452 - 100 && gap > 0 && gap < 90) return true;
  }
  return false;
}

/** Should the turkey slide now? True when a clothesline is close ahead. */
function shouldSlide(world) {
  const p = world.player;
  if (!p.grounded) return false;
  const nose = p.x + p.width;
  for (const o of world.obstacles) {
    if (!o.active || o.kind !== 'clothesline') continue;
    const gap = o.x - nose;
    if (gap > 0 && gap < world.speed * 0.28) return true;
  }
  return false;
}

/**
 * Drive `world` with the autopilot for `seconds` (or until it ends) and
 * return whether it ended. `skill` 1 plays well; 0 never jumps or slides,
 * so the turkey is caught quickly, as a hurried player is.
 */
function drive(world, seconds, skill) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const jump = skill > 0 && (shouldJump(world) || shouldFlap(world) || shouldHopForPickup(world));
    const slide = skill > 0 && shouldSlide(world);
    const events = world.step(SAMPLE, jump, slide);
    if (events & (EVENT_OVER | EVENT_ESCAPED)) return true;
  }
  return false;
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    // Title screen: a few seconds of the farmyard idling behind the menu.
    drive(world, START_SECONDS, 1);
    world.reset();
    return { screen: SCREENS.TITLE };
  }
  if (name === 'play') {
    drive(world, PLAY_SECONDS, 1);
    // A staged frame must show the turkey: clear any post-hit
    // invincibility flicker before the screenshot is taken.
    world.player.invincibleUntil = -1;
    return { screen: world.over ? SCREENS.OVER : SCREENS.PLAY };
  }
  // End: a careless turkey that never dodges gets caught by the farmer.
  drive(world, END_LIMIT_SECONDS, 0);
  return { screen: world.escaped ? SCREENS.ESCAPED : SCREENS.OVER };
}
