// Deterministic per-reciter verse audio path map (quran.com API)
export const RECITER_PATHS = {
    1: 'AbdulBaset/Mujawwad/mp3',
    2: 'AbdulBaset/Murattal/mp3',
    3: 'Sudais/mp3',
    4: 'Shatri/mp3',
    5: 'Rifai/mp3',
    6: 'everyayah/Husary_64kbps',
    7: 'Alafasy/mp3',
    8: 'Minshawi/Mujawwad/mp3',
    9: 'Minshawi/Murattal/mp3',
    10: 'Shuraym/mp3',
    11: 'everyayah/Mohammad_al_Tablaway_128kbps',
    12: 'everyayah/Husary_Muallim_128kbps',
};

export const getVerseFileName = (verseKey) => {
    const [surahNum, ayahNum] = verseKey.split(':');
    return `${String(surahNum).padStart(3, '0')}${String(ayahNum).padStart(3, '0')}.mp3`;
};

// Resolve any raw audio url from the API to a full playable URL
export const resolveAudioUrl = (rawUrl) => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith('http')) return rawUrl;
    if (rawUrl.startsWith('//')) return `https:${rawUrl}`;
    return `https://verses.quran.com/${rawUrl}`;
};

// Build the verse audio URL for a reciter without hitting the API
export const buildReciterUrl = (reciterId, verseKey) => {
    const fileName = getVerseFileName(verseKey);
    if (typeof reciterId === 'string') {
        return `https://everyayah.com/data/${reciterId}/${fileName}`;
    }
    const path = RECITER_PATHS[reciterId];
    if (!path) return null;
    if (path.startsWith('everyayah/')) {
        return `https://mirrors.quranicaudio.com/${path}/${fileName}`;
    }
    return `https://verses.quran.com/${path}/${fileName}`;
};

// Build a player playlist entry list from an array of verses.
// Shared by Surah/Page/PlannerReader so URL resolution stays in one place.
export const buildVersesPlaylist = (verses, {
    pageNumber = null,
    localAudioDirHandle = null,
    customAudioBaseUrl = null,
    fallbackChapterId = null,
} = {}) => verses.map(v => {
    let url = v.audio?.url ? resolveAudioUrl(v.audio.url) : null;
    const fileName = getVerseFileName(v.verse_key);
    let localUrl = null;

    if (localAudioDirHandle) {
        localUrl = `local-audio://${fileName}`;
    } else if (customAudioBaseUrl) {
        url = `${customAudioBaseUrl.replace(/\/$/, '')}/${fileName}`;
    }

    const item = {
        surahId: fallbackChapterId || parseInt(v.verse_key.split(':')[0], 10),
        verseKey: v.verse_key,
        verseNumber: v.verse_number,
        url,
        localUrl
    };
    if (pageNumber != null) item.pageNumber = pageNumber;
    return item;
}).filter(v => v.url);
