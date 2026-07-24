import React from 'react';
import { ArrayConfig, ArrayType, ElementPatternType } from '../types';
import { Settings, Sparkles, Layers, Sliders, Zap } from 'lucide-react';

interface ArrayControlsProps {
  config: ArrayConfig;
  onChange: (newConfig: ArrayConfig) => void;
  onSelectPreset: (presetName: string) => void;
}

export const ArrayControls: React.FC<ArrayControlsProps> = ({ config, onChange, onSelectPreset }) => {
  const updateConfig = (key: keyof ArrayConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <h2 className="text-slate-100 font-bold text-base">Array Configuration & Parameters</h2>
        </div>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
          Pattern Multiplication Enabled
        </span>
      </div>

      {/* Quick Presets Section */}
      <div>
        <label className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Standard Array Presets:
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
          <button
            onClick={() => onSelectPreset('broadside_5')}
            className="p-2 bg-slate-800 hover:bg-slate-750 hover:border-emerald-500/50 border border-slate-700 rounded-lg text-left text-slate-200 transition"
          >
            <span className="font-bold text-emerald-400 block mb-0.5">5-Element Broadside</span>
            <span className="text-[10px] text-slate-400">ULA, d=0.5λ, θ₀=90°</span>
          </button>

          <button
            onClick={() => onSelectPreset('endfire_4')}
            className="p-2 bg-slate-800 hover:bg-slate-750 hover:border-amber-500/50 border border-slate-700 rounded-lg text-left text-slate-200 transition"
          >
            <span className="font-bold text-amber-400 block mb-0.5">4-Element End-Fire</span>
            <span className="text-[10px] text-slate-400">ULA, d=0.25λ, θ₀=0°</span>
          </button>

          <button
            onClick={() => onSelectPreset('dolph_chebyshev_10')}
            className="p-2 bg-slate-800 hover:bg-slate-750 hover:border-cyan-500/50 border border-slate-700 rounded-lg text-left text-slate-200 transition"
          >
            <span className="font-bold text-cyan-400 block mb-0.5">Dolph-Chebyshev (-30dB)</span>
            <span className="text-[10px] text-slate-400">10 elements, SLL=-30dB</span>
          </button>

          <button
            onClick={() => onSelectPreset('binomial_4')}
            className="p-2 bg-slate-800 hover:bg-slate-750 hover:border-purple-500/50 border border-slate-700 rounded-lg text-left text-slate-200 transition"
          >
            <span className="font-bold text-purple-400 block mb-0.5">Binomial Array</span>
            <span className="text-[10px] text-slate-400">Coeffs 1,3,3,1 (d=0.5λ)</span>
          </button>

          <button
            onClick={() => onSelectPreset('planar_4x4')}
            className="p-2 bg-slate-800 hover:bg-slate-750 hover:border-blue-500/50 border border-slate-700 rounded-lg text-left text-slate-200 transition"
          >
            <span className="font-bold text-blue-400 block mb-0.5">4x4 Planar Array</span>
            <span className="text-[10px] text-slate-400">2D Planar, 2D Beam Scanning</span>
          </button>

          <button
            onClick={() => onSelectPreset('circular_8')}
            className="p-2 bg-slate-800 hover:bg-slate-750 hover:border-rose-500/50 border border-slate-700 rounded-lg text-left text-slate-200 transition"
          >
            <span className="font-bold text-rose-400 block mb-0.5">8-Element Circular</span>
            <span className="text-[10px] text-slate-400">Radius a = 0.5λ</span>
          </button>

          <button
            onClick={() => onSelectPreset('grating_lobe_test')}
            className="p-2 bg-slate-800 hover:bg-slate-750 hover:border-red-500/50 border border-slate-700 rounded-lg text-left text-slate-200 transition"
          >
            <span className="font-bold text-red-400 block mb-0.5">Grating Lobe Test</span>
            <span className="text-[10px] text-slate-400">d = 1.25λ (Grating Lobe)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-800 pt-4">
        {/* Array Type Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">Array Topology:</label>
          <select
            value={config.arrayType}
            onChange={e => updateConfig('arrayType', e.target.value as ArrayType)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-lg p-2.5 focus:border-emerald-500 focus:outline-none"
          >
            <option value="ula">Uniform Linear Array (ULA)</option>
            <option value="dolph_chebyshev">Dolph-Chebyshev Array</option>
            <option value="binomial">Binomial Array</option>
            <option value="planar">2D Planar Array</option>
            <option value="circular">Circular Array</option>
            <option value="custom">Custom Array (Amplitudes & Phases)</option>
          </select>
        </div>

        {/* Element Pattern Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">Single Element Pattern:</label>
          <select
            value={config.elementPattern}
            onChange={e => updateConfig('elementPattern', e.target.value as ElementPatternType)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-lg p-2.5 focus:border-emerald-500 focus:outline-none"
          >
            <option value="isotropic">Isotropic / Omnidirectional (E₀ = 1)</option>
            <option value="short_dipole">Vertical Short Dipole (E₀ = |sin θ|)</option>
            <option value="half_wave_dipole">Half-Wave Dipole (z-oriented)</option>
            <option value="patch_cosine">Microstrip Patch / Directional (E₀ = cosⁿ θ)</option>
            <option value="short_dipole_x">Horizontal Short Dipole (x-oriented)</option>
          </select>
        </div>
      </div>

      {/* Sliders Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-800 pt-4">
        {config.arrayType === 'planar' ? (
          <>
            {/* Nx - Number of Elements along X */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-semibold">Elements along X (Nx):</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">{config.numElements} elements</span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                value={config.numElements}
                onChange={e => updateConfig('numElements', parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Ny - Number of Elements along Y */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-semibold">Elements along Y (Ny):</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">{config.numElementsY || 4} elements</span>
              </div>
              <input
                type="range"
                min="2"
                max="24"
                value={config.numElementsY || 4}
                onChange={e => updateConfig('numElementsY', parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* dx/lambda - Element Spacing X */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-semibold">Spacing along X (dx/λ):</span>
                <span className="text-amber-400 font-mono font-bold text-sm">{config.spacing} λ</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={config.spacing}
                onChange={e => updateConfig('spacing', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex gap-1.5 mt-1.5 text-[10px]">
                <button
                  onClick={() => updateConfig('spacing', 0.25)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  0.25λ
                </button>
                <button
                  onClick={() => updateConfig('spacing', 0.5)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 font-bold"
                >
                  0.5λ
                </button>
                <button
                  onClick={() => updateConfig('spacing', 0.75)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  0.75λ
                </button>
              </div>
            </div>

            {/* dy/lambda - Element Spacing Y */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-semibold">Spacing along Y (dy/λ):</span>
                <span className="text-amber-400 font-mono font-bold text-sm">{config.spacingY || 0.5} λ</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={config.spacingY || 0.5}
                onChange={e => updateConfig('spacingY', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex gap-1.5 mt-1.5 text-[10px]">
                <button
                  onClick={() => updateConfig('spacingY', 0.25)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  0.25λ
                </button>
                <button
                  onClick={() => updateConfig('spacingY', 0.5)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 font-bold"
                >
                  0.5λ
                </button>
                <button
                  onClick={() => updateConfig('spacingY', 0.75)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  0.75λ
                </button>
              </div>
            </div>

            {/* Scanning Theta_0 */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-semibold">Scan Elevation Angle (θ₀):</span>
                <span className="text-cyan-400 font-mono font-bold text-sm">{config.scanningAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                value={config.scanningAngle}
                onChange={e => updateConfig('scanningAngle', parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Scanning Phi_0 */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-semibold">Scan Azimuth Angle (φ₀):</span>
                <span className="text-cyan-400 font-mono font-bold text-sm">{config.scanningAnglePhi || 0}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={config.scanningAnglePhi || 0}
                onChange={e => updateConfig('scanningAnglePhi', parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </>
        ) : (
          <>
            {/* Number of Elements N */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-semibold">Number of Elements (N):</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">{config.numElements} elements</span>
              </div>
              <input
                type="range"
                min="2"
                max="32"
                value={config.numElements}
                onChange={e => updateConfig('numElements', parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Element Spacing d/lambda */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-semibold">Element Spacing (d/λ):</span>
                <span className="text-amber-400 font-mono font-bold text-sm">{config.spacing} λ</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={config.spacing}
                onChange={e => updateConfig('spacing', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              {/* Quick Spacing Buttons */}
              <div className="flex gap-1.5 mt-1.5 text-[10px]">
                <button
                  onClick={() => updateConfig('spacing', 0.25)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  0.25λ
                </button>
                <button
                  onClick={() => updateConfig('spacing', 0.5)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700 font-bold"
                >
                  0.5λ (Standard)
                </button>
                <button
                  onClick={() => updateConfig('spacing', 0.75)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                >
                  0.75λ
                </button>
                <button
                  onClick={() => updateConfig('spacing', 1.0)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-red-300 rounded border border-slate-700"
                >
                  1.0λ
                </button>
              </div>
            </div>

            {/* Scanning Angle theta_0 */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-300 font-semibold">Main Beam Steering Angle (θ₀):</span>
                <span className="text-cyan-400 font-mono font-bold text-sm">{config.scanningAngle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                value={config.scanningAngle}
                onChange={e => updateConfig('scanningAngle', parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Progressive phase shift δ = -kd cos(θ₀) automatically applied.
              </span>
            </div>
          </>
        )}

        {/* Dolph-Chebyshev SLL Target Slider (Only if dolph_chebyshev) */}
        {config.arrayType === 'dolph_chebyshev' && (
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-300 font-semibold">Target Side Lobe Level (SLL):</span>
              <span className="text-purple-400 font-mono font-bold text-sm">{config.dolphSllDb} dB</span>
            </div>
            <input
              type="range"
              min="-40"
              max="-15"
              step="1"
              value={config.dolphSllDb}
              onChange={e => updateConfig('dolphSllDb', parseInt(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Dolph-Chebyshev excitation weights derived from Tₘ(x) polynomials.
            </span>
          </div>
        )}

        {/* Patch Exponent (Only if patch_cosine) */}
        {config.elementPattern === 'patch_cosine' && (
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-300 font-semibold">Patch Directivity Exponent (cosⁿ θ):</span>
              <span className="text-amber-400 font-mono font-bold text-sm">n = {config.patchExponent || 1}</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              value={config.patchExponent || 1}
              onChange={e => updateConfig('patchExponent', parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
};
