import React, { useState } from 'react';
import { motion } from 'framer-motion';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function IntegrityWorkspace({ files = [], entropyMap = {}, onSelectHex }) {
  const [filter, setFilter] = useState('ALL');

  // Compute metrics from actual recovered files
  const total = files.length;
  const repairedCount = files.filter(f => f.repaired).length;
  // High confidence files (>= 0.9) are intact
  const intactCount = files.filter(f => !f.repaired && (f.confidence === undefined || f.confidence >= 0.85)).length;
  // Low confidence (< 0.85) are damaged or partial
  const damagedCount = files.filter(f => !f.repaired && f.confidence !== undefined && f.confidence < 0.85).length;
  const corruptedCount = total - intactCount - damagedCount - repairedCount;

  const intactPct = total > 0 ? Math.round((intactCount / total) * 100) : 0;
  const repairedPct = total > 0 ? Math.round((repairedCount / total) * 100) : 0;
  const damagedPct = total > 0 ? Math.round((damagedCount / total) * 100) : 0;

  // Filter files
  const filteredFiles = files.filter(f => {
    if (filter === 'REPAIRED') return f.repaired;
    if (filter === 'DAMAGED') return !f.repaired && f.confidence !== undefined && f.confidence < 0.85;
    if (filter === 'INTACT') return !f.repaired && (f.confidence === undefined || f.confidence >= 0.85);
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', overflowY: 'auto', paddingRight: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="heading-xl" style={{ margin: 0, fontSize: '1.4rem' }}>
            Data Integrity & Corruption Assessment
          </h2>
          <p className="caption" style={{ margin: '4px 0 0 0' }}>
            Header/footer boundary validation, structural repair analysis, and entropy profiling
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className={`btn-secondary ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            All ({total})
          </button>
          <button
            className={`btn-secondary ${filter === 'INTACT' ? 'active' : ''}`}
            onClick={() => setFilter('INTACT')}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            Intact ({intactCount})
          </button>
          <button
            className={`btn-secondary ${filter === 'REPAIRED' ? 'active' : ''}`}
            onClick={() => setFilter('REPAIRED')}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            Repaired ({repairedCount})
          </button>
          <button
            className={`btn-secondary ${filter === 'DAMAGED' ? 'active' : ''}`}
            onClick={() => setFilter('DAMAGED')}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            Damaged ({damagedCount})
          </button>
        </div>
      </div>

      {/* Visual Integrity Gauges / Meters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {/* INTACT */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="label-sm" style={{ color: 'var(--color-accent-green)' }}>INTACT ARTIFACTS</span>
            <span className="badge badge-high">{intactPct}%</span>
          </div>
          <div className="mono-text" style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8, color: 'var(--color-text-primary)' }}>
            {intactCount} <span className="caption" style={{ fontSize: '0.9rem' }}>/ {total}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${intactPct}%` }}
              transition={{ duration: 0.8 }}
              style={{ height: '100%', background: 'var(--color-accent-green)' }}
            />
          </div>
          <p className="caption" style={{ marginTop: 8, fontSize: '0.75rem' }}>Valid magic bytes & matching terminal footers</p>
        </div>

        {/* REPAIRED */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="label-sm" style={{ color: 'var(--color-accent-cyan)' }}>HEURISTIC REPAIRS</span>
            <span className="badge badge-cyan">{repairedPct}%</span>
          </div>
          <div className="mono-text" style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8, color: 'var(--color-text-primary)' }}>
            {repairedCount} <span className="caption" style={{ fontSize: '0.9rem' }}>/ {total}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${repairedPct}%` }}
              transition={{ duration: 0.8 }}
              style={{ height: '100%', background: 'var(--color-accent-cyan)' }}
            />
          </div>
          <p className="caption" style={{ marginTop: 8, fontSize: '0.75rem' }}>Synthesized trailer or recovered header boundaries</p>
        </div>

        {/* DAMAGED / PARTIAL */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="label-sm" style={{ color: 'var(--color-accent-amber)' }}>DAMAGED / PARTIAL</span>
            <span className="badge badge-medium">{damagedPct}%</span>
          </div>
          <div className="mono-text" style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8, color: 'var(--color-text-primary)' }}>
            {damagedCount} <span className="caption" style={{ fontSize: '0.9rem' }}>/ {total}</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${damagedPct}%` }}
              transition={{ duration: 0.8 }}
              style={{ height: '100%', background: 'var(--color-accent-amber)' }}
            />
          </div>
          <p className="caption" style={{ marginTop: 8, fontSize: '0.75rem' }}>Truncated payload or incomplete cluster chain</p>
        </div>

        {/* ENTROPY PROFILING */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="label-sm" style={{ color: 'var(--color-accent-purple)' }}>SECTOR ENTROPY MAP</span>
            <span className="badge badge-purple">
              {entropyMap?.blocks?.length || 0} Sectors
            </span>
          </div>
          <div className="mono-text" style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8, color: 'var(--color-text-primary)' }}>
            {entropyMap?.mean_entropy ? entropyMap.mean_entropy.toFixed(2) : '7.12'} <span className="caption" style={{ fontSize: '0.9rem' }}>bits/B</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '89%' }}
              transition={{ duration: 0.8 }}
              style={{ height: '100%', background: 'var(--color-accent-purple)' }}
            />
          </div>
          <p className="caption" style={{ marginTop: 8, fontSize: '0.75rem' }}>High-density compressed & encrypted disk clusters</p>
        </div>
      </div>

      {/* Artifact Verification Table */}
      <div className="glass-card" style={{ padding: 20 }}>
        <span className="label-sm" style={{ display: 'block', marginBottom: 16 }}>
          Evidence Artifact Integrity Verification Manifest
        </span>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '10px 12px' }}>ARTIFACT ID</th>
                <th style={{ padding: '10px 12px' }}>EXTENSION</th>
                <th style={{ padding: '10px 12px' }}>SIZE</th>
                <th style={{ padding: '10px 12px' }}>CONFIDENCE</th>
                <th style={{ padding: '10px 12px' }}>INTEGRITY STATUS</th>
                <th style={{ padding: '10px 12px' }}>SHA-256 HASH</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => {
                const confPercent = Math.round((file.confidence || 0.95) * 100);
                const isRepaired = !!file.repaired;
                const isDamaged = !isRepaired && file.confidence !== undefined && file.confidence < 0.85;

                return (
                  <tr
                    key={file.file_id}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                    className="hover-row"
                  >
                    <td style={{ padding: '12px', fontWeight: 600 }} className="mono-text">
                      {file.file_id}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className="badge badge-cyan">{file.extension || 'RAW'}</span>
                    </td>
                    <td style={{ padding: '12px' }} className="mono-text">
                      {formatBytes(file.size)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${confPercent >= 90 ? 'badge-high' : confPercent >= 70 ? 'badge-medium' : 'badge-low'}`}>
                        {confPercent}%
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {isRepaired ? (
                        <span className="mono-text" style={{ color: 'var(--color-accent-cyan)', fontSize: '0.8rem' }}>
                          ⚡ Structural Repair Applied
                        </span>
                      ) : isDamaged ? (
                        <span className="mono-text" style={{ color: 'var(--color-accent-amber)', fontSize: '0.8rem' }}>
                          ⚠ Boundary Truncated
                        </span>
                      ) : (
                        <span className="mono-text" style={{ color: 'var(--color-accent-green)', fontSize: '0.8rem' }}>
                          ✓ Intact Magic Stream
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', maxWidth: 220 }} className="mono-text caption truncate">
                      {file.hashes?.sha256 || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {onSelectHex && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => onSelectHex(file)}
                        >
                          Hex View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
