"use client";

import React, { useState } from 'react';
import { useUser } from '@/lib/user-context';
import { User, Briefcase, Calendar, Edit2, LogOut, Check, X, Sparkles, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { userProfile, logout, isLoading: isUserLoading } = useUser();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editForm, setEditForm] = useState({
        age: userProfile?.age.toString() || '',
        gender: userProfile?.gender || 'Rather not say',
        occupation: userProfile?.occupation || ''
    });

    if (isUserLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
            </div>
        );
    }

    if (!userProfile) {
        router.push('/');
        return null;
    }

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    age: parseInt(editForm.age),
                    gender: editForm.gender,
                    occupation: editForm.occupation
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update profile');
            }

            setIsEditing(false);
            window.location.reload(); // Refresh to get new session data
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl border border-white/50 overflow-hidden">
                {/* Header/Cover */}
                <div className="h-32 bg-gradient-to-r from-brand-primary to-brand-secondary relative">
                    <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-3xl shadow-lg">
                        <div className="w-24 h-24 bg-slate-100 rounded-[1.25rem] flex items-center justify-center overflow-hidden">
                            <User className="w-12 h-12 text-slate-400" />
                        </div>
                    </div>
                </div>

                <div className="pt-16 pb-8 px-8">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800">{userProfile.username}</h1>
                            <p className="text-slate-500 font-medium mt-1 uppercase tracking-wider text-xs">AI-Bud Companion</p>
                        </div>
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="p-3 bg-green-500 text-white rounded-2xl hover:bg-green-600 transition-all shadow-md shadow-green-100 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-brand-primary/10 text-brand-primary rounded-2xl hover:bg-brand-primary/20 transition-all font-semibold"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    <span>Edit Profile</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 italic">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Age Card */}
                        <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                            <div className="flex items-center gap-4 mb-2 text-slate-400">
                                <Calendar className="w-5 h-5" />
                                <span className="text-sm font-semibold uppercase tracking-wide">Age</span>
                            </div>
                            {isEditing ? (
                                <input
                                    type="number"
                                    value={editForm.age}
                                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                                    className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 outline-none focus:border-brand-primary transition-all text-slate-700 font-bold text-xl"
                                />
                            ) : (
                                <p className="text-2xl font-bold text-slate-700 ml-9">{userProfile.age} Years Old</p>
                            )}
                        </div>

                        {/* Gender Card */}
                        <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                            <div className="flex items-center gap-4 mb-2 text-slate-400">
                                <Sparkles className="w-5 h-5" />
                                <span className="text-sm font-semibold uppercase tracking-wide">Identity</span>
                            </div>
                            {isEditing ? (
                                <select
                                    value={editForm.gender}
                                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                    className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 outline-none focus:border-brand-primary transition-all text-slate-700 font-bold"
                                >
                                    <option>Boy</option>
                                    <option>Girl</option>
                                    <option>Unicorn 🦄</option>
                                    <option>Space Explorer 🚀</option>
                                    <option>Rather not say</option>
                                </select>
                            ) : (
                                <p className="text-2xl font-bold text-slate-700 ml-9">{userProfile.gender}</p>
                            )}
                        </div>

                        {/* Occupation Card */}
                        <div className="md:col-span-2 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                            <div className="flex items-center gap-4 mb-2 text-slate-400">
                                <Briefcase className="w-5 h-5" />
                                <span className="text-sm font-semibold uppercase tracking-wide">Occupation / Hobby</span>
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.occupation}
                                    onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                                    className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 outline-none focus:border-brand-primary transition-all text-slate-700 font-bold text-xl"
                                    placeholder="e.g. Astronaut"
                                />
                            ) : (
                                <p className="text-2xl font-bold text-slate-700 ml-9">{userProfile.occupation}</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <p className="text-slate-400 text-sm font-medium">Profile data is securely stored for personalization. 🛡️</p>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all font-bold text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Log Out</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
