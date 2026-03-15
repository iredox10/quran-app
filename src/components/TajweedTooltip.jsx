import { useState, useEffect, useCallback, useRef } from 'react';

const TAJWEED_RULES = {
    ham_wasl: {
        name: 'Hamzat al-Wasl',
        nameAr: 'همزة الوصل',
        color: '#AAAAAA',
        description: 'A connecting hamza that is pronounced at the beginning of speech but silent when preceded by another word. It serves to connect words smoothly in recitation.'
    },
    laam_shamsiyah: {
        name: 'Laam Shamsiyyah',
        nameAr: 'لام شمسية',
        color: '#AAAAAA',
        description: 'The "Lam" of the definite article (Al-) is silent and assimilates into the following letter, which is one of the 14 "sun letters" (huruf shamsiyyah).'
    },
    madda_normal: {
        name: 'Madda (Normal)',
        nameAr: 'مد طبيعي',
        color: '#537FFF',
        description: 'A natural elongation of 2 counts (harakaat). It occurs with the three letters of madd: Alif, Waw, and Ya when they follow their corresponding vowels.'
    },
    madda_permissible: {
        name: 'Madda (Permissible)',
        nameAr: 'مد جائز',
        color: '#4050FF',
        description: 'An elongation of 2, 4, or 5 counts that occurs when a hamza comes after a madd letter. The reader may choose the length, hence "permissible" (Jaa\'iz).'
    },
    madda_obligatory: {
        name: 'Madda (Obligatory)',
        nameAr: 'مد لازم',
        color: '#000FB5',
        description: 'A mandatory elongation of 6 counts that occurs when a madd letter is followed by a shaddah or sukoon within the same word. It must always be stretched to 6 counts.'
    },
    madda_necessary: {
        name: 'Madda (Necessary)',
        nameAr: 'مد واجب',
        color: '#2142c7',
        description: 'A necessary elongation of 4-5 counts that occurs when a madd letter is followed by a hamza in the same word.'
    },
    qalpiala: {
        name: 'Qalqalah',
        nameAr: 'قلقلة',
        color: '#DD0008',
        description: 'An echoing or bouncing sound produced when pronouncing one of the five Qalqalah letters (ق ط ب ج د) with a sukoon. The sound bounces off the articulation point.'
    },
    ikhfa_shafawi: {
        name: 'Ikhfa Shafawi',
        nameAr: 'إخفاء شفوي',
        color: '#D500B7',
        description: 'Oral hiding — when a Meem Saakinah (مْ) is followed by the letter Ba (ب). The meem is pronounced with a slight nasalization while hiding its sound.'
    },
    ikhfa: {
        name: 'Ikhfa',
        nameAr: 'إخفاء',
        color: '#26BFFD',
        description: 'Hiding — when a Noon Saakinah or Tanween is followed by one of 15 specific letters. The noon sound is hidden with a nasal tone for 2 counts.'
    },
    idghaam_shafawi: {
        name: 'Idghaam Shafawi',
        nameAr: 'إدغام شفوي',
        color: '#169777',
        description: 'Lip merging — when a Meem Saakinah (مْ) is followed by another Meem (م). The two meems merge into one with a ghunnah (nasalization) of 2 counts.'
    },
    idghaam_ghunnah: {
        name: 'Idghaam with Ghunnah',
        nameAr: 'إدغام بغنة',
        color: '#169200',
        description: 'Merging with nasalization — when a Noon Saakinah or Tanween is followed by one of 4 letters (ي ن م و). The noon merges into the following letter with a ghunnah of 2 counts.'
    },
    idghaam_no_ghunnah: {
        name: 'Idghaam without Ghunnah',
        nameAr: 'إدغام بلا غنة',
        color: '#169200',
        description: 'Merging without nasalization — when a Noon Saakinah or Tanween is followed by Lam (ل) or Ra (ر). The noon merges completely without any nasal sound.'
    },
    idghaam_mutajanisayn: {
        name: 'Idghaam Mutajanisayn',
        nameAr: 'إدغام متجانسين',
        color: '#A1A1A1',
        description: 'Merging of homorganic letters — when two letters share the same articulation point but differ in characteristics. The first letter merges into the second.'
    },
    idghaam_mutaqaribayn: {
        name: 'Idghaam Mutaqaribayn',
        nameAr: 'إدغام متقاربين',
        color: '#A1A1A1',
        description: 'Merging of close letters — when two letters have close articulation points and similar characteristics. The first letter assimilates into the second.'
    },
    iqlab: {
        name: 'Iqlab',
        nameAr: 'إقلاب',
        color: '#26BFFD',
        description: 'Conversion — when a Noon Saakinah or Tanween is followed by the letter Ba (ب). The noon sound converts into a Meem (م) with a ghunnah of 2 counts.'
    },
    ghunnah: {
        name: 'Ghunnah',
        nameAr: 'غنة',
        color: '#FF7E1E',
        description: 'A nasalization sound of 2 counts that comes from the nasal passage. It naturally accompanies the letters Noon (ن) and Meem (م), especially with shaddah.'
    },
    silent: {
        name: 'Silent',
        nameAr: 'حرف ساكن',
        color: '#AAAAAA',
        description: 'A letter that is written but not pronounced during recitation. It appears in the script but is skipped when reading aloud.'
    }
};

