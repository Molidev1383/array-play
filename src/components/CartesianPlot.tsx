import React, { useRef, useEffect, useState } from 'react';
import { PatternPoint } from '../types';
import { BarChart2 } from 'lucide-react';

interface CartesianPlotProps {
  data: PatternPoint[];
  mainLobeTheta: number;
  hpbwDegrees: number;
  sllDb: number;
}

export const CartesianPlot: React.FC<CartesianPlotProps> = ({ data, mainLobeTheta, hpbwDegrees, sllDb }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [xAxisMode, setXAxisMode] = useState<'theta' | 'psi'>('theta');
  const [useDbScale, setUseDbScale] = useState<boolean>(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 500;
    const height = 280;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 25, bottom: 40, left: 50 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    // Draw Axes Box & Grid
    ctx.fillStyle = '#090d16';
    ctx.fillRect(padding.left, padding.top, plotW, plotH);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Horizontal Y-Grid lines
    const ySteps = useDbScale ? [-40, -30, -20, -10, -3, 0] : [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    ySteps.forEach(yVal => {
      let normY = 0;
      if (useDbScale) {
        normY = (yVal + 40) / 40; // -40dB -> 0, 0dB -> 1
      } else {
        normY = yVal as number;
      }
      const yPos = padding.top + plotH * (1 - normY);

      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + plotW, yPos);
      ctx.strokeStyle = yVal === -3 ? '#f59e0b40' : '#1e293b';
      ctx.setLineDash(yVal === -3 ? [4, 4] : []);
      ctx.stroke();

      ctx.fillStyle = yVal === -3 ? '#f59e0b' : '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(useDbScale ? `${yVal} dB` : `${yVal}`, padding.left - 8, yPos + 3);
    });

    ctx.setLineDash([]);

    // Filter slice (0 to 180 degrees)
    const sliceData = data.filter(d => d.thetaDeg <= 180);

    // X-Axis Mapping
    const getXPos = (pt: PatternPoint) => {
      if (xAxisMode === 'psi') {
        const minPsi = -Math.PI * 2;
        const maxPsi = Math.PI * 2;
        return padding.left + ((pt.psi - minPsi) / (maxPsi - minPsi)) * plotW;
      }
      return padding.left + (pt.thetaDeg / 180) * plotW;
    };

    const getYPos = (valNorm: number, dbVal: number) => {
      if (useDbScale) {
        const clampedDb = Math.max(-40, dbVal);
        const normY = (clampedDb + 40) / 40;
        return padding.top + plotH * (1 - normY);
      }
      return padding.top + plotH * (1 - Math.max(0, Math.min(1, valNorm)));
    };

    // Draw X Grid Labels
    const xLabels = xAxisMode === 'psi' 
      ? ['-2π', '-π', '0', 'π', '2π']
      : ['0°', '30°', '60°', '90°', '120°', '150°', '180°'];

    xLabels.forEach((lbl, idx) => {
      const frac = idx / (xLabels.length - 1);
      const xPos = padding.left + frac * plotW;

      ctx.beginPath();
      ctx.moveTo(xPos, padding.top);
      ctx.lineTo(xPos, padding.top + plotH);
      ctx.strokeStyle = '#1e293b';
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, xPos, padding.top + plotH + 18);
    });

    // Draw Array Factor (AF) - Cyan
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    sliceData.forEach((pt, i) => {
      const x = getXPos(pt);
      const y = getYPos(pt.arrayFactor, pt.dbAF);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Total Pattern - Emerald Solid
    ctx.beginPath();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    sliceData.forEach((pt, i) => {
      const x = getXPos(pt);
      const y = getYPos(pt.totalPattern, pt.dbTotal);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      xAxisMode === 'psi' ? 'Array Phase Ψ = kd cos(θ) + δ (rad)' : 'Elevation Angle θ (deg)',
      padding.left + plotW / 2,
      height - 8
    );
  }, [data, xAxisMode, useDbScale, mainLobeTheta]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-cyan-400" />
          <h3 className="text-slate-100 font-bold text-sm sm:text-base">Cartesian Pattern</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Axis Selector */}
          <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setXAxisMode('theta')}
              className={`px-2.5 py-1 rounded-md transition ${xAxisMode === 'theta' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
            >
              vs. θ
            </button>
            <button
              onClick={() => setXAxisMode('psi')}
              className={`px-2.5 py-1 rounded-md transition ${xAxisMode === 'psi' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
            >
              vs. Ψ
            </button>
          </div>

          <button
            onClick={() => setUseDbScale(!useDbScale)}
            className="text-xs bg-slate-800 border border-slate-700 hover:border-slate-600 px-2.5 py-1 rounded-lg text-slate-200 transition"
          >
            {useDbScale ? 'Scale: dB' : 'Scale: Linear'}
          </button>
        </div>
      </div>

      <div className="relative w-full">
        <canvas ref={canvasRef} className="w-full rounded-lg bg-slate-950 border border-slate-850" />
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
        <span>Half-Power Beamwidth (HPBW): <strong className="text-amber-400">{hpbwDegrees}°</strong></span>
        <span>Side Lobe Level (SLL): <strong className="text-cyan-400">{sllDb.toFixed(1)} dB</strong></span>
      </div>
    </div>
  );
};
