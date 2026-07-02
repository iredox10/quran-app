import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X } from 'lucide-react';

export default function Coachmark({ id, label, children, position = 'top-right', className = 'relative inline-flex w-fit' }) {
    const { dismissedCoachmarks, dismissCoachmark } = useAppStore();
    const [isHovered, setIsHovered] = useState(false);

    if (dismissedCoachmarks?.includes(id)) {
        return <>{children}</>;
    }

    const handleDismiss = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dismissCoachmark(id);
    };

    const handleInteract = () => {
        dismissCoachmark(id);
    };

    const positionClasses = {
        'top-right': 'top-0 right-0 translate-x-1/3 -translate-y-1/3',
        'top-left': 'top-0 left-0 -translate-x-1/3 -translate-y-1/3',
        'bottom-right': 'bottom-0 right-0 translate-x-1/3 translate-y-1/3',
        'bottom-left': 'bottom-0 left-0 -translate-x-1/3 translate-y-1/3'
    };

    return (
        <div className={className} onClickCapture={handleInteract}>
            {children}
            <div 
                className={`absolute z-50 flex items-center justify-center ${positionClasses[position]}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="relative flex items-center justify-center cursor-pointer">
                    {/* Pulsing dot */}
                    <div className="absolute w-3 h-3 bg-emerald-500 dark:bg-[#C6A87C] rounded-full animate-ping opacity-75"></div>
                    <div className="relative w-3 h-3 bg-emerald-600 dark:bg-[#b08f5c] rounded-full border-2 border-white dark:border-[#1A1A18] shadow-sm"></div>
                    
                    {/* Tooltip */}
                    {isHovered && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-max max-w-[150px] bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                            <span>{label}</span>
                            <button onClick={handleDismiss} className="p-0.5 hover:bg-slate-700 dark:hover:bg-slate-200 rounded-full transition-colors">
                                <X size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
