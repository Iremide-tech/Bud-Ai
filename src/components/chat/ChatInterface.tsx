"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Smile, Image as ImageIcon, Loader2, Sparkles, BookOpen, Coffee, BrainCircuit, Wand2, X, Phone, PhoneOff } from 'lucide-react';
import clsx from 'clsx';
import { AIService, Message, Personality, PRESETS } from '@/lib/ai-service';
import { generateQuiz, generateStorySegment, generatePersonalityIdea, elevenLabsTTS, transcribeAudio } from '@/app/actions';
import { QuizCard } from '@/components/gamification/QuizCard';
import { StoryBuilder } from '@/components/gamification/StoryBuilder';
import { CustomizePersonalityModal } from './CustomizePersonalityModal';
import { Avatar, Expression } from './Avatar';
import { CallInterface } from './CallInterface';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';

declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'ai',
            text: "Hi there! I'm Bud-AI. I'm so happy to see you! 🌟 What shall we play or talk about today?",
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
    const volume = useAudioAnalyzer(audioStream);

    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<Message[]>(messages);

    // Sync messagesRef to avoid stale closures
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

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

    const startListening = async () => {
        // 1. Cleanup old streams and contexts
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            setAudioStream(null);
        }

        if (typeof window !== 'undefined') {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (AudioContextClass) {
                const tempCtx = new AudioContextClass();
                if (tempCtx.state === 'suspended') {
                    tempCtx.resume().then(() => tempCtx.close());
                } else {
                    tempCtx.close();
                }
            }
        }

        const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

        // 2. Start Speech Recognition (Native)
        if (SpeechRecognition) {
            try {
                const recognition = new SpeechRecognition();
                recognitionRef.current = recognition;

                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US';

                let listenTimeout: NodeJS.Timeout;

                recognition.onstart = async () => {
                    setIsListening(true);
                    setStatus('Listening...');
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        setAudioStream(stream);
                    } catch (e) {
                        console.warn("Visualizer mic access deferred", e);
                    }

                    listenTimeout = setTimeout(() => {
                        if (isListening) {
                            recognition.abort();
                            setStatus('No speech detected');
                            setIsListening(false);
                        }
                    }, 10000);
                };

                recognition.onresult = (event: any) => {
                    clearTimeout(listenTimeout);
                    const transcript = event.results[0][0].transcript;
                    setInputText(transcript);
                    setIsListening(false);
                    handleVoiceSend(transcript);
                };

                recognition.onerror = (event: any) => {
                    clearTimeout(listenTimeout);
                    console.error('Speech recognition error', event.error);
                    setIsListening(false);
                    const errorMap: Record<string, string> = {
                        'no-speech': 'No speech detected',
                        'audio-capture': 'Mic not found',
                        'not-allowed': 'Mic access denied',
                        'network': 'Network error',
                        'aborted': 'Recording stopped'
                    };
                    setStatus(errorMap[event.error] || 'Mic Error');
                };

                recognition.onend = () => {
                    clearTimeout(listenTimeout);
                    setIsListening(false);
                    setAudioStream(null);
                    setStatus(prev => prev.includes('Error') || prev.includes('detected') ? prev : '');
                };

                recognition.start();
            } catch (err) {
                console.error("Speech error", err);
                startFallbackRecording();
            }
        } else {
            // 3. Fallback to Whisper
            startFallbackRecording();
        }
    };

    const startFallbackRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (audioBlob.size < 1000) {
                    setStatus('No speech detected');
                    setIsListening(false);
                    return;
                }

                setStatus('Transcribing...');
                setIsListening(false);

                // Convert blob to base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    const { text, error } = await transcribeAudio(base64Audio);

                    if (error) {
                        setStatus('Transcription Error');
                        console.error(error);
                    } else if (text) {
                        setInputText(text);
                        handleVoiceSend(text);
                        setStatus('');
                    } else {
                        setStatus('No speech detected');
                    }
                };
            };

            setIsListening(true);
            setStatus('Recording...');
            mediaRecorder.start();

            // Auto-stop after 8 seconds (children might not know when to stop)
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    stopFallbackRecording();
                }
            }, 8000);

        } catch (err) {
            console.error("Fallback Mic Error", err);
            setStatus('Mic Access Denied');
        }
    };

    const stopFallbackRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            audioStream?.getTracks().forEach(track => track.stop());
            setAudioStream(null);
        }
    };

    const handleVoiceSend = async (text: string) => {
        if (!text.trim() || isTyping) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: text,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setIsTyping(true);
        setCurrentExpression('thinking');
        setStatus('Thinking...');

        try {
            const response = await AIService.sendMessage(text, messagesRef.current);
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: response.text,
                image: response.image,
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
        }
    };

    const handleSend = async () => {
        if ((!inputText.trim() && !selectedImage) || isTyping) return;

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

        try {
            const response = await AIService.sendMessage(userText, messages, currentImage || undefined);
            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: response.text,
                image: response.image,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
            if (response.mood) setCurrentExpression(response.mood as Expression);
            else setCurrentExpression('idle');
        } catch (error) {
            console.error("AI Error", error);
        } finally {
            setIsTyping(false);
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

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Personality & Game Header */}
            <div className="flex flex-nowrap md:flex-wrap items-center gap-2 mb-4 p-2 bg-white/50 backdrop-blur-sm rounded-2xl w-full md:w-fit mx-auto shadow-sm overflow-x-auto no-scrollbar pb-3 md:pb-2">
                <button
                    onClick={() => changePersonality(PRESETS.buddy)}
                    className={clsx("p-2 rounded-xl flex items-center gap-2 transition-all", personality.id === 'buddy' ? "bg-brand-primary text-white shadow-md glow" : "hover:bg-white text-slate-500")}
                >
                    <Sparkles className="w-4 h-4" /> <span className="text-sm font-medium">Buddy</span>
                </button>
                <button
                    onClick={() => changePersonality(PRESETS.tutor)}
                    className={clsx("p-2 rounded-xl flex items-center gap-2 transition-all", personality.id === 'tutor' ? "bg-blue-500 text-white shadow-md glow" : "hover:bg-white text-slate-500")}
                >
                    <BookOpen className="w-4 h-4" /> <span className="text-sm font-medium">Tutor</span>
                </button>
                <button
                    onClick={() => changePersonality(PRESETS.sage)}
                    className={clsx("p-2 rounded-xl flex items-center gap-2 transition-all", personality.id === 'sage' ? "bg-emerald-500 text-white shadow-md glow" : "hover:bg-white text-slate-500")}
                >
                    <Coffee className="w-4 h-4" /> <span className="text-sm font-medium">Sage</span>
                </button>
                <button
                    onClick={() => setIsCustomizing(true)}
                    className={clsx("p-2 rounded-xl flex items-center gap-2 transition-all", personality.id === 'custom' ? "bg-fuchsia-600 text-white shadow-md glow" : "hover:bg-white text-slate-500")}
                >
                    <Wand2 className="w-4 h-4" /> <span className="text-sm font-medium">{personality.id === 'custom' ? personality.name : 'Custom'}</span>
                </button>
                <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>

                <button
                    onClick={() => setGameMode(gameMode === 'quiz' ? 'none' : 'quiz')}
                    className={clsx("p-2 rounded-xl flex items-center gap-2 transition-all", gameMode === 'quiz' ? "bg-amber-500 text-white shadow-md" : "hover:bg-white text-slate-500")}
                >
                    <BrainCircuit className="w-4 h-4" /> <span className="text-sm font-medium">Quiz</span>
                </button>
                <button
                    onClick={() => setGameMode(gameMode === 'story' ? 'none' : 'story')}
                    className={clsx("p-2 rounded-xl flex items-center gap-2 transition-all", gameMode === 'story' ? "bg-fuchsia-500 text-white shadow-md" : "hover:bg-white text-slate-500")}
                >
                    <BookOpen className="w-4 h-4" /> <span className="text-sm font-medium">Story</span>
                </button>
                <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
                <button
                    onClick={() => setIsCallActive(true)}
                    className="p-2 rounded-xl flex items-center gap-2 transition-all bg-green-500 text-white shadow-md hover:bg-green-600 glow"
                >
                    <Phone className="w-4 h-4" /> <span className="text-sm font-medium">Call</span>
                </button>
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
                                    {msg.image && (
                                        <div className="mb-2 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
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
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area (only show if not in Game mode) */}
            {gameMode === 'none' && (
                <div className="mt-4 bg-white p-2 rounded-3xl shadow-lg border border-slate-100 flex items-center gap-2">
                    <button className="p-3 text-slate-400 hover:text-brand-secondary hover:bg-slate-50 rounded-full transition-colors">
                        <Smile className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-slate-400 hover:text-brand-secondary hover:bg-slate-50 rounded-full transition-colors"
                    >
                        <ImageIcon className="w-6 h-6" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                    />

                    <div className="flex-1 flex flex-col gap-2">
                        {selectedImage && (
                            <div className="relative w-20 h-20 ml-2 mt-2 group">
                                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover rounded-xl border border-slate-200" />
                                <button
                                    onClick={() => setSelectedImage(null)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
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
                            placeholder={`Talk to ${personality.name}...`}
                            disabled={isTyping}
                            className="bg-transparent border-none outline-none text-lg text-slate-700 placeholder:text-slate-300 px-2 py-3 w-full"
                        />
                    </div>


                    {inputText.trim() || selectedImage ? (
                        <button
                            onClick={handleSend}
                            disabled={isTyping}
                            className="p-3 bg-brand-primary text-white rounded-full hover:bg-violet-600 transition-transform active:scale-95 shadow-md shadow-violet-200 disabled:opacity-50 disabled:scale-100"
                        >
                            {isTyping ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                        </button>
                    ) : (
                        <button
                            onClick={isListening && mediaRecorderRef.current ? stopFallbackRecording : startListening}
                            disabled={(isListening && !mediaRecorderRef.current) || isTyping}
                            className={clsx(
                                "p-3 rounded-full transition-all",
                                isListening ? "bg-red-500 text-white animate-pulse" : "text-slate-400 hover:text-brand-primary hover:bg-slate-50"
                            )}
                        >
                            <Mic className="w-6 h-6" />
                        </button>
                    )}
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
                    onStopListeningAction={stopFallbackRecording}
                    isFallback={!!mediaRecorderRef.current}
                    onHangUpAction={() => {
                        setIsCallActive(false);
                        setStatus('');
                        if (audioStream) {
                            audioStream.getTracks().forEach(track => track.stop());
                            setAudioStream(null);
                        }
                    }}
                    onStartListeningAction={startListening}
                />
            )}
        </div>
    );
}
