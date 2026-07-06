import React from 'react';

export default function MinimalHeader({ overline, title, pillPrimary, pillSecondary }) {
    return (
        <div className="py-6 sm:py-10 text-center flex flex-col items-center relative z-[1] mb-2">
            {overline && (
                <div className="inline-flex items-center gap-3 mb-3 opacity-80">
                    <span className="w-8 h-[1px] bg-[var(--border-color)]"></span>
                    <span className="font-mono text-[0.65rem] tracking-[0.2em] text-[var(--text-muted)] uppercase">
                        {overline}
                    </span>
                    <span className="w-8 h-[1px] bg-[var(--border-color)]"></span>
                </div>
            )}
            
            <h1 className="font-ui font-bold text-[var(--text-primary)] tracking-tight leading-none mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}>
                {title}
            </h1>
            
            {(pillPrimary || pillSecondary) ? (
                <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-[var(--shadow-sm)]">
                    {pillPrimary && (
                        <span className="font-medium text-[var(--text-primary)] text-[0.85rem]">
                            {pillPrimary}
                        </span>
                    )}
                    {pillPrimary && pillSecondary && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] opacity-50"></span>
                    )}
                    {pillSecondary && (
                        <span className="text-[var(--text-muted)] text-[0.75rem]">
                            {pillSecondary}
                        </span>
                    )}
                </div>
            ) : (
                <div className="h-[30px]"></div>
            )}
        </div>
    );
}
