
import React, { useState } from 'react';
import { getAI, improvePrompt } from '../../services/gemini';

const SearchLab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  const handleImprove = async () => {
    if (!query.trim() || isImproving) return;
    setIsImproving(true);
    const improved = await improvePrompt(query);
    setQuery(improved);
    setIsImproving(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResult(null);
    setSources([]);

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query,
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

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700 shadow-xl">
        <h2 className="text-2xl font-bold mb-4">Google Search Grounding</h2>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about recent events, weather, or news..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleImprove}
              disabled={isImproving || !query.trim()}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isImproving ? 'animate-spin opacity-50' : 'hover:bg-slate-800 text-slate-400 hover:text-blue-400'}`}
              title="Optimize Query"
            >
              ✨
            </button>
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div className="lg:col-span-2 bg-slate-800/30 rounded-3xl p-8 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Grounded Answer</h3>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
              {result}
            </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 h-fit">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Sources</h3>
            <div className="space-y-3">
              {sources.length > 0 ? sources.map((s, i) => (
                <a
                  key={i}
                  href={s.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  <div className="font-medium text-blue-400 text-sm truncate">{s.title || 'Link'}</div>
                  <div className="text-xs text-slate-500 truncate mt-1">{s.uri}</div>
                </a>
              )) : <p className="text-slate-500 text-sm">No direct links returned.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchLab;
