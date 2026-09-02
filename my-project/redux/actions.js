import { ADD_SCORE, START_GAME, TICK, WHACK_MOLE, MISS, END_GAME } from './actionTypes'

export const startGame = () => {
    return {
        type: START_GAME
    }
}

export const tick = () => {
    return {
        type: TICK
    }
}

export const whackMole = () => {
    return {
        type: WHACK_MOLE
    }
}

export const miss = () => {
    return {
        type: MISS
    }
}

export const endGame = () => {
    return {
        type: END_GAME
    }
}

// Kept for back-compat with any external callers; the game itself no longer
// dispatches ADD_SCORE (WHACK_MOLE replaced it). Thin alias only.
export const addScore = () => {
    return {
        type: ADD_SCORE
    }
}
