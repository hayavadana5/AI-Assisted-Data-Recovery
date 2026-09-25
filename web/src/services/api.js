/**
 * api.js — Forensic Command Center API Client
 * 
 * Centralized API service layer. All backend communication goes through here.
 * Never exposes API keys or raw evidence data to the browser.
 */

const API_BASE = '/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API Error ${res.status}`);
  }
  return res.json();
}

/** List all forensic cases */
export async function listCases() {
  const data = await fetchJSON(`${API_BASE}/cases`);
  return data.cases || [];
}

/** Get full case manifest by ID */
export async function getCaseDetail(caseId) {
  return fetchJSON(`${API_BASE}/cases/${caseId}`);
}

/** Get recovered files with optional filters */
export async function getRecoveredFiles(caseId, { priority, category, search } = {}) {
  const params = new URLSearchParams();
  if (priority) params.set('priority', priority);
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  const qs = params.toString();
  return fetchJSON(`${API_BASE}/files/${caseId}${qs ? '?' + qs : ''}`);
}

/** Get hex preview for a file */
export async function getHexPreview(caseId, fileId, offset = 0, length = 512) {
  return fetchJSON(`${API_BASE}/hex/${caseId}/${fileId}?offset=${offset}&length=${length}`);
}

/** Get AI Investigator Decision Support Analysis */
export async function getAIAnalysis(caseId) {
  return fetchJSON(`${API_BASE}/ai/analysis/${caseId}`);
}

/** Start a new forensic scan */
export async function startScan({ imagePath = 'test-stick.img', caseName, examiner } = {}) {
  return fetchJSON(`${API_BASE}/scan`, {
    method: 'POST',
    body: JSON.stringify({
      image_path: imagePath,
      case_name: caseName || `Investigation Case #${Math.floor(Math.random() * 9000) + 1000}`,
      examiner: examiner || 'Lead Digital Forensics Examiner',
    }),
  });
}

/** Get PDF report download URL */
export function getPDFReportURL(caseId) {
  return `${API_BASE}/report/${caseId}/pdf`;
}

/** Health check */
export async function healthCheck() {
  return fetchJSON(`${API_BASE}/health`);
}

/** Create WebSocket connection for scan progress */
export function createScanWebSocket(caseId) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${protocol}//${window.location.host}/ws/scan/${caseId}`);
}
