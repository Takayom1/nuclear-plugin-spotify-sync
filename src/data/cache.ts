// Liked Songs can hold thousands of tracks, too much for localStorage (which
// the whole player shares), so cached data lives in IndexedDB. Every call
// degrades to a no-op when IndexedDB is unavailable.
import { STORAGE_PREFIX } from '../constants';

const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(STORAGE_PREFIX, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
};

const run = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T | undefined> => {
  try {
    const db = await openDb();
    return await new Promise<T | undefined>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return undefined;
  }
};

export const cacheGet = <T>(key: string) => run<T>('readonly', (store) => store.get(key));

export const cacheSet = (key: string, value: unknown) =>
  run('readwrite', (store) => store.put(value, key));

export const cacheDelete = (key: string) => run('readwrite', (store) => store.delete(key));
