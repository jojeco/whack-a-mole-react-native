// Pure, dependency-free mole-type selection — no React/React Native imports,
// safe to require() from plain Node.

export const MOLE_TYPES = {
  NORMAL: 'normal',
  GOLDEN: 'golden',
  BOMB: 'bomb',
}

// Picks the type for a freshly-spawned mole from a single roll against the
// current level's chances: bomb gets first claim on the roll, golden the
// next slice, everything else is normal. `rand` is injectable (defaults to
// Math.random) so this is deterministically unit-testable with a stubbed
// generator instead of relying on real randomness.
export const pickMoleType = (level, rand = Math.random) => {
  const roll = rand()
  if (roll < level.bombChance) return MOLE_TYPES.BOMB
  if (roll < level.bombChance + level.goldenChance) return MOLE_TYPES.GOLDEN
  return MOLE_TYPES.NORMAL
}
