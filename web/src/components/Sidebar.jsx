import React from 'react';
import { motion } from 'framer-motion';

const NAV_WORKSPACES = [
  { id: 'overview',     icon: '⬡',  label: 'Overview',     group: 'workspaces' },
  { id: 'recovery',     icon: '🔍', label: 'Recovery',      group: 'workspaces' },
  { id: 'fragments',    icon: '🧩', label: 'Fragments',     group: 'workspaces' },
  { id: 'integrity',    icon: '🛡️', label: 'Integrity',     group: 'workspaces' },
  { id: 'intelligence', icon: '✨', label: 'Intelligence',  group: 'workspaces' },
  { id: 'investigator', icon: '🤖', label: 'AI Investigator', group: 'workspaces' },
  { id: 'reports',      icon: '📋', label: 'Reports',       group: 'workspaces' },
];

const NAV_INSPECTION = [
  { id: 'hex',          icon: '⌗',  label: 'Hex Inspector', group: 'inspection' },
];

const NAV_SYSTEM = [
  { id: 'scan',         icon: '⚡', label: 'Scan Progress', group: 'operations' },
  { id: 'cases',        icon: '📁', label: 'Case Archive',  group: 'operations' },
  { id: 'new',          icon: '➕', label: 'New Acquisition', group: 'operations' },
];

function NavItem({ item, isActive, onClick }) {
  return (
    <motion.button
      className={`sidebar-nav-item ${isActive ? 'sidebar-nav-active' : ''}`}
      onClick={() => onClick(item.id)}
      whileHover={{ x: 3 }}
      transition={{ duration: 0.15 }}
      title={item.label}
      id={`nav-${item.id}`}
    >
      <span className="sidebar-nav-icon">{item.icon}</span>
      <span className="sidebar-nav-label">{item.label}</span>
      {isActive && (
        <motion.div
          className="sidebar-nav-indicator"
          layoutId="sidebar-active-indicator"
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </motion.button>
  );
}

export default function Sidebar({
  activeWorkspace,
  onSelectWorkspace,
  onGoHome,
  selectedCaseId,
  caseData,
  files,
  recons,
  scanning,
}) {
  const statusColor = caseData?.status === 'COMPLETED' ? '#10b981'
    : caseData?.status === 'PROCESSING' ? '#f59e0b'
    : '#64748b';

  return (
    <aside className="sidebar">
      {/* ── BRAND ── */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          <span className="sidebar-shield">🛡️</span>
          <div>
            <div className="sidebar-brand-name">AEGIS</div>
            <div className="sidebar-brand-sub">FORENSIC COMMAND CENTER</div>
          </div>
        </div>
      </div>

      <div className="sidebar-divider" style={{ marginTop: 0 }} />

      {/* ── CASE CONTEXT ── */}
      <div className="sidebar-case-block">
        <div className="sidebar-section-label">ACTIVE CASE</div>
        {selectedCaseId ? (
          <>
            <div className="sidebar-case-id">{selectedCaseId}</div>
            <div className="sidebar-case-status" style={{ color: statusColor }}>
              <span className="sidebar-status-dot" style={{ background: statusColor }} />
              {caseData?.status || 'LOADING'}
            </div>
            <div className="sidebar-case-metrics">
              <div className="sidebar-metric">
                <div className="sidebar-metric-val">{files.length}</div>
                <div className="sidebar-metric-lbl">Recovered</div>
              </div>
              <div className="sidebar-metric">
                <div className="sidebar-metric-val">{recons.length}</div>
                <div className="sidebar-metric-lbl">Fragments</div>
              </div>
              <div className="sidebar-metric">
                <div className="sidebar-metric-val">{caseData?.chain_of_custody?.length || 0}</div>
                <div className="sidebar-metric-lbl">CoC Events</div>
              </div>
            </div>
          </>
        ) : (
          <div className="sidebar-case-empty">No case selected</div>
        )}
      </div>

      <div className="sidebar-divider" />

      {/* ── WORKSPACES ── */}
      <div className="sidebar-section-label">WORKSPACES</div>
      <nav className="sidebar-nav">
        {NAV_WORKSPACES.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeWorkspace === item.id}
            onClick={onSelectWorkspace}
          />
        ))}
      </nav>

      <div className="sidebar-divider" />

      {/* ── INSPECTION ── */}
      <div className="sidebar-section-label">INSPECTION</div>
      <nav className="sidebar-nav">
        {NAV_INSPECTION.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeWorkspace === item.id}
            onClick={onSelectWorkspace}
          />
        ))}
      </nav>

      <div className="sidebar-divider" />

      {/* ── OPERATIONS ── */}
      <div className="sidebar-section-label">OPERATIONS</div>
      <nav className="sidebar-nav">
        {NAV_SYSTEM.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeWorkspace === item.id}
            onClick={onSelectWorkspace}
          />
        ))}
      </nav>

      {/* ── BOTTOM STATUS ── */}
      <div className="sidebar-footer">
        <button className="sidebar-home-btn" onClick={onGoHome} id="nav-home">
          ← Home
        </button>
        <div className="sidebar-divider" style={{ margin: '8px 0' }} />
        <div className="sidebar-footer-status">
          <span className="status-dot online" />
          <span>API ONLINE</span>
        </div>
        {scanning && (
          <div className="sidebar-footer-scanning">
            <span className="sidebar-scanning-pulse" />
            SCANNING
          </div>
        )}
      </div>
    </aside>
  );
}
