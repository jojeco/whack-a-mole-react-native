// Plain Node test harness for the persistence layer (no framework).
// Run:  npx --yes esbuild@0.20.2 scripts/persistence.test.js --bundle --platform=node --format=cjs --outfile=/tmp/ptest.cjs && node /tmp/ptest.cjs
// Only imports pure modules, never the AsyncStorage adapter.
import {
    STORAGE_KEY, SCHEMA_VERSION, MAX_HIGH_SCORES,
    defaultProgress, sanitizeCount, migrateProgress, serializeProgress, deserializeProgress,
    insertHighScore, qualifiesForHighScores, recordRun,
    selectPersistable, mergeHydrated, shouldPersist,
    loadProgress, saveProgress, clearProgress,
} from '../game/persistence'
import { LEVELS } from '../game/levels'
import { MOLE_TYPES } from '../game/moles'
import { BOMB_PENALTY } from '../game/scoring'
import reducer from '../redux/reducer'
import { startGame, tick, whackMole, miss, endGame, hydrateProgress, resetProgress, moleEscaped } from '../redux/actions'
import store, { attachPersistence } from '../redux/store'

const cases = []
const test = (name, fn) => cases.push({ name, fn })
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed') }
const eq = (a, b, msg) => {
    const x = JSON.stringify(a)
    const y = JSON.stringify(b)
    if (x !== y) throw new Error(`${msg || 'not equal'}: ${x} !== ${y}`)
}

const createFakeStorage = () => {
    const map = new Map()
    return {
        map,
        getItem: async (k) => (map.has(k) ? map.get(k) : null),
        setItem: async (k, v) => { map.set(k, v) },
        removeItem: async (k) => { map.delete(k) },
    }
}

const withNow = (value, fn) => {
    const real = Date.now
    Date.now = () => value
    try { return fn() } finally { Date.now = real }
}

const entry = (score, extra = {}) => ({ score, levelIndex: 0, levelName: 'Warm Up', combo: 0, playedAt: 1, ...extra })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const initial = () => reducer(undefined, { type: '@@INIT' })
const run = (state, actions) => actions.reduce(reducer, state)
const playToGameover = (state, whacks = 3) => {
    let s = reducer(state, startGame())
    for (let i = 0; i < whacks; i++) s = reducer(s, whackMole(MOLE_TYPES.NORMAL))
    for (let i = 0; i < LEVELS[0].durationSec; i++) s = reducer(s, tick())
    return s
}

// ---- pure persistence ----
test('defaultProgress returns a fresh object each call', () => {
    const a = defaultProgress()
    const b = defaultProgress()
    assert(a !== b && a.highScores !== b.highScores && a.lifetime !== b.lifetime)
    a.highScores.push(entry(1))
    a.lifetime.runs = 9
    eq(b, defaultProgress())
})
test('serialize -> deserialize is a lossless round trip', () => {
    const p = recordRun(defaultProgress(), { score: 120, levelIndex: 2, levelName: 'Rush', bestCombo: 7, molesWhacked: 20, misses: 3, bombsHit: 1, playedAt: 1000 })
    eq(deserializeProgress(serializeProgress(p)), p)
})
test("deserializeProgress('{not json') -> defaults", () => eq(deserializeProgress('{not json'), defaultProgress()))
test("deserializeProgress('null' / '42' / '[]') -> defaults", () => {
    ;['null', '42', '[]', '"str"'].forEach((j) => eq(deserializeProgress(j), defaultProgress(), j))
    eq(deserializeProgress(undefined), defaultProgress())
})
test('migrateProgress salvages known fields from a future version', () => {
    const p = migrateProgress({ version: 99, bestScore: 5, somethingNew: true })
    assert(p.bestScore === 5)
    assert(p.version === SCHEMA_VERSION)
    assert(!('somethingNew' in p))
})
test('migrateProgress never returns null / throws on junk', () => {
    ;[null, undefined, 5, 'x', [], () => {}].forEach((v) => eq(migrateProgress(v), defaultProgress()))
})
test('counters clamp to non-negative ints', () => {
    const p = migrateProgress({ bestScore: -5, bestLevel: NaN, bestCombo: Infinity, lifetime: { runs: 2.9, molesWhacked: -1, misses: 'x', bombsHit: null, points: 7 } })
    eq([p.bestScore, p.bestLevel, p.bestCombo], [0, 0, 0])
    eq(p.lifetime, { runs: 2, molesWhacked: 0, misses: 0, bombsHit: 0, points: 7 })
    assert(sanitizeCount(3.7) === 3 && sanitizeCount(-1, 4) === 4)
})
test("highScores:'nope' -> []", () => eq(migrateProgress({ highScores: 'nope' }).highScores, []))
test('one malformed entry among three good drops only the bad one', () => {
    const p = migrateProgress({ highScores: [entry(30), { score: 'bad' }, entry(20), entry(10)] })
    eq(p.highScores.map((e) => e.score), [30, 20, 10])
})
test('table is capped at 5 and sorted descending', () => {
    let list = []
    ;[10, 50, 30, 20, 40, 60, 5].forEach((s) => { list = insertHighScore(list, entry(s)) })
    eq(list.map((e) => e.score), [60, 50, 40, 30, 20])
    assert(list.length === MAX_HIGH_SCORES)
    eq(migrateProgress({ highScores: [1, 2, 3, 4, 5, 6, 7].map((s) => entry(s)) }).highScores.map((e) => e.score), [7, 6, 5, 4, 3])
})
test('tie keeps the older entry ahead', () => {
    const list = insertHighScore([entry(50, { playedAt: 1 })], entry(50, { playedAt: 2 }))
    eq(list.map((e) => e.playedAt), [1, 2])
    const full = [50, 40, 30, 20, 10].map((s) => entry(s))
    assert(!qualifiesForHighScores(full, 10))
    assert(qualifiesForHighScores(full, 11))
    assert(!qualifiesForHighScores([], 0))
})
test('a tied score is not a NEW BEST', () => {
    // Mirrors the isNewHighScore expression GameBoard passes to GameOverScreen:
    // the run only tops the table when it beat every entry that was there
    // before, and insertHighScore ranks a tie below the older entry.
    const isNewBest = (list, score) => score > 0 && score === (list[0] && list[0].score) && score > ((list[1] && list[1].score) || 0)
    assert(isNewBest(insertHighScore([], entry(30)), 30), 'first score is a new best')
    assert(isNewBest(insertHighScore([entry(50)], entry(60)), 60), 'a higher score is a new best')
    assert(!isNewBest(insertHighScore([entry(50)], entry(50)), 50), 'a tie is not a new best')
    assert(!isNewBest(insertHighScore([entry(50)], entry(40)), 40), 'a lower score is not a new best')
    assert(!isNewBest(insertHighScore([], entry(0)), 0), 'a zero score is never a new best')
})
test('insertHighScore does not mutate its input', () => {
    const list = Object.freeze([entry(10)])
    const out = insertHighScore(list, entry(20))
    assert(out !== list && list.length === 1)
})

