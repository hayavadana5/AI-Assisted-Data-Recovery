import React from 'react';
import { Clock, AlertTriangle, FileCheck, Trash2, Shield } from 'lucide-react';

export default function TimelineView({ timeline }) {
  const events = timeline || [
    {
      timestamp: '2026-01-15T03:31:07Z',
      event_type: 'EVIDENCE_INGEST',
      source: 'CHAIN_OF_CUSTODY',
      description: 'Disk image test-stick.img registered. SHA-256 digest verified.',
      severity: 'INFO',
    },
    {
      timestamp: '2026-01-15T03:31:09Z',
      event_type: 'FILE_DELETED',
      source: 'SLEUTHKIT_FLS',
      description: 'Deleted PDF file entry located in raw FAT root directory: deleted_doc.pdf',
      severity: 'WARNING',
    },
  ];

  return (
    <div className="glass-panel p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            CHRONOLOGICAL MACB EVIDENCE TIMELINE
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Unified forensic event sequence • Total Timeline Records: <span className="text-cyan-400 font-mono font-bold">{events.length}</span>
          </p>
        </div>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {events.map((evt, idx) => (
          <div key={idx} className="relative flex items-start gap-4 p-3 bg-slate-900/60 rounded-lg border border-slate-800 font-mono text-xs">
            {/* Dot Indicator */}
            <div className={`absolute -left-6 top-3.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 flex items-center justify-center ${
              evt.severity === 'WARNING' ? 'bg-amber-400 shadow-xs shadow-amber-400' : 'bg-cyan-400 shadow-xs shadow-cyan-400'
            }`} />

            {/* Event Icon */}
            <div className="p-2 rounded bg-slate-800/80 text-cyan-400 shrink-0">
              {evt.event_type === 'FILE_DELETED' ? (
                <Trash2 className="w-4 h-4 text-amber-400" />
              ) : (
                <FileCheck className="w-4 h-4 text-emerald-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="font-bold text-slate-200 uppercase tracking-wider">{evt.event_type}</span>
                <span className="text-slate-400 text-[11px] bg-slate-800 px-2 py-0.5 rounded">{evt.timestamp}</span>
              </div>
              <p className="text-slate-300 font-sans text-xs">{evt.description}</p>
              <span className="text-[10px] text-slate-500 mt-1 block">SOURCE: {evt.source}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
