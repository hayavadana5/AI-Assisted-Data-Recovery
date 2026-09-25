import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import GlobalWorkspaceHeader from './GlobalWorkspaceHeader';

export default function ScanProgress({
  progress = [],
  logs = [],
  isScanning,
  onClose,
  onGoCommandCenter,
}) {
  /*
   * Calculate overall progress from the pipeline steps.
   *
   * done   = 100%
   * active = 50%
   * pending = 0%
   */
  const overallProgress = useMemo(() => {
    if (!progress.length) return 0;

    const total = progress.length;

    const completed = progress.reduce((sum, step) => {
      if (step.status === 'done') return sum + 1;
      if (step.status === 'active') return sum + 0.5;
      return sum;
    }, 0);

    return Math.min(100, Math.round((completed / total) * 100));
  }, [progress]);

  const activeStep = progress.find((step) => step.status === 'active');
  const completedSteps = progress.filter(
    (step) => step.status === 'done'
  ).length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        background: 'rgba(20, 8, 10, 0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -10 }}
        transition={{ duration: 0.22 }}
        style={{
          width: '100%',
          maxWidth: 900,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          border: '1px solid rgba(190, 20, 35, 0.28)',
          borderRadius: 16,
          boxShadow: '0 25px 80px rgba(100, 0, 10, 0.28)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <GlobalWorkspaceHeader
          title="NEW ACQUISITION"
          workspaceId="scan"
          onBack={onClose}
          onGoCommandCenter={onGoCommandCenter || onClose}
          onClose={onClose}
        />

        <div
          style={{
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {/* Header information */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: '#BE1423',
                  marginBottom: 6,
                }}
              >
                LIVE FORENSIC RECOVERY
              </div>

              <h2
                style={{
                  margin: 0,
                  color: '#7D0A14',
                  fontSize: 23,
                  fontWeight: 800,
                }}
              >
                {isScanning
                  ? 'Processing Evidence'
                  : 'Forensic Recovery Complete'}
              </h2>

              <p
                style={{
                  margin: '7px 0 0',
                  color: '#666',
                  fontSize: 13,
                }}
              >
                {isScanning
                  ? activeStep?.label || 'Initializing forensic pipeline...'
                  : 'The forensic pipeline has finished processing this case.'}
              </p>
            </div>

            {/* Status */}
            <div
              style={{
                padding: '8px 13px',
                borderRadius: 999,
                background: isScanning ? '#F7E1E3' : '#E9F7EF',
                color: isScanning ? '#BE1423' : '#287A50',
                fontSize: 11,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              {isScanning ? '● SCAN IN PROGRESS' : '✓ SCAN COMPLETE'}
            </div>
          </div>

          {/* Overall progress */}
          <div
            style={{
              background: '#FFF8F8',
              border: '1px solid #F0D4D7',
              borderRadius: 14,
              padding: 20,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  color: '#7D0A14',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Acquisition Progress
              </span>

              <span
                style={{
                  color: '#BE1423',
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                {overallProgress}%
              </span>
            </div>

            {/* Progress track */}
            <div
              style={{
                width: '100%',
                height: 12,
                background: '#F1E5E6',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background:
                    'linear-gradient(90deg, #8F0B18, #BE1423, #E0525E)',
                  borderRadius: 999,
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 9,
                color: '#777',
                fontSize: 11,
              }}
            >
              <span>
                {completedSteps} of {progress.length} stages completed
              </span>

              <span>
                {isScanning
                  ? activeStep?.label || 'Initializing...'
                  : 'All stages completed'}
              </span>
            </div>
          </div>

          {/* Pipeline steps */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(125px, 1fr))',
              gap: 9,
              marginBottom: 22,
            }}
          >
            {progress.map((step, idx) => {
              const isDone = step.status === 'done';
              const isActive = step.status === 'active';

              return (
                <div
                  key={step.step}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 10,
                    textAlign: 'center',
                    background: isDone
                      ? '#EDF8F2'
                      : isActive
                      ? '#FFF0F1'
                      : '#FAFAFA',
                    border: isDone
                      ? '1px solid #B8DEC8'
                      : isActive
                      ? '1px solid #BE1423'
                      : '1px solid #E8E8E8',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: isDone
                        ? '#287A50'
                        : isActive
                        ? '#BE1423'
                        : '#999',
                      marginBottom: 5,
                    }}
                  >
                    {isDone
                      ? '✓ DONE'
                      : isActive
                      ? '● ACTIVE'
                      : `STEP ${idx + 1}`}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#333',
                    }}
                  >
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live logs */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 230,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  color: '#7D0A14',
                }}
              >
                REAL-TIME FORENSIC ENGINE
              </span>

              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: isScanning ? '#287A50' : '#999',
                }}
              >
                {isScanning
                  ? '● STREAM CONNECTED'
                  : 'STREAM CLOSED'}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                background: '#211013',
                borderRadius: 10,
                padding: 16,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                border: '1px solid #42191E',
              }}
            >
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 12,
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      color: '#999',
                      flexShrink: 0,
                    }}
                  >
                    [{log.time}]
                  </span>

                  <span
                    style={{
                      color:
                        log.type === 'complete'
                          ? '#65D49A'
                          : log.message?.includes('Step')
                          ? '#FF8D97'
                          : '#F7F1F1',
                    }}
                  >
                    {log.message}
                  </span>
                </div>
              ))}

              {logs.length === 0 && (
                <div style={{ color: '#999' }}>
                  Awaiting pipeline activation...
                </div>
              )}
            </div>
          </div>

          {/* Bottom actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 20,
              gap: 12,
            }}
          >
            {/* Always available */}
            <button
              onClick={onClose}
              style={{
                border: '1px solid #D8B3B7',
                background: '#FFF',
                color: '#7D0A14',
                borderRadius: 8,
                padding: '10px 18px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>

            {!isScanning ? (
              <button
                onClick={onClose}
                style={{
                  border: 'none',
                  background: '#BE1423',
                  color: '#FFF',
                  borderRadius: 8,
                  padding: '10px 22px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Enter Forensic Command Center →
              </button>
            ) : (
              <div
                style={{
                  color: '#777',
                  fontSize: 11,
                }}
              >
                You can return to the command center at any time.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}