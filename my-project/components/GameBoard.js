import React, { useState, useEffect, useRef, useCallback } from 'react'
import { StyleSheet, Text, View, ImageBackground } from 'react-native'
import Square from './Square.js'
import Hud from './Hud.js'
import StartScreen from './StartScreen.js'
import GameOverScreen from './GameOverScreen.js'
import { connect } from 'react-redux'
import { startGame as startGameAction, tick as tickAction, whackMole as whackMoleAction, miss as missAction } from '../redux'
import { getLevel } from '../game/levels'
import { comboMultiplier } from '../game/scoring'

const HOLE_COUNT = 12

const GameBoard = (props) => {
  const { status, score, timeLeft, levelIndex, streak, bestCombo, bestScore, bestLevel, startGame, tick, whackMole, miss } = props

  const [activeHoles, setActiveHoles] = useState(() => Array(HOLE_COUNT).fill(false))

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
    if (status !== 'playing') return undefined

    tickIntervalRef.current = setInterval(() => {
      tick()
    }, 1000)

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }
    }
  }, [status, tick])

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
      setHoles(Array(HOLE_COUNT).fill(false))
      return undefined
    }

    const level = getLevel(levelIndex)

    // Fresh level: no moles active yet, no stale timeouts.
    clearAllMoleTimeouts()
    setHoles(Array(HOLE_COUNT).fill(false))

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
          next[i] = true
          moleTimeoutsRef.current[i] = setTimeout(() => {
            setHoles((p) => {
              const n = [...p]
              n[i] = false
              return n
            })
            delete moleTimeoutsRef.current[i]
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
  }, [status, levelIndex, clearAllMoleTimeouts, setHoles])

  const handleWhack = useCallback(
    (index) => {
      if (moleTimeoutsRef.current[index]) {
        clearTimeout(moleTimeoutsRef.current[index])
        delete moleTimeoutsRef.current[index]
      }
      setHoles((prev) => {
        if (!prev[index]) return prev
        const next = [...prev]
        next[index] = false
        return next
      })
      whackMole()
    },
    [whackMole, setHoles]
  )

  const handleMiss = useCallback(() => {
    miss()
  }, [miss])

  const currentLevel = getLevel(levelIndex)
  const multiplier = comboMultiplier(streak)

  return (
    <ImageBackground
      style={styles.container}
      source={require('../assets/background.png')}
    >
      <Text style={styles.header}>Ania's Whack-a-mole App!</Text>

      {status === 'idle' && (
        <StartScreen onStart={startGame} bestScore={bestScore} />
      )}

      {status === 'playing' && (
        <>
          <Hud
            score={score}
            timeLeft={timeLeft}
            levelName={currentLevel.name}
            streak={streak}
            multiplier={multiplier}
          />
          <View style={styles.game}>
            {activeHoles.map((active, i) => (
              <Square
                key={i}
                index={i}
                active={active}
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
          sessionBestScore={bestScore}
          sessionBestLevelName={getLevel(bestLevel).name}
          onRestart={startGame}
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
    }
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
    }
  }

  const mapDispatchToProps = {
    startGame: startGameAction,
    tick: tickAction,
    whackMole: whackMoleAction,
    miss: missAction,
  }

export default connect(mapStateToProps, mapDispatchToProps)(GameBoard)
