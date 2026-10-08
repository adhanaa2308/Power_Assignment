import React from 'react';
import { TopologyConfig, SimulationPoint, SimulationParams } from '../types/converter';
import { X, Cpu, Zap, Activity, CheckCircle2, XCircle } from 'lucide-react';

interface DeviceDetailModalProps {
  deviceName: string | null;
  onClose: () => void;
  topology: TopologyConfig;
  currentPoint: SimulationPoint | null;
  params: SimulationParams;
}

export const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  deviceName,
  onClose,
  topology,
  currentPoint,
  params
}) => {
  if (!deviceName) return null;

  const isThyristor = topology.type === 'tcr';
  const isConducting = !!currentPoint?.deviceStates[deviceName];
  const currentVal = currentPoint?.deviceCurrents[deviceName] ?? 0;
  const isGateOn = !!currentPoint?.gatePulses[deviceName];

  // Conduction angle description
  const pulseAngle = isThyristor ? `${params.alphaDeg}°` : 'Natural (0°)';
  const conductionInterval = topology.rectification === 'fw'
    ? (topology.phases === 3 ? '60° per pair (120° per device)' : '180°')
    : (topology.phases === 3 ? '120°' : '180° + freewheeling');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-800" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Device Inspector: <span className="font-mono text-blue-600">{deviceName}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* State Banner */}
        <div
          className={`p-3 rounded-lg flex items-center justify-between border ${
            isConducting
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            {isConducting ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <p className="font-bold text-xs">
                {isConducting ? 'Conducting (ON)' : 'Blocking (OFF)'}
              </p>
              <p className="text-[11px] opacity-80">
                {isConducting ? 'Forward conducting current' : 'Reverse/Forward blocking'}
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-sm">
            {currentVal.toFixed(2)} A
          </span>
        </div>

        {/* Key Device Attributes */}
        <div className="flex flex-col gap-2 text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex justify-between">
            <span className="text-slate-500">Device Type:</span>
            <span className="font-semibold capitalize text-slate-900">
              {isThyristor ? 'Thyristor (SCR)' : 'Power Diode'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Topology:</span>
            <span className="font-semibold text-slate-900">{topology.title}</span>
          </div>

          {isThyristor && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">Gate Delay (α):</span>
                <span className="font-semibold text-amber-700">{params.alphaDeg}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gate Pulse Now:</span>
                <span className={`font-semibold ${isGateOn ? 'text-amber-600' : 'text-slate-500'}`}>
                  {isGateOn ? 'ACTIVE (HIGH)' : 'INACTIVE (LOW)'}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between">
            <span className="text-slate-500">Nominal Conduction:</span>
            <span className="font-semibold text-slate-900">{conductionInterval}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500">Peak Current Limit:</span>
            <span className="font-semibold text-slate-900">
              {((Math.sqrt(2) * params.Vs) / params.R).toFixed(1)} A (at R load)
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Close Inspector
        </button>
      </div>
    </div>
  );
};
