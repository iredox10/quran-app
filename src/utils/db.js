import Dexie from 'dexie';

export const db = new Dexie('quran-offline-db');

// Define database schema to match existing raw IndexedDB
db.version(1).stores({
  'api-responses': 'key'
});

export default db;
