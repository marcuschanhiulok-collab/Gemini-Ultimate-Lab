
import React, { useState } from 'react';
import { getAI, improvePrompt } from '../../services/gemini';

const MapsLab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [places, setPlaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  const handleImprove = async () => {
    if (!query.trim() || isImproving) return;
    setIsImproving(true);
    const improved = await improvePrompt(query);
    setQuery(improved);
    setIsImproving(false);
  };

  const handleDiscovery = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResult(null);
    setPlaces([]);

    try {
      const ai = getAI();
      
      let location = null;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej)
        );
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) { console.warn("Location permission denied."); }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: location ? {
            retrievalConfig: { latLng: location }
          } : undefined
        },
      });

      setResult(response.text || "No response text.");
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        setPlaces(chunks.filter(c => c.maps).map(c => c.maps));
      }
    } catch (err) {
      console.error(err);
      setResult("Error during discovery.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700 shadow-xl">
        <h2 className="text-2xl font-bold mb-4">Places & Maps Grounding</h2>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try: 'Best pizza near me' or 'Top rated parks in San Francisco'"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-green-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleDiscovery()}
            />
            <button
              onClick={handleImprove}
              disabled={isImproving || !query.trim()}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isImproving ? 'animate-spin opacity-50' : 'hover:bg-slate-800 text-slate-400 hover:text-green-400'}`}
              title="Optimize Search"
            >
              ✨
            </button>
          </div>
          <button
            onClick={handleDiscovery}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {isLoading ? 'Exploring...' : 'Explore'}
          </button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800/30 rounded-3xl p-8 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Travel Guide</h3>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
              {result}
            </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 h-fit">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Locations Found</h3>
            <div className="space-y-4">
              {places.length > 0 ? places.map((p, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <div className="font-bold text-green-400 mb-1">{p.title}</div>
                  <a
                    href={p.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    View on Google Maps ↗
                  </a>
                  {p.placeAnswerSources?.reviewSnippets && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                       <p className="text-xs italic text-slate-400">"{p.placeAnswerSources.reviewSnippets[0].text}"</p>
                    </div>
                  )}
                </div>
              )) : <p className="text-slate-500 text-sm">No specific location links found.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapsLab;
