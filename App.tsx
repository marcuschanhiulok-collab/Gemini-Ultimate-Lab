
import React, { useState, useEffect } from 'react';
import { LabType } from './types';
import Sidebar from './components/Sidebar';
import LiveLab from './components/Labs/LiveLab';
import ChatLab from './components/Labs/ChatLab';
import SearchLab from './components/Labs/SearchLab';
import MapsLab from './components/Labs/MapsLab';
import ImageLab from './components/Labs/ImageLab';
import VideoLab from './components/Labs/VideoLab';
import AnalysisLab from './components/Labs/AnalysisLab';
import TranscriptionLab from './components/Labs/TranscriptionLab';
import SettingsLab from './components/Labs/SettingsLab';

export const THEME_COLORS = [
  { name: 'Indigo', value: '#6366f1', glow: 'rgba(99, 102, 241, 0.1)' },
  { name: 'Blue', value: '#3b82f6', glow: 'rgba(59, 130, 246, 0.1)' },
  { name: 'Emerald', value: '#10b981', glow: 'rgba(16, 185, 129, 0.1)' },
  { name: 'Rose', value: '#f43f5e', glow: 'rgba(244, 63, 94, 0.1)' },
  { name: 'Amber', value: '#f59e0b', glow: 'rgba(245, 158, 11, 0.1)' },
  { name: 'Violet', value: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.1)' },
];

export interface UserSettings {
  userName: string;
  accentColor: string;
  preferredVoice: string;
  defaultToFlash: boolean;
  darkMode: boolean;
}

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const App: React.FC = () => {
  const [activeLab, setActiveLab] = useState<LabType>(LabType.LIVE);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('lab-settings');
    return saved ? JSON.parse(saved) : {
      userName: 'Explorer',
      accentColor: THEME_COLORS[0].value,
      preferredVoice: 'Zephyr',
      defaultToFlash: false,
      darkMode: true,
    };
  });

  useEffect(() => {
    const checkApiKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const has = await aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    const theme = THEME_COLORS.find(c => c.value === settings.accentColor);
    const primaryColor = settings.accentColor;
    const glowColor = theme ? theme.glow : hexToRgba(primaryColor, 0.1);
    
    document.documentElement.style.setProperty('--primary', primaryColor);
    document.documentElement.style.setProperty('--primary-glow', glowColor);
    
    // Toggle dark mode class on html element
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('lab-settings', JSON.stringify(settings));
  }, [settings]);

  const handleOpenKeySelector = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        setHasApiKey(true);
      } catch (err) {
        console.error("Failed to open key selector:", err);
      }
    }
  };

  const renderLab = () => {
    switch (activeLab) {
      case LabType.LIVE: return <LiveLab voice={settings.preferredVoice} userName={settings.userName} onSelectKey={handleOpenKeySelector} />;
      case LabType.CHAT: return <ChatLab userName={settings.userName} useFlash={settings.defaultToFlash} onSelectKey={handleOpenKeySelector} />;
      case LabType.SEARCH: return <SearchLab />;
      case LabType.MAPS: return <MapsLab />;
      case LabType.IMAGE: return <ImageLab onSelectKey={handleOpenKeySelector} hasKey={hasApiKey} />;
      case LabType.VIDEO: return <VideoLab onSelectKey={handleOpenKeySelector} hasKey={hasApiKey} />;
      case LabType.ANALYSIS: return <AnalysisLab />;
      case LabType.TRANSCRIPTION: return <TranscriptionLab />;
      case LabType.SETTINGS: return <SettingsLab settings={settings} setSettings={setSettings} onSelectKey={handleOpenKeySelector} />;
      default: return <LiveLab voice={settings.preferredVoice} userName={settings.userName} onSelectKey={handleOpenKeySelector} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">
      <Sidebar 
        activeLab={activeLab} 
        onSelectLab={setActiveLab} 
      />
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-y-auto transition-colors duration-300">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--primary)] to-slate-500 bg-clip-text text-transparent transition-all duration-500">
            {activeLab}
          </h1>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${hasApiKey ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              {hasApiKey ? 'Premium Key Active' : 'Default Key'}
            </div>
          </div>
        </header>
        <div className="flex-1">
          {renderLab()}
        </div>
      </main>
    </div>
  );
};

export default App;

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
