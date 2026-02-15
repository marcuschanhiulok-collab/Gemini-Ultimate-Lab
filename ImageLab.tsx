
import React, { useState, useEffect } from 'react';
import { getAI, fileToBase64, improvePrompt } from '../../services/gemini';

interface ImageHistoryItem {
  id: number;
  url: string;
  prompt: string;
  timestamp: number;
  mode: 'generate' | 'edit';
}

interface ImageLabProps {
  onSelectKey: () => void;
  hasKey: boolean;
}

// Simple IndexedDB wrapper for image persistence
const DB_NAME = 'GeminiLabImages';
const STORE_NAME = 'history';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

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
  
  // History State
  const [history, setHistory] = useState<ImageHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load history from IndexedDB
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
          setHistory((request.result as ImageHistoryItem[]).sort((a, b) => b.timestamp - a.timestamp));
        };
      } catch (err) {
        console.error("Failed to load history from IndexedDB", err);
      }
    };
    loadHistory();
  }, []);

  const saveToHistory = async (url: string, p: string, m: 'generate' | 'edit') => {
    try {
      const newItem = { url, prompt: p, timestamp: Date.now(), mode: m };
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(newItem);
      request.onsuccess = () => {
        const itemWithId = { ...newItem, id: request.result as number };
        setHistory(prev => [itemWithId, ...prev].slice(0, 30)); // Keep last 30
      };
    } catch (err) {
      console.error("Failed to save image to IndexedDB", err);
    }
  };

  const deleteFromHistory = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const db = await initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Failed to delete from IndexedDB", err);
    }
  };

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
      let newUrl = '';
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
            newUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      } else {
        if (!sourceImage) {
          alert("Please upload a source image for editing.");
          setIsLoading(false);
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
            newUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (newUrl) {
        setGeneratedImageUrl(newUrl);
        await saveToHistory(newUrl, prompt, mode);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Ensure you have selected a valid Premium API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const recallFromHistory = (item: ImageHistoryItem) => {
    setGeneratedImageUrl(item.url);
    setPrompt(item.prompt);
    setMode(item.mode);
    setIsHistoryOpen(false);
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* History Sidebar */}
      <div 
        className={`fixed inset-y-0 right-0 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 z-[60] shadow-2xl transition-transform duration-500 ease-in-out ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <span>🕒</span> Creation History
          </h3>
          <button 
            onClick={() => setIsHistoryOpen(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="h-full overflow-y-auto p-4 space-y-4 pb-24 no-scrollbar">
          {history.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="text-4xl opacity-20">🎞️</div>
              <p className="text-[10px] font-bold uppercase tracking-widest">No history yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {history.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => recallFromHistory(item)}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-[var(--primary)] transition-all bg-slate-100 dark:bg-slate-800 shadow-sm"
                >
                  <img src={item.url} className="w-full h-full object-cover" alt="History" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <p className="text-[8px] text-white font-bold line-clamp-2 leading-tight mb-1">{item.prompt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[7px] text-slate-300 uppercase font-black">{item.mode}</span>
                      <button 
                        onClick={(e) => deleteFromHistory(e, item.id)}
                        className="p-1 hover:text-red-400 text-slate-400"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 flex flex-col items-center justify-center space-y-6">
        <div className="w-full max-w-3xl flex justify-between items-center mb-[-1.5rem] z-10 px-4">
           <div className="flex gap-2">
              {!hasKey && mode === 'generate' && (
                <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Premium Required</p>
                </div>
              )}
           </div>
           <button 
             onClick={() => setIsHistoryOpen(true)}
             className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 shadow-lg hover:bg-[var(--primary-glow)] hover:text-[var(--primary)] transition-all flex items-center gap-2"
           >
             <span>🕒</span> View History
           </button>
        </div>

        <div className="w-full max-w-3xl aspect-square bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden relative group">
          {isLoading ? (
            <div className="text-center animate-pulse">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Manifesting image...</p>
            </div>
          ) : generatedImageUrl ? (
            <>
              <img src={generatedImageUrl} className="w-full h-full object-contain p-2" alt="Generated" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <a href={generatedImageUrl} download="gemini-gen.png" className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform">Download</a>
              </div>
            </>
          ) : mode === 'edit' && sourcePreview ? (
             <div className="relative w-full h-full p-4">
                <img src={sourcePreview} className="w-full h-full object-contain opacity-50 blur-sm" alt="Source Backdrop" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 text-center">
                    <img src={sourcePreview} className="w-32 h-32 rounded-xl object-cover mx-auto mb-4 border-4 border-white shadow-lg" alt="Source Thumb" />
                    <p className="text-xs font-bold dark:text-white">Ready for edits</p>
                  </div>
                </div>
             </div>
          ) : (
            <div className="text-slate-300 dark:text-slate-700 text-center select-none">
              <div className="text-8xl mb-6">✨</div>
              <p className="text-sm font-black uppercase tracking-widest">Creative Studio</p>
            </div>
          )}
        </div>
      </div>

      {/* Control Area */}
      <div className="p-4 md:p-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800 space-y-4 z-20">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex bg