
import React from 'react';
import { LabType } from '../types';

interface SidebarProps {
  activeLab: LabType;
  onSelectLab: (lab: LabType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeLab, onSelectLab }) => {
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
    <nav className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col shrink-0 transition-colors duration-300">
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 mb-8">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white transition-colors duration-500 shadow-sm"
            style={{ backgroundColor: 'var(--primary)' }}
          >M</div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">Marcus's AI Lab</span>
        </div>
        
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.type}
              onClick={() => onSelectLab(item.type)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeLab === item.type
                  ? 'text-white shadow-lg shadow-[var(--primary-glow)]'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              style={activeLab === item.type ? { 
                backgroundColor: 'var(--primary)',
              } : {}}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.type}</span>
            </button>
          ))}
        </div>
      </div>
           
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-[10px] text-slate-500 text-center font-medium">
          Powered by Marcus's code
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
