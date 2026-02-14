export interface Message {
    id: string;
    sender: 'scammer' | 'agent' | 'system';
    senderName?: string; // e.g. "Mom", "Bank of America"
    source?: 'sms' | 'email' | 'chat';
    content: string;
    timestamp: number;
    isRedacted?: boolean;
}

export type Classification = 'scam' | 'likely_scam' | 'benign';

export interface Scenario {
    id: string;
    type: Classification;
    source: 'sms' | 'email' | 'chat';
    senderName: string;
    relationalContext?: 'family' | 'work' | 'friend';
    location?: string; // e.g. "Nigeria", "Russia", "Unknown"
    messages: string[];
}

export interface IOCs {
    urls: string[];
    domains: string[];
    paymentMethods: string[];
    sensitiveDataRedacted: number;
}

export interface FinancialIntel {
    method: 'UPI' | 'IBAN' | 'ACH' | 'CRYPTO';
    identifier: string;
    institution?: string;
    flagged?: boolean;
}

export interface GeoLocation {
    country: string;
    city: string;
    ip: string;
    lat: number;
    lng: number;
    isp: string;
    connectionType?: 'VPN' | 'Residential' | 'Cellular' | 'Hosting';
    financials?: FinancialIntel;
}

export interface IncidentReport {
    conversationId: string;
    classification: Classification;
    confidenceScore: number; // 0-1
    iocs: IOCs;
    transcript: Message[];
    timestamp: string;
    detectedLocation?: GeoLocation; // New field
}

export interface Thread {
    id: string;
    scenarioId: string;
    senderName: string;
    source: 'sms' | 'email' | 'chat';
    messages: Message[];
    classification: Classification | null;
    isIntercepted: boolean;
    isArchived: boolean;
    autoReported?: boolean;
    isScanning: boolean;
    persona?: string;
    avatar?: string;
    location?: string;
    detectedLocation?: GeoLocation;
    intent?: string;
    threatScore?: number;
    isCompromised?: boolean;
}

export interface CaseFile {
    id: string;
    scammerName: string;
    platform: string;
    status: 'active' | 'closed';
    threatLevel: Classification;
    iocs: IOCs;
    transcript: Message[];
    timestamp: string;
    detectedLocation?: GeoLocation;
    autoReported?: boolean; // Added this field
}

