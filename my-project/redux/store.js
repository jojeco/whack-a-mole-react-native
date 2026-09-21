import { createStore } from 'redux'
import scoreReducer from './reducer'
import { saveProgress, selectPersistable, shouldPersist } from '../game/persistence'

const store = createStore(scoreReducer)

// Writes the durable slice of the state to `storage` whenever it changes.
// Nothing is written until the state is hydrated (so the initial empty state
// can never overwrite saved progress), and hydration itself does not trigger a
// redundant write. Returns an unsubscribe function.
export const attachPersistence = (storeRef, storage) => {
    let lastWritten = null
    let baselineSet = false
    // Durable progress made before hydration (a run that finished before the
    // read resolved) must still be written once hydrated.
    const initialSlice = selectPersistable(storeRef.getState())
    let unsavedBeforeHydration = false

    return storeRef.subscribe(() => {
        const state = storeRef.getState()
        const slice = selectPersistable(state)
        if (state.hydrated !== true) {
            if (shouldPersist(initialSlice, slice)) unsavedBeforeHydration = true
            return
        }
        if (!baselineSet) {
            baselineSet = true
            lastWritten = unsavedBeforeHydration ? null : slice
        }
        if (!shouldPersist(lastWritten, slice)) return
        lastWritten = slice
        saveProgress(storage, slice).catch(() => {})
    })
}

export default store
