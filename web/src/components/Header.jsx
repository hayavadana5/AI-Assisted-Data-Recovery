import React from 'react';
import { ShieldAlert, Play, Cpu, HardDrive, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Header({ onStartScan, isScanning, selectedImage, setSelectedImage, apiStatus, stats }) {
  return (
    <header className="glass-panel p-5 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-cyan-500/20">
      {/* Brand & Status */}
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
          <ShieldAlert className="w-7 h-7 animate-pulse-glow" />
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase font-mono">
              AEGIS <span className="text-cyan-400">RECOVERY v2.0</span>
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
              FBI-ENTERPRISE
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
            <span>AI-Assisted Evidence Reconstruction & Chain of Custody System</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3" /> API ONLINE
            </span>
          </p>
        </div>
      </div>

      {/* Target Image & Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Drive Image Select */}
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs font-mono">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">TARGET:</span>
          <select 
            value={selectedImage}
            onChange={(e) => setSelectedImage(e.target.value)}
            disabled={isScanning}
            className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="test-stick.img" className="bg-slate-900 text-slate-200">test-stick.img (50 MB RAW)</option>
            <option value="synthetic_evidence/sample_evidence.img" className="bg-slate-900 text-slate-200">sample_evidence.img</option>
          </select>
        </div>

        {/* Scan Button */}
        <button
          onClick={onStartScan}
          disabled={isScanning}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
            isScanning
              ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95'
          }`}
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>RECOVERY IN PROGRESS...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>INITIATE DEEP SCAN</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
