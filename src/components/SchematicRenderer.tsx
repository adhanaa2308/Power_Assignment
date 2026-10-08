import React from 'react';
import { TopologyConfig, SimulationPoint } from '../types/converter';

interface SchematicRendererProps {
  topology: TopologyConfig;
  currentPoint: SimulationPoint | null;
  onSelectDevice: (deviceName: string) => void;
  selectedDevice: string | null;
}

export const SchematicRenderer: React.FC<SchematicRendererProps> = ({
  topology,
  currentPoint,
  onSelectDevice,
  selectedDevice
}) => {
  const isConducting = (name: string) => {
    return !!currentPoint?.deviceStates[name];
  };

  const getDeviceCurrent = (name: string) => {
    return currentPoint?.deviceCurrents[name] ?? 0;
  };

  const isGateActive = (name: string) => {
    return !!currentPoint?.gatePulses[name];
  };

  // Helper to render Diode or Thyristor symbol
  const renderSwitch = (
    id: string,
    x: number,
    y: number,
    orientation: 'down' | 'up' | 'right' = 'down'
  ) => {
    const isThyristor = topology.type === 'tcr';
    const active = isConducting(id);
    const selected = selectedDevice === id;
    const gateOn = isGateActive(id);
    const currentVal = getDeviceCurrent(id);

    // Rotation transform
    let rot = 0;
    if (orientation === 'up') rot = 180;
    if (orientation === 'right') rot = -90;

    return (
      <g
        key={id}
        transform={`translate(${x}, ${y})`}
        className="cursor-pointer group"
        onClick={() => onSelectDevice(id)}
      >
        {/* Glow when active */}
        {active && (
          <circle
            cx="0"
            cy="0"
            r="26"
            className="fill-emerald-400/20 animate-pulse pointer-events-none"
          />
        )}
        
        {/* Selection ring */}
        {selected && (
          <circle
            cx="0"
            cy="0"
            r="28"
            className="stroke-blue-600 fill-none stroke-2 stroke-dasharray-[4,2] pointer-events-none"
          />
        )}

        {/* Rotated device symbol */}
        <g transform={`rotate(${rot})`}>
          {/* Anode to Cathode Triangle */}
          <polygon
            points="-14,-14 14,-14 0,14"
            className={`transition-colors duration-150 ${
              active
                ? 'fill-emerald-500 stroke-emerald-700 stroke-2'
                : 'fill-white stroke-slate-700 stroke-2 group-hover:stroke-blue-600'
            }`}
          />
          {/* Cathode bar */}
          <line
            x1="-14"
            y1="14"
            x2="14"
            y2="14"
            className={`stroke-2 ${
              active ? 'stroke-emerald-800' : 'stroke-slate-700 group-hover:stroke-blue-600'
            }`}
          />
          {/* Lead extension */}
          <line x1="0" y1="-22" x2="0" y2="-14" className="stroke-slate-700 stroke-2" />
          <line x1="0" y1="14" x2="0" y2="22" className="stroke-slate-700 stroke-2" />

          {/* Thyristor Gate Terminal */}
          {isThyristor && (
            <g>
              <line
                x1="0"
                y1="14"
                x2="-16"
                y2="24"
                className={`stroke-2 ${
                  gateOn ? 'stroke-amber-500' : 'stroke-slate-600'
                }`}
              />
              <circle
                cx="-16"
                cy="24"
                r="3"
                className={`${
                  gateOn ? 'fill-amber-500 animate-ping' : 'fill-slate-600'
                }`}
              />
              <text
                x="-26"
                y="30"
                className={`text-[9px] font-mono font-bold ${
                  gateOn ? 'fill-amber-600' : 'fill-slate-500'
                }`}
              >
                G
              </text>
            </g>
          )}
        </g>

        {/* Device Label & Status Tag */}
        <g transform="translate(20, -4)">
          <rect
            x="-2"
            y="-14"
            width="46"
            height="26"
            rx="4"
            className={`${
              active
                ? 'fill-emerald-50 stroke-emerald-300'
                : 'fill-slate-50/90 stroke-slate-200'
            } stroke-[1] shadow-xs`}
          />
          <text
            x="4"
            y="-2"
            className={`text-xs font-mono font-bold ${
              active ? 'fill-emerald-700' : 'fill-slate-800'
            }`}
          >
            {id}
          </text>
          <text
            x="4"
            y="9"
            className={`text-[9px] font-mono ${
              active ? 'fill-emerald-600 font-semibold' : 'fill-slate-400'
            }`}
          >
            {active ? `${currentVal.toFixed(1)}A` : 'OFF'}
          </text>
        </g>
      </g>
    );
  };

  // Resistor symbol (zigzag)
  const renderResistor = (x: number, y: number) => (
    <g transform={`translate(${x}, ${y})`}>
      <line x1="0" y1="-26" x2="0" y2="-18" className="stroke-slate-700 stroke-2" />
      <path
        d="M 0 -18 L 8 -14 L -8 -6 L 8 2 L -8 10 L 8 18 L 0 22"
        className="stroke-slate-800 stroke-2 fill-none stroke-linejoin-round"
      />
      <line x1="0" y1="22" x2="0" y2="30" className="stroke-slate-700 stroke-2" />
      <text x="14" y="6" className="text-xs font-mono font-semibold fill-slate-700">
        R
      </text>
    </g>
  );

  // Inductor symbol (coils)
  const renderInductor = (x: number, y: number) => (
    <g transform={`translate(${x}, ${y})`}>
      <line x1="0" y1="-30" x2="0" y2="-22" className="stroke-slate-700 stroke-2" />
      <path
        d="M 0 -22 C 14 -22 14 -12 0 -12 C 14 -12 14 -2 0 -2 C 14 -2 14 8 0 8 C 14 8 14 18 0 18"
        className="stroke-slate-800 stroke-2 fill-none"
      />
      <line x1="0" y1="18" x2="0" y2="26" className="stroke-slate-700 stroke-2" />
      <text x="14" y="2" className="text-xs font-mono font-semibold fill-slate-700">
        L
      </text>
    </g>
  );

  // AC Source symbol
  const renderACSource = (x: number, y: number, label: string) => (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="18" className="fill-white stroke-slate-800 stroke-2" />
      {/* Sine wave ~ */}
      <path
        d="M -9 0 Q -4.5 -9 0 0 Q 4.5 9 9 0"
        className="stroke-slate-800 stroke-2 fill-none"
      />
      <text
        x="-32"
        y="4"
        className="text-xs font-mono font-bold fill-slate-700 text-anchor-end"
      >
        {label}
      </text>
    </g>
  );

  // Ground symbol
  const renderGround = (x: number, y: number) => (
    <g transform={`translate(${x}, ${y})`}>
      <line x1="0" y1="0" x2="0" y2="10" className="stroke-slate-600 stroke-2" />
      <line x1="-12" y1="10" x2="12" y2="10" className="stroke-slate-600 stroke-2" />
      <line x1="-8" y1="14" x2="8" y2="14" className="stroke-slate-600 stroke-2" />
      <line x1="-4" y1="18" x2="4" y2="18" className="stroke-slate-600 stroke-2" />
    </g>
  );

  // Load block container (R + L in series)
  const renderLoadBranch = (x: number, yTop: number, yBottom: number) => {
    const yMid = (yTop + yBottom) / 2;
    const current = currentPoint?.io ?? 0;
    const voVal = currentPoint?.vo ?? 0;

    return (
      <g>
        {/* Load outer border box */}
        <rect
          x={x - 28}
          y={yTop - 6}
          width="76"
          height={yBottom - yTop + 12}
          rx="8"
          className="fill-slate-50/60 stroke-slate-200 stroke-1 stroke-dashed"
        />
        <text
          x={x + 38}
          y={yTop + 14}
          className="text-[10px] font-mono uppercase font-semibold fill-slate-400"
        >
          Load
        </text>

        {/* Polarity and Vo indicators */}
        <text x={x - 22} y={yTop + 18} className="text-sm font-bold fill-emerald-600">
          +
        </text>
        <text x={x - 20} y={yBottom - 10} className="text-base font-bold fill-slate-400">
          -
        </text>
        <text
          x={x - 22}
          y={yMid}
          className="text-[11px] font-mono font-bold fill-emerald-700"
        >
          Vo
        </text>

        {/* Connecting wire top */}
        <line x1={x} y1={yTop} x2={x} y2={yMid - 55} className="stroke-slate-700 stroke-2" />

        {/* Resistor */}
        {renderResistor(x, yMid - 30)}

        {/* Wire between R and L */}
        <line x1={x} y1={yMid - 5} x2={x} y2={yMid + 15} className="stroke-slate-700 stroke-2" />

        {/* Inductor */}
        {renderInductor(x, yMid + 42)}

        {/* Wire to bottom */}
        <line x1={x} y1={yMid + 68} x2={x} y2={yBottom} className="stroke-slate-700 stroke-2" />

        {/* Current flow arrow */}
        {current > 0.05 && (
          <g transform={`translate(${x + 16}, ${yMid})`}>
            <line x1="0" y1="-14" x2="0" y2="14" className="stroke-violet-600 stroke-2" />
            <polygon points="-4,8 4,8 0,16" className="fill-violet-600" />
            <text x="8" y="4" className="text-[10px] font-mono font-bold fill-violet-700">
              io={current.toFixed(1)}A
            </text>
          </g>
        )}
      </g>
    );
  };

  // Wire styling helper: active wire glow if carrying current
  const wireClass = (active: boolean) =>
    active
      ? 'stroke-emerald-600 stroke-[2.5] transition-colors duration-150'
      : 'stroke-slate-700 stroke-2 transition-colors duration-150';

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-3 select-none">
      <div className="w-full flex items-center justify-between mb-2 px-2 text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Schematic:</span>
          <span>{topology.fullName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Conducting
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"></span>
            Blocking
          </span>
          {topology.type === 'tcr' && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              Gate Firing
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full aspect-[16/10] max-h-[380px] bg-white rounded-lg border border-slate-200 shadow-xs flex items-center justify-center overflow-hidden">
        {/* Background circuit grid */}
        <div className="absolute inset-0 scope-grid opacity-30 pointer-events-none"></div>

        {/* TOPOLOGY-SPECIFIC VECTOR SCHEMATIC SVG */}
        <svg
          viewBox="0 0 600 360"
          className="w-full h-full max-h-[370px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* ============================================================ */}
          {/* 1. SINGLE-PHASE HALF-WAVE (DBR HW 1P & TCR HW 1P) */}
          {/* ============================================================ */}
          {(topology.key === 'dbr,hw,1p' || topology.key === 'tcr,hw,1p') && (
            <g>
              {/* AC Voltage Source */}
              {renderACSource(120, 180, 'Vs')}

              {/* Wire from AC source to switch */}
              <line
                x1="120"
                y1="162"
                x2="120"
                y2="90"
                className={wireClass(isConducting(topology.devices[0]))}
              />
              <line
                x1="120"
                y1="90"
                x2="250"
                y2="90"
                className={wireClass(isConducting(topology.devices[0]))}
              />

              {/* Switch (D1 or T1) */}
              {renderSwitch(topology.devices[0], 280, 90, 'right')}

              {/* Wire to Load */}
              <line
                x1="310"
                y1="90"
                x2="450"
                y2="90"
                className={wireClass(isConducting(topology.devices[0]))}
              />

              {/* Load Branch (R + L) */}
              {renderLoadBranch(450, 90, 270)}

              {/* Return Wire (Neutral) */}
              <line
                x1="450"
                y1="270"
                x2="120"
                y2="270"
                className={wireClass(isConducting(topology.devices[0]))}
              />
              <line
                x1="120"
                y1="270"
                x2="120"
                y2="198"
                className={wireClass(isConducting(topology.devices[0]))}
              />

              {/* Reference Neutral / Ground */}
              {renderGround(280, 270)}
              <text x="290" y="295" className="text-[10px] font-mono fill-slate-400">
                Neutral (N)
              </text>
            </g>
          )}

          {/* ============================================================ */}
          {/* 2. SINGLE-PHASE FULL-WAVE BRIDGE (DBR FW 1P & TCR FW 1P) */}
          {/* ============================================================ */}
          {(topology.key === 'dbr,fw,1p' || topology.key === 'tcr,fw,1p') && (
            <g>
              {/* AC Source */}
              {renderACSource(90, 180, 'Vs')}

              {/* Source wires to Bridge AC input legs */}
              <line
                x1="90"
                y1="162"
                x2="90"
                y2="140"
                className={wireClass(
                  isConducting(topology.devices[0]) || isConducting(topology.devices[3])
                )}
              />
              <line
                x1="90"
                y1="140"
                x2="210"
                y2="140"
                className={wireClass(
                  isConducting(topology.devices[0]) || isConducting(topology.devices[3])
                )}
              />

              <line
                x1="90"
                y1="198"
                x2="90"
                y2="220"
                className={wireClass(
                  isConducting(topology.devices[1]) || isConducting(topology.devices[2])
                )}
              />
              <line
                x1="90"
                y1="220"
                x2="310"
                y2="220"
                className={wireClass(
                  isConducting(topology.devices[1]) || isConducting(topology.devices[2])
                )}
              />

              {/* Bridge Column 1: D1 / T1 (top) and D4 / T4 (bottom) */}
              <line x1="210" y1="80" x2="210" y2="140" className="stroke-slate-700 stroke-2" />
              <line x1="210" y1="140" x2="210" y2="280" className="stroke-slate-700 stroke-2" />
              <circle cx="210" cy="140" r="3.5" className="fill-slate-800" />

              {/* Upper Left Switch: D1/T1 */}
              {renderSwitch(topology.devices[0], 210, 105, 'down')}

              {/* Lower Left Switch: D4/T4 */}
              {renderSwitch(topology.devices[3], 210, 245, 'down')}

              {/* Bridge Column 2: D3 / T3 (top) and D2 / T2 (bottom) */}
              <line x1="310" y1="80" x2="310" y2="220" className="stroke-slate-700 stroke-2" />
              <line x1="310" y1="220" x2="310" y2="280" className="stroke-slate-700 stroke-2" />
              <circle cx="310" cy="220" r="3.5" className="fill-slate-800" />

              {/* Upper Right Switch: D3/T3 */}
              {renderSwitch(topology.devices[2], 310, 105, 'down')}

              {/* Lower Right Switch: D2/T2 */}
              {renderSwitch(topology.devices[1], 310, 245, 'down')}

              {/* Positive DC Rail (Top) */}
              <line
                x1="210"
                y1="70"
                x2="470"
                y2="70"
                className={wireClass(
                  isConducting(topology.devices[0]) || isConducting(topology.devices[2])
                )}
              />
              <circle cx="210" cy="70" r="3.5" className="fill-slate-800" />
              <circle cx="310" cy="70" r="3.5" className="fill-slate-800" />

              {/* Negative DC Rail (Bottom) */}
              <line
                x1="210"
                y1="290"
                x2="470"
                y2="290"
                className={wireClass(
                  isConducting(topology.devices[1]) || isConducting(topology.devices[3])
                )}
              />
              <circle cx="210" cy="290" r="3.5" className="fill-slate-800" />
              <circle cx="310" cy="290" r="3.5" className="fill-slate-800" />

              {/* DC Rail Labels */}
              <text x="475" y="65" className="text-xs font-mono font-bold fill-emerald-600">
                + DC
              </text>
              <text x="475" y="295" className="text-xs font-mono font-bold fill-slate-400">
                - DC
              </text>

              {/* Load Branch */}
              {renderLoadBranch(470, 70, 290)}
            </g>
          )}

          {/* ============================================================ */}
          {/* 3. THREE-PHASE HALF-WAVE (DBR HW 3P & TCR HW 3P) */}
          {/* ============================================================ */}
          {(topology.key === 'dbr,hw,3p' || topology.key === 'tcr,hw,3p') && (
            <g>
              {/* 3-Phase AC Sources */}
              {renderACSource(90, 80, 'Va')}
              {renderACSource(90, 150, 'Vb')}
              {renderACSource(90, 220, 'Vc')}

              {/* Common Neutral for Star Source */}
              <line x1="90" y1="98" x2="90" y2="132" className="stroke-slate-500 stroke-1" />
              <line x1="90" y1="168" x2="90" y2="202" className="stroke-slate-500 stroke-1" />
              <line x1="90" y1="238" x2="90" y2="280" className="stroke-slate-500 stroke-1" />
              {renderGround(90, 280)}
              <text x="50" y="295" className="text-[10px] font-mono fill-slate-500">
                Neutral (N)
              </text>

              {/* Phase A to Switch 1 */}
              <line
                x1="108"
                y1="80"
                x2="240"
                y2="80"
                className={wireClass(isConducting(topology.devices[0]))}
              />
              {renderSwitch(topology.devices[0], 270, 80, 'right')}

              {/* Phase B to Switch 2 */}
              <line
                x1="108"
                y1="150"
                x2="240"
                y2="150"
                className={wireClass(isConducting(topology.devices[1]))}
              />
              {renderSwitch(topology.devices[1], 270, 150, 'right')}

              {/* Phase C to Switch 3 */}
              <line
                x1="108"
                y1="220"
                x2="240"
                y2="220"
                className={wireClass(isConducting(topology.devices[2]))}
              />
              {renderSwitch(topology.devices[2], 270, 220, 'right')}

              {/* Common DC Positive Bus Bar */}
              <line
                x1="300"
                y1="80"
                x2="380"
                y2="80"
                className={wireClass(isConducting(topology.devices[0]))}
              />
              <line
                x1="300"
                y1="150"
                x2="380"
                y2="150"
                className={wireClass(isConducting(topology.devices[1]))}
              />
              <line
                x1="300"
                y1="220"
                x2="380"
                y2="220"
                className={wireClass(isConducting(topology.devices[2]))}
              />

              <line
                x1="380"
                y1="80"
                x2="380"
                y2="220"
                className={wireClass(
                  isConducting(topology.devices[0]) ||
                    isConducting(topology.devices[1]) ||
                    isConducting(topology.devices[2])
                )}
              />
              <circle cx="380" cy="80" r="3.5" className="fill-slate-800" />
              <circle cx="380" cy="150" r="3.5" className="fill-slate-800" />
              <circle cx="380" cy="220" r="3.5" className="fill-slate-800" />

              {/* Wire to Load */}
              <line
                x1="380"
                y1="80"
                x2="480"
                y2="80"
                className={wireClass(
                  isConducting(topology.devices[0]) ||
                    isConducting(topology.devices[1]) ||
                    isConducting(topology.devices[2])
                )}
              />

              {/* Load */}
              {renderLoadBranch(480, 80, 280)}

              {/* Neutral return wire */}
              <line
                x1="480"
                y1="280"
                x2="90"
                y2="280"
                className={wireClass(
                  isConducting(topology.devices[0]) ||
                    isConducting(topology.devices[1]) ||
                    isConducting(topology.devices[2])
                )}
              />
            </g>
          )}

          {/* ============================================================ */}
          {/* 4. THREE-PHASE FULL-WAVE BRIDGE (DBR FW 3P & TCR FW 3P) */}
          {/* ============================================================ */}
          {(topology.key === 'dbr,fw,3p' || topology.key === 'tcr,fw,3p') && (
            <g>
              {/* 3-Phase Sources */}
              {renderACSource(65, 110, 'Va')}
              {renderACSource(65, 180, 'Vb')}
              {renderACSource(65, 250, 'Vc')}

              {/* Phase A to Leg 1 */}
              <line
                x1="83"
                y1="110"
                x2="175"
                y2="110"
                className={wireClass(
                  isConducting(topology.devices[0]) || isConducting(topology.devices[3])
                )}
              />
              <circle cx="175" cy="110" r="3.5" className="fill-slate-800" />

              {/* Phase B to Leg 2 */}
              <line
                x1="83"
                y1="180"
                x2="265"
                y2="180"
                className={wireClass(
                  isConducting(topology.devices[1]) || isConducting(topology.devices[4])
                )}
              />
              <circle cx="265" cy="180" r="3.5" className="fill-slate-800" />

              {/* Phase C to Leg 3 */}
              <line
                x1="83"
                y1="250"
                x2="355"
                y2="250"
                className={wireClass(
                  isConducting(topology.devices[2]) || isConducting(topology.devices[5])
                )}
              />
              <circle cx="355" cy="250" r="3.5" className="fill-slate-800" />

              {/* Leg 1: Phase A (Top: D1/T1, Bot: D4/T4) */}
              <line x1="175" y1="50" x2="175" y2="310" className="stroke-slate-700 stroke-2" />
              {renderSwitch(topology.devices[0], 175, 80, 'down')}
              {renderSwitch(topology.devices[3], 175, 270, 'down')}

              {/* Leg 2: Phase B (Top: D3/T3, Bot: D6/T6) */}
              <line x1="265" y1="50" x2="265" y2="310" className="stroke-slate-700 stroke-2" />
              {renderSwitch(topology.devices[2], 265, 80, 'down')}
              {renderSwitch(topology.devices[5], 265, 270, 'down')}

              {/* Leg 3: Phase C (Top: D5/T5, Bot: D2/T2) */}
              <line x1="355" y1="50" x2="355" y2="310" className="stroke-slate-700 stroke-2" />
              {renderSwitch(topology.devices[4], 355, 80, 'down')}
              {renderSwitch(topology.devices[1], 355, 270, 'down')}

              {/* Positive Bus (Top) */}
              <line
                x1="175"
                y1="40"
                x2="480"
                y2="40"
                className={wireClass(
                  isConducting(topology.devices[0]) ||
                    isConducting(topology.devices[2]) ||
                    isConducting(topology.devices[4])
                )}
              />
              <circle cx="175" cy="40" r="3.5" className="fill-slate-800" />
              <circle cx="265" cy="40" r="3.5" className="fill-slate-800" />
              <circle cx="355" cy="40" r="3.5" className="fill-slate-800" />

              {/* Negative Bus (Bottom) */}
              <line
                x1="175"
                y1="320"
                x2="480"
                y2="320"
                className={wireClass(
                  isConducting(topology.devices[1]) ||
                    isConducting(topology.devices[3]) ||
                    isConducting(topology.devices[5])
                )}
              />
              <circle cx="175" cy="320" r="3.5" className="fill-slate-800" />
              <circle cx="265" cy="320" r="3.5" className="fill-slate-800" />
              <circle cx="355" cy="320" r="3.5" className="fill-slate-800" />

              {/* DC Labels */}
              <text x="490" y="36" className="text-xs font-mono font-bold fill-emerald-600">
                + DC
              </text>
              <text x="490" y="324" className="text-xs font-mono font-bold fill-slate-400">
                - DC
              </text>

              {/* Load Branch */}
              {renderLoadBranch(480, 40, 320)}
            </g>
          )}
        </svg>

        {/* Floating Instantaneous Status Overlay */}
        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-xs border border-slate-200 rounded px-2.5 py-1.5 shadow-xs text-[11px] font-mono flex items-center gap-3">
          <div>
            <span className="text-slate-400">Driving: </span>
            <span className="font-semibold text-slate-800">
              {currentPoint?.activeVoltageName || '—'}
            </span>
          </div>
          <div className="w-[1px] h-3 bg-slate-200" />
          <div>
            <span className="text-slate-400">vo: </span>
            <span className="font-semibold text-emerald-600">
              {currentPoint ? `${currentPoint.vo.toFixed(1)} V` : '—'}
            </span>
          </div>
          <div className="w-[1px] h-3 bg-slate-200" />
          <div>
            <span className="text-slate-400">io: </span>
            <span className="font-semibold text-violet-600">
              {currentPoint ? `${currentPoint.io.toFixed(2)} A` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
