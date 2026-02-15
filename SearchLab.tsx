
import React, { useState, useRef, useEffect } from 'react';
import { getAI, improvePrompt } from '../../services/gemini';

const SearchLab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('search-history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const resultsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('search-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (result) {
      resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result]);

  const addToHistory = (q: string) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== q.toLowerCase());
      return [q, ...filtered].slice(0, 15); // Keep last 15
    });
  };

  const removeFromHistory = (e: React.MouseEvent, q: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item !== q));
  };

  const handleImprove = async () => {
    if (!query.trim() || isImproving) return;
    setIsImproving(true);
    const improved = await improvePrompt(query);
    setQuery(improved);
    setIsImproving(false);
  };

  const executeSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setResult(null);
    setSources([]);
    addToHistory(searchQuery);

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: searchQuery,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      setResult(response.text || "No response text.");
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        setSources(groundingChunks.filter(c => c.web).map(c => c.web));
      }
    } catch (err) {
      console.error(err);
      setResult("Error performing search.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => executeSearch(query);

  const runFromHistory = (q: string) => {
    setQuery(q);
    executeSearch(q);
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto">
      {/* Results Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        {!result && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-8 py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="text-6xl">🔍</div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">Search Grounding Lab</p>
              <p className="text-sm max-w-sm text-center leading-relaxed">Ask anything and Gemini will use Google Search to verify facts and provide sources.</p>
            </div>

            {history.length > 0 && (
              <div className="w-full max-w-md animate-fadeIn">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recent Searches</h3>
                  <button 
                    onClick={() => setHistory([])}
                    className="text-[9px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2">
                  {history.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => runFromHistory(item)}
                      className="w-full flex items-center justify-between group p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left shadow-sm"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors">🕒</span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{item}</span>
                      </div>
                      <button
                        onClick={(e) => removeFromHistory(e, item)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-all"
                      >
                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full space-y-4 animate-pulse">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-blue-500 font-bold tracking-widest uppercase text-xs">Consulting the web...</p>
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/30 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Grounded Insights</h3>
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
                {result}
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 h-fit">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Web Citations</h3>
              <div className="space-y-3">
                {sources.length > 0 ? sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-xl bg-white dark:bg-slate-800 hover:border-blue-500/50 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <div className="font-bold text-blue-600 dark:text-blue-400 text-xs truncate">{s.title || 'Link'}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-1">{s.uri}</div>
                  </a>
                )) : <p className="text-slate-400 text-xs text-center py-4 italic">No direct links provided.</p>}
              </div>
            </div>
          </div>
        )}
        <div ref={resultsEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-8 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky bottom-0">
        {result && history.length > 0 && (
          <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[9px] font-black uppercase text-slate-400 shrink-0 mr-2 tracking-widest">Recent:</span>
            {history.slice(0, 5).map((h, i) => (
              <button
                key={i}
                onClick={() => runFromHistory(h)}
                className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 whitespace-nowrap hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-500 transition-all"
              >
                {h}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query the world's knowledge..."
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl pl-5 pr-14 py-4 focus:ring-2 focus:ring-blue-500 dark:text-white outline-none shadow-inner"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleImprove}
              disabled={isImproving || !query.trim()}
              className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isImproving ? 'animate-spin opacity-50' : 'hover:bg-blue-500 hover:text-white text-blue-500'}`}
              title="Optimize Query"
            >
              ✨
            </button>
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-2xl font-black transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 text-sm tracking-tight"
          >
            SEARCH
          </button>
        </div>
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default SearchLab;
