import React from 'react';
import { SimulationPoint, TopologyConfig, SimulationParams } from '../types/converter';
import { BookOpen, Info, HelpCircle } from 'lucide-react';

interface EducationalExplanationProps {
  currentPoint: SimulationPoint | null;
  topology: TopologyConfig;
  params: SimulationParams;
}

export const EducationalExplanation: React.FC<EducationalExplanationProps> = ({
  currentPoint,
  topology,
  params
}) => {
  if (!currentPoint) return null;

  const { thetaDeg, vo, io, didt, deviceStates, activeVoltageName } = currentPoint;
  const activeDevices = Object.entries(deviceStates)
    .filter(([_, on]) => on)
    .map(([name]) => name);

  // Generate dynamic explanation based on topology, angle, and state
  const getExplanation = () => {
    const isInductive = params.L_mH > 0;
    const isCurrentFlowing = io > 0.05;

    let deviceText = '';
    if (activeDevices.length === 0) {
      deviceText = 'All devices are currently blocking (OFF).';
    } else if (activeDevices.length === 1) {
      deviceText = `${activeDevices[0]} is conducting.`;
    } else {
      deviceText = `${activeDevices.join(' and ')} are conducting simultaneously.`;
    }

    let inductorText = '';
    if (!isInductive) {
      inductorText = 'With pure resistance (L = 0), current follows the output voltage instantaneously: i(t) = vo(t) / R.';
    } else if (didt > 5) {
      inductorText = `Because the output voltage (${vo.toFixed(1)}V) exceeds the resistive drop i·R (${(io * params.R).toFixed(1)}V), the inductor L is absorbing energy (di/dt = +${didt.toFixed(0)} A/s), causing current to rise.`;
    } else if (didt < -5) {
      inductorText = `Output voltage (${vo.toFixed(1)}V) is lower than i·R (${(io * params.R).toFixed(1)}V). The inductor L is releasing stored magnetic energy (di/dt = ${didt.toFixed(0)} A/s) to maintain current flow.`;
    } else {
      inductorText = `Load current is near its crest where L(di/dt) ≈ 0, meaning vo ≈ R·io.`;
    }

    let topologyText = '';
    switch (topology.key) {
      case 'dbr,hw,1p':
        if (thetaDeg < 180) {
          topologyText = 'During the positive half-cycle, diode D1 is forward-biased by the AC source. Output voltage equals vs(t).';
        } else if (isCurrentFlowing) {
          topologyText = 'Even though vs(t) is negative, the inductor L forces D1 to remain conducting (freewheeling conduction) until stored magnetic energy depletes.';
        } else {
          topologyText = 'The load current has extinguished (i = 0). Diode D1 blocks the negative source voltage, keeping vo = 0V.';
        }
        break;

      case 'dbr,fw,1p':
        if (thetaDeg < 180) {
          topologyText = 'Diodes D1 and D2 are forward-biased by the positive AC cycle, feeding positive current into the load.';
        } else {
          topologyText = 'Source polarity has reversed, instantly forward-biasing diodes D3 and D4. Output voltage is inverted to +|vs(t)|.';
        }
        break;

      case 'dbr,hw,3p':
        topologyText = `In this 3-pulse star converter, natural commutation occurs every 120°. The diode connected to the phase with the highest instantaneous potential (${activeVoltageName}) conducts while the other two are reverse-biased.`;
        break;

      case 'dbr,fw,3p':
        topologyText = `In this 6-pulse bridge, the top diode connected to the most positive phase and the bottom diode connected to the most negative phase conduct together, applying line-to-line voltage ${activeVoltageName} across the load.`;
        break;

      case 'tcr,hw,1p':
        if (thetaDeg < params.alphaDeg) {
          topologyText = `Even though vs > 0, thyristor T1 remains blocking until its gate pulse is applied at α = ${params.alphaDeg}°. Output voltage remains 0V.`;
        } else if (isCurrentFlowing) {
          topologyText = `T1 was triggered and remains in conduction. If vs becomes negative, stored inductive energy keeps T1 latched on until current drops to zero at extinction angle β.`;
        } else {
          topologyText = `Current has extinguished (i = 0) and T1 has turned off. It will block until the next gate pulse in the following cycle.`;
        }
        break;

      case 'tcr,fw,1p':
        if (activeDevices.length > 0) {
          topologyText = `Thyristors ${activeDevices.join(' & ')} are conducting. The load is clamped to ${activeVoltageName}. Inductive current can hold the thyristors on even into negative voltage intervals until the opposite pair is fired at 180° + α.`;
        } else {
          topologyText = `Converter is operating in Discontinuous Conduction Mode (DCM). Current reached zero before the next firing instant, causing all SCRs to turn off and Vo = 0V.`;
        }
        break;

      case 'tcr,hw,3p':
        if (activeDevices.length > 0) {
          topologyText = `Thyristor ${activeDevices[0]} is conducting from phase ${activeVoltageName}. Firing is delayed by α = ${params.alphaDeg}° from the natural crossing at 30°.`;
        } else {
          topologyText = `Discontinuous mode (DCM): load current extinguished before the next phase thyristor was triggered.`;
        }
        break;

      case 'tcr,fw,3p':
        if (activeDevices.length >= 2) {
          topologyText = `Thyristor pair (${activeDevices.join(', ')}) is conducting, applying line voltage ${activeVoltageName} to the load. Conduction commutates every 60° synchronized with 3-phase line crossings delayed by α = ${params.alphaDeg}°.`;
        } else {
          topologyText = `Discontinuous current interval in 3-phase controlled bridge.`;
        }
        break;
    }

    return { deviceText, inductorText, topologyText };
  };

  const { deviceText, inductorText, topologyText } = getExplanation();

  return (
    <div className="w-full bg-slate-50 rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col gap-2.5">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-semibold text-slate-800">What is happening?</h2>
        </div>
        <div className="font-mono text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
          At θ = {thetaDeg.toFixed(1)}° (t = {(currentPoint.t * 1000).toFixed(2)} ms)
        </div>
      </div>

      <div className="text-xs text-slate-700 leading-relaxed flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <span className="font-bold text-slate-900 shrink-0 font-mono">1. Switching State:</span>
          <span>{deviceText} {topologyText}</span>
        </div>

        <div className="flex items-start gap-2">
          <span className="font-bold text-slate-900 shrink-0 font-mono">2. Load Dynamics:</span>
          <span>{inductorText}</span>
        </div>

        <div className="mt-1 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Theoretical Formula: <strong className="text-slate-700">{topology.theoreticalFormula}</strong></span>
          <span className="text-slate-400">Educational Simulation Engine v1.0</span>
        </div>
      </div>
    </div>
  );
};
