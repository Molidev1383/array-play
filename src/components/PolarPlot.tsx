import React, { useRef, useEffect, useState } from 'react';
import { PatternPoint } from '../types';
import { Eye, Layers, Zap } from 'lucide-react';

interface PolarPlotProps {
  data: PatternPoint[];
  mainLobeTheta: number;
  sllDb: number;
}

export const PolarPlot: React.FC<PolarPlotProps> = ({ data, mainLobeTheta, sllDb }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scaleType, setScaleType] = useState<'db' | 'linear'>('db');
  const [showAF, setShowAF] = useState<boolean>(true);
  const [showElement, setShowElement] = useState<boolean>(true);
  const [showTotal, setShowTotal] = useState<boolean>(true);
  const [hoverInfo, setHoverInfo] = useState<{ theta: number; af: number; ef: number; tot: number; db: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 500;
    const height = Math.min(width, 500);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(centerX, centerY) - 45;

    // Draw Polar Grid Background
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#334155'; // slate-700

    // Draw concentric circles
    const circles = scaleType === 'db' ? [-40, -30, -20, -10, 0] : [0.2, 0.4, 0.6, 0.8, 1.0];
    circles.forEach((val, idx) => {
      let rRatio = 0;
      if (scaleType === 'db') {
        rRatio = (val + 40) / 40; // -40dB -> 0, 0dB -> 1
      } else {
        rRatio = val as number;
      }
      const radius = rRatio * maxRadius;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = idx === circles.length - 1 ? '#64748b' : '#1e293b';
      ctx.setLineDash(idx === circles.length - 1 ? [] : [3, 3]);
      ctx.stroke();

      // Label
      if (radius > 10) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Vazirmatn, sans-serif';
        ctx.textAlign = 'center';
        ctx.setLineDash([]);
        const labelText = scaleType === 'db' ? `${val} dB` : `${val}`;
        ctx.fillText(labelText, centerX + 12, centerY - radius + 4);
      }
    });

    // Draw radial degree lines
    ctx.setLineDash([]);
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = (deg - 90) * (Math.PI / 180); // 0 deg at top (+Z axis)
      const x = centerX + maxRadius * Math.cos(rad);
      const y = centerY + maxRadius * Math.sin(rad);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = deg % 90 === 0 ? '#475569' : '#1e293b';
      ctx.stroke();

      // Degree labels
      const labelX = centerX + (maxRadius + 18) * Math.cos(rad);
      const labelY = centerY + (maxRadius + 18) * Math.sin(rad) + 4;
      ctx.fillStyle = deg % 90 === 0 ? '#f8fafc' : '#94a3b8';
      ctx.font = deg % 90 === 0 ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${deg}°`, labelX, labelY);
    }

    // Function to calculate radius given normalized value / dB
    const getRadius = (valNorm: number, dbVal: number) => {
      if (scaleType === 'db') {
        const clampedDb = Math.max(-40, dbVal);
        return ((clampedDb + 40) / 40) * maxRadius;
      }
      return Math.max(0, valNorm) * maxRadius;
    };

    // Draw Array Factor (AF) - Cyan
    if (showAF) {
      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4'; // cyan-500
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);

      data.forEach((pt, idx) => {
        const rad = (pt.thetaDeg - 90) * (Math.PI / 180);
        const r = getRadius(pt.arrayFactor, pt.dbAF);
        const x = centerX + r * Math.cos(rad);
        const y = centerY + r * Math.sin(rad);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Element Pattern (E_0) - Amber
    if (showElement) {
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b'; // amber-500
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);

      data.forEach((pt, idx) => {
        const rad = (pt.thetaDeg - 90) * (Math.PI / 180);
        const r = getRadius(pt.elementFactor, pt.dbElement);
        const x = centerX + r * Math.cos(rad);
        const y = centerY + r * Math.sin(rad);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Total Pattern (E_total = AF * E_0) - Emerald
    if (showTotal) {
      // Gradient Fill
      ctx.beginPath();
      data.forEach((pt, idx) => {
        const rad = (pt.thetaDeg - 90) * (Math.PI / 180);
        const r = getRadius(pt.totalPattern, pt.dbTotal);
        const x = centerX + r * Math.cos(rad);
        const y = centerY + r * Math.sin(rad);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, maxRadius);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#10b981'; // emerald-500
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Draw Main Lobe Direction Pointer Arrow
    const mainRad = (mainLobeTheta - 90) * (Math.PI / 180);
    const arrowLen = maxRadius + 5;
    const ax = centerX + arrowLen * Math.cos(mainRad);
    const ay = centerY + arrowLen * Math.sin(mainRad);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(ax, ay);
    ctx.strokeStyle = '#ef4444'; // red-500
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(ax, ay, 4, 0, 2 * Math.PI);
    ctx.fill();
  }, [data, scaleType, showAF, showElement, showTotal, mainLobeTheta]);

  // Handle Mouse Hover for Tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Convert (x,y) to angle in deg (0 at top)
    let angleRad = Math.atan2(y, x) + Math.PI / 2;
    if (angleRad < 0) angleRad += 2 * Math.PI;
    let angleDeg = Math.round((angleRad * 180) / Math.PI);

    const pt = data.find(p => Math.abs(p.thetaDeg - angleDeg) <= 1) || data[0];
    if (pt) {
      setHoverInfo({
        theta: Math.round(pt.thetaDeg),
        af: Number(pt.arrayFactor.toFixed(3)),
        ef: Number(pt.elementFactor.toFixed(3)),
        tot: Number(pt.totalPattern.toFixed(3)),
        db: Number(pt.dbTotal.toFixed(1)),
      });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center shadow-lg relative">
      {/* Header & Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h3 className="text-slate-100 font-bold text-sm sm:text-base">2D Polar Pattern</h3>
        </div>

        {/* Scale Toggle */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setScaleType('db')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              scaleType === 'db' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            dB Scale (-40 to 0)
          </button>
          <button
            onClick={() => setScaleType('linear')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
              scaleType === 'linear' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Linear Scale (0 to 1)
          </button>
        </div>
      </div>

      {/* Layer Toggles & Legends */}
      <div className="w-full flex flex-wrap items-center justify-center gap-3 text-xs mb-3">
        <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-md text-cyan-300 border border-cyan-500/30">
          <input
            type="checkbox"
            checked={showAF}
            onChange={e => setShowAF(e.target.checked)}
            className="accent-cyan-500 rounded"
          />
          <span className="w-2.5 h-0.5 bg-cyan-400 inline-block border-t border-dashed"></span>
          Array Factor (AF)
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-md text-amber-300 border border-amber-500/30">
          <input
            type="checkbox"
            checked={showElement}
            onChange={e => setShowElement(e.target.checked)}
            className="accent-amber-500 rounded"
          />
          <span className="w-2.5 h-0.5 bg-amber-400 inline-block border-t border-dotted"></span>
          Element Pattern (E₀)
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer bg-slate-800/80 px-2.5 py-1.5 rounded-md text-emerald-300 border border-emerald-500/30 font-bold">
          <input
            type="checkbox"
            checked={showTotal}
            onChange={e => setShowTotal(e.target.checked)}
            className="accent-emerald-500 rounded"
          />
          <span className="w-3 h-1 bg-emerald-500 rounded inline-block"></span>
          Total Pattern (AF × E₀)
        </label>
      </div>

      {/* Canvas */}
      <div className="relative w-full flex justify-center">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          className="cursor-crosshair rounded-lg bg-slate-950/80 border border-slate-800"
        />

        {/* Floating Tooltip */}
        {hoverInfo && (
          <div className="absolute top-3 left-3 bg-slate-950/90 border border-emerald-500/40 p-2.5 rounded-lg text-xs backdrop-blur-md shadow-xl text-slate-200">
            <p className="font-bold text-emerald-400 mb-1">Angle: {hoverInfo.theta}°</p>
            <p className="text-cyan-300">AF: {hoverInfo.af}</p>
            <p className="text-amber-300">E₀: {hoverInfo.ef}</p>
            <p className="text-emerald-300 font-bold">E_total: {hoverInfo.tot} ({hoverInfo.db} dB)</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full mt-3 text-center text-xs text-slate-400 border-t border-slate-800 pt-2 flex justify-around">
        <span>Main Beam: <strong className="text-red-400">{mainLobeTheta}°</strong></span>
        <span>Pattern Multiplication: <strong className="text-emerald-400">E = AF × E₀</strong></span>
      </div>
    </div>
  );
};
