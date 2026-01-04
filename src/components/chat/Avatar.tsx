"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Personality } from '@/lib/ai-service';
import clsx from 'clsx';

export type Expression = 'idle' | 'happy' | 'sad' | 'surprised' | 'thinking';

interface AvatarProps {
    isListening?: boolean;
    isSpeaking?: boolean;
    isTyping?: boolean;
    personality: Personality;
    expression?: Expression;
    volume?: number; // 0-100
}

export function Avatar({ isListening, isSpeaking, isTyping, personality, expression = 'idle', volume = 0 }: AvatarProps) {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Determine theme color based on personality for the aura
    const getThemeColor = () => {
        switch (personality.id) {
            case 'tutor': return '#3B82F6'; // Blue
            case 'sage': return '#10B981'; // Emerald
            case 'custom': return '#C026D3'; // Fuchsia
            default: return '#8B5CF6'; // Violet (Buddy)
        }
    };

    const themeColor = getThemeColor();

    // Track mouse for 3D tilt effect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            setMousePos({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const getMouthPath = () => {
        if (isSpeaking) {
            // Use volume to drive mouth height
            const height = 155 + (volume * 0.2);
            return `M 80 145 Q 100 ${height} 120 145 Q 100 155 80 145`;
        }
        switch (expression) {
            case 'happy': return "M 75 145 Q 100 170 125 145";
            case 'sad': return "M 80 160 Q 100 140 120 160";
            case 'surprised': return "M 90 155 A 10 10 0 1 0 110 155 A 10 10 0 1 0 90 155";
            case 'thinking': return "M 85 150 Q 100 145 115 155";
            default: return "M 80 148 Q 100 165 120 148"; // Default smile
        }
    };

    const getEyePath = (side: 'left' | 'right') => {
        const x = side === 'left' ? 65 : 135;
        if (expression === 'surprised') {
            return `M ${x - 10} 100 A 10 10 0 1 0 ${x + 10} 100 A 10 10 0 1 0 ${x - 10} 100`;
        }
        if (expression === 'happy') {
            return `M ${x - 15} 105 Q ${x} 85 ${x + 15} 105`;
        }
        // Default arch eyes
        return `M ${x - 15} 100 Q ${x} 80 ${x + 15} 100`;
    };

    return (
        <div
            ref={containerRef}
            className="flex flex-col items-center justify-center p-4 perspective-1000"
        >
            <div
                className={clsx(
                    "relative w-48 h-48 md:w-64 h-64 transition-all duration-500",
                    isListening && "scale-105",
                )}
                style={{
                    transform: `rotateY(${mousePos.x * 20}deg) rotateX(${mousePos.y * -20}deg)`,
                    transformStyle: 'preserve-3d'
                }}
            >
                {/* Outer Glow Nebula / Aura */}
                <div
                    className={clsx(
                        "absolute inset-0 rounded-full blur-3xl opacity-30 transition-all duration-300",
                        isListening ? "animate-pulse" : "animate-float"
                    )}
                    style={{
                        background: `radial-gradient(circle, ${themeColor}, transparent 70%)`,
                        transform: `scale(${1 + (volume / 200)}) translateZ(-50px)`,
                        filter: `blur(${30 + (volume / 5)}px)`
                    }}
                ></div>

                {/* SVG Avatar Chassis */}
                <svg
                    viewBox="0 0 200 200"
                    className={clsx(
                        "w-full h-full drop-shadow-2xl transition-transform duration-500",
                        !isListening && volume < 5 && "animate-tilt"
                    )}
                    style={{
                        transform: `translateZ(50px) scale(${1 + (volume / 1000)})`
                    }}
                >
                    <defs>
                        {/* Screen Gradient */}
                        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#1E1B4B', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#312E81', stopOpacity: 1 }} />
                        </linearGradient>

                        {/* Glow Filter for Face */}
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>

                        {/* Chassis Gradient */}
                        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#F3F4F6', stopOpacity: 1 }} />
                        </linearGradient>
                    </defs>

                    {/* Outer Ring Aura - reactive to volume */}
                    <circle
                        cx="100" cy="100"
                        r={90 + (volume / 10)}
                        fill="none"
                        stroke={themeColor}
                        strokeWidth={1 + (volume / 20)}
                        strokeDasharray="4 8"
                        className="animate-spin-slow opacity-40"
                    />

                    {/* Side Ears/Modules */}
                    <rect x="25" y="80" width="10" height="40" rx="5" fill="#93C5FD" opacity="0.8" />
                    <rect x="165" y="80" width="10" height="40" rx="5" fill="#93C5FD" opacity="0.8" />

                    {/* Main Body Chassis */}
                    <rect
                        x="40" y="30" width="120" height="140" rx="35"
                        fill="url(#bodyGrad)"
                        stroke="#E5E7EB"
                        strokeWidth="1"
                    />

                    {/* Screen Inner Panel */}
                    <rect
                        x="50" y="40" width="100" height="120" rx="25"
                        fill="url(#screenGrad)"
                    />

                    {/* Top Notch */}
                    <rect x="85" y="48" width="30" height="4" rx="2" fill="#111827" opacity="0.3" />

                    {/* Eyes - glow pulses with volume */}
                    <g filter="url(#glow)" className={clsx(!isListening && "animate-blink")}>
                        <path
                            d={getEyePath('left')}
                            fill="none"
                            stroke="#22D3EE"
                            strokeWidth={6 + (volume / 15)}
                            strokeLinecap="round"
                            style={{ transformOrigin: '70px 100px', opacity: 0.8 + (volume / 500) }}
                        />
                        <path
                            d={getEyePath('right')}
                            fill="none"
                            stroke="#22D3EE"
                            strokeWidth={6 + (volume / 15)}
                            strokeLinecap="round"
                            style={{ transformOrigin: '130px 100px', opacity: 0.8 + (volume / 500) }}
                        />
                    </g>

                    {/* Mouth */}
                    <g filter="url(#glow)">
                        <path
                            d={getMouthPath()}
                            fill={expression === 'surprised' ? "#F472B6" : "none"}
                            stroke="#F472B6"
                            strokeWidth={6 + (volume / 30)}
                            strokeLinecap="round"
                            className={clsx(isSpeaking && volume < 1 && "animate-mouth-scale")}
                            style={{ transformOrigin: '100px 150px' }}
                        />
                    </g>

                    {/* Reflections/Gloss */}
                    <rect x="55" y="45" width="40" height="2" rx="1" fill="white" opacity="0.05" />
                </svg>

                {/* Indicator Tags */}
                <div
                    className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10"
                    style={{ transform: 'translateZ(70px)' }}
                >
                    {isListening && (
                        <span className="px-3 py-1 bg-brand-primary text-white text-[10px] font-bold rounded-full shadow-lg animate-bounce uppercase tracking-wider">
                            Listening
                        </span>
                    )}
                    {isTyping && (
                        <span className="px-3 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full shadow-lg animate-pulse uppercase tracking-wider">
                            Thinking
                        </span>
                    )}
                </div>
            </div>

            <h2
                className="mt-10 text-2xl font-black text-slate-700 font-display tracking-tight bg-white/40 px-6 py-1.5 rounded-2xl backdrop-blur-md border border-white/30 shadow-sm"
                style={{ transform: 'translateZ(30px)' }}
            >
                {personality.name}
            </h2>
        </div>
    );
}
