export function createRandom(seed) {
  let state = Math.floor(seed) >>> 0

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    pick: (list) => list[Math.floor(next() * list.length)]
  }
}
