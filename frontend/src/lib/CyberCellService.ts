import { PDFGenerator } from './PDFGenerator';
import { EgressFilter } from './EgressFilter';
import { IntelligenceService } from './IntelligenceService';
import { MediaLogService } from './MediaLogService';
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

            // SECURITY ENFORCEMENT: Egress Inspection
            const { isSafe, violations } = EgressFilter.inspect(evidenceJson);
            if (!isSafe) {
                console.error(`%c[EgressShield] 🚫 BLOCKING TRANSMISSION: ${violations.join(', ')}`, 'color: #ef4444; font-weight: bold;');
                return false;
            }

            const jsonSize = new TextEncoder().encode(JSON.stringify(evidenceJson)).length;
            console.log(`%c[CyberCellService] 📄 Forensic JSON Payload generated (${(jsonSize / 1024).toFixed(2)} KB)`, 'color: #3b82f6; font-style: italic;');

            // 2. Generate PDF Evidence
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
            console.log(`%c[CyberCellService] 🛡️ Forensic PDF Attachment generated (${(pdfBlob.size / 1024).toFixed(2)} KB)`, 'color: #3b82f6; font-style: italic;');

            // 3. Simulate API Transmission
            console.log(`[CyberCellService] ⬆️ Uploading to forensic gateway: ${this.MOCK_ENDPOINT}...`);

            // Artificial delay to simulate network
            await new Promise(resolve => setTimeout(resolve, 1500));

            console.log('%c[CyberCellService] ✅ TRANSMISSION SUCCESS: Forensic Bundle (PDF + JSON) delivered.', 'color: #22c55e; font-weight: bold; border: 1px solid #22c55e; padding: 2px 5px;');
            return true;
        } catch (error) {
            console.error('[CyberCellService] ❌ Failed to auto-report:', error);
            return false;
        }
    }

    /**
     * Instantly wipes all volatile intelligence data from the current session.
     */
    static clearSession() {
        console.warn('[CyberCellService] ⚠️ INITIATING DATA WIPE PROTOCOL...');
        IntelligenceService.clearRecords();
        MediaLogService.clearLogs();
        console.log('[CyberCellService] ✅ ALL VOLATILE DATA SHREDDED.');
    }
}
