import React from 'react';
import { AnalysisMetrics } from '../types';
import { AlertTriangle, Compass, Radio, Target, Activity, CheckCircle } from 'lucide-react';

interface MetricsPanelProps {
  metrics: AnalysisMetrics;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Main Lobe Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Main Lobe Direction</span>
          <Compass className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <span className="text-xl sm:text-2xl font-extrabold text-red-400 font-mono">
            {metrics.mainLobeTheta}°
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Elevation Angle θ</span>
        </div>
      </div>

      {/* Beamwidth HPBW Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Beamwidth (HPBW)</span>
          <Target className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono">
            {metrics.hpbwDegrees}°
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Half-Power Level (-3dB)</span>
        </div>
      </div>

      {/* Side Lobe Level SLL Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Side Lobe Level (SLL)</span>
          <Activity className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <span className="text-xl sm:text-2xl font-extrabold text-cyan-400 font-mono">
            {metrics.sllDb.toFixed(1)} dB
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Relative Peak SLL</span>
        </div>
      </div>

      {/* Directivity Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Directivity (D₀)</span>
          <Radio className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
            {metrics.directivityDb} dBi
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Linear: {metrics.directivityLinear}</span>
        </div>
      </div>

      {/* Grating Lobes Banner if exists */}
      {metrics.gratingLobesExist ? (
        <div className="col-span-2 sm:col-span-4 bg-amber-950/80 border border-amber-500/50 p-3 rounded-xl flex items-center gap-3 text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <strong className="font-bold text-amber-300 block">Warning: Grating Lobe Detected!</strong>
            <span>Element spacing (d/λ) is too large for the current steering angle, causing unwanted replica main beams.</span>
          </div>
        </div>
      ) : (
        <div className="col-span-2 sm:col-span-4 bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl flex items-center justify-between text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Element spacing is optimal (No grating lobes in visible space).</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Visible Region Ψ: [{metrics.visibleRangePsi[0].toFixed(2)}, {metrics.visibleRangePsi[1].toFixed(2)}]
          </span>
        </div>
      )}
    </div>
  );
};
