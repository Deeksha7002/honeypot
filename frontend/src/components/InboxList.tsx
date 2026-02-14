import React from 'react';
import type { Classification } from '../lib/types';
import { ArrowLeft, Activity } from 'lucide-react';

interface ThreadSummary {
    id: string;
    senderName: string;
    source: 'sms' | 'email' | 'chat';
    lastMessage: string;
    classification: Classification | null; // null = scanning
    isIntercepted: boolean;
    persona?: string;
    isCompromised?: boolean;
    autoReported?: boolean;
    isBlocked?: boolean;
}

interface InboxListProps {
    threads: ThreadSummary[];
    selectedThreadId: string | null;
    onSelectThread: (id: string) => void;
    onBack?: () => void;
}

export const InboxList: React.FC<InboxListProps> = ({ threads, selectedThreadId, onSelectThread, onBack }) => {
    const getStatusClass = (classification: Classification | null) => {
        if (classification === 'scam' || classification === 'likely_scam') return 'status-scam';
        if (classification === 'benign') return 'status-safe';
        return '';
    };

    const getPersonaBadge = (persona?: string) => {
        switch (persona) {
            case 'INVESTOR': return '📈 INVESTOR';
            case 'CITIZEN': return '⚖ CITIZEN';
            case 'ELDERLY': return '👴 ELDERLY';
            case 'SKEPTICAL': return '🤨 SKEPTICAL';
            default: return null;
        }
    };

    return (
        <div className="inbox-container">
            {/* Header */}
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {onBack && (
                        <button onClick={onBack} className="nav-back-btn" title="Back to Dashboard">
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    Messages
                </div>
            </div>

            <div className="thread-list">
                {/* Dashboard Link */}
                <div
                    onClick={() => onSelectThread('DASHBOARD_VIEW')}
                    className={`thread-item ${selectedThreadId === null ? 'selected' : ''}`}
                    style={{ borderBottom: '1px solid #334155', marginBottom: '10px', paddingBottom: '10px' }}
                >
                    <div className="avatar" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6' }}>
                        <Activity size={18} />
                    </div>
                    <div className="thread-content">
                        <div className="thread-top">
                            <div className="sender-name" style={{ color: '#60a5fa' }}>
                                SYSTEM DASHBOARD
                            </div>
                        </div>
                        <div className="thread-preview" style={{ color: '#94a3b8' }}>
                            View Global Threat Map
                        </div>
                    </div>
                </div>

                {threads.length === 0 && (
                    <div className="inbox-empty">Waiting for traffic...</div>
                )}
                {threads.map(t => (
                    <div
                        key={t.id}
                        onClick={() => onSelectThread(t.id)}
                        className={`thread-item ${selectedThreadId === t.id ? 'selected' : ''} ${getStatusClass(t.classification)}`}
                    >
                        {/* Avatar */}
                        <div className="avatar">
                            {t.senderName.charAt(0)}
                        </div>

                        <div className="thread-content">
                            <div className="thread-top">
                                <div className="sender-name">
                                    {t.senderName}
                                </div>
                                <span className="thread-time">Now</span>
                            </div>

                            <div className="thread-preview">
                                {t.isIntercepted && <span className="ai-prefix">⚠ AI • </span>}
                                {t.isCompromised && <span className="compromised-prefix" style={{ color: 'var(--status-danger)', fontWeight: 'bold' }}>[COMPROMISED] </span>}
                                {t.lastMessage}
                            </div>

                            {t.isIntercepted && t.persona && (
                                <div className={`persona-badge ${t.persona.toLowerCase()}`}>
                                    {getPersonaBadge(t.persona)}
                                </div>
                            )}

                            {t.autoReported && (
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#4ade80',
                                    fontSize: '0.65rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    marginTop: '4px',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    fontWeight: 'bold'
                                }}>
                                    REPORTED
                                </div>
                            )}

                            {t.isBlocked && (
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#f87171',
                                    fontSize: '0.65rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    marginTop: '4px',
                                    marginLeft: '4px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    fontWeight: 'bold'
                                }}>
                                    BLOCKED
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

