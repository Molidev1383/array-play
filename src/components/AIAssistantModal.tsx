import React, { useState } from 'react';
import { ArrayConfig } from '../types';
import { Bot, Send, Sparkles, X, Loader2, MessageSquare } from 'lucide-react';

interface AIAssistantModalProps {
  config: ArrayConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ config, isOpen, onClose }) => {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your AI Antenna Array Consultant. Feel free to ask questions regarding Half-Power Beamwidth (HPBW), grating lobe elimination, Dolph-Chebyshev synthesis, or pattern multiplication theory.',
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!prompt.trim() || loading) return;

    const userText = prompt;
    setPrompt('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          arrayConfig: config,
        }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.text }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: `Error: ${data.error || 'No response received.'}` }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { sender: 'ai', text: `Connection error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    setPrompt(q);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-slate-100 font-bold text-sm sm:text-base">Antenna AI Consultant</h3>
              <p className="text-[10px] text-slate-400">Powered by electromagnetic theory and array synthesis equations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Question Chips */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <button
            onClick={() => handleQuickQuestion('How do I suppress grating lobes in this array?')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full shrink-0 border border-slate-700"
          >
            Suppress Grating Lobes?
          </button>
          <button
            onClick={() => handleQuickQuestion('What is the difference between Dolph-Chebyshev and Binomial arrays?')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-full shrink-0 border border-slate-700"
          >
            Compare Dolph-Chebyshev vs Binomial
          </button>
          <button
            onClick={() => handleQuickQuestion('How is the pattern multiplication theorem applied in this simulation?')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full shrink-0 border border-slate-700"
          >
            Explain Pattern Multiplication
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 text-xs sm:text-sm">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-3 rounded-2xl max-w-[82%] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Analyzing antenna array configuration...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question about antenna arrays, formulas, or synthesis..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !prompt.trim()}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition shadow"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
