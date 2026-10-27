import React, { useState, useEffect, useRef, useCallback } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, ImageBackground, AppState } from 'react-native'
import Square from './Square.js'
import Hud from './Hud.js'
import StartScreen from './StartScreen.js'
import GameOverScreen from './GameOverScreen.js'
import { connect } from 'react-redux'
import { startGame as startGameAction, tick as tickAction, whackMole as whackMoleAction, miss as missAction, resetProgress as resetProgressAction, moleEscaped as moleEscapedAction, endGame as endGameAction, returnToMenu as returnToMenuAction } from '../redux'
import { getLevel, LEVELS } from '../game/levels'
import { comboMultiplier } from '../game/scoring'
import { pickMoleType } from '../game/moles'

const HOLE_COUNT = 12

const GameBoard = (props) => {
  const { status, score, timeLeft, levelIndex, streak, bestCombo, bestScore, bestLevel, bombsHit, molesEscaped, highScores, lifetime, hydrated, endReason, startGame, tick, whackMole, miss, resetProgress, moleEscaped, endGame, returnToMenu } = props

  // Array<null | 'normal' | 'golden' | 'bomb'>; null = empty hole. This is
  // deliberately truthiness-compatible with the spawn code below.
  const [activeHoles, setActiveHoles] = useState(() => Array(HOLE_COUNT).fill(null))
  const [appPaused, setAppPaused] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const paused = appPaused || userPaused

  // While the app is backgrounded (call, lock screen, app switch), stop the
  // round clock and mole spawning rather than letting setInterval keep
  // ticking unseen. The run itself stays alive — we never dispatch END_GAME
  // here, we just gate the tick/spawn effects below.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppPaused(nextState !== 'active')
    })
    return () => {
      subscription.remove()
    }
  }, [])

  // A new round should never start already paused, and a user-initiated
  // pause from a previous round shouldn't leak into the next one.
  useEffect(() => {
    if (status !== 'playing') setUserPaused(false)
  }, [status])

  // Level-up banner: a short "Level N: Name!" message shown briefly whenever
  // levelIndex advances mid-run. prevLevelIndexRef tracks the last levelIndex
  // we've seen so an advance can be detected; it is also used to swallow the
  // very first 'playing' render of a run (so Play Again never shows a stale
  // banner from the level the previous run ended on).
  const [levelUpText, setLevelUpText] = useState(null)
  const prevLevelIndexRef = useRef(null)
  const levelUpTimeoutRef = useRef(null)

  useEffect(() => {
    if (status === 'playing' && levelIndex === 0 && prevLevelIndexRef.current !== 0) {
      // A new run just started (or this is the very first render): reset
      // tracking and make sure no banner carries over.
      prevLevelIndexRef.current = 0
      setLevelUpText(null)
    } else if (status === 'playing' && prevLevelIndexRef.current !== null && levelIndex > prevLevelIndexRef.current) {
      const level = getLevel(levelIndex)
      setLevelUpText(`Level ${levelIndex + 1}: ${level.name}!`)
      prevLevelIndexRef.current = levelIndex
    } else {
      prevLevelIndexRef.current = levelIndex
    }

    return undefined
  }, [status, levelIndex])

  // Separate effect to (re)schedule the auto-clear whenever the banner text
  // itself changes, so the timeout is always cleared on unmount and whenever
  // the level changes again (which replaces levelUpText before this can fire
  // stale) — no leaked timers.
  useEffect(() => {
    if (!levelUpText) return undefined
    levelUpTimeoutRef.current = setTimeout(() => {
      setLevelUpText(null)
      levelUpTimeoutRef.current = null
    }, 1500)
    return () => {
      if (levelUpTimeoutRef.current) {
        clearTimeout(levelUpTimeoutRef.current)
        levelUpTimeoutRef.current = null
      }
    }
  }, [levelUpText])

  const tickIntervalRef = useRef(null)
  const spawnIntervalRef = useRef(null)
  const moleTimeoutsRef = useRef({})

  // Mirror of activeHoles so the spawn controller can read the current board
  // synchronously. The spawn logic schedules a per-mole timeout, and React may
  // invoke a setState updater more than once (StrictMode in dev, concurrent
  // re-render), so doing that scheduling inside an updater would orphan timeout
  // ids in moleTimeoutsRef and leak timers. Keeping the array in a ref lets the
  // update stay a pure value assignment.
  const activeHolesRef = useRef(activeHoles)

  const setHoles = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(activeHolesRef.current) : updater
    activeHolesRef.current = next
    setActiveHoles(next)
  }, [])

  const clearAllMoleTimeouts = useCallback(() => {
    Object.values(moleTimeoutsRef.current).forEach((id) => clearTimeout(id))
    moleTimeoutsRef.current = {}
  }, [])

  // ONE interval dispatching TICK every 1000ms while playing.
  useEffect(() => {
    if (status !== 'playing' || paused) return undefined

    tickIntervalRef.current = setInterval(() => {
      tick()
    }, 1000)

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }
    }
  }, [status, tick, paused])

  // ONE spawn controller running at the current level's spawnMs. Resets
  // whenever the level changes or status leaves 'playing'. Clears all
  // pending per-mole deactivation timeouts on every cleanup.
  useEffect(() => {
    if (status !== 'playing') {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current)
        spawnIntervalRef.current = null
      }
      clearAllMoleTimeouts()
      setHoles(Array(HOLE_COUNT).fill(null))
      return undefined
    }

    const level = getLevel(levelIndex)

    // Fresh level: no moles active yet, no stale timeouts.
    clearAllMoleTimeouts()
    setHoles(Array(HOLE_COUNT).fill(null))

    // Backgrounded: board stays cleared above, but don't start spawning.
    // Foregrounding reruns this effect (paused flips to false), which
    // clears the board again and restarts spawning fresh.
    if (paused) return undefined

    const spawnMoles = () => {
      setHoles((prev) => {
        const activeCount = prev.filter(Boolean).length
        const slots = level.maxSimultaneous - activeCount
        if (slots <= 0) return prev

        const inactiveIndices = prev
          .map((isActive, i) => (isActive ? null : i))
          .filter((i) => i !== null)
        if (inactiveIndices.length === 0) return prev

        const shuffled = [...inactiveIndices].sort(() => Math.random() - 0.5)
        const toActivate = shuffled.slice(0, Math.min(slots, shuffled.length))

        const next = [...prev]
        toActivate.forEach((i) => {
          next[i] = pickMoleType(level)
          moleTimeoutsRef.current[i] = setTimeout(() => {
            // Capture the mole's type before the hole is cleared below, so
            // we know what escaped (and whether it was a bomb, which must
            // not break the combo). handleWhack always clears this timeout
            // before nulling the hole, so a mole can never be counted as
            // both whacked and escaped.
            const escapedType = activeHolesRef.current[i]
            setHoles((p) => {
              const n = [...p]
              n[i] = null
              return n
            })
            delete moleTimeoutsRef.current[i]
            if (escapedType) moleEscaped(escapedType)
          }, level.moleUpMs)
        })
        return next
      })
    }

    spawnIntervalRef.current = setInterval(spawnMoles, level.spawnMs)

    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current)
        spawnIntervalRef.current = null
      }
      clearAllMoleTimeouts()
    }
  }, [status, levelIndex, clearAllMoleTimeouts, setHoles, paused, moleEscaped])

  const handleWhack = useCallback(
    (index) => {
      // While paused the board is cleared (see the spawn effect above) but
      // the holes are still rendered and tappable; a tap must not score,
      // whack, or miss.
      if (paused) return
      if (moleTimeoutsRef.current[index]) {
        clearTimeout(moleTimeoutsRef.current[index])
        delete moleTimeoutsRef.current[index]
      }
      // Read the live type from the ref, not the (possibly one-render-stale)
      // `active` prop Square based its press decision on. If the mole
      // already deactivated (timeout fired) since Square's last render,
      // bail out without dispatching — otherwise a tap landing in that
      // window would score on an already-emptied hole and extend the combo.
      const moleType = activeHolesRef.current[index]
      if (!moleType) return
      setHoles((prev) => {
        if (!prev[index]) return prev
        const next = [...prev]
        next[index] = null
        return next
      })
      whackMole(moleType)
    },
    [whackMole, setHoles, paused]
  )

  const handleMiss = useCallback(() => {
    // A tap on an empty hole while paused (e.g. right after a user- or
    // AppState-triggered pause) must not break the combo via MISS.
    if (paused) return
    miss()
  }, [miss, paused])

  const currentLevel = getLevel(levelIndex)
  const multiplier = comboMultiplier(streak)

  return (
    <ImageBackground
      style={styles.container}
      source={require('../assets/background.png')}
    >
      <Text style={styles.header}>Ania's Whack-a-mole App!</Text>

      {status === 'idle' && (
        <StartScreen
          onStart={startGame}
          bestScore={bestScore}
          highScores={highScores}
          lifetime={lifetime}
          hydrated={hydrated}
          onResetProgress={resetProgress}
        />
      )}

      {status === 'playing' && (
        <>
          <Hud
            score={score}
            timeLeft={timeLeft}
            levelName={currentLevel.name}
            levelNumber={levelIndex + 1}
            levelCount={LEVELS.length}
            targetScore={currentLevel.targetScore}
            streak={streak}
            multiplier={multiplier}
            escaped={molesEscaped}
          />
          {paused && <Text style={styles.paused}>Paused</Text>}
          {levelUpText && (
            <Text style={styles.levelUp} pointerEvents="none">
              {levelUpText}
            </Text>
          )}
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setUserPaused((p) => !p)}
              accessibilityRole="button"
              accessibilityLabel={userPaused ? 'Resume' : 'Pause'}
            >
              <Text style={styles.controlButtonText}>{userPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={endGame}
              accessibilityRole="button"
              accessibilityLabel="End Run"
            >
              <Text style={styles.controlButtonText}>End Run</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.game}>
            {activeHoles.map((moleType, i) => (
              <Square
                key={i}
                index={i}
                moleType={moleType}
                onWhack={() => handleWhack(i)}
                onMiss={handleMiss}
              />
            ))}
          </View>
        </>
      )}

      {status === 'gameover' && (
        <GameOverScreen
          score={score}
          levelName={currentLevel.name}
          bestCombo={bestCombo}
          bombsHit={bombsHit}
          molesEscaped={molesEscaped}
          sessionBestScore={bestScore}
          sessionBestLevelName={getLevel(bestLevel).name}
          // The run's entry tops the table only if it beat every older one:
          // insertHighScore ranks ties BELOW the entry already there, so a
          // tied score sits at index 1 and is not a new best.
          isNewHighScore={score > 0 && score === highScores[0]?.score && score > (highScores[1]?.score ?? 0)}
          highScores={highScores}
          lifetimeRuns={lifetime.runs}
          endReason={endReason}
          targetScore={currentLevel.targetScore}
          levelCount={LEVELS.length}
          onRestart={startGame}
          onMainMenu={returnToMenu}
        />
      )}
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      alignItems: 'center',
    },
    game: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: 300,
      paddingTop: 20,
    },
    header: {
      fontWeight: 'bold',
      marginBottom: 10,
      marginTop: 100
    },
    paused: {
      fontWeight: 'bold',
      marginTop: 10,
    },
    levelUp: {
      fontWeight: 'bold',
      marginTop: 10,
    },
    controls: {
      flexDirection: 'row',
      marginTop: 10,
    },
    controlButton: {
      backgroundColor: '#607D8B',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginHorizontal: 6,
    },
    controlButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
  });

  const mapStateToProps = state => {
    return {
      status: state.status,
      score: state.score,
      timeLeft: state.timeLeft,
      levelIndex: state.levelIndex,
      streak: state.streak,
      bestCombo: state.bestCombo,
      bestScore: state.bestScore,
      bestLevel: state.bestLevel,
      bombsHit: state.bombsHit,
      molesEscaped: state.molesEscaped,
      highScores: state.highScores,
      lifetime: state.lifetime,
      hydrated: state.hydrated,
      lifetimeBestCombo: state.lifetimeBestCombo,
      endReason: state.endReason,
    }
  }

  const mapDispatchToProps = {
    startGame: startGameAction,
    tick: tickAction,
    whackMole: whackMoleAction,
    miss: missAction,
    resetProgress: resetProgressAction,
    moleEscaped: moleEscapedAction,
    endGame: endGameAction,
    returnToMenu: returnToMenuAction,
  }

export default connect(mapStateToProps, mapDispatchToProps)(GameBoard)
