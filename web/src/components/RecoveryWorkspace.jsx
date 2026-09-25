import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getExtClass(ext) {
  const e = (ext || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'].includes(e)) return 'artifact-ext-img';
  if (['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt'].includes(e)) return 'artifact-ext-doc';
  if (['.csv', '.json', '.xml', '.db', '.sql', '.xls', '.xlsx'].includes(e)) return 'artifact-ext-data';
  return 'artifact-ext-default';
}

function getPriorityBadge(priority) {
  const p = (priority || '').toUpperCase();
  if (p === 'CRITICAL' || p === 'HIGH') return 'badge badge-high';
  if (p === 'MEDIUM') return 'badge badge-medium';
  return 'badge badge-low';
}

function ArtifactDetailPanel({ artifact, onClose }) {
  if (!artifact) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{
        position: 'fixed', top: 80, right: 24, bottom: 24, width: 380,
        zIndex: 300, overflowY: 'auto',
      }}
      className="glass-elevated"
    >
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="label-sm">Artifact Detail</span>
          <button className="workspace-close" onClick={onClose} aria-label="Close detail">✕</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <span className={`artifact-ext ${getExtClass(artifact.extension)}`}>
            {(artifact.extension || 'RAW').replace('.', '')}
          </span>
          <span className={getPriorityBadge(artifact.priority)} style={{ marginLeft: 8 }}>
            {artifact.priority}
          </span>
        </div>
        <div className="artifact-filename" style={{ marginBottom: 16, fontSize: '0.8rem' }}>
          {artifact.file_id}
        </div>

        {[
          { label: 'Category', value: artifact.category },
          { label: 'MIME Type', value: artifact.mime_type },
          { label: 'Size', value: formatBytes(artifact.size) },
          { label: 'Offset', value: artifact.original_offset != null ? `0x${artifact.original_offset.toString(16).toUpperCase().padStart(8, '0')}` : 'N/A' },
          { label: 'Confidence', value: artifact.confidence != null ? `${(artifact.confidence * 100).toFixed(1)}%` : 'N/A' },
          { label: 'Repaired', value: artifact.repaired ? 'YES' : 'NO' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="label-xs" style={{ fontSize: '0.7rem' }}>{item.label}</span>
            <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{item.value}</span>
          </div>
        ))}

        {artifact.hashes?.sha256 && (
          <div style={{ marginTop: 16 }}>
            <div className="label-xs" style={{ marginBottom: 4 }}>SHA-256</div>
            <div className="font-mono" style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', wordBreak: 'break-all', lineHeight: 1.6 }}>
              {artifact.hashes.sha256}
            </div>
          </div>
        )}

        {artifact.findings && artifact.findings.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="label-xs" style={{ marginBottom: 8 }}>Findings</div>
            {artifact.findings.map((f, i) => (
              <div key={i} style={{ padding: '6px 10px', marginBottom: 4, borderRadius: 'var(--radius-sm)', background: 'var(--rose-glow)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--rose)' }}>
                  {typeof f === 'string' ? f : f.type || JSON.stringify(f)}
                </span>
              </div>
            ))}
          </div>
        )}

        {artifact.tags && artifact.tags.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {artifact.tags.map((t, i) => (
              <span key={i} className="badge badge-cyan">{t}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function RecoveryWorkspace({ files = [] }) {
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [filterPriority, setFilterPriority] = useState(null);

  const filtered = filterPriority
    ? files.filter(f => (f.priority || '').toUpperCase() === filterPriority)
    : files;

  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
  const methods = [...new Set(files.map(f => f.category || 'UNCLASSIFIED'))];

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="stat-value">{files.length}</div>
          <div className="stat-label">Artifacts Recovered</div>
        </div>
        <div>
          <div className="stat-value">{formatBytes(totalBytes)}</div>
          <div className="stat-label">Total Recovery Volume</div>
        </div>
        <div>
          <div className="stat-value">{methods.length}</div>
          <div className="stat-label">Categories</div>
        </div>
      </div>

      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[null, 'HIGH', 'MEDIUM', 'LOW'].map(p => (
          <button
            key={p || 'all'}
            className={filterPriority === p ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setFilterPriority(p)}
          >
            {p || 'All'}
          </button>
        ))}
      </div>

      {/* Artifact grid */}
      <div className="artifact-grid">
        {filtered.map((file, idx) => (
          <motion.div
            key={file.file_id || idx}
            className="artifact-node glass-panel"
            onClick={() => setSelectedArtifact(file)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: idx * 0.03 }}
            whileHover={{ borderColor: 'var(--border-active)' }}
          >
            <div className="artifact-node-header">
              <span className={`artifact-ext ${getExtClass(file.extension)}`}>
                {(file.extension || 'RAW').replace('.', '')}
              </span>
              <span className={getPriorityBadge(file.priority)}>
                {file.priority || 'LOW'}
              </span>
            </div>
            <div className="artifact-filename">{file.file_id}</div>
            <div className="artifact-meta">
              <div className="artifact-meta-item">
                <span className="artifact-meta-label">Size</span>
                <span className="artifact-meta-value">{formatBytes(file.size)}</span>
              </div>
              <div className="artifact-meta-item">
                <span className="artifact-meta-label">Confidence</span>
                <span className="artifact-meta-value">
                  {file.confidence != null ? `${(file.confidence * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
              <div className="artifact-meta-item">
                <span className="artifact-meta-label">Offset</span>
                <span className="artifact-meta-value">
                  {file.original_offset != null ? `0x${file.original_offset.toString(16).toUpperCase().padStart(8, '0')}` : '—'}
                </span>
              </div>
              <div className="artifact-meta-item">
                <span className="artifact-meta-label">Category</span>
                <span className="artifact-meta-value">{file.category || '—'}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
          No artifacts match the current filter.
        </div>
      )}

      <AnimatePresence>
        {selectedArtifact && (
          <ArtifactDetailPanel
            artifact={selectedArtifact}
            onClose={() => setSelectedArtifact(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
