import React, { useState } from 'react';
import { motion } from 'framer-motion';
import GlobalWorkspaceHeader from './GlobalWorkspaceHeader';

export default function CaseSelector({
  cases = [],
  currentCaseId,
  onSelectCase,
  onStartNewScan,
  isOpen,
  onClose,
  onGoCommandCenter,
}) {
  const [showNewScanForm, setShowNewScanForm] = useState(false);

  const [imagePath, setImagePath] = useState(
    'synthetic_evidence/sample_evidence.img'
  );

  const [caseId, setCaseId] = useState('');

  const [caseName, setCaseName] = useState(
    `Investigation Case #${Math.floor(Math.random() * 9000) + 1000}`
  );

  const [examiner, setExaminer] = useState(
    'Lead Digital Forensics Examiner'
  );

  if (!isOpen) return null;

  const handleLaunchScan = (e) => {
    e.preventDefault();

    onStartNewScan({
      imagePath,
      caseName,
      examiner,
      caseId: caseId || undefined,
    });

    setShowNewScanForm(false);
    onClose();
  };

  const handleBack = () => {
    if (showNewScanForm) {
      setShowNewScanForm(false);
    } else {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 450,
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
        transition={{
          duration: 0.22,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 40px rgba(0, 240, 255, 0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Global Forensic Navigation Header */}
        <GlobalWorkspaceHeader
          title={showNewScanForm ? 'NEW ACQUISITION' : 'CASE ARCHIVE'}
          workspaceId={showNewScanForm ? 'new' : 'cases'}
          prevWorkspaceName={
            showNewScanForm ? 'Case Archive' : 'Command Center'
          }
          onBack={handleBack}
          onGoCommandCenter={onGoCommandCenter || onClose}
          onClose={onClose}
        />

        <div
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {/* Subheader */}
          <div style={{ marginBottom: 16 }}>
            <span
              className="label-sm"
              style={{ color: 'var(--color-accent-cyan)' }}
            >
              FORENSIC CASE ARCHIVE (SQLITE)
            </span>

            <h3
              className="heading-lg"
              style={{
                margin: '2px 0 0 0',
                fontSize: '1.2rem',
              }}
            >
              {showNewScanForm
                ? 'Initiate New Forensic Acquisition'
                : 'Select Active Investigation Case'}
            </h3>
          </div>

          {showNewScanForm ? (
            <form
              onSubmit={handleLaunchScan}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Target Evidence Image */}
              <div>
                <label
                  className="label-sm"
                  style={{
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Target Evidence Disk Image
                </label>

                <select
                  value={imagePath}
                  onChange={(e) => {
                    const selectedPath = e.target.value;
                    setImagePath(selectedPath);

                    /*
                     * Automatically suggest a stable case ID
                     * based on the selected synthetic test case.
                     */
                    const caseIdMap = {
                      'synthetic_evidence/sample_evidence.img':
                        'CAS-DEMO-SYNTHETIC-001',

                      'synthetic_evidence/TC01_clean.img':
                        'CAS-TC01-CLEAN-001',

                      'synthetic_evidence/TC02_corrupted.img':
                        'CAS-TC02-CORRUPTED-001',

                      'synthetic_evidence/TC03_fragmented.img':
                        'CAS-TC03-FRAGMENTED-001',

                      'synthetic_evidence/TC04_sensitive.img':
                        'CAS-TC04-SENSITIVE-001',

                      'synthetic_evidence/TC05_empty.img':
                        'CAS-TC05-EMPTY-001',

                      'synthetic_evidence/TC06_mixed.img':
                        'CAS-TC06-MIXED-001',

                      'test-stick.img':
                        '',
                    };

                    const suggestedId = caseIdMap[selectedPath];

                    if (suggestedId !== undefined) {
                      setCaseId(suggestedId);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 8,
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option
                    value="synthetic_evidence/sample_evidence.img"
                    style={{ background: '#111' }}
                  >
                    sample_evidence.img — Synthetic Multi-Artifact Demo
                  </option>

                  <option
                    value="synthetic_evidence/TC01_clean.img"
                    style={{ background: '#111' }}
                  >
                    TC01_clean.img — Clean Recovery
                  </option>

                  <option
                    value="synthetic_evidence/TC02_corrupted.img"
                    style={{ background: '#111' }}
                  >
                    TC02_corrupted.img — Corrupted Evidence
                  </option>

                  <option
                    value="synthetic_evidence/TC03_fragmented.img"
                    style={{ background: '#111' }}
                  >
                    TC03_fragmented.img — Fragment Reconstruction
                  </option>

                  <option
                    value="synthetic_evidence/TC04_sensitive.img"
                    style={{ background: '#111' }}
                  >
                    TC04_sensitive.img — Sensitive Artifact Classification
                  </option>

                  <option
                    value="synthetic_evidence/TC05_empty.img"
                    style={{ background: '#111' }}
                  >
                    TC05_empty.img — Empty Evidence
                  </option>

                  <option
                    value="synthetic_evidence/TC06_mixed.img"
                    style={{ background: '#111' }}
                  >
                    TC06_mixed.img — Mixed Forensic Scenario
                  </option>

                  <option
                    value="test-stick.img"
                    style={{ background: '#111' }}
                  >
                    test-stick.img — FAT32 Target USB Stick
                  </option>
                </select>
              </div>

              {/* Case ID */}
              <div>
                <label
                  className="label-sm"
                  style={{
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Case Identifier
                </label>

                <input
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  placeholder="e.g. CAS-TC03-FRAGMENTED-001"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 8,
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                  }}
                />

                <div
                  className="caption"
                  style={{
                    marginTop: 5,
                    fontSize: '0.68rem',
                  }}
                >
                  Stable identifier used for forensic case persistence.
                </div>
              </div>

              {/* Case Name */}
              <div>
                <label
                  className="label-sm"
                  style={{
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Case Title / Operation Identifier
                </label>

                <input
                  type="text"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                  required
                />
              </div>

              {/* Examiner */}
              <div>
                <label
                  className="label-sm"
                  style={{
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  Authorized Forensic Examiner
                </label>

                <input
                  type="text"
                  value={examiner}
                  onChange={(e) => setExaminer(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                  required
                />
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowNewScanForm(false)}
                >
                  ← Back to Cases
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 24px' }}
                >
                  Launch Forensic Acquisition
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* List of Cases */}
              <div
                style={{
                  maxHeight: 380,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {cases.map((c) => {
                  const isSelected = c.case_id === currentCaseId;

                  return (
                    <motion.div
                      key={c.case_id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        onSelectCase(c.case_id);
                        onClose();
                      }}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        background: isSelected
                          ? 'rgba(0, 240, 255, 0.12)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected
                          ? '1px solid var(--color-accent-cyan)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            className="mono-text"
                            style={{
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: isSelected
                                ? 'var(--color-accent-cyan)'
                                : '#fff',
                            }}
                          >
                            {c.case_id}
                          </span>

                          <span
                            className={`badge ${
                              c.status === 'COMPLETED'
                                ? 'badge-high'
                                : 'badge-cyan'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {c.name || 'Unnamed Investigation'}
                        </div>

                        <div
                          className="caption"
                          style={{
                            fontSize: '0.72rem',
                            marginTop: 2,
                          }}
                        >
                          Target:{' '}
                          {c.target_image
                            ? c.target_image.split('\\').pop()
                            : 'test-stick.img'}{' '}
                          • Recovered:{' '}
                          {c.files_recovered_count || 0} Artifacts
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          className="btn-secondary"
                          style={{
                            padding: '4px 12px',
                            fontSize: '0.75rem',
                          }}
                        >
                          {isSelected ? 'Active' : 'Load Case'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

                {cases.length === 0 && (
                  <div
                    style={{
                      padding: 40,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '2.5rem',
                        marginBottom: 12,
                      }}
                    >
                      📁
                    </div>

                    <h4 className="heading-md">
                      NO ACTIVE EVIDENCE
                    </h4>

                    <p
                      className="caption"
                      style={{ marginBottom: 20 }}
                    >
                      No forensic cases currently cataloged in the
                      SQLite database. Initialize a new scan to begin
                      evidence recovery.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop:
                    '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: 16,
                }}
              >
                <span className="caption">
                  Total Cases: {cases.length}
                </span>

                <button
                  className="btn-primary"
                  onClick={() => setShowNewScanForm(true)}
                  style={{ padding: '8px 20px' }}
                >
                  + Initialize New Acquisition
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}