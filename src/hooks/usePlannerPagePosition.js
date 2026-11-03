import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const readPosition = key => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};
const writePosition = (key, position) => {
    try { localStorage.setItem(key, JSON.stringify(position)); } catch { /* Reading still works without browser storage. */ }
};

/** Device-local page positions; never sync pixel offsets to a different screen. */
export function usePlannerPagePosition({ planId, day, page, layout, verses, contentRef, lastReadVerseKey }) {
    const key = planId && page != null ? `planner-reader-position:v1:${JSON.stringify([planId, day, page, layout])}` : null;
    const [settledKey, setSettledKey] = useState(null);
    const initialResume = useRef(undefined);
    useLayoutEffect(() => {
        if (initialResume.current === undefined && planId) initialResume.current = lastReadVerseKey || null;
    }, [planId, lastReadVerseKey]);
    const memory = useRef(new Map());
    const onPageSettled = useCallback(() => setSettledKey(key), [key]);
    const dataReady = verses.length > 0 && verses.every(verse => Number(verse.page_number) === Number(page));

    // AnimatePresence skips the completion callback on the initial render.
    // Only accept this page's mounted pane after its transform has settled.
    useLayoutEffect(() => {
        if (!key || !dataReady || settledKey === key) return;
        let frame;
        const check = () => {
            const root = contentRef.current;
            if (root?.dataset.readerPage === String(page)) {
                const style = getComputedStyle(root);
                if (style.opacity === '1' && (style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)')) {
                    setSettledKey(key);
                    return;
                }
            }
            frame = requestAnimationFrame(check);
        };
        frame = requestAnimationFrame(check);
        return () => cancelAnimationFrame(frame);
    }, [key, dataReady, settledKey, page, contentRef]);

    useLayoutEffect(() => {
        if (!key || settledKey !== key || !dataReady || !contentRef.current) return;
        let cancelled = false, ready = false, frame = 0, writeTimer;
        const root = contentRef.current;
        const positions = memory.current;
        const capture = () => {
            if (!ready || cancelled) return;
            const anchor = [...root.querySelectorAll('[id^="verse-"]')]
                .find(element => element.getBoundingClientRect().bottom > 80);
            const position = {
                y: window.scrollY,
                verse: anchor?.id,
                offset: anchor?.getBoundingClientRect().top,
            };
            positions.set(key, position);
        };
        const persist = () => {
            capture();
            const position = positions.get(key);
            if (position) writePosition(key, position);
        };
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                capture();
                clearTimeout(writeTimer);
                writeTimer = setTimeout(persist, 150);
            });
        };
        const restore = async () => {
            // Fonts and the page transition both affect the verse coordinates.
            const textElement = root.querySelector('.quran-text') || root;
            const fontFamily = getComputedStyle(textElement).fontFamily;
            let fontTimer;
            await Promise.race([
                document.fonts?.load(`32px ${fontFamily}`).catch(() => {}),
                new Promise(resolve => { fontTimer = setTimeout(resolve, 1500); }),
            ]);
            clearTimeout(fontTimer);
            await new Promise(resolve => requestAnimationFrame(resolve));
            if (cancelled) return;
            const saved = positions.get(key) || readPosition(key);
            const resume = initialResume.current;
            initialResume.current = null;
            const apply = () => {
                const anchor = saved?.verse ? document.getElementById(saved.verse) : null;
                if (saved && Number.isFinite(saved.y)) {
                    const top = anchor && Number.isFinite(saved.offset)
                        ? window.scrollY + anchor.getBoundingClientRect().top - saved.offset
                        : saved.y;
                    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
                } else {
                    const target = resume ? document.getElementById(`verse-${resume}`) : null;
                    if (target) target.scrollIntoView({ behavior: 'instant', block: 'center' });
                    else window.scrollTo({ top: 0, behavior: 'instant' });
                }
            };
            apply();
            // The planner status card changes height when scrollY crosses 40px.
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            if (cancelled) return;
            apply();
            ready = true;
            root.dataset.positionReady = key;
            capture();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('pagehide', persist);
        void restore();
        return () => {
            // Use the last captured position, not the incoming page's layout.
            const position = positions.get(key);
            if (position) writePosition(key, position);
            delete root.dataset.positionReady;
            cancelled = true;
            cancelAnimationFrame(frame);
            clearTimeout(writeTimer);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('pagehide', persist);
        };
    }, [key, settledKey, dataReady, contentRef]);

    return onPageSettled;
}
