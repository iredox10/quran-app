import React from 'react';

/** Shared recharts tooltip used by every Progress chart. */
export const ChartTooltip = ({ active, payload, label, unit = 'min', labelFormatter }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-[12px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-3 py-2 z-50">
                <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    {labelFormatter ? labelFormatter(label) : label}
                </p>
                <div className="flex flex-col gap-1">
                    {payload.map((entry, index) => (
                        <p key={index} className="font-ui text-[1rem] font-bold" style={{ color: entry.color || 'var(--accent-primary)' }}>
                            {entry.name !== label ? `${entry.name}: ` : ''}{entry.value} {unit}
                        </p>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default ChartTooltip;
