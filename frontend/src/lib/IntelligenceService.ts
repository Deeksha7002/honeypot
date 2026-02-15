import type { ScamRecord, IntelligenceSummary } from './types';

export class IntelligenceService {
    private static records: ScamRecord[] = [];

    static recordScam(record: Omit<ScamRecord, 'id' | 'timestamp'>) {
        const newRecord: ScamRecord = {
            ...record,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now()
        };
        this.records.push(newRecord);
        console.log(`[IntelligenceService] 📊 Recorded ${record.type} scam attempt from ${record.senderName}`);
    }

    static getSummary(): IntelligenceSummary {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        const oneMonth = 30 * oneDay;

        const summary: IntelligenceSummary = {
            today: this.records.filter(r => now - r.timestamp < oneDay).length,
            week: this.records.filter(r => now - r.timestamp < oneWeek).length,
            month: this.records.filter(r => now - r.timestamp < oneMonth).length,
            byType: {
                ROMANCE: 0, CRYPTO: 0, JOB: 0, IMPERSONATION: 0,
                LOTTERY: 0, TECHNICAL_SUPPORT: 0, AUTHORITY: 0, OTHER: 0
            },
            uniqueScammers: new Set(this.records.map(r => r.senderName)).size,
            repeatedIdentifiers: this.getRepeatedIdentifiers()
        };

        this.records.forEach(r => {
            summary.byType[r.type]++;
        });

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
