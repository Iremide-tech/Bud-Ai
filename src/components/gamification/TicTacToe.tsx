"use client";

import React, { useState, useEffect } from 'react';
import { X, Circle, RotateCcw, Trophy, BrainCircuit } from 'lucide-react';
import clsx from 'clsx';

type Player = 'X' | 'O' | null;

export function TicTacToe({ onClose }: { onClose?: () => void }) {
    const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);
    const [winner, setWinner] = useState<Player | 'Draw'>(null);
    const [winningLine, setWinningLine] = useState<number[] | null>(null);

    const calculateWinner = (squares: Player[]) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6]             // diags
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return { player: squares[a], line: lines[i] };
            }
        }
        if (squares.every(s => s !== null)) return { player: 'Draw' as const, line: null };
        return null;
    };

    const handleClick = (i: number) => {
        if (winner || board[i]) return;

        const newBoard = [...board];
        newBoard[i] = isXNext ? 'X' : 'O';
        setBoard(newBoard);
        setIsXNext(!isXNext);

        const result = calculateWinner(newBoard);
        if (result) {
            setWinner(result.player);
            setWinningLine(result.line);
        }
    };

    // Simple AI for 'O'
    useEffect(() => {
        if (!isXNext && !winner) {
            const timer = setTimeout(() => {
                const availableMoves = board.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
                if (availableMoves.length > 0) {
                    const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
                    handleClick(randomMove);
                }
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isXNext, winner, board]);

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        setWinner(null);
        setWinningLine(null);
    };

    return (
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-slate-100 flex flex-col p-6 sm:p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-slate-800">Tic-Tac-Toe ❌⭕</h3>
                    <p className="text-slate-500 text-sm">Play against Bud-AI!</p>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-4">
                {/* Status */}
                <div className="mb-6 flex items-center gap-3">
                    <div className={clsx(
                        "px-4 py-2 rounded-xl flex items-center gap-2 transition-all",
                        isXNext ? "bg-blue-100 text-blue-600" : "bg-slate-50 text-slate-400"
                    )}>
                        <X className="w-5 h-5" /> <span className="font-bold">You</span>
                    </div>
                    <div className="text-slate-300 font-bold">VS</div>
                    <div className={clsx(
                        "px-4 py-2 rounded-xl flex items-center gap-2 transition-all",
                        !isXNext ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-400"
                    )}>
                        <Circle className="w-4 h-4" /> <span className="font-bold">Bud-AI</span>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-3 w-full aspect-square max-w-[280px]">
                    {board.map((square, i) => {
                        const isWinningSquare = winningLine?.includes(i);
                        return (
                            <button
                                key={i}
                                onClick={() => handleClick(i)}
                                disabled={!!winner || (!isXNext)}
                                className={clsx(
                                    "aspect-square rounded-2xl border-2 flex items-center justify-center transition-all duration-300",
                                    !square && !winner && "bg-slate-50 border-slate-100 hover:border-brand-primary/50 hover:bg-white",
                                    square === 'X' && (isWinningSquare ? "bg-blue-500 border-blue-600 text-white" : "bg-blue-50 border-blue-200 text-blue-600"),
                                    square === 'O' && (isWinningSquare ? "bg-amber-500 border-amber-600 text-white" : "bg-amber-50 border-amber-200 text-amber-600"),
                                    winner && !isWinningSquare && "opacity-40 border-slate-50"
                                )}
                            >
                                {square === 'X' && <X className={clsx("w-10 h-10", isWinningSquare ? "animate-bounce" : "")} />}
                                {square === 'O' && <Circle className={clsx("w-8 h-8", isWinningSquare ? "animate-bounce" : "")} />}
                            </button>
                        );
                    })}
                </div>

                {/* Result Overlay */}
                {winner && (
                    <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {winner === 'Draw' ? (
                            <div className="mb-4">
                                <h4 className="text-xl font-bold text-slate-700">It's a Draw! 🤝</h4>
                                <p className="text-slate-500">Good game!</p>
                            </div>
                        ) : winner === 'X' ? (
                            <div className="mb-4">
                                <div className="flex justify-center mb-2">
                                    <Trophy className="w-12 h-12 text-amber-500 animate-yellow-glow" />
                                </div>
                                <h4 className="text-xl font-bold text-emerald-600">You Won! 🎉</h4>
                                <p className="text-slate-500">You're too good!</p>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <div className="flex justify-center mb-2">
                                    <BrainCircuit className="w-12 h-12 text-amber-500 animate-pulse" />
                                </div>
                                <h4 className="text-xl font-bold text-amber-600">Bud-AI Wins! 🧠</h4>
                                <p className="text-slate-500">Almost had me! Try again?</p>
                            </div>
                        )}
                        <button
                            onClick={resetGame}
                            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                        >
                            <RotateCcw className="w-5 h-5" /> Play Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
