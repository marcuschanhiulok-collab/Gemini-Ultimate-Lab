
import React from 'react';
import { LabType } from '../types';

interface SidebarProps {
  activeLab: LabType;
  onSelectLab: (lab: LabType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeLab, onSelectLab, isOpen, onClose }) => {
  const navItems = [
    { type: LabType.LIVE, icon: '🎙️' },
    { type: LabType.CHAT, icon: '💬' },
    { type: LabType.SEARCH, icon: '🔍' },
    { type: LabType.MAPS, icon: '📍' },
    { type: LabType.IMAGE, icon: '🎨' },
    { type: LabType.VIDEO, icon: '🎬' },
    { type: LabType.ANALYSIS, icon: '🧠' },
    { type: LabType.TRANSCRIPTION, icon: '📝' },
    { type: LabType.SETTINGS, icon: '⚙️' },
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <nav className={`fixed lg:static inset-y-0 left-0 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] flex flex-col shrink-0 z-50 transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-white transition-all duration-500"
                style={{ backgroundColor: 'var(--primary)', boxShadow: '0 0 15px var(--primary-glow)' }}
              >M</div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-900 dark:text-white leading-none uppercase tracking-tighter">Marcus AI Lab</span>
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] mt-1">v3.0.PRO</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-1">
            <div className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-4 px-2">Core Modules</div>
            {navItems.map((item) => (
              <button
                key={item.type}
                onClick={() => onSelectLab(item.type)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  activeLab === item.type
                    ? 'text-[var(--primary)] bg-slate-50 dark:bg-white/5'
                    : 'text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                {activeLab === item.type && (
                   <div className="absolute left-0 w-1 h-4 bg-[var(--primary)] rounded-r-full" />
                )}
                <span className={`text-lg transition-transform duration-200 ${activeLab === item.type ? 'scale-110' : 'group-hover:scale-110 opacity-70'}`}>{item.icon}</span>
                <span className="font-bold text-xs tracking-tight">{item.type}</span>
              </button>
            ))}
          </div>
        </div>
             
        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 text-[8px] text-slate-400 dark:text-slate-600 text-center font-black uppercase tracking-[0.2em] border border-slate-100 dark:border-white/5">
            Powered by Marcus's code
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
