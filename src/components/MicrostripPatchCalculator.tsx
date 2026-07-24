import React, { useState, useMemo } from 'react';
import { Cpu, Zap, Layers, Activity, Sliders, Info, CheckCircle, ArrowRight } from 'lucide-react';

export const MicrostripPatchCalculator: React.FC = () => {
  // Input parameters
  const [freqGhz, setFreqGhz] = useState<number>(2.4);
  const [er, setEr] = useState<number>(4.4); // FR4 default
  const [heightMm, setHeightMm] = useState<number>(1.6);
  const [patchShape, setPatchShape] = useState<'rectangular' | 'circular'>('rectangular');

  // Constants
  const c = 3e8; // speed of light m/s

  // Calculations for Rectangular Patch (Cavity / Transmission Line Model)
  const calcResults = useMemo(() => {
    const f0 = freqGhz * 1e9; // Hz
    const h = heightMm / 1000; // meters

    if (patchShape === 'rectangular') {
      // 1. Width W
      const W = (c / (2 * f0)) * Math.sqrt(2 / (er + 1)); // meters
      const wMm = W * 1000;

      // 2. Effective Dielectric Constant e_reff
      const eReff = (er + 1) / 2 + ((er - 1) / 2) * Math.pow(1 + (12 * h) / W, -0.5);

      // 3. Fringing length extension delta_L
      const deltaL =
        0.412 *
        h *
        (((eReff + 0.3) * (wMm / heightMm + 0.264)) /
          ((eReff - 0.258) * (wMm / heightMm + 0.8))); // meters
      const deltaLMm = deltaL * 1000;

      // 4. Effective Length L_eff
      const Leff = c / (2 * f0 * Math.sqrt(eReff)); // meters
      const LeffMm = Leff * 1000;

      // 5. Physical Length L
      const L = Leff - 2 * deltaL; // meters
      const LMm = Math.max(1, L * 1000);

      // 6. Resonant check
      const frCalculated = c / (2 * (L + 2 * deltaL) * Math.sqrt(eReff)) / 1e9;

      // 7. Input Resistance at edge R_in(0) (approximate cavity formula)
      const G1 = (1 / 90) * Math.pow(wMm / (300 / freqGhz), 2); // radiation conductance
      const Rin0 = Math.min(600, Math.max(120, 1 / (2 * G1)));

      // 8. Inset Notch feed depth y0 for 50 Ohm matching
      const cosVal = Math.sqrt(50 / Rin0);
      const y0Mm = (LMm / Math.PI) * Math.acos(Math.min(1, cosVal));

      // 9. Directivity estimation
      const directivityDbi = 6.2 + 10 * Math.log10(wMm / (300 / freqGhz));

      return {
        shape: 'rectangular',
        wMm: wMm.toFixed(2),
        LMm: LMm.toFixed(2),
        LeffMm: LeffMm.toFixed(2),
        deltaLMm: deltaLMm.toFixed(3),
        eReff: eReff.toFixed(3),
        frCalculated: frCalculated.toFixed(3),
        Rin0: Rin0.toFixed(1),
        y0Mm: y0Mm.toFixed(2),
        directivityDbi: directivityDbi.toFixed(1),
      };
    } else {
      // Circular Patch Calculation (TM110 dominant mode, chi'_11 = 1.8412)
      const chi11 = 1.8412;
      const a = (chi11 * c) / (2 * Math.PI * f0 * Math.sqrt(er)); // meters
      const aMm = a * 1000;

      // Effective Radius a_eff including fringing
      const aEff =
        a *
        Math.sqrt(
          1 +
            ((2 * h) / (Math.PI * a * er)) *
              (Math.log((Math.PI * a) / (2 * h)) + 1.7726)
        );
      const aEffMm = aEff * 1000;

      const frCalculated = (chi11 * c) / (2 * Math.PI * aEff * Math.sqrt(er)) / 1e9;

      return {
        shape: 'circular',
        aMm: aMm.toFixed(2),
        aEffMm: aEffMm.toFixed(2),
        eReff: er.toFixed(2),
        frCalculated: frCalculated.toFixed(3),
        Rin0: '240.0',
        y0Mm: (aMm * 0.35).toFixed(2),
        directivityDbi: '6.5',
      };
    }
  }, [freqGhz, er, heightMm, patchShape]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-400" />
          <h2 className="text-slate-100 font-bold text-base">
            Microstrip Patch Antenna Calculator & Cavity Model Analyzer
          </h2>
        </div>
        <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
          Cavity Model & Radiating Edges Analysis
        </span>
      </div>

      {/* Preset Substrate Quick Selectors */}
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-2">
          Standard PCB Substrate Presets:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <button
            onClick={() => {
              setEr(4.4);
              setHeightMm(1.6);
            }}
            className={`p-2 rounded-lg border text-left transition ${
              er === 4.4 && heightMm === 1.6
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-200 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <span className="block font-bold">FR4 Standard</span>
            <span className="text-[10px] text-slate-400">εᵣ = 4.4, h = 1.6mm</span>
          </button>

          <button
            onClick={() => {
              setEr(2.2);
              setHeightMm(0.787);
            }}
            className={`p-2 rounded-lg border text-left transition ${
              er === 2.2
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-200 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <span className="block font-bold">Rogers RT5880</span>
            <span className="text-[10px] text-slate-400">εᵣ = 2.2, h = 0.79mm</span>
          </button>

          <button
            onClick={() => {
              setEr(3.55);
              setHeightMm(1.52);
            }}
            className={`p-2 rounded-lg border text-left transition ${
              er === 3.55
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-200 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <span className="block font-bold">Rogers RO4003C</span>
            <span className="text-[10px] text-slate-400">εᵣ = 3.55, h = 1.52mm</span>
          </button>

          <button
            onClick={() => {
              setEr(10.2);
              setHeightMm(1.27);
            }}
            className={`p-2 rounded-lg border text-left transition ${
              er === 10.2
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-200 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <span className="block font-bold">High Permittivity</span>
            <span className="text-[10px] text-slate-400">εᵣ = 10.2, h = 1.27mm</span>
          </button>
        </div>
      </div>

      {/* Sliders for Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800 pt-4">
        {/* Frequency f0 */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Resonant Frequency (f₀):</span>
            <span className="text-amber-400 font-mono font-bold text-sm">{freqGhz} GHz</span>
          </div>
          <input
            type="range"
            min="0.8"
            max="12.0"
            step="0.1"
            value={freqGhz}
            onChange={e => setFreqGhz(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Dielectric Constant er */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Dielectric Constant (εᵣ):</span>
            <span className="text-amber-400 font-mono font-bold text-sm">{er}</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="12.0"
            step="0.1"
            value={er}
            onChange={e => setEr(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Substrate Thickness h */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Substrate Thickness (h):</span>
            <span className="text-amber-400 font-mono font-bold text-sm">{heightMm} mm</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="3.2"
            step="0.1"
            value={heightMm}
            onChange={e => setHeightMm(parseFloat(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Patch Geometry Selection */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-300">Patch Geometry:</span>
        <button
          onClick={() => setPatchShape('rectangular')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            patchShape === 'rectangular'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Rectangular Patch
        </button>
        <button
          onClick={() => setPatchShape('circular')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            patchShape === 'circular'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Circular Patch
        </button>
      </div>

      {/* Results Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-800 pt-4">
        {patchShape === 'rectangular' ? (
          <>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Patch Width (W)</span>
              <span className="text-lg font-extrabold text-amber-400 font-mono">
                {calcResults.wMm} mm
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">For optimal radiation efficiency</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Physical Length (L)</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">
                {calcResults.LMm} mm
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">L ≈ λ/2 − 2ΔL</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Length Extension (ΔL)</span>
              <span className="text-lg font-extrabold text-cyan-400 font-mono">
                {calcResults.deltaLMm} mm
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Fringing fields effect</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Inset Feed Depth (y₀)</span>
              <span className="text-lg font-extrabold text-purple-400 font-mono">
                {calcResults.y0Mm} mm
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Inset feed depth for 50 Ω</span>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Circular Radius (a)</span>
              <span className="text-lg font-extrabold text-amber-400 font-mono">
                {calcResults.aMm} mm
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Effective Radius (aₑff)</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">
                {calcResults.aEffMm} mm
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Resonant Freq (TM₁₁₀)</span>
              <span className="text-lg font-extrabold text-cyan-400 font-mono">
                {calcResults.frCalculated} GHz
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Directivity</span>
              <span className="text-lg font-extrabold text-purple-400 font-mono">
                {calcResults.directivityDbi} dBi
              </span>
            </div>
          </>
        )}
      </div>

      {/* PCB Schematic Diagram */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* SVG Diagram */}
        <div className="w-full md:w-1/2 flex flex-col items-center">
          <span className="text-xs font-bold text-slate-300 mb-2">
            PCB Layout & Feedline Dimensions:
          </span>
          <svg viewBox="0 0 320 200" className="w-full max-w-[300px] h-auto bg-slate-900 rounded-lg p-2 border border-slate-800">
            {/* Ground / Substrate Outer rectangle */}
            <rect x="20" y="20" width="280" height="160" rx="6" fill="#15803d" opacity="0.4" stroke="#22c55e" strokeWidth="1.5" />
            <text x="30" y="38" fill="#4ade80" fontSize="10" fontWeight="bold">Substrate εᵣ = {er}</text>

            {/* Copper Patch */}
            {patchShape === 'rectangular' ? (
              <g>
                <rect x="80" y="45" width="160" height="100" rx="2" fill="#f59e0b" opacity="0.85" stroke="#fbbf24" strokeWidth="1.5" />
                {/* Inset notch */}
                <rect x="145" y="120" width="30" height="25" fill="#15803d" />
                {/* Feedline */}
                <rect x="153" y="120" width="14" height="60" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1" />

                {/* Dimension Arrows */}
                <line x1="80" y1="35" x2="240" y2="35" stroke="#38bdf8" strokeWidth="1" markerEnd="url(#arrow)" />
                <text x="145" y="31" fill="#38bdf8" fontSize="10" fontStyle="italic">W = {calcResults.wMm}mm</text>

                <line x1="250" y1="45" x2="250" y2="145" stroke="#38bdf8" strokeWidth="1" />
                <text x="255" y="100" fill="#38bdf8" fontSize="10" fontStyle="italic">L = {calcResults.LMm}mm</text>

                {/* Notch label */}
                <text x="180" y="138" fill="#c084fc" fontSize="9">y₀={calcResults.y0Mm}mm</text>
              </g>
            ) : (
              <g>
                <circle cx="160" cy="100" r="55" fill="#f59e0b" opacity="0.85" stroke="#fbbf24" strokeWidth="1.5" />
                <rect x="153" y="145" width="14" height="35" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1" />
                <line x1="160" y1="100" x2="215" y2="100" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="175" y="95" fill="#38bdf8" fontSize="10" fontWeight="bold">a = {calcResults.aMm}mm</text>
              </g>
            )}
          </svg>
        </div>

        {/* Cavity Model Notes Summary */}
        <div className="w-full md:w-1/2 flex flex-col gap-2 text-xs text-slate-300">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <h4 className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Cavity Model Operating Principle:
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              The microstrip patch behaves as a resonant cavity with electric conductor top/bottom walls and four magnetic side walls (dielectric interface).
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <h4 className="font-bold text-emerald-400 mb-1">50 Ω Inset Feed Impedance Matching:</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Edge input resistance is R₀ ≈ {calcResults.Rin0} Ω. By cutting an inset notch of depth y₀ = {calcResults.y0Mm} mm, input resistance is matched to 50 Ω:
              <span className="block text-cyan-300 font-mono mt-1 text-center">
                R_in(y₀) = R_in(0) · cos²(π y₀ / L) = 50 Ω
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
