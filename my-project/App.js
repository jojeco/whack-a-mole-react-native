import React, { useEffect } from 'react';
import GameBoard from './components/GameBoard'
import { Provider } from 'react-redux'
import store, { attachPersistence } from './redux/store'
import { hydrateProgress } from './redux'
import { loadProgress, defaultProgress } from './game/persistence'
import getStorage from './storage/asyncStorageAdapter'

export default function App() {
  // Load saved progress once on mount, then keep it saved as it changes.
  useEffect(() => {
    const storage = getStorage()
    let cancelled = false

    loadProgress(storage)
      .then((progress) => {
        if (!cancelled) store.dispatch(hydrateProgress(progress))
      })
      .catch(() => {
        if (!cancelled) store.dispatch(hydrateProgress(defaultProgress()))
      })

    const unsubscribe = attachPersistence(store, storage)

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return (
    <Provider store={store}>
      <GameBoard/>
    </Provider>
  );
}