// ---- run recording ----
test('recordRun increments all 5 lifetime counters', () => {
    const p = recordRun(defaultProgress(), { score: 100, levelIndex: 1, levelName: 'Getting Quick', bestCombo: 4, molesWhacked: 12, misses: 5, bombsHit: 2, playedAt: 1 })
    eq(p.lifetime, { runs: 1, molesWhacked: 12, misses: 5, bombsHit: 2, points: 100 })
    const q = recordRun(p, { score: 50, levelIndex: 0, levelName: 'Warm Up', bestCombo: 1, molesWhacked: 3, misses: 1, bombsHit: 1, playedAt: 2 })
    eq(q.lifetime, { runs: 2, molesWhacked: 15, misses: 6, bombsHit: 3, points: 150 })
})
test('recordRun max-merges bests; a worse run never lowers them', () => {
    const p = recordRun(defaultProgress(), { score: 100, levelIndex: 3, levelName: 'Frenzy', bestCombo: 9, playedAt: 1 })
    const q = recordRun(p, { score: 10, levelIndex: 0, levelName: 'Warm Up', bestCombo: 1, playedAt: 2 })
    eq([q.bestScore, q.bestLevel, q.bestCombo], [100, 3, 9])
})
test('recordRun inserts into the table and does not mutate input', () => {
    const before = defaultProgress()
    const snapshot = JSON.stringify(before)
    const after = recordRun(before, { score: 40, levelIndex: 0, levelName: 'Warm Up', bestCombo: 2, playedAt: 5 })
    assert(after !== before && JSON.stringify(before) === snapshot)
    eq(after.highScores, [entry(40, { combo: 2, playedAt: 5 })])
    const frozen = Object.freeze({ ...defaultProgress(), highScores: Object.freeze([]), lifetime: Object.freeze(defaultProgress().lifetime) })
    recordRun(frozen, { score: 1, playedAt: 1 })
})

// ---- bridge ----
test('shouldPersist is false across a pure TICK and true after a run is recorded', () => {
    let s = reducer(initial(), hydrateProgress(defaultProgress()))
    s = reducer(s, startGame())
    const a = selectPersistable(s)
    const b = selectPersistable(reducer(s, tick()))
    assert(shouldPersist(a, b) === false, 'tick should not persist')
    const c = selectPersistable(playToGameover(s))
    assert(shouldPersist(a, c) === true, 'recorded run should persist')
    assert(shouldPersist(null, a) === true)
})
test('mergeHydrated uses Math.max for bests', () => {
    const s = { ...initial(), bestScore: 80, bestLevel: 1, lifetimeBestCombo: 3 }
    const m = mergeHydrated(s, { ...defaultProgress(), bestScore: 50, bestLevel: 4, bestCombo: 2 })
    eq([m.bestScore, m.bestLevel, m.lifetimeBestCombo, m.hydrated], [80, 4, 3, true])
})

