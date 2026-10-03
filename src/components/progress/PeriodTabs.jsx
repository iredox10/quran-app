import React from 'react';

/**
 * PeriodTabs — the shared pill selector (Today / Week / Month …) used by the
 * Activity Flow, Activity Mix, and the Activity History page so every card
 * switches ranges the same way.
 */
export default function PeriodTabs({ tabs, value, onChange, ariaLabel = 'Select period' }) {
    return (
        <div role="tablist" aria-label={ariaLabel} className="flex bg-[var(--bg-surface)] rounded-full p-1">
            {tabs.map((tab) => {
                const active = value === tab.id;
                return (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(tab.id)}
                        className={`px-3 py-1 rounded-full font-mono text-[0.6rem] uppercase tracking-widest transition-colors ${
                            active
                                ? 'bg-[var(--h-white)] border-[1.5px] border-[var(--h-bone-dark)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
