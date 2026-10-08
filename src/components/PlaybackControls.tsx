import React, { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, FastForward } from 'lucide-react';
import { SimulationResult } from '../types/converter';

interface PlaybackControlsProps {
  simulationResult: SimulationResult;
  cursorIndex: number;
  onCursorChange: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  simulationResult,
  cursorIndex,
  onCursorChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed
}) => {
  const { points, steadyStatePoints } = simulationResult;
  const steadyStartIdx = points.length - steadyStatePoints.length;
  const steadyEndIdx = points.length - 1;

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const elapsed = timestamp - lastTimeRef.current;

      // Points per second in steady cycle
      // Steady state cycle = 1 period. Typically 1500 points per cycle.
      // At 1x speed, 1 cycle completes in 1.0 second for clear human visualization
      const pointsPerSecond = (steadyStatePoints.length / 1.5) * playbackSpeed;
      const pointsToAdvance = Math.max(1, Math.round((pointsPerSecond * elapsed) / 1000));

      if (pointsToAdvance > 0) {
        let nextIdx = cursorIndex + pointsToAdvance;
        if (nextIdx > steadyEndIdx) {
          nextIdx = steadyStartIdx + ((nextIdx - steadyStartIdx) % steadyStatePoints.length);
        }
        onCursorChange(nextIdx);
        lastTimeRef.current = timestamp;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, cursorIndex, steadyStatePoints.length, steadyStartIdx, steadyEndIdx, playbackSpeed, onCursorChange]);

  const handleReset = () => {
    onCursorChange(steadyStartIdx);
  };

  const handleStepBack = () => {
    const stepSize = Math.max(1, Math.round(steadyStatePoints.length / 72)); // 5 degrees
    let nextIdx = cursorIndex - stepSize;
    if (nextIdx < steadyStartIdx) nextIdx = steadyEndIdx;
    onCursorChange(nextIdx);
  };

  const handleStepForward = () => {
    const stepSize = Math.max(1, Math.round(steadyStatePoints.length / 72)); // 5 degrees
    let nextIdx = cursorIndex + stepSize;
    if (nextIdx > steadyEndIdx) nextIdx = steadyStartIdx;
    onCursorChange(nextIdx);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onCursorChange(val);
  };

  const activePoint = points[cursorIndex] || steadyStatePoints[0];

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
      {/* Play/Pause, Step & Reset buttons */}
      <div className="flex items-center gap-1.5 w-full md:w-auto justify-center md:justify-start">
        <button
          onClick={onTogglePlay}
          className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            isPlaying
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
          title={isPlaying ? 'Pause animation' : 'Run animation'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span className="font-mono text-[11px]">{isPlaying ? 'Pause' : 'Run'}</span>
        </button>

        <button
          onClick={handleReset}
          className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          title="Reset to cycle start (0°)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleStepBack}
          className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          title="Step backward 5°"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleStepForward}
          className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          title="Step forward 5°"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Speed Selector */}
        <div className="flex items-center bg-slate-100 rounded p-0.5 ml-2 border border-slate-200">
          {[0.25, 0.5, 1, 2].map((spd) => (
            <button
              key={spd}
              onClick={() => onChangeSpeed(spd)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                playbackSpeed === spd
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Synchronized Timeline Cursor Scrubber */}
      <div className="flex items-center gap-3 w-full md:w-1/2">
        <span className="text-[11px] font-mono text-slate-500 shrink-0">Time Cursor:</span>
        <input
          type="range"
          min={steadyStartIdx}
          max={steadyEndIdx}
          value={cursorIndex}
          onChange={handleSliderChange}
          className="w-full accent-slate-900 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
        />
        <div className="flex items-center gap-1 shrink-0 font-mono text-[11px] text-slate-700 font-semibold w-16 text-right">
          <span>{activePoint.thetaDeg.toFixed(0)}°</span>
        </div>
      </div>
    </div>
  );
};
