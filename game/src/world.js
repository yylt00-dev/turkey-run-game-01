// The world: the turkey, the farmer, obstacles, corn and feathers, and
// the rules that move them. No drawing here — render.js owns the pixels.
// The world is stepped in fixed 1/60s steps so a screenshot run replays
// exactly, and its random choices come from one seeded generator.
import {
  GROUND_Y, GRAVITY, JUMP_VELOCITY, FLAP_VELOCITY, MAX_FALL,
  TURKEY, FARMER, RUN, STAGES, SPAWN, OBSTACLES, STEP,
} from './config.js';
import { makeRandom, pick, range, intRange } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_FEATHER = 4;
export const EVENT_OVER = 8;
export const EVENT_ESCAPED = 16;
export const EVENT_SHOUT = 32;

// Which obstacles each stage throws at the turkey.
const STAGE_OBSTACLES = [
  ['haybale', 'fence', 'puddle'],
  ['haybale', 'fence', 'pumpkin', 'clothesline'],
  ['fence', 'pumpkin', 'oven', 'clothesline'],
  ['oven', 'knife', 'pumpkin', 'clothesline'],
];

export function stageFor(distanceMetres) {
  let stage = STAGES[0];
  for (const candidate of STAGES) {
    if (distanceMetres >= candidate.from) stage = candidate;
  }
  return stage;
}

export function stageIndexFor(distanceMetres) {
  let index = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (distanceMetres >= STAGES[i].from) index = i;
  }
  return index;
}

export class World {
  constructor(seed) {
    this.seed = seed;
    this.reset();
  }

  reset() {
    this.rand = makeRandom(this.seed);
    this.time = 0;
    this.distance = 0; // metres escaped
    this.scroll = 0; // px scrolled, drives the scenery
    this.score = 0;
    this.lives = RUN.lives;
    this.feathers = 0;
    this.shieldUntil = -1;
    this.speed = TURKEY.runSpeedStart;
    this.over = false;
    this.escaped = false;
    this.hits = 0;
    this.cornEaten = 0;
    this.nextFeatherAt = SPAWN.featherEveryMetres;
    this.spawnIn = SPAWN.firstGapSeconds; // seconds until the next spawn
    this.obstacles = [];
    this.pickups = [];
    this.particles = [];
    this.farmerGap = FARMER.gapForHits[0];
    this.shouted = false;
    this.player = {
      x: TURKEY.x,
      y: GROUND_Y - TURKEY.height,
      width: TURKEY.width,
      height: TURKEY.height,
      vy: 0,
      grounded: true,
      flaps: 0, // air jumps left (1 after leaving the ground)
      sliding: false,
      slideTimer: 0,
      invincibleUntil: -1,
      runPhase: 0,
    };
    this.lastJumpKind = null; // 'jump' | 'flap' | null, for the sound layer
  }

  get stage() {
    return stageFor(this.distance);
  }

  get stageIndex() {
    return stageIndexFor(this.distance);
  }

  /** Current hitbox: shorter while sliding. */
  playerBox() {
    const p = this.player;
    if (p.sliding) {
      return { x: p.x + 4, y: GROUND_Y - TURKEY.slideHeight, width: p.width, height: TURKEY.slideHeight };
    }
    return { x: p.x + 10, y: p.y + 4, width: p.width - 20, height: p.height - 4 };
  }

  jump() {
    const p = this.player;
    if (p.grounded) {
      p.vy = JUMP_VELOCITY;
      p.grounded = false;
      p.flaps = 1;
      p.sliding = false;
      return 'jump';
    }
    if (p.flaps > 0) {
      p.vy = FLAP_VELOCITY;
      p.flaps -= 1;
      return 'flap';
    }
    return null;
  }

  slide(on) {
    const p = this.player;
    if (on && p.grounded && !p.sliding) {
      p.sliding = true;
      p.slideTimer = 0.55;
      return true;
    }
    return false;
  }

  spawnObstacle(kind, x) {
    const def = OBSTACLES[kind];
    this.obstacles.push({
      kind,
      x,
      y: GROUND_Y - def.height,
      width: def.width,
      height: def.height,
      active: true,
      swing: 0, // knife swing phase
      passed: false,
    });
  }

  spawnCornTrail(x, count) {
    for (let i = 0; i < count; i += 1) {
      this.pickups.push({
        kind: 'corn',
        x: x + i * 44,
        // Alternate low corn (grabbed while running) and high corn
        // (grabbed with a jump), so a run always has something to eat.
        y: GROUND_Y - 70 - (i % 2) * 52,
        width: 30,
        height: 30,
        active: true,
        bob: this.rand() * Math.PI * 2,
      });
    }
  }

