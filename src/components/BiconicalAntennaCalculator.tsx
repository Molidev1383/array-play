import React, { useState, useMemo } from 'react';
import { Compass, Zap, Activity, Sliders, Layers, BarChart2, Radio, CheckCircle, Info } from 'lucide-react';

export const BiconicalAntennaCalculator: React.FC = () => {
  // Inputs
  const [coneAngleDeg, setConeAngleDeg] = useState<number>(30); // Half cone angle theta_0 (degrees)
  const [antennaType, setAntennaType] = useState<'biconical' | 'monoconical'>('biconical');
  const [isFinite, setIsFinite] = useState<boolean>(true);
  const [coneLengthCm, setConeLengthCm] = useState<number>(25); // Cone length L in cm
  const [freqGhz, setFreqGhz] = useState<number>(1.5); // Operating frequency f (GHz)
  const [zGen, setZGen] = useState<number>(50); // Generator impedance (50 Ohm)

  const c = 3e8; // speed of light m/s
  const z0 = 120 * Math.PI; // intrinsic impedance of free space (~376.73 Ohm)

  // Calculations
  const calcResults = useMemo(() => {
    const theta0Rad = (coneAngleDeg * Math.PI) / 180;
    const halfTheta0Rad = theta0Rad / 2;

    // 1. Characteristic Impedance Z_c from handwritten notes Page 4:
    // Z_in = (Z_0 / pi) * ln( cot(theta_0 / 2) ) = 120 * ln( cot(theta_0 / 2) )
    const cotHalfTheta0 = 1 / Math.tan(halfTheta0Rad);
    const zCharacteristicBi = 120 * Math.log(cotHalfTheta0);
    const zCharacteristic = antennaType === 'monoconical' ? zCharacteristicBi / 2 : zCharacteristicBi;

    // 2. Frequency & Length analysis for Finite Cone
    const f0 = freqGhz * 1e9;
    const lambdaM = c / f0;
    const lambdaCm = lambdaM * 100;

    const lengthM = coneLengthCm / 100;

    // Cutoff frequency f_lower (when L approx lambda/4 for mono or lambda/2 for bi)
    const minLengthForResonance = antennaType === 'monoconical' ? lambdaM / 4 : lambdaM / 2;
    const fLowerMhz = antennaType === 'monoconical' ? (c / (4 * lengthM)) / 1e6 : (c / (2 * lengthM)) / 1e6;

    // Electrical length kL = (2*pi / lambda) * L
    const kL = ((2 * Math.PI) / lambdaM) * lengthM;

    // 3. Approximate Input Impedance Z_in for finite cone (using Transmission Line approximation)
    let rIn = zCharacteristic;
    let xIn = 0;

    if (isFinite) {
      // Near DC / below cutoff: capacitive reactance
      if (f0 < fLowerMhz * 1e6) {
        rIn = zCharacteristic * Math.pow(f0 / (fLowerMhz * 1e6), 2);
        xIn = -zCharacteristic / Math.max(0.01, (f0 / (fLowerMhz * 1e6)));
      } else {
        // Above cutoff: oscillates slightly around Z_characteristic
        const osc = Math.sin(2 * kL) * 0.25;
        rIn = zCharacteristic * (1 + 0.15 * Math.cos(2 * kL));
        xIn = zCharacteristic * osc;
      }
    }

    // 4. Reflection Coefficient Gamma & VSWR
    const zInComplexMag = Math.sqrt(rIn * rIn + xIn * xIn);
    const numReal = rIn - zGen;
    const numImag = xIn;
    const denReal = rIn + zGen;
    const denImag = xIn;

    const gammaSq = (numReal * numReal + numImag * numImag) / (denReal * denReal + denImag * denImag);
    const gamma = Math.sqrt(Math.min(0.999, gammaSq));
    const vswr = (1 + gamma) / Math.max(0.001, 1 - gamma);
    const returnLossDb = -20 * Math.log10(Math.max(1e-4, gamma));

    // 5. Generate Z_c vs Theta_0 curve points
    const curvePoints: Array<{ angleDeg: number; zBi: number; zMono: number }> = [];
    for (let angle = 2; angle <= 88; angle += 2) {
      const rad = (angle * Math.PI) / 180;
      const cot = 1 / Math.tan(rad / 2);
      const zb = 120 * Math.log(cot);
      curvePoints.push({
        angleDeg: angle,
        zBi: parseFloat(zb.toFixed(1)),
        zMono: parseFloat((zb / 2).toFixed(1)),
      });
    }

    // 6. Generate Frequency Sweep curve (0.2 GHz to 5.0 GHz)
    const freqSweep: Array<{ freqGhz: number; rIn: number; xIn: number; vswr: number }> = [];
    for (let fg = 0.2; fg <= 5.0; fg += 0.1) {
      const fHz = fg * 1e9;
      const lamM = c / fHz;
      const kl = ((2 * Math.PI) / lamM) * lengthM;

      let r = zCharacteristic;
      let x = 0;
      if (isFinite) {
        if (fHz < fLowerMhz * 1e6) {
          r = zCharacteristic * Math.pow(fHz / (fLowerMhz * 1e6), 2);
          x = -zCharacteristic / Math.max(0.01, fHz / (fLowerMhz * 1e6));
        } else {
          r = zCharacteristic * (1 + 0.15 * Math.cos(2 * kl));
          x = zCharacteristic * (Math.sin(2 * kl) * 0.25);
        }
      }

      const nR = r - zGen;
      const dR = r + zGen;
      const gSq = (nR * nR + x * x) / (dR * dR + x * x);
      const g = Math.sqrt(Math.min(0.999, gSq));
      const v = (1 + g) / Math.max(0.001, 1 - g);

      freqSweep.push({
        freqGhz: parseFloat(fg.toFixed(1)),
        rIn: parseFloat(Math.min(800, Math.max(0, r)).toFixed(1)),
        xIn: parseFloat(Math.max(-500, Math.min(500, x)).toFixed(1)),
        vswr: parseFloat(Math.min(10, v).toFixed(2)),
      });
    }

    return {
      zCharacteristicBi: zCharacteristicBi.toFixed(1),
      zCharacteristic: zCharacteristic.toFixed(1),
      lambdaCm: lambdaCm.toFixed(1),
      fLowerMhz: fLowerMhz.toFixed(0),
      kL: kL.toFixed(2),
      rIn: rIn.toFixed(1),
      xIn: xIn.toFixed(1),
      vswr: vswr.toFixed(2),
      returnLossDb: returnLossDb.toFixed(1),
      curvePoints,
      freqSweep,
    };
  }, [coneAngleDeg, antennaType, isFinite, coneLengthCm, freqGhz, zGen]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-slate-100 font-bold text-base">
            Biconical Antenna TEM Wave Analyzer
          </h2>
        </div>
        <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
          Frequency-Independent TEM Wave Mode
        </span>
      </div>

      {/* Structure Type & Finite/Infinite Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-300">Antenna Topology:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setAntennaType('biconical')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                antennaType === 'biconical'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Biconical
            </button>
            <button
              onClick={() => setAntennaType('monoconical')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                antennaType === 'monoconical'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Monocone
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-300">Physical Dimension Model:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFinite(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                isFinite
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Finite Cone (Real Cutoff)
            </button>
            <button
              onClick={() => setIsFinite(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                !isFinite
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Infinite Cone (Theoretical)
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-300">Generator Impedance (Z_gen):</span>
          <div className="flex gap-2">
            {[50, 75, 200].map(z => (
              <button
                key={z}
                onClick={() => setZGen(z)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                  zGen === z
                    ? 'bg-purple-500 text-slate-950 shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {z} Ω
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sliders for Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800 pt-4">
        {/* Half Cone Angle theta_0 */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Half-Cone Angle (θ₀):</span>
            <span className="text-amber-400 font-mono font-bold text-sm">{coneAngleDeg}°</span>
          </div>
          <input
            type="range"
            min="2"
            max="85"
            step="1"
            value={coneAngleDeg}
            onChange={e => setConeAngleDeg(parseInt(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">
            Total Flare Angle 2θ₀ = {coneAngleDeg * 2}°
          </span>
        </div>

        {/* Cone Length L */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Cone Flare Length (L):</span>
            <span className="text-cyan-400 font-mono font-bold text-sm">{coneLengthCm} cm</span>
          </div>
          <input
            type="range"
            min="5"
            max="200"
            step="5"
            value={coneLengthCm}
            onChange={e => setConeLengthCm(parseInt(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">
            Est. Lower Cutoff Frequency f_lower ≈ {calcResults.fLowerMhz} MHz
          </span>
        </div>

        {/* Operating Frequency f */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Operating Frequency (f):</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">{freqGhz} GHz</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="5.0"
            step="0.1"
            value={freqGhz}
            onChange={e => setFreqGhz(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">
            Wavelength λ = {calcResults.lambdaCm} cm
          </span>
        </div>
      </div>

      {/* Calculated Results Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Characteristic Impedance (Z_c)</span>
          <span className="text-xl font-black text-amber-400 font-mono">{calcResults.zCharacteristic} Ω</span>
          <span className="text-[9px] text-slate-500 block">Z_c = 120 · ln(cot(θ₀/2))</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Input Resistance (R_in)</span>
          <span className="text-xl font-black text-emerald-400 font-mono">{calcResults.rIn} Ω</span>
          <span className="text-[9px] text-slate-500 block">Real Part of Impedance</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Input Reactance (X_in)</span>
          <span className="text-xl font-black text-cyan-400 font-mono">{calcResults.xIn} Ω</span>
          <span className="text-[9px] text-slate-500 block">Imaginary (Capacitive/Inductive)</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">VSWR Ratio</span>
          <span className="text-xl font-black text-purple-400 font-mono">{calcResults.vswr}</span>
          <span className="text-[9px] text-slate-500 block">Matched to {zGen}Ω source</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Return Loss (S11)</span>
          <span className="text-xl font-black text-rose-400 font-mono">-{calcResults.returnLossDb} dB</span>
          <span className="text-[9px] text-slate-500 block">Return Loss</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Lower Cutoff Frequency (f_c)</span>
          <span className="text-xl font-black text-blue-400 font-mono">{calcResults.fLowerMhz} MHz</span>
          <span className="text-[9px] text-slate-500 block">f_lower ≈ c / (2L)</span>
        </div>
      </div>

      {/* SVG Electromagnetic Field & Geometry Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SVG Biconical Geometry */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
          <span className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-amber-400" />
            Geometry Diagram & Electric (E_θ) / Magnetic (H_φ) TEM Wave Fields:
          </span>

          <svg viewBox="0 0 360 260" className="w-full max-w-[340px] h-auto bg-slate-900 rounded-lg p-2 border border-slate-800">
            {/* Coordinate Axis */}
            <line x1="180" y1="20" x2="180" y2="240" stroke="#334155" strokeDasharray="3 3" />
            <line x1="20" y1="130" x2="340" y2="130" stroke="#334155" strokeDasharray="3 3" />

            {/* Upper Cone */}
            {(() => {
              const topY = 130 - (coneLengthCm / 200) * 100;
              const halfWidth = Math.tan((coneAngleDeg * Math.PI) / 180) * (130 - topY);

              const botY = 130 + (coneLengthCm / 200) * 100;

              return (
                <g>
                  {/* Upper Metallic Cone */}
                  <polygon
                    points={`180,126 ${180 - halfWidth},${topY} ${180 + halfWidth},${topY}`}
                    fill="#f59e0b"
                    opacity="0.8"
                    stroke="#fbbf24"
                    strokeWidth="2"
                  />

                  {/* Lower Metallic Cone (or Ground Plane if monoconical) */}
                  {antennaType === 'biconical' ? (
                    <polygon
                      points={`180,134 ${180 - halfWidth},${botY} ${180 + halfWidth},${botY}`}
                      fill="#f59e0b"
                      opacity="0.8"
                      stroke="#fbbf24"
                      strokeWidth="2"
                    />
                  ) : (
                    <line x1="40" y1="130" x2="320" y2="130" stroke="#94a3b8" strokeWidth="4" />
                  )}

                  {/* Feed Gap Generator Symbol */}
                  <circle cx="180" cy="130" r="8" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
                  <text x="175" y="133" fill="#818cf8" fontSize="10" fontWeight="bold">~</text>

                  {/* Spherical TEM Wavefront Arcs and E-field vectors */}
                  {[-40, -20, 20, 40].map((angleOff, idx) => {
                    const rad = ((90 + angleOff) * Math.PI) / 180;
                    const r = 85;
                    const ex = 180 + r * Math.cos(rad);
                    const ey = 130 - r * Math.sin(rad);

                    return (
                      <g key={idx}>
                        {/* E-field line from upper cone toward lower */}
                        <line x1={ex} y1={ey - 15} x2={ex} y2={ey + 15} stroke="#38bdf8" strokeWidth="1.5" markerEnd="url(#arrow)" />
                      </g>
                    );
                  })}

                  <path d="M 110,130 A 70,70 0 0,1 250,130" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x="215" y="80" fill="#38bdf8" fontSize="10" fontWeight="bold">E_θ TEM Wave</text>

                  {/* Angle Labels */}
                  <text x="190" y="60" fill="#fbbf24" fontSize="11" fontWeight="bold">θ₀ = {coneAngleDeg}°</text>
                </g>
              );
            })()}
          </svg>

          <span className="text-[11px] text-slate-400 mt-2 text-center">
            Electric Field E_θ = Z_0 · A e^(-jkR) / (R sin θ) | Radial Current I(R) = 2π A e^(-jkR)
          </span>
        </div>

        {/* Z_c vs Theta_0 Curve Chart */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Characteristic Impedance Z_c vs. Half-Cone Angle θ₀:
            </h4>
            <p className="text-[11px] text-slate-400 mb-2">
              As cone flare angle θ₀ increases, impedance decreases. At θ₀ ≈ 47°, biconical impedance equals 120 Ω and monocone equals 60 Ω.
            </p>
          </div>

          {/* Mini SVG Curve Plot */}
          <svg viewBox="0 0 320 160" className="w-full h-auto bg-slate-900 rounded-lg p-2 border border-slate-800">
            <line x1="35" y1="15" x2="35" y2="135" stroke="#334155" strokeWidth="1" />
            <line x1="35" y1="135" x2="300" y2="135" stroke="#334155" strokeWidth="1" />

            <text x="10" y="138" fill="#64748b" fontSize="8">0 Ω</text>
            <text x="5" y="80" fill="#64748b" fontSize="8">200 Ω</text>
            <text x="5" y="20" fill="#64748b" fontSize="8">400 Ω</text>

            {/* X-axis labels theta_0 */}
            <text x="35" y="150" fill="#64748b" fontSize="8">0°</text>
            <text x="160" y="150" fill="#64748b" fontSize="8">45°</text>
            <text x="290" y="150" fill="#64748b" fontSize="8">90°</text>

            {(() => {
              const pts = calcResults.curvePoints;
              const getX = (ang: number) => 35 + (ang / 90) * 265;
              const getY = (zVal: number) => 135 - (zVal / 450) * 120;

              const pathBi = pts.map(p => `${getX(p.angleDeg)},${getY(p.zBi)}`).join(' L ');
              const pathMono = pts.map(p => `${getX(p.angleDeg)},${getY(p.zMono)}`).join(' L ');

              const curX = getX(coneAngleDeg);
              const curY = getY(parseFloat(calcResults.zCharacteristic));

              return (
                <g>
                  {/* Biconical Line (Amber) */}
                  <path d={`M ${pathBi}`} fill="none" stroke="#f59e0b" strokeWidth="2" />
                  {/* Monoconical Line (Cyan) */}
                  <path d={`M ${pathMono}`} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />

                  {/* Current Operating Point */}
                  <line x1={curX} y1="15" x2={curX} y2="135" stroke="#e2e8f0" strokeDasharray="2 2" strokeWidth="1" />
                  <circle cx={curX} cy={curY} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            })()}
          </svg>

          <div className="flex items-center justify-between text-[10px] mt-2 text-slate-300">
            <span className="text-amber-400 font-bold">🟧 Biconical (Z_c)</span>
            <span className="text-cyan-400 font-bold">🟦 Monocone (Z_c / 2)</span>
            <span className="text-emerald-400 font-bold">🟩 Operating Point</span>
          </div>
        </div>
      </div>
    </div>
  );
};
