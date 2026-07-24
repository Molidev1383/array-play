import React, { useState, useMemo } from 'react';
import { ArrayConfig, ArrayType, ElementPatternType } from './types';
import { generatePatternData, analyzeArrayPerformance } from './utils/antennaMath';
import { PolarPlot } from './components/PolarPlot';
import { CartesianPlot } from './components/CartesianPlot';
import { ThreeDPatternViewer } from './components/ThreeDPatternViewer';
import { ArrayGeometryViewer } from './components/ArrayGeometryViewer';
import { ArrayControls } from './components/ArrayControls';
import { MetricsPanel } from './components/MetricsPanel';
import { MicrostripPatchCalculator } from './components/MicrostripPatchCalculator';
import { ReflectorAntennaCalculator } from './components/ReflectorAntennaCalculator';
import { LogPeriodicCalculator } from './components/LogPeriodicCalculator';
import { BiconicalAntennaCalculator } from './components/BiconicalAntennaCalculator';
import { AIAssistantModal } from './components/AIAssistantModal';
import { OfflineExportModal } from './components/OfflineExportModal';
import { Radio, Bot, Activity, Sliders, Cpu, Disc, Compass, Zap, Download } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<ArrayConfig>({
    arrayType: 'ula',
    elementPattern: 'short_dipole',
    numElements: 5,
    spacing: 0.5,
    scanningAngle: 90,
    progressivePhase: 0,
    useScanningAngle: true,
    dolphSllDb: -30,
    numElementsY: 4,
    spacingY: 0.5,
    scanningAnglePhi: 0,
    progressivePhaseY: 0,
    radius: 0.5,
    patchExponent: 1,
    customAmplitudes: [1, 1, 1, 1, 1],
    customPhases: [0, 0, 0, 0, 0],
  });

  const [activeTab, setActiveTab] = useState<'patterns' | 'layout' | 'patch' | 'reflector' | 'lpda' | 'biconical'>('patterns');
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);

  // Re-calculate pattern points and metrics when configuration changes
  const patternData = useMemo(() => {
    return generatePatternData(config, config.scanningAnglePhi || 0, 360);
  }, [config]);

  const metrics = useMemo(() => {
    return analyzeArrayPerformance(config, patternData);
  }, [config, patternData]);

  // Handle preset selections
  const handleSelectPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'broadside_5':
        setConfig(prev => ({
          ...prev,
          arrayType: 'ula',
          elementPattern: 'short_dipole',
          numElements: 5,
          spacing: 0.5,
          scanningAngle: 90,
          useScanningAngle: true,
        }));
        break;

      case 'endfire_4':
        setConfig(prev => ({
          ...prev,
          arrayType: 'ula',
          elementPattern: 'isotropic',
          numElements: 4,
          spacing: 0.25,
          scanningAngle: 0,
          useScanningAngle: true,
        }));
        break;

      case 'dolph_chebyshev_10':
        setConfig(prev => ({
          ...prev,
          arrayType: 'dolph_chebyshev',
          elementPattern: 'isotropic',
          numElements: 10,
          spacing: 0.5,
          dolphSllDb: -30,
          scanningAngle: 90,
          useScanningAngle: true,
        }));
        break;

      case 'binomial_4':
        setConfig(prev => ({
          ...prev,
          arrayType: 'binomial',
          elementPattern: 'isotropic',
          numElements: 4,
          spacing: 0.5,
          scanningAngle: 90,
          useScanningAngle: true,
        }));
        break;

      case 'planar_4x4':
        setConfig(prev => ({
          ...prev,
          arrayType: 'planar',
          elementPattern: 'patch_approx',
          numElements: 4,
          numElementsY: 4,
          spacing: 0.5,
          spacingY: 0.5,
          scanningAngle: 90,
          scanningAnglePhi: 0,
          useScanningAngle: true,
        }));
        break;

      case 'circular_8':
        setConfig(prev => ({
          ...prev,
          arrayType: 'circular',
          elementPattern: 'short_dipole',
          numElements: 8,
          radius: 0.8,
          scanningAngle: 90,
          scanningAnglePhi: 0,
          useScanningAngle: true,
        }));
        break;

      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-3 sm:p-5 flex flex-col gap-5">
      {/* Top Application Bar */}
      <header className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center text-white shadow-lg">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                ArrayPlay
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v2.5
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Antenna Array & Electromagnetics Interactive Playground
            </p>
          </div>
        </div>

        {/* Action Buttons & Author Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-xs text-slate-400 border-r border-slate-800 pr-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Created by</span>
            <span className="font-bold text-amber-400">Mahdi Moltamesi</span>
          </div>

          {/* Offline / ZIP Export Button */}
          <button
            onClick={() => setIsOfflineModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 rounded-xl font-bold text-xs shadow transition"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Download ZIP / Offline</span>
          </button>

          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition"
          >
            <Bot className="w-4 h-4" />
            <span>Gemini AI Advisor</span>
          </button>
        </div>
      </header>

      {/* Real-time Metrics Overview */}
      <MetricsPanel metrics={metrics} />

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Controls (5 Cols on large) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <ArrayControls
            config={config}
            onChange={setConfig}
            onSelectPreset={handleSelectPreset}
          />
        </div>

        {/* Right Column: Visualizations & Analysis (7 Cols on large) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Main View Tabs Header */}
          <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800 flex flex-wrap items-center gap-1 text-xs sm:text-sm font-semibold">
            <button
              onClick={() => setActiveTab('patterns')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition ${
                activeTab === 'patterns'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Radiation Patterns (2D & 3D)</span>
            </button>

            <button
              onClick={() => setActiveTab('layout')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition ${
                activeTab === 'layout'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Array Layout & Feeds</span>
            </button>

            <button
              onClick={() => setActiveTab('patch')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition ${
                activeTab === 'patch'
                  ? 'bg-amber-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Microstrip Patch</span>
            </button>

            <button
              onClick={() => setActiveTab('reflector')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition ${
                activeTab === 'reflector'
                  ? 'bg-cyan-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Disc className="w-4 h-4" />
              <span>Reflector Dish</span>
            </button>

            <button
              onClick={() => setActiveTab('lpda')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition ${
                activeTab === 'lpda'
                  ? 'bg-purple-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Log-Periodic (LPDA)</span>
            </button>

            <button
              onClick={() => setActiveTab('biconical')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition ${
                activeTab === 'biconical'
                  ? 'bg-amber-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Biconical</span>
            </button>
          </div>

          {/* Tab 1: 2D & 3D Pattern Views */}
          {activeTab === 'patterns' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PolarPlot
                  data={patternData}
                  mainLobeTheta={metrics.mainLobeTheta}
                  sllDb={metrics.sllDb}
                />

                <ThreeDPatternViewer config={config} />
              </div>

              <CartesianPlot
                data={patternData}
                mainLobeTheta={metrics.mainLobeTheta}
                sllDb={metrics.sllDb}
              />
            </div>
          )}

          {/* Tab 2: Array Layout & Feed Coefficients Viewer */}
          {activeTab === 'layout' && (
            <ArrayGeometryViewer config={config} />
          )}

          {/* Tab 3: Microstrip Patch Calculator */}
          {activeTab === 'patch' && (
            <MicrostripPatchCalculator />
          )}

          {/* Tab 4: Reflector Antenna Calculator */}
          {activeTab === 'reflector' && (
            <ReflectorAntennaCalculator />
          )}

          {/* Tab 5: LPDA Designer */}
          {activeTab === 'lpda' && (
            <LogPeriodicCalculator />
          )}

          {/* Tab 6: Biconical Antenna Calculator */}
          {activeTab === 'biconical' && (
            <BiconicalAntennaCalculator />
          )}
        </div>
      </div>

      {/* Modals */}
      <AIAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        config={config}
        metrics={metrics}
      />

      <OfflineExportModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-6 border-t border-slate-800/80 pt-5 pb-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold text-slate-200">ArrayPlay v2.5</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Interactive Electromagnetics & Antenna Array Suite
          </span>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
          <span className="text-slate-400">Designed & Developed by</span>
          <span className="font-bold text-amber-400 hover:text-amber-300 transition">Mahdi Moltamesi</span>
        </div>
      </footer>
    </div>
  );
}
