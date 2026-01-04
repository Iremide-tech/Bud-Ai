"use client";

import React, { useState } from 'react';
import { RotateCcw, ChevronLeft, Hexagon } from 'lucide-react';
import clsx from 'clsx';

// Simple representation of pieces
type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
type Color = 'white' | 'black';
type Piece = { type: PieceType; color: Color } | null;

const INITIAL_BOARD: Piece[][] = [
    [
        { type: 'rook', color: 'black' }, { type: 'knight', color: 'black' }, { type: 'bishop', color: 'black' }, { type: 'queen', color: 'black' },
        { type: 'king', color: 'black' }, { type: 'bishop', color: 'black' }, { type: 'knight', color: 'black' }, { type: 'rook', color: 'black' }
    ],
    Array(8).fill({ type: 'pawn', color: 'black' }),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill({ type: 'pawn', color: 'white' }),
    [
        { type: 'rook', color: 'white' }, { type: 'knight', color: 'white' }, { type: 'bishop', color: 'white' }, { type: 'queen', color: 'white' },
        { type: 'king', color: 'white' }, { type: 'bishop', color: 'white' }, { type: 'knight', color: 'white' }, { type: 'rook', color: 'white' }
    ]
];

const PIECE_ICONS: Record<PieceType, string> = {
    pawn: '♟',
    rook: '♜',
    knight: '♞',
    bishop: '♝',
    queen: '♛',
    king: '♚'
};

export function ChessGame({ onClose }: { onClose?: () => void }) {
    const [board, setBoard] = useState<Piece[][]>(INITIAL_BOARD);
    const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
    const [turn, setTurn] = useState<Color>('white');

    const handleSquareClick = (r: number, c: number) => {
        const piece = board[r][c];

        if (selectedSquare) {
            const [sr, sc] = selectedSquare;

            // If clicking the same square, deselect
            if (sr === r && sc === c) {
                setSelectedSquare(null);
                return;
            }

            // Move piece (Simplified sandbox mode: any move is "allowed")
            // In a real app, we'd add validation here. For "Simple Chess" for kids, we'll keep it flexible.
            const newBoard = board.map(row => [...row]);
            newBoard[r][c] = newBoard[sr][sc];
            newBoard[sr][sc] = null;

            setBoard(newBoard);
            setSelectedSquare(null);
            setTurn(turn === 'white' ? 'black' : 'white');
        } else if (piece && piece.color === turn) {
            setSelectedSquare([r, c]);
        }
    };

    const resetGame = () => {
        setBoard(INITIAL_BOARD);
        setSelectedSquare(null);
        setTurn('white');
    };

    return (
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border-2 border-slate-100 flex flex-col p-4 sm:p-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-slate-800">Simple Chess ♟️</h3>
                    <p className="text-slate-500 text-sm">A fun way to learn the pieces!</p>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                {/* Board */}
                <div className="grid grid-cols-8 border-4 border-slate-800 rounded shadow-2xl w-full max-w-[400px] aspect-square overflow-hidden bg-slate-800">
                    {board.map((row, r) =>
                        row.map((piece, c) => {
                            const isDark = (r + c) % 2 === 1;
                            const isSelected = selectedSquare?.[0] === r && selectedSquare?.[1] === c;

                            return (
                                <button
                                    key={`${r}-${c}`}
                                    onClick={() => handleSquareClick(r, c)}
                                    className={clsx(
                                        "w-full h-full flex items-center justify-center text-3xl sm:text-4xl transition-all relative group",
                                        isDark ? "bg-[#b58863]" : "bg-[#f0d9b5]",
                                        isSelected && "ring-4 ring-blue-400 z-10 scale-105 shadow-lg",
                                        !isSelected && "hover:bg-blue-200"
                                    )}
                                >
                                    {piece && (
                                        <span className={clsx(
                                            "select-none cursor-pointer transition-transform group-hover:scale-110",
                                            piece.color === 'white' ? "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" : "text-slate-900"
                                        )}>
                                            {PIECE_ICONS[piece.type]}
                                        </span>
                                    )}
                                    {/* Possible move dot - visual only for now */}
                                    {selectedSquare && !piece && (r + c) % 5 === 0 && (
                                        <div className="w-3 h-3 bg-black/10 rounded-full" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="flex flex-col gap-6 w-full md:w-48">
                    <div className={clsx(
                        "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                        turn === 'white' ? "bg-white border-blue-200 shadow-md" : "bg-slate-50 border-slate-100 opacity-50"
                    )}>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Turn</span>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-white border border-slate-300 shadow-sm" />
                            <span className="font-bold text-slate-700">White</span>
                        </div>
                    </div>

                    <div className={clsx(
                        "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all",
                        turn === 'black' ? "bg-white border-blue-200 shadow-md" : "bg-slate-50 border-slate-100 opacity-50"
                    )}>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Turn</span>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-black shadow-sm" />
                            <span className="font-bold text-slate-700">Black</span>
                        </div>
                    </div>

                    <button
                        onClick={resetGame}
                        className="mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-200"
                    >
                        <RotateCcw className="w-4 h-4" /> Reset
                    </button>

                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 italic text-xs text-blue-600 text-center leading-relaxed">
                        "In this version, you can move pieces anywhere to practice!"
                    </div>
                </div>
            </div>
        </div>
    );
}
