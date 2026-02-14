
import React, { useState, useRef, useEffect } from 'react';
import { getAI, improvePrompt } from '../../services/gemini';
import { GenerateContentResponse } from '@google/genai';

interface ChatLabProps {
  userName: string;
  useFlash: boolean;
  // Added onSelectKey to fix type error in App.tsx line 78
  onSelectKey: () => void;
}

const ChatLab: React.FC<ChatLabProps> = ({ userName, useFlash, onSelectKey }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    chatRef.current = null;
  }, [userName, useFlash]);

  const initChat = () => {
    const ai = getAI();
    chatRef.current = ai.chats.create({
      model: useFlash ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview',
      config: {
        systemInstruction: `You are an advanced AI assistant. The user's name is ${userName}. Address them occasionally by name. You are currently operating in ${useFlash ? 'Flash' : 'Pro'} mode.`,
      }
    });
  };

  const handleImprove = async () => {
    if (!input.trim() || isImproving) return;
    setIsImproving(true);
    const improved = await improvePrompt(input);
    setInput(improved);
    setIsImproving(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!chatRef.current) initChat();

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const responseStream = await chatRef.current.sendMessageStream({ message: userMessage });
      let fullResponse = '';
      
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        fullResponse += c.text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = fullResponse;
          return updated;
        });
      }
    } catch (err: any) {
      console.error(err);
      // Handle 403 errors and trigger key selection
      if (err?.message?.includes('403') || err?.message?.toLowerCase().includes('permission')) {
          setMessages(prev => [...prev, { role: 'ai', content: "It looks like your current API key doesn't have permission for this model. Please select a premium API key." }]);
          onSelectKey();
      } else {
          setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I encountered an error. Please try again." }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 md:p-8 animate-fadeIn">
      <div className="flex-1 bg-slate-800/30 rounded-3xl border border-slate-800 overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <div 
                className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-2xl"
                style={{ color: 'var(--primary)' }}
              >🤖</div>
              <p className="text-lg">Greetings, {userName}. How can I assist you today?</p>
              <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">
                Running in {useFlash ? 'Fast' : 'High Quality'} Mode
              </span>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] p-4 rounded-2xl ${
                  m.role === 'user' 
                    ? 'text-white rounded-tr-none shadow-lg' 
                    : 'bg-slate-700 text-slate-100 rounded-tl-none'
                }`}
                style={m.role === 'user' ? { 
                  backgroundColor: 'var(--primary)',
                  boxShadow: '0 4px 12px var(--primary-glow)'
                } : {}}
              >
                {m.content || (isLoading && i === messages.length - 1 ? 'Thinking...' : '')}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 transition-all outline-none"
                style={{ '--tw-ring-color': 'var(--primary)' } as any}
              />
              <button
                type="button"
                onClick={handleImprove}
                disabled={isImproving || !input.trim()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isImproving ? 'animate-spin opacity-50' : 'hover:bg-slate-800 text-slate-400 hover:text-indigo-400'}`}
                title="Improve Prompt"
              >
                ✨
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="hover:brightness-110 disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition-all text-white shadow-lg"
              style={{ 
                backgroundColor: 'var(--primary)',
                boxShadow: '0 4px 12px var(--primary-glow)'
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatLab;
