import React, { useState, useMemo } from 'react';
import { Compass, Disc, Zap, Activity, Sliders, Layers, ArrowUpRight, HelpCircle, CheckCircle } from 'lucide-react';

export const ReflectorAntennaCalculator: React.FC = () => {
  // Input parameters
  const [diameter, setDiameter] = useState<number>(3.0); // Dish Diameter D (meters)
  const [fOverD, setFOverD] = useState<number>(0.4); // Focal ratio f/D
  const [freqGhz, setFreqGhz] = useState<number>(10.0); // Frequency f0 (GHz)
  const [feedPowerN, setFeedPowerN] = useState<number>(4); // Silver feed exponent G_f(theta) = 2(n+1) cos^n(theta)
  const [reflectorType, setReflectorType] = useState<'prime_focus' | 'cassegrain' | 'gregorian'>('prime_focus');

  // Efficiency / Loss factors
  const [blockageEff, setBlockageEff] = useState<number>(0.96); // Strut / Subreflector blockage
  const [crossPolEff, setCrossPolEff] = useState<number>(0.98); // Cross-polarization loss
  const [surfaceRmsMm, setSurfaceRmsMm] = useState<number>(0.3); // Surface error delta (mm)
  const [phaseEff, setPhaseEff] = useState<number>(0.98); // Phase error loss

  const c = 3e8; // speed of light m/s

  // Calculations & Integrations
  const calcData = useMemo(() => {
    const f0 = freqGhz * 1e9; // Hz
    const lambda = c / f0; // meters (λ)
    const lambdaMm = lambda * 1000;

    // Focal length f = (f/D) * D
    const f = fOverD * diameter;

    // Subtended half-angle theta_0 = 2 * arctan( 1 / (4 * f/D) )
    const theta0Rad = 2 * Math.atan(1 / (4 * fOverD));
    const theta0Deg = (theta0Rad * 180) / Math.PI;

    // Dish Depth h_p = D^2 / (16 * f)
    const depthM = Math.pow(diameter, 2) / (16 * f);

    // 1. Spillover Efficiency: epsilon_s = 1 - cos^(n+1)(theta_0)
    const n = feedPowerN;
    const spilloverEff = 1 - Math.pow(Math.cos(theta0Rad), n + 1);

    // 2. Taper Efficiency: epsilon_t via numerical integration
    // Integral I1 = integral_0^theta0 ( cos^(n/2)(theta') * tan(theta'/2) dtheta' )
    const numSteps = 200;
    const dTheta = theta0Rad / numSteps;
    let sumI1 = 0;

    for (let i = 0; i < numSteps; i++) {
      const th = (i + 0.5) * dTheta;
      const val = Math.pow(Math.cos(th), n / 2) * Math.tan(th / 2);
      sumI1 += val * dTheta;
    }

    const cotHalfTheta0 = 1 / Math.tan(theta0Rad / 2);
    // Formula from Page 6 of handwritten notes:
    // epsilon_t = 2 * (n + 1) * cot^2(theta_0/2) * [ sumI1 ]^2
    const taperEff = 2 * (n + 1) * Math.pow(cotHalfTheta0, 2) * Math.pow(sumI1, 2);

    // 3. Ruze's Surface Error Efficiency: epsilon_r = exp( -(4 * pi * delta / lambda)^2 )
    const deltaM = surfaceRmsMm / 1000;
    const ruzeExponent = Math.pow((4 * Math.PI * deltaM) / lambda, 2);
    const surfaceEff = Math.exp(-ruzeExponent);

    // 4. Total Aperture Efficiency: epsilon_ap = epsilon_s * epsilon_t * epsilon_b * epsilon_x * epsilon_r * epsilon_p
    const apertureEff = spilloverEff * taperEff * blockageEff * crossPolEff * surfaceEff * phaseEff;

    // 5. Maximum Physical Directivity D_max = (pi * D / lambda)^2
    const dMaxLinear = Math.pow((Math.PI * diameter) / lambda, 2);
    const dMaxDbi = 10 * Math.log10(dMaxLinear);

    // 6. Realized Gain G = D_max * epsilon_ap
    const gainLinear = dMaxLinear * apertureEff;
    const gainDbi = 10 * Math.log10(Math.max(1, gainLinear));

    // 7. Edge Taper in dB = 20 log10( cos^n(theta_0) )
    const edgeTaperDb = Math.abs(20 * Math.log10(Math.max(1e-5, Math.pow(Math.cos(theta0Rad), n))));

    // 8. Beamwidth estimation HPBW = 70 * (lambda / D)
    const hpbwDeg = 70 * (lambda / diameter);

    // 9. Generate Efficiency vs Subtended Angle Curve (for plot)
    const curvePoints: Array<{ thetaDeg: number; fD: number; eSpill: number; eTaper: number; eTotal: number }> = [];
    for (let thDeg = 15; thDeg <= 85; thDeg += 2) {
      const thRad = (thDeg * Math.PI) / 180;
      const fDVal = 1 / (4 * Math.tan(thRad / 2));

      const eS = 1 - Math.pow(Math.cos(thRad), n + 1);

      let i1 = 0;
      const dt = thRad / 100;
      for (let k = 0; k < 100; k++) {
        const t = (k + 0.5) * dt;
        i1 += Math.pow(Math.cos(t), n / 2) * Math.tan(t / 2) * dt;
      }
      const eT = 2 * (n + 1) * Math.pow(1 / Math.tan(thRad / 2), 2) * Math.pow(i1, 2);
      const eTot = eS * eT * blockageEff * crossPolEff * surfaceEff * phaseEff;

      curvePoints.push({
        thetaDeg: thDeg,
        fD: parseFloat(fDVal.toFixed(2)),
        eSpill: parseFloat((eS * 100).toFixed(1)),
        eTaper: parseFloat((eT * 100).toFixed(1)),
        eTotal: parseFloat((eTot * 100).toFixed(1)),
      });
    }

    return {
      lambdaMm: lambdaMm.toFixed(2),
      focalLengthM: f.toFixed(2),
      theta0Deg: theta0Deg.toFixed(1),
      depthM: depthM.toFixed(3),
      spilloverEffPct: (spilloverEff * 100).toFixed(1),
      taperEffPct: (taperEff * 100).toFixed(1),
      surfaceEffPct: (surfaceEff * 100).toFixed(1),
      apertureEffPct: (apertureEff * 100).toFixed(1),
      dMaxDbi: dMaxDbi.toFixed(1),
      gainDbi: gainDbi.toFixed(1),
      edgeTaperDb: edgeTaperDb.toFixed(1),
      hpbwDeg: hpbwDeg.toFixed(2),
      curvePoints,
    };
  }, [diameter, fOverD, freqGhz, feedPowerN, blockageEff, crossPolEff, surfaceRmsMm, phaseEff]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Disc className="w-5 h-5 text-amber-400" />
          <h2 className="text-slate-100 font-bold text-base">
            Reflector Antenna & Silver Feed Calculator
          </h2>
        </div>
        <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
          Gain, Spillover Efficiency & Taper Efficiency Analysis
        </span>
      </div>

      {/* Reflector Architecture Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setReflectorType('prime_focus')}
          className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
            reflectorType === 'prime_focus'
              ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold shadow-md'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm font-extrabold text-amber-400">1. Prime Focus Parabolic</span>
          <span className="text-[11px] text-slate-400">Horn feed placed directly at the primary focal point of the dish.</span>
        </button>

        <button
          onClick={() => setReflectorType('cassegrain')}
          className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
            reflectorType === 'cassegrain'
              ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold shadow-md'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm font-extrabold text-cyan-400">2. Cassegrain Feed</span>
          <span className="text-[11px] text-slate-400">Convex hyperboloidal subreflector reduces feeder loss and ground noise.</span>
        </button>

        <button
          onClick={() => setReflectorType('gregorian')}
          className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
            reflectorType === 'gregorian'
              ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold shadow-md'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm font-extrabold text-purple-400">3. Gregorian Feed</span>
          <span className="text-[11px] text-slate-400">Concave ellipsoidal subreflector behind the main focus point.</span>
        </button>
      </div>

      {/* Main Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-800 pt-4">
        {/* Diameter D */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Reflector Dish Diameter (D):</span>
            <span className="text-amber-400 font-mono font-bold text-sm">{diameter} m</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="20.0"
            step="0.1"
            value={diameter}
            onChange={e => setDiameter(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* f/D Ratio */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Focal Ratio (f/D):</span>
            <span className="text-cyan-400 font-mono font-bold text-sm">{fOverD}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.0"
            step="0.02"
            value={fOverD}
            onChange={e => setFOverD(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex gap-1.5 mt-1.5 text-[10px]">
            <button onClick={() => setFOverD(0.25)} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700">0.25 (Deep)</button>
            <button onClick={() => setFOverD(0.4)} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 font-bold">0.40 (Standard)</button>
            <button onClick={() => setFOverD(0.6)} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700">0.60 (Shallow)</button>
          </div>
        </div>

        {/* Frequency f0 */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Operating Frequency (f₀):</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">{freqGhz} GHz</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="40.0"
            step="0.5"
            value={freqGhz}
            onChange={e => setFreqGhz(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Silver Feed Exponent n */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Silver Feed Power Exponent (n):</span>
            <span className="text-purple-400 font-mono font-bold text-sm">cos^{feedPowerN}(θ')</span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            step="1"
            value={feedPowerN}
            onChange={e => setFeedPowerN(parseInt(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block mt-1">
            G_f(θ') = 2({feedPowerN}+1) cos^{feedPowerN}(θ')
          </span>
        </div>
      </div>

      {/* Advanced Loss & Efficiency Parameters */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <div className="flex justify-between text-slate-300 mb-1">
            <span>Blockage Factor (ε_b):</span>
            <span className="text-amber-300 font-mono font-bold">{(blockageEff * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.80"
            max="1.0"
            step="0.01"
            value={blockageEff}
            onChange={e => setBlockageEff(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-300 mb-1">
            <span>Cross-Polarization (ε_x):</span>
            <span className="text-amber-300 font-mono font-bold">{(crossPolEff * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.85"
            max="1.0"
            step="0.01"
            value={crossPolEff}
            onChange={e => setCrossPolEff(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-300 mb-1">
            <span>Surface Error (δ RMS):</span>
            <span className="text-amber-300 font-mono font-bold">{surfaceRmsMm} mm</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="3.0"
            step="0.1"
            value={surfaceRmsMm}
            onChange={e => setSurfaceRmsMm(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-slate-300 mb-1">
            <span>Focus Phase Error (ε_p):</span>
            <span className="text-amber-300 font-mono font-bold">{(phaseEff * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.85"
            max="1.0"
            step="0.01"
            value={phaseEff}
            onChange={e => setPhaseEff(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Realized Gain</span>
          <span className="text-xl font-black text-amber-400 font-mono">{calcData.gainDbi} dBi</span>
          <span className="text-[9px] text-slate-500 block">Max Theoretical: {calcData.dMaxDbi} dBi</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Aperture Efficiency (ε_ap)</span>
          <span className="text-xl font-black text-emerald-400 font-mono">{calcData.apertureEffPct}%</span>
          <span className="text-[9px] text-slate-500 block">ε_ap = ε_s · ε_t · ε_b · ε_r ...</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Spillover Eff (ε_s)</span>
          <span className="text-xl font-black text-cyan-400 font-mono">{calcData.spilloverEffPct}%</span>
          <span className="text-[9px] text-slate-500 block">Power intercepted by dish</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Taper Eff (ε_t)</span>
          <span className="text-xl font-black text-purple-400 font-mono">{calcData.taperEffPct}%</span>
          <span className="text-[9px] text-slate-500 block">Aperture amplitude uniformity</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Subtended Angle (θ₀)</span>
          <span className="text-xl font-black text-amber-300 font-mono">{calcData.theta0Deg}°</span>
          <span className="text-[9px] text-slate-500 block">Half-angle subtended at focus</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Edge Taper</span>
          <span className="text-xl font-black text-rose-400 font-mono">-{calcData.edgeTaperDb} dB</span>
          <span className="text-[9px] text-slate-500 block">Illumination drop at rim</span>
        </div>
      </div>

      {/* Interactive Ray-Tracing Cross Section & Efficiency Curves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SVG Ray Tracing Diagram */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
          <span className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-amber-400" />
            2D Parabolic Cross Section & Ray Tracing Geometry:
          </span>

          <svg viewBox="0 0 360 260" className="w-full max-w-[340px] h-auto bg-slate-900 rounded-lg p-2 border border-slate-800">
            {/* Parabola Dish Curve: z = x^2 / (4f) */}
            {/* Focal Point F = (180, 180 - f_pixel) */}
            {(() => {
              const fPx = 40 + fOverD * 60;
              const dPx = 180; // Dish width in pixels
              const focalX = 180;
              const vertexY = 210;
              const focalY = vertexY - fPx;

              // Path string for parabola
              const pathPts: string[] = [];
              for (let x = -dPx / 2; x <= dPx / 2; x += 5) {
                const z = Math.pow(x, 2) / (4 * fPx);
                const py = vertexY - z;
                const px = focalX + x;
                pathPts.push(`${px},${py}`);
              }

              const halfAngleRad = Math.atan2(dPx / 2, fPx);

              return (
                <g>
                  {/* Axis line */}
                  <line x1="180" y1="20" x2="180" y2="240" stroke="#334155" strokeDasharray="3 3" />

                  {/* Parabolic Reflector Dish */}
                  <path d={`M ${pathPts.join(' L ')}`} fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />

                  {/* Focal Feed Antenna Horn Icon at F */}
                  <circle cx={focalX} cy={focalY} r="6" fill="#ec4899" stroke="#fbcfe8" strokeWidth="2" />
                  <text x={focalX + 10} y={focalY + 4} fill="#fbcfe8" fontSize="11" fontWeight="bold">Focus F</text>

                  {/* Reflected Parallel Rays & Spilled Rays */}
                  {[-80, -50, -20, 20, 50, 80].map((xOffset, idx) => {
                    const z = Math.pow(xOffset, 2) / (4 * fPx);
                    const dishPx = focalX + xOffset;
                    const dishPy = vertexY - z;

                    return (
                      <g key={idx}>
                        {/* Ray from Feed to Dish */}
                        <line x1={focalX} y1={focalY} x2={dishPx} y2={dishPy} stroke="#38bdf8" strokeWidth="1.2" opacity="0.8" />
                        {/* Reflected Ray straight up parallel */}
                        <line x1={dishPx} y1={dishPy} x2={dishPx} y2="30" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 2" />
                      </g>
                    );
                  })}

                  {/* Spillover Rays exceeding theta_0 */}
                  {[-110, 110].map((xSpill, idx) => (
                    <line
                      key={idx}
                      x1={focalX}
                      y1={focalY}
                      x2={focalX + xSpill}
                      y2={focalY - 45}
                      stroke="#ef4444"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />
                  ))}

                  {/* Subtended Angle Arcs & Text */}
                  <text x="20" y="45" fill="#ef4444" fontSize="9" fontWeight="bold">Spillover Rays</text>
                  <text x="210" y="40" fill="#4ade80" fontSize="9" fontWeight="bold">Reflected Plane Wave</text>

                  {/* Labels for D and f */}
                  <line x1="90" y1="230" x2="270" y2="230" stroke="#cbd5e1" strokeWidth="1" markerEnd="url(#arrow)" />
                  <text x="165" y="245" fill="#cbd5e1" fontSize="10" fontStyle="italic">Diameter D = {diameter}m</text>

                  <text x="110" y={focalY + 25} fill="#38bdf8" fontSize="10">θ₀ = {calcData.theta0Deg}°</text>
                </g>
              );
            })()}
          </svg>
          <span className="text-[11px] text-slate-400 mt-2 text-center">
            Focal Length f = {calcData.focalLengthM} m | Dish Depth h = {calcData.depthM} m
          </span>
        </div>

        {/* Silver Efficiency Trade-off Curves */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              Spillover vs Taper Efficiency Trade-Off Curves:
            </h4>
            <p className="text-[11px] text-slate-400 mb-3">
              Increasing θ₀ improves Spillover efficiency (ε_s) but degrades Taper uniformity (ε_t). Peak total efficiency occurs around θ₀ ≈ 50°–60° (~75%–80%).
            </p>
          </div>

          {/* Mini SVG Plot of Efficiency Curves */}
          <svg viewBox="0 0 320 160" className="w-full h-auto bg-slate-900 rounded-lg p-2 border border-slate-800">
            {/* Grid Lines */}
            <line x1="30" y1="20" x2="30" y2="130" stroke="#334155" strokeWidth="1" />
            <line x1="30" y1="130" x2="300" y2="130" stroke="#334155" strokeWidth="1" />

            {/* Y-axis labels 0, 50, 100% */}
            <text x="10" y="133" fill="#64748b" fontSize="8">0%</text>
            <text x="5" y="78" fill="#64748b" fontSize="8">50%</text>
            <text x="0" y="23" fill="#64748b" fontSize="8">100%</text>

            {/* Plot Lines */}
            {(() => {
              const pts = calcData.curvePoints;
              if (pts.length < 2) return null;

              const getX = (th: number) => 30 + ((th - 15) / 70) * 270;
              const getY = (eff: number) => 130 - (eff / 100) * 110;

              const spillPath = pts.map(p => `${getX(p.thetaDeg)},${getY(p.eSpill)}`).join(' L ');
              const taperPath = pts.map(p => `${getX(p.thetaDeg)},${getY(p.eTaper)}`).join(' L ');
              const totalPath = pts.map(p => `${getX(p.thetaDeg)},${getY(p.eTotal)}`).join(' L ');

              // Current Operating Point Marker
              const curTheta = parseFloat(calcData.theta0Deg);
              const curX = getX(curTheta);

              return (
                <g>
                  {/* Spillover Line (Cyan) */}
                  <path d={`M ${spillPath}`} fill="none" stroke="#38bdf8" strokeWidth="2" />
                  {/* Taper Line (Amber) */}
                  <path d={`M ${taperPath}`} fill="none" stroke="#f59e0b" strokeWidth="2" />
                  {/* Total Aperture Eff Line (Emerald) */}
                  <path d={`M ${totalPath}`} fill="none" stroke="#10b981" strokeWidth="3" />

                  {/* Current Operating Vertical Line */}
                  <line x1={curX} y1="20" x2={curX} y2="130" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1.5" />
                  <circle cx={curX} cy={getY(parseFloat(calcData.apertureEffPct))} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                </g>
              );
            })()}
          </svg>

          {/* Legend */}
          <div className="flex items-center justify-between text-[10px] mt-2 text-slate-300">
            <span className="text-cyan-400 font-bold">🟦 Spillover Eff (ε_s)</span>
            <span className="text-amber-400 font-bold">🟧 Taper Eff (ε_t)</span>
            <span className="text-emerald-400 font-extrabold">🟩 Total Aperture Eff (ε_ap)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