// ---- reducer ----
test('START_GAME preserves persisted fields', () => {
    let s = reducer(initial(), hydrateProgress(recordRun(defaultProgress(), { score: 90, levelIndex: 1, levelName: 'Getting Quick', bestCombo: 6, playedAt: 1 })))
    const started = reducer(s, startGame())
    eq(started.highScores, s.highScores)
    eq(started.lifetime, s.lifetime)
    assert(started.bestScore === 90 && started.hydrated === true && started.lifetimeBestCombo === 6)
})
test('TICK to game over records exactly one run', () => {
    const s = withNow(4242, () => playToGameover(reducer(initial(), hydrateProgress(defaultProgress())), 3))
    assert(s.status === 'gameover' && s.timeLeft === 0)
    assert(s.lifetime.runs === 1 && s.lifetime.molesWhacked === 3 && s.lifetime.points === 30)
    eq(s.highScores, [entry(30, { combo: 3, playedAt: 4242 })])
    assert(s.bestScore === 30 && s.lifetimeBestCombo === 3)
})
test('second END_GAME after game over is a no-op', () => {
    const over = playToGameover(reducer(initial(), hydrateProgress(defaultProgress())))
    const again = reducer(over, endGame())
    assert(again === over)
    assert(again.lifetime.runs === 1 && again.highScores.length === 1)
})
test('END_GAME while idle is a no-op', () => {
    const s = initial()
    assert(reducer(s, endGame()) === s)
})
test('END_GAME while playing records once', () => {
    const s = run(initial(), [startGame(), whackMole(MOLE_TYPES.NORMAL), endGame()])
    assert(s.status === 'gameover' && s.lifetime.runs === 1 && s.highScores.length === 1)
})
test('bomb / miss paths still behave (game behaviour unchanged)', () => {
    const s = run(initial(), [startGame(), whackMole(MOLE_TYPES.NORMAL), whackMole(MOLE_TYPES.BOMB), miss()])
    assert(s.score === Math.max(0, 10 - BOMB_PENALTY) && s.bombsHit === 1 && s.misses === 1 && s.streak === 0)
})
test('a normal mole escaping resets streak and counts as an escape', () => {
    const s = run(initial(), [startGame(), whackMole(MOLE_TYPES.NORMAL), whackMole(MOLE_TYPES.NORMAL), moleEscaped(MOLE_TYPES.NORMAL)])
    assert(s.streak === 0 && s.molesEscaped === 1)
})
test('a golden mole escaping resets streak and counts as an escape', () => {
    const s = run(initial(), [startGame(), whackMole(MOLE_TYPES.NORMAL), whackMole(MOLE_TYPES.NORMAL), moleEscaped(MOLE_TYPES.GOLDEN)])
    assert(s.streak === 0 && s.molesEscaped === 1)
})
test('a bomb escaping (correctly ignored) changes nothing', () => {
    const before = run(initial(), [startGame(), whackMole(MOLE_TYPES.NORMAL), whackMole(MOLE_TYPES.NORMAL)])
    const after = reducer(before, moleEscaped(MOLE_TYPES.BOMB))
    assert(after.streak === before.streak && after.molesEscaped === before.molesEscaped)
})
test('MOLE_ESCAPED while not playing is a no-op', () => {
    const idle = initial()
    assert(reducer(idle, moleEscaped(MOLE_TYPES.NORMAL)) === idle)
    const over = playToGameover(reducer(initial(), hydrateProgress(defaultProgress())))
    assert(reducer(over, moleEscaped(MOLE_TYPES.NORMAL)) === over)
})
test('START_GAME resets molesEscaped to 0', () => {
    const escapedOnce = run(initial(), [startGame(), moleEscaped(MOLE_TYPES.NORMAL)])
    assert(escapedOnce.molesEscaped === 1)
    const restarted = reducer(escapedOnce, startGame())
    assert(restarted.molesEscaped === 0)
})
test('MOLE_ESCAPED never touches score or lifetime/persisted stats', () => {
    const before = run(initial(), [startGame(), whackMole(MOLE_TYPES.NORMAL)])
    const after = reducer(before, moleEscaped(MOLE_TYPES.NORMAL))
    assert(after.score === before.score)
    eq(after.lifetime, before.lifetime)
    eq(after.highScores, before.highScores)
    assert(after.bestScore === before.bestScore && after.bestLevel === before.bestLevel)
})
test('HYDRATE after a finished run does not lower best or clobber the fresh table', () => {
    const over = withNow(7, () => playToGameover(initial(), 4)) // hydrate never happened yet
    const stored = recordRun(defaultProgress(), { score: 10, levelIndex: 0, levelName: 'Warm Up', bestCombo: 1, molesWhacked: 5, playedAt: 1 })
    const s = reducer(over, hydrateProgress(stored))
    assert(s.hydrated === true && s.bestScore === 40)
    eq(s.highScores.map((e) => e.score), [40, 10])
    assert(s.lifetime.runs === 2 && s.lifetime.molesWhacked === 9)
    // a second hydrate cannot re-install the stored table
    const s2 = reducer(s, hydrateProgress(stored))
    eq(s2.highScores, s.highScores)
    eq(s2.lifetime, s.lifetime)
})
test('HYDRATE on a fresh store installs the table', () => {
    const stored = recordRun(defaultProgress(), { score: 60, levelIndex: 2, levelName: 'Rush', bestCombo: 5, molesWhacked: 8, misses: 2, bombsHit: 1, playedAt: 9 })
    const s = reducer(initial(), hydrateProgress(stored))
    assert(s.hydrated === true && s.bestScore === 60 && s.bestLevel === 2 && s.lifetimeBestCombo === 5)
    eq(s.highScores, stored.highScores)
    eq(s.lifetime, stored.lifetime)
})
test('RESET_PROGRESS zeroes durables and leaves hydrated:true', () => {
    const over = playToGameover(reducer(initial(), hydrateProgress(defaultProgress())))
    const s = reducer(over, resetProgress())
    const d = selectPersistable(s)
    eq(d, { ...defaultProgress() })
    assert(s.hydrated === true && s.status === 'gameover' && s.score === over.score)
})

