import React, { useState, useMemo } from 'react';
import { Radio, Zap, Activity, Sliders, Layers, Compass, ArrowRight, Table, CheckCircle, BarChart2 } from 'lucide-react';

export const LogPeriodicCalculator: React.FC = () => {
  // Input parameters
  const [fMinMhz, setFMinMhz] = useState<number>(470); // 470 MHz (UHF TV)
  const [fMaxMhz, setFMaxMhz] = useState<number>(860); // 860 MHz
  const [tau, setTau] = useState<number>(0.88); // Scaling factor tau (0.76 - 0.98)
  const [sigma, setSigma] = useState<number>(0.15); // Spacing factor sigma (0.04 - 0.22)
  const [zLine, setZLine] = useState<number>(50); // Feedline characteristic impedance

  const c = 3e8; // speed of light m/s

  // Preset Configurations
  const applyPreset = (preset: 'carrel_optimum' | 'compact' | 'wideband_emc') => {
    if (preset === 'carrel_optimum') {
      setTau(0.92);
      setSigma(0.165);
      setFMinMhz(400);
      setFMaxMhz(1000);
    } else if (preset === 'compact') {
      setTau(0.82);
      setSigma(0.10);
      setFMinMhz(470);
      setFMaxMhz(860);
    } else if (preset === 'wideband_emc') {
      setTau(0.95);
      setSigma(0.18);
      setFMinMhz(200);
      setFMaxMhz(2000);
    }
  };

  // Calculations for LPDA
  const lpdaResults = useMemo(() => {
    const fMin = fMinMhz * 1e6; // Hz
    const fMax = fMaxMhz * 1e6; // Hz

    const lambdaMax = c / fMin; // m
    const lambdaMin = c / fMax; // m

    // 1. Apex Angle alpha
    // tan(alpha/2) = (1 - tau) / (4 * sigma)
    const tanAlphaHalf = (1 - tau) / (4 * sigma);
    const alphaHalfRad = Math.atan(tanAlphaHalf);
    const alphaHalfDeg = (alphaHalfRad * 180) / Math.PI;
    const alphaDeg = alphaHalfDeg * 2;

    // 2. Longest and Shortest Dipole Lengths
    // Longest dipole l_N approx lambda_max / 2
    const lMax = lambdaMax / 2;
    // Shortest dipole l_1 approx lambda_min / 2
    const lMin = lambdaMin / 2;

    // 3. Active Region Bandwidth (B_ar) & Design Bandwidth (B_s)
    const B = fMax / fMin;
    const cotAlpha = 1 / Math.tan(alphaHalfRad * 2);
    const Bar = 1.1 + 0.7 * (1 - tau) * cotAlpha;
    const Bs = B * Bar;

    // 4. Number of Dipoles (N)
    // N = 1 + ln(B_s) / ln(1/tau)
    const numElements = Math.max(3, Math.ceil(1 + Math.log(Bs) / Math.log(1 / tau)));

    // 5. Generate Dipole Array Elements (from shortest l_1 to longest l_N)
    const dipoles: Array<{
      index: number;
      lengthCm: number;
      distFromApexM: number;
      spacingCm: number;
      freqMhz: number;
    }> = [];

    // Calculate apex distance for longest dipole R_N = lMax / (2 * tan(alpha/2))
    const RN = lMax / (2 * tanAlphaHalf);

    let currentL = lMax;
    let currentR = RN;

    // We store from longest N down to 1, then reverse for display
    const tempDipoles = [];
    for (let i = numElements; i >= 1; i--) {
      const fRes = c / (2 * currentL) / 1e6; // MHz
      tempDipoles.push({
        index: i,
        lengthCm: currentL * 100,
        distFromApexM: currentR,
        spacingCm: 0,
        freqMhz: fRes,
      });

      currentL = currentL * tau;
      currentR = currentR * tau;
    }

    tempDipoles.reverse(); // Now index 1 is shortest, index N is longest

    // Compute spacings d_i = R_{i+1} - R_i
    for (let i = 0; i < tempDipoles.length; i++) {
      const distNext = i < tempDipoles.length - 1 ? tempDipoles[i + 1].distFromApexM : tempDipoles[i].distFromApexM;
      const spacing = i < tempDipoles.length - 1 ? (distNext - tempDipoles[i].distFromApexM) * 100 : 0;

      dipoles.push({
        ...tempDipoles[i],
        spacingCm: spacing,
      });
    }

    // 6. Total Boom Length L_boom = R_N - R_1
    const R1 = dipoles[0].distFromApexM;
    const boomLengthM = RN - R1;

    // 7. Directivity Estimation based on Carrel's Contour Curves
    // Fit formula: D (dBi) approx 3.8 + 8.5 * log10(1/(1-tau)) + 1.2 * ln(sigma/0.05)
    const directivityDbi = 3.8 + 8.5 * Math.log10(1 / (1 - tau)) + 1.2 * Math.log(sigma / 0.05);

    // Carrel Optimum Sigma check for current Tau
    const sigmaOpt = 0.243 * tau - 0.082;
    const isOptimum = Math.abs(sigma - sigmaOpt) < 0.03;

    return {
      alphaDeg: alphaDeg.toFixed(1),
      alphaHalfDeg: alphaHalfDeg.toFixed(1),
      numElements,
      boomLengthM: boomLengthM.toFixed(2),
      boomLengthCm: (boomLengthM * 100).toFixed(1),
      lMinCm: (lMin * 100).toFixed(1),
      lMaxCm: (lMax * 100).toFixed(1),
      directivityDbi: directivityDbi.toFixed(1),
      sigmaOpt: sigmaOpt.toFixed(3),
      isOptimum,
      dipoles,
    };
  }, [fMinMhz, fMaxMhz, tau, sigma, zLine]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-amber-400" />
          <h2 className="text-slate-100 font-bold text-base">
            Log-Periodic Dipole Array (LPDA) Designer & Carrel Chart
          </h2>
        </div>
        <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
          Frequency-Independent Antenna
        </span>
      </div>

      {/* Quick Design Presets */}
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-2">
          LPDA Design Presets:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => applyPreset('carrel_optimum')}
            className={`p-2.5 rounded-lg border text-left transition ${
              tau === 0.92 && sigma === 0.165
                ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <span className="block font-bold text-amber-400">1. Carrel Optimum Design</span>
            <span className="text-[10px] text-slate-400 block">τ = 0.92, σ = 0.165 | Directivity &gt; 9.5 dBi</span>
          </button>

          <button
            onClick={() => applyPreset('compact')}
            className={`p-2.5 rounded-lg border text-left transition ${
              tau === 0.82 && sigma === 0.1
                ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <span className="block font-bold text-cyan-400">2. Compact TV Receiver</span>
            <span className="text-[10px] text-slate-400 block">τ = 0.82, σ = 0.10 | Short boom length</span>
          </button>

          <button
            onClick={() => applyPreset('wideband_emc')}
            className={`p-2.5 rounded-lg border text-left transition ${
              tau === 0.95 && sigma === 0.18
                ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-bold'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <span className="block font-bold text-purple-400">3. Wideband EMC Testing</span>
            <span className="text-[10px] text-slate-400 block">τ = 0.95, σ = 0.18 | Frequency 200MHz - 2GHz</span>
          </button>
        </div>
      </div>

      {/* Sliders for Primary LPDA Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-800 pt-4">
        {/* Min Frequency f_min */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Lower Frequency (f_min):</span>
            <span className="text-amber-400 font-mono font-bold text-sm">{fMinMhz} MHz</span>
          </div>
          <input
            type="range"
            min="50"
            max="2000"
            step="10"
            value={fMinMhz}
            onChange={e => setFMinMhz(Math.min(fMaxMhz - 20, parseInt(e.target.value)))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">Determines longest dipole length</span>
        </div>

        {/* Max Frequency f_max */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Upper Frequency (f_max):</span>
            <span className="text-amber-400 font-mono font-bold text-sm">{fMaxMhz} MHz</span>
          </div>
          <input
            type="range"
            min="100"
            max="5000"
            step="20"
            value={fMaxMhz}
            onChange={e => setFMaxMhz(Math.max(fMinMhz + 20, parseInt(e.target.value)))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">Determines shortest dipole length</span>
        </div>

        {/* Scaling Factor tau */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Scale Factor (τ = lₙ/lₙ₊₁):</span>
            <span className="text-cyan-400 font-mono font-bold text-sm">{tau}</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="0.98"
            step="0.01"
            value={tau}
            onChange={e => setTau(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">Ratio of adjacent element dimensions</span>
        </div>

        {/* Spacing Factor sigma */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-300 font-semibold">Spacing Factor (σ = dₙ/2lₙ₊₁):</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">{sigma}</span>
          </div>
          <input
            type="range"
            min="0.04"
            max="0.22"
            step="0.005"
            value={sigma}
            onChange={e => setSigma(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">
            Optimum for τ={tau}: {lpdaResults.sigmaOpt}
          </span>
        </div>
      </div>

      {/* Calculated Key Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Total Dipoles (N)</span>
          <span className="text-xl font-black text-amber-400 font-mono">{lpdaResults.numElements} elements</span>
          <span className="text-[9px] text-slate-500 block">N = 1 + ln(B_s)/ln(1/τ)</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Boom Length</span>
          <span className="text-xl font-black text-emerald-400 font-mono">{lpdaResults.boomLengthM} m</span>
          <span className="text-[9px] text-slate-500 block">({lpdaResults.boomLengthCm} cm)</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Apex Angle (α)</span>
          <span className="text-xl font-black text-cyan-400 font-mono">{lpdaResults.alphaDeg}°</span>
          <span className="text-[9px] text-slate-500 block">Half-angle α/2 = {lpdaResults.alphaHalfDeg}°</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Estimated Directivity</span>
          <span className="text-xl font-black text-purple-400 font-mono">{lpdaResults.directivityDbi} dBi</span>
          <span className="text-[9px] text-slate-500 block">Carrel Chart Estimate</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Longest Element (l_max)</span>
          <span className="text-xl font-black text-rose-400 font-mono">{lpdaResults.lMaxCm} cm</span>
          <span className="text-[9px] text-slate-500 block">For {fMinMhz} MHz</span>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Shortest Element (l_min)</span>
          <span className="text-xl font-black text-blue-400 font-mono">{lpdaResults.lMinCm} cm</span>
          <span className="text-[9px] text-slate-500 block">For {fMaxMhz} MHz</span>
        </div>
      </div>

      {/* Geometry Layout & Feeding Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SVG LPDA Geometric Structure */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
          <span className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-amber-400" />
            Geometric Structure & Criss-Cross Feed Line Geometry:
          </span>

          <svg viewBox="0 0 380 220" className="w-full max-w-[360px] h-auto bg-slate-900 rounded-lg p-2 border border-slate-800">
            {/* Apex point and angle guidelines */}
            <line x1="20" y1="110" x2="360" y2="110" stroke="#334155" strokeDasharray="3 3" />

            {/* Apex Center Point */}
            <circle cx="30" cy="110" r="4" fill="#ec4899" />
            <text x="25" y="128" fill="#fbcfe8" fontSize="9" fontWeight="bold">Apex</text>

            {/* Angle lines */}
            <line x1="30" y1="110" x2="360" y2="25" stroke="#475569" strokeDasharray="2 2" />
            <line x1="30" y1="110" x2="360" y2="195" stroke="#475569" strokeDasharray="2 2" />

            {/* Draw dipoles with criss-cross feeding */}
            {(() => {
              const numToShow = Math.min(10, lpdaResults.dipoles.length);
              const stepX = (340 - 50) / (numToShow - 1 || 1);

              return lpdaResults.dipoles.slice(0, numToShow).map((dip, idx) => {
                const xPx = 50 + idx * stepX;
                const halfLenPx = (dip.lengthCm / parseFloat(lpdaResults.lMaxCm)) * 80;

                const topY = 110 - halfLenPx;
                const botY = 110 + halfLenPx;

                // Color alternates or blue/amber
                const dipoleColor = idx % 2 === 0 ? '#f59e0b' : '#38bdf8';

                return (
                  <g key={idx}>
                    {/* Upper Dipole Arm */}
                    <line x1={xPx} y1="108" x2={xPx} y2={topY} stroke={dipoleColor} strokeWidth="3" strokeLinecap="round" />
                    {/* Lower Dipole Arm */}
                    <line x1={xPx} y1="112" x2={xPx} y2={botY} stroke={dipoleColor} strokeWidth="3" strokeLinecap="round" />

                    {/* Criss-Cross Feed Line to Next Element */}
                    {idx < numToShow - 1 && (
                      <g>
                        <line x1={xPx} y1="108" x2={xPx + stepX} y2="112" stroke="#22c55e" strokeWidth="1" strokeDasharray="2 1" />
                        <line x1={xPx} y1="112" x2={xPx + stepX} y2="108" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 1" />
                      </g>
                    )}

                    {/* Element Number Label */}
                    <text x={xPx - 4} y={botY + 12} fill="#94a3b8" fontSize="8" fontWeight="bold">d{dip.index}</text>
                  </g>
                );
              });
            })()}

            {/* Direction of Main Beam Arrow */}
            <line x1="180" y1="20" x2="60" y2="20" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="190" y="24" fill="#4ade80" fontSize="10" fontWeight="bold">Backfire Main Beam Direction</text>
          </svg>

          <span className="text-[11px] text-slate-400 mt-2 text-center">
            Criss-cross feed line (180° phase reversal) produces backfire radiation towards the apex.
          </span>
        </div>

        {/* Carrel Chart (Sigma vs Tau) Contour View */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Carrel Design Chart (σ vs τ Contours):
            </h4>
            <p className="text-[11px] text-slate-400 mb-2">
              Directivity contours (in dBi) as a function of scale factor τ and spacing factor σ:
            </p>
          </div>

          {/* Mini SVG Plot of Carrel Chart */}
          <svg viewBox="0 0 320 170" className="w-full h-auto bg-slate-900 rounded-lg p-2 border border-slate-800">
            {/* Axis box */}
            <rect x="35" y="15" width="265" height="130" fill="none" stroke="#334155" strokeWidth="1" />

            {/* X Axis: Tau (0.80 to 0.98) */}
            <text x="30" y="158" fill="#64748b" fontSize="8">0.80</text>
            <text x="100" y="158" fill="#64748b" fontSize="8">0.85</text>
            <text x="170" y="158" fill="#64748b" fontSize="8">0.90</text>
            <text x="240" y="158" fill="#64748b" fontSize="8">0.95</text>

            {/* Y Axis: Sigma (0.04 to 0.22) */}
            <text x="10" y="145" fill="#64748b" fontSize="8">0.04</text>
            <text x="10" y="85" fill="#64748b" fontSize="8">0.13</text>
            <text x="10" y="25" fill="#64748b" fontSize="8">0.22</text>

            {/* Optimum Line (sigma = 0.243 * tau - 0.082) */}
            {(() => {
              const getX = (tVal: number) => 35 + ((tVal - 0.80) / 0.18) * 265;
              const getY = (sVal: number) => 145 - ((sVal - 0.04) / 0.18) * 130;

              const optStartX = getX(0.80);
              const optStartY = getY(0.243 * 0.80 - 0.082);
              const optEndX = getX(0.98);
              const optEndY = getY(0.243 * 0.98 - 0.082);

              // Current Operating Point
              const curX = getX(tau);
              const curY = getY(sigma);

              return (
                <g>
                  {/* Contour 7.5 dBi */}
                  <path d="M 50,130 Q 100,100 150,120" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="120" y="115" fill="#64748b" fontSize="7">7.5 dBi</text>

                  {/* Contour 8.5 dBi */}
                  <path d="M 80,110 Q 140,70 210,90" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="170" y="80" fill="#94a3b8" fontSize="7">8.5 dBi</text>

                  {/* Contour 10.0 dBi */}
                  <path d="M 150,60 Q 210,30 280,45" fill="none" stroke="#94a3b8" strokeWidth="1" />
                  <text x="230" y="38" fill="#cbd5e1" fontSize="7">10.0 dBi</text>

                  {/* Optimum Line */}
                  <line x1={optStartX} y1={optStartY} x2={optEndX} y2={optEndY} stroke="#10b981" strokeWidth="2" />
                  <text x="180" y="130" fill="#10b981" fontSize="8" fontWeight="bold">Carrel Optimum Line</text>

                  {/* User Operating Point */}
                  <circle cx={curX} cy={curY} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                  <text x={curX + 8} y={curY + 3} fill="#f59e0b" fontSize="9" fontWeight="bold">Operating Point</text>
                </g>
              );
            })()}
          </svg>

          <div className="flex items-center justify-between text-[10px] mt-2 text-slate-300">
            <span className="text-emerald-400 font-bold">🟩 Carrel Optimum Line</span>
            <span className="text-amber-400 font-bold">🟧 Current Operating Point</span>
          </div>
        </div>
      </div>

      {/* Detailed Elements Dimension Table */}
      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Table className="w-4 h-4 text-amber-400" />
            Dipole Array Element Dimensions & Spacing Table:
          </h3>
          <span className="text-[11px] text-slate-400">
            Element Count: {lpdaResults.dipoles.length}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-2.5">Element # (n)</th>
                <th className="p-2.5">Length lₙ (cm)</th>
                <th className="p-2.5">Distance from Apex Rₙ (m)</th>
                <th className="p-2.5">Spacing to Next dₙ (cm)</th>
                <th className="p-2.5">Resonant Freq (MHz)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {lpdaResults.dipoles.map(dip => (
                <tr key={dip.index} className="hover:bg-slate-800/40 transition">
                  <td className="p-2.5 font-bold text-amber-400">Dipole #{dip.index}</td>
                  <td className="p-2.5 text-emerald-300">{dip.lengthCm.toFixed(2)} cm</td>
                  <td className="p-2.5 text-cyan-300">{dip.distFromApexM.toFixed(3)} m</td>
                  <td className="p-2.5 text-purple-300">
                    {dip.spacingCm > 0 ? `${dip.spacingCm.toFixed(2)} cm` : '-'}
                  </td>
                  <td className="p-2.5 text-slate-200">{dip.freqMhz.toFixed(1)} MHz</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
