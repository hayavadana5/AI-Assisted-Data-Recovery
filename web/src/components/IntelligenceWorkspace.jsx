import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getPriorityColor(priority) {
  const p = (priority || '').toUpperCase();
  if (p === 'HIGH' || p === 'CRITICAL') return 'var(--color-accent-amber)';
  if (p === 'MEDIUM') return 'var(--color-accent-cyan)';
  return 'var(--color-text-secondary)';
}

export default function IntelligenceWorkspace({ files = [], onSelectHex }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');

  // Categories present in files
  const categories = ['ALL', ...Array.from(new Set(files.map(f => f.category || 'UNKNOWN')))];

  const filteredFiles = files.filter(f => {
    if (activeCategory === 'ALL') return true;
    return (f.category || 'UNKNOWN') === activeCategory;
  });

  // Group by priority
  const highPriority = filteredFiles.filter(f => (f.priority || '').toUpperCase() === 'HIGH' || (f.priority || '').toUpperCase() === 'CRITICAL');
  const mediumPriority = filteredFiles.filter(f => (f.priority || '').toUpperCase() === 'MEDIUM');
  const lowPriority = filteredFiles.filter(f => (f.priority || '').toUpperCase() === 'LOW' || !f.priority);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', overflowY: 'auto', paddingRight: 8 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="heading-xl" style={{ margin: 0, fontSize: '1.4rem' }}>
            Artifact Intelligence & Priority Constellation
          </h2>
          <p className="caption" style={{ margin: '4px 0 0 0' }}>
            Multi-vector classification, evidentiary prioritization, and forensic tag correlation
          </p>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`btn-secondary ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
              style={{ padding: '6px 14px', fontSize: '0.75rem' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedFile ? '1fr 380px' : '1fr', gap: 24 }}>
        {/* Constellation Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* HIGH PRIORITY CONSTELLATION */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-accent-amber)' }} />
                <span className="heading-md" style={{ color: 'var(--color-accent-amber)' }}>HIGH FORENSIC VALUE</span>
              </div>
              <span className="badge badge-high">{highPriority.length} Artifacts</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {highPriority.map(file => {
                const isSelected = selectedFile?.file_id === file.file_id;
                return (
                  <motion.div
                    key={file.file_id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedFile(file)}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: isSelected ? 'rgba(255, 170, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--color-accent-amber)' : '1px solid rgba(255, 170, 0, 0.25)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className="badge badge-cyan">{file.extension || 'RAW'}</span>
                      <span className="badge badge-high">PRIORITY 1</span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }} title={file.file_id}>
                      {file.file_id}
                    </div>
                    <div className="caption" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {formatBytes(file.size)} • {file.category || 'General'}
                    </div>
                  </motion.div>
                );
              })}
              {highPriority.length === 0 && (
                <div className="caption" style={{ padding: 12 }}>No high-priority artifacts matching current filter.</div>
              )}
            </div>
          </div>

          {/* MEDIUM PRIORITY */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-accent-cyan)' }} />
                <span className="heading-md" style={{ color: 'var(--color-accent-cyan)' }}>MEDIUM OPERATIONAL RELEVANCE</span>
              </div>
              <span className="badge badge-cyan">{mediumPriority.length} Artifacts</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {mediumPriority.map(file => {
                const isSelected = selectedFile?.file_id === file.file_id;
                return (
                  <motion.div
                    key={file.file_id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedFile(file)}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: isSelected ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid var(--color-accent-cyan)' : '1px solid rgba(0, 240, 255, 0.2)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className="badge badge-cyan">{file.extension || 'RAW'}</span>
                      <span className="badge badge-medium">PRIORITY 2</span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }} title={file.file_id}>
                      {file.file_id}
                    </div>
                    <div className="caption" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {formatBytes(file.size)} • {file.category || 'General'}
                    </div>
                  </motion.div>
                );
              })}
              {mediumPriority.length === 0 && (
                <div className="caption" style={{ padding: 12 }}>No medium-priority artifacts matching filter.</div>
              )}
            </div>
          </div>

          {/* LOW PRIORITY */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-text-secondary)' }} />
                <span className="heading-md" style={{ color: 'var(--color-text-secondary)' }}>ROUTINE BACKGROUND ARTIFACTS</span>
              </div>
              <span className="badge badge-low">{lowPriority.length} Artifacts</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {lowPriority.map(file => {
                const isSelected = selectedFile?.file_id === file.file_id;
                return (
                  <motion.div
                    key={file.file_id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedFile(file)}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className="badge badge-low">{file.extension || 'RAW'}</span>
                      <span className="badge badge-low">PRIORITY 3</span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }} title={file.file_id}>
                      {file.file_id}
                    </div>
                    <div className="caption" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {formatBytes(file.size)} • {file.category || 'General'}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Artifact Intelligence Panel */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-card"
              style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, alignSelf: 'start', position: 'sticky', top: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="label-sm">Artifact Intelligence Dossier</span>
                <button className="workspace-close" onClick={() => setSelectedFile(null)}>✕</button>
              </div>

              <div>
                <span className="badge badge-high" style={{ marginRight: 8 }}>
                  {selectedFile.priority || 'STANDARD'}
                </span>
                <span className="badge badge-cyan">{selectedFile.category || 'UNKNOWN'}</span>
                <h3 className="heading-md mono-text" style={{ marginTop: 8, wordBreak: 'break-all' }}>
                  {selectedFile.file_id}
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="caption">Carve Offset</span>
                  <span className="mono-text">0x{(selectedFile.original_offset || 0).toString(16).toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="caption">Size</span>
                  <span className="mono-text">{formatBytes(selectedFile.size)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="caption">MIME Type</span>
                  <span className="mono-text">{selectedFile.mime_type || 'application/octet-stream'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="caption">Confidence</span>
                  <span className="mono-text">{Math.round((selectedFile.confidence || 0.9) * 100)}%</span>
                </div>
              </div>

              {/* Forensic Tags */}
              <div>
                <span className="label-sm" style={{ display: 'block', marginBottom: 8 }}>Correlated Forensic Tags</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedFile.tags?.map((t, i) => (
                    <span key={i} className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                      #{t}
                    </span>
                  )) || <span className="caption">No tags assigned</span>}
                </div>
              </div>

              {/* Investigative Findings */}
              <div>
                <span className="label-sm" style={{ display: 'block', marginBottom: 8 }}>Investigative Findings</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedFile.findings?.map((finding, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 6,
                        borderLeft: '3px solid var(--color-accent-cyan)',
                        fontSize: '0.78rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {finding}
                    </div>
                  )) || <span className="caption">Standard forensic artifact signature</span>}
                </div>
              </div>

              {/* SHA-256 */}
              <div>
                <span className="label-sm" style={{ display: 'block', marginBottom: 4 }}>Cryptographic Digest</span>
                <div className="mono-text caption" style={{ wordBreak: 'break-all', fontSize: '0.72rem', background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 6 }}>
                  SHA-256: {selectedFile.hashes?.sha256 || 'N/A'}
                </div>
              </div>

              {onSelectHex && (
                <button
                  className="btn-primary"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => onSelectHex(selectedFile)}
                >
                  Inspect Hex Payloads
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
