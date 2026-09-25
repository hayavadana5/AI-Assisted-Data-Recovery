import React, { useState } from 'react';
import { Activity, Layers, HelpCircle, Lock, FileText, Zap } from 'lucide-react';

const ENTROPY_COLORS = {
  ZERO_FILL: 'bg-slate-900 border-slate-800 text-slate-600',
  PLAINTEXT_DATA: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400 shadow-sm shadow-cyan-500/20',
  EXECUTABLE_STRUCT: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400',
  COMPRESSED_DATA: 'bg-purple-950/80 border-purple-500/50 text-purple-400',
  HIGH_ENTROPY_ENCRYPTED: 'bg-rose-950/90 border-rose-500/80 text-rose-400 animate-pulse',
};

export default function SectorMap({ entropyData }) {
  const [hoveredBlock, setHoveredBlock] = useState(null);

  const heatmap = entropyData?.heatmap || Array.from({ length: 400 }, (_, i) => ({
    block_index: i,
    offset: i * 4096,
    entropy: i % 10 === 0 ? 7.8 : i % 3 === 0 ? 4.2 : 0.0,
    classification: i % 10 === 0 ? 'HIGH_ENTROPY_ENCRYPTED' : i % 3 === 0 ? 'PLAINTEXT_DATA' : 'ZERO_FILL',
  }));

  const avgEntropy = entropyData?.average_entropy || 3.42;

  return (
    <div className="glass-panel p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            DRIVE SECTOR ENTROPY & STRUCTURE HEATMAP
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            4KB Block Shannon Entropy Mapping • Average Entropy: <span className="text-cyan-400 font-mono font-bold">{avgEntropy}</span> / 8.00
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-700 inline-block" />
            <span className="text-slate-400">Zero (0.0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-cyan-500 inline-block" />
            <span className="text-slate-300">Plaintext</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
            <span className="text-slate-300">Code/Exec</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block" />
            <span className="text-slate-300">Compressed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" />
            <span className="text-rose-400 font-bold">Encrypted</span>
          </div>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="grid grid-cols-20 sm:grid-cols-40 gap-1 max-h-56 overflow-y-auto p-2 bg-slate-950/80 rounded-lg border border-slate-800">
        {heatmap.map((block) => {
          const colorClass = ENTROPY_COLORS[block.classification] || 'bg-slate-900 border-slate-800';
          return (
            <div
              key={block.block_index}
              onMouseEnter={() => setHoveredBlock(block)}
              className={`h-3 rounded-xs border transition-all duration-150 hover:scale-125 hover:z-10 cursor-pointer ${colorClass}`}
            />
          );
        })}
      </div>

      {/* Block Inspector Bar */}
      <div className="mt-3 p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
        {hoveredBlock ? (
          <div className="flex items-center gap-4 text-slate-300">
            <span>BLOCK #: <strong className="text-cyan-400">{hoveredBlock.block_index}</strong></span>
            <span>OFFSET: <strong className="text-slate-100">0x{hoveredBlock.offset.toString(16).toUpperCase()}</strong></span>
            <span>ENTROPY: <strong className="text-emerald-400">{hoveredBlock.entropy.toFixed(2)}</strong></span>
            <span>TYPE: <strong className="text-purple-300">{hoveredBlock.classification}</strong></span>
          </div>
        ) : (
          <span className="text-slate-500 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Hover over any sector block to inspect offset and Shannon entropy.
          </span>
        )}
      </div>
    </div>
  );
}
