"use client";

import React, { useState } from 'react';
import { signIn } from "next-auth/react";
import { Sparkles, User, Briefcase, Calendar, ChevronRight, Lock, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export const Login: React.FC = () => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (isLoginMode) {
                const res = await signIn("credentials", {
                    username: formData.username,
                    password: formData.password,
                    redirect: false,
                });

                if (res?.error) {
                    setError("Invalid username or password");
                }
            } else {
                // Signup Logic
                if (!formData.username || !formData.password || !formData.age) {
                    setError("Please fill in all required fields");
                    setIsLoading(false);
                    return;
                }

                const signupRes = await fetch("/api/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: formData.username,
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
                    // Automatically log in after signup
                    await signIn("credentials", {
                        username: formData.username,
                        password: formData.password,
                        redirect: false,
                    });
                }
            }
        } catch (err: any) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg-child overflow-hidden relative">
            {/* Animated background elements */}
            <div className="absolute top-20 left-10 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-brand-secondary/20 rounded-full blur-3xl animate-pulse delay-700" />

            <div className="w-full max-w-md z-10">
                <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 relative overflow-hidden group">
                    <div className="absolute top-4 right-4 animate-bounce-slow">
                        <Sparkles className="w-8 h-8 text-brand-primary opacity-50" />
                    </div>

                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary rounded-2xl shadow-lg shadow-brand-primary/30 mb-4 animate-in zoom-in duration-500">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800">
                            {isLoginMode ? "Welcome Back!" : "Join AI-Bud"}
                        </h2>
                        <p className="text-slate-500 mt-2 font-medium">
                            {isLoginMode ? "Bud missed you! 🌟" : "Let's get to know each other! ✨"}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2 group/field">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    required
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 bg-white/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 font-medium"
                                    placeholder="your_cool_name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group/field">
                            <label className="text-sm font-semibold text-slate-600 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    required
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-12 pr-4 py-4 bg-white/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {!isLoginMode && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 group/field">
                                        <label className="text-sm font-semibold text-slate-600 ml-1">Age</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                required={!isLoginMode}
                                                type="number"
                                                value={formData.age}
                                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                                className="w-full pl-12 pr-4 py-4 bg-white/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 font-medium"
                                                placeholder="Age"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 group/field">
                                        <label className="text-sm font-semibold text-slate-600 ml-1">Gender</label>
                                        <select
                                            value={formData.gender}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            className="w-full px-4 py-4 bg-white/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 font-medium appearance-none cursor-pointer"
                                        >
                                            <option>Boy</option>
                                            <option>Girl</option>
                                            <option>Unicorn 🦄</option>
                                            <option>Space Explorer 🚀</option>
                                            <option>Rather not say</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 group/field">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Occupation/Hobby</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={formData.occupation}
                                            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-white/50 border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-slate-700 font-medium"
                                            placeholder="e.g. Student, Astronaut"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-primary hover:bg-violet-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-primary/25 transform transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
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

                        <div className="pt-4 text-center">
                            <button
                                type="button"
                                onClick={() => setIsLoginMode(!isLoginMode)}
                                className="text-sm font-semibold text-brand-primary hover:text-violet-700 transition-colors"
                            >
                                {isLoginMode ? "New here? Create an account" : "Already have an account? Sign in"}
                            </button>
                        </div>
                    </form>
                </div>

                <p className="text-center text-slate-400 mt-6 text-sm font-medium">
                    Secure login powered by NextAuth. 🛡️
                </p>
            </div>
        </div>
    );
};
