import {
  TopologyConfig,
  SimulationParams,
  SimulationPoint,
  SimulationResult,
  Measurements
} from '../types/converter';

/**
 * Normalizes angle to [0, 360) degrees
 */
export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Checks if angle is within [startDeg, endDeg) modulo 360
 */
export function isAngleBetween(deg: number, startDeg: number, endDeg: number): boolean {
  const d = normalizeDeg(deg);
  const s = normalizeDeg(startDeg);
  const e = normalizeDeg(endDeg);

  if (s <= e) {
    return d >= s && d < e;
  } else {
    // Wraps around 360
    return d >= s || d < e;
  }
}

/**
 * Simulates the selected power converter topology over multiple electrical cycles.
 */
export function runSimulation(topology: TopologyConfig, params: SimulationParams): SimulationResult {
  const { Vs, f, R, L_mH, alphaDeg, cycles } = params;
  const L = Math.max(0, L_mH * 1e-3); // convert mH to Henries
  const omega = 2 * Math.PI * f;
  const period = 1 / f;
  
  // 1500 points per cycle gives 7500 points for 5 cycles - high resolution & responsive
  const pointsPerCycle = 1500;
  const totalPoints = pointsPerCycle * cycles;
  const totalDuration = cycles * period;
  const dt = totalDuration / totalPoints;

  // Peak phase voltage
  const Vm = Math.sqrt(2) * Vs;

  const points: SimulationPoint[] = [];

  // Internal states
  let current_i = 0;
  
  // State tracking for TCR converters
  // For TCR HW 1P:
  let tcr_hw_1p_on = false;

  // For TCR FW 1P:
  // Active pair: 0: none, 1: (T1,T2), 2: (T3,T4)
  let tcr_fw_1p_activePair: 0 | 1 | 2 = 0;

  // For TCR HW 3P:
  // Active thyristor: 0: none, 1: T1(Va), 2: T2(Vb), 3: T3(Vc)
  let tcr_hw_3p_active: 0 | 1 | 2 | 3 = 0;

  // For TCR FW 3P:
  // Active state (1 through 6):
  // 1: (T1, T6) -> Vab
  // 2: (T1, T2) -> Vac
  // 3: (T3, T2) -> Vbc
  // 4: (T3, T4) -> Vba
  // 5: (T5, T4) -> Vca
  // 6: (T5, T6) -> Vcb
  let tcr_fw_3p_activeState: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0;

  // Pulse width for thyristor triggering in degrees
  const pulseWidthDeg = 8.0;

  for (let k = 0; k < totalPoints; k++) {
    const t = k * dt;
    const globalThetaRad = omega * t;
    const globalThetaDeg = (globalThetaRad * 180) / Math.PI;
    const thetaDeg = normalizeDeg(globalThetaDeg);
    const thetaRad = (thetaDeg * Math.PI) / 180;

    // Source voltages
    // Single-phase
    const vs = Vm * Math.sin(globalThetaRad);

    // Three-phase line-to-neutral voltages
    const vs_a = vs;
    const vs_b = Vm * Math.sin(globalThetaRad - (2 * Math.PI) / 3);
    const vs_c = Vm * Math.sin(globalThetaRad - (4 * Math.PI) / 3);

    // Line-to-line voltages
    const vab = vs_a - vs_b;
    const vac = vs_a - vs_c;
    const vbc = vs_b - vs_c;
    const vba = vs_b - vs_a;
    const vca = vs_c - vs_a;
    const vcb = vs_c - vs_b;

    let vo = 0;
    let activeVoltageName = '0 V';
    const deviceStates: Record<string, boolean> = {};
    const deviceCurrents: Record<string, number> = {};
    const gatePulses: Record<string, boolean> = {};

    // Initialize all topology devices to false / 0
    for (const d of topology.devices) {
      deviceStates[d] = false;
      deviceCurrents[d] = 0;
      if (topology.type === 'tcr') {
        gatePulses[d] = false;
      }
    }

    // ==========================================
    // TOPOLOGY 1: DBR HW 1P
    // ==========================================
    if (topology.key === 'dbr,hw,1p') {
      // D1 conducts if vs > 0 OR if current > 0 (freewheeling into negative vs due to L)
      if (vs > 0 || current_i > 0.001) {
        deviceStates['D1'] = true;
        vo = vs;
        activeVoltageName = 'Vs';
      } else {
        deviceStates['D1'] = false;
        vo = 0;
        activeVoltageName = '0 V (Blocking)';
      }
    }

    // ==========================================
    // TOPOLOGY 2: DBR FW 1P
    // ==========================================
    else if (topology.key === 'dbr,fw,1p') {
      // D1, D2 conduct for positive half-cycle
      // D3, D4 conduct for negative half-cycle
      if (vs >= 0) {
        deviceStates['D1'] = true;
        deviceStates['D2'] = true;
        vo = vs;
        activeVoltageName = '+Vs';
      } else {
        deviceStates['D3'] = true;
        deviceStates['D4'] = true;
        vo = -vs; // Rectified
        activeVoltageName = '-Vs';
      }
    }

    // ==========================================
    // TOPOLOGY 3: DBR HW 3P
    // ==========================================
    else if (topology.key === 'dbr,hw,3p') {
      // Diode with highest phase voltage conducts
      const maxV = Math.max(vs_a, vs_b, vs_c);
      if (maxV === vs_a) {
        deviceStates['D1'] = true;
        vo = vs_a;
        activeVoltageName = 'Va';
      } else if (maxV === vs_b) {
        deviceStates['D2'] = true;
        vo = vs_b;
        activeVoltageName = 'Vb';
      } else {
        deviceStates['D3'] = true;
        vo = vs_c;
        activeVoltageName = 'Vc';
      }
    }

    // ==========================================
    // TOPOLOGY 4: DBR FW 3P
    // ==========================================
    else if (topology.key === 'dbr,fw,3p') {
      // 6-diode bridge.
      // Top group: D1(Va), D3(Vb), D5(Vc)
      // Bottom group: D4(Va), D6(Vb), D2(Vc)
      let topPhase = 'a';
      let botPhase = 'b';
      let maxV = vs_a;
      let minV = vs_a;

      if (vs_b > maxV) { maxV = vs_b; topPhase = 'b'; }
      if (vs_c > maxV) { maxV = vs_c; topPhase = 'c'; }

      if (vs_b < minV) { minV = vs_b; botPhase = 'b'; }
      if (vs_c < minV) { minV = vs_c; botPhase = 'c'; }

      // Top diode
      if (topPhase === 'a') deviceStates['D1'] = true;
      else if (topPhase === 'b') deviceStates['D3'] = true;
      else deviceStates['D5'] = true;

      // Bottom diode
      if (botPhase === 'a') deviceStates['D4'] = true;
      else if (botPhase === 'b') deviceStates['D6'] = true;
      else deviceStates['D2'] = true;

      vo = maxV - minV;
      activeVoltageName = `V${topPhase}${botPhase}`;
    }

    // ==========================================
    // TOPOLOGY 5: TCR HW 1P
    // ==========================================
    else if (topology.key === 'tcr,hw,1p') {
      const pulseT1 = isAngleBetween(thetaDeg, alphaDeg, alphaDeg + pulseWidthDeg);
      gatePulses['T1'] = pulseT1;

      // Firing condition: pulse active and forward voltage > 0
      if (pulseT1 && vs > 0) {
        tcr_hw_1p_on = true;
      }

      // If current extinguished and no driving pulse, turn off
      if (current_i <= 0.0001 && !pulseT1) {
        tcr_hw_1p_on = false;
      }

      if (tcr_hw_1p_on) {
        deviceStates['T1'] = true;
        vo = vs;
        activeVoltageName = 'Vs';
      } else {
        deviceStates['T1'] = false;
        vo = 0;
        activeVoltageName = '0 V (Blocking)';
      }
    }

    // ==========================================
    // TOPOLOGY 6: TCR FW 1P
    // ==========================================
    else if (topology.key === 'tcr,fw,1p') {
      const pulsePair1 = isAngleBetween(thetaDeg, alphaDeg, alphaDeg + pulseWidthDeg);
      const pulsePair2 = isAngleBetween(thetaDeg, alphaDeg + 180, alphaDeg + 180 + pulseWidthDeg);

      gatePulses['T1'] = pulsePair1;
      gatePulses['T2'] = pulsePair1;
      gatePulses['T3'] = pulsePair2;
      gatePulses['T4'] = pulsePair2;

      // Trigger Pair 1 (T1, T2)
      if (pulsePair1) {
        if (vs > 0 || current_i > 0.001) {
          tcr_fw_1p_activePair = 1;
        }
      }

      // Trigger Pair 2 (T3, T4)
      if (pulsePair2) {
        if (-vs > 0 || current_i > 0.001) {
          tcr_fw_1p_activePair = 2;
        }
      }

      // Check current extinction
      if (current_i <= 0.0001 && !pulsePair1 && !pulsePair2) {
        // If driving voltage is negative, device extinguishes
        if (tcr_fw_1p_activePair === 1 && vs <= 0) {
          tcr_fw_1p_activePair = 0;
        } else if (tcr_fw_1p_activePair === 2 && -vs <= 0) {
          tcr_fw_1p_activePair = 0;
        }
      }

      if (tcr_fw_1p_activePair === 1) {
        deviceStates['T1'] = true;
        deviceStates['T2'] = true;
        vo = vs;
        activeVoltageName = '+Vs';
      } else if (tcr_fw_1p_activePair === 2) {
        deviceStates['T3'] = true;
        deviceStates['T4'] = true;
        vo = -vs;
        activeVoltageName = '-Vs';
      } else {
        vo = 0;
        activeVoltageName = '0 V (DCM Discontinuous)';
      }
    }

    // ==========================================
    // TOPOLOGY 7: TCR HW 3P
    // ==========================================
    else if (topology.key === 'tcr,hw,3p') {
      // Natural firing angles: 30°, 150°, 270°
      const f1 = normalizeDeg(30 + alphaDeg);
      const f2 = normalizeDeg(150 + alphaDeg);
      const f3 = normalizeDeg(270 + alphaDeg);

      const pT1 = isAngleBetween(thetaDeg, f1, f1 + pulseWidthDeg);
      const pT2 = isAngleBetween(thetaDeg, f2, f2 + pulseWidthDeg);
      const pT3 = isAngleBetween(thetaDeg, f3, f3 + pulseWidthDeg);

      gatePulses['T1'] = pT1;
      gatePulses['T2'] = pT2;
      gatePulses['T3'] = pT3;

      if (pT1 && (vs_a > Math.min(vs_b, vs_c) || current_i <= 0.001)) {
        tcr_hw_3p_active = 1;
      } else if (pT2 && (vs_b > Math.min(vs_a, vs_c) || current_i <= 0.001)) {
        tcr_hw_3p_active = 2;
      } else if (pT3 && (vs_c > Math.min(vs_a, vs_b) || current_i <= 0.001)) {
        tcr_hw_3p_active = 3;
      }

      // Current extinction check in DCM
      if (current_i <= 0.0001 && !pT1 && !pT2 && !pT3) {
        if (tcr_hw_3p_active === 1 && vs_a < 0) tcr_hw_3p_active = 0;
        if (tcr_hw_3p_active === 2 && vs_b < 0) tcr_hw_3p_active = 0;
        if (tcr_hw_3p_active === 3 && vs_c < 0) tcr_hw_3p_active = 0;
      }

      if (tcr_hw_3p_active === 1) {
        deviceStates['T1'] = true;
        vo = vs_a;
        activeVoltageName = 'Va';
      } else if (tcr_hw_3p_active === 2) {
        deviceStates['T2'] = true;
        vo = vs_b;
        activeVoltageName = 'Vb';
      } else if (tcr_hw_3p_active === 3) {
        deviceStates['T3'] = true;
        vo = vs_c;
        activeVoltageName = 'Vc';
      } else {
        vo = 0;
        activeVoltageName = '0 V (DCM Discontinuous)';
      }
    }

    // ==========================================
    // TOPOLOGY 8: TCR FW 3P
    // ==========================================
    else if (topology.key === 'tcr,fw,3p') {
      // Natural firing instants relative to alpha:
      // Interval 1: 30° + alpha  -> (T1, T6) => Vab
      // Interval 2: 90° + alpha  -> (T1, T2) => Vac
      // Interval 3: 150° + alpha -> (T3, T2) => Vbc
      // Interval 4: 210° + alpha -> (T3, T4) => Vba
      // Interval 5: 270° + alpha -> (T5, T4) => Vca
      // Interval 6: 330° + alpha -> (T5, T6) => Vcb

      const trig1 = normalizeDeg(30 + alphaDeg);
      const trig2 = normalizeDeg(90 + alphaDeg);
      const trig3 = normalizeDeg(150 + alphaDeg);
      const trig4 = normalizeDeg(210 + alphaDeg);
      const trig5 = normalizeDeg(270 + alphaDeg);
      const trig6 = normalizeDeg(330 + alphaDeg);

      const p1 = isAngleBetween(thetaDeg, trig1, trig1 + pulseWidthDeg);
      const p2 = isAngleBetween(thetaDeg, trig2, trig2 + pulseWidthDeg);
      const p3 = isAngleBetween(thetaDeg, trig3, trig3 + pulseWidthDeg);
      const p4 = isAngleBetween(thetaDeg, trig4, trig4 + pulseWidthDeg);
      const p5 = isAngleBetween(thetaDeg, trig5, trig5 + pulseWidthDeg);
      const p6 = isAngleBetween(thetaDeg, trig6, trig6 + pulseWidthDeg);

      // Gate pulses with standard double-pulsing for inductive bridge:
      // T1 fires at trig1 and receives auxiliary pulse at trig2
      gatePulses['T1'] = p1 || p2;
      // T2 fires at trig2 and receives auxiliary pulse at trig3
      gatePulses['T2'] = p2 || p3;
      // T3 fires at trig3 and receives auxiliary pulse at trig4
      gatePulses['T3'] = p3 || p4;
      // T4 fires at trig4 and receives auxiliary pulse at trig5
      gatePulses['T4'] = p4 || p5;
      // T5 fires at trig5 and receives auxiliary pulse at trig6
      gatePulses['T5'] = p5 || p6;
      // T6 fires at trig6 and receives auxiliary pulse at trig1
      gatePulses['T6'] = p6 || p1;

      if (p1 && (vab > 0 || current_i > 0.001)) tcr_fw_3p_activeState = 1;
      else if (p2 && (vac > 0 || current_i > 0.001)) tcr_fw_3p_activeState = 2;
      else if (p3 && (vbc > 0 || current_i > 0.001)) tcr_fw_3p_activeState = 3;
      else if (p4 && (vba > 0 || current_i > 0.001)) tcr_fw_3p_activeState = 4;
      else if (p5 && (vca > 0 || current_i > 0.001)) tcr_fw_3p_activeState = 5;
      else if (p6 && (vcb > 0 || current_i > 0.001)) tcr_fw_3p_activeState = 6;

      // DCM extinction
      if (current_i <= 0.0001 && !p1 && !p2 && !p3 && !p4 && !p5 && !p6) {
        if (tcr_fw_3p_activeState === 1 && vab <= 0) tcr_fw_3p_activeState = 0;
        if (tcr_fw_3p_activeState === 2 && vac <= 0) tcr_fw_3p_activeState = 0;
        if (tcr_fw_3p_activeState === 3 && vbc <= 0) tcr_fw_3p_activeState = 0;
        if (tcr_fw_3p_activeState === 4 && vba <= 0) tcr_fw_3p_activeState = 0;
        if (tcr_fw_3p_activeState === 5 && vca <= 0) tcr_fw_3p_activeState = 0;
        if (tcr_fw_3p_activeState === 6 && vcb <= 0) tcr_fw_3p_activeState = 0;
      }

      switch (tcr_fw_3p_activeState) {
        case 1:
          deviceStates['T1'] = true;
          deviceStates['T6'] = true;
          vo = vab;
          activeVoltageName = 'Vab';
          break;
        case 2:
          deviceStates['T1'] = true;
          deviceStates['T2'] = true;
          vo = vac;
          activeVoltageName = 'Vac';
          break;
        case 3:
          deviceStates['T3'] = true;
          deviceStates['T2'] = true;
          vo = vbc;
          activeVoltageName = 'Vbc';
          break;
        case 4:
          deviceStates['T3'] = true;
          deviceStates['T4'] = true;
          vo = vba;
          activeVoltageName = 'Vba';
          break;
        case 5:
          deviceStates['T5'] = true;
          deviceStates['T4'] = true;
          vo = vca;
          activeVoltageName = 'Vca';
          break;
        case 6:
          deviceStates['T5'] = true;
          deviceStates['T6'] = true;
          vo = vcb;
          activeVoltageName = 'Vcb';
          break;
        default:
          vo = 0;
          activeVoltageName = '0 V (DCM Discontinuous)';
          break;
      }
    }

    // ==========================================
    // R-L LOAD DIFFERENTIAL EQUATION INTEGRATION
    // vo = R * i + L * (di/dt)
    // di/dt = (vo - R * i) / L
    // ==========================================
    let didt = 0;
    if (L < 1e-6) {
      // Purely resistive load: i = max(0, vo / R)
      current_i = Math.max(0, vo / R);
      didt = 0;
    } else {
      // RL Load: Heun's method (RK2) for numerical stability and accuracy
      const k1 = (vo - R * current_i) / L;
      const i_pred = Math.max(0, current_i + k1 * dt);
      const k2 = (vo - R * i_pred) / L;
      didt = (k1 + k2) / 2;

      let next_i = current_i + didt * dt;
      if (next_i < 0) {
        next_i = 0;
        didt = -current_i / dt;
      }
      current_i = next_i;
    }

    // Assign currents to individual conducting devices
    for (const d of topology.devices) {
      if (deviceStates[d]) {
        deviceCurrents[d] = current_i;
      } else {
        deviceCurrents[d] = 0;
      }
    }

    points.push({
      t,
      theta: globalThetaRad,
      thetaDeg,
      globalThetaDeg,
      vs,
      vs_b: topology.phases === 3 ? vs_b : undefined,
      vs_c: topology.phases === 3 ? vs_c : undefined,
      vo,
      io: current_i,
      didt,
      deviceStates,
      deviceCurrents,
      gatePulses,
      activeVoltageName
    });
  }

  // Extract the last 1-2 steady-state cycles for accurate measurements
  const steadyCycleCount = 1;
  const steadyStartIdx = totalPoints - (pointsPerCycle * steadyCycleCount);
  const steadyStatePoints = points.slice(steadyStartIdx);

  // Compute calculated metrics
  const measurements = calculateMeasurements(steadyStatePoints, topology, params);

  return {
    params,
    topology,
    points,
    steadyStatePoints,
    period,
    dt,
    omega,
    measurements
  };
}

