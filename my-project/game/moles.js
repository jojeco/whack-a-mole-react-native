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

// Picks which empty holes get a new mole this tick. `holes` mirrors the
// active-hole check GameBoard uses elsewhere (truthy = occupied). Uses a
// partial Fisher-Yates over the empty indices so the selection is unbiased,
// unlike `array.sort(() => Math.random() - 0.5)`. `rand` is injectable for
// deterministic unit tests, same convention as `pickMoleType`.
export const pickSpawnHoles = (holes, maxSimultaneous, rand = Math.random) => {
  const freeSlots = maxSimultaneous - holes.filter(Boolean).length
  if (freeSlots <= 0) return []

  const empty = holes.map((isActive, i) => (isActive ? null : i)).filter((i) => i !== null)
  const count = Math.min(freeSlots, empty.length)
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rand() * (empty.length - i))
    ;[empty[i], empty[j]] = [empty[j], empty[i]]
  }
  return empty.slice(0, count)
}
