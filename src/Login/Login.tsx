"use client";

import React, { useState } from 'react';
import { signIn, useSession } from "next-auth/react";
import { Sparkles, User, Briefcase, Calendar, ChevronRight, Lock, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
    const { update } = useSession();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        age: '',
        gender: 'Rather not say',
        occupation: ''
    });
    const [budName, setBudName] = useState('');
    const [step, setStep] = useState<'auth' | 'naming'>('auth');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (isLoginMode) {
                const res = await signIn("credentials", {
                    username: formData.username.trim(),
                    password: formData.password,
                    redirect: false,
                });

                if (res?.error) {
                    setError("Invalid username or password");
                } else {
                    await update();
                }
            } else {
                if (!formData.username || !formData.password || !formData.age) {
                    setError("Please fill in all required fields");
                    setIsLoading(false);
                    return;
                }

                const signupRes = await fetch("/api/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: formData.username.trim(),
                        password: formData.password,
                        age: parseInt(formData.age),
                        gender: formData.gender,
                        occupation: formData.occupation || 'Explorer'
                    }),
                });

                const data = await signupRes.json();

                if (!signupRes.ok) {
                    setError(data.error || "Signup failed");
                } else {
                    const res = await signIn("credentials", {
                        username: formData.username.trim(),
                        password: formData.password,
                        redirect: false,
                    });

                    if (!res?.error) {
                        await update();
                        setStep('naming');
                    } else {
                        setError("Signup successful, but login failed. Please sign in manually.");
                        setIsLoginMode(true);
                    }
                }
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleNamingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!budName.trim()) return;

        setIsLoading(true);
        try {
            const res = await fetch("/api/user/update-bud-name", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ budName: budName.trim() }),
            });

            if (res.ok) {
                await update();
                window.location.href = "/";
            } else {
                const data = await res.json();
                setError(data.error || "Failed to name Bud");
            }
        } catch {
            setError("Naming failed. You can skip this for now.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg-child overflow-hidden relative">
            <div className="absolute top-20 left-10 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-slate-300/30 rounded-full blur-3xl" />

            <div className="w-full max-w-md z-10 px-2 sm:px-0">
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                    {step === 'auth' ? (
                        <>
                            <div className="mb-6 sm:mb-8 text-center">
                                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-brand-primary rounded-xl shadow-sm mb-4">
                                    <User className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                                    {isLoginMode ? "Welcome back" : "Create account"}
                                </h2>
                                <p className="text-slate-500 mt-2 text-sm sm:text-base">
                                    {isLoginMode ? "Sign in to continue" : "Set up your AI companion"}
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs sm:text-sm font-medium text-slate-600 ml-1">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            required
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 text-sm sm:text-base"
                                            placeholder="your_username"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs sm:text-sm font-medium text-slate-600 ml-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            required
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 text-sm sm:text-base"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {!isLoginMode && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-medium text-slate-600 ml-1">Age</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        required={!isLoginMode}
                                                        type="number"
                                                        value={formData.age}
                                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 text-sm sm:text-base"
                                                        placeholder="Age"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs sm:text-sm font-medium text-slate-600 ml-1">Gender</label>
                                                <div className="relative">
                                                    <select
                                                        value={formData.gender}
                                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                                        className="w-full px-4 py-3.5 sm:py-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 appearance-none cursor-pointer text-sm sm:text-base"
                                                    >
                                                        <option>Boy</option>
                                                        <option>Girl</option>
                                                        <option>Unicorn 🦄</option>
                                                        <option>Space Explorer 🚀</option>
                                                        <option>Rather not say</option>
                                                    </select>
                                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs sm:text-sm font-medium text-slate-600 ml-1">Occupation / Hobby</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={formData.occupation}
                                                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 text-sm sm:text-base"
                                                    placeholder="e.g. Student, Engineer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-brand-primary hover:bg-[#1a3f82] text-white font-semibold py-3.5 sm:py-4 rounded-xl shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 text-base"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <span>{isLoginMode ? "Sign In" : "Create Account"}</span>
                                            <ChevronRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>

                                <div className="pt-2 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setIsLoginMode(!isLoginMode)}
                                        className="text-xs sm:text-sm font-medium text-brand-primary hover:text-[#1a3f82] transition-colors py-2"
                                    >
                                        {isLoginMode ? "New here? Create an account" : "Already have an account? Sign in"}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div>
                            <div className="mb-6 sm:mb-8 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-brand-primary/10 rounded-full mb-6">
                                    <span className="text-5xl sm:text-6xl">🤖</span>
                                </div>
                                <h2 className="text-3xl font-semibold text-slate-900 mb-3">
                                    Name your companion
                                </h2>
                                <p className="text-slate-600 px-4">
                                    Choose a name for your AI companion.
                                </p>
                            </div>

                            <form onSubmit={handleNamingSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-brand-primary" />
                                        <input
                                            required
                                            type="text"
                                            value={budName}
                                            onChange={(e) => setBudName(e.target.value)}
                                            className="w-full pl-14 pr-4 py-5 bg-white border border-slate-200 rounded-xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 font-semibold text-xl sm:text-2xl text-center placeholder:text-slate-300"
                                            placeholder="e.g. Atlas"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || !budName.trim()}
                                    className="w-full bg-brand-primary hover:bg-[#1a3f82] text-white font-semibold py-4 rounded-xl shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-50 text-lg"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Continue</span>
                                            <ChevronRight className="w-6 h-6" />
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => window.location.href = "/"}
                                    className="w-full text-slate-400 font-medium hover:text-slate-600 transition-colors text-sm"
                                >
                                    Skip for now
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <p className="text-center text-slate-400 mt-6 text-xs sm:text-sm">
                    Secure login powered by NextAuth
                </p>
            </div>
        </div>
    );
};
