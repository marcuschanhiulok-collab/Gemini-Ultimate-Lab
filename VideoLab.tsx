
import React, { useState } from 'react';
import { getAI, fileToBase64, improvePrompt } from '../../services/gemini';

interface VideoLabProps {
  onSelectKey: () => void;
  hasKey: boolean;
}

const VideoLab: React.FC<VideoLabProps> = ({ onSelectKey, hasKey }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
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

  const handleGenerate = async () => {
    if (!hasKey) {
      onSelectKey();
      return;
    }
    if (!prompt.trim() && !sourceImage) return;

    setIsLoading(true);
    setVideoUrl(null);
    setLoadingStep("Starting video generation...");

    try {
      const ai = getAI();
      const base64Img = sourceImage ? await fileToBase64(sourceImage) : undefined;
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this image beautifully',
        image: base64Img ? {
          imageBytes: base64Img,
          mimeType: sourceImage!.type
        } : undefined,
        config: {
          numberOfVideos: 1,
          resolution,
          aspectRatio
        }
      });

      const messages = [
        "Thinking about the frames...",
        "Rendering scene geometry...",
        "Simulating lighting and physics...",
        "Applying textures and colors...",
        "Finalizing the MP4 output...",
        "Almost there! Quality takes time."
      ];
      let msgIndex = 0;

      while (!operation.done) {
        setLoadingStep(messages[msgIndex % messages.length]);
        msgIndex++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const fetchResp = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await fetchResp.blob();
        setVideoUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error(err);
      alert("Error generating video. Make sure your API key is correct.");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {!hasKey && (
        <div className="bg-orange-900/30 border border-orange-500/50 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-orange-200">API Key Required</h3>
            <p className="text-orange-300/70">Veo 3.1 video generation requires a paid API key from a billing-enabled project.</p>
          </div>
          <button onClick={onSelectKey} className="bg-orange-600 hover:bg-orange-700 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/40">
            Select API Key
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2 relative">
            <label className="text-sm font-semibold text-slate-400 uppercase">Video Prompt</label>
            <div className="relative group">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the scene you want to generate..."
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 h-32 focus:ring-2 focus:ring-orange-500 outline-none resize-none pr-12"
              />
              <button
                onClick={handleImprove}
                disabled={isImproving || !prompt.trim()}
                className={`absolute right-3 bottom-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-slate-800/80 backdrop-blur-sm border border-slate-700 ${isImproving ? 'animate-spin opacity-50' : 'hover:scale-110 text-orange-400 hover:bg-slate-700'}`}
                title="Cinematic Polish"
              >
                ✨
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-400 uppercase">Optional Starting Image</label>
            <div className="relative h-40 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden">
              {sourcePreview ? (
                <img src={sourcePreview} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="text-slate-500 text-sm">Drop image to animate</div>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none"
              >
                <option value="16:9">Landscape (16:9)</option>
                <option value="9:16">Portrait (9:16)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400 uppercase">Quality</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 outline-none"
              >
                <option value="720p">720p (Fast)</option>
                <option value="1080p">1080p (Pro)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || (!prompt.trim() && !sourceImage)}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 py-4 rounded-2xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
          >
            {isLoading ? <span className="animate-spin text-2xl">⏳</span> : 'Generate Video'}
          </button>
        </div>

        <div className="space-y-2 flex flex-col h-full">
          <label className="text-sm font-semibold text-slate-400 uppercase">Cinematic Preview</label>
          <div className="flex-1 min-h-[400px] bg-slate-900 rounded-3xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden shadow-2xl relative">
            {isLoading ? (
              <div className="text-center p-8 animate-pulse">
                <div className="text-6xl mb-6">🎥</div>
                <div className="text-xl font-bold text-orange-400 mb-2">Creating Magic...</div>
                <p className="text-slate-500">{loadingStep}</p>
                <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto mt-6 overflow-hidden">
                  <div className="h-full bg-orange-500 w-1/3 animate-[loading_2s_infinite]"></div>
                </div>
              </div>
            ) : videoUrl ? (
              <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
            ) : (
              <div className="text-slate-600 text-center">
                <div className="text-6xl mb-4 opacity-20">🎬</div>
                <p>Your video creation will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default VideoLab;
