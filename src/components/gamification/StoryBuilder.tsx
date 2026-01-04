"use client";

import React, { useState } from 'react';
import { generateStorySegment } from '@/app/actions';
import { BookOpen, Sparkles, RefreshCw, Wand2, Rocket, Castle, Ghost } from 'lucide-react';
import clsx from 'clsx';

type StoryData = {
    storyText: string;
    choices: string[];
};

const GENRES = [
    { id: 'fantasy', label: 'Fantasy', icon: Castle, color: 'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200' },
    { id: 'scifi', label: 'Space', icon: Rocket, color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { id: 'mystery', label: 'Mystery', icon: Ghost, color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
    { id: 'adventure', label: 'Adventure', icon: Wand2, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' }
];

export function StoryBuilder({ onClose }: { onClose?: () => void }) {
    const [history, setHistory] = useState<StoryData[]>([]);
    const [currentSegment, setCurrentSegment] = useState<StoryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Setup State
    const [isSetup, setIsSetup] = useState(true);
    const [topic, setTopic] = useState("");
    const [selectedGenre, setSelectedGenre] = useState("fantasy");

    const startStory = () => {
        if (!topic.trim()) return;
        setIsSetup(false);
        loadSegment("", "Begin Adventure", { topic, genre: selectedGenre });
    };

    const loadSegment = async (prevText: string, choice: string, theme?: { topic: string, genre: string }) => {
        setLoading(true);
        try {
            // Pass the stored topic/genre only if it's the initial call (optional, but good for context if needed repeatedly)
            // Ideally, the server action handles context if we don't pass it back, but currently we rely on 'prevText'
            // For the VERY first call, we pass theme. For subsequent, we just pass flow.
            // Actually, let's pass it for context if needed, but our action uses it mainly for the start.

            const json = await generateStorySegment(prevText, choice, theme);
            const data = JSON.parse(json);

            if (data.storyText && data.choices) {
                setCurrentSegment(data);
                setHistory(prev => [...prev, data]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (isSetup) {
        return (
            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden mx-auto my-4 border-2 border-slate-100 flex flex-col min-h-[500px] max-h-[90vh] p-4 sm:p-8 overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Create a Story! 📖</h2>
                        <p className="text-slate-500">Pick a genre and tell me what the story is about.</p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">✕</button>
                    )}
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Choose a Genre</label>
                        <div className="grid grid-cols-2 gap-3">
                            {GENRES.map((g) => (
                                <button
                                    key={g.id}
                                    onClick={() => setSelectedGenre(g.id)}
                                    className={clsx(
                                        "p-4 rounded-xl border-2 flex items-center gap-3 transition-all",
                                        selectedGenre === g.id ? g.color + " border-current shadow-sm" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                    )}
                                >
                                    <g.icon className="w-5 h-5" />
                                    <span className="font-semibold">{g.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">What's the story about?</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. A dragon who loves ice cream..."
                            className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-brand-primary/50 focus:bg-white outline-none transition-all text-black"
                        />
                    </div>

                    <button
                        onClick={startStory}
                        disabled={!topic.trim()}
                        className="w-full py-4 mt-4 bg-brand-primary text-white rounded-xl font-bold text-lg hover:bg-violet-600 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 disabled:shadow-none"
                    >
                        Start Adventure ✨
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden mx-auto my-4 border-2 border-slate-100 flex flex-col min-h-[500px] max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 p-4 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-6 h-6" />
                    <div>
                        <h3 className="text-lg font-bold leading-none">Story Time</h3>
                        <p className="text-xs text-white/80 opacity-90">{selectedGenre} • {topic}</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-white/80 hover:text-white">✕</button>
                )}
            </div>

            {/* Story Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {history.map((seg, i) => (
                    <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <p className="text-lg text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                            {seg.storyText}
                        </p>
                    </div>
                ))}

                {loading && (
                    <div className="flex items-center gap-2 text-violet-500 animate-pulse p-4">
                        <Sparkles className="w-5 h-5 animate-spin" />
                        <span>Writing the next chapter...</span>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex flex-col items-center gap-2 text-center">
                        <p className="font-semibold">Oops! {error}</p>
                        <button
                            onClick={() => {
                                if (history.length === 0) {
                                    setIsSetup(true);
                                } else {
                                    // Try last action again? For now just reset or ignore
                                    setError(null);
                                }
                            }}
                            className="text-sm underline hover:text-red-800"
                        >
                            {history.length === 0 ? "Try Again" : "Dismiss"}
                        </button>
                    </div>
                )}
            </div>

            {/* Choices - Fixed at bottom */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                {!loading && !error && currentSegment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentSegment.choices.map((choice, idx) => (
                            <button
                                key={idx}
                                onClick={() => loadSegment(currentSegment.storyText, choice)}
                                className="p-4 rounded-xl bg-violet-50 border-2 border-violet-100 text-violet-700 hover:bg-violet-100 hover:border-violet-300 hover:shadow-md transition-all font-medium text-left"
                            >
                                {choice} ➝
                            </button>
                        ))}
                    </div>
                )}

                {history.length > 0 && !loading && (
                    <button
                        onClick={() => { setHistory([]); setIsSetup(true); setCurrentSegment(null); setTopic(""); }}
                        className="mt-4 text-xs text-slate-400 flex items-center gap-1 hover:text-slate-600 mx-auto"
                    >
                        <RefreshCw className="w-3 h-3" /> Start New Story
                    </button>
                )}
            </div>
        </div>
    );
}
