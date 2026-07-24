import { ArrayConfig, PatternPoint, AnalysisMetrics, ElementPatternType } from '../types';

/**
 * Evaluates Chebyshev Polynomial T_m(x)
 * T_0(x) = 1
 * T_1(x) = x
 * T_2(x) = 2x^2 - 1
 * T_3(x) = 4x^3 - 3x
 * ...
 */
export function chebyshevT(m: number, x: number): number {
  if (m === 0) return 1;
  if (m === 1) return x;
  if (Math.abs(x) <= 1) {
    return Math.cos(m * Math.acos(x));
  } else if (x > 1) {
    return Math.cosh(m * Math.acosh(x));
  } else {
    // x < -1
    const val = Math.cosh(m * Math.acosh(-x));
    return m % 2 === 0 ? val : -val;
  }
}

/**
 * Calculates element weights a_n for Dolph-Chebyshev array
 * based on N elements and SLL target in dB (e.g., -20, -30 dB).
 * Matches Pages 22-24 of the lecture notes.
 */
export function calculateDolphChebyshevWeights(N: number, sllDb: number): number[] {
  const absSll = Math.abs(sllDb);
  const R = Math.pow(10, absSll / 20); // Voltage ratio R0 (e.g. 10^(30/20) = 31.62)
  const x0 = Math.cosh(Math.acosh(R) / (N - 1));

  // We sample Psi from 0 to pi and match Chebyshev polynomial T_{N-1}(x0 * cos(Psi/2))
  // Using Fourier IDFT / Cosine expansion to solve weights exactly
  const M = Math.floor(N / 2);
  const weights = new Array(N).fill(1);

  const numSamples = 200;
  const rawWeights = new Array(N).fill(0);

  for (let k = 0; k < numSamples; k++) {
    const psi = (k * Math.PI) / (numSamples - 1);
    const u = x0 * Math.cos(psi / 2);
    const afVal = chebyshevT(N - 1, u);

    // Reconstruct Fourier coefficients
    for (let n = 0; n < N; n++) {
      const elementPos = n - (N - 1) / 2;
      rawWeights[n] += afVal * Math.cos(elementPos * psi);
    }
  }

  // Normalize weights so the maximum element amplitude is 1.0 or normalized properly
  const maxW = Math.max(...rawWeights.map(w => Math.abs(w)));
  for (let n = 0; n < N; n++) {
    weights[n] = maxW > 0 ? Math.abs(rawWeights[n]) / maxW : 1.0;
  }

  return weights;
}

/**
 * Calculates Binomial weights (Pascal Triangle)
 */
export function calculateBinomialWeights(N: number): number[] {
  const weights: number[] = [1];
  for (let i = 1; i < N; i++) {
    const nextRow: number[] = [1];
    for (let j = 0; j < weights.length - 1; j++) {
      nextRow.push(weights[j] + weights[j + 1]);
    }
    nextRow.push(1);
    weights.length = 0;
    weights.push(...nextRow);
  }
  // Normalize max weight to 1
  const maxW = Math.max(...weights);
  return weights.map(w => w / maxW);
}

/**
 * Computes element excitation amplitudes and phases for the given configuration
 */
