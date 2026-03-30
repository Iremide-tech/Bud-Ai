"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Image as ImageIcon, Loader2, Sparkles, BookOpen, Coffee, BrainCircuit, Wand2, X, Phone, Globe } from 'lucide-react';
import clsx from 'clsx';
import { AIService, Message, Personality, PRESETS } from '@/lib/ai-service';
import { elevenLabsTTS, transcribeAudio } from '@/app/actions';
import { QuizCard } from '@/components/gamification/QuizCard';
import { StoryBuilder } from '@/components/gamification/StoryBuilder';
import { CustomizePersonalityModal } from './CustomizePersonalityModal';
import { Avatar, Expression } from './Avatar';
import { CallInterface } from './CallInterface';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useUser } from '@/lib/user-context';
import { getWebSearchIntent } from '@/lib/web-search-intent';

type SpeechRecognitionLike = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    abort: () => void;
    onstart: (() => void) | null;
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
    onerror: ((event: { error?: string; message?: string }) => void) | null;
    onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
    interface Window {
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
        SpeechRecognition?: SpeechRecognitionConstructor;
    }
}

export function ChatInterface() {
    const { userProfile } = useUser();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'ai',
            text: `Hi ${userProfile?.username || 'there'}! I'm ${userProfile?.budName || 'Bud'}-AI. I'm so happy to see you! 🌟 What shall we play or talk about today?`,
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [personality, setPersonality] = useState<Personality>(PRESETS.buddy);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [gameMode, setGameMode] = useState<'none' | 'quiz' | 'story'>('none');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentExpression, setCurrentExpression] = useState<Expression>('idle');
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [isSearchingWeb, setIsSearchingWeb] = useState(false);
    const volume = useAudioAnalyzer(audioStream);

    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<Message[]>(messages);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fallbackStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ignoreRecognitionEndRef = useRef(false);
    const shouldTranscribeRecorderRef = useRef(true);

    // Sync messagesRef to avoid stale closures
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        audioStreamRef.current = audioStream;
    }, [audioStream]);

    const stopActiveAudioStream = (stream?: MediaStream | null) => {
        const streamToStop = stream ?? audioStreamRef.current;
        if (streamToStop) {
            streamToStop.getTracks().forEach(track => track.stop());
        }
        audioStreamRef.current = null;
        setAudioStream(null);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, gameMode]);

    // Persistence Effect
    useEffect(() => {
        const saved = localStorage.getItem('bud_custom_personality');
        if (saved) {
            try {
                const p = JSON.parse(saved);
                setPersonality(p);
                AIService.setPersonality(p);
            } catch (e) {
                console.error("Failed to load saved personality", e);
            }
        }
    }, []);

    useEffect(() => {
        return () => {
            stopListening({ clearStatus: true, transcribeOnStop: false });
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const speakResponse = async (text: string) => {
        setIsSpeaking(true);
        try {
            const { audioContent, error } = await elevenLabsTTS(text);
            if (audioContent && !error) {
                const audio = new Audio(`data:audio/mpeg;base64,${audioContent}`);
                audio.onended = () => setIsSpeaking(false);
                audio.onerror = () => {
                    console.error("Audio playback error, falling back to system TTS");
                    fallbackSpeak(text);
                };
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => {
                        console.error("Playback failed:", err);
                        fallbackSpeak(text);
                    });
                }
            } else {
                fallbackSpeak(text);
            }
        } catch (err) {
            console.error("TTS Error:", err);
            fallbackSpeak(text);
        }
    };

    const fallbackSpeak = (text: string) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.2;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
        } else {
            setIsSpeaking(false);
        }
    };

    const clearVoiceTimers = () => {
        if (listenTimeoutRef.current) {
            clearTimeout(listenTimeoutRef.current);
            listenTimeoutRef.current = null;
        }
        if (fallbackStopTimeoutRef.current) {
            clearTimeout(fallbackStopTimeoutRef.current);
            fallbackStopTimeoutRef.current = null;
        }
    };

    const stopListening = (options?: { clearStatus?: boolean; transcribeOnStop?: boolean }) => {
        const shouldClearStatus = options?.clearStatus ?? false;
        shouldTranscribeRecorderRef.current = options?.transcribeOnStop ?? true;

        clearVoiceTimers();
        ignoreRecognitionEndRef.current = true;

        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch {
                // no-op: recognition may already be stopped
            }
            recognitionRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        stopActiveAudioStream();
        setIsListening(false);

        if (shouldClearStatus) {
            setStatus('');
        }
    };

    const startFallbackRecording = async () => {
        if (typeof MediaRecorder === 'undefined') {
            setStatus('Voice recording unsupported on this browser');
            setIsListening(false);
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus('Voice input unsupported on this browser');
            setIsListening(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);

            const types = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                'audio/mpeg'
            ];
            const supportedType = types.find(type => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type));
            const mediaRecorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;
            shouldTranscribeRecorderRef.current = true;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                clearVoiceTimers();
                setIsListening(false);
                stopActiveAudioStream(stream);

                const shouldTranscribe = shouldTranscribeRecorderRef.current;
                shouldTranscribeRecorderRef.current = true;
                if (mediaRecorderRef.current === mediaRecorder) {
                    mediaRecorderRef.current = null;
                }

                if (!shouldTranscribe) {
                    return;
                }

                const audioBlob = new Blob(audioChunksRef.current, { type: supportedType || undefined });
                if (audioBlob.size < 500) {
                    setStatus('No speech detected');
                    return;
                }

                setStatus('Transcribing...');

                try {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            const base64Audio = (reader.result as string).split(',')[1];
                            const extension = supportedType ? (supportedType.split('/')[1]?.split(';')[0] || 'webm') : 'webm';
                            const { text, error } = await transcribeAudio(base64Audio, extension);

                            if (error) {
                                setStatus('Transcription Error');
                                console.error("Whisper fallback error:", error);
                                return;
                            }

                            if (text && text.trim().length > 0) {
                                setInputText(text);
                                handleVoiceSend(text);
                                setStatus('');
                                return;
                            }

                            setStatus('No speech detected');
                        } catch (err) {
                            console.error("Transcription process error", err);
                            setStatus('Transcription Error');
                        }
                    };

                    reader.onerror = () => {
                        setStatus('Transcription Error');
                    };

                    reader.readAsDataURL(audioBlob);
                } catch (err) {
                    console.error("Transcription process error", err);
                    setStatus('Transcription Error');
                }
            };

            setIsListening(true);
            setStatus('Recording...');
            mediaRecorder.start();

            fallbackStopTimeoutRef.current = setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    stopListening({ transcribeOnStop: true });
                }
            }, 10000);
        } catch (err) {
            console.error("Fallback mic error", err);
            setStatus('Mic access denied');
            setIsListening(false);
        }
    };

    const startListening = async () => {
        if (isTyping) return;

        stopListening({ transcribeOnStop: false });

        if (typeof window !== 'undefined') {
            const maybeWin = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
            const AudioContextClass = maybeWin.AudioContext || maybeWin.webkitAudioContext;
            if (AudioContextClass) {
                const tempCtx = new AudioContextClass();
                if (tempCtx.state === 'suspended') {
                    tempCtx.resume().then(() => tempCtx.close());
                } else {
                    tempCtx.close();
                }
            }
        }

        const SpeechRecognitionCtor = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

        if (!SpeechRecognitionCtor) {
            startFallbackRecording();
            return;
        }

        try {
            const recognition = new SpeechRecognitionCtor();
            recognitionRef.current = recognition;
            ignoreRecognitionEndRef.current = false;

            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = async () => {
                setIsListening(true);
                setStatus('Listening...');

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    setAudioStream(stream);
                } catch (err) {
                    console.warn("Visualizer mic access deferred", err);
                }

                listenTimeoutRef.current = setTimeout(() => {
                    if (recognitionRef.current === recognition) {
                        setStatus('No speech detected');
                        stopListening({ transcribeOnStop: false });
                    }
                }, 10000);
            };

            recognition.onresult = (event) => {
                clearVoiceTimers();

                const transcript = event.results[0]?.[0]?.transcript || '';
                if (!transcript.trim()) {
                    setStatus('No speech detected');
                    stopListening({ transcribeOnStop: false });
                    return;
                }

                setInputText(transcript);
                stopListening({ transcribeOnStop: false });
                handleVoiceSend(transcript);
            };

            recognition.onerror = (event) => {
                clearVoiceTimers();
                const err = event?.error || event?.message || 'unknown';

                if (err === 'no-speech') {
                    setStatus('No speech detected');
                    stopListening({ transcribeOnStop: false });
                    return;
                }

                if (err === 'not-allowed' || err === 'permission-denied') {
                    setStatus('Mic access denied');
                    stopListening({ transcribeOnStop: false });
                    return;
                }

                console.error('Speech recognition error', err);
                stopListening({ transcribeOnStop: false });
                startFallbackRecording();
            };

            recognition.onend = () => {
                clearVoiceTimers();
                if (recognitionRef.current === recognition) {
                    recognitionRef.current = null;
                }

                const shouldIgnore = ignoreRecognitionEndRef.current;
                ignoreRecognitionEndRef.current = false;
                setIsListening(false);
                stopActiveAudioStream();

                if (shouldIgnore) return;

                setStatus(prev => (
                    prev.includes('Error') ||
                    prev.includes('detected') ||
                    prev.includes('Speaking') ||
                    prev.includes('Mic') ||
                    prev.includes('Transcrib')
                ) ? prev : '');
            };

            recognition.start();
        } catch (err) {
            console.error("Speech recognition start error", err);
            startFallbackRecording();
        }
    };

    const handleVoiceSend = async (text: string) => {
        if (!text.trim() || isTyping) return;
        const searchIntent = getWebSearchIntent(text);

        const newMessage: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: text,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setIsTyping(true);
        setCurrentExpression('thinking');
        setStatus(searchIntent.shouldSearch ? 'Searching web...' : 'Thinking...');
        setIsSearchingWeb(searchIntent.shouldSearch);

        try {
            const response = await AIService.sendMessage(text, messagesRef.current, userProfile);
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: response.text,
                image: response.image,
                webVerified: !!response.usedWebSearch,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);

            if (response.mood) setCurrentExpression(response.mood as Expression);
            else setCurrentExpression('idle');

            setStatus('Speaking...');
            await speakResponse(aiResponse.text);
            setStatus('');
        } catch (error) {
            console.error("AI Error", error);
            setStatus('Error! Try again.');
        } finally {
            setIsTyping(false);
            setIsSearchingWeb(false);
        }
    };

    const handleSend = async () => {
        if ((!inputText.trim() && !selectedImage) || isTyping) return;
        const searchIntent = getWebSearchIntent(inputText);

        const userText = inputText;
        const currentImage = selectedImage;

        const newMessage: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: userText,
            image: currentImage || undefined,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        setSelectedImage(null);
        setIsTyping(true);
        setCurrentExpression('thinking');
        setIsSearchingWeb(searchIntent.shouldSearch);

        try {
            const response = await AIService.sendMessage(userText, messagesRef.current, userProfile, currentImage || undefined);
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: response.text,
                image: response.image,
                webVerified: !!response.usedWebSearch,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
            if (response.mood) setCurrentExpression(response.mood as Expression);
            else setCurrentExpression('idle');
        } catch (error) {
            console.error("AI Error", error);
        } finally {
            setIsTyping(false);
            setIsSearchingWeb(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const changePersonality = (p: Personality) => {
        AIService.setPersonality(p);
        setPersonality(p);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'ai',
            text: p.id === 'buddy' ? "Yay! Let's play! 🎈" : p.id === 'tutor' ? "Ready to learn something new? 📚" : "Peace and calm. 🌿",
            timestamp: new Date()
        }]);
    };

    const handleSaveCustomPersonality = (p: Personality) => {
        localStorage.setItem('bud_custom_personality', JSON.stringify(p));
        changePersonality(p);
    };

    const startCall = () => {
        setIsCallActive(true);
        setStatus('');
    };

    const endCall = () => {
        setIsCallActive(false);
        stopListening({ clearStatus: true, transcribeOnStop: false });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Personality & Game Header - Improved for mobile horizontal scroll */}
            <div className="shrink-0 bg-white/50 backdrop-blur-md rounded-2xl p-3 border border-white/50 shadow-sm mb-4 sticky top-0 z-20 overflow-x-auto no-scrollbar pb-3">
                <div className="flex items-center gap-2 min-w-max px-1">
                    <button
                        onClick={() => changePersonality(PRESETS.buddy)}
                        className={clsx("px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95", personality.id === 'buddy' ? "bg-brand-primary text-white shadow-md glow" : "bg-white/50 text-slate-500 hover:bg-white")}
                    >
                        <Sparkles className="w-4 h-4" /> <span className="text-sm font-bold">Buddy</span>
                    </button>
                    <button
                        onClick={() => changePersonality(PRESETS.tutor)}
                        className={clsx("px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95", personality.id === 'tutor' ? "bg-blue-500 text-white shadow-md glow" : "bg-white/50 text-slate-500 hover:bg-white")}
                    >
                        <BookOpen className="w-4 h-4" /> <span className="text-sm font-bold">Tutor</span>
                    </button>
                    <button
                        onClick={() => changePersonality(PRESETS.sage)}
                        className={clsx("px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95", personality.id === 'sage' ? "bg-emerald-500 text-white shadow-md glow" : "bg-white/50 text-slate-500 hover:bg-white")}
                    >
                        <Coffee className="w-4 h-4" /> <span className="text-sm font-bold">Sage</span>
                    </button>
                    <button
                        onClick={() => setIsCustomizing(true)}
                        className={clsx("px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95", personality.id === 'custom' ? "bg-fuchsia-600 text-white shadow-md glow" : "bg-white/50 text-slate-500 hover:bg-white")}
                    >
                        <Wand2 className="w-4 h-4" /> <span className="text-sm font-bold">{personality.id === 'custom' ? personality.name : 'Custom'}</span>
                    </button>

                    <div className="w-px h-6 bg-slate-300 mx-1"></div>

                    <button
                        onClick={() => setGameMode(gameMode === 'quiz' ? 'none' : 'quiz')}
                        className={clsx("p-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95", gameMode === 'quiz' ? "bg-amber-500 text-white shadow-md" : "bg-white/50 text-slate-500")}
                    >
                        <BrainCircuit className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setGameMode(gameMode === 'story' ? 'none' : 'story')}
                        className={clsx("p-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95", gameMode === 'story' ? "bg-fuchsia-500 text-white shadow-md" : "bg-white/50 text-slate-500")}
                    >
                        <BookOpen className="w-5 h-5" />
                    </button>
                    <button
                        onClick={startCall}
                        className="p-2.5 rounded-xl flex items-center gap-2 transition-all bg-green-500 text-white shadow-md active:scale-95"
                    >
                        <Phone className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto space-y-6 p-4">
                {gameMode === 'none' && (
                    <div className="flex justify-center mb-8">
                        <Avatar
                            isListening={isListening}
                            isSpeaking={isSpeaking}
                            isTyping={isTyping}
                            personality={personality}
                            expression={currentExpression}
                            volume={volume}
                        />
                    </div>
                )}

                {gameMode === 'quiz' ? (
                    <div className="flex items-center justify-center h-full">
                        <QuizCard onClose={() => setGameMode('none')} />
                    </div>
                ) : gameMode === 'story' ? (
                    <div className="flex items-center justify-center h-full">
                        <StoryBuilder onClose={() => setGameMode('none')} />
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={clsx(
                                    "flex w-full",
                                    msg.sender === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                <div className={clsx(
                                    "max-w-[80%] p-4 rounded-2xl shadow-sm relative animate-in fade-in slide-in-from-bottom-2 duration-300",
                                    msg.sender === 'user'
                                        ? "bg-brand-primary text-white rounded-br-none"
                                        : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                                )}>
                                    {msg.sender === 'ai' && msg.webVerified && (
                                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                                            <Globe className="w-3 h-3" />
                                            Web-verified
                                        </div>
                                    )}
                                                            {msg.image && (
                                                                <div className="mb-2 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={msg.image} alt="Sent image" className="max-w-full h-auto object-contain max-h-64" />
                                                                </div>
                                                            )}
                                    <p className="text-lg leading-relaxed">{msg.text}</p>
                                    <span className="text-[10px] opacity-70 absolute bottom-1 right-3">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start w-full">
                                <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-2">
                                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-brand-primary rounded-full animate-bounce"></div>
                                </div>
                                {isSearchingWeb && (
                                    <div className="ml-3 mt-2 inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Searching web...
                                    </div>
                                )}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area (only show if not in Game mode) */}
            {gameMode === 'none' && (
                <div className="mt-4 bg-white/90 backdrop-blur-xl p-2 sm:p-3 rounded-4xl sm:rounded-3xl shadow-xl border border-white/50 flex flex-col gap-2 transition-all focus-within:ring-4 focus-within:ring-brand-primary/10">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 sm:p-3 text-slate-400 hover:text-brand-primary hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                        >
                            <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
                            className="hidden"
                        />

                        <div className="flex-1 flex flex-col min-w-0">
                            {selectedImage && (
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-2 group animate-in zoom-in">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-md" />
                                    <button
                                        onClick={() => setSelectedImage(null)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 active:scale-90 transition-all font-bold"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={`Talk to ${userProfile?.budName || personality.name}...`}
                                disabled={isTyping}
                                className="bg-transparent border-none outline-none text-base sm:text-lg text-slate-700 placeholder:text-slate-300 py-2 sm:py-3 w-full font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2">
                            {inputText.trim() || selectedImage ? (
                                <button
                                    onClick={handleSend}
                                    disabled={isTyping}
                                    className="p-2.5 sm:p-4 bg-brand-primary text-white rounded-xl sm:rounded-2xl hover:bg-violet-600 transition-all active:scale-95 shadow-lg shadow-brand-primary/25 disabled:opacity-50"
                                >
                                    {isTyping ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Send className="w-5 h-5 sm:w-6 sm:h-6" />}
                                </button>
                            ) : (
                                <button
                                    onClick={isListening ? () => stopListening({ transcribeOnStop: true }) : startListening}
                                    disabled={isTyping}
                                    className={clsx(
                                        "p-2.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all active:scale-95 flex items-center justify-center",
                                        isListening ? "bg-red-500 text-white animate-pulse" : "bg-slate-50 text-slate-400 hover:text-brand-primary hover:bg-slate-100"
                                    )}
                                >
                                    <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Custom Personality Modal */}
            {isCustomizing && (
                <CustomizePersonalityModal
                    onClose={() => setIsCustomizing(false)}
                    onSave={handleSaveCustomPersonality}
                    initialData={personality.id === 'custom' ? personality : undefined}
                />
            )}

            {/* Call Interface */}
            {isCallActive && (
                <CallInterface
                    personality={personality}
                    isListening={isListening}
                    isSpeaking={isSpeaking}
                    isTyping={isTyping}
                    currentExpression={currentExpression}
                    status={status}
                    volume={volume}
                    onStopListeningAction={() => stopListening({ transcribeOnStop: true })}
                    onHangUpAction={endCall}
                    onStartListeningAction={startListening}
                />
            )}
        </div>
    );
}
