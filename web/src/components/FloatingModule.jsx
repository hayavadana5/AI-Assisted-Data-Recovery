import React from 'react';
import { motion } from 'framer-motion';

/**
 * FloatingModule — A module card in the Evidence Core ring.
 * Props: icon, title, iconColor, stats[], description, onClick, isActive
 */
export default function FloatingModule({ icon, title, iconColor = 'cyan', stats = [], description, onClick, delay = 0, isActive = false }) {
  const colorClass = `module-icon-${iconColor}`;

  // colour token per iconColor
  const glowMap = {
    cyan:    'rgba(0, 229, 255, 0.25)',
    emerald: 'rgba(16, 185, 129, 0.25)',
    amber:   'rgba(245, 158, 11, 0.25)',
    violet:  'rgba(139, 92, 246, 0.25)',
    rose:    'rgba(244, 63, 94, 0.25)',
  };

  return (
    <motion.div
      className={`module-card glass-panel ${isActive ? 'module-card-active' : ''}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 30 }}
      animate={{
        opacity: 1,
        y: isActive ? -6 : 0,
        scale: isActive ? 1.03 : 1,
        boxShadow: isActive
          ? `0 0 28px ${glowMap[iconColor] || glowMap.cyan}, 0 0 1px rgba(255,255,255,0.1)`
          : '0 0 0 rgba(0,0,0,0)',
      }}
      transition={{ duration: 0.5, delay: delay * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: isActive ? 1.04 : 1.02, y: isActive ? -8 : -2 }}
      tabIndex={0}
      role="button"
      aria-label={`Open ${title} workspace`}
      aria-pressed={isActive}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
    >
      {isActive && <div className="module-active-bar" />}
      <div className={`module-icon ${colorClass}`}>
        {icon}
      </div>
      <div className="module-title">{title}</div>
      {description && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>
          {description}
        </div>
      )}
      {stats.length > 0 && (
        <div className="module-stats">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="module-stat-value">{s.value}</div>
              <div className="module-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
