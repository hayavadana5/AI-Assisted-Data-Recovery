import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlobalWorkspaceHeader from './GlobalWorkspaceHeader';

export default function HexViewerModal({ file, caseId, onClose, onGoCommandCenter }) {
  const [hexData, setHexData] = useState(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!file || !caseId) return;

    setLoading(true);
    fetch(`/api/hex/${caseId}/${file.file_id}?offset=${offset}&length=512`)
      .then((res) => res.json())
      .then((data) => {
        setHexData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load hex dump:', err);
        setLoading(false);
      });
  }, [file, caseId, offset]);

  if (!file) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 550,
        background: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.98, x: -10 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 900,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 50px rgba(0, 240, 255, 0.15)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Global Forensic Navigation Header */}
        <GlobalWorkspaceHeader
          title="HEX INSPECTOR"
          workspaceId="hex"
          prevWorkspaceName="Recovery"
          onBack={onClose}
          onGoCommandCenter={onGoCommandCenter || onClose}
          onClose={onClose}
        />

        {/* Artifact Subheader */}
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="label-sm" style={{ color: 'var(--color-accent-cyan)' }}>
                SELECTED ARTIFACT
              </span>
              <span className="badge badge-cyan">{file.extension || 'RAW'}</span>
            </div>
            <h3 className="heading-md mono-text" style={{ margin: '2px 0 0 0', fontSize: '1.05rem' }}>
              {file.file_id}
            </h3>
            <p className="caption mono-text" style={{ fontSize: '0.72rem', margin: '2px 0 0 0' }}>
              Base Offset: 0x{file.original_offset?.toString(16).toUpperCase() || '0'} • Size: {file.size} Bytes • SHA-256: {file.hashes?.sha256?.substring(0, 24)}...
            </p>
          </div>
        </div>

        {/* Modal Body: Hex Table */}
        <div
          style={{
            padding: 20,
            overflowY: 'auto',
            flex: 1,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            background: 'rgba(3, 5, 10, 0.85)',
          }}
        >
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-accent-cyan)' }}>
              Reading raw sector bytes from memory...
            </div>
          ) : hexData?.lines ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 1fr 180px',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 700,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: 6,
                  marginBottom: 6,
                  fontSize: '0.75rem',
                }}
              >
                <span>OFFSET</span>
                <span>HEXADECIMAL STREAM</span>
                <span style={{ textAlign: 'right' }}>ASCII TEXT</span>
              </div>
              {hexData.lines.map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 180px',
                    padding: '2px 4px',
                    borderRadius: 4,
                  }}
                  className="hover-row"
                >
                  <span style={{ color: 'var(--color-accent-cyan)', fontWeight: 700 }}>
                    {line.offset}
                  </span>
                  <span style={{ color: 'var(--color-text-primary)', letterSpacing: '0.05em' }}>
                    {line.hex}
                  </span>
                  <span
                    style={{
                      textAlign: 'right',
                      color: 'var(--color-accent-green)',
                      background: 'rgba(0, 255, 136, 0.05)',
                      padding: '0 6px',
                      borderRadius: 4,
                    }}
                  >
                    {line.ascii}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-accent-red)' }}>
              Failed to render hex bytes.
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setOffset(Math.max(0, offset - 512))}
              disabled={offset === 0}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.75rem' }}
            >
              ◀ PREV 512B
            </button>
            <button
              onClick={() => setOffset(offset + 512)}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.75rem' }}
            >
              NEXT 512B ▶
            </button>
          </div>

          <span className="caption mono-text">
            Viewing Window: 0x{offset.toString(16).toUpperCase()} - 0x{(offset + 512).toString(16).toUpperCase()}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
