import React from 'react';
import { X, BookOpen, Check } from 'lucide-react';
import { TOPOLOGIES } from '../simulation/topologies';
import { TopologyKey } from '../types/converter';

interface TheoryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopology: (key: TopologyKey) => void;
  currentTopologyKey: TopologyKey;
}

export const TheoryGuideModal: React.FC<TheoryGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectTopology,
  currentTopologyKey
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Power Electronics Theory & Topology Reference
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          <div>
            <h3 className="font-bold text-slate-900 mb-1.5 text-base">Differential Load Equation</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              In an RL-loaded rectifier, the output voltage is balanced by the resistive drop and inductive back-EMF:
            </p>
            <div className="my-2 p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg">
              v_o(t) = R · i(t) + L · (di(t) / dt) &nbsp;⇒&nbsp; di/dt = [v_o(t) - R · i(t)] / L
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              When current drops to zero (i = 0) and driving voltage is non-positive with no trigger gate pulse, the semiconductor switches turn off (extinction angle β). During this discontinuous zero-current interval, v_o(t) = 0V.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-bold text-slate-900 mb-3 text-base">The 8 Supported Converter Topologies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(TOPOLOGIES) as TopologyKey[]).map((key) => {
                const topo = TOPOLOGIES[key];
                const isActive = currentTopologyKey === key;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      onSelectTopology(key);
                      onClose();
                    }}
                    className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold font-mono text-slate-900">{topo.title}</span>
                        {isActive && (
                          <span className="text-[10px] font-mono font-semibold text-blue-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] mb-2">{topo.description}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 font-mono text-[11px] text-slate-800">
                      <strong>Formula:</strong> {topo.theoreticalFormula}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Got it, Return to Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