// Map API typo classes/aliases to the standard rules
TAJWEED_RULES.qalaqah = TAJWEED_RULES.qalpiala;
TAJWEED_RULES.ikhafa_shafawi = TAJWEED_RULES.ikhfa_shafawi;
TAJWEED_RULES.ikhafa = TAJWEED_RULES.ikhfa;
TAJWEED_RULES.idgham_shafawi = TAJWEED_RULES.idghaam_shafawi;
TAJWEED_RULES.idgham_ghunnah = TAJWEED_RULES.idghaam_ghunnah;
TAJWEED_RULES.idgham_wo_ghunnah = TAJWEED_RULES.idghaam_no_ghunnah;
TAJWEED_RULES.idgham_mutajanisayn = TAJWEED_RULES.idghaam_mutajanisayn;
TAJWEED_RULES.idgham_mutaqaribayn = TAJWEED_RULES.idghaam_mutaqaribayn;
TAJWEED_RULES.slnt = TAJWEED_RULES.silent;

export default function TajweedTooltip() {
    const [tooltip, setTooltip] = useState(null); // { x, y, rule }
    const tooltipRef = useRef(null);

    const handleTajweedInteraction = useCallback((e) => {
        const tajweedEl = e.target.closest('tajweed');
        if (!tajweedEl) {
            setTooltip(null);
            return;
        }

        // Get the class which represents the tajweed rule
        const ruleClass = tajweedEl.getAttribute('class');
        const rule = TAJWEED_RULES[ruleClass];

        if (!rule) {
            setTooltip(null);
            return;
        }

        const rect = tajweedEl.getBoundingClientRect();

        setTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top,
            rule
        });
    }, []);

    // Close on click outside or scroll
    const handleDismiss = useCallback((e) => {
        if (tooltipRef.current && !tooltipRef.current.contains(e.target) && !e.target.closest('tajweed')) {
            setTooltip(null);
        }
    }, []);

    useEffect(() => {
        // Desktop: mouseover for hover
        document.addEventListener('mouseover', handleTajweedInteraction);
        // Mobile: click/tap
        document.addEventListener('click', handleTajweedInteraction);
        // Dismiss
        document.addEventListener('scroll', () => setTooltip(null), true);
        window.addEventListener('resize', () => setTooltip(null));

        return () => {
            document.removeEventListener('mouseover', handleTajweedInteraction);
            document.removeEventListener('click', handleTajweedInteraction);
            document.removeEventListener('scroll', () => setTooltip(null), true);
            window.removeEventListener('resize', () => setTooltip(null));
        };
    }, [handleTajweedInteraction]);

    // Also dismiss on outside click
    useEffect(() => {
        if (tooltip) {
            document.addEventListener('click', handleDismiss);
            return () => document.removeEventListener('click', handleDismiss);
        }
    }, [tooltip, handleDismiss]);

    if (!tooltip) return null;

    // Calculate position — keep tooltip on screen
    const tooltipWidth = 280;
    let left = tooltip.x - tooltipWidth / 2;
    if (left < 12) left = 12;
    if (left + tooltipWidth > window.innerWidth - 12) left = window.innerWidth - tooltipWidth - 12;

    return (
        <div
            ref={tooltipRef}
            style={{
                position: 'fixed',
                top: `${tooltip.y - 8}px`,
                left: `${left}px`,
                width: `${tooltipWidth}px`,
                transform: 'translateY(-100%)',
                zIndex: 9999,
                pointerEvents: 'auto',
                animation: 'tajweedFadeIn 0.15s ease-out'
            }}
        >
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(12px)'
            }}>
                {/* Header with colored dot + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: tooltip.rule.color,
                        flexShrink: 0
                    }} />
                    <span style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: 'var(--text-primary)'
                    }}>
                        {tooltip.rule.name}
                    </span>
                    <span style={{
                        fontFamily: "'Amiri Quran', serif",
                        fontSize: '1rem',
                        color: tooltip.rule.color,
                        marginRight: 'auto',
                        direction: 'rtl'
                    }}>
                        {tooltip.rule.nameAr}
                    </span>
                </div>
                {/* Description */}
                <p style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.82rem',
                    lineHeight: 1.6,
                    color: 'var(--text-secondary)',
                    margin: 0
                }}>
                    {tooltip.rule.description}
                </p>
            </div>
            {/* Arrow pointer */}
            <div style={{
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid var(--bg-secondary)',
                margin: '0 auto',
                position: 'relative',
                top: '-1px'
            }} />
        </div>
    );
}
