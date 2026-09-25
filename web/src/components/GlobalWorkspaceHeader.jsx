import React from 'react';

/**
 * GlobalWorkspaceHeader — Standardized forensic navigation bar for all workspaces & modals.
 * Features:
 *   - [ ← Back ] with previous context
 *   - Clickable breadcrumbs: AEGIS / COMMAND CENTER / <WORKSPACE>
 *   - [ ⌂ COMMAND CENTER ] persistent prominent escape route
 *   - Optional direct close [ ✕ ]
 */
export default function GlobalWorkspaceHeader({
  title,
  workspaceId,
  prevWorkspaceName,
  onBack,
  onGoCommandCenter,
  onClose,
  showClose = true,
  customSubtitle,
}) {
  const displayTitle = (title || workspaceId || 'WORKSPACE').toUpperCase();
  const backLabel = prevWorkspaceName ? `← Back to ${prevWorkspaceName}` : '← Back';

  return (
    <div className="global-workspace-nav">
      {/* Left: Back button & Breadcrumbs */}
      <div className="gwn-left">
        {onBack && (
          <button
            type="button"
            className="gwn-back-btn"
            onClick={onBack}
            title="Navigate to previous workspace"
            id="workspace-back-btn"
          >
            {backLabel}
          </button>
        )}

        <div className="gwn-divider" />

        <div className="gwn-breadcrumbs">
          <button
            type="button"
            className="gwn-crumb gwn-crumb-link"
            onClick={onGoCommandCenter}
            title="Return to Command Center"
          >
            AEGIS
          </button>
          <span className="gwn-sep">/</span>
          <button
            type="button"
            className="gwn-crumb gwn-crumb-link"
            onClick={onGoCommandCenter}
            title="Return to Command Center"
          >
            COMMAND CENTER
          </button>
          <span className="gwn-sep">/</span>
          <span className="gwn-crumb gwn-crumb-active">
            {displayTitle}
          </span>
        </div>
      </div>

      {/* Right: Persistent Command Center button & Close */}
      <div className="gwn-right">
        {onGoCommandCenter && (
          <button
            type="button"
            className="gwn-cmd-btn"
            onClick={onGoCommandCenter}
            title="Return directly to Command Center Overview"
            id="workspace-command-center-btn"
          >
            <span className="gwn-cmd-icon">⌂</span>
            <span className="gwn-cmd-text">COMMAND CENTER</span>
          </button>
        )}

        {showClose && onClose && (
          <button
            type="button"
            className="workspace-close"
            onClick={onClose}
            aria-label="Close"
            title="Close view"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
