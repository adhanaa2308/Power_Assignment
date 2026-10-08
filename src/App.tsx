import React, { useState, useMemo, useEffect } from 'react';
import { TopologyKey, SimulationParams } from './types/converter';
import { TOPOLOGIES } from './simulation/topologies';
import { runSimulation } from './simulation/physicsEngine';
import { Header } from './components/Header';
import { TopologySelector } from './components/TopologySelector';
import { ParameterPanel } from './components/ParameterPanel';
import { SchematicRenderer } from './components/SchematicRenderer';
import { WaveformRenderer } from './components/WaveformRenderer';
import { PlaybackControls } from './components/PlaybackControls';
import { MeasurementsPanel } from './components/MeasurementsPanel';
import { EducationalExplanation } from './components/EducationalExplanation';
import { DeviceDetailModal } from './components/DeviceDetailModal';
import { TheoryGuideModal } from './components/TheoryGuideModal';

const DEFAULT_PARAMS: SimulationParams = {
  Vs: 230,
  f: 50,
  R: 10,
  L_mH: 40,
  alphaDeg: 30,
  cycles: 5
};

export default function App() {
  const [topologyKey, setTopologyKey] = useState<TopologyKey>('dbr,fw,1p');
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const activeTopology = TOPOLOGIES[topologyKey];

  // Run the physics simulation engine
  const simulationResult = useMemo(() => {
    return runSimulation(activeTopology, params);
  }, [activeTopology, params]);

  // Keep cursor in steady-state range when topology or params change
  useEffect(() => {
    const steadyStart = simulationResult.points.length - simulationResult.steadyStatePoints.length;
    setCursorIndex(steadyStart);
  }, [topologyKey, simulationResult.points.length, simulationResult.steadyStatePoints.length]);

  const activePoint = simulationResult.points[cursorIndex] || simulationResult.steadyStatePoints[0];

  const handleResetDefaults = () => {
    setParams(DEFAULT_PARAMS);
    setIsPlaying(false);
  };

  const handleSelectTopology = (key: TopologyKey) => {
    setTopologyKey(key);
    setSelectedDevice(null);
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col antialiased">
      {/* Top Bar Header */}
      <Header
        onResetDefaults={handleResetDefaults}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* SECTION 1: TOPOLOGY SELECTOR */}
        <section aria-label="Converter Topology Selection">
          <TopologySelector
            currentTopologyKey={topologyKey}
            onSelectTopology={handleSelectTopology}
          />
        </section>

        {/* SECTION 2: SPLIT VIEW - PARAMETERS & SCHEMATIC */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Parameter Controls (4 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <ParameterPanel
              params={params}
              onChangeParams={setParams}
              topology={activeTopology}
            />
          </div>

          {/* Right Column: Interactive Circuit Schematic (7 cols on lg) */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col h-full">
            <SchematicRenderer
              topology={activeTopology}
              currentPoint={activePoint}
              onSelectDevice={(dev) => setSelectedDevice(dev)}
              selectedDevice={selectedDevice}
            />
          </div>
        </section>

        {/* SECTION 3: TIME CONTROLS & ANIMATION */}
        <section aria-label="Simulation Time and Playback Controls">
          <PlaybackControls
            simulationResult={simulationResult}
            cursorIndex={cursorIndex}
            onCursorChange={setCursorIndex}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            playbackSpeed={playbackSpeed}
            onChangeSpeed={setPlaybackSpeed}
          />
        </section>

        {/* SECTION 4: OSCILLOSCOPE WAVEFORMS */}
        <section aria-label="Oscilloscope Waveforms">
          <WaveformRenderer
            simulationResult={simulationResult}
            cursorIndex={cursorIndex}
            onCursorChange={setCursorIndex}
            selectedDevice={selectedDevice}
          />
        </section>

        {/* SECTION 5: MEASUREMENTS PANEL */}
        <section aria-label="Calculated Quantities and Steady State Measurements">
          <MeasurementsPanel
            measurements={simulationResult.measurements}
            topology={activeTopology}
            currentPoint={activePoint}
            steadyStatePoints={simulationResult.steadyStatePoints}
          />
        </section>

        {/* SECTION 6: EDUCATIONAL WHAT IS HAPPENING */}
        <section aria-label="Educational Explanation">
          <EducationalExplanation
            currentPoint={activePoint}
            topology={activeTopology}
            params={params}
          />
        </section>
      </main>

      {/* Device Inspector Modal */}
      <DeviceDetailModal
        deviceName={selectedDevice}
        onClose={() => setSelectedDevice(null)}
        topology={activeTopology}
        currentPoint={activePoint}
        params={params}
      />

      {/* Theory Guide Modal */}
      <TheoryGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onSelectTopology={handleSelectTopology}
        currentTopologyKey={topologyKey}
      />

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        Power Electronics Converter Simulator · Educational Laboratory Edition
      </footer>
    </div>
  );
}
