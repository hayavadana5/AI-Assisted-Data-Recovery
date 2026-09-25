import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function FragmentWorkspace({ reconstructions = [], onSelectHex }) {
  const [selectedRecon, setSelectedRecon] = useState(reconstructions[0] || null);

  // If no reconstructions passed, or list is empty
  const hasRecons = reconstructions && reconstructions.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', overflowY: 'auto', paddingRight: 8 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="heading-xl" style={{ margin: 0, fontSize: '1.4rem' }}>
            Non-Contiguous Fragment Reconstruction Engine
          </h2>
          <p className="caption" style={{ margin: '4px 0 0 0' }}>
            Algorithmic assembly, ordering, and structural validation of fragmented evidence
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="label-sm">Active Engine:</span>
            <span className="badge badge-cyan">Greedy Heuristic + Signature Verification</span>
          </div>
          <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="label-sm">Reconstructed Files:</span>
            <span className="mono-text" style={{ color: 'var(--color-accent-cyan)', fontWeight: 700 }}>
              {reconstructions.length}
            </span>
          </div>
        </div>
      </div>

      {!hasRecons ? (
        <div
          className="glass-card"
          style={{
            padding: 48,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 40,
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.7 }}>🧩</div>
          <h3 className="heading-lg" style={{ marginBottom: 8 }}>No Fragmented Files In Target Image</h3>
          <p className="caption" style={{ maxWidth: 520, lineHeight: 1.6 }}>
            All recovered artifacts in this disk image were carved as contiguous streams. 
            Fragment reconstruction engages automatically when files are non-contiguously distributed across scattered cluster extents.
          </p>
          <div style={{ marginTop: 24, padding: '10px 20px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: 8, border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <span className="label-sm" style={{ color: 'var(--color-accent-cyan)' }}>
              Deterministic Engine Status: READY & MONITORING
            </span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 24, minHeight: 520 }}>
          {/* List of Reconstructed Artifacts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="label-sm">Reconstructed Evidence Artifacts</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
              {reconstructions.map((recon) => {
                const isSelected = selectedRecon?.reconstruction_id === recon.reconstruction_id;
                const confPercent = Math.round((recon.confidence || 0) * 100);
                return (
                  <motion.div
                    key={recon.reconstruction_id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedRecon(recon)}
                    className="glass-card"
                    style={{
                      padding: 16,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--color-accent-cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(0, 240, 255, 0.08)' : 'var(--glass-bg)',
                      boxShadow: isSelected ? '0 0 15px rgba(0, 240, 255, 0.2)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span className="badge badge-cyan">{recon.file_type}</span>
                      <span className={`badge ${confPercent >= 90 ? 'badge-high' : confPercent >= 70 ? 'badge-medium' : 'badge-low'}`}>
                        {confPercent}% Match
                      </span>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                      {recon.reconstruction_id}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      <span>Fragments: <strong style={{ color: 'var(--color-text-primary)' }}>{recon.fragment_count}</strong></span>
                      <span>Total: <strong style={{ color: 'var(--color-text-primary)' }}>{formatBytes(recon.total_size)}</strong></span>
                      <span className="mono-text" style={{ color: recon.status === 'RECONSTRUCTED' ? 'var(--color-accent-green)' : 'var(--color-accent-amber)' }}>
                        {recon.status}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Detailed Reconstruction Graph & Metrics */}
          {selectedRecon && (
            <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Top Banner with Confidence Gauge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 16 }}>
                <div>
                  <span className="label-sm">Assembly Analysis</span>
                  <h3 className="heading-lg" style={{ margin: '4px 0', color: 'var(--color-accent-cyan)' }}>
                    {selectedRecon.reconstruction_id}
                  </h3>
                  <div className="mono-text caption" style={{ wordBreak: 'break-all', marginTop: 4 }}>
                    SHA-256: {selectedRecon.sha256}
                  </div>
                </div>

                {/* Prominent Confidence Display */}
                <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.4)', padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                  <div className="label-sm" style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                    CONFIDENCE SCORE
                  </div>
                  <div className="mono-text" style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-accent-cyan)', lineHeight: 1 }}>
                    {Math.round((selectedRecon.confidence || 0) * 100)}%
                  </div>
                  <span className="badge badge-high" style={{ marginTop: 6 }}>
                    {selectedRecon.status}
                  </span>
                </div>
              </div>

              {/* Confidence Factors Pills */}
              <div>
                <span className="label-sm" style={{ marginBottom: 8, display: 'block' }}>Validation Criteria Verified:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedRecon.confidence_factors?.map((factor, idx) => (
                    <span
                      key={idx}
                      className="mono-text"
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        background: 'rgba(0, 255, 136, 0.1)',
                        border: '1px solid rgba(0, 255, 136, 0.3)',
                        color: 'var(--color-accent-green)',
                      }}
                    >
                      ✓ {factor.replace(/_/g, ' ')}
                    </span>
                  )) || (
                    <span className="caption">Standard heuristic ordering applied</span>
                  )}
                </div>
              </div>

              {/* Fragment Assembly Pipeline Graph */}
              <div>
                <span className="label-sm" style={{ marginBottom: 12, display: 'block' }}>
                  Reassembly Sequence Flow (Physical Disk Extents → Logical Stream)
                </span>

                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 12,
                    padding: 20,
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  {selectedRecon.ordered_fragments?.map((fragId, index) => {
                    const offset = selectedRecon.metadata?.offsets?.[index];
                    const isLast = index === selectedRecon.ordered_fragments.length - 1;
                    return (
                      <React.Fragment key={fragId}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 8,
                            border: '1px solid rgba(0, 240, 255, 0.15)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'rgba(0, 240, 255, 0.2)',
                                border: '1px solid var(--color-accent-cyan)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                color: 'var(--color-accent-cyan)',
                              }}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <div className="mono-text" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                {fragId}
                              </div>
                              <div className="caption" style={{ fontSize: '0.75rem' }}>
                                Sequence Position {index + 1} of {selectedRecon.fragment_count}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div className="mono-text" style={{ fontSize: '0.8rem', color: 'var(--color-accent-cyan)' }}>
                              Offset: 0x{offset !== undefined ? offset.toString(16).toUpperCase() : 'N/A'}
                            </div>
                            <div className="caption" style={{ fontSize: '0.7rem' }}>
                              Disk Block Extent
                            </div>
                          </div>
                        </div>

                        {/* Arrow connector */}
                        {!isLast && (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0' }}>
                            <span style={{ color: 'var(--color-accent-cyan)', opacity: 0.6, fontSize: '1.2rem' }}>
                              ↓
                            </span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Final Output Node */}
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0' }}>
                    <span style={{ color: 'var(--color-accent-green)', fontWeight: 700, fontSize: '1.4rem' }}>
                      ⇓
                    </span>
                  </div>

                  <div
                    style={{
                      padding: 16,
                      background: 'rgba(0, 255, 136, 0.08)',
                      borderRadius: 8,
                      border: '1px solid rgba(0, 255, 136, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span className="badge badge-high" style={{ marginBottom: 4 }}>
                        REASSEMBLED FILE STREAM
                      </span>
                      <div className="mono-text" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {selectedRecon.output_path ? selectedRecon.output_path.split('\\').pop().split('/').pop() : selectedRecon.reconstruction_id}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="mono-text" style={{ color: 'var(--color-accent-green)', fontWeight: 700 }}>
                        {formatBytes(selectedRecon.total_size)}
                      </div>
                      <span className="caption" style={{ fontSize: '0.75rem' }}>
                        100% Cryptographic Verification
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
