
import React, { useState } from 'react';
import { getAI, fileToBase64, improvePrompt } from '../../services/gemini';

interface ImageLabProps {
  onSelectKey: () => void;
  hasKey: boolean;
}

const ImageLab: React.FC<ImageLabProps> = ({ onSelectKey, hasKey }) => {
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);

  const handleImprove = async () => {
    if (!prompt.trim() || isImproving) return;
    setIsImproving(true);
    const improved = await improvePrompt(prompt);
    setPrompt(improved);
    setIsImproving(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceImage(file);
      setSourcePreview(URL.createObjectURL(file));
    }
  };

  const handleAction = async () => {
    if (!prompt.trim() || isLoading) return;
    
    setIsLoading(true);
    setGeneratedImageUrl(null);

    try {
      const ai = getAI();
      if (mode === 'generate') {
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: imageSize as any
            }
          }
        });

        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setGeneratedImageUrl(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      } else {
        if (!sourceImage) {
          alert("Please upload a source image for editing.");
          return;
        }
        const base64 = await fileToBase64(sourceImage);
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: base64, mimeType: sourceImage.type } },
              { text: prompt }
            ]
          }
        });

        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setGeneratedImageUrl(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Make sure you have selected an API key for generation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {!hasKey && mode === 'generate' && (
        <div className="bg-indigo-900/30 border border-indigo-500/50 p-4 rounded-xl flex items-center justify-between">
          <p className="text-indigo-200">Gemini 3 Pro Image requires a specific API key selection.</p>
          <button onClick={onSelectKey} className="bg-indigo-600 px-4 py-2 rounded-lg font-bold">Select Key</button>
        </div>
      )}

      <div className="flex gap-1 bg-slate-800 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setMode('generate')}
          className={`px-6 py-2 rounded-xl transition-all ${mode === 'generate' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Generate New
        </button>
        <button
          onClick={() => setMode('edit')}
          className={`px-6 py-2 rounded-xl transition-all ${mode === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          Edit Existing
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {mode === 'edit' && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase">Source Image</label>
              <div className="relative group aspect-square bg-slate-900 rounded-3xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden">
                {sourcePreview ? (
                  <img src={sourcePreview} className="w-full h-full object-cover" alt="Source" />
                ) : (
                  <div className="text-center p-6">
                    <span className="text-4xl mb-4 block">📸</span>
                    <p className="text-slate-500">Click to upload image to edit</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          )}

          <div className="space-y-2 relative">
            <label className="text-sm font-semibold text-slate-400 uppercase">
              {mode === 'generate' ? 'Image Prompt' : 'Editing Instructions'}
            </label>
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'generate' ? "A futuristic city under a neon sky..." : "Add a retro filter and remove the person..."}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 h-32 focus:ring-2 focus:ring-indigo-500 outline-none resize-none pr-12"
              />
              <button
                onClick={handleImprove}
                disabled={isImproving || !prompt.trim()}
                className={`absolute right-3 bottom-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-slate-800/80 backdrop-blur-sm border border-slate-700 ${isImproving ? 'animate-spin opacity-50' : 'hover:scale-110 text-indigo-400 hover:bg-slate-700'}`}
                title="Magic Polish"
              >
                ✨
              </button>
            </div>
          </div>

          {mode === 'generate' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400 uppercase">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {["1:1", "3:4", "4:3", "9:16", "16:9"].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400 uppercase">Resolution</label>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {["1K", "2K", "4K"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleAction}
            disabled={isLoading || !prompt.trim() || (mode === 'edit' && !sourceImage)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-2xl font-bold text-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><span className="animate-spin text-2xl">⏳</span> Processing...</>
            ) : mode === 'generate' ? 'Generate Image' : 'Apply Edits'}
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-400 uppercase">Result</label>
          <div className="aspect-square bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center overflow-hidden shadow-2xl">
            {generatedImageUrl ? (
              <img src={generatedImageUrl} className="w-full h-full object-contain" alt="Generated" />
            ) : (
              <div className="text-slate-600 text-center">
                <div className="text-6xl mb-4">✨</div>
                <p>Generated image will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLab;
