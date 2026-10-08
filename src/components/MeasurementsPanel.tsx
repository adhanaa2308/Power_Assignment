import React from 'react';
import { Measurements, TopologyConfig, SimulationPoint } from '../types/converter';
import { Activity, Download, Gauge, Zap, Cpu } from 'lucide-react';

interface MeasurementsPanelProps {
  measurements: Measurements;
  topology: TopologyConfig;
  currentPoint: SimulationPoint | null;
  steadyStatePoints: SimulationPoint[];
}

export const MeasurementsPanel: React.FC<MeasurementsPanelProps> = ({
  measurements,
  topology,
  currentPoint,
  steadyStatePoints
}) => {
  const activeDeviceCount = currentPoint
    ? Object.values(currentPoint.deviceStates).filter(Boolean).length
    : 0;

  // Export CSV
  const handleExportCSV = () => {
    if (steadyStatePoints.length === 0) return;
    const headers = ['time_s', 'theta_deg', 'vs_V', 'vo_V', 'io_A', ...topology.devices.map(d => `state_${d}`)];
    const rows = steadyStatePoints.map(pt => [
      pt.t.toFixed(6),
      pt.thetaDeg.toFixed(2),
      pt.vs.toFixed(2),
      pt.vo.toFixed(2),
      pt.io.toFixed(3),
      ...topology.devices.map(d => (pt.deviceStates[d] ? '1' : '0'))
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${topology.key}_simulation_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-800">Calculated Quantities & Steady-State Measurements</h2>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Export CSV of simulated waveform points"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* GROUP 1: VOLTAGE */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center justify-between">
            <span>Output Voltage</span>
            <span className="text-emerald-600 font-bold">Vo</span>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Average (Vdc):</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {measurements.voAvg.toFixed(2)} V
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">RMS Value:</span>
              <span className="font-mono font-semibold text-slate-800">
                {measurements.voRms.toFixed(2)} V
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Peak Value:</span>
              <span className="font-mono text-slate-700">
                {measurements.voPeak.toFixed(1)} V
              </span>
            </div>
            <div className="flex justify-between items-baseline text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              <span>Theory Vdc:</span>
              <span className="font-mono text-slate-600">{measurements.theoreticalVoAvg.toFixed(1)} V</span>
            </div>
          </div>
        </div>

        {/* GROUP 2: CURRENT */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center justify-between">
            <span>Load Current</span>
            <span className="text-purple-600 font-bold">Io</span>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Average (Idc):</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {measurements.ioAvg.toFixed(2)} A
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">RMS Value:</span>
              <span className="font-mono font-semibold text-slate-800">
                {measurements.ioRms.toFixed(2)} A
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Peak Value:</span>
              <span className="font-mono text-slate-700">
                {measurements.ioPeak.toFixed(2)} A
              </span>
            </div>
            <div className="flex justify-between items-baseline text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              <span>Ripple %:</span>
              <span className="font-mono text-slate-600">{measurements.currentRipplePercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* GROUP 3: POWER */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center justify-between">
            <span>Power & Efficiency</span>
            <span className="text-blue-600 font-bold">P</span>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Real Power (P):</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {measurements.realPower.toFixed(1)} W
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Apparent (S):</span>
              <span className="font-mono font-semibold text-slate-800">
                {measurements.apparentPower.toFixed(1)} VA
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Power Factor:</span>
              <span className="font-mono font-semibold text-blue-700">
                {measurements.powerFactor.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between items-baseline text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              <span>Form Factor (FF):</span>
              <span className="font-mono text-slate-600">{measurements.formFactor.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* GROUP 4: SWITCHING & CONDUCTION */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold mb-2 flex items-center justify-between">
            <span>Switching State</span>
            <span className="text-amber-600 font-bold">SCR</span>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Firing Angle α:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {topology.type === 'tcr' ? `${measurements.firingAngleDeg}°` : 'N/A (Diode)'}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Conduction Angle:</span>
              <span className="font-mono font-semibold text-slate-800">
                {measurements.conductionAngleDeg.toFixed(0)}° / dev
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-600">Mode:</span>
              <span className={`font-mono font-semibold ${measurements.isContinuousConduction ? 'text-emerald-700' : 'text-amber-700'}`}>
                {measurements.isContinuousConduction ? 'CCM (Continuous)' : 'DCM (Discontinuous)'}
              </span>
            </div>
            <div className="flex justify-between items-baseline text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              <span>Active Now:</span>
              <span className="font-mono font-bold text-emerald-700">{activeDeviceCount} device(s)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
