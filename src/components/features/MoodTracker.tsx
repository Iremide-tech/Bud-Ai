"use client";

import React, { useState } from 'react';
import { Smile, Frown, Meh, Loader } from 'lucide-react';
import clsx from 'clsx';

export function MoodTracker() {
    const [selectedMood, setSelectedMood] = useState<string | null>(null);

    const moods = [
        { icon: Smile, label: 'Happy', color: 'text-brand-accent' },
        { icon: Meh, label: 'Okay', color: 'text-yellow-400' },
        { icon: Frown, label: 'Sad', color: 'text-blue-400' },
    ];

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in zoom-in duration-300">
            <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">How do you feel?</h3>
            <div className="flex justify-between gap-2">
                {moods.map((m) => (
                    <button
                        key={m.label}
                        onClick={() => setSelectedMood(m.label)}
                        className={clsx(
                            "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200 w-full",
                            selectedMood === m.label
                                ? "border-brand-primary bg-brand-primary/5 scale-105"
                                : "border-slate-50 hover:border-slate-200 hover:bg-slate-50"
                        )}
                    >
                        <m.icon className={clsx("w-8 h-8", m.color, selectedMood === m.label && "animate-bounce")} />
                        <span className="text-xs font-medium text-slate-500">{m.label}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}
