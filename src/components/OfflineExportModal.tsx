import React from 'react';
import { X, Download, HardDrive, Terminal, FileCode, CheckCircle2, FolderArchive, Sparkles } from 'lucide-react';

interface OfflineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineExportModal: React.FC<OfflineExportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleDownloadStandaloneHTML = () => {
    const pageHtml = document.documentElement.outerHTML;
    const blob = new Blob([pageHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ArrayPlay-Standalone.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">
                Download Source Code & Offline Guide
              </h3>
              <p className="text-xs text-slate-400">
                How to get the complete ArrayPlay ZIP repository and run it locally
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Main Callout: How to Export ZIP from AI Studio */}
          <div className="bg-gradient-to-r from-emerald-950/80 to-slate-950 border border-emerald-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <HardDrive className="w-5 h-5" />
                <span>1. Download Full Source Code ZIP (AI Studio Top Menu)</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                Recommended
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Google AI Studio provides a native one-click export for the entire React + Vite + TypeScript repository:
            </p>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg text-xs space-y-2 text-slate-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Look at the top-right toolbar of the AI Studio workspace.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Click on <strong>Export</strong> or the <strong>Three Dots (•••) Settings Menu</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Select <strong>"Download ZIP"</strong> or <strong>"Export to GitHub"</strong>.</span>
              </div>
            </div>
          </div>

          {/* Running Offline Locally */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>2. How to Run Locally on Your PC (100% Offline)</span>
            </div>
            <p className="text-xs text-slate-400">
              Extract the ZIP file, open your terminal inside the project folder, and run:
            </p>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 space-y-1.5">
              <div className="text-slate-500"># 1. Install dependencies once</div>
              <div>npm install</div>
              <div className="text-slate-500 pt-1"># 2. Launch local offline development app</div>
              <div>npm run dev</div>
              <div className="text-slate-500 pt-1"># 3. Build standalone production static folder (dist/)</div>
              <div>npm run build</div>
            </div>
          </div>

          {/* Quick Single-File HTML Download Backup */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <FileCode className="w-4 h-4" />
              <span>3. Quick Page Backup (HTML File)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              If you want an immediate local copy of the current interactive DOM snapshot:
            </p>
            <button
              onClick={handleDownloadStandaloneHTML}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl font-bold text-xs transition shadow"
            >
              <Download className="w-4 h-4" />
              <span>Download Standalone HTML Backup</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};
