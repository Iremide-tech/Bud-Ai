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
    const [quizQuestions, setQuizQuestions] = useState<QuizData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [quizComplete, setQuizComplete] = useState(false);
    const [error, setError] = useState('');

    const [isSetup, setIsSetup] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[1].id);
    const [topic, setTopic] = useState("");

    const fetchQuiz = async () => {
        setLoading(true);
        setError('');
        setSelectedOption(null);
        setShowResult(false);
        setQuizComplete(false);
        setCurrentIndex(0);
        setScore(0);

        try {
            const quizTopic = `${selectedSubject}${topic ? `: ${topic}` : ''}`;
            const jsonString = await generateQuiz(quizTopic);
            const data = JSON.parse(jsonString);

            if (data.error) throw new Error(data.error);
            if (!data.questions || !Array.isArray(data.questions)) throw new Error("Invalid quiz format");

            setQuizQuestions(data.questions);
            setIsSetup(false);
        } catch (err) {
            console.error(err);
            setError('Oops! Failed to load a quiz. Try again?');
        } finally {
            setLoading(false);
        }
    };

    const handleOptionClick = (option: string) => {
        if (showResult) return;
        setSelectedOption(option);
        setShowResult(true);
        if (option === quizQuestions[currentIndex].correctAnswer) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < quizQuestions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowResult(false);
        } else {
            setQuizComplete(true);
        }
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
                        onClick={fetchQuiz}
                        disabled={loading}
                        className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold text-lg hover:bg-violet-600 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Quiz ✨"}
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl animate-in zoom-in-95 duration-300 mx-auto my-4 border-2 border-slate-100 p-12 flex flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                    <div className="w-20 h-20 bg-brand-primary/10 rounded-full animate-ping absolute inset-0"></div>
                    <div className="w-20 h-20 bg-brand-primary/20 rounded-full flex items-center justify-center relative z-10">
                        <span className="text-4xl animate-bounce">🧠</span>
                    </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Bud is thinking...</h3>
                <p className="text-slate-500 animate-pulse text-sm">Getting some super fun questions ready for you! ✨</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-xl border-2 border-red-100 flex flex-col items-center mx-auto my-4 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">⚠️</span>
                </div>
                <p className="text-slate-800 font-bold mb-2">Oops! Something went wrong.</p>
                <p className="text-slate-500 text-sm mb-6">{error}</p>
                <button
                    onClick={() => fetchQuiz()}
                    className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-violet-600 transition shadow-lg shadow-violet-200"
                >
                    Try Again 🔄
                </button>
                <button
                    onClick={() => setIsSetup(true)}
                    className="mt-3 text-slate-400 hover:text-slate-600 text-sm font-medium"
                >
                    Back to Subjects
                </button>
            </div>
        );
    }

    if (quizComplete) {
        return (
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 mx-auto my-4 border-2 border-slate-100 p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">🏆</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Quiz Complete!</h3>
                <p className="text-slate-500 mb-6">Great job explorer!</p>

                <div className="bg-slate-50 rounded-2xl p-6 w-full mb-8">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Final Score</p>
                    <p className="text-5xl font-black text-brand-primary">{score} / {quizQuestions.length}</p>
                </div>

                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={fetchQuiz}
                        className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-violet-600 transition-all shadow-lg shadow-violet-200"
                    >
                        Play Again ✨
                    </button>
                    <button
                        onClick={() => setIsSetup(true)}
                        className="w-full py-4 border-2 border-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-50 transition-all"
                    >
                        Change Topic
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="mt-2 text-slate-400 hover:text-slate-600 text-sm font-medium">Exit Quiz</button>
                    )}
                </div>
            </div>
        );
    }

    const currentQuestion = quizQuestions[currentIndex];
    if (!currentQuestion) return null;

    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    const currentSubject = SUBJECTS.find(s => s.id === selectedSubject);

    return (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 mx-auto my-4 border-2 border-slate-100">
            {/* Header */}
            <div className={clsx("p-6 text-white text-center relative", currentSubject ? currentSubject.color.replace('bg-', 'bg-').split(' ')[0] : "bg-brand-primary")}>
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-bold text-slate-900">Question {currentIndex + 1} of {quizQuestions.length}</h3>
                    <p className="text-slate-800/80 text-sm mt-1">{selectedSubject}{topic ? ` - ${topic}` : ''}</p>
                    {onClose && (
                        <button onClick={onClose} className="absolute -top-2 -right-2 text-slate-600 hover:text-slate-900">✕</button>
                    )}
                </div>
                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full">
                    <div
                        className="h-full bg-white transition-all duration-500"
                        style={{ width: `${((currentIndex) / quizQuestions.length) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Question */}
            <div className="p-6">
                <h4 className="text-xl font-semibold text-slate-800 mb-6 text-center leading-relaxed">
                    {currentQuestion.question}
                </h4>

                <div className="space-y-3">
                    {currentQuestion.options.map((option, idx) => {
                        let stateStyles = "border border-slate-200 hover:bg-slate-50 hover:border-brand-primary/50 text-slate-700";

                        if (showResult) {
                            if (option === currentQuestion.correctAnswer) {
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
                                {showResult && option === currentQuestion.correctAnswer && <CheckCircle className="w-5 h-5 text-green-600" />}
                                {showResult && option === selectedOption && option !== currentQuestion.correctAnswer && <XCircle className="w-5 h-5 text-red-500" />}
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
                        <p className="text-slate-600 leading-relaxed text-sm">
                            {currentQuestion.explanation}
                        </p>
                        <button
                            onClick={handleNext}
                            className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition flex items-center justify-center gap-2"
                        >
                            {currentIndex < quizQuestions.length - 1 ? "Next Question" : "See Results"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
