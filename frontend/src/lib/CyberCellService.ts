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
            // 1. Prepare JSON Evidence Data
            const evidenceJson = {
                metadata: {
                    id: report.conversationId,
                    timestamp: report.timestamp,
                    threatLevel: report.classification,
                    confidenceScore: report.confidenceScore
                },
                iocs: report.iocs,
                transcript: report.transcript.map(m => ({
                    role: m.sender,
                    content: m.content,
                    time: new Date(m.timestamp).toISOString()
                }))
            };

            console.log('[CyberCellService] Generated JSON Payload:', evidenceJson);

            // 2. Generate PDF Evidence (using existing logic)
            // We convert the IncidentReport to a CaseFile shim for the generator
            const caseShim: CaseFile = {
                id: report.conversationId,
                scammerName: "Identified Threat",
                platform: report.transcript[0]?.source || 'chat',
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

            console.log('%c[CyberCellService] ✅ Successfully transmitted Evidence JSON and PDF Attachment.', 'color: #22c55e; font-weight: bold;');
            return true;
        } catch (error) {
            console.error('[CyberCellService] ❌ Failed to auto-report:', error);
            return false;
        }
    }
}
