export class Anonymizer {
    private static salt = Math.random().toString(36).substring(2, 15);

    /**
     * Creates a deterministic but opaque hash for an ID.
     * This allows us to track returning scammers without knowing their real identity or 
     * linking them directly to a victim's personal thread ID.
     */
    public static anonymize(id: string): string {
        // Simple hash simulation for the demo
        let hash = 0;
        const input = id + this.salt;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `ANON-${Math.abs(hash).toString(16).toUpperCase()}`;
    }

    /**
     * Redacts PII from filenames or metadata.
     */
    public static sanitizeFilename(filename: string): string {
        return filename.replace(/[a-zA-Z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g, '[REDACTED_EMAIL]')
            .replace(/\d{10,}/g, '[REDACTED_NUMBER]');
    }
}
