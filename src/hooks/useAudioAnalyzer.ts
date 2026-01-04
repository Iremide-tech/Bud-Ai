"use client";

import { useState, useEffect, useRef } from 'react';

export function useAudioAnalyzer(stream: MediaStream | null) {
    const [volume, setVolume] = useState(0);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        if (!stream) {
            setVolume(0);
            return;
        }

        // Initialize Audio Context
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        analyzerRef.current = analyzer;

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateVolume = () => {
            if (!analyzerRef.current) return;

            analyzerRef.current.getByteFrequencyData(dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;

            // Normalize to 0-100 (approximately)
            setVolume(Math.min(100, (average / 128) * 100));

            animationRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, [stream]);

    return volume;
}
