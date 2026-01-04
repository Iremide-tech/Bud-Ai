"use client";

import React, { useState, useEffect } from 'react';
import { generateQuiz } from '@/app/actions'; // We'll add this export next
import { CheckCircle, XCircle, BrainCircuit, RotateCcw, Loader2, Calculator, FlaskConical, Globe, History as HistoryIcon, Languages } from 'lucide-react';
import clsx from 'clsx';

type QuizData = {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
};

const SUBJECTS = [
    { id: 'math', label: 'Math', icon: Calculator, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
    { id: 'science', label: 'Science', icon: FlaskConical, color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { id: 'geography', label: 'Geography', icon: Globe, color: 'bg-amber-100 text-amber-600 border-amber-200' },
    { id: 'history', label: 'History', icon: HistoryIcon, color: 'bg-orange-100 text-orange-600 border-orange-200' },
    { id: 'languages', label: 'Languages', icon: Languages, color: 'bg-purple-100 text-purple-600 border-purple-200' },
];

export function QuizCard({ onClose }: { onClose?: () => void }) {
    const [loading, setLoading] = useState(false);
    const [quizData, setQuizData] = useState<QuizData | null>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [error, setError] = useState('');

    const [isSetup, setIsSetup] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[1].id); // Default to Science
    const [topic, setTopic] = useState("");

    const fetchQuiz = async (overrideTopic?: string) => {
        setLoading(true);
        setError('');
        setSelectedOption(null);
        setShowResult(false);
        try {
            const quizTopic = overrideTopic || `${selectedSubject}${topic ? `: ${topic}` : ''}`;
            const jsonString = await generateQuiz(quizTopic);
            const data = JSON.parse(jsonString);
            if (data.error) throw new Error(data.error);
            setQuizData(data);
            setIsSetup(false);
        } catch (err) {
            console.error(err);
            setError('Oops! Failed to load a quiz. Try again?');
        } finally {
            setLoading(false);
        }
    };

    const startQuiz = () => {
        fetchQuiz();
    };

    // Initial fetch removed, controlled by isSetup

    const handleOptionClick = (option: string) => {
        if (showResult) return;
        setSelectedOption(option);
        setShowResult(true);
    };

    if (isSetup) {
        return (
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 mx-auto my-4 border-2 border-slate-100 flex flex-col p-4 sm:p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800">Quiz Corner! 🧠</h3>
                        <p className="text-slate-500 text-sm">Choose a subject to start learning.</p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
                    )}
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Select Subject</label>
                        <div className="grid grid-cols-2 gap-2">
                            {SUBJECTS.map((s) => {
                                const Icon = s.icon;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSubject(s.id)}
                                        className={clsx(
                                            "p-3 rounded-xl border-2 flex items-center gap-2 transition-all text-sm",
                                            selectedSubject === s.id ? s.color + " border-current shadow-sm" : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="font-semibold">{s.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Specific Topic (Optional)</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Planets, Dinosaurs..."
                            className="w-full p-3 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-brand-primary/50 focus:bg-white outline-none transition-all text-black"
                        />
                    </div>

                    <button
                        onClick={startQuiz}
                        disabled={loading}
                        className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold text-lg hover:bg-violet-600 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Quiz ✨"}
                    </button>
                </div>
            </div>
        );
    }

    if (!quizData) {
        if (error) {
            return (
                <div className="max-w-md w-full p-6 bg-white rounded-2xl shadow-lg border-red-100 flex flex-col items-center mx-auto my-4">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => fetchQuiz()}
                        className="px-4 py-2 bg-brand-primary text-white rounded-xl hover:bg-violet-600 transition"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return null; // Should be covered by loading or isSetup, but for TS safety
    }

    const isCorrect = selectedOption === quizData.correctAnswer;
    const currentSubject = SUBJECTS.find(s => s.id === selectedSubject);

    return (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 mx-auto my-4 border-2 border-slate-100">
            {/* Header */}
            <div className={clsx("p-6 text-white text-center relative", currentSubject ? currentSubject.color.replace('bg-', 'bg-').split(' ')[0] : "bg-brand-primary")}>
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                    <BrainCircuit className="w-8 h-8 absolute -top-2 -left-2 opacity-30" />
                    <h3 className="text-xl font-bold text-slate-900">Quiz Time! 🧠</h3>
                    <p className="text-slate-800/80 text-sm mt-1">Topic: {selectedSubject}{topic ? ` - ${topic}` : ''}</p>
                    {onClose && (
                        <button onClick={onClose} className="absolute -top-2 -right-2 text-slate-600 hover:text-slate-900">✕</button>
                    )}
                </div>
            </div>

            {/* Question */}
            <div className="p-6">
                <h4 className="text-xl font-semibold text-slate-800 mb-6 text-center leading-relaxed">
                    {quizData.question}
                </h4>

                <div className="space-y-3">
                    {quizData.options.map((option, idx) => {
                        let stateStyles = "border border-slate-200 hover:bg-slate-50 hover:border-brand-primary/50 text-slate-700";

                        if (showResult) {
                            if (option === quizData.correctAnswer) {
                                stateStyles = "bg-green-100 border-green-500 text-green-800 font-medium";
                            } else if (option === selectedOption) {
                                stateStyles = "bg-red-50 border-red-500 text-red-800";
                            } else {
                                stateStyles = "opacity-50 border-slate-100";
                            }
                        } else if (selectedOption === option) {
                            stateStyles = "bg-brand-primary/10 border-brand-primary text-brand-primary font-medium";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionClick(option)}
                                disabled={showResult}
                                className={clsx(
                                    "w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center justify-between group",
                                    stateStyles
                                )}
                            >
                                <span>{option}</span>
                                {showResult && option === quizData.correctAnswer && <CheckCircle className="w-5 h-5 text-green-600" />}
                                {showResult && option === selectedOption && option !== quizData.correctAnswer && <XCircle className="w-5 h-5 text-red-500" />}
                            </button>
                        );
                    })}
                </div>

                {/* Result & Explanation */}
                {showResult && (
                    <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                        <p className={clsx("font-bold text-lg mb-2", isCorrect ? "text-green-600" : "text-brand-secondary")}>
                            {isCorrect ? "Correct! 🎉" : "Nice try! 🧐"}
                        </p>
                        <p className="text-slate-600 leading-relaxed text-sm icon-text">
                            {quizData.explanation}
                        </p>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => fetchQuiz()}
                                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" /> Next Question
                            </button>
                            <button
                                onClick={() => setIsSetup(true)}
                                className="px-4 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition"
                            >
                                Change Topic
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
