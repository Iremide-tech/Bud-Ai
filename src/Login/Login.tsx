"use client";

import React, { useState } from 'react';
import { signIn, useSession } from "next-auth/react";
import { Sparkles, User, Briefcase, Calendar, ChevronRight, Lock, Loader2 } from 'lucide-react';

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z" />
            <path fill="#34A853" d="M6.6 14.3l-.5.4-1.8 1.4C5.7 18.6 8.6 20.5 12 20.5c2.1 0 3.9-.7 5.2-1.9l-3.1-2.4c-.9.6-2 .9-3.2.9-2.5 0-4.6-1.7-5.3-3.9z" />
            <path fill="#4A90E2" d="M4.3 9.9A8.4 8.4 0 0 0 3.8 12c0 .7.2 1.4.5 2.1 1-.2 1.9-.5 2.8-.9v-2.1c-.9-.4-1.8-.7-2.8-1.1z" />
            <path fill="#FBBC05" d="M12 5.5c1.2 0 2.3.4 3.1 1.2l2.3-2.3C15.9 2.9 14.1 2 12 2 8.6 2 5.7 3.9 4.3 6.9c1 .4 1.9.7 2.8 1.1.7-2.2 2.8-3.9 5-3.9z" />
        </svg>
    );
}

export const Login: React.FC = () => {
    const { update } = useSession();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setError(null);
        try {
            await signIn('google', { callbackUrl: '/' });
        } catch {
            setError('Google sign-in failed. Please try again.');
            setIsGoogleLoading(false);
        }
    };

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
        <div className="min-h-screen flex items-center justify-center p-4 bg-white">
            <div className="w-full max-w-md">
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                    {step === 'auth' ? (
                        <>
                            <div className="mb-6 sm:mb-8 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 rounded-xl mb-4">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-semibold text-slate-900">
                                    {isLoginMode ? "Welcome back" : "Create account"}
                                </h2>
                                <p className="text-slate-500 mt-2 text-sm">
                                    {isLoginMode ? "Sign in to continue" : "Set up your AI companion"}
                                </p>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                                    {error}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={isLoading || isGoogleLoading}
                                className="w-full mb-4 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                {isGoogleLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <GoogleIcon className="w-5 h-5" />
                                        Continue with Google
                                    </>
                                )}
                            </button>

                            <div className="relative mb-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-white px-3 text-slate-400">or</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600 ml-1">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            required
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-slate-700 text-sm"
                                            placeholder="your_username"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-600 ml-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            required
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-slate-700 text-sm"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {!isLoginMode && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-slate-600 ml-1">Age</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <input
                                                        required={!isLoginMode}
                                                        type="number"
                                                        value={formData.age}
                                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-slate-700 text-sm"
                                                        placeholder="Age"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-slate-600 ml-1">Gender</label>
                                                <select
                                                    value={formData.gender}
                                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-slate-700 text-sm"
                                                >
                                                    <option>Boy</option>
                                                    <option>Girl</option>
                                                    <option>Rather not say</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-600 ml-1">Occupation / Hobby</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={formData.occupation}
                                                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-slate-700 text-sm"
                                                    placeholder="e.g. Student, Engineer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || isGoogleLoading}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>{isLoginMode ? "Sign In" : "Create Account"}</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>

                                <div className="pt-1 text-center">
                                    <button
                                        type="button"
                                        onClick={() => setIsLoginMode(!isLoginMode)}
                                        className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors py-2"
                                    >
                                        {isLoginMode ? "New here? Create an account" : "Already have an account? Sign in"}
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div>
                            <div className="mb-6 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                                    <Sparkles className="w-7 h-7 text-slate-700" />
                                </div>
                                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Name your companion</h2>
                                <p className="text-slate-500 text-sm">Choose a name for your AI companion.</p>
                            </div>

                            <form onSubmit={handleNamingSubmit} className="space-y-5">
                                <input
                                    required
                                    type="text"
                                    value={budName}
                                    onChange={(e) => setBudName(e.target.value)}
                                    className="w-full px-4 py-4 bg-white border border-slate-200 rounded-xl outline-none focus:border-slate-400 text-slate-800 font-medium text-lg text-center"
                                    placeholder="e.g. Atlas"
                                />

                                <button
                                    type="submit"
                                    disabled={isLoading || !budName.trim()}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Continue"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => window.location.href = "/"}
                                    className="w-full text-slate-400 hover:text-slate-600 text-sm"
                                >
                                    Skip for now
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