export function getArrayWeightsAndPhases(config: ArrayConfig): { weights: number[]; phases: number[] } {
  const N = Math.max(1, config.numElements);
  let weights: number[] = new Array(N).fill(1);
  let phases: number[] = new Array(N).fill(0);

  // Progressive phase shift delta
  let deltaDeg = config.progressivePhase;
  if (config.useScanningAngle) {
    // delta = -k * d * cos(theta_0)
    const theta0Rad = (config.scanningAngle * Math.PI) / 180;
    const kd = 2 * Math.PI * config.spacing;
    const deltaRad = -kd * Math.cos(theta0Rad);
    deltaDeg = (deltaRad * 180) / Math.PI;
  }

  switch (config.arrayType) {
    case 'ula':
      weights = new Array(N).fill(1);
      for (let i = 0; i < N; i++) {
        phases[i] = i * deltaDeg;
      }
      break;

    case 'dolph_chebyshev':
      weights = calculateDolphChebyshevWeights(N, config.dolphSllDb);
      for (let i = 0; i < N; i++) {
        phases[i] = i * deltaDeg;
      }
      break;

    case 'binomial':
      weights = calculateBinomialWeights(N);
      for (let i = 0; i < N; i++) {
        phases[i] = i * deltaDeg;
      }
      break;

    case 'custom':
      weights = config.customAmplitudes.length === N ? [...config.customAmplitudes] : new Array(N).fill(1);
      phases = config.customPhases.length === N ? [...config.customPhases] : new Array(N).fill(0);
      break;

    case 'planar':
      weights = new Array(N).fill(1);
      for (let i = 0; i < N; i++) {
        phases[i] = i * deltaDeg;
      }
      break;

    case 'circular':
      weights = new Array(N).fill(1);
      phases = new Array(N).fill(0);
      break;

  }

  return { weights, phases };
}

/**
 * Evaluates Element Pattern E_0(theta, phi)
 */
export function evaluateElementPattern(type: ElementPatternType, thetaRad: number, phiRad: number = 0, patchExponent: number = 1): number {
  switch (type) {
    case 'isotropic':
      return 1.0;

    case 'short_dipole': {
      // z-oriented short dipole: E_0 = |sin(theta)|
      return Math.abs(Math.sin(thetaRad));
    }

    case 'short_dipole_x': {
      // x-oriented short dipole: E_0 = sqrt(1 - sin^2(theta)*cos^2(phi))
      const val = 1 - Math.pow(Math.sin(thetaRad) * Math.cos(phiRad), 2);
      return Math.sqrt(Math.max(0, val));
    }

    case 'half_wave_dipole': {
      // Half-wave dipole along z-axis: cos( (pi/2) cos(theta) ) / sin(theta)
      const sinTheta = Math.sin(thetaRad);
      if (Math.abs(sinTheta) < 1e-6) return 0.0;
      const num = Math.cos((Math.PI / 2) * Math.cos(thetaRad));
      return Math.abs(num / sinTheta);
    }

    case 'patch_cosine': {
      // Microstrip Patch Element Pattern based on Cavity Model & Equivalence Principle (Lecture Notes Pages 4-6)
      // Metallic ground plane shields backlobe (theta > pi/2)
      if (thetaRad > Math.PI / 2 + 1e-4) return 0.0;

      const sinTheta = Math.sin(thetaRad);
      const cosTheta = Math.cos(thetaRad); // Broadside factor (cos theta normal to patch)

      // Electrical dimensions at fundamental resonance (W = 0.5λ, Le = 0.5λ)
      const kW2 = Math.PI * 0.5;  // k * W / 2 = π/2
      const kLe2 = Math.PI * 0.5; // k * Le / 2 = π/2

      // H-plane variation (phi = 0° axis along width W): Single Slot Sinc Factor
      // Sinc( (kW/2) * sin(theta) * cos(phi) )
      const argH = kW2 * sinTheta * Math.cos(phiRad);
      const hPlaneSlotFactor = Math.abs(argH) < 1e-5 ? 1.0 : Math.sin(argH) / argH;

      // E-plane variation (phi = 90° axis along length L_e): Two-Slot Cosine Array Factor
      // Cos( (kLe/2) * sin(theta) * sin(phi) )
      const argE = kLe2 * sinTheta * Math.sin(phiRad);
      const ePlaneArrayFactor = Math.cos(argE);

      // Total Cavity Model Field Magnitude |E_patch(theta, phi)|
      // Combines Slot Factor, 2-Slot Interference Factor, and Broadside Element Factor
      const patchField = cosTheta * hPlaneSlotFactor * ePlaneArrayFactor;

      return Math.pow(Math.max(0, patchField), patchExponent || 1);
    }

    default:
      return 1.0;
  }
}

