import { useMemo } from 'react';
import { getWordArabicText } from '../utils/quranText';

export default function MushafPageView({ verses, mushaf, arabicFont, fontSize }) {
  const lines = useMemo(() => {
    const lineMap = new Map();

    verses.forEach((verse) => {
      verse.words?.forEach((word) => {
        const lineNumber = Number(word.line_number || 0);
        if (!lineNumber) {
          return;
        }

        if (!lineMap.has(lineNumber)) {
          lineMap.set(lineNumber, []);
        }

        lineMap.get(lineNumber).push({
          key: `${verse.verse_key}-${word.position || lineMap.get(lineNumber).length}`,
          text: getWordArabicText(word, mushaf),
          verseKey: verse.verse_key,
          charType: word.char_type_name,
        });
      });
    });

    return Array.from(lineMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([lineNumber, words]) => ({ lineNumber, words }));
  }, [mushaf, verses]);

  if (!lines.length) {
    return null;
  }

  return (
    <div
      style={{
        maxWidth: '840px',
        margin: '0 auto',
        padding: '1.5rem',
        background: 'var(--bg-surface)',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {mushaf.name} · line-grouped page scaffolding
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {lines.map((line) => (
          <div
            key={line.lineNumber}
            data-line-number={line.lineNumber}
            style={{
              minHeight: '2.8rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.4rem',
              direction: 'rtl',
              textAlign: 'justify',
            }}
          >
            {line.words.map((word) => (
              <span
                key={word.key}
                style={{
                  fontFamily: arabicFont,
                  fontSize: `${fontSize * 0.4 + 1.35}rem`,
                  lineHeight: 1.95,
                  color: word.charType === 'end' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {word.text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
