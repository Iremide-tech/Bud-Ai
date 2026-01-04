import React, { useState } from 'react';
import { X, Save, Wand2, Sparkles, Loader2 } from 'lucide-react';
import { Personality } from '@/lib/ai-service';
import { generatePersonalityIdea } from '@/app/actions';

interface CustomizePersonalityModalProps {
    onSave: (p: Personality) => void;
    onClose: () => void;
    initialData?: Personality;
}

export function CustomizePersonalityModal({ onSave, onClose, initialData }: CustomizePersonalityModalProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [systemPrompt, setSystemPrompt] = useState(initialData?.systemPrompt || '');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleMagicCreate = async () => {
        const idea = name || description || "A surprise character";
        setIsGenerating(true);
        try {
            const jsonString = await generatePersonalityIdea(idea);
            const data = JSON.parse(jsonString);
            if (data.error) throw new Error(data.error);

            setName(data.name || '');
            setDescription(data.description || '');
            setSystemPrompt(data.systemPrompt || '');
        } catch (error) {
            console.error(error);
            alert("The magic fuzzed out! Try again?");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        if (!name.trim() || !systemPrompt.trim()) return;

        onSave({
            id: 'custom',
            name,
            description,
            systemPrompt
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-brand-primary">
                        <Wand2 className="w-6 h-6" />
                        <h2 className="text-xl font-bold">Create Personality</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-slate-700">Name or Idea</label>
                            <button
                                onClick={handleMagicCreate}
                                disabled={isGenerating}
                                className="text-xs font-bold text-brand-primary flex items-center gap-1 hover:text-brand-secondary transition-colors disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                AI Magic
                            </button>
                        </div>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Captain Jack or 'A space cat'"
                            className="w-full text-black p-3 rounded-xl border border-slate-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Short Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. A brave pirate"
                            className="w-full p-3 text-black rounded-xl border border-slate-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Instructions (System Prompt)</label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="How should the AI behave? e.g. You are a pirate. End every sentence with 'Arrr!'"
                            className="w-full p-3 text-black rounded-xl border border-slate-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all h-32 resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim() || !systemPrompt.trim()}
                        className="px-5 py-2.5 rounded-xl font-medium bg-brand-primary text-white hover:bg-violet-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" /> Save Personality
                    </button>
                </div>
            </div>
        </div>
    );
}
