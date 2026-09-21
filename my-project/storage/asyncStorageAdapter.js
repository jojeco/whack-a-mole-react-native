import AsyncStorage from '@react-native-async-storage/async-storage'

// The ONLY file that imports AsyncStorage. Exposes the tiny async
// {getItem, setItem, removeItem} contract that game/persistence.js expects,
// falling back to an in-memory Map when the native module is unavailable
// (e.g. some test / web-preview environments). No game logic, no key names.

export const createMemoryStorage = () => {
    const map = new Map()
    return {
        getItem: async (key) => (map.has(key) ? map.get(key) : null),
        setItem: async (key, value) => {
            map.set(key, String(value))
        },
        removeItem: async (key) => {
            map.delete(key)
        },
    }
}

export const isAsyncStorageAvailable = () => {
    try {
        return Boolean(AsyncStorage) && typeof AsyncStorage.getItem === 'function'
    } catch (e) {
        return false
    }
}

export const getStorage = () => (isAsyncStorageAvailable() ? AsyncStorage : createMemoryStorage())

export default getStorage
