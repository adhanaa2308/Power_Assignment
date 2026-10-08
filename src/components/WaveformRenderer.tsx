import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { SimulationResult, SimulationPoint, TopologyConfig } from '../types/converter';
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Clock, Compass } from 'lucide-react';

interface WaveformRendererProps {
  simulationResult: SimulationResult;
  cursorIndex: number;
  onCursorChange: (index: number) => void;
  selectedDevice: string | null;
}

export const WaveformRenderer: React.FC<WaveformRendererProps> = ({
  simulationResult,
  cursorIndex,
  onCursorChange,
  selectedDevice
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Display toggles
  const [showVs, setShowVs] = useState(true);
  const [showVo, setShowVo] = useState(true);
  const [showIo, setShowIo] = useState(true);
  const [showGate, setShowGate] = useState(true);
  const [showDeviceCurrent, setShowDeviceCurrent] = useState(false);
  const [axisMode, setAxisMode] = useState<'degrees' | 'time'>('degrees');
  const [cyclesView, setCyclesView] = useState<'1' | '2' | 'all'>('1');
  const [zoomLevel, setZoomLevel] = useState(1);

  const [isDragging, setIsDragging] = useState(false);

  const { points, steadyStatePoints, topology, period } = simulationResult;

  // Points to display based on cycle selection
  const displayedPoints = useMemo(() => {
    if (cyclesView === 'all') return points;
    if (cyclesView === '1') return steadyStatePoints;
    // 2 cycles
    const ptsPerCycle = steadyStatePoints.length;
    const startIndex = Math.max(0, points.length - ptsPerCycle * 2);
    return points.slice(startIndex);
  }, [points, steadyStatePoints, cyclesView]);

  // Global index mapping
  const startGlobalIdx = useMemo(() => {
    if (cyclesView === 'all') return 0;
    if (cyclesView === '1') return points.length - steadyStatePoints.length;
    return Math.max(0, points.length - steadyStatePoints.length * 2);
  }, [cyclesView, points.length, steadyStatePoints.length]);

  // Map pointer X coordinate to points array index
  const handlePointerAtX = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const plotWidth = rect.width;
      const ratio = Math.max(0, Math.min(1, x / plotWidth));

      const localIdx = Math.round(ratio * (displayedPoints.length - 1));
      const targetGlobalIdx = startGlobalIdx + localIdx;
      onCursorChange(Math.max(0, Math.min(points.length - 1, targetGlobalIdx)));
    },
    [displayedPoints.length, startGlobalIdx, points.length, onCursorChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handlePointerAtX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging || e.buttons === 1) {
      handlePointerAtX(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      handlePointerAtX(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handlePointerAtX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Render waveforms on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI Retina displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#0f172a'; // Deep oscilloscope slate-900
    ctx.fillRect(0, 0, width, height);

    // Grid properties
    const numSubplots = 3 + (topology.type === 'tcr' && showGate ? 1 : 0);
    const subplotHeight = height / numSubplots;

    // Draw Oscilloscope Grid lines
    ctx.strokeStyle = '#1e293b'; // Slate-800
    ctx.lineWidth = 1;

    // Horizontal division lines
    for (let i = 1; i < numSubplots; i++) {
      const y = i * subplotHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Subdivisions (CRT style)
    const vertDivs = 12;
    for (let i = 0; i <= vertDivs; i++) {
      const x = (i * width) / vertDivs;
      ctx.strokeStyle = i % 2 === 0 ? '#1e293b' : '#142033';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Determine value extents
    let maxV = 100;
    let maxI = 5;

    for (const pt of displayedPoints) {
      if (Math.abs(pt.vs) > maxV) maxV = Math.abs(pt.vs);
      if (pt.vs_b && Math.abs(pt.vs_b) > maxV) maxV = Math.abs(pt.vs_b);
      if (pt.vs_c && Math.abs(pt.vs_c) > maxV) maxV = Math.abs(pt.vs_c);
      if (Math.abs(pt.vo) > maxV) maxV = Math.abs(pt.vo);
      if (pt.io > maxI) maxI = pt.io;
    }
    maxV *= 1.15; // headroom
    maxI *= 1.25;

    const N = displayedPoints.length;
    if (N === 0) return;

    const getX = (i: number) => (i / (N - 1)) * width;

    // -------------------------------------------------------------
    // SUBPLOT 1: Source Voltage vs(t)
    // -------------------------------------------------------------
    let currentYOffset = 0;
    const h1 = subplotHeight;
    const midY1 = currentYOffset + h1 / 2;

    // Zero reference line
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY1);
    ctx.lineTo(width, midY1);
    ctx.stroke();
    ctx.setLineDash([]);

    // Subplot 1 Label
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('CH 1: SOURCE VOLTAGE vs(t)', 8, currentYOffset + 14);
    ctx.fillText(`±${maxV.toFixed(0)} V`, width - 56, currentYOffset + 14);

    if (showVs) {
      // Phase A
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#38bdf8'; // Sky blue
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = getX(i);
        const y = midY1 - (displayedPoints[i].vs / maxV) * (h1 * 0.42);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // If 3-phase, render Phase B and Phase C
      if (topology.phases === 3) {
        // Phase B
        ctx.strokeStyle = '#fbbf24'; // Amber
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const pt = displayedPoints[i];
          if (pt.vs_b !== undefined) {
            const x = getX(i);
            const y = midY1 - (pt.vs_b / maxV) * (h1 * 0.42);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Phase C
        ctx.strokeStyle = '#f87171'; // Red
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const pt = displayedPoints[i];
          if (pt.vs_c !== undefined) {
            const x = getX(i);
            const y = midY1 - (pt.vs_c / maxV) * (h1 * 0.42);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }

    // -------------------------------------------------------------
    // SUBPLOT 2: Output Voltage vo(t)
    // -------------------------------------------------------------
    currentYOffset += subplotHeight;
    const h2 = subplotHeight;
    const midY2 = currentYOffset + h2 * 0.75; // ground line closer to bottom since vo >= 0 mostly

    ctx.strokeStyle = '#334155';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY2);
    ctx.lineTo(width, midY2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.fillText('CH 2: OUTPUT VOLTAGE vo(t)', 8, currentYOffset + 14);
    ctx.fillText(`${maxV.toFixed(0)} V pk`, width - 56, currentYOffset + 14);

    if (showVo) {
      // Glow effect for vo
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#10b981'; // Emerald 500
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = getX(i);
        const y = midY2 - (displayedPoints[i].vo / maxV) * (h2 * 0.65);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // -------------------------------------------------------------
    // SUBPLOT 3: Load Current io(t)
    // -------------------------------------------------------------
    currentYOffset += subplotHeight;
    const h3 = subplotHeight;
    const midY3 = currentYOffset + h3 * 0.8;

    ctx.strokeStyle = '#334155';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY3);
    ctx.lineTo(width, midY3);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.fillText('CH 3: LOAD CURRENT io(t)', 8, currentYOffset + 14);
    ctx.fillText(`${maxI.toFixed(1)} A pk`, width - 56, currentYOffset + 14);

    if (showIo) {
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#c084fc'; // Light purple / violet
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = getX(i);
        const y = midY3 - (displayedPoints[i].io / maxI) * (h3 * 0.7);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Highlight selected device current if toggled
      if (showDeviceCurrent && selectedDevice) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#34d399'; // Bright mint green
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const dCurr = displayedPoints[i].deviceCurrents[selectedDevice] ?? 0;
          const x = getX(i);
          const y = midY3 - (dCurr / maxI) * (h3 * 0.7);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // -------------------------------------------------------------
    // SUBPLOT 4: Gate Pulses (for TCR)
    // -------------------------------------------------------------
    if (topology.type === 'tcr' && showGate) {
      currentYOffset += subplotHeight;
      const h4 = subplotHeight;
      ctx.fillStyle = '#64748b';
      ctx.fillText('CH 4: GATE FIRING PULSES', 8, currentYOffset + 14);

      const deviceList = topology.devices;
      const stepH = (h4 - 20) / deviceList.length;

      deviceList.forEach((devName, devIdx) => {
        const baseLineY = currentYOffset + 24 + devIdx * stepH + stepH * 0.7;
        const pulseHighY = baseLineY - stepH * 0.6;

        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(devName, 8, baseLineY - 2);

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        for (let i = 0; i < N; i++) {
          const isPulse = displayedPoints[i].gatePulses[devName] ?? false;
          const x = getX(i);
          const y = isPulse ? pulseHighY : baseLineY;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
    }

    // -------------------------------------------------------------
    // SIMULATION TIME CURSOR (Synchronized Scrubber)
    // -------------------------------------------------------------
    // Calculate cursor local X
    const relativeCursorIdx = cursorIndex - startGlobalIdx;
    if (relativeCursorIdx >= 0 && relativeCursorIdx < N) {
      const cursorX = getX(relativeCursorIdx);

      // Cursor vertical line
      ctx.strokeStyle = '#38bdf8'; // Glowing sky blue cursor
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();

      // Top handle marker
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(cursorX - 6, 0);
      ctx.lineTo(cursorX + 6, 0);
      ctx.lineTo(cursorX, 8);
      ctx.closePath();
      ctx.fill();

      // Bottom handle marker
      ctx.beginPath();
      ctx.moveTo(cursorX - 6, height);
      ctx.lineTo(cursorX + 6, height);
      ctx.lineTo(cursorX, height - 8);
      ctx.closePath();
      ctx.fill();

      // Active point highlight dots
      const activePt = displayedPoints[relativeCursorIdx];
      if (activePt) {
        // Dot on vs
        if (showVs) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          const yVs = midY1 - (activePt.vs / maxV) * (h1 * 0.42);
          ctx.arc(cursorX, yVs, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Dot on vo
        if (showVo) {
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          const yVo = midY2 - (activePt.vo / maxV) * (h2 * 0.65);
          ctx.arc(cursorX, yVo, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Dot on io
        if (showIo) {
          ctx.fillStyle = '#c084fc';
          ctx.beginPath();
          const yIo = midY3 - (activePt.io / maxI) * (h3 * 0.7);
          ctx.arc(cursorX, yIo, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [
    displayedPoints,
    showVs,
    showVo,
    showIo,
    showGate,
    showDeviceCurrent,
    selectedDevice,
    cursorIndex,
    startGlobalIdx,
    topology,
    zoomLevel
  ]);

  const activePoint = points[cursorIndex] || steadyStatePoints[0];

  return (
    <div className="w-full flex flex-col bg-slate-900 text-slate-100 rounded-lg border border-slate-800 shadow-sm overflow-hidden select-none">
      {/* Oscilloscope Header & Channel Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950/80 border-b border-slate-800 text-xs">
        {/* Channel Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-slate-400 font-semibold mr-1">CHANNELS:</span>

          {/* CH1: Vs */}
          <button
            onClick={() => setShowVs(!showVs)}
            className={`px-2 py-1 rounded text-[11px] font-mono font-medium flex items-center gap-1.5 transition-colors ${
              showVs
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'bg-slate-800 text-slate-500 border border-transparent hover:text-slate-300'
            }`}
            title="Toggle Source Voltage"
          >
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>vs(t)</span>
          </button>

          {/* CH2: Vo */}
          <button
            onClick={() => setShowVo(!showVo)}
            className={`px-2 py-1 rounded text-[11px] font-mono font-medium flex items-center gap-1.5 transition-colors ${
              showVo
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-500 border border-transparent hover:text-slate-300'
            }`}
            title="Toggle Output Voltage"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>vo(t)</span>
          </button>

          {/* CH3: Io */}
          <button
            onClick={() => setShowIo(!showIo)}
            className={`px-2 py-1 rounded text-[11px] font-mono font-medium flex items-center gap-1.5 transition-colors ${
              showIo
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                : 'bg-slate-800 text-slate-500 border border-transparent hover:text-slate-300'
            }`}
            title="Toggle Load Current"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>io(t)</span>
          </button>

          {/* CH4: Gate Pulses (if TCR) */}
          {topology.type === 'tcr' && (
            <button
              onClick={() => setShowGate(!showGate)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-medium flex items-center gap-1.5 transition-colors ${
                showGate
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-500 border border-transparent hover:text-slate-300'
              }`}
              title="Toggle Thyristor Gate Pulses"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Gate</span>
            </button>
          )}

          {/* Device Current Toggle */}
          {selectedDevice && (
            <button
              onClick={() => setShowDeviceCurrent(!showDeviceCurrent)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-medium flex items-center gap-1.5 transition-colors ${
                showDeviceCurrent
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                  : 'bg-slate-800 text-slate-400 border border-transparent hover:text-slate-300'
              }`}
              title={`View current through ${selectedDevice}`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>i_{selectedDevice}</span>
            </button>
          )}
        </div>

        {/* View Options & Zoom */}
        <div className="flex items-center gap-2">
          {/* Axis Mode */}
          <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-800">
            <button
              onClick={() => setAxisMode('degrees')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                axisMode === 'degrees'
                  ? 'bg-slate-800 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Angle (θ°)
            </button>
            <button
              onClick={() => setAxisMode('time')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                axisMode === 'time'
                  ? 'bg-slate-800 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Time (ms)
            </button>
          </div>

          {/* Cycle Span Selector */}
          <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-800">
            <button
              onClick={() => setCyclesView('1')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                cyclesView === '1'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show 1 steady-state cycle"
            >
              1 Cyc
            </button>
            <button
              onClick={() => setCyclesView('2')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                cyclesView === '2'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show 2 steady-state cycles"
            >
              2 Cyc
            </button>
            <button
              onClick={() => setCyclesView('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                cyclesView === 'all'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show all simulated cycles"
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Oscilloscope Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[360px] cursor-crosshair overflow-hidden touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Readout HUD floating overlay */}
        <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur-xs border border-slate-800/90 rounded px-2.5 py-1.5 text-[11px] font-mono flex items-center gap-3 shadow-md pointer-events-none">
          <div>
            <span className="text-slate-500">θ: </span>
            <span className="font-semibold text-sky-400">
              {activePoint.thetaDeg.toFixed(1)}°
            </span>
          </div>
          <div className="w-[1px] h-3 bg-slate-800" />
          <div>
            <span className="text-slate-500">t: </span>
            <span className="font-semibold text-slate-300">
              {(activePoint.t * 1000).toFixed(2)} ms
            </span>
          </div>
          <div className="w-[1px] h-3 bg-slate-800" />
          <div>
            <span className="text-slate-500">vo: </span>
            <span className="font-semibold text-emerald-400">
              {activePoint.vo.toFixed(1)} V
            </span>
          </div>
          <div className="w-[1px] h-3 bg-slate-800" />
          <div>
            <span className="text-slate-500">io: </span>
            <span className="font-semibold text-purple-400">
              {activePoint.io.toFixed(2)} A
            </span>
          </div>
        </div>

        {/* Interactive Scrub Guide Hint */}
        <div className="absolute bottom-1 right-2 text-[10px] font-mono text-slate-500 pointer-events-none">
          Click or drag across waveform to scrub simulation time
        </div>
      </div>

      {/* Axis Scale Calibration Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950 text-[10px] font-mono text-slate-400 border-t border-slate-800">
        <div>
          {axisMode === 'degrees' ? (
            <span>Scale: 30° / div · Total: {cyclesView === '1' ? '360°' : cyclesView === '2' ? '720°' : `${points.length / 1500 * 360}°`}</span>
          ) : (
            <span>Scale: {(period * 1000 / 12).toFixed(1)} ms / div · Period: {(period * 1000).toFixed(1)} ms</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>Active Device(s): <strong className="text-emerald-400 font-semibold">{Object.entries(activePoint.deviceStates).filter(([_, on]) => on).map(([name]) => name).join(', ') || 'None (Blocking)'}</strong></span>
        </div>
      </div>
    </div>
  );
};
