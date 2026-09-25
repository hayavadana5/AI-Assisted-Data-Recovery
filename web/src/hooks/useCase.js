import { useState, useEffect, useCallback, useRef } from 'react';
import {
    listCases,
    getCaseDetail,
    startScan,
    createScanWebSocket,
} from '../services/api';

/** Hook for fetching and managing the list of cases */
export function useCases() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async() => {
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

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        cases,
        loading,
        refresh,
    };
}

/** Hook for managing a single active case */
export function useCase(caseId) {
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!caseId) {
            setCaseData(null);
            return;
        }

        let cancelled = false;

        setLoading(true);

        const fetchCase = async() => {
            try {
                const data = await getCaseDetail(caseId);

                if (!cancelled) {
                    setCaseData(data);
                }
            } catch (e) {
                if (!cancelled) {
                    console.error('Failed to load case:', e);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchCase();

        // Poll while case is in progress
        const interval = setInterval(async() => {
            try {
                const data = await getCaseDetail(caseId);

                if (cancelled) {
                    return;
                }

                setCaseData(data);

                if (
                    data?.status === 'COMPLETED' ||
                    data?.status === 'FAILED'
                ) {
                    clearInterval(interval);
                }
            } catch (e) {
                // Ignore polling errors.
            }
        }, 2000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [caseId]);

    return {
        caseData,
        loading,
    };
}

/**
 * Pipeline stages displayed in the acquisition progress UI.
 */
const PIPELINE_STEPS = [{
        step: 'EVIDENCE_INGEST',
        label: 'Evidence Registration',
    },
    {
        step: 'ENTROPY_MAPPING',
        label: 'Entropy Analysis',
    },
    {
        step: 'FILESYSTEM_ENUM',
        label: 'Filesystem Enumeration',
    },
    {
        step: 'CARVING',
        label: 'Signature Carving',
    },
    {
        step: 'FRAGMENT_RECON',
        label: 'Fragment Reconstruction',
    },
    {
        step: 'CLASSIFICATION',
        label: 'Classification & Report',
    },
];

/**
 * Hook for managing scan initiation and WebSocket progress.
 */
export function useScan() {
    const [scanning, setScanning] = useState(false);
    const [logs, setLogs] = useState([]);
    const [scanCaseId, setScanCaseId] = useState(null);
    const [progress, setProgress] = useState([]);

    const wsRef = useRef(null);
    const pollRef = useRef(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;

            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch {
                    // Ignore close errors.
                }
                wsRef.current = null;
            }

            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, []);

    const resetProgress = useCallback(() => {
        setProgress(
            PIPELINE_STEPS.map((item) => ({
                ...item,
                status: 'pending',
            }))
        );
    }, []);

    const setStep = useCallback((index) => {
        setProgress((current) =>
            current.map((item, i) => {
                if (i < index) {
                    return {
                        ...item,
                        status: 'done',
                    };
                }

                if (i === index) {
                    return {
                        ...item,
                        status: 'active',
                    };
                }

                return {
                    ...item,
                    status: 'pending',
                };
            })
        );
    }, []);

    const completeProgress = useCallback(() => {
        setProgress((current) =>
            current.map((item) => ({
                ...item,
                status: 'done',
            }))
        );
    }, []);

    const addLog = useCallback((message, type = 'info') => {
        if (!mountedRef.current) {
            return;
        }

        setLogs((current) => [
            ...current,
            {
                time: new Date().toLocaleTimeString(),
                message,
                type,
            },
        ]);
    }, []);

    /**
     * Determine which pipeline stage a backend message belongs to.
     */
    const processProgressMessage = useCallback(
        (message) => {
            if (!message) {
                return;
            }

            const text = String(message).toLowerCase();

            // Stage 1 — Evidence Registration
            if (
                text.includes('step 1/5') ||
                text.includes('registering') ||
                text.includes('evidence registration') ||
                text.includes('evidence ingest') ||
                text.includes('ingesting evidence') ||
                text.includes('acquiring evidence')
            ) {
                setStep(0);
                return;
            }

            // Stage 2 — Entropy Analysis
            if (
                text.includes('step 2/5') ||
                text.includes('entropy') ||
                text.includes('entropy analysis')
            ) {
                setStep(1);
                return;
            }

            // Stage 3 — Filesystem Enumeration
            if (
                text.includes('step 3/5') ||
                text.includes('enumerating') ||
                text.includes('enumeration') ||
                text.includes('filesystem')
            ) {
                setStep(2);
                return;
            }

            // Stage 4 — Signature Carving
            if (
                text.includes('step 4/5') ||
                text.includes('carver') ||
                text.includes('carving') ||
                text.includes('signature carving')
            ) {
                setStep(3);
                return;
            }

            // Stage 5 — Fragment Reconstruction
            if (
                text.includes('step 4b') ||
                text.includes('fragment') ||
                text.includes('reconstruction') ||
                text.includes('reconstruct')
            ) {
                setStep(4);
                return;
            }

            // Stage 6 — Classification and Report
            if (
                text.includes('step 5/5') ||
                text.includes('classification') ||
                text.includes('classifying') ||
                text.includes('report') ||
                text.includes('timeline')
            ) {
                setStep(5);
            }
        }, [setStep]
    );

    /**
     * Stop polling and close the WebSocket after completion.
     */
    const finishScan = useCallback(
        (status = 'COMPLETED') => {
            if (!mountedRef.current) {
                return;
            }

            setScanning(false);

            if (status === 'COMPLETED') {
                completeProgress();
            }

            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }

            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch {
                    // Ignore close errors.
                }

                wsRef.current = null;
            }
        }, [completeProgress]
    );

    /**
     * Poll the case API as a fallback.
     *
     * This is important because WebSocket events can be missed or
     * closed by the hosting platform.
     */
    const checkCaseStatus = useCallback(
        (caseId) => {
            if (!caseId) {
                return;
            }

            if (pollRef.current) {
                clearInterval(pollRef.current);
            }

            pollRef.current = setInterval(async() => {
                try {
                    const data = await getCaseDetail(caseId);

                    if (!mountedRef.current || !data) {
                        return;
                    }

                    const status = String(data.status || '').toUpperCase();

                    if (status === 'COMPLETED') {
                        addLog('Scan completed successfully.', 'success');
                        finishScan('COMPLETED');
                        return;
                    }

                    if (status === 'FAILED') {
                        addLog('Scan failed.', 'error');
                        finishScan('FAILED');
                    }
                } catch (error) {
                    // Keep polling. Temporary API failures should not
                    // terminate the acquisition UI.
                    console.warn('Case status polling failed:', error);
                }
            }, 2500);
        }, [addLog, finishScan]
    );

    const inititateScan = useCallback(
        async(opts = {}) => {
            setScanning(true);
            setLogs([]);
            setScanCaseId(null);
            resetProgress();

            // Clean up any previous scan connection.
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch {
                    // Ignore close errors.
                }

                wsRef.current = null;
            }

            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }

            try {
                addLog('Starting evidence acquisition...', 'info');

                const result = await startScan(opts);

                if (!result ?.case_id) {
                    addLog('Backend did not return a case ID.', 'error');
                    setScanning(false);
                    return null;
                }

                const caseId = result.case_id;

                setScanCaseId(caseId);

                addLog(`Case created: ${caseId}`, 'success');
                addLog('Connecting to acquisition stream...', 'info');

                // Start API polling immediately as a fallback.
                checkCaseStatus(caseId);

                // Connect WebSocket for real-time progress.
                const ws = createScanWebSocket(caseId);

                wsRef.current = ws;

                ws.onopen = () => {
                    addLog('STREAM CONNECTED', 'success');
                };

                ws.onmessage = (event) => {
                    try {
                        const msg = JSON.parse(event.data);

                        if (msg.message) {
                            addLog(
                                msg.message,
                                msg.type || 'info'
                            );

                            processProgressMessage(msg.message);
                        }

                        /*
                         * Backend may use different names for completion.
                         */
                        const messageType = String(
                            msg.type || ''
                        ).toLowerCase();

                        const messageText = String(
                            msg.message || ''
                        ).toLowerCase();

                        if (
                            messageType === 'complete' ||
                            messageType === 'completed' ||
                            messageType === 'success' ||
                            messageText.includes('scan completed') ||
                            messageText.includes('completed successfully') ||
                            messageText.includes('acquisition completed')
                        ) {
                            finishScan('COMPLETED');
                        }

                        if (
                            messageType === 'error' ||
                            messageType === 'failed' ||
                            messageText.includes('scan failed') ||
                            messageText.includes('acquisition failed')
                        ) {
                            finishScan('FAILED');
                        }
                    } catch (error) {
                        console.error(
                            'Failed to process WebSocket message:',
                            error
                        );
                    }
                };

                /*
                 * Do NOT stop the scan when WebSocket closes.
                 *
                 * The API polling continues independently and can detect
                 * completion even if Render closes the WebSocket.
                 */
                ws.onerror = () => {
                    addLog(
                        'Live stream connection interrupted. Continuing through API status updates...',
                        'warning'
                    );
                };

                ws.onclose = () => {
                    addLog(
                        'Live stream closed. Acquisition continues in background.',
                        'warning'
                    );
                };

                return caseId;
            } catch (error) {
                console.error('Scan failed:', error);

                addLog(
                    error ?.message || 'Failed to start acquisition.',
                    'error'
                );

                setScanning(false);

                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }

                if (wsRef.current) {
                    try {
                        wsRef.current.close();
                    } catch {
                        // Ignore close errors.
                    }

                    wsRef.current = null;
                }

                return null;
            }
        }, [
            addLog,
            checkCaseStatus,
            finishScan,
            processProgressMessage,
            resetProgress,
        ]
    );

    return {
        scanning,
        logs,
        scanCaseId,
        progress,
        inititateScan,
    };
}

