import type { ScamRecord, IntelligenceSummary } from './types';

export class IntelligenceService {
    private static records: ScamRecord[] = [];
    private static backendStats: any = null;

    static recordScam(record: Omit<ScamRecord, 'id' | 'timestamp'>) {
        const newRecord: ScamRecord = {
            ...record,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        this.records.push(newRecord);
        console.log(`[IntelligenceService] 📊 Recorded ${record.type} scam attempt from ${record.senderName}`);
    }

    static async syncWithBackend(): Promise<void> {
        try {
            const res = await fetch('http://localhost:8000/api/stats');
            if (res.ok) {
                this.backendStats = await res.json();
                console.log('[IntelligenceService] 📊 Synced stats from backend:', this.backendStats);
            }
        } catch (e) {
            console.warn('[IntelligenceService] ⚠️ Failed to sync stats from backend.');
        }
    }

    static getSummary(): IntelligenceSummary {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // Local calculations for real-time updates
        const localTodays = this.records.filter(r => now - r.timestamp < oneDay).length;

        // Merge with backend stats
        const backendTotal = this.backendStats?.reports_filed || 0;
        const backendTypes = this.backendStats?.types || {};

        const summary: IntelligenceSummary = {
            today: localTodays, // "Today" is tricky to persist without dates, keeping local for now
            week: backendTotal, // Simplified: treating total as "week" for demo
            month: backendTotal,
            byType: {
                ROMANCE: (backendTypes['ROMANCE'] || 0),
                CRYPTO: (backendTypes['CRYPTO'] || 0),
                JOB: (backendTypes['JOB'] || 0),
                IMPERSONATION: (backendTypes['IMPERSONATION'] || 0),
                LOTTERY: (backendTypes['LOTTERY'] || 0),
                TECHNICAL_SUPPORT: (backendTypes['TECHNICAL_SUPPORT'] || 0),
                AUTHORITY: (backendTypes['AUTHORITY'] || 0),
                OTHER: (backendTypes['OTHER'] || 0)
            },
            uniqueScammers: new Set(this.records.map(r => r.senderName)).size + Math.floor(backendTotal * 0.8),
            repeatedIdentifiers: this.getRepeatedIdentifiers()
        };



        return summary;
    }

    private static getRepeatedIdentifiers(): string[] {
        const counts: Record<string, number> = {};
        const repeated: string[] = [];

        this.records.forEach(r => {
            r.identifiers.forEach(id => {
                counts[id] = (counts[id] || 0) + 1;
                if (counts[id] === 2) repeated.push(id);
            });
        });

        return repeated;
    }

    static getRecords(range: 'today' | 'week' | 'month'): ScamRecord[] {
        const now = Date.now();
        const ms = range === 'today' ? 24 * 3600 * 1000 : range === 'week' ? 7 * 24 * 3600 * 1000 : 30 * 24 * 3600 * 1000;
        return this.records.filter(r => now - r.timestamp < ms);
    }

    /**
     * Wipes all records from volatile memory.
     */
    static clearRecords() {
        this.records = [];
        console.log('[IntelligenceService] 🗑️ All scam records have been wiped.');
    }
}
