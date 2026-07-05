import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onFinish }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Show the splash screen for 1.8 seconds, then animate out
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onFinish, 800); // Wait for the fade-out animation to complete before unmounting
        }, 1800);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
                    style={{ backgroundColor: '#004d40' }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                        className="flex flex-col items-center"
                    >
                        {/* We use a white/gold filter or just brightness to make the logo pop against the dark background, 
                            but since it already has teal and gold, we'll just display it. It might blend with the bg though!
                            Wait, the logo is teal and gold. If the background is teal, the teal parts of the logo will vanish! 
                            Let's add a soft glow behind it to make it pop. */}
                        <div className="relative flex items-center justify-center w-32 h-32 mb-6">
                            <div className="absolute inset-0 bg-[#EFECE4] opacity-10 rounded-full blur-2xl"></div>
                            <img src="/logo-512.png" alt="Quran Nur" className="w-24 h-24 object-contain relative z-10" />
                        </div>
                        <motion.h1 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                            className="font-ui text-3xl font-bold tracking-widest text-[#EFECE4] uppercase"
                        >
                            Quran Nur
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                            className="text-[#C6A87C] font-mono text-xs tracking-[0.2em] mt-3"
                        >
                            ILLUMINATE YOUR HEART
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
