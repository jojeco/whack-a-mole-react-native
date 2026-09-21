// Pure persistence logic for saved progress (best scores, top-5 table,
// lifetime stats). No React / React Native / AsyncStorage imports and no
// imports at all: every storage-touching function takes an injected `storage`
// ({ getItem, setItem, removeItem } returning Promises), so this file is safe
// to require() from plain Node.

export const STORAGE_KEY = '@whackamole:progress'
export const SCHEMA_VERSION = 1
export const MAX_HIGH_SCORES = 5

const emptyLifetime = () => ({ runs: 0, molesWhacked: 0, misses: 0, bombsHit: 0, points: 0 })

// Fresh object every call so callers can never share/mutate a singleton.
export const defaultProgress = () => ({
    version: SCHEMA_VERSION,
    bestScore: 0,
    bestLevel: 0,
    bestCombo: 0, // lifetime best combo
    highScores: [],
    lifetime: emptyLifetime(),
})

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

// Finite, non-negative, floored integer; otherwise `fallback`.
export const sanitizeCount = (value, fallback = 0) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback
    return Math.min(Math.floor(value), Number.MAX_SAFE_INTEGER)
}

// HighScoreEntry = { score, levelIndex, levelName, combo, playedAt (epoch ms) }.
// Returns null when the entry has no usable score.
export const sanitizeEntry = (raw) => {
    if (!isPlainObject(raw)) return null
    const score = sanitizeCount(raw.score, null)
    if (score === null) return null
    return {
        score,
        levelIndex: sanitizeCount(raw.levelIndex),
        levelName: typeof raw.levelName === 'string' ? raw.levelName : '',
        combo: sanitizeCount(raw.combo),
        playedAt: sanitizeCount(raw.playedAt),
    }
}

// Always an array: bad entries are dropped individually, the rest are sorted
// descending by score (stable, so earlier entries win ties) and capped.
export const sanitizeHighScores = (raw) => {
    if (!Array.isArray(raw)) return []
    return raw
        .map(sanitizeEntry)
        .filter((entry) => entry !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_HIGH_SCORES)
}

export const sanitizeLifetime = (raw) => {
    const source = isPlainObject(raw) ? raw : {}
    const lifetime = emptyLifetime()
    Object.keys(lifetime).forEach((key) => {
        lifetime[key] = sanitizeCount(source[key])
    })
    return lifetime
}

// Turns anything into a valid current-schema progress object. Never throws,
// never returns null. Unknown / future versions salvage whatever known
// fields are still valid.
export const migrateProgress = (raw) => {
    if (!isPlainObject(raw)) return defaultProgress()
    const progress = defaultProgress()
    progress.bestScore = sanitizeCount(raw.bestScore)
    progress.bestLevel = sanitizeCount(raw.bestLevel)
    progress.bestCombo = sanitizeCount(raw.bestCombo)
    progress.highScores = sanitizeHighScores(raw.highScores)
    progress.lifetime = sanitizeLifetime(raw.lifetime)
    progress.version = SCHEMA_VERSION
    return progress
}

export const serializeProgress = (progress) => JSON.stringify(migrateProgress(progress))

export const deserializeProgress = (json) => {
    try {
        if (typeof json !== 'string') return defaultProgress()
        return migrateProgress(JSON.parse(json))
    } catch (e) {
        return defaultProgress()
    }
}

// Returns a NEW array, sorted descending by score. An existing entry with an
// equal score ranks ahead of the new one. Capped at MAX_HIGH_SCORES.
export const insertHighScore = (highScores, entry) => {
    const list = sanitizeHighScores(highScores)
    const clean = sanitizeEntry(entry)
    if (clean === null) return list
    let index = list.length
    for (let i = 0; i < list.length; i++) {
        if (clean.score > list[i].score) {
            index = i
            break
        }
    }
    return [...list.slice(0, index), clean, ...list.slice(index)].slice(0, MAX_HIGH_SCORES)
}

// A zero score is never worth a table slot; a tie with a full table loses to
// the older entries.
export const qualifiesForHighScores = (highScores, score) => {
    const value = sanitizeCount(score, 0)
    if (value <= 0) return false
    const list = sanitizeHighScores(highScores)
    if (list.length < MAX_HIGH_SCORES) return true
    return value > list[list.length - 1].score
}

