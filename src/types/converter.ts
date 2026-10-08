export type ConverterType = 'dbr' | 'tcr';
export type RectificationType = 'fw' | 'hw';
export type PhaseCount = 1 | 3;

export type TopologyKey = 
  | 'dbr,fw,1p'
  | 'dbr,hw,1p'
  | 'dbr,fw,3p'
  | 'dbr,hw,3p'
  | 'tcr,fw,1p'
  | 'tcr,hw,1p'
  | 'tcr,fw,3p'
  | 'tcr,hw,3p';

export interface TopologyConfig {
  key: TopologyKey;
  type: ConverterType;
  rectification: RectificationType;
  phases: PhaseCount;
  title: string;
  fullName: string;
  deviceType: 'diode' | 'thyristor';
  devicePrefix: 'D' | 'T';
  devices: string[];
  pulseCount: number; // e.g., 1, 2, 3, 6 pulses per cycle
  description: string;
  theoreticalFormula: string;
}

export interface SimulationParams {
  Vs: number;        // Supply RMS voltage (V), Phase voltage
  f: number;         // Frequency (Hz)
  R: number;         // Load resistance (Ohms)
  L_mH: number;      // Load inductance (mH)
  alphaDeg: number;  // Firing angle (degrees, 0 to 180)
  cycles: number;    // Number of cycles to simulate (e.g. 5)
}

export interface SimulationPoint {
  t: number;          // Time in seconds
  theta: number;      // Electrical angle in radians
  thetaDeg: number;   // Electrical angle in degrees (0 to 360 in cycle)
  globalThetaDeg: number; // Total degrees from t=0
  vs: number;         // Phase A voltage (or single-phase Vs)
  vs_b?: number;      // Phase B voltage (for 3-phase)
  vs_c?: number;      // Phase C voltage (for 3-phase)
  vo: number;         // Output voltage across load (V)
  io: number;         // Output load current (A)
  didt: number;       // Rate of change of current (A/s)
  deviceStates: Record<string, boolean>; // e.g. { T1: true, T2: false }
  deviceCurrents: Record<string, number>; // Current flowing through each device
  gatePulses: Record<string, boolean>;    // Gate pulse active (for TCR)
  activeVoltageName: string; // e.g. "Vs", "Va - Vb", "0V (Blocking)"
}

export interface Measurements {
  voPeak: number;
  voAvg: number;
  voRms: number;
  ioPeak: number;
  ioAvg: number;
  ioRms: number;
  realPower: number;     // Average power P = mean(vo * io)
  apparentPower: number; // S = Vs_rms * Is_rms
  loadApparentPower: number; // Vo_rms * Io_rms
  powerFactor: number;   // P / S
  firingAngleDeg: number;
  conductionAngleDeg: number; // Device conduction angle
  formFactor: number;    // Vo_rms / Vo_avg
  rippleFactor: number;  // sqrt((Vo_rms/Vo_avg)^2 - 1)
  currentRipplePercent: number;
  isContinuousConduction: boolean;
  theoreticalVoAvg: number;
}

export interface SimulationResult {
  params: SimulationParams;
  topology: TopologyConfig;
  points: SimulationPoint[];
  steadyStatePoints: SimulationPoint[];
  period: number;        // 1 / f
  dt: number;
  omega: number;         // 2 * pi * f
  measurements: Measurements;
}

export interface DeviceInfo {
  name: string;
  type: 'diode' | 'thyristor';
  isConducting: boolean;
  current: number;
  peakCurrent: number;
  conductionIntervalDeg: string;
  gatePulseActive?: boolean;
  triggerAngleDeg?: number;
  phaseConnection: string;
}
