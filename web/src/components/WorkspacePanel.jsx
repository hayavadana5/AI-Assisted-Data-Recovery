import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalWorkspaceHeader from './GlobalWorkspaceHeader';

/**
 * WorkspacePanel — Full-screen spatial workspace overlay with global navigation header.
 */
export default function WorkspacePanel({
  isOpen,
  title,
  workspaceId,
  prevWorkspaceName,
  icon,
  onClose,
  onBack,
  onGoCommandCenter,
  children,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="workspace-overlay">
          <motion.div
            className="workspace-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="workspace-panel glass-elevated"
            initial={{ opacity: 0, scale: 0.96, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.98, x: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Global Forensic Navigation Header */}
            <GlobalWorkspaceHeader
              title={title}
              workspaceId={workspaceId}
              prevWorkspaceName={prevWorkspaceName}
              onBack={onBack || onClose}
              onGoCommandCenter={onGoCommandCenter || onClose}
              onClose={onClose}
            />

            <div className="workspace-body">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
