import React from 'react';
import { TopologyKey, TopologyConfig } from '../types/converter';
import { TOPOLOGIES } from '../simulation/topologies';

interface TopologySelectorProps {
  currentTopologyKey: TopologyKey;
  onSelectTopology: (key: TopologyKey) => void;
}

export const TopologySelector: React.FC<TopologySelectorProps> = ({
  currentTopologyKey,
  onSelectTopology
}) => {
  const dbrKeys: TopologyKey[] = [
    'dbr,fw,1p',
    'dbr,hw,1p',
    'dbr,fw,3p',
    'dbr,hw,3p'
  ];

  const tcrKeys: TopologyKey[] = [
    'tcr,fw,1p',
    'tcr,hw,1p',
    'tcr,fw,3p',
    'tcr,hw,3p'
  ];

  const renderTopologyButton = (key: TopologyKey) => {
    const config = TOPOLOGIES[key];
    const isSelected = currentTopologyKey === key;

    return (
      <button
        key={key}
        onClick={() => onSelectTopology(key)}
        className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border flex flex-col justify-between cursor-pointer ${
          isSelected
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-1">
          <span className={`font-mono text-[11px] font-bold ${isSelected ? 'text-sky-300' : 'text-slate-900'}`}>
            {config.title.split('—')[0].trim()}
          </span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              isSelected
                ? 'bg-slate-800 text-slate-300'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {config.phases}P · {config.rectification.toUpperCase()}
          </span>
        </div>
        <div className={`text-[11px] leading-tight ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
          {config.rectification === 'fw' ? 'Full Wave' : 'Half Wave'} · {config.phases === 1 ? 'Single Phase' : 'Three Phase'}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 p-3 shadow-xs flex flex-col gap-3">
      {/* Group 1: Diode Bridge Rectifier (DBR) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase font-mono">
            Diode Bridge Rectifier (DBR)
          </span>
          <span className="text-[11px] font-mono text-slate-500">Uncontrolled · Natural Commutation</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {dbrKeys.map(renderTopologyButton)}
        </div>
      </div>

      <div className="w-full h-[1px] bg-slate-100" />

      {/* Group 2: Thyristor Controlled Rectifier (TCR) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 tracking-wide uppercase font-mono">
            Thyristor Controlled Rectifier (TCR)
          </span>
          <span className="text-[11px] font-mono text-amber-700">Phase-Controlled · Firing Angle α</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {tcrKeys.map(renderTopologyButton)}
        </div>
      </div>
    </div>
  );
};
