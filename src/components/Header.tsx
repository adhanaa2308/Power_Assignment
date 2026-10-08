import React from 'react';
import { RotateCcw, BookMarked } from 'lucide-react';

interface HeaderProps {
  onResetDefaults: () => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onResetDefaults, onOpenGuide }) => {
  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-sans">
            Power Electronics Converter Simulator
          </span>
        </div>

        {/* Zone 2: Navigation / Topic links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <span className="text-slate-900 font-semibold">1-Phase & 3-Phase</span>
          <span className="text-slate-300">/</span>
          <span>DBR Diodes</span>
          <span className="text-slate-300">/</span>
          <span>TCR Thyristors</span>
          <span className="text-slate-300">/</span>
          <span>RL Load Differential Dynamics</span>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGuide}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Open Theory & Topology Guide"
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Theory Guide</span>
          </button>
          <button
            onClick={onResetDefaults}
            className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Reset parameters to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>
    </header>
  );
};