// Folds one finished run into a progress object. Returns a NEW object; the
// input is never mutated. runResult = { score, levelIndex, levelName,
// bestCombo, molesWhacked, misses, bombsHit, playedAt }.
export const recordRun = (progress, runResult) => {
    const base = migrateProgress(progress)
    const run = isPlainObject(runResult) ? runResult : {}
    const score = sanitizeCount(run.score)
    const levelIndex = sanitizeCount(run.levelIndex)
    const combo = sanitizeCount(run.bestCombo)
    const highScores = qualifiesForHighScores(base.highScores, score)
        ? insertHighScore(base.highScores, {
            score,
            levelIndex,
            levelName: run.levelName,
            combo,
            playedAt: run.playedAt,
        })
        : base.highScores
    return {
        ...base,
        bestScore: Math.max(base.bestScore, score),
        bestLevel: Math.max(base.bestLevel, levelIndex),
        bestCombo: Math.max(base.bestCombo, combo),
        highScores,
        lifetime: {
            runs: base.lifetime.runs + 1,
            molesWhacked: base.lifetime.molesWhacked + sanitizeCount(run.molesWhacked),
            misses: base.lifetime.misses + sanitizeCount(run.misses),
            bombsHit: base.lifetime.bombsHit + sanitizeCount(run.bombsHit),
            points: base.lifetime.points + score,
        },
    }
}

// --- redux bridge (pure) ---------------------------------------------------

// The durable, progress-shaped slice of the redux state.
export const selectPersistable = (state) => ({
    version: SCHEMA_VERSION,
    bestScore: state.bestScore,
    bestLevel: state.bestLevel,
    bestCombo: state.lifetimeBestCombo,
    highScores: state.highScores,
    lifetime: state.lifetime,
})

// Merges stored progress into the current state and returns the new durable
// fields (plus hydrated:true). Bests always use Math.max so a run that
// finished before the async read resolved is never lowered. The table and
// lifetime counters are only taken from storage while the state has not been
// hydrated yet, and are then COMBINED with whatever was already recorded in
// memory (which is zero/empty in the normal case), so nothing is clobbered.
export const mergeHydrated = (state, progress) => {
    const stored = migrateProgress(progress)
    const next = {
        bestScore: Math.max(state.bestScore, stored.bestScore),
        bestLevel: Math.max(state.bestLevel, stored.bestLevel),
        lifetimeBestCombo: Math.max(state.lifetimeBestCombo, stored.bestCombo),
        hydrated: true,
    }
    if (state.hydrated === false) {
        const live = sanitizeLifetime(state.lifetime)
        next.highScores = sanitizeHighScores([...sanitizeHighScores(stored.highScores), ...sanitizeHighScores(state.highScores)])
        next.lifetime = {
            runs: stored.lifetime.runs + live.runs,
            molesWhacked: stored.lifetime.molesWhacked + live.molesWhacked,
            misses: stored.lifetime.misses + live.misses,
            bombsHit: stored.lifetime.bombsHit + live.bombsHit,
            points: stored.lifetime.points + live.points,
        }
    } else {
        next.highScores = state.highScores
        next.lifetime = state.lifetime
    }
    return next
}

// False when nothing durable changed (e.g. a pure TICK).
export const shouldPersist = (prevSlice, nextSlice) => {
    if (!prevSlice || !nextSlice) return prevSlice !== nextSlice
    if (
        prevSlice.bestScore !== nextSlice.bestScore ||
        prevSlice.bestLevel !== nextSlice.bestLevel ||
        prevSlice.bestCombo !== nextSlice.bestCombo
    ) {
        return true
    }
    if (prevSlice.lifetime !== nextSlice.lifetime) {
        const a = prevSlice.lifetime || {}
        const b = nextSlice.lifetime || {}
        if (Object.keys(emptyLifetime()).some((key) => a[key] !== b[key])) return true
    }
    if (prevSlice.highScores !== nextSlice.highScores) {
        const a = prevSlice.highScores || []
        const b = nextSlice.highScores || []
        if (a.length !== b.length) return true
        return a.some((entry, i) => (
            entry.score !== b[i].score ||
            entry.levelIndex !== b[i].levelIndex ||
            entry.levelName !== b[i].levelName ||
            entry.combo !== b[i].combo ||
            entry.playedAt !== b[i].playedAt
        ))
    }
    return false
}

// --- async storage façade --------------------------------------------------

// Never throws and never returns null: any failure yields defaults.
export const loadProgress = async (storage) => {
    try {
        const raw = await storage.getItem(STORAGE_KEY)
        if (raw === null || raw === undefined) return defaultProgress()
        return deserializeProgress(raw)
    } catch (e) {
        return defaultProgress()
    }
}

// Resolves true on success, false on any failure; never throws.
export const saveProgress = async (storage, progress) => {
    try {
        await storage.setItem(STORAGE_KEY, serializeProgress(progress))
        return true
    } catch (e) {
        return false
    }
}

export const clearProgress = async (storage) => {
    try {
        await storage.removeItem(STORAGE_KEY)
        return true
    } catch (e) {
        return false
    }
}