/**
 * Evaluates Array Factor AF(theta, phi)
 */
export function evaluateArrayFactor(
  config: ArrayConfig,
  thetaRad: number,
  phiRad: number = 0,
  weights: number[],
  phasesDeg: number[]
): { afVal: number; psi: number } {
  const k = 2 * Math.PI; // k in terms of lambda (k * lambda = 2*pi)
  const d = config.spacing; // d / lambda

  if (config.arrayType === 'planar') {
    // 2D Planar Array Nx x Ny
    const Nx = config.numElements;
    const Ny = config.numElementsY || 4;
    const dx = config.spacing;
    const dy = config.spacingY || 0.5;

    // Delta_x and Delta_y from scanning angle or progressive phase
    let deltaX = (config.progressivePhase * Math.PI) / 180;
    let deltaY = (config.progressivePhaseY * Math.PI) / 180;

    if (config.useScanningAngle) {
      const theta0 = (config.scanningAngle * Math.PI) / 180;
      const phi0 = (config.scanningAnglePhi * Math.PI) / 180;
      deltaX = -k * dx * Math.sin(theta0) * Math.cos(phi0);
      deltaY = -k * dy * Math.sin(theta0) * Math.sin(phi0);
    }

    const psiX = k * dx * Math.sin(thetaRad) * Math.cos(phiRad) + deltaX;
    const psiY = k * dy * Math.sin(thetaRad) * Math.sin(phiRad) + deltaY;

    // AF = AF_x * AF_y
    let realSumX = 0, imagSumX = 0;
    for (let m = 0; m < Nx; m++) {
      const phase = m * psiX;
      realSumX += Math.cos(phase);
      imagSumX += Math.sin(phase);
    }
    const afX = Math.sqrt(realSumX * realSumX + imagSumX * imagSumX) / Nx;

    let realSumY = 0, imagSumY = 0;
    for (let n = 0; n < Ny; n++) {
      const phase = n * psiY;
      realSumY += Math.cos(phase);
      imagSumY += Math.sin(phase);
    }
    const afY = Math.sqrt(realSumY * realSumY + imagSumY * imagSumY) / Ny;

    return { afVal: afX * afY, psi: psiX };
  }

  if (config.arrayType === 'circular') {
    // Circular Array
    const N = config.numElements;
    const a = config.radius || 0.5; // radius in wavelengths

    let realSum = 0;
    let imagSum = 0;
    let sumW = 0;

    for (let n = 0; n < N; n++) {
      const phiN = (2 * Math.PI * n) / N;
      const w = weights[n] !== undefined ? weights[n] : 1;
      const phaseShift = ((phasesDeg[n] || 0) * Math.PI) / 180;

      // Phase = k * a * sin(theta) * cos(phi - phiN) + delta_n
      const phase = k * a * Math.sin(thetaRad) * Math.cos(phiRad - phiN) + phaseShift;

      realSum += w * Math.cos(phase);
      imagSum += w * Math.sin(phase);
      sumW += Math.abs(w);
    }

    const afVal = sumW > 0 ? Math.sqrt(realSum * realSum + imagSum * imagSum) / sumW : 0;
    return { afVal, psi: k * a * Math.sin(thetaRad) };
  }

  // 1D Linear Array along z-axis
  const N = config.numElements;

  // Psi = k * d * cos(theta) + delta
  let deltaRad = (config.progressivePhase * Math.PI) / 180;
  if (config.useScanningAngle) {
    const theta0 = (config.scanningAngle * Math.PI) / 180;
    deltaRad = -k * d * Math.cos(theta0);
  }

  const psi = k * d * Math.cos(thetaRad) + deltaRad;

  // Fast calculation for ULA with uniform amplitude and progressive phase
  if (config.arrayType === 'ula' && config.customAmplitudes.length === 0) {
    const halfPsi = psi / 2;
    if (Math.abs(Math.sin(halfPsi)) < 1e-7) {
      return { afVal: 1.0, psi };
    }
    const afVal = Math.abs(Math.sin((N * halfPsi)) / (N * Math.sin(halfPsi)));
    return { afVal, psi };
  }

  // General summation for arbitrary weights & phases
  let realSum = 0;
  let imagSum = 0;
  let sumW = 0;

  for (let n = 0; n < N; n++) {
    const w = weights[n] !== undefined ? weights[n] : 1;
    const pDeg = phasesDeg[n] !== undefined ? phasesDeg[n] : 0;
    const pRad = (pDeg * Math.PI) / 180;

    // Element spatial position along z: n * d
    const phase = n * (k * d * Math.cos(thetaRad)) + pRad;

    realSum += w * Math.cos(phase);
    imagSum += w * Math.sin(phase);
    sumW += Math.abs(w);
  }

  const afVal = sumW > 0 ? Math.sqrt(realSum * realSum + imagSum * imagSum) / sumW : 0;
  return { afVal, psi };
}

