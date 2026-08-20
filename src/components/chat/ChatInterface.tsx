"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Image as ImageIcon, Loader2, Sparkles, BookOpen, Coffee, BrainCircuit, Wand2, X, Phone, Globe } from 'lucide-react';
import clsx from 'clsx';
import { AIService, Message, Personality, PRESETS } from '@/lib/ai-service';
import { elevenLabsTTS, transcribeAudio } from '@/app/actions';
import { QuizCard } from '@/components/gamification/QuizCard';
import { StoryBuilder } from '@/components/gamification/StoryBuilder';
import { CustomizePersonalityModal } from './CustomizePersonalityModal';
import { Expression } from './Avatar';
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
            text: `Hi ${userProfile?.username || 'there'}. I'm ${userProfile?.budName || 'Bud'}. How can I help?`,
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

    useEffect(() => { messagesRef.current = messages; }, [messages]);
    useEffect(() => { audioStreamRef.current = audioStream; }, [audioStream]);

    const stopActiveAudioStream = (stream?: MediaStream | null) => {
        const streamToStop = stream ?? audioStreamRef.current;
        if (streamToStop) streamToStop.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
        setAudioStream(null);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages, isTyping, gameMode]);

    useEffect(() => {
        const saved = localStorage.getItem('bud_custom_personality');
        if (saved) {
            try {
                const p = JSON.parse(saved);
                setPersonality(p);
                AIService.setPersonality(p);
            } catch (e) {
                console.error('Failed to load saved personality', e);
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
                audio.onerror = () => fallbackSpeak(text);
                const playPromise = audio.play();
                if (playPromise !== undefined) playPromise.catch(() => fallbackSpeak(text));
            } else {
                fallbackSpeak(text);
            }
        } catch {
            fallbackSpeak(text);
        }
    };

    const fallbackSpeak = (text: string) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
        } else {
            setIsSpeaking(false);
        }
    };

    const clearVoiceTimers = () => {
        if (listenTimeoutRef.current) { clearTimeout(listenTimeoutRef.current); listenTimeoutRef.current = null; }
        if (fallbackStopTimeoutRef.current) { clearTimeout(fallbackStopTimeoutRef.current); fallbackStopTimeoutRef.current = null; }
    };

    const stopListening = (options?: { clearStatus?: boolean; transcribeOnStop?: boolean }) => {
        const shouldClearStatus = options?.clearStatus ?? false;
        shouldTranscribeRecorderRef.current = options?.transcribeOnStop ?? true;
        clearVoiceTimers();
        ignoreRecognitionEndRef.current = true;
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* noop */ }
            recognitionRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
        stopActiveAudioStream();
        setIsListening(false);
        if (shouldClearStatus) setStatus('');
    };

    const startFallbackRecording = async () => {
        if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            setStatus('Voice input unsupported');
            setIsListening(false);
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);
            const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/mpeg'];
            const supportedType = types.find(type => MediaRecorder.isTypeSupported(type));
            const mediaRecorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            shouldTranscribeRecorderRef.current = true;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorder.onstop = async () => {
                clearVoiceTimers();
                setIsListening(false);
                stopActiveAudioStream(stream);
                const shouldTranscribe = shouldTranscribeRecorderRef.current;
                shouldTranscribeRecorderRef.current = true;
                if (mediaRecorderRef.current === mediaRecorder) mediaRecorderRef.current = null;
                if (!shouldTranscribe) return;
                const audioBlob = new Blob(audioChunksRef.current, { type: supportedType || undefined });
                if (audioBlob.size < 500) { setStatus('No speech detected'); return; }
                setStatus('Transcribing...');
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const base64Audio = (reader.result as string).split(',')[1];
                        const extension = supportedType ? (supportedType.split('/')[1]?.split(';')[0] || 'webm') : 'webm';
                        const { text, error } = await transcribeAudio(base64Audio, extension);
                        if (error) { setStatus('Transcription Error'); return; }
                        if (text && text.trim().length > 0) { setInputText(text); handleVoiceSend(text); setStatus(''); return; }
                        setStatus('No speech detected');
                    } catch { setStatus('Transcription Error'); }
                };
                reader.readAsDataURL(audioBlob);
            };
            setIsListening(true);
            setStatus('Recording...');
            mediaRecorder.start();
            fallbackStopTimeoutRef.current = setTimeout(() => {
                if (mediaRecorder.state === 'recording') stopListening({ transcribeOnStop: true });
            }, 10000);
        } catch {
            setStatus('Mic access denied');
            setIsListening(false);
        }
    };

    const startListening = async () => {
        if (isTyping) return;
        stopListening({ transcribeOnStop: false });
        const SpeechRecognitionCtor = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
        if (!SpeechRecognitionCtor) { startFallbackRecording(); return; }
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
                } catch { /* visualizer optional */ }
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
                if (!transcript.trim()) { setStatus('No speech detected'); stopListening({ transcribeOnStop: false }); return; }
                setInputText(transcript);
                stopListening({ transcribeOnStop: false });
                handleVoiceSend(transcript);
            };
            recognition.onerror = (event) => {
                clearVoiceTimers();
                const err = event?.error || event?.message || 'unknown';
                if (err === 'no-speech') { setStatus('No speech detected'); stopListening({ transcribeOnStop: false }); return; }
                if (err === 'not-allowed' || err === 'permission-denied') { setStatus('Mic access denied'); stopListening({ transcribeOnStop: false }); return; }
                stopListening({ transcribeOnStop: false });
                startFallbackRecording();
            };
            recognition.onend = () => {
                clearVoiceTimers();
                if (recognitionRef.current === recognition) recognitionRef.current = null;
                const shouldIgnore = ignoreRecognitionEndRef.current;
                ignoreRecognitionEndRef.current = false;
                setIsListening(false);
                stopActiveAudioStream();
                if (shouldIgnore) return;
                setStatus(prev => (prev.includes('Error') || prev.includes('detected') || prev.includes('Mic') || prev.includes('Transcrib')) ? prev : '');
            };
            recognition.start();
        } catch {
            startFallbackRecording();
        }
    };

    const handleVoiceSend = async (text: string) => {
        if (!text.trim() || isTyping) return;
        const searchIntent = getWebSearchIntent(text);
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text, timestamp: new Date() }]);
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
            setCurrentExpression((response.mood as Expression) || 'idle');
            setStatus('Speaking...');
            await speakResponse(aiResponse.text);
            setStatus('');
        } catch (error) {
            console.error('AI Error', error);
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
        setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userText, image: currentImage || undefined, timestamp: new Date() }]);
        setInputText('');
        setSelectedImage(null);
        setIsTyping(true);
        setCurrentExpression('thinking');
        setIsSearchingWeb(searchIntent.shouldSearch);
        try {
            const response = await AIService.sendMessage(userText, messagesRef.current, userProfile, currentImage || undefined);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: response.text,
                image: response.image,
                webVerified: !!response.usedWebSearch,
                timestamp: new Date()
            }]);
            setCurrentExpression((response.mood as Expression) || 'idle');
        } catch (error) {
            console.error('AI Error', error);
        } finally {
            setIsTyping(false);
            setIsSearchingWeb(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setSelectedImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const changePersonality = (p: Personality) => {
        AIService.setPersonality(p);
        setPersonality(p);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            sender: 'ai',
            text: p.id === 'buddy' ? 'Switched to Buddy mode.' : p.id === 'tutor' ? 'Switched to Tutor mode.' : p.id === 'sage' ? 'Switched to Sage mode.' : `Switched to ${p.name}.`,
            timestamp: new Date()
        }]);
    };

    const handleSaveCustomPersonality = (p: Personality) => {
        localStorage.setItem('bud_custom_personality', JSON.stringify(p));
        changePersonality(p);
    };

    const startCall = () => { setIsCallActive(true); setStatus(''); };
    const endCall = () => { setIsCallActive(false); stopListening({ clearStatus: true, transcribeOnStop: false }); };

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="shrink-0 border-b border-slate-200 px-4 py-3">
                <div className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto no-scrollbar">
                    {[
                        { key: 'buddy', label: 'Buddy', icon: Sparkles, onClick: () => changePersonality(PRESETS.buddy), active: personality.id === 'buddy' },
                        { key: 'tutor', label: 'Tutor', icon: BookOpen, onClick: () => changePersonality(PRESETS.tutor), active: personality.id === 'tutor' },
                        { key: 'sage', label: 'Sage', icon: Coffee, onClick: () => changePersonality(PRESETS.sage), active: personality.id === 'sage' },
                        { key: 'custom', label: personality.id === 'custom' ? personality.name : 'Custom', icon: Wand2, onClick: () => setIsCustomizing(true), active: personality.id === 'custom' },
                    ].map((item) => (
                        <button
                            key={item.key}
                            onClick={item.onClick}
                            className={clsx(
                                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
                                item.active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            )}
                        >
                            <item.icon className="h-3.5 w-3.5" />
                            {item.label}
                        </button>
                    ))}
                    <div className="mx-1 h-4 w-px bg-slate-200" />
                    <button onClick={() => setGameMode(gameMode === 'quiz' ? 'none' : 'quiz')} className={clsx('rounded-full border p-1.5', gameMode === 'quiz' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500')}><BrainCircuit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setGameMode(gameMode === 'story' ? 'none' : 'story')} className={clsx('rounded-full border p-1.5', gameMode === 'story' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-500')}><BookOpen className="h-3.5 w-3.5" /></button>
                    <button onClick={startCall} className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Phone className="h-3.5 w-3.5" /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-4 py-6">
                    {gameMode === 'quiz' ? (
                        <QuizCard onClose={() => setGameMode('none')} />
                    ) : gameMode === 'story' ? (
                        <StoryBuilder onClose={() => setGameMode('none')} />
                    ) : (
                        <div className="space-y-6">
                            {messages.map((msg) => (
                                <div key={msg.id} className={clsx('flex', msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                                    <div className={clsx('max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed', msg.sender === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800')}>
                                        {msg.sender === 'ai' && msg.webVerified && (
                                            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                                <Globe className="h-3 w-3" /> Web
                                            </div>
                                        )}
                                        {msg.image && (
                                            <div className="mb-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={msg.image} alt="Attachment" className="max-h-64 w-full object-contain" />
                                            </div>
                                        )}
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {isSearchingWeb ? 'Searching...' : 'Thinking...'}
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {gameMode === 'none' && (
                <div className="border-t border-slate-200 bg-white px-4 py-4">
                    <div className="mx-auto max-w-3xl">
                        {selectedImage && (
                            <div className="mb-3 inline-block relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={selectedImage} alt="Preview" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                                <button onClick={() => setSelectedImage(null)} className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1 text-white"><X className="h-3 w-3" /></button>
                            </div>
                        )}
                        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-slate-400">
                            <button onClick={() => fileInputRef.current?.click()} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                                <ImageIcon className="h-5 w-5" />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={`Message ${userProfile?.budName || personality.name}`}
                                disabled={isTyping}
                                rows={1}
                                className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-slate-800 outline-none placeholder:text-slate-400"
                            />
                            {inputText.trim() || selectedImage ? (
                                <button onClick={handleSend} disabled={isTyping} className="rounded-xl bg-slate-900 p-2.5 text-white hover:bg-slate-800 disabled:opacity-50">
                                    {isTyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </button>
                            ) : (
                                <button
                                    onClick={isListening ? () => stopListening({ transcribeOnStop: true }) : startListening}
                                    disabled={isTyping}
                                    className={clsx('rounded-xl p-2.5', isListening ? 'bg-red-500 text-white' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700')}
                                >
                                    <Mic className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        {status && <p className="mt-2 text-center text-xs text-slate-400">{status}</p>}
                    </div>
                </div>
            )}

            {isCustomizing && (
                <CustomizePersonalityModal
                    onClose={() => setIsCustomizing(false)}
                    onSave={handleSaveCustomPersonality}
                    initialData={personality.id === 'custom' ? personality : undefined}
                />
            )}

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
