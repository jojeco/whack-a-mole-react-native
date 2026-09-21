import { ADD_SCORE, START_GAME, TICK, WHACK_MOLE, MISS, END_GAME, HYDRATE_PROGRESS, RESET_PROGRESS } from './actionTypes'
import { LEVELS, getLevel } from '../game/levels'
import { pointsForMole, didClearLevel, BOMB_PENALTY } from '../game/scoring'
import { MOLE_TYPES } from '../game/moles'
import { recordRun, selectPersistable, mergeHydrated } from '../game/persistence'

const initialState = {
    status: 'idle', // 'idle' | 'playing' | 'gameover'
    score: 0,
    timeLeft: LEVELS[0].durationSec,
    levelIndex: 0,
    streak: 0,
    bestCombo: 0,
    bestScore: 0,
    bestLevel: 0,
    molesWhacked: 0,
    misses: 0,
    bombsHit: 0,
    // Persisted progress (see game/persistence.js). `hydrated` flips to true
    // once the saved copy has been read (or the read failed).
    hydrated: false,
    highScores: [],
    lifetime: { runs: 0, molesWhacked: 0, misses: 0, bombsHit: 0, points: 0 },
    lifetimeBestCombo: 0,
}

// The single place a finished run is recorded: playing -> gameover, bests
// max-merged, lifetime counters bumped and the top-5 table updated. Callers
// must have already checked state.status === 'playing'.
const applyRunResult = (state) => {
    const recorded = recordRun(selectPersistable(state), {
        score: state.score,
        levelIndex: state.levelIndex,
        levelName: getLevel(state.levelIndex).name,
        bestCombo: state.bestCombo,
        molesWhacked: state.molesWhacked,
        misses: state.misses,
        bombsHit: state.bombsHit,
        playedAt: Date.now(),
    })
    return {
        ...state,
        status: 'gameover',
        bestScore: recorded.bestScore,
        bestLevel: recorded.bestLevel,
        lifetimeBestCombo: recorded.bestCombo,
        highScores: recorded.highScores,
        lifetime: recorded.lifetime,
    }
}

const gameReducer = (state = initialState, action) => {
    switch (action.type) {
        case START_GAME: {
            return {
                ...state,
                status: 'playing',
                score: 0,
                streak: 0,
                levelIndex: 0,
                timeLeft: LEVELS[0].durationSec,
                molesWhacked: 0,
                misses: 0,
                bombsHit: 0,
                // bestCombo tracks the best combo of the CURRENT run (shown next
                // to "final score" / "level reached" on the game-over screen),
                // so it resets each round. bestScore / bestLevel are all-time
                // records and highScores / lifetime / lifetimeBestCombo /
                // hydrated are persisted progress; none of them are ever
                // reset here.
                bestCombo: 0,
            }
        }

        case WHACK_MOLE: {
            // A tap can still be delivered in the same frame the final TICK
            // flips us to 'gameover' (the board has not unmounted yet), which
            // would inflate the score shown on the game-over screen past the
            // bestScore already banked. Only count whacks while playing.
            if (state.status !== 'playing') return state

            const moleType = action.moleType || MOLE_TYPES.NORMAL

            if (moleType === MOLE_TYPES.BOMB) {
                // A bomb breaks the combo and never drives score negative;
                // it doesn't count towards molesWhacked (that stat is a
                // count of "good" whacks).
                return {
                    ...state,
                    score: Math.max(0, state.score - BOMB_PENALTY),
                    streak: 0,
                    bombsHit: state.bombsHit + 1,
                }
            }

            const gained = pointsForMole(moleType, state.streak)
            const nextStreak = state.streak + 1
            return {
                ...state,
                score: state.score + gained,
                streak: nextStreak,
                molesWhacked: state.molesWhacked + 1,
                bestCombo: nextStreak > state.bestCombo ? nextStreak : state.bestCombo,
            }
        }

        case MISS: {
            if (state.status !== 'playing') return state

            return {
                ...state,
                streak: 0,
                misses: state.misses + 1,
                // score is unaffected by a miss and never goes negative
            }
        }

        case TICK: {
            if (state.status !== 'playing') return state

            const nextTimeLeft = state.timeLeft - 1
            if (nextTimeLeft > 0) {
                return {
                    ...state,
                    timeLeft: nextTimeLeft,
                }
            }

            // Time for the current level ran out.
            const currentLevel = getLevel(state.levelIndex)
            const cleared = didClearLevel(state.score, currentLevel)
            const hasNextLevel = state.levelIndex + 1 < LEVELS.length

            if (cleared && hasNextLevel) {
                const nextLevel = getLevel(state.levelIndex + 1)
                return {
                    ...state,
                    levelIndex: state.levelIndex + 1,
                    timeLeft: nextLevel.durationSec,
                    // score / streak carry over into the next level
                }
            }

            // Either the run wasn't cleared, or there's no next level: game over.
            return {
                ...applyRunResult(state),
                timeLeft: 0,
            }
        }

        case END_GAME: {
            // Like TICK/WHACK_MOLE/MISS: only a run in progress can end, so a
            // repeated or idle END_GAME can't record the same run twice.
            if (state.status !== 'playing') return state

            return applyRunResult(state)
        }

        case HYDRATE_PROGRESS: {
            return {
                ...state,
                ...mergeHydrated(state, action.progress),
            }
        }

        case RESET_PROGRESS: {
            // Wipes saved progress only; any in-flight run is left alone.
            return {
                ...state,
                bestScore: 0,
                bestLevel: 0,
                lifetimeBestCombo: 0,
                highScores: [],
                lifetime: { runs: 0, molesWhacked: 0, misses: 0, bombsHit: 0, points: 0 },
                hydrated: true,
            }
        }

        case ADD_SCORE: {
            // Back-compat only: no longer used by the game itself.
            return {
                ...state,
                score: state.score + 1,
            }
        }

        default:
            return state
    }
}

export default gameReducer
