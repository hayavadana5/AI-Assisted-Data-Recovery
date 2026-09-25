import React, { useRef, useEffect } from 'react';
import { Terminal, Shield } from 'lucide-react';

export default function LiveConsole({ logs }) {
  const consoleEndRef = useRef(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="glass-panel p-5 mb-6 font-mono text-xs">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <h2 className="font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          REAL-TIME RECOVERY WEBSOCKET LOG CONSOLE
        </h2>
        <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          STREAMING
        </span>
      </div>

      {/* Terminal Viewport */}
      <div className="h-44 overflow-y-auto bg-slate-950 p-3 rounded-lg border border-slate-900 space-y-1">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">Console idle. Awaiting scan execution...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-600 shrink-0">[{log.time}]</span>
              <span className={log.type === 'error' ? 'text-rose-400 font-bold' : log.type === 'complete' ? 'text-emerald-400 font-bold' : 'text-cyan-300'}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
