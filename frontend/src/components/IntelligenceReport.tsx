import React, { useState, useEffect } from 'react';
import { IntelligenceService } from '../lib/IntelligenceService';
import type { IntelligenceSummary } from '../lib/types';
import { BarChart3, Users, ShieldAlert, Clock, RefreshCw, AlertCircle } from 'lucide-react';

export const IntelligenceReport: React.FC = () => {
    const [range, setRange] = useState<'today' | 'week' | 'month'>('today');
    const [summary, setSummary] = useState<IntelligenceSummary | null>(null);

    useEffect(() => {
        IntelligenceService.syncWithBackend().then(refreshData);
        // Refresh every 30s to keep dashboard alive
        const interval = setInterval(() => {
            IntelligenceService.syncWithBackend().then(refreshData);
        }, 30000);
        return () => clearInterval(interval);
    }, [range]);

    const refreshData = () => {
        setSummary(IntelligenceService.getSummary());
    };

    if (!summary) return <div>Loading Intelligence...</div>;

    const maxCount = Math.max(...Object.values(summary.byType), 1);

    return (
        <div className="intelligence-report" style={{ color: 'white', padding: '1rem' }}>
            <div className="report-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <BarChart3 className="text-blue" />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Intelligence Command Centre</h2>
                </div>
                <div className="range-selector" style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['today', 'week', 'month'] as const).map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`btn-toggle ${range === r ? 'active' : ''}`}
                            style={{
                                padding: '0.25rem 0.75rem',
                                fontSize: '0.75rem',
                                background: range === r ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
                    <button onClick={refreshData} className="btn-icon"><RefreshCw size={14} /></button>
                </div>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="stat-card">
                    <div className="stat-icon text-red"><ShieldAlert size={18} /></div>
                    <div className="stat-content">
                        <div className="stat-label">Scam Attempts</div>
                        <div className="stat-value">{range === 'today' ? summary.today : range === 'week' ? summary.week : summary.month}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon text-blue"><Users size={18} /></div>
                    <div className="stat-content">
                        <div className="stat-label">Unique Scammers</div>
                        <div className="stat-value">{summary.uniqueScammers}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon text-green"><Clock size={18} /></div>
                    <div className="stat-content">
                        <div className="stat-label">Active Uptime</div>
                        <div className="stat-value">99.9%</div>
                    </div>
                </div>
            </div>

            <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                <div className="category-split">
                    <h3 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Breakdown by Type</h3>
                    <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {Object.entries(summary.byType).map(([type, count]) => (
                            <div key={type} className="chart-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '120px', fontSize: '0.75rem', color: '#cbd5e1' }}>{type}</div>
                                <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', position: 'relative' }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: `${(count / maxCount) * 100}%`,
                                        background: 'var(--primary)',
                                        borderRadius: '4px',
                                        boxShadow: '0 0 10px var(--primary-glow)'
                                    }} />
                                </div>
                                <div style={{ width: '30px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600 }}>{count}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="identifiers-panel">
                    <h3 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repeated Identifiers</h3>
                    <div className="id-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {summary.repeatedIdentifiers.length === 0 ? (
                            <div style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>No repeated IDs detected yet.</div>
                        ) : (
                            summary.repeatedIdentifiers.map((id, i) => (
                                <div key={i} className="id-tag" style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#f87171',
                                    padding: '0.4rem',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontFamily: 'monospace',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <AlertCircle size={12} /> {id}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .stat-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    padding: 1rem;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .stat-label { color: #94a3b8; font-size: 0.75rem; }
                .stat-value { font-size: 1.5rem; font-weight: 700; color: white; }
                .text-blue { color: #3b82f6; }
                .text-red { color: #ef4444; }
                .text-green { color: #22c55e; }
            `}} />
        </div>
    );
};
