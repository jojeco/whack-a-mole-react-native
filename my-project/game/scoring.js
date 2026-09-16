// Pure scoring helpers — no React/React Native imports, safe to require()
// from plain Node.

import { MOLE_TYPES } from './moles'

const BASE_POINTS = 10
const MAX_MULTIPLIER = 4
export const GOLDEN_POINTS = 50
export const BOMB_PENALTY = 30

// Combo multiplier grows by 1 for every 5 whacks in the current streak,
// capped at MAX_MULTIPLIER (x4). streak=0-4 -> x1, streak=5-9 -> x2, etc.
export const comboMultiplier = (streak) => {
  const raw = 1 + Math.floor(streak / 5)
  return Math.min(raw, MAX_MULTIPLIER)
}

// `streak` here is the streak count BEFORE this whack is applied (i.e. the
// number of consecutive successful whacks already banked prior to this one).
// The multiplier for this whack is based on that pre-whack streak, so the
// bonus kicks in starting on the whack that PUSHES the streak past a
// multiple of 5 (e.g. the 6th consecutive whack, where streak-before=5,
// scores at x2).
export const pointsForWhack = (streak) => BASE_POINTS * comboMultiplier(streak)

// Type-aware scoring for a single whack. `streak` is the pre-whack streak,
// same convention as pointsForWhack above. Bomb whacks are a flat penalty —
// the combo multiplier does not amplify a penalty.
export const pointsForMole = (moleType, streak) => {
  if (moleType === MOLE_TYPES.GOLDEN) return GOLDEN_POINTS * comboMultiplier(streak)
  if (moleType === MOLE_TYPES.BOMB) return -BOMB_PENALTY
  return BASE_POINTS * comboMultiplier(streak)
}

export const didClearLevel = (score, level) => score >= level.targetScore
