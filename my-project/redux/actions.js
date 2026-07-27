import { ADD_SCORE, RESET_SCORE } from './actionTypes'

export const addScore = () => {
    return {
        type: ADD_SCORE
    }
}

export const resetScore = () => {
    return {
        type: RESET_SCORE
    }
}