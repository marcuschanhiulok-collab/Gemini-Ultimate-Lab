
import React, { useState, useEffect, useRef } from 'react';
import { UserSettings, THEME_COLORS } from '../../App';
import { getAI, decode, decodeAudioData } from '../../services/gemini';
import { Modality } from '@google/genai';

interface SettingsLabProps {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  onSelectKey: () => void;
}

const SettingsLab: React.FC<SettingsLabProps> = ({ settings, setSettings, onSelectKey }) => {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const colorInputRef = useRef<HTMLInputElement>(null);
  const voices = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => setSaveStatus('saved'), 600);
    return () => clearTimeout(timer);
  }, [settings]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const isPredefined = THEME_COLORS.some(c => c.value === settings.accentColor);

  const previewVoice = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say cheerfully: Hello ${settings.userName || 'there'}, I am your AI assistant using the ${settings.preferredVoice} voice. I'm ready to help you.` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: settings.preferredVoice as any },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          audioCtx,
          24000,
          1,
        );
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsPreviewing(false);
        source.start();
      } else {
        setIsPreviewing(false);
      }
    } catch (err) {
      console.error("Voice preview failed:", err);
      setIsPreviewing(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center mb-2 px-2">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em]">Application Settings</h2>
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${saveStatus === 'saving' ? 'text-amber-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          {saveStatus === 'saving' ? 'Auto-saving...' : 'All changes saved to storage'}
        </div>
      </div>

      <section className="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>🔑</span> API Authorization
          </h3>
          <button 
            onClick={onSelectKey}
            className="px-4 py-2 bg-[var(--primary)] hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-[var(--primary-glow)]"
          >
            Switch API Key
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Premium features (Image/Video Generation, Live API) require an API key from a project with billing enabled. 
          Use the button above to authorize the lab with your own paid key.
        </p>
      </section>

      <section className="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>👤</span> User Profile
          </h3>
          <span className="text-[10px] bg-white dark:bg-slate-700 px-2 py-1 rounded text-slate-400 font-mono">Persistence: ON</span>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Display Name</label>
          <input
            type="text"
            value={settings.userName}
            onChange={(e) => updateSetting('userName', e.target.value)}
            onBlur={() => { if(!settings.userName.trim()) updateSetting('userName', 'Explorer'); }}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 focus:ring-2 outline-none transition-all text-slate-900 dark:text-white"
            style={{ '--tw-ring-color': 'var(--primary)' } as any}
            placeholder="What should the AI call you?"
          />
          <p className="text-[10px] text-slate-500 italic">This name is shared with AI models to personalize your experience.</p>
        </div>
      </section>

      <section className="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl space-y-8 transition-colors duration-300">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span>🎨</span> Appearance
        </h3>
        
        <div className="space-y-4">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Theme Mode</label>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => updateSetting('darkMode', false)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                !settings.darkMode ? 'bg-[var(--primary)] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span>☀️</span> Light
            </button>
            <button
              onClick={() => updateSetting('darkMode', true)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                settings.darkMode ? 'bg-[var(--primary)] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span>🌙</span> Dark
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Accent Color</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-4">
            {THEME_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => updateSetting('accentColor', color.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all hover:scale-105 ${
                  settings.accentColor === color.value 
                    ? 'border-[var(--primary)] bg-white dark:bg-white/5 shadow-lg' 
                    : 'border-transparent bg-white dark:bg-slate-900'
                }`}
              >
                <div 
                  className="w-8 h-8 rounded-full shadow-inner" 
                  style={{ backgroundColor: color.value }}
                />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{color.name}</span>
              </button>
            ))}
            
            <div className="relative">
              <button
                onClick={() => colorInputRef.current?.click()}
                className={`w-full h-full flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all hover:scale-105 ${
                  !isPredefined 
                    ? 'border-[var(--primary)] bg-white dark:bg-white/5 shadow-lg' 
                    : 'border-transparent bg-white dark:bg-slate-900'
                }`}
              >
                <div 
                  className={`w-8 h-8 rounded-full shadow-inner flex items-center justify-center relative overflow-hidden ${!isPredefined ? '' : 'bg-gradient-to-tr from-rose-500 via-indigo-500 to-emerald-500'}`} 
                  style={!isPredefined ? { backgroundColor: settings.accentColor } : {}}
                >
                  <span className="text-[10px] text-white font-bold drop-shadow-md">
                    {!isPredefined ? '✓' : '+'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate w-full text-center">
                  {!isPredefined ? settings.accentColor.toUpperCase() : 'Custom'}
                </span>
              </button>
              <input 
                ref={colorInputRef}
                type="color" 
                value={settings.accentColor} 
                onChange={(e) => updateSetting('accentColor', e.target.value)}
                className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl space-y-6 transition-colors duration-300">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span>⚙️</span> Lab Preferences
        </h3>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Default AI Intelligence</label>
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => updateSetting('defaultToFlash', true)}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                  settings.defaultToFlash ? 'bg-[var(--primary)] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Fast (Flash)
              </button>
              <button
                onClick={() => updateSetting('defaultToFlash', false)}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                  !settings.defaultToFlash ? 'bg-[var(--primary)] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Pro (Deep)
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Primary AI Voice</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={settings.preferredVoice}
                  onChange={(e) => updateSetting('preferredVoice', e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 pr-10 focus:ring-2 outline-none transition-all appearance-none cursor-pointer text-slate-900 dark:text-white"
                  style={{ '--tw-ring-color': 'var(--primary)' } as any}
                >
                  {voices.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <button
                onClick={previewVoice}
                disabled={isPreviewing}
                className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all border border-slate-200 dark:border-slate-700 ${
                  isPreviewing ? 'bg-slate-200 dark:bg-slate-800' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title="Test Voice"
              >
                {isPreviewing ? (
                  <div className="flex gap-1 items-end h-4">
                    <div className="w-1 bg-[var(--primary)] animate-[voice_0.5s_ease-in-out_infinite_alternate]"></div>
                    <div className="w-1 bg-[var(--primary)] animate-[voice_0.5s_ease-in-out_0.2s_infinite_alternate]"></div>
                    <div className="w-1 bg-[var(--primary)] animate-[voice_0.5s_ease-in-out_0.4s_infinite_alternate]"></div>
                  </div>
                ) : (
                  <span className="text-xl">🔊</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
      <style>{`
        @keyframes voice {
          from { height: 4px; }
          to { height: 16px; }
        }
      `}</style>
    </div>
  );
};

export default SettingsLab;