/**
 * Calculates RMS, Average, Peak, Power, and Harmonic metrics from steady state points.
 */
function calculateMeasurements(
  steadyPoints: SimulationPoint[],
  topology: TopologyConfig,
  params: SimulationParams
): Measurements {
  const N = steadyPoints.length;
  if (N === 0) {
    return {
      voPeak: 0,
      voAvg: 0,
      voRms: 0,
      ioPeak: 0,
      ioAvg: 0,
      ioRms: 0,
      realPower: 0,
      apparentPower: 0,
      loadApparentPower: 0,
      powerFactor: 0,
      firingAngleDeg: params.alphaDeg,
      conductionAngleDeg: 0,
      formFactor: 1,
      rippleFactor: 0,
      currentRipplePercent: 0,
      isContinuousConduction: false,
      theoreticalVoAvg: 0
    };
  }

  let sumVo = 0;
  let sumVoSq = 0;
  let maxVo = -Infinity;

  let sumIo = 0;
  let sumIoSq = 0;
  let maxIo = -Infinity;
  let minIo = Infinity;

  let sumP = 0;
  let nonZeroCount = 0;

  for (let i = 0; i < N; i++) {
    const pt = steadyPoints[i];
    sumVo += pt.vo;
    sumVoSq += pt.vo * pt.vo;
    if (pt.vo > maxVo) maxVo = pt.vo;

    sumIo += pt.io;
    sumIoSq += pt.io * pt.io;
    if (pt.io > maxIo) maxIo = pt.io;
    if (pt.io < minIo) minIo = pt.io;

    sumP += pt.vo * pt.io;

    if (pt.io > 0.05) {
      nonZeroCount++;
    }
  }

  const voAvg = sumVo / N;
  const voRms = Math.sqrt(sumVoSq / N);
  const voPeak = maxVo > 0 ? maxVo : 0;

  const ioAvg = sumIo / N;
  const ioRms = Math.sqrt(sumIoSq / N);
  const ioPeak = maxIo > 0 ? maxIo : 0;

  const realPower = sumP / N;
  const loadApparentPower = voRms * ioRms;
  const apparentPower = params.Vs * ioRms;
  const powerFactor = apparentPower > 0 ? Math.min(1.0, realPower / apparentPower) : 0;

  const formFactor = Math.abs(voAvg) > 0.01 ? voRms / Math.abs(voAvg) : 1;
  const rippleFactor = Math.sqrt(Math.max(0, formFactor * formFactor - 1));

  const currentRipplePercent = ioAvg > 0.01 ? ((ioPeak - minIo) / ioAvg) * 100 : 0;
  
  // Continuous conduction if current does not touch zero
  const isContinuousConduction = minIo > 0.05;

  // Conduction angle per device
  const conductionAngleDeg = (nonZeroCount / N) * (360 / topology.pulseCount);

  // Theoretical analytical formula for steady-state Vo_avg
  const theoreticalVoAvg = computeTheoreticalVo(topology, params);

  return {
    voPeak,
    voAvg,
    voRms,
    ioPeak,
    ioAvg,
    ioRms,
    realPower,
    apparentPower,
    loadApparentPower,
    powerFactor,
    firingAngleDeg: topology.type === 'tcr' ? params.alphaDeg : 0,
    conductionAngleDeg,
    formFactor,
    rippleFactor,
    currentRipplePercent,
    isContinuousConduction,
    theoreticalVoAvg
  };
}

