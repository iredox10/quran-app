import { useEffect, useState } from 'react';
import { Check, Info } from 'lucide-react';
import { MUSHAFS, getArabicFontFamily, getArabicFontById } from '../config/mushaf';
import { getWordArabicText, sanitizeTajweedHtml } from '../utils/quranText';
import { MUSHAF_PREVIEW_VERSES } from '../data/mushafPreview';

const FONT_REQUESTS = [...new Map(MUSHAFS.filter(m => m.isSelectable !== false).map(m => [m.defaultFontId, getArabicFontFamily(m.defaultFontId).split(',')[0]])).entries()];
const SAMPLE_TEXT = MUSHAF_PREVIEW_VERSES.flatMap(v => v.words.map(w => w.text_qpc_hafs)).join(' ');

function ScriptPreview({ mushaf }) {
    return <span className={`block text-center text-[var(--text-primary)] ${mushaf.forcesTajweed ? 'tajweed-text' : ''}`} lang="ar" dir="rtl"
        style={{ fontFamily: getArabicFontFamily(mushaf.defaultFontId), fontSize: '1.65rem', lineHeight: 2.15 }}>
        {MUSHAF_PREVIEW_VERSES.map(verse => <span className="block" key={verse.verse_key}>
            {verse.words.map((word, index) => <span key={word.position} className={word.char_type_name === 'end' ? 'end' : ''}>
                {index > 0 && ' '}
                {mushaf.forcesTajweed && word.text_uthmani_tajweed
                    ? <span dangerouslySetInnerHTML={{ __html: sanitizeTajweedHtml(word.text_uthmani_tajweed) }} />
                    : getWordArabicText(word, mushaf)}
            </span>)}
        </span>)}
    </span>;
}

export default function MushafPicker({ selectedMushafId, onSelect }) {
    const [loadedFonts, setLoadedFonts] = useState(new Set());
    const [failedFonts, setFailedFonts] = useState(new Set());
    useEffect(() => {
        let active = true;
        if (!document.fonts?.load) {
            setFailedFonts(new Set(FONT_REQUESTS.map(([id]) => id)));
            return;
        }
        const requests = FONT_REQUESTS.map(async ([id, family]) => {
            try {
                const faces = await document.fonts.load(`28px ${family}`, SAMPLE_TEXT);
                if (!faces.length) throw new Error('Font unavailable');
                if (active) setLoadedFonts(current => new Set([...current, id]));
            } catch {
                if (active) setFailedFonts(current => new Set([...current, id]));
            }
        });
        Promise.allSettled(requests);
        return () => { active = false; };
    }, []);

    return <div className="space-y-3 px-4 py-4">
        <p className="mb-4 text-[0.8rem] leading-relaxed text-[var(--text-secondary)]">Compare the actual script before choosing. Samples use Al-Fatihah, verses 2–3, in each edition’s default font. Text reflows with your reading size.</p>
        {MUSHAFS.map(mushaf => {
            const available = mushaf.isSelectable !== false;
            const selected = available && selectedMushafId === mushaf.id;
            const ready = loadedFonts.has(mushaf.defaultFontId);
            return <button type="button" key={mushaf.id} disabled={!available} aria-pressed={selected}
                aria-label={available ? `Select ${mushaf.name}` : `${mushaf.name} unavailable`}
                onClick={() => onSelect(mushaf.id)}
                className={`block w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] ${selected ? 'border-[var(--accent-primary)] bg-[var(--accent-light)]' : 'border-[var(--border-color)] bg-[var(--bg-primary)]'} ${available ? 'cursor-pointer hover:border-[var(--accent-primary)]' : 'cursor-not-allowed'}`}>
                <span className="flex items-start justify-between gap-3 text-[var(--text-primary)]">
                    <span className="text-base font-semibold">{mushaf.name}</span>
                    {selected && <Check size={18} aria-hidden="true" className="shrink-0 text-[var(--accent-primary)]" />}
                    {!available && <Info size={18} aria-hidden="true" className="shrink-0 text-[var(--text-secondary)]" />}
                </span>
                {available ? <>
                    <span className="my-3 flex min-h-[125px] items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-3" aria-busy={!ready && !failedFonts.has(mushaf.defaultFontId)}>
                        {ready ? <ScriptPreview mushaf={mushaf} /> : <span className="text-xs text-[var(--text-secondary)]">{failedFonts.has(mushaf.defaultFontId) ? 'Preview font could not load.' : 'Preparing script preview…'}</span>}
                    </span>
                    <span className="block text-[0.75rem] leading-relaxed text-[var(--text-secondary)]">{mushaf.description}</span>
                    <span className="mt-2 block text-[0.7rem] text-[var(--text-secondary)]">{getArabicFontById(mushaf.defaultFontId)?.name}{mushaf.forcesTajweed ? ' · Tajweed colors' : ''}</span>
                </> : <span className="mt-3 block text-[0.78rem] leading-relaxed text-[var(--text-secondary)]">{mushaf.description} No preview is shown until the matching script and font are available.</span>}
            </button>;
        })}
    </div>;
}
