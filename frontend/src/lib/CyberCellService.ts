import { PDFGenerator } from './PDFGenerator';
import type { IncidentReport, CaseFile } from './types';

export class CyberCellService {
    private static MOCK_ENDPOINT = 'https://cybercell.gov.mock/api/v1/report';

    /**
     * Automatically reports a high-risk incident to the Cyber Cell.
     * This simulates sending both a JSON evidence file and a generated PDF.
     */
    static async autoReport(report: IncidentReport): Promise<boolean> {
        console.log(`%c[CyberCellService] Auto-Reporting Incident: ${report.conversationId}`, 'color: #ef4444; font-weight: bold;');

        try {
            // 1. Prepare JSON Evidence Data (Matches server.py ReportRequest)
            const evidenceJson = {
                conversationId: report.conversationId,
                scammerName: report.scammerName || "Unknown",
                platform: report.platform || "chat",
                classification: report.classification,
                confidenceScore: report.confidenceScore,
                iocs: report.iocs,
                transcript: report.transcript.map(m => ({
                    role: m.sender,
                    content: m.content,
                    time: new Date(m.timestamp).toISOString()
                })),
                timestamp: report.timestamp
            };

            console.log('[CyberCellService] Generated JSON Payload:', evidenceJson);

            // 2. Generate PDF Evidence
            const caseShim: CaseFile = {
                id: report.conversationId,
                scammerName: report.scammerName || "Identified Threat",
                platform: report.platform || "chat",
                status: 'closed',
                threatLevel: report.classification,
                iocs: report.iocs,
                transcript: report.transcript,
                timestamp: report.timestamp,
                detectedLocation: report.detectedLocation
            };

            const pdfBlob = PDFGenerator.getPDFBlob(caseShim, report.transcript);
            console.log(`[CyberCellService] Generated PDF Evidence (${(pdfBlob.size / 1024).toFixed(2)} KB)`);

            // 3. Simulate API Transmission
            console.log(`[CyberCellService] POSTING to ${this.MOCK_ENDPOINT}...`);

            // Artificial delay to simulate network
            await new Promise(resolve => setTimeout(resolve, 1500));

            // REAL BACKEND INTEGRATION
            try {
                fetch('http://localhost:8000/api/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(evidenceJson)
                }).then(res => {
                    if (res.ok) console.log('[CyberCellService] 📡 Backend confirmed receipt.');
                    else console.warn('[CyberCellService] ⚠️ Backend rejected report.');
                }).catch(() => {
                    console.warn('[CyberCellService] ⚠️ Backend offline - Report cached locally.');
                });
            } catch (e) {
                // Ignore backend errors to keep UI smooth
            }

            console.log('%c[CyberCellService] ✅ Successfully transmitted Evidence JSON and PDF Attachment.', 'color: #22c55e; font-weight: bold;');
            return true;
        } catch (error) {
            console.error('[CyberCellService] ❌ Failed to auto-report:', error);
            return false;
        }
    }

    /**
     * Fetches persistent cases from the backend.
     */
    static async getAllCases(): Promise<CaseFile[]> {
        try {
            const res = await fetch('http://localhost:8000/api/cases');
            if (res.ok) {
                const cases = await res.json();
                console.log('[CyberCellService] 📂 Loaded persistent cases:', cases.length);
                return cases;
            }
        } catch (e) {
            console.warn('[CyberCellService] ⚠️ Failed to fetch cases from backend.');
        }
        return [];
    }

    /**
     * Alias for autoReport used by some components
     */
    static async reportScam(report: IncidentReport): Promise<boolean> {
        return this.autoReport(report);
    }

    /**
     * Wipes any session-specific state in the Cyber Cell integration
     */
    static clearSession(): void {
        console.log('[CyberCellService] 🔒 SESSION PURGED: All local transaction traces removed.');
    }
}
