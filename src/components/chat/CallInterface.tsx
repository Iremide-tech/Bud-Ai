"use client";

import React from 'react';
import { PhoneOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { Avatar, Expression } from './Avatar';
import { Personality } from '@/lib/ai-service';
import clsx from 'clsx';

interface CallInterfaceProps {
    personality: Personality;
    isListening: boolean;
    isSpeaking: boolean;
    isTyping: boolean;
    currentExpression: Expression;
    volume: number;
    onHangUpAction: () => void;
    onStartListeningAction: () => void;
}

export function CallInterface({
    personality,
    isListening,
    isSpeaking,
    isTyping,
    currentExpression,
    volume,
    onHangUpAction,
    onStartListeningAction
}: CallInterfaceProps) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-between p-8 text-white overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 animate-pulse"
                    style={{ background: personality.id === 'tutor' ? '#3B82F6' : personality.id === 'sage' ? '#10B981' : '#8B5CF6' }}
                ></div>
                <div
                    className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 animate-pulse"
                    style={{ background: personality.id === 'tutor' ? '#60A5FA' : personality.id === 'sage' ? '#34D399' : '#A78BFA' }}
                ></div>
            </div>

            {/* Header */}
            <div className="z-10 flex flex-col items-center gap-2">
                <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                    <span className="text-sm font-medium tracking-wide text-slate-300">VOICE CALL</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight">{personality.name}</h2>
            </div>

            {/* Avatar Center */}
            <div className="z-10 flex-1 flex items-center justify-center w-full max-w-2xl">
                <div className="relative group">
                    <Avatar
                        isListening={isListening}
                        isSpeaking={isSpeaking}
                        isTyping={isTyping}
                        personality={personality}
                        expression={currentExpression}
                        volume={volume}
                    />

                    {/* Status Overlays */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        {isTyping && (
                            <div className="flex items-center gap-2 bg-blue-500/80 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-400/50 animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs font-bold uppercase tracking-widest">Thinking...</span>
                            </div>
                        )}
                        {isSpeaking && !isTyping && (
                            <div className="flex items-center gap-2 bg-pink-500/80 backdrop-blur-sm px-4 py-2 rounded-full border border-pink-400/50">
                                <span className="text-xs font-bold uppercase tracking-widest">Speaking</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="z-10 flex flex-col items-center gap-8 w-full max-w-md">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onStartListeningAction}
                        disabled={isListening || isTyping}
                        className={clsx(
                            "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-xl",
                            isListening
                                ? "bg-red-500 text-white animate-pulse scale-110 shadow-red-500/40"
                                : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                        )}
                    >
                        {isListening ? <Mic className="w-8 h-8" /> : <Mic className="w-8 h-8 opacity-80" />}
                    </button>

                    <button
                        onClick={onHangUpAction}
                        className="w-20 h-20 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-all active:scale-90 shadow-2xl shadow-red-900/40"
                    >
                        <PhoneOff className="w-10 h-10" />
                    </button>

                    <button
                        className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 border border-white/20 transition-all active:scale-90 opacity-50 cursor-not-allowed"
                    >
                        <MicOff className="w-8 h-8 opacity-40" />
                    </button>
                </div>

                <p className="text-slate-400 text-sm font-medium animate-bounce">
                    {isListening ? "I'm listening..." : "Tap the mic to talk"}
                </p>
            </div>
        </div>
    );
}
