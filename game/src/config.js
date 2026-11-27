// Turkey Run — tuning and world constants. One place for every number the
// game balances on, so the rest of the code reads like rules, not magic.
export const VIEW = { width: 960, height: 540 };

export const GROUND_Y = 452; // y of the ground line in view space
export const GRAVITY = 2400; // px / s^2, pulls the turkey back down
export const JUMP_VELOCITY = -880; // px / s, first flap
export const FLAP_VELOCITY = -680; // px / s, the mid-air second flap
export const MAX_FALL = 1150; // px / s, terminal fall speed

export const TURKEY = {
  x: 170, // fixed screen x; the world scrolls past it
  width: 64,
  height: 58,
  runSpeedStart: 265, // px / s at the start of a run
  runSpeedMax: 560, // px / s once the kitchen is far behind
  speedGainPerMetre: 0.22, // extra px / s for every metre escaped
  slideHeight: 30,
  invincibleSeconds: 1.6, // grace after a hit
};

export const FARMER = {
  // How far behind the turkey the farmer runs, in px, as a function of
  // how many hits the turkey has taken. Each stumble lets him close in.
  gapForHits: [150, 108, 66, 26],
  catchDistance: 30,
};

export const RUN = {
  escapeDistance: 1500, // metres to freedom: reach it and the turkey escapes
  pxPerMetre: 7.5, // world scroll per metre of distance
  lives: 3,
  cornPoints: 25,
  featherPoints: 100,
  featherShieldSeconds: 4, // a golden feather blocks the next hit
};

// Stage boundaries, in metres. The scenery, palette and danger change
// as the turkey flees the farmyard, through the garden, past the kitchen
// and into the woods.
export const STAGES = [
  { from: 0, name: 'Farmyard', sky: ['#ffd98a', '#ffb347'], ground: '#b5773a', grass: '#7fae4c' },
  { from: 500, name: 'Pumpkin Garden', sky: ['#ffc46b', '#ff9d5c'], ground: '#a06a32', grass: '#e08a2e' },
  { from: 1000, name: 'Kitchen Yard', sky: ['#f7b267', '#e07856'], ground: '#8d5a2b', grass: '#c97b2d' },
  { from: 1300, name: 'The Woods', sky: ['#8fb573', '#4d7a4f'], ground: '#5d4a2f', grass: '#4d7a3a' },
];

export const SPAWN = {
  firstGapSeconds: 1.1, // breathing room before the first obstacle
  minGapSeconds: 0.62, // tightest spacing at full speed
  maxGapSeconds: 1.35,
  cornChance: 0.55, // an obstacle gap may hold a corn trail instead
  featherEveryMetres: 320, // a golden feather appears about this often
};

// Obstacle kinds. width/height are the hitbox; `slide` means the turkey
// must duck under it, everything else must be jumped over.
export const OBSTACLES = {
  haybale: { width: 58, height: 52, slide: false, points: 0 },
  fence: { width: 46, height: 62, slide: false, points: 0 },
  puddle: { width: 86, height: 14, slide: false, points: 0 },
  clothesline: { width: 70, height: 34, slide: true, points: 0 },
  pumpkin: { width: 52, height: 46, slide: false, points: 0, rolls: true },
  oven: { width: 74, height: 84, slide: false, points: 0 },
  knife: { width: 30, height: 96, slide: false, points: 0, swings: true },
};

export const STEP = 1 / 60; // fixed simulation step, seconds
export const SCREENS = { TITLE: 'title', PLAY: 'play', OVER: 'over', ESCAPED: 'escaped' };
