import React from 'react';
import { SimulationParams, TopologyConfig } from '../types/converter';
import { Sliders, Zap, ShieldAlert, Sparkles } from 'lucide-react';

interface ParameterPanelProps {
  params: SimulationParams;
  onChangeParams: (newParams: SimulationParams) => void;
  topology: TopologyConfig;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  params,
  onChangeParams,
  topology
}) => {
  const isTCR = topology.type === 'tcr';

  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    onChangeParams({
      ...params,
      [key]: value
    });
  };

  // Educational Presets
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'resistive':
        onChangeParams({
          ...params,
          R: 10,
          L_mH: 0,
          alphaDeg: isTCR ? 45 : 0
        });
        break;
      case 'standard_rl':
        onChangeParams({
          ...params,
          R: 10,
          L_mH: 40,
          alphaDeg: isTCR ? 30 : 0
        });
        break;
      case 'high_l':
        onChangeParams({
          ...params,
          R: 10,
          L_mH: 150,
          alphaDeg: isTCR ? 45 : 0
        });
        break;
      case 'dcm_critical':
        onChangeParams({
          ...params,
          R: 25,
          L_mH: 15,
          alphaDeg: isTCR ? 75 : 0
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-800">Circuit Parameters</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <span>{topology.phases}-Phase</span>
          <span>·</span>
          <span className="capitalize">{topology.deviceType}s</span>
        </div>
      </div>

      {/* Preset Quick Actions */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-mono text-slate-500 mr-1">Presets:</span>
        <button
          onClick={() => applyPreset('resistive')}
          className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
        >
          Pure R (L=0)
        </button>
        <button
          onClick={() => applyPreset('standard_rl')}
          className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
        >
          Standard RL (40mH)
        </button>
        <button
          onClick={() => applyPreset('high_l')}
          className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
        >
          Heavy Inductance (150mH)
        </button>
        {isTCR && (
          <button
            onClick={() => applyPreset('dcm_critical')}
            className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
          >
            DCM Discontinuous (α=75°)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {/* SUPPLY VOLTAGE Vs */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="param-vs" className="font-medium text-slate-700 flex items-center gap-1">
              Supply Voltage (<span className="italic">V<sub>s</sub></span>)
            </label>
            <div className="flex items-center gap-1">
              <input
                id="param-vs-input"
                type="number"
                min="10"
                max="500"
                step="5"
                value={params.Vs}
                onChange={(e) => updateParam('Vs', Number(e.target.value))}
                className="w-16 px-1.5 py-0.5 text-right font-mono text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
              />
              <span className="font-mono text-slate-500 text-xs">V RMS</span>
            </div>
          </div>
          <input
            id="param-vs"
            type="range"
            min="10"
            max="440"
            step="5"
            value={params.Vs}
            onChange={(e) => updateParam('Vs', Number(e.target.value))}
            className="w-full accent-slate-800 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>10 V</span>
            <span>230 V (std)</span>
            <span>440 V</span>
          </div>
        </div>

        {/* FREQUENCY f */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="param-f" className="font-medium text-slate-700 flex items-center gap-1">
              Frequency (<span className="italic">f</span>)
            </label>
            <div className="flex items-center gap-1">
              <input
                id="param-f-input"
                type="number"
                min="20"
                max="120"
                step="1"
                value={params.f}
                onChange={(e) => updateParam('f', Number(e.target.value))}
                className="w-16 px-1.5 py-0.5 text-right font-mono text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
              />
              <span className="font-mono text-slate-500 text-xs">Hz</span>
            </div>
          </div>
          <input
            id="param-f"
            type="range"
            min="20"
            max="100"
            step="1"
            value={params.f}
            onChange={(e) => updateParam('f', Number(e.target.value))}
            className="w-full accent-slate-800 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>20 Hz</span>
            <span>50 Hz / 60 Hz</span>
            <span>100 Hz</span>
          </div>
        </div>

        {/* LOAD RESISTANCE R */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="param-r" className="font-medium text-slate-700 flex items-center gap-1">
              Resistance (<span className="italic">R</span>)
            </label>
            <div className="flex items-center gap-1">
              <input
                id="param-r-input"
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={params.R}
                onChange={(e) => updateParam('R', Math.max(0.5, Number(e.target.value)))}
                className="w-16 px-1.5 py-0.5 text-right font-mono text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
              />
              <span className="font-mono text-slate-500 text-xs">Ω</span>
            </div>
          </div>
          <input
            id="param-r"
            type="range"
            min="1"
            max="100"
            step="0.5"
            value={params.R}
            onChange={(e) => updateParam('R', Number(e.target.value))}
            className="w-full accent-slate-800 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>1 Ω</span>
            <span>10 Ω</span>
            <span>100 Ω</span>
          </div>
        </div>

        {/* LOAD INDUCTANCE L */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs">
            <label htmlFor="param-l" className="font-medium text-slate-700 flex items-center gap-1">
              Inductance (<span className="italic">L</span>)
            </label>
            <div className="flex items-center gap-1">
              <input
                id="param-l-input"
                type="number"
                min="0"
                max="250"
                step="1"
                value={params.L_mH}
                onChange={(e) => updateParam('L_mH', Math.max(0, Number(e.target.value)))}
                className="w-16 px-1.5 py-0.5 text-right font-mono text-xs border border-slate-300 rounded focus:border-blue-500 focus:outline-none"
              />
              <span className="font-mono text-slate-500 text-xs">mH</span>
            </div>
          </div>
          <input
            id="param-l"
            type="range"
            min="0"
            max="200"
            step="1"
            value={params.L_mH}
            onChange={(e) => updateParam('L_mH', Number(e.target.value))}
            className="w-full accent-slate-800 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>0 mH (Resistive)</span>
            <span>50 mH</span>
            <span>200 mH</span>
          </div>
        </div>

        {/* FIRING ANGLE ALPHA (ONLY FOR TCR) */}
        {isTCR ? (
          <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="param-alpha" className="font-semibold text-amber-900 flex items-center gap-1">
                Firing Angle (<span className="font-serif">α</span>)
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="param-alpha-input"
                  type="number"
                  min="0"
                  max="180"
                  step="1"
                  value={params.alphaDeg}
                  onChange={(e) => updateParam('alphaDeg', Math.min(180, Math.max(0, Number(e.target.value))))}
                  className="w-16 px-1.5 py-0.5 text-right font-mono text-xs border border-amber-300 rounded bg-white focus:border-amber-500 focus:outline-none font-bold text-amber-900"
                />
                <span className="font-mono text-amber-800 text-xs">°</span>
              </div>
            </div>
            <input
              id="param-alpha"
              type="range"
              min="0"
              max="180"
              step="1"
              value={params.alphaDeg}
              onChange={(e) => updateParam('alphaDeg', Number(e.target.value))}
              className="w-full accent-amber-600 h-1.5 bg-amber-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-amber-800/80">
              <span>0° (Diode Mode)</span>
              <span>90°</span>
              <span>180°</span>
            </div>
          </div>
        ) : (
          /* Notice for DBR: Firing Angle is disabled/hidden */
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-700">Firing Angle α: Not Applicable</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Diodes are uncontrolled switches that commutate naturally according to the AC supply voltages. Firing control is only active for Thyristor (TCR) topologies.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
