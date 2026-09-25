import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/* ─── Animated particle canvas background ─── */
function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animFrame;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    const N = 70;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 1.2,
      color: ['#00e5ff', '#8b5cf6', '#10b981'][Math.floor(Math.random() * 3)],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '44';
        ctx.fill();
      });
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0,229,255,${0.1 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      animFrame = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animFrame); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', opacity: 0.45,
      }}
    />
  );
}

/* ─── Pipeline steps ─── */
const PIPELINE = [
  { label: 'DAMAGED EVIDENCE', icon: '💾', color: '#f43f5e', desc: 'Corrupted, fragmented, or deleted digital artifacts' },
  { label: 'RECOVER', icon: '🔍', color: '#00e5ff', desc: 'Multi-signature byte carving & deleted inode recovery' },
  { label: 'RECONSTRUCT', icon: '🧩', color: '#10b981', desc: 'Non-contiguous fragment reassembly' },
  { label: 'VALIDATE', icon: '🛡️', color: '#f59e0b', desc: 'SHA-256 verification, corruption detection, entropy profiling' },
  { label: 'CLASSIFY', icon: '✨', color: '#8b5cf6', desc: 'Automated artifact categorization & priority grading' },
  { label: 'PRIORITIZE', icon: '⚡', color: '#f59e0b', desc: 'Risk-scored evidence triage for investigator focus' },
  { label: 'INVESTIGATE', icon: '🤖', color: '#00e5ff', desc: 'AI-powered decision support via Gemini analysis' },
];

/* ─── Capability cards ─── */
const CAPABILITIES = [
  {
    icon: '🔍', color: '#00e5ff', glow: 'rgba(0,229,255,0.15)',
    title: 'Intelligent Recovery',
    desc: 'Recover identifiable artifacts from evidence sources.',
  },
  {
    icon: '🧩', color: '#10b981', glow: 'rgba(16,185,129,0.15)',
    title: 'Fragment Reconstruction',
    desc: 'Detect and reconstruct non-contiguous file fragments.',
  },
  {
    icon: '🛡️', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)',
    title: 'Integrity Analysis',
    desc: 'Assess hashes, corruption, structural validity and entropy.',
  },
  {
    icon: '✨', color: '#f43f5e', glow: 'rgba(244,63,94,0.15)',
    title: 'Artifact Intelligence',
    desc: 'Classify and prioritize recovered evidence.',
  },
  {
    icon: '🤖', color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)',
    title: 'AI Investigator',
    desc: 'Turn structured forensic findings into investigator-oriented decision support.',
  },
  {
    icon: '📋', color: '#00e5ff', glow: 'rgba(0,229,255,0.15)',
    title: 'Forensic Reporting',
    desc: 'Generate forensic reports and preserve chain-of-custody information.',
  },
];

export default function LandingPage({ onEnter }) {
  return (
    <div className="landing-page">
      <ParticleField />
      <div className="landing-scanlines" />

      {/* ── NAV ── */}
      <motion.nav
        className="landing-nav"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="landing-nav-logo">
          <span className="landing-shield">🛡️</span>
          <span className="landing-nav-wordmark">AEGIS</span>
        </div>
        <div className="landing-nav-tag">FORENSIC COMMAND CENTER</div>
      </motion.nav>

      {/* ── HERO ── */}
      <section className="landing-hero">
        <div className="landing-orb landing-orb-cyan" />
        <div className="landing-orb landing-orb-violet" />

        <motion.div
          className="landing-hero-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* badge */}
          <motion.div
            className="landing-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="landing-badge-dot" />
            AI-POWERED DIGITAL FORENSICS PLATFORM
          </motion.div>

          {/* title */}
          <motion.h1
            className="landing-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            AEGIS
          </motion.h1>

          <motion.div
            className="landing-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            AI-ASSISTED DIGITAL EVIDENCE<br />
            RECOVERY &amp; RECONSTRUCTION
          </motion.div>

          {/* Problem statement */}
          <motion.div
            className="landing-problem"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            When evidence is damaged, recovery isn't enough.
          </motion.div>

          <motion.p
            className="landing-description"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            Recover fragmented evidence, reconstruct damaged artifacts, validate integrity, classify investigative value, and provide evidence-grounded decision support.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          >
            <button className="landing-cta" onClick={onEnter} id="get-started-btn">
              <span className="landing-cta-icon">⬡</span>
              GET STARTED
              <span className="landing-cta-arrow">→</span>
            </button>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
              Enter Forensic Command Center
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── PIPELINE SECTION ── */}
      <section className="landing-section">
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="landing-section-label">FORENSIC PIPELINE</div>
          <h2 className="landing-section-title">
            From Evidence to Actionable Intelligence
          </h2>
        </motion.div>

        <div className="landing-pipeline">
          {PIPELINE.map((step, i) => (
            <motion.div
              key={i}
              className="landing-pipeline-step"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <div className="landing-pipeline-node" style={{ borderColor: step.color, boxShadow: `0 0 14px ${step.color}30` }}>
                <span style={{ fontSize: '1.1rem' }}>{step.icon}</span>
              </div>
              <div className="landing-pipeline-info">
                <div className="landing-pipeline-label" style={{ color: step.color }}>{step.label}</div>
                <div className="landing-pipeline-desc">{step.desc}</div>
              </div>
              {i < PIPELINE.length - 1 && (
                <div className="landing-pipeline-connector">
                  <motion.div
                    className="landing-pipeline-line"
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 + 0.15, duration: 0.3 }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section className="landing-section landing-section-caps">
        <motion.div
          className="landing-section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="landing-section-label">CAPABILITIES</div>
          <h2 className="landing-section-title">
            Enterprise-Grade Forensic Modules
          </h2>
        </motion.div>

        <div className="landing-caps-grid">
          {CAPABILITIES.map((cap, i) => (
            <motion.div
              key={i}
              className="landing-cap-card"
              style={{ '--cap-glow': cap.glow, '--cap-color': cap.color }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <div className="landing-cap-icon" style={{ color: cap.color, background: cap.glow }}>
                {cap.icon}
              </div>
              <h3 className="landing-cap-title">{cap.title}</h3>
              <p className="landing-cap-desc">{cap.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="landing-bottom-cta">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center' }}
        >
          <div className="landing-bottom-glow" />
          <h2 className="landing-bottom-title">Begin Your Investigation</h2>
          <p className="landing-bottom-desc">
            Access the Aegis Forensic Command Center and start recovering evidence.
          </p>
          <button className="landing-cta" onClick={onEnter} id="bottom-get-started-btn">
            <span className="landing-cta-icon">⬡</span>
            ENTER COMMAND CENTER
            <span className="landing-cta-arrow">→</span>
          </button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <span>🛡️ AEGIS</span>
        <span className="landing-footer-sep">·</span>
        <span>AI-Assisted Digital Evidence Recovery &amp; Reconstruction</span>
        <span className="landing-footer-sep">·</span>
        <span style={{ color: 'var(--cyan)', opacity: 0.7 }}>v2.0</span>
      </footer>
    </div>
  );
}
