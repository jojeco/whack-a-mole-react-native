// Pure, dependency-free level definitions for the whack-a-mole game session.
// Difficulty increases across the array: spawnMs and moleUpMs shrink,
// maxSimultaneous and targetScore grow.
export const LEVELS = [
  {
    id: 1,
    name: 'Warm Up',
    durationSec: 30,
    spawnMs: 1200,
    moleUpMs: 1100,
    maxSimultaneous: 1,
    targetScore: 50,
  },
  {
    id: 2,
    name: 'Getting Quick',
    durationSec: 30,
    spawnMs: 1000,
    moleUpMs: 900,
    maxSimultaneous: 2,
    targetScore: 120,
  },
  {
    id: 3,
    name: 'Rush',
    durationSec: 30,
    spawnMs: 800,
    moleUpMs: 750,
    maxSimultaneous: 2,
    targetScore: 220,
  },
  {
    id: 4,
    name: 'Frenzy',
    durationSec: 30,
    spawnMs: 600,
    moleUpMs: 600,
    maxSimultaneous: 3,
    targetScore: 340,
  },
  {
    id: 5,
    name: 'Chaos',
    durationSec: 30,
    spawnMs: 450,
    moleUpMs: 500,
    maxSimultaneous: 4,
    targetScore: 480,
  },
]

// Returns the level at `index`, clamped to the last level if index is out
// of range (including negative indices, which clamp to the first level).
export const getLevel = (index) => {
  if (index < 0) return LEVELS[0]
  if (index >= LEVELS.length) return LEVELS[LEVELS.length - 1]
  return LEVELS[index]
}
