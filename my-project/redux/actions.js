import { ADD_SCORE, START_GAME, TICK, WHACK_MOLE, MISS, END_GAME, HYDRATE_PROGRESS, RESET_PROGRESS } from './actionTypes'

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

export const whackMole = (moleType = 'normal') => {
    return {
        type: WHACK_MOLE,
        moleType,
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

export const hydrateProgress = (progress) => {
    return {
        type: HYDRATE_PROGRESS,
        progress
    }
}

export const resetProgress = () => {
    return {
        type: RESET_PROGRESS
    }
}

// Kept for back-compat with any external callers; the game itself no longer
// dispatches ADD_SCORE (WHACK_MOLE replaced it). Thin alias only.
export const addScore = () => {
    return {
        type: ADD_SCORE
    }
}
