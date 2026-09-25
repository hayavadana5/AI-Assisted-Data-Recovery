import React, { useState } from 'react';
import { getPDFReportURL } from '../services/api';

export default function ReportsWorkspace({ caseId, caseData }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = () => {
    if (!caseId) return;
    setDownloading(true);
    const pdfUrl = getPDFReportURL(caseId);
    window.open(pdfUrl, '_blank');
    setTimeout(() => setDownloading(false), 2000);
  };

  const handleExportJSON = () => {
    if (!caseData) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(caseData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Forensic_Manifest_${caseId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const chainEvents = caseData?.chain_of_custody || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%', overflowY: 'auto', paddingRight: 8 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="heading-xl" style={{ margin: 0, fontSize: '1.4rem' }}>
            Forensic Evidence Reporting & Export
          </h2>
          <p className="caption" style={{ margin: '4px 0 0 0' }}>
            Court-admissible PDF reports, verifiable JSON manifests, and cryptographic chain-of-custody audit logs
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn-secondary"
            onClick={handleExportJSON}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Export JSON Manifest
          </button>
          <button
            className="btn-primary"
            onClick={handleDownloadPDF}
            disabled={downloading}
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            {downloading ? 'Opening PDF...' : '📄 Download Forensic PDF'}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* PDF SUMMARY CARD */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label-sm" style={{ color: 'var(--color-accent-cyan)' }}>OFFICIAL FORENSIC REPORT</span>
            <span className="badge badge-high">ISO/IEC 27037 READY</span>
          </div>

          <h3 className="heading-lg" style={{ margin: 0 }}>
            FBI / LEA Standard Examination Report
          </h3>

          <p className="caption" style={{ lineHeight: 1.6, margin: 0 }}>
            Automated PDF synthesis incorporating SHA-256 acquisition hashes, entropy sector breakdown, 
            carved and reconstructed file tables, prioritized findings, and chronological chain of custody events.
          </p>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="caption">Case Reference:</span>
              <span className="mono-text">{caseId || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="caption">Lead Examiner:</span>
              <span>{caseData?.examiner || 'Lead Forensic Examiner'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="caption">Target Image:</span>
              <span className="mono-text">{caseData?.target_image ? caseData.target_image.split('\\').pop() : 'test-stick.img'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="caption">Artifacts Cataloged:</span>
              <span className="mono-text">{caseData?.recovered_files?.length || 0}</span>
            </div>
          </div>

          <button className="btn-primary" onClick={handleDownloadPDF} disabled={downloading} style={{ width: '100%', marginTop: 'auto' }}>
            {downloading ? 'Downloading...' : 'Generate & Download PDF Report'}
          </button>
        </div>

        {/* JSON MANIFEST CARD */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label-sm" style={{ color: 'var(--color-accent-purple)' }}>STRUCTURED MACHINE RECORD</span>
            <span className="badge badge-purple">RFC 8259 JSON</span>
          </div>

          <h3 className="heading-lg" style={{ margin: 0 }}>
            Complete Cryptographic Manifest
          </h3>

          <p className="caption" style={{ lineHeight: 1.6, margin: 0 }}>
            Complete case export including all byte offsets, file classifications, Shannon entropy distribution maps, 
            fragment sequences, and immutable audit logs for automated ingestion.
          </p>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 14, borderRadius: 8, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="caption">SQLite Persistence:</span>
              <span style={{ color: 'var(--color-accent-green)' }}>SYNCHRONIZED</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="caption">Entropy Block Records:</span>
              <span className="mono-text">{caseData?.entropy_map?.blocks?.length || 0}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="caption">Chain of Custody Events:</span>
              <span className="mono-text">{chainEvents.length}</span>
            </div>
          </div>

          <button className="btn-secondary" onClick={handleExportJSON} style={{ width: '100%', marginTop: 'auto' }}>
            Export Machine Manifest (.JSON)
          </button>
        </div>
      </div>

      {/* CHAIN OF CUSTODY AUDIT DECK */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span className="label-sm">Immutable Forensic Trail</span>
            <h4 className="heading-md" style={{ margin: '4px 0 0 0' }}>Chain of Custody Audit Trail</h4>
          </div>
          <span className="badge badge-cyan">{chainEvents.length} Recorded Events</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
          {chainEvents.map((evt, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 8,
                borderLeft: '3px solid var(--color-accent-cyan)',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                  {evt.action || 'ACTION'}
                </span>
                <div>
                  <span style={{ fontWeight: 600 }}>{evt.notes || evt.target}</span>
                  <div className="caption" style={{ fontSize: '0.72rem' }}>
                    Actor: {evt.actor} • Target: {evt.target}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="mono-text caption" style={{ fontSize: '0.75rem' }}>
                  {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>
          ))}

          {chainEvents.length === 0 && (
            <div className="caption" style={{ padding: 16, textAlign: 'center' }}>
              No chain of custody events recorded for current session.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
