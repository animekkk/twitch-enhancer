import { logger } from './logger.js';

let db;
let request;

export function openDatabase() {
    request = indexedDB.open('twitchenhancer');

    request.onupgradeneeded = () => {
        logger.info('Creating new users database...');
        const db = request.result;
        const store = db.createObjectStore('users', { keyPath: 'name' });
        store.createIndex('by_name', 'name', { unique: true });
        store.createIndex('by_timestamp', 'timestamp');
    };
    
    request.onsuccess = () => {
        logger.info('Users database found.')
        db = request.result;
        const tx = db.transaction('users', 'readwrite');
        const range = IDBKeyRange.upperBound(new Date());
        tx
          .objectStore('users')
          .index('by_timestamp')
          .openCursor(range).onsuccess = (e) => {
            const cursor = e.target.result;
            if (!cursor) return;
            cursor.delete();
            cursor.continue();
        };
    };
}

export async function getUser(name) {
    if(!db) return { error: 418 };
    const tx = db.transaction('users', 'readonly');
    const users = tx.objectStore('users');
    const index = users.index('by_name');

    const request = index.get(name);
    return new Promise(resolve => {
        request.onsuccess = () => {
            const matching = request.result;
            if(matching) return resolve(matching);
            else return resolve({ error: 404 });
        };
    });
}

export function addUser(user, cache = 86400000) {
    const tx = db.transaction('users', 'readwrite');
    const users = tx.objectStore('users');
    // if(cache < 86400000) cache = 86400000; // Min: 1 day
    // if(cache > 604800000) cache = 604800000 // Max: 1 week
    user.timestamp = new Date(Date.now() + 604800000);
    users.put(user);
}