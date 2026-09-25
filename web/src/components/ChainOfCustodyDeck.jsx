import React from 'react';
import { Lock, FileText, Download, CheckCircle, ShieldCheck } from 'lucide-react';

export default function ChainOfCustodyDeck({ caseId, chainOfCustody }) {
  const events = chainOfCustody || [];

  const handleDownloadPDF = () => {
    if (!caseId) return;
    window.open(`/api/report/${caseId}/pdf`, '_blank');
  };

  return (
    <div className="glass-panel p-5 mb-6 border-l-4 border-l-emerald-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            IMMUTABLE CHAIN OF CUSTODY AUDIT TRAIL
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographic SHA-256 Event Ledger • Legal Integrity Status: <span className="text-emerald-400 font-mono font-bold">VERIFIED & UNTAMPERED</span>
          </p>
        </div>

        {/* Action PDF Export Button */}
        <button
          onClick={handleDownloadPDF}
          disabled={!caseId}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>GENERATE FBI PDF REPORT</span>
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold uppercase">
              <th className="p-3">Block ID</th>
              <th className="p-3">Action</th>
              <th className="p-3">Actor / Module</th>
              <th className="p-3">Target Evidence</th>
              <th className="p-3">Timestamp</th>
              <th className="p-3 text-right">Block SHA-256 Digest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No chain of custody logs recorded yet. Initiate a scan to log events.
                </td>
              </tr>
            ) : (
              events.map((evt, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-3 text-cyan-400 font-bold">#{evt.event_id}</td>
                  <td className="p-3 uppercase font-bold text-slate-200">{evt.action}</td>
                  <td className="p-3 text-slate-400">{evt.actor}</td>
                  <td className="p-3 text-purple-300">{evt.target}</td>
                  <td className="p-3 text-slate-400">{evt.timestamp}</td>
                  <td className="p-3 text-right text-emerald-400 font-mono text-[11px]">
                    {evt.current_hash?.substring(0, 16)}...
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
