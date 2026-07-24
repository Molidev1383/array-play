import React from 'react';
import { ArrayConfig } from '../types';
import { Sliders, Info } from 'lucide-react';

interface ArrayGeometryViewerProps {
  config: ArrayConfig;
  weights: number[];
  phases: number[];
  onChangeCustomWeight?: (index: number, val: number) => void;
  onChangeCustomPhase?: (index: number, val: number) => void;
}

export const ArrayGeometryViewer: React.FC<ArrayGeometryViewerProps> = ({
  config,
  weights,
  phases,
  onChangeCustomWeight,
  onChangeCustomPhase,
}) => {
  const isCustom = config.arrayType === 'custom';
  const isPlanar = config.arrayType === 'planar';

  const Nx = config.numElements;
  const Ny = config.numElementsY || 4;
  const totalElements = isPlanar ? Nx * Ny : config.numElements;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-purple-400" />
          <h3 className="text-slate-100 font-bold text-sm sm:text-base">Array Layout & Excitation</h3>
        </div>
        <span className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-full font-medium">
          {isPlanar ? `Matrix ${Nx}×${Ny} (${totalElements} elements)` : `${totalElements} elements | Spacing: ${config.spacing} λ`}
        </span>
      </div>

      {/* Visual Spatial Diagram of Elements */}
      <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg flex flex-col items-center gap-3 relative overflow-x-auto">
        {isPlanar ? (
          <div className="w-full flex flex-col items-center gap-3 py-2">
            <div className="text-xs text-slate-400 w-full flex justify-between mb-1">
              <span>2D Planar Layout (XY Plane)</span>
              <span>dx = {config.spacing}λ, dy = {config.spacingY || 0.5}λ</span>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col gap-2 shadow-inner overflow-x-auto max-w-full">
              {Array.from({ length: Ny }).map((_, nyIdx) => (
                <div key={nyIdx} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 w-8 text-left">Y#{nyIdx + 1}</span>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Nx }).map((_, nxIdx) => (
                      <div
                        key={nxIdx}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-850 border border-amber-500/40 hover:border-amber-400 flex flex-col items-center justify-center transition shadow group relative"
                      >
                        <span className="text-[10px] font-extrabold text-amber-300">
                          {nxIdx + 1},{nyIdx + 1}
                        </span>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 mt-0.5 animate-pulse" />

                        {/* Hover Tooltip */}
                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition bg-slate-800 border border-slate-700 text-slate-200 text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                          x = {(nxIdx * config.spacing).toFixed(2)}λ, y = {(nyIdx * (config.spacingY || 0.5)).toFixed(2)}λ
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs text-slate-400 w-full flex justify-between mb-1">
              <span>Spatial Axis (z / λ)</span>
              <span>Bar Height = Amplitude aₙ | Angle = Phase δₙ</span>
            </div>

            {/* 2D Line & Elements */}
            <div className="w-full flex items-end justify-center gap-3 sm:gap-6 min-w-[320px] py-4 border-b border-slate-800">
              {weights.map((w, idx) => {
                const phaseDeg = phases[idx] !== undefined ? Math.round(phases[idx]) : 0;
                const barHeight = Math.max(16, w * 90);

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition bg-slate-800 border border-slate-700 text-slate-200 text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none z-10 whitespace-nowrap">
                      Element #{idx + 1}: a={w.toFixed(2)}, δ={phaseDeg}°
                    </div>

                    {/* Phase indicator text */}
                    <span className="text-[10px] font-mono text-purple-300">{phaseDeg}°</span>

                    {/* Amplitude Bar */}
                    <div
                      style={{ height: `${barHeight}px` }}
                      className="w-4 sm:w-6 bg-gradient-to-t from-purple-700 to-amber-400 rounded-t-md shadow-md border-t border-amber-300 transition-all duration-300"
                    />

                    {/* Antenna Icon Circle */}
                    <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center shadow-lg border border-amber-300">
                      {idx + 1}
                    </div>

                    <span className="text-[10px] font-bold text-slate-400">{(idx * config.spacing).toFixed(2)}λ</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Editable Table for Custom Array Type */}
      {isCustom && onChangeCustomWeight && onChangeCustomPhase && (
        <div className="mt-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
          <p className="text-xs text-amber-300 font-semibold mb-2 flex items-center gap-1">
            <Info className="w-4 h-4" />
            Manual Amplitude and Phase Settings for Custom Array:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
            {weights.map((w, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800 text-xs gap-2">
                <span className="font-bold text-slate-300">Element #{idx + 1}</span>
                <div className="flex items-center gap-2">
                  <label className="text-slate-400">a:</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="2"
                    value={w}
                    onChange={e => onChangeCustomWeight(idx, parseFloat(e.target.value) || 0)}
                    className="w-14 bg-slate-800 border border-slate-700 text-amber-300 rounded px-1.5 py-0.5 text-center font-mono"
                  />

                  <label className="text-slate-400">δ(°):</label>
                  <input
                    type="number"
                    step="5"
                    value={phases[idx] || 0}
                    onChange={e => onChangeCustomPhase(idx, parseFloat(e.target.value) || 0)}
                    className="w-16 bg-slate-800 border border-slate-700 text-purple-300 rounded px-1.5 py-0.5 text-center font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
