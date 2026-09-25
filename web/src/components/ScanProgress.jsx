import React from 'react';
import { motion } from 'framer-motion';
import GlobalWorkspaceHeader from './GlobalWorkspaceHeader';

export default function ScanProgress({ progress = [], logs = [], isScanning, onClose, onGoCommandCenter }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(12px)',
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
          maxWidth: 820,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 50px rgba(0, 240, 255, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Global Forensic Navigation Header */}
        <GlobalWorkspaceHeader
          title="SCAN PROGRESS"
          workspaceId="scan"
          onBack={onClose}
          onGoCommandCenter={onGoCommandCenter || onClose}
          onClose={onClose}
        />

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          {/* Subtitle / Status info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span className="label-sm" style={{ color: 'var(--color-accent-cyan)' }}>
                LIVE FORENSIC RECOVERY PIPELINE
              </span>
              <h3 className="heading-lg" style={{ margin: '2px 0 0 0', fontSize: '1.2rem' }}>
                {isScanning ? 'Executing Multi-Stage Acquisition & Carving' : 'Forensic Recovery Pipeline Finished'}
              </h3>
            </div>
            {isScanning && (
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                ● SCAN IN PROGRESS (BACKGROUND RESILIENT)
              </span>
            )}
          </div>

        {/* Stepper Pipeline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 8,
            marginBottom: 24,
          }}
        >
          {progress.map((step, idx) => {
            const isDone = step.status === 'done';
            const isActive = step.status === 'active';
            return (
              <div
                key={step.step}
                style={{
                  padding: '10px 8px',
                  borderRadius: 8,
                  textAlign: 'center',
                  background: isDone
                    ? 'rgba(0, 255, 136, 0.08)'
                    : isActive
                    ? 'rgba(0, 240, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isDone
                    ? '1px solid rgba(0, 255, 136, 0.3)'
                    : isActive
                    ? '1px solid var(--color-accent-cyan)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div
                  className="mono-text"
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: isDone
                      ? 'var(--color-accent-green)'
                      : isActive
                      ? 'var(--color-accent-cyan)'
                      : 'var(--color-text-secondary)',
                    marginBottom: 4,
                  }}
                >
                  {isDone ? '✓ DONE' : isActive ? '● ACTIVE' : `STEP ${idx + 1}`}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Terminal Log Stream */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="label-sm">WebSocket Real-Time Engine Stream</span>
            <span className="mono-text caption" style={{ color: 'var(--color-accent-green)' }}>
              {isScanning ? '● STREAM CONNECTED' : 'STREAM CLOSED'}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 8,
              padding: 16,
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {logs.map((log, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>[{log.time}]</span>
                <span
                  style={{
                    color:
                      log.type === 'complete'
                        ? 'var(--color-accent-green)'
                        : log.message?.includes('Step')
                        ? 'var(--color-accent-cyan)'
                        : 'var(--color-text-primary)',
                  }}
                >
                  {log.message}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div style={{ color: 'var(--color-text-secondary)' }}>Awaiting pipeline activation...</div>
            )}
          </div>
        </div>

          {/* Footer actions */}
          {!isScanning && (
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={onClose} style={{ padding: '8px 24px' }}>
                Enter Forensic Command Center
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
