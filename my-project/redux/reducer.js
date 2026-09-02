import { ADD_SCORE, START_GAME, TICK, WHACK_MOLE, MISS, END_GAME } from './actionTypes'
import { LEVELS, getLevel } from '../game/levels'
import { pointsForWhack, didClearLevel } from '../game/scoring'

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
                // bestCombo tracks the best combo of the CURRENT run (shown next
                // to "final score" / "level reached" on the game-over screen),
                // so it resets each round. bestScore / bestLevel are session-wide
                // records and are NEVER reset here.
                bestCombo: 0,
            }
        }

        case WHACK_MOLE: {
            // A tap can still be delivered in the same frame the final TICK
            // flips us to 'gameover' (the board has not unmounted yet), which
            // would inflate the score shown on the game-over screen past the
            // bestScore already banked. Only count whacks while playing.
            if (state.status !== 'playing') return state

            const gained = pointsForWhack(state.streak)
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
                ...state,
                status: 'gameover',
                timeLeft: 0,
                bestScore: state.score > state.bestScore ? state.score : state.bestScore,
                bestLevel: state.levelIndex > state.bestLevel ? state.levelIndex : state.bestLevel,
            }
        }

        case END_GAME: {
            return {
                ...state,
                status: 'gameover',
                bestScore: state.score > state.bestScore ? state.score : state.bestScore,
                bestLevel: state.levelIndex > state.bestLevel ? state.levelIndex : state.bestLevel,
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
