import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAIAnalysis } from '../services/api';

export default function InvestigatorWorkspace({ caseId, caseData }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAIAnalysis(caseId);
      setAnalysis(data);
    } catch (err) {
      console.error('Failed to load AI analysis:', err);
      setError(err.message || 'Failed to retrieve AI investigator analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [caseId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', overflowY: 'auto', paddingRight: 8 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="heading-xl" style={{ margin: 0, fontSize: '1.4rem' }}>
              What Can Realistically Be Recovered?
            </h2>
            <span className="badge badge-purple">
              {analysis?.ai_source?.includes('GEMINI') ? 'Gemini 2.5 Flash' : 'Forensic Heuristic AI'}
            </span>
          </div>
          <p className="caption" style={{ margin: '4px 0 0 0' }}>
            AI-generated investigator guidance — distinguishing deterministic forensic facts from AI interpretation
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa', fontSize: '0.68rem' }}>
            AI-GENERATED INVESTIGATOR GUIDANCE
          </span>
          <button
            className="btn-secondary"
            onClick={fetchAnalysis}
            disabled={loading}
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            {loading ? 'Synthesizing Briefing...' : '↻ Refresh Briefing'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚡</div>
          <h3 className="heading-md">Synthesizing Investigative Briefing...</h3>
          <p className="caption">Extracting multi-vector metadata and evaluating priority signals.</p>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', borderColor: 'rgba(255, 68, 68, 0.4)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
          <h3 className="heading-md" style={{ color: 'var(--color-accent-red)' }}>Analysis Unavailable</h3>
          <p className="caption" style={{ marginBottom: 16 }}>{error}</p>
          <button className="btn-secondary" onClick={fetchAnalysis}>Try Again</button>
        </div>
      ) : analysis ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Dossier Header */}
          <div
            className="glass-card"
            style={{
              padding: 24,
              borderLeft: '4px solid var(--color-accent-purple)',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(20, 24, 38, 0.6) 100%)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="label-sm" style={{ color: 'var(--color-accent-purple)' }}>INVESTIGATOR BRIEFING DOSSIER</span>
              <span className="mono-text caption" style={{ color: 'var(--color-text-secondary)' }}>
                CASE ID: {caseId}
              </span>
            </div>

            <h3 className="heading-md" style={{ marginBottom: 8, color: 'var(--color-text-primary)' }}>
              Executive Summary
            </h3>
            <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.9)' }}>
              {analysis.executive_summary}
            </p>

            <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="badge badge-high">DETERMINISTIC FACT</span>
              <span className="caption" style={{ fontSize: '0.78rem' }}>
                All cited offsets and SHA-256 hashes are mathematically verified against raw storage media.
              </span>
            </div>
          </div>

          {/* Two-Column Findings & Priorities */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {/* IMPORTANT FINDINGS */}
            <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="heading-md" style={{ fontSize: '1rem', color: 'var(--color-accent-amber)' }}>
                  Important Findings
                </span>
                <span className="badge badge-high">
                  {analysis.important_findings?.length || 0} Critical
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analysis.important_findings?.map((finding, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(255, 170, 0, 0.05)',
                      borderRadius: 8,
                      borderLeft: '3px solid var(--color-accent-amber)',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="label-sm" style={{ color: 'var(--color-accent-amber)', fontSize: '0.65rem' }}>
                        FINDING #{idx + 1}
                      </span>
                      <span className="badge badge-high" style={{ fontSize: '0.65rem' }}>
                        CONFIRMED ARTIFACT
                      </span>
                    </div>
                    {finding}
                  </div>
                ))}
              </div>
            </div>

            {/* INVESTIGATION PRIORITIES */}
            <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="heading-md" style={{ fontSize: '1rem', color: 'var(--color-accent-cyan)' }}>
                  Recommended Target Priorities
                </span>
                <span className="badge badge-cyan">
                  {analysis.investigation_priorities?.length || 0} Recommended
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {analysis.investigation_priorities?.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 14,
                      background: 'rgba(0, 240, 255, 0.04)',
                      borderRadius: 8,
                      border: '1px solid rgba(0, 240, 255, 0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'var(--color-accent-cyan)',
                            color: '#000',
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span className="mono-text" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          {item.artifact_id || `Priority Target #${idx + 1}`}
                        </span>
                      </div>
                      <span className="badge badge-medium">AI INTERPRETATION</span>
                    </div>
                    <p style={{ margin: '4px 0 6px 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      {item.reason}
                    </p>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-accent-cyan)', fontWeight: 600 }}>
                      → {item.recommended_focus}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* NEXT ACTIONS & LIMITATIONS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* RECOMMENDED NEXT ACTIONS */}
            <div className="glass-card" style={{ padding: 20 }}>
              <span className="heading-md" style={{ fontSize: '1rem', color: 'var(--color-accent-green)', display: 'block', marginBottom: 14 }}>
                Recommended Investigative Actions
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.recommended_next_actions?.map((action, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 6,
                      fontSize: '0.82rem',
                    }}
                  >
                    <span style={{ color: 'var(--color-accent-green)', fontWeight: 700 }}>✓</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* LIMITATIONS & LEGAL NOTICE */}
            <div className="glass-card" style={{ padding: 20 }}>
              <span className="heading-md" style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: 14 }}>
                Forensic Scope & Limitations
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.limitations?.map((limit, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <span>ℹ</span>
                    <span>{limit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <p className="caption">Select or open a valid forensic case to generate decision support analysis.</p>
        </div>
      )}
    </div>
  );
}
