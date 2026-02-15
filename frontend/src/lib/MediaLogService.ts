import type { ForensicLog } from './types';

export class MediaLogService {
    private static logs: ForensicLog[] = [];
    private static listeners: ((logs: ForensicLog[]) => void)[] = [];

    public static addLog(log: ForensicLog) {
        this.logs = [log, ...this.logs].slice(0, 100); // Keep last 100 logs
        this.notify();
    }

    public static getLogs(): ForensicLog[] {
        return this.logs;
    }

    public static subscribe(listener: (logs: ForensicLog[]) => void) {
        this.listeners.push(listener);
        listener(this.logs);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private static notify() {
        this.listeners.forEach(l => l(this.logs));
    }

    /**
     * Wipes all logs from volatile memory.
     */
    public static clearLogs() {
        this.logs = [];
        this.notify();
        console.log('[MediaLogService] 🗑️ All forensic logs have been wiped.');
    }
}
