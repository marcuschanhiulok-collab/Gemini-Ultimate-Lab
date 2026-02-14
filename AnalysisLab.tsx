
import React, { useState } from 'react';
import { getAI, fileToBase64, improvePrompt } from '../../services/gemini';

const AnalysisLab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'standard' | 'fast'>('standard');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isImproving, setIsImproving] = useState(false);

  const handleImprove = async () => {
    if (!customPrompt.trim() || isImproving) return;
    setIsImproving(true);
    const improved = await improvePrompt(customPrompt);
    setCustomPrompt(improved);
    setIsImproving(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setAnalysis(null);
    }
  };

  const runAnalysis = async () => {
    if (!file) return;
    setIsLoading(true);
    
    try {
      const ai = getAI();
      const base64 = await fileToBase64(file);
      const isVideo = file.type.startsWith('video');
      
      const model = mode === 'fast' ? 'gemini-flash-lite-latest' : 'gemini-3-pro-preview';
      
      const defaultPrompt = `Please analyze this ${isVideo ? 'video' : 'image'} in detail. ${isVideo ? 'Describe the key actions and themes.' : 'Describe the contents, text, and overall sentiment.'}`;
      const finalPrompt = customPrompt.trim() ? `${customPrompt}\n\n(Context: This is a ${isVideo ? 'video' : 'image'} analysis request)` : defaultPrompt;

      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: file.type } },
            { text: finalPrompt }
          ]
        },
        config: mode === 'standard' ? { thinkingConfig: { thinkingBudget: 4000 } } : undefined
      });

      setAnalysis(response.text || "No insights found.");
    } catch (err) {
      console.error(err);
      setAnalysis("Error analyzing file.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/3 space-y-6">
            <div className="space-y-4">
               <h3 className="text-lg font-bold">Content Input</h3>
               <div className="relative aspect-video md:aspect-square bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden group">
                {preview ? (
                  file?.type.startsWith('video') ? (
                    <video src={preview} className="w-full h-full object-cover" />
                  ) : (
                    <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                  )
                ) : (
                  <div className="text-center p-4">
                    <span className="text-4xl block mb-2">📁</span>
                    <p className="text-xs text-slate-500">Image or Video</p>
                  </div>
                )}
                <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Custom Instructions (Optional)</label>
              <div className="relative">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Extract all text from this..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 pr-10"
                />
                <button
                  onClick={handleImprove}
                  disabled={isImproving || !customPrompt.trim()}
                  className={`absolute right-2 bottom-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-slate-800/50 border border-slate-700 ${isImproving ? 'animate-spin opacity-50' : 'hover:bg-slate-700 text-indigo-400'}`}
                  title="Improve Instructions"
                >
                  ✨
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase">Analysis Depth</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setMode('standard')}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${mode === 'standard' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                >
                  Pro (Deep)
                </button>
                <button 
                  onClick={() => setMode('fast')}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${mode === 'fast' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                >
                  Lite (Fast)
                </button>
              </div>
            </div>

            <button
              onClick={runAnalysis}
              disabled={!file || isLoading}
              className="w-full bg-slate-100 hover:bg-white text-slate-950 py-4 rounded-2xl font-bold disabled:opacity-50 transition-all shadow-lg"
            >
              {isLoading ? "Analyzing..." : "Analyze Content"}
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Intelligence Output</h3>
            <div className="flex-1 bg-slate-900 rounded-3xl p-6 border border-slate-800 min-h-[300px] overflow-y-auto font-mono text-sm leading-relaxed text-indigo-100/80">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-slate-800 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-slate-800 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-slate-800 rounded w-5/6 animate-pulse"></div>
                  <div className="h-4 bg-slate-800 rounded w-2/3 animate-pulse"></div>
                </div>
              ) : analysis || "Upload a file and click analyze to see Gemini's thoughts."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisLab;
