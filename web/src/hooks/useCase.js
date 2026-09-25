import { useState, useEffect, useCallback, useRef } from 'react';
import { listCases, getCaseDetail, startScan, createScanWebSocket } from '../services/api';

/** Hook for fetching and managing the list of cases */
export function useCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCases();
      setCases(data);
    } catch (e) {
      console.error('Failed to load cases:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { cases, loading, refresh };
}

/** Hook for managing a single active case */
export function useCase(caseId) {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!caseId) { setCaseData(null); return; }
    setLoading(true);
    const fetchCase = async () => {
      try {
        const data = await getCaseDetail(caseId);
        setCaseData(data);
      } catch (e) {
        console.error('Failed to load case:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCase();

    // Poll while case is in progress
    const interval = setInterval(async () => {
      try {
        const data = await getCaseDetail(caseId);
        setCaseData(data);
        if (data.status === 'COMPLETED') clearInterval(interval);
      } catch { /* ignore */ }
    }, 2000);

    return () => clearInterval(interval);
  }, [caseId]);

  return { caseData, loading };
}

/** Hook for managing scan initiation and WebSocket progress */
export function useScan() {
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [scanCaseId, setScanCaseId] = useState(null);
  const [progress, setProgress] = useState([]);
  const wsRef = useRef(null);

  const inititateScan = useCallback(async (opts = {}) => {
    setScanning(true);
    setLogs([]);
    setProgress([
      { step: 'EVIDENCE_INGEST', label: 'Evidence Registration', status: 'pending' },
      { step: 'ENTROPY_MAPPING', label: 'Entropy Analysis', status: 'pending' },
      { step: 'FILESYSTEM_ENUM', label: 'Filesystem Enumeration', status: 'pending' },
      { step: 'CARVING', label: 'Signature Carving', status: 'pending' },
      { step: 'FRAGMENT_RECON', label: 'Fragment Reconstruction', status: 'pending' },
      { step: 'CLASSIFICATION', label: 'Classification & Report', status: 'pending' },
    ]);
    try {
      const result = await startScan(opts);
      if (result.case_id) {
        setScanCaseId(result.case_id);
        // Connect WebSocket
        const ws = createScanWebSocket(result.case_id);
        wsRef.current = ws;
        let stepIndex = 0;
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.message) {
            setLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: msg.message,
              type: msg.type,
            }]);
            // Update progress stages based on message content
            if (msg.message.includes('Step 1/5') || msg.message.includes('Registering')) {
              setProgress(p => p.map((s, i) => i === 0 ? { ...s, status: 'active' } : s));
              stepIndex = 0;
            } else if (msg.message.includes('Step 2/5') || msg.message.includes('entropy')) {
              setProgress(p => p.map((s, i) => i === 0 ? { ...s, status: 'done' } : i === 1 ? { ...s, status: 'active' } : s));
              stepIndex = 1;
            } else if (msg.message.includes('Step 3/5') || msg.message.includes('Enumerating')) {
              setProgress(p => p.map((s, i) => i <= 1 ? { ...s, status: 'done' } : i === 2 ? { ...s, status: 'active' } : s));
              stepIndex = 2;
            } else if (msg.message.includes('Step 4/5') || msg.message.includes('Carver')) {
              setProgress(p => p.map((s, i) => i <= 2 ? { ...s, status: 'done' } : i === 3 ? { ...s, status: 'active' } : s));
              stepIndex = 3;
            } else if (msg.message.includes('Step 4b') || msg.message.includes('Fragment')) {
              setProgress(p => p.map((s, i) => i <= 3 ? { ...s, status: 'done' } : i === 4 ? { ...s, status: 'active' } : s));
              stepIndex = 4;
            } else if (msg.message.includes('Step 5/5') || msg.message.includes('Timeline')) {
              setProgress(p => p.map((s, i) => i <= 4 ? { ...s, status: 'done' } : i === 5 ? { ...s, status: 'active' } : s));
              stepIndex = 5;
            }
          }
          if (msg.type === 'complete') {
            setScanning(false);
            setProgress(p => p.map(s => ({ ...s, status: 'done' })));
          }
        };
        ws.onerror = () => setScanning(false);
        ws.onclose = () => setScanning(false);
        return result.case_id;
      }
    } catch (e) {
      console.error('Scan failed:', e);
      setScanning(false);
    }
    return null;
  }, []);

  return { scanning, logs, scanCaseId, progress, inititateScan };
}
