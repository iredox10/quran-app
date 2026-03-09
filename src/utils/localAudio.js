export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('quran-audio-db', 1);
        request.onupgradeneeded = (e) => {
            e.target.result.createObjectStore('settings');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveLocalAudioDirHandle = async (handle) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put(handle, 'audioDirHandle');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getLocalAudioDirHandle = async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get('audioDirHandle');
        req.onsuccess = () => {
            resolve(req.result || null);
        };
        req.onerror = () => reject(req.error);
    });
};

// Helper to fetch the actual object URL from a local file
export const getLocalAudioUrl = async (handle, fileName) => {
    try {
        if (!handle) return null;

        // Ensure we still have permission
        if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') {
            if ((await handle.requestPermission({ mode: 'read' })) !== 'granted') {
                throw new Error("Permission to access local directory denied by user.");
            }
        }

        // Some users might have their files inside a specific folder like "Alafasy/mp3/001001.mp3"
        // Let's first try direct access since that's what we usually expect for local override
        const fileHandle = await handle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
    } catch (e) {
        console.warn("Could not load local audio file:", fileName, e);
        return null;
    }
};