/**
 * Generates 2D 180-degree or 360-degree pattern dataset for plots
 */
export function generatePatternData(
  config: ArrayConfig,
  phiDeg: number = 0,
  numSteps: number = 360
): PatternPoint[] {
  const { weights, phases } = getArrayWeightsAndPhases(config);
  const phiRad = (phiDeg * Math.PI) / 180;
  const points: PatternPoint[] = [];

  const maxAngle = 360; // 0 to 360 deg for full polar slice
  for (let i = 0; i <= numSteps; i++) {
    const thetaDeg = (i * maxAngle) / numSteps;
    const thetaRad = (thetaDeg * Math.PI) / 180;

    const elementFactor = evaluateElementPattern(config.elementPattern, thetaRad, phiRad, config.patchExponent || 1);
    const { afVal, psi } = evaluateArrayFactor(config, thetaRad, phiRad, weights, phases);

    // Pattern Multiplication Theorem: Total = AF * E_0
    const totalPattern = afVal * elementFactor;

    // Convert to dB (capped at -40 dB for display)
    const dbTotal = totalPattern > 1e-4 ? Math.max(-40, 20 * Math.log10(totalPattern)) : -40;
    const dbAF = afVal > 1e-4 ? Math.max(-40, 20 * Math.log10(afVal)) : -40;
    const dbElement = elementFactor > 1e-4 ? Math.max(-40, 20 * Math.log10(elementFactor)) : -40;

    points.push({
      thetaDeg,
      thetaRad,
      phiDeg,
      arrayFactor: afVal,
      elementFactor,
      totalPattern,
      dbTotal,
      dbAF,
      dbElement,
      psi,
    });
  }

  return points;
}

/**
 * Analyzes array performance metrics (HPBW, SLL, Grating Lobes, Directivity)
 */