/**
 * Analytical formula for textbook comparison
 */
function computeTheoreticalVo(topology: TopologyConfig, params: SimulationParams): number {
  const { Vs, alphaDeg } = params;
  const Vm = Math.sqrt(2) * Vs;
  const alphaRad = (alphaDeg * Math.PI) / 180;

  switch (topology.key) {
    case 'dbr,fw,1p':
      return (2 * Vm) / Math.PI; // ~ 0.6366 * Vm
    case 'dbr,hw,1p':
      return Vm / Math.PI; // ~ 0.3183 * Vm (for R load)
    case 'dbr,fw,3p':
      return (3 * Math.sqrt(3) * Vm) / Math.PI; // ~ 1.654 * Vm
    case 'dbr,hw,3p':
      return (3 * Math.sqrt(3) * Vm) / (2 * Math.PI); // ~ 0.827 * Vm
    case 'tcr,fw,1p':
      return ((2 * Vm) / Math.PI) * Math.cos(alphaRad);
    case 'tcr,hw,1p':
      return (Vm / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
    case 'tcr,fw,3p':
      return ((3 * Math.sqrt(3) * Vm) / Math.PI) * Math.cos(alphaRad);
    case 'tcr,hw,3p':
      return ((3 * Math.sqrt(3) * Vm) / (2 * Math.PI)) * Math.cos(alphaRad);
    default:
      return 0;
  }
}
