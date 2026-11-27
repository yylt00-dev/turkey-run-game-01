// A tiny seeded random generator (mulberry32). The game takes its seed
// from the URL (?seed=) so a screenshot run is reproducible frame for
// frame, while a normal game seeds itself from the clock.
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of `list` using `rand`. */
export function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}

/** A number in [min, max) using `rand`. */
export function range(rand, min, max) {
  return min + rand() * (max - min);
}

/** A whole number in [min, max] using `rand`. */
export function intRange(rand, min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}