export function analyzeArrayPerformance(config: ArrayConfig, patternData: PatternPoint[]): AnalysisMetrics {
  const { weights, phases } = getArrayWeightsAndPhases(config);

  // Find peak theta where total pattern is maximum
  let maxTotalVal = -1;
  let mainLobeTheta = 0;

  for (const pt of patternData) {
    if (pt.totalPattern > maxTotalVal) {
      maxTotalVal = pt.totalPattern;
      mainLobeTheta = pt.thetaDeg;
    }
  }

  // Find Side Lobe Level (SLL): peak of secondary lobe
  let sllVal = 0;
  let inMainLobe = true;
  let minAfterMain = 1.0;

  for (let i = 0; i < patternData.length / 2; i++) {
    const pt = patternData[i];
    const val = pt.totalPattern;

    if (inMainLobe) {
      if (val < minAfterMain) {
        minAfterMain = val;
      }
      if (val < 0.25) {
        inMainLobe = false;
      }
    } else {
      if (val > sllVal) {
        sllVal = val;
      }
    }
  }

  const sllDb = sllVal > 1e-4 && maxTotalVal > 0 ? 20 * Math.log10(sllVal / maxTotalVal) : -40;

  // Half-Power Beamwidth (HPBW): width at -3dB (0.707 * maxTotalVal)
  const halfPowerVal = 0.707 * maxTotalVal;
  let angleLeft = mainLobeTheta;
  let angleRight = mainLobeTheta;

  // Search left
  for (let i = Math.floor((mainLobeTheta / 360) * patternData.length); i >= 0; i--) {
    if (patternData[i].totalPattern <= halfPowerVal) {
      angleLeft = patternData[i].thetaDeg;
      break;
    }
  }

  // Search right
  for (let i = Math.floor((mainLobeTheta / 360) * patternData.length); i < patternData.length; i++) {
    if (patternData[i].totalPattern <= halfPowerVal) {
      angleRight = patternData[i].thetaDeg;
      break;
    }
  }

  let hpbwDegrees = Math.abs(angleRight - angleLeft);
  if (hpbwDegrees === 0 || hpbwDegrees > 180) {
    hpbwDegrees = 30; // sensible fallback
  }

  // Find Nulls
  const nullAngles: number[] = [];
  for (let i = 1; i < patternData.length - 1; i++) {
    const prev = patternData[i - 1].totalPattern;
    const curr = patternData[i].totalPattern;
    const next = patternData[i + 1].totalPattern;
    if (curr < prev && curr < next && curr < 0.08) {
      nullAngles.push(Math.round(patternData[i].thetaDeg));
    }
  }

  // Grating Lobes condition: d/lambda >= 1 / (1 + |cos(theta_0)|)
  const theta0Rad = (config.scanningAngle * Math.PI) / 180;
  const maxAllowedD = 1.0 / (1.0 + Math.abs(Math.cos(theta0Rad)));
  const gratingLobesExist = config.spacing >= maxAllowedD && config.numElements > 1;

  // Visible Range of Psi: [-k*d + delta, +k*d + delta]
  const kd = 2 * Math.PI * config.spacing;
  let delta = (config.progressivePhase * Math.PI) / 180;
  if (config.useScanningAngle) {
    delta = -kd * Math.cos(theta0Rad);
  }
  const visibleRangePsi: [number, number] = [-kd + delta, kd + delta];

  // Directivity D_0 estimate via numerical numerical integration over sphere
  let sumPower = 0;
  const numThetaSteps = 90;
  const numPhiSteps = 36;
  const dTheta = Math.PI / numThetaSteps;
  const dPhi = (2 * Math.PI) / numPhiSteps;

  for (let t = 0; t < numThetaSteps; t++) {
    const th = (t + 0.5) * dTheta;
    const sinTh = Math.sin(th);
    for (let p = 0; p < numPhiSteps; p++) {
      const ph = (p + 0.5) * dPhi;
      const { afVal } = evaluateArrayFactor(config, th, ph, weights, phases);
      const ef = evaluateElementPattern(config.elementPattern, th, ph, config.patchExponent || 1);
      const totalPwr = Math.pow(afVal * ef, 2);
      sumPower += totalPwr * sinTh * dTheta * dPhi;
    }
  }

  const directivityLinear = sumPower > 0 ? (4 * Math.PI * Math.pow(maxTotalVal, 2)) / sumPower : 1.0;
  const directivityDb = 10 * Math.log10(Math.max(1, directivityLinear));

  return {
    mainLobeTheta,
    mainLobePhi: config.scanningAnglePhi || 0,
    maxTotalVal,
    sllDb: Math.min(0, sllDb),
    hpbwDegrees,
    nullAngles: Array.from(new Set(nullAngles)).slice(0, 8),
    gratingLobesExist,
    visibleRangePsi,
    directivityLinear: Number(directivityLinear.toFixed(2)),
    directivityDb: Number(directivityDb.toFixed(1)),
    weights,
    phases,
  };
}
