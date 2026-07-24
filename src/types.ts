/**
 * Types definition for Antenna Array Simulator
 */

export type ArrayType = 
  | 'ula'               // Uniform Linear Array (آرایه خطی یکنواخت)
  | 'dolph_chebyshev'   // Dolph-Chebyshev Array (آرایه دولف-چبیشف)
  | 'binomial'          // Binomial Array (آرایه دوجمله‌ای)
  | 'planar'            // 2D Planar Array (آرایه صفحه‌ای دوبعدی)
  | 'circular'          // Circular Array (آرایه دایره‌ای)
  | 'custom';           // Custom Amplitudes & Phases (سفارشی)

export type ElementPatternType = 
  | 'isotropic'         // Isotropic Source (ایزوتروپیک / تک‌جهتی)
  | 'short_dipole'      // Short Dipole / Hertzian (دو قطبی کوتاه z-oriented)
  | 'half_wave_dipole' // Half-wave Dipole (دیپل نیم‌موج z-oriented)
  | 'patch_cosine'      // Patch / Directional Cosine (پچ / کسینوسی cos^n)
  | 'short_dipole_x';   // Short Dipole along X-axis

export interface ArrayConfig {
  arrayType: ArrayType;
  elementPattern: ElementPatternType;
  
  // 1D Linear or Circular parameters
  numElements: number;        // N (e.g., 2 to 32)
  spacing: number;            // d / lambda (e.g., 0.5)
  scanningAngle: number;      // theta_0 in degrees (0 to 180)
  progressivePhase: number;   // delta in degrees (-180 to 180)
  useScanningAngle: boolean;  // whether delta is auto-calculated from theta_0
  
  // Dolph-Chebyshev specific
  dolphSllDb: number;         // Target SLL in dB (e.g. -20, -26, -30)
  
  // 2D Planar specific
  numElementsY: number;       // Ny for 2D array
  spacingY: number;           // dy / lambda for 2D array
  scanningAnglePhi: number;   // phi_0 in degrees for 2D scanning
  progressivePhaseY: number;  // delta_y in degrees
  
  // Circular specific
  radius: number;             // a / lambda radius of circle
  
  // Patch element specific
  patchExponent: number;      // n in cos^n(theta)
  
  // Custom element weights
  customAmplitudes: number[];
  customPhases: number[];     // in degrees
}

export interface PatternPoint {
  thetaDeg: number;           // theta in degrees (0 to 180 or 360)
  thetaRad: number;
  phiDeg: number;             // phi in degrees
  arrayFactor: number;        // AF normalized (0 to 1)
  elementFactor: number;      // E_0 normalized (0 to 1)
  totalPattern: number;       // E_total = AF * E_0 normalized (0 to 1)
  dbTotal: number;            // 20*log10(E_total) capped at -40dB
  dbAF: number;
  dbElement: number;
  psi: number;                // kd cos(theta) + delta
}

export interface AnalysisMetrics {
  mainLobeTheta: number;      // angle in deg where main peak occurs
  mainLobePhi: number;
  maxTotalVal: number;
  sllDb: number;              // Side Lobe Level in dB
  hpbwDegrees: number;        // Half-power beamwidth in degrees
  nullAngles: number[];       // theta angles where radiation is zero/null
  gratingLobesExist: boolean; // if spacing is too large (d >= lambda / (1 + |cos theta_0|))
  visibleRangePsi: [number, number]; // [min_psi, max_psi]
  directivityLinear: number;  // Directivity estimate D_0
  directivityDb: number;      // Directivity in dBi
  weights: number[];          // Calculated or custom element amplitudes
  phases: number[];           // Calculated or custom element phases (deg)
}

export interface LectureNoteSection {
  id: string;
  pageNumber: number;
  titleFa: string;
  titleEn: string;
  summaryFa: string;
  formulas: string[];
  keyTakeawaysFa: string[];
}
