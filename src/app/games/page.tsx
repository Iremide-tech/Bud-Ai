"use client";

import React, { useState } from 'react';
import { BrainCircuit, BookOpen, LayoutGrid, Trophy, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { QuizCard } from '@/components/gamification/QuizCard';
import { StoryBuilder } from '@/components/gamification/StoryBuilder';
import { TicTacToe } from '@/components/gamification/TicTacToe';
import { ChessGame } from '@/components/gamification/ChessGame';

type GameType = 'none' | 'quiz' | 'story' | 'tictactoe' | 'chess';

export default function GamesPage() {
    const [activeGame, setActiveGame] = useState<GameType>('none');

    const games = [
        {
            id: 'quiz' as const,
            title: 'Brainy Quiz',
            description: 'Test your knowledge with fun questions!',
            icon: BrainCircuit,
            color: 'bg-amber-500',
            textColor: 'text-amber-600',
            bgLight: 'bg-amber-50',
            borderColor: 'border-amber-100'
        },
        {
            id: 'story' as const,
            title: 'Story Adventure',
            description: 'Create your own magical story with AI!',
            icon: BookOpen,
            color: 'bg-fuchsia-500',
            textColor: 'text-fuchsia-600',
            bgLight: 'bg-fuchsia-50',
            borderColor: 'border-fuchsia-100'
        },
        {
            id: 'tictactoe' as const,
            title: 'Tic-Tac-Toe',
            description: 'Play a classic game against Bud-AI!',
            icon: XCircle,
            color: 'bg-blue-500',
            textColor: 'text-blue-600',
            bgLight: 'bg-blue-50',
            borderColor: 'border-blue-100'
        },
        {
            id: 'chess' as const,
            title: 'Simple Chess',
            description: 'Learn and play chess the easy way!',
            icon: Trophy,
            color: 'bg-emerald-500',
            textColor: 'text-emerald-600',
            bgLight: 'bg-emerald-50',
            borderColor: 'border-emerald-100'
        }
    ];

    if (activeGame !== 'none') {
        return (
            <div className="flex flex-col h-full animate-in fade-in duration-500">
                <button
                    onClick={() => setActiveGame('none')}
                    className="mb-4 flex items-center gap-2 text-slate-500 hover:text-brand-primary transition-colors font-medium"
                >
                    ← Back to Games Hub
                </button>

                <div className="flex-1 flex items-center justify-center">
                    {activeGame === 'quiz' && <QuizCard onClose={() => setActiveGame('none')} />}
                    {activeGame === 'story' && <StoryBuilder onClose={() => setActiveGame('none')} />}
                    {activeGame === 'tictactoe' && <TicTacToe onClose={() => setActiveGame('none')} />}
                    {activeGame === 'chess' && <ChessGame onClose={() => setActiveGame('none')} />}
                </div>
            </div>
        );
    }

    return (
        <div className="py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-12 text-center md:text-left">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                    Games Hub 🎮
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl">
                    Welcome to your playground! Pick a game and let's have some fun learning together.
                </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 pb-20">
                {games.map((game) => (
                    <button
                        key={game.id}
                        onClick={() => setActiveGame(game.id)}
                        className={clsx(
                            "group relative overflow-hidden p-8 rounded-[2.5rem] text-left transition-all duration-300 hover:scale-[1.02] border-2",
                            game.bgLight,
                            game.borderColor,
                            "hover:shadow-2xl hover:shadow-slate-200"
                        )}
                    >
                        <div className={clsx(
                            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg transition-transform group-hover:rotate-12 group-hover:scale-110",
                            game.color
                        )}>
                            <game.icon className="w-8 h-8" />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 mb-2">{game.title}</h3>
                        <p className="text-slate-600 leading-relaxed">{game.description}</p>

                        <div className="mt-8 flex items-center gap-2 font-bold text-sm tracking-widest uppercase opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                            Play Now
                            <span className="text-lg">→</span>
                        </div>

                        {/* Decorative background element */}
                        <div className={clsx(
                            "absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700",
                            game.color
                        )} />
                    </button>
                ))}
            </div>
        </div>
    );
}
