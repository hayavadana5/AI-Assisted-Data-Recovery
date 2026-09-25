import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCases, useCase, useScan } from './hooks/useCase';
import { getCaseDetail } from './services/api';
import EvidenceScene from './scene/EvidenceScene';
import FloatingModule from './components/FloatingModule';
import WorkspacePanel from './components/WorkspacePanel';
import RecoveryWorkspace from './components/RecoveryWorkspace';
import FragmentWorkspace from './components/FragmentWorkspace';
import IntegrityWorkspace from './components/IntegrityWorkspace';
import IntelligenceWorkspace from './components/IntelligenceWorkspace';
import InvestigatorWorkspace from './components/InvestigatorWorkspace';
import ReportsWorkspace from './components/ReportsWorkspace';
import HexViewerModal from './components/HexViewerModal';
import CaseSelector from './components/CaseSelector';
import ScanProgress from './components/ScanProgress';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/* ── VIEW STATES ── */
const VIEW_LANDING = 'landing';
const VIEW_COMMAND  = 'command';

export default function App() {
  // ── App-level view routing ──
  const [appView, setAppView] = useState(VIEW_LANDING);

  // ── Case data ──
  const { cases, loading: casesLoading, refresh: refreshCases } = useCases();
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // ── Workspace & UI state ──
  const [activeWorkspace, setActiveWorkspace] = useState('overview');
  const [navHistory, setNavHistory] = useState(['overview']);
  const [selectedHexFile, setSelectedHexFile] = useState(null);
  const [isCaseSelectorOpen, setIsCaseSelectorOpen] = useState(false);
  const [isScanProgressOpen, setIsScanProgressOpen] = useState(false);

  // ── Sidebar mobile collapse ──
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Default to first case on load
  useEffect(() => {
    if (cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(cases[0].case_id);
    }
  }, [cases, selectedCaseId]);

  const { caseData, loading: caseLoading } = useCase(selectedCaseId);
  const { scanning, logs, scanCaseId, progress, inititateScan } = useScan();

  // Auto-select new case after scan completes
  useEffect(() => {
    if (scanCaseId && !scanning) {
      setSelectedCaseId(scanCaseId);
      refreshCases();
    }
  }, [scanCaseId, scanning, refreshCases]);

  const handleStartScan = useCallback(async (opts) => {
    setIsScanProgressOpen(true);
    const newCaseId = await inititateScan(opts);
    if (newCaseId) setSelectedCaseId(newCaseId);
  }, [inititateScan]);

  /* ── Navigation Stack Handlers ── */
  /* ── Navigation Stack + Browser History ── */

const navigateTo = useCallback((target) => {
  setNavHistory(prev => {
    if (prev[prev.length - 1] === target) return prev;

    const nextHistory = [...prev, target];

    // Keep browser history synchronized with AEGIS workspace navigation.
    window.history.pushState(
      { aegisWorkspace: target },
      '',
      `#${target}`
    );

    return nextHistory;
  });

  setActiveWorkspace(target);
}, []);

const navigateBack = useCallback(() => {
  // Let the browser history drive the navigation.
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  setActiveWorkspace('overview');
  setNavHistory(['overview']);
}, []);

const navigateToCommandCenter = useCallback(() => {
  setActiveWorkspace('overview');
  setIsCaseSelectorOpen(false);
  setIsScanProgressOpen(false);
  setSelectedHexFile(null);
  setNavHistory(['overview']);

  // Replace the current browser URL instead of adding another history entry.
  window.history.replaceState(
    { aegisWorkspace: 'overview' },
    '',
    '#overview'
  );
}, []);

/* Handle Chrome/Edge/Firefox Back and Forward buttons */
useEffect(() => {
  const handleBrowserNavigation = (event) => {
    const workspace = event.state?.aegisWorkspace;

    if (workspace) {
      setActiveWorkspace(workspace);

      setNavHistory(prev => {
        const index = prev.lastIndexOf(workspace);

        if (index >= 0) {
          return prev.slice(0, index + 1);
        }

        return [...prev, workspace];
      });
    } else {
      setActiveWorkspace('overview');
      setNavHistory(['overview']);
    }
  };

  window.addEventListener('popstate', handleBrowserNavigation);

  return () => {
    window.removeEventListener('popstate', handleBrowserNavigation);
  };
}, []);
  /* ── Open Demo Evidence Handler ── */
  const handleOpenDemoEvidence = useCallback(async () => {
    const DEMO_CASE_ID = 'CAS-DEMO-SYNTHETIC-001';

    // 1. If CAS-DEMO-SYNTHETIC-001 is already in cases list, switch immediately
    const exactCase = cases.find(c => c.case_id === DEMO_CASE_ID);
    if (exactCase) {
      setSelectedCaseId(DEMO_CASE_ID);
      navigateToCommandCenter();
      return;
    }

    // 2. Query API directly in case local cases list is still synchronizing
    try {
      const detail = await getCaseDetail(DEMO_CASE_ID);
      if (detail && detail.case_id === DEMO_CASE_ID) {
        setSelectedCaseId(DEMO_CASE_ID);
        refreshCases();
        navigateToCommandCenter();
        return;
      }
    } catch {
      // Not yet created in SQLite
    }

    // 3. Fallback: launch real scan against synthetic sample evidence
    await handleStartScan({
      imagePath: 'synthetic_evidence/sample_evidence.img',
      caseName: 'DEMO / SYNTHETIC EVIDENCE — Operation Cyber Dawn',
      examiner: 'Lead Forensic Examiner (Synthetic Test Suite)',
      caseId: DEMO_CASE_ID,
    });
  }, [cases, handleStartScan, navigateToCommandCenter, refreshCases]);

  // Derived metrics from real API data
  const files  = caseData?.recovered_files || [];
  const recons = caseData?.reconstructions  || [];
  const entropy = caseData?.entropy_map     || {};
  const totalBytes       = files.reduce((a, f) => a + (f.size || 0), 0);
  const highPriorityCount = files.filter(f => {
    const p = (f.priority || '').toUpperCase();
    return p === 'HIGH' || p === 'CRITICAL';
  }).length;
  const repairedCount    = files.filter(f => f.repaired).length;
  const intactCount      = files.filter(f => !f.repaired && (f.confidence === undefined || f.confidence >= 0.85)).length;

  const WORKSPACE_NAMES = {
    overview: 'Command Center',
    recovery: 'Recovery',
    fragments: 'Fragments',
    integrity: 'Integrity',
    intelligence: 'Intelligence',
    investigator: 'AI Investigator',
    reports: 'Reports',
    hex: 'Hex Inspector',
    scan: 'Scan Progress',
    cases: 'Case Archive',
    new: 'New Acquisition',
  };

  const prevWsId = navHistory.length > 1 ? navHistory[navHistory.length - 2] : 'overview';
  const prevWorkspaceName = WORKSPACE_NAMES[prevWsId] || 'Command Center';

  /* ── Sidebar nav handler ── */
  const handleSidebarNav = useCallback((id) => {
    if (id === 'hex') {
      if (files.length > 0) setSelectedHexFile(files[0]);
      return;
    }
    if (id === 'scan') { setIsScanProgressOpen(true); return; }
    if (id === 'cases') { setIsCaseSelectorOpen(true); return; }
    if (id === 'new') { setIsCaseSelectorOpen(true); return; }
    navigateTo(id);
  }, [files, navigateTo]);

  /* ── Module card click ── */
  const handleModuleClick = useCallback((ws) => {
    navigateTo(ws);
  }, [navigateTo]);

  /* ─────────────────────────────────────────────
     LANDING PAGE VIEW
  ───────────────────────────────────────────── */
  if (appView === VIEW_LANDING) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="landing"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <LandingPage
            onEnter={() => setAppView(VIEW_COMMAND)}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  /* ─────────────────────────────────────────────
     COMMAND CENTER VIEW
  ───────────────────────────────────────────── */
  return (
    <motion.div
      key="command"
      className="command-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ── MOBILE SIDEBAR TOGGLE ── */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setSidebarOpen(o => !o)}
        aria-label="Toggle navigation"
        id="sidebar-toggle"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* ── SIDEBAR ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="sidebar-motion-wrapper"
          >
            <Sidebar
              activeWorkspace={activeWorkspace}
              onSelectWorkspace={handleSidebarNav}
              onGoHome={() => setAppView(VIEW_LANDING)}
              selectedCaseId={selectedCaseId}
              caseData={caseData}
              files={files}
              recons={recons}
              scanning={scanning}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT AREA ── */}
      <div className={`command-main ${sidebarOpen ? 'command-main-shifted' : ''}`}>

        {/* TOP BAR */}
        <header className="top-bar" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 24px', borderBottom: '1px solid rgba(56,189,248,0.1)', flexWrap: 'wrap' }}>
          <span className="mono-text" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cyan)' }}>AEGIS</span>
          <div style={{ height: 16, width: 1, background: 'rgba(56,189,248,0.2)' }} />
          <span className="mono-text" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>CASE:</span>
          <span className="mono-text" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedCaseId || 'NONE'}</span>
          <div style={{ height: 16, width: 1, background: 'rgba(56,189,248,0.2)' }} />
          <span className="mono-text" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>STATUS:</span>
          <span className="mono-text" style={{ fontSize: '0.78rem', fontWeight: 700, color: caseData?.status === 'COMPLETED' ? 'var(--emerald)' : 'var(--amber)' }}>{caseData?.status || 'LOADING'}</span>
          {caseData && (
            <>
              <div style={{ height: 16, width: 1, background: 'rgba(56,189,248,0.2)' }} />
              <span className="mono-text" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>EVIDENCE:</span>
              <span className="mono-text" style={{ fontSize: '0.78rem', fontWeight: 700 }}>{caseData?.target_image ? caseData.target_image.split(/[/\\]/).pop() : 'N/A'}</span>
              <div style={{ height: 16, width: 1, background: 'rgba(56,189,248,0.2)' }} />
              <span className="mono-text" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>RECOVERED:</span>
              <span className="mono-text" style={{ fontSize: '0.78rem', fontWeight: 700, color: files.length > 0 ? 'var(--cyan)' : 'var(--text-primary)' }}>{files.length}</span>
              <div style={{ height: 16, width: 1, background: 'rgba(56,189,248,0.2)' }} />
              <span className="mono-text" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>RECONSTRUCTED:</span>
              <span className="mono-text" style={{ fontSize: '0.78rem', fontWeight: 700, color: recons.length > 0 ? 'var(--emerald)' : 'var(--text-primary)' }}>{recons.length}</span>
              <div style={{ height: 16, width: 1, background: 'rgba(56,189,248,0.2)' }} />
              <span className="mono-text" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>INTEGRITY:</span>
              <span className="mono-text" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--emerald)' }}>{intactCount} Intact</span>
              <div style={{ height: 16, width: 1, background: 'rgba(56,189,248,0.2)' }} />
              <span className="mono-text" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>HIGH PRIORITY:</span>
              <span className="mono-text" style={{ fontSize: '0.78rem', fontWeight: 700, color: highPriorityCount > 0 ? 'var(--amber)' : 'var(--text-primary)' }}>{highPriorityCount}</span>
            </>
          )}
        </header>

        {/* EVIDENCE CORE */}
        <main className="evidence-core-container" style={{ position: 'relative', overflow: 'hidden', overflowY: 'auto' }}>
          {/* 3D Scene */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
            <EvidenceScene activeCaseId={selectedCaseId} artifactCount={files.length} />
          </div>

          {/* Content overlay — scrollable */}
          <div style={{ position: 'relative', zIndex: 10, padding: '32px 32px 40px' }}>

            {/* ── CASE SUMMARY BANNER / ZERO DATA STATE ── */}
            <div className="case-summary-banner glass-panel" style={{ marginBottom: 24 }}>
              <div className="csb-left">
                <div className="label-sm" style={{ letterSpacing: '0.15em', color: 'var(--cyan)', marginBottom: 4 }}>
                  EVIDENCE ANALYSIS {caseData?.status === 'COMPLETED' ? 'COMPLETE' : 'IN PROGRESS'}
                </div>
                <h2 className="mono-text" style={{ fontSize: '1.5rem', margin: 0, color: 'var(--text-primary)' }}>
                  {selectedCaseId || 'NO CASE SELECTED'}
                </h2>
                <div className="caption" style={{ marginTop: 4 }}>
                  {caseData?.name || 'Awaiting investigation target ingestion'}
                </div>
                
                {caseData?.status === 'COMPLETED' && files.length === 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--amber)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
                      NO RECOVERABLE ARTIFACTS DETECTED
                    </div>
                    <div className="caption" style={{ marginBottom: 14, maxWidth: 440, lineHeight: 1.5 }}>
                      No recoverable artifacts were detected in this evidence source (<strong>{caseData?.target_image ? caseData.target_image.split(/[/\\]/).pop() : 'test-stick.img'}</strong>). Artifacts recovered: 0.<br />
                      This is a valid forensic result for sanitized or zero-filled media.
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button
                        className="btn-primary"
                        onClick={handleOpenDemoEvidence}
                        style={{ fontSize: '0.78rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                        id="open-demo-evidence-btn"
                      >
                        <span>📁</span> OPEN DEMO EVIDENCE
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setIsCaseSelectorOpen(true)}
                        style={{ fontSize: '0.78rem', padding: '8px 16px' }}
                      >
                        NEW FORENSIC ACQUISITION
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="csb-metrics">
                <div className="csb-metric">
                  <div className="csb-metric-val">{files.length}</div>
                  <div className="csb-metric-lbl">Recovered</div>
                </div>
                <div className="csb-metric">
                  <div className="csb-metric-val">{recons.length}</div>
                  <div className="csb-metric-lbl">Reconstructions</div>
                </div>
                <div className="csb-metric">
                  <div className="csb-metric-val">{intactCount}</div>
                  <div className="csb-metric-lbl">Intact</div>
                </div>
                <div className="csb-metric">
                  <div className="csb-metric-val">{highPriorityCount}</div>
                  <div className="csb-metric-lbl">High Priority</div>
                </div>
                <div className="csb-metric">
                  <div className="csb-metric-val">{formatBytes(totalBytes)}</div>
                  <div className="csb-metric-lbl">Total Evidence</div>
                </div>
              </div>
            </div>

            {/* ── WHY AEGIS PANEL (Overview Only) ── */}
            {activeWorkspace === 'overview' && (
              <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 24, borderLeft: '3px solid var(--violet)', background: 'rgba(139, 92, 246, 0.05)' }}>
                <div className="label-sm" style={{ color: 'var(--violet)', marginBottom: 8 }}>WHY AEGIS?</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Traditional recovery can produce fragmented or corrupted files that are difficult to interpret.<br />
                  AEGIS combines: <strong>RECOVERY + FRAGMENT RECONSTRUCTION + INTEGRITY ANALYSIS + ARTIFACT INTELLIGENCE + INVESTIGATOR DECISION SUPPORT</strong>
                </p>
              </div>
            )}

            {/* ── FORENSIC PIPELINE VISUAL ── */}
            <div className="forensic-pipeline" style={{ marginBottom: 28 }}>
              <div className="fp-label">FORENSIC PIPELINE</div>
              <div className="fp-stages">
                {[
                  { id: 'overview', label: 'EVIDENCE', icon: '💾', color: '#f43f5e' },
                  { id: 'recovery', label: 'RECOVER', icon: '🔍', color: '#00e5ff' },
                  { id: 'fragments', label: 'RECONSTRUCT', icon: '🧩', color: '#10b981' },
                  { id: 'integrity', label: 'VALIDATE', icon: '🛡️', color: '#f59e0b' },
                  { id: 'intelligence', label: 'CLASSIFY', icon: '✨', color: '#8b5cf6' },
                  { id: 'investigator', label: 'INVESTIGATE', icon: '🤖', color: '#00e5ff' },
                  { id: 'reports', label: 'REPORT', icon: '📋', color: '#10b981' },
                ].map((stage, i, arr) => (
                  <React.Fragment key={stage.id}>
                    <button
                      className={`fp-node ${activeWorkspace === stage.id ? 'fp-node-active' : ''}`}
                      style={{ '--fp-color': stage.color }}
                      onClick={() => {
                        if (stage.id === 'overview') {
                          setIsCaseSelectorOpen(true);
                        } else {
                          handleModuleClick(stage.id);
                        }
                      }}
                      title={`Navigate to ${stage.label} Workspace`}
                    >
                      <span className="fp-node-icon">{stage.icon}</span>
                      <span className="fp-node-label">{stage.label}</span>
                    </button>
                    {i < arr.length - 1 && <div className="fp-arrow">→</div>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ── 6 MODULE CARDS — fixed 2×3 grid, no overlap ── */}
            <div className="module-grid" style={{ paddingTop: 0, margin: '0 auto' }}>
              {/* Row 1 */}
              <FloatingModule
                icon="🔍" title="Recovery" iconColor="cyan"
                description="Recovered artifacts from evidence source"
                stats={[
                  { label: 'Artifacts', value: files.length },
                  { label: 'Total Carved', value: formatBytes(totalBytes) },
                ]}
                onClick={() => handleModuleClick('recovery')}
                isActive={activeWorkspace === 'recovery'}
                delay={0}
              />
              <FloatingModule
                icon="🧩" title="Fragment Reconstruction" iconColor="emerald"
                description="Non-contiguous fragment reassembly"
                stats={[
                  { label: 'Reconstructed', value: recons.length },
                  { label: 'Confidence', value: recons.length > 0 ? `${Math.round((recons[0]?.confidence || 1) * 100)}%` : '—' },
                ]}
                onClick={() => handleModuleClick('fragments')}
                isActive={activeWorkspace === 'fragments'}
                delay={1}
              />

              {/* Row 2 */}
              <FloatingModule
                icon="🛡️" title="Integrity" iconColor="amber"
                description="Hashes, corruption, entropy profiling"
                stats={[
                  { label: 'Intact', value: intactCount },
                  { label: 'Repaired', value: repairedCount },
                ]}
                onClick={() => handleModuleClick('integrity')}
                isActive={activeWorkspace === 'integrity'}
                delay={2}
              />
              <FloatingModule
                icon="✨" title="Intelligence" iconColor="violet"
                description="Classification & priority grading"
                stats={[
                  { label: 'High Priority', value: highPriorityCount },
                  { label: 'Categories', value: new Set(files.map(f => f.category)).size || 0 },
                ]}
                onClick={() => handleModuleClick('intelligence')}
                isActive={activeWorkspace === 'intelligence'}
                delay={3}
              />

              {/* Row 3 */}
              <FloatingModule
                icon="🤖" title="AI Investigator" iconColor="cyan"
                description="Decision support & Gemini analysis"
                stats={[
                  { label: 'Engine', value: 'Gemini 2.5' },
                  { label: 'Briefing', value: selectedCaseId ? 'READY' : 'OFFLINE' },
                ]}
                onClick={() => handleModuleClick('investigator')}
                isActive={activeWorkspace === 'investigator'}
                delay={4}
              />
              <FloatingModule
                icon="📋" title="Reports" iconColor="emerald"
                description="PDF export & chain-of-custody"
                stats={[
                  { label: 'PDF Export', value: 'AVAILABLE' },
                  { label: 'CoC Events', value: caseData?.chain_of_custody?.length || 0 },
                ]}
                onClick={() => handleModuleClick('reports')}
                isActive={activeWorkspace === 'reports'}
                delay={5}
              />
            </div>
          </div>
        </main>

        {/* ── BOTTOM STATUS BAR ── */}
        <div className="bottom-statusbar">
          <div className="bsb-left">
            <span className="status-dot online" />
            <span className="bsb-label">SYSTEM ONLINE</span>
            <span className="bsb-sep">·</span>
            <span className="bsb-label">FastAPI v2.0</span>
            <span className="bsb-sep">·</span>
            <span className="bsb-label mono-text">ws://127.0.0.1:8000</span>
          </div>
          <div className="bsb-right">
            {scanning && (
              <span className="bsb-scanning">
                <span className="sidebar-scanning-pulse" /> SCAN ACTIVE
              </span>
            )}
            <span className="bsb-label">{cases.length} case(s) in archive</span>
          </div>
        </div>
      </div>

      {/* ── WORKSPACE OVERLAYS ── */}
      <WorkspacePanel
        isOpen={activeWorkspace === 'recovery'}
        title="RECOVERED DIGITAL ARTIFACTS"
        workspaceId="recovery"
        prevWorkspaceName={prevWorkspaceName}
        icon="🔍"
        onClose={() => navigateTo('overview')}
        onBack={navigateBack}
        onGoCommandCenter={navigateToCommandCenter}
      >
        <RecoveryWorkspace files={files} caseId={selectedCaseId} onSelectHexFile={(f) => setSelectedHexFile(f)} />
      </WorkspacePanel>

      <WorkspacePanel
        isOpen={activeWorkspace === 'fragments'}
        title="FRAGMENT RECONSTRUCTION"
        workspaceId="fragments"
        prevWorkspaceName={prevWorkspaceName}
        icon="🧩"
        onClose={() => navigateTo('overview')}
        onBack={navigateBack}
        onGoCommandCenter={navigateToCommandCenter}
      >
        <FragmentWorkspace reconstructions={recons} onSelectHex={(f) => setSelectedHexFile(f)} />
      </WorkspacePanel>

      <WorkspacePanel
        isOpen={activeWorkspace === 'integrity'}
        title="INTEGRITY ASSESSMENT"
        workspaceId="integrity"
        prevWorkspaceName={prevWorkspaceName}
        icon="🛡️"
        onClose={() => navigateTo('overview')}
        onBack={navigateBack}
        onGoCommandCenter={navigateToCommandCenter}
      >
        <IntegrityWorkspace files={files} entropyMap={entropy} onSelectHex={(f) => setSelectedHexFile(f)} />
      </WorkspacePanel>

      <WorkspacePanel
        isOpen={activeWorkspace === 'intelligence'}
        title="ARTIFACT INTELLIGENCE"
        workspaceId="intelligence"
        prevWorkspaceName={prevWorkspaceName}
        icon="✨"
        onClose={() => navigateTo('overview')}
        onBack={navigateBack}
        onGoCommandCenter={navigateToCommandCenter}
      >
        <IntelligenceWorkspace files={files} onSelectHex={(f) => setSelectedHexFile(f)} />
      </WorkspacePanel>

      <WorkspacePanel
        isOpen={activeWorkspace === 'investigator'}
        title="AI INVESTIGATOR"
        workspaceId="investigator"
        prevWorkspaceName={prevWorkspaceName}
        icon="🤖"
        onClose={() => navigateTo('overview')}
        onBack={navigateBack}
        onGoCommandCenter={navigateToCommandCenter}
      >
        <InvestigatorWorkspace caseId={selectedCaseId} caseData={caseData} />
      </WorkspacePanel>

      <WorkspacePanel
        isOpen={activeWorkspace === 'reports'}
        title="FORENSIC REPORTS"
        workspaceId="reports"
        prevWorkspaceName={prevWorkspaceName}
        icon="📋"
        onClose={() => navigateTo('overview')}
        onBack={navigateBack}
        onGoCommandCenter={navigateToCommandCenter}
      >
        <ReportsWorkspace caseId={selectedCaseId} caseData={caseData} />
      </WorkspacePanel>

      {/* ── MODALS ── */}
      {selectedHexFile && (
        <HexViewerModal
          file={selectedHexFile}
          caseId={selectedCaseId}
          onClose={() => setSelectedHexFile(null)}
          onGoCommandCenter={navigateToCommandCenter}
        />
      )}

      <CaseSelector
        cases={cases}
        currentCaseId={selectedCaseId}
        onSelectCase={(id) => {
          setSelectedCaseId(id);
          navigateToCommandCenter();
        }}
        onStartNewScan={handleStartScan}
        isOpen={isCaseSelectorOpen}
        onClose={() => setIsCaseSelectorOpen(false)}
        onGoCommandCenter={navigateToCommandCenter}
      />

      {(isScanProgressOpen ) && (
        <ScanProgress
          progress={progress}
          logs={logs}
          isScanning={scanning}
          onClose={() => setIsScanProgressOpen(false)}
          onGoCommandCenter={navigateToCommandCenter}
        />
      )}
    </motion.div>
  );
}
