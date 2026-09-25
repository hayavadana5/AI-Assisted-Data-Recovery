import React, { useState } from 'react';
import { Search, FileCode, ShieldAlert, Eye, Download, Key, Image, FileText, Package, AlertCircle } from 'lucide-react';

export default function EvidenceMatrix({ files, onSelectHexFile }) {
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = files.filter((file) => {
    if (filterPriority !== 'ALL' && file.priority !== filterPriority) return false;
    if (filterCategory !== 'ALL' && file.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = file.file_id?.toLowerCase().includes(q);
      const matchExt = file.extension?.toLowerCase().includes(q);
      const matchTag = file.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchId && !matchExt && !matchTag) return false;
    }
    return true;
  });

  return (
    <div className="glass-panel p-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            RECOVERED EVIDENCE CATALOG MATRIX
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cataloged Files: <span className="text-cyan-400 font-mono font-bold">{files.length}</span> • High Priority Intel: <span className="text-rose-400 font-mono font-bold">{files.filter(f => f.priority === 'HIGH').length}</span>
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/90 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-44"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Categories</option>
            <option value="IMAGE">Images</option>
            <option value="DOCUMENT">Documents</option>
            <option value="ARCHIVE">Archives</option>
          </select>

          {/* Priority Filter Buttons */}
          <div className="flex bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setFilterPriority('ALL')}
              className={`px-2.5 py-1 rounded ${filterPriority === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterPriority('HIGH')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 ${filterPriority === 'HIGH' ? 'bg-rose-500 text-slate-950 font-bold' : 'text-rose-400 hover:text-rose-300'}`}
            >
              <AlertCircle className="w-3 h-3" /> HIGH
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="p-3">File ID / Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Offset</th>
              <th className="p-3">Size</th>
              <th className="p-3">SHA-256 Digest</th>
              <th className="p-3">Priority</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No evidence matching query. Trigger a scan or adjust filters.
                </td>
              </tr>
            ) : (
              filteredFiles.map((file, idx) => (
                <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-3 font-bold text-cyan-300 flex items-center gap-2">
                    {file.priority === 'HIGH' ? (
                      <Key className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : file.category === 'IMAGE' ? (
                      <Image className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    )}
                    <span className="truncate max-w-xs">{file.file_id}</span>
                  </td>
                  <td className="p-3 uppercase text-slate-300">
                    <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px]">
                      {file.extension || 'raw'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">
                    0x{file.original_offset?.toString(16).toUpperCase() || '0000'}
                  </td>
                  <td className="p-3 text-slate-300">
                    {file.size} B
                  </td>
                  <td className="p-3 text-slate-500 font-mono text-[11px]">
                    {file.hashes?.sha256 ? `${file.hashes.sha256.substring(0, 16)}...` : 'N/A'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      file.priority === 'HIGH' 
                        ? 'bg-rose-950 border border-rose-500/50 text-rose-400 shadow-xs shadow-rose-500/20' 
                        : 'bg-slate-900 border border-slate-700 text-slate-400'
                    }`}>
                      {file.priority}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onSelectHexFile(file)}
                      className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-400 border border-cyan-500/30 rounded font-semibold text-[11px] flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> HEX VIEW
                    </button>
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