// ---- async facade ----
test('loadProgress on empty storage -> defaults', async () => eq(await loadProgress(createFakeStorage()), defaultProgress()))
test('loadProgress on corrupt string -> defaults', async () => {
    const st = createFakeStorage()
    st.map.set(STORAGE_KEY, '{oops')
    eq(await loadProgress(st), defaultProgress())
})
test('loadProgress with rejecting getItem -> defaults, no throw', async () => {
    eq(await loadProgress({ getItem: async () => { throw new Error('boom') } }), defaultProgress())
    eq(await loadProgress({ getItem: () => { throw new Error('sync boom') } }), defaultProgress())
    eq(await loadProgress(null), defaultProgress())
})
test('saveProgress writes the expected key and a parseable payload', async () => {
    const st = createFakeStorage()
    const p = recordRun(defaultProgress(), { score: 70, levelIndex: 1, levelName: 'Getting Quick', bestCombo: 3, playedAt: 3 })
    assert((await saveProgress(st, p)) === true)
    assert(st.map.has(STORAGE_KEY) && STORAGE_KEY === '@whackamole:progress')
    eq(JSON.parse(st.map.get(STORAGE_KEY)), p)
    eq(await loadProgress(st), p)
    assert((await clearProgress(st)) === true && !st.map.has(STORAGE_KEY))
})
test('saveProgress with rejecting setItem returns false without throwing', async () => {
    assert((await saveProgress({ setItem: async () => { throw new Error('full') } }, defaultProgress())) === false)
    assert((await clearProgress({ removeItem: async () => { throw new Error('x') } })) === false)
})

// ---- store wiring ----
test('attachPersistence writes only when durable state changes, and not on hydration', async () => {
    const st = createFakeStorage()
    let writes = 0
    const counting = { ...st, setItem: async (k, v) => { writes++; return st.setItem(k, v) } }
    const unsubscribe = attachPersistence(store, counting)
    store.dispatch(startGame()) // before hydration: nothing written
    store.dispatch(endGame())
    await flush()
    assert(writes === 0, 'nothing written before hydration')
    store.dispatch(hydrateProgress(defaultProgress()))
    await flush()
    assert(writes === 1, 'run finished before hydration is still saved once hydrated')
    store.dispatch(startGame())
    store.dispatch(tick())
    store.dispatch(whackMole(MOLE_TYPES.NORMAL))
    await flush()
    assert(writes === 1, 'tick / whack do not write')
    store.dispatch(endGame())
    await flush()
    assert(writes === 2, 'recorded run writes')
    eq(JSON.parse(st.map.get(STORAGE_KEY)).lifetime.runs, 2)
    unsubscribe()
    store.dispatch(resetProgress())
    await flush()
    assert(writes === 2, 'unsubscribed')
})

const main = async () => {
    let failed = 0
    for (const { name, fn } of cases) {
        try {
            await fn()
            console.log(`ok   - ${name}`)
        } catch (e) {
            failed++
            console.log(`FAIL - ${name}: ${e && e.message}`)
        }
    }
    console.log(`${cases.length - failed}/${cases.length} passed`)
    process.exit(failed ? 1 : 0)
}

main()