  spawnFeather(x) {
    this.pickups.push({
      kind: 'feather',
      x,
      y: GROUND_Y - 150,
      width: 34,
      height: 34,
      active: true,
      bob: 0,
    });
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x, y,
        vx: range(this.rand, -140, 140),
        vy: range(this.rand, -260, -40),
        life: range(this.rand, 0.4, 0.9),
        maxLife: 0.9,
        color,
        size: intRange(this.rand, 3, 7),
      });
    }
  }

  /** One fixed step. `jumpPressed` and `slideHeld` come from input. Returns event flags. */
  step(dt, jumpPressed, slideHeld) {
    if (this.over || this.escaped) return EVENT_NONE;
    let events = EVENT_NONE;
    const p = this.player;
    this.time += dt;

    // Speed grows with distance, and so does the danger.
    this.speed = Math.min(
      TURKEY.runSpeedMax,
      TURKEY.runSpeedStart + this.distance * TURKEY.speedGainPerMetre,
    );
    this.distance += (this.speed * dt) / RUN.pxPerMetre;
    this.scroll += this.speed * dt;
    this.score += Math.round(this.speed * dt * 0.12);

    // The turkey's own motion.
    if (jumpPressed) {
      const acted = this.jump();
      if (acted) this.lastJumpKind = acted;
    }
    if (slideHeld) this.slide(true);
    if (p.sliding) {
      p.slideTimer -= dt;
      if (p.slideTimer <= 0 || !p.grounded) p.sliding = false;
    }
    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
    p.y += p.vy * dt;
    if (p.y >= GROUND_Y - p.height) {
      p.y = GROUND_Y - p.height;
      p.vy = 0;
      p.grounded = true;
      p.flaps = 0;
    } else {
      p.grounded = false;
    }
    p.runPhase += dt * (this.speed / 28);

    // The farmer closes in after every stumble and falls back while the
    // turkey runs clean; close enough and he shouts.
    const wantGap = FARMER.gapForHits[Math.min(this.hits, FARMER.gapForHits.length - 1)];
    this.farmerGap += (wantGap - this.farmerGap) * Math.min(1, dt * 1.4);
    if (this.farmerGap < 60 && !this.shouted) {
      this.shouted = true;
      events |= EVENT_SHOUT;
    } else if (this.farmerGap >= 90) {
      this.shouted = false;
    }

    // Spawn what is ahead: obstacles, corn trails, the odd golden feather.
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      const gapSeconds = range(this.rand, SPAWN.minGapSeconds, SPAWN.maxGapSeconds);
      this.spawnIn = gapSeconds;
      const roll = this.rand();
      const kinds = STAGE_OBSTACLES[this.stageIndex];
      if (this.distance >= this.nextFeatherAt) {
        this.nextFeatherAt += SPAWN.featherEveryMetres;
        this.spawnFeather(1000 + range(this.rand, 0, 120));
      } else if (roll < SPAWN.cornChance) {
        this.spawnCornTrail(1020, intRange(this.rand, 3, 5));
      } else {
        this.spawnObstacle(pick(this.rand, kinds), 1000 + range(this.rand, 0, 140));
        // Later stages sometimes double up: two dangers, one gap. The
        // second sits far enough behind the first that a landing turkey
        // can jump again — a fair pair, not a wall.
        if (this.stageIndex >= 2 && this.rand() < 0.3) {
          this.spawnObstacle(pick(this.rand, kinds), 1000 + range(this.rand, 280, 420));
        }
      }
    }

    // Move the world left and resolve what the turkey touches.
    const box = this.playerBox();
    const invincible = this.time < p.invincibleUntil;
    const shielded = this.time < this.shieldUntil;
    for (const o of this.obstacles) {
      if (!o.active) continue;
      o.x -= this.speed * dt;
      if (o.kind === 'knife') o.swing += dt * 6;
      if (o.x + o.width < -80) { o.active = false; continue; }
      if (!o.passed && o.x + o.width < p.x) {
        o.passed = true;
        this.score += 10; // cleared it cleanly
      }
      const overlap = o.x < box.x + box.width && o.x + o.width > box.x
        && o.y < box.y + box.height && o.y + o.height > box.y;
      if (overlap && !invincible) {
        if (shielded) {
          this.shieldUntil = -1;
          o.active = false;
          this.burst(o.x + o.width / 2, o.y, '#ffd94d', 14);
          this.score += 50;
          events |= EVENT_FEATHER;
        } else {
          o.active = false;
          this.hits += 1;
          this.lives -= 1;
          p.invincibleUntil = this.time + TURKEY.invincibleSeconds;
          this.burst(box.x + box.width / 2, box.y + box.height / 2, '#c0392b', 18);
          events |= EVENT_HIT;
          if (this.lives <= 0) {
            this.over = true;
            events |= EVENT_OVER;
          }
        }
      }
    }
    for (const item of this.pickups) {
      if (!item.active) continue;
      item.x -= this.speed * dt;
      item.bob += dt * 5;
      if (item.x + item.width < -60) { item.active = false; continue; }
      const overlap = item.x < box.x + box.width && item.x + item.width > box.x
        && item.y < box.y + box.height && item.y + item.height > box.y;
      if (overlap) {
        item.active = false;
        if (item.kind === 'corn') {
          this.score += RUN.cornPoints;
          this.cornEaten += 1;
          this.burst(item.x + 15, item.y + 15, '#ffcf3f', 8);
          events |= EVENT_CORN;
        } else {
          this.score += RUN.featherPoints;
          this.feathers += 1;
          this.shieldUntil = this.time + RUN.featherShieldSeconds;
          this.burst(item.x + 17, item.y + 17, '#ffd94d', 16);
          events |= EVENT_FEATHER;
        }
      }
    }

    // Particles drift and fade.
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 500 * dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);

    // Freedom: the woods begin at 1500 metres.
    if (this.distance >= RUN.escapeDistance) {
      this.escaped = true;
      events |= EVENT_ESCAPED;
    }
    return events;
  }
}

/** A fresh world the autopilot can drive for a screenshot. */
export function freshWorld(seed) {
  return new World(seed);
}

export { STEP };
