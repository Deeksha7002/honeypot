import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Shield, Wifi, Server, Zap, Globe, Lock, AlertTriangle } from 'lucide-react';
import { GlobalThreatMap } from './GlobalThreatMap';
import { type GeoLocation } from '../lib/types';

interface SystemDashboardProps {
    activeThreats?: number;
    locations?: GeoLocation[];
    onSimulateAttack?: () => void;
}

export const SystemDashboard: React.FC<SystemDashboardProps> = ({ activeThreats = 0, locations = [], onSimulateAttack }) => {
    const [cpuLoad, setCpuLoad] = useState(12);
    const [networkTraffic, setNetworkTraffic] = useState(45);
    const [enhancedMonitoring, setEnhancedMonitoring] = useState<{ region: string, active: boolean }>({ region: '', active: false });

    useEffect(() => {
        const interval = setInterval(() => {
            if (activeThreats > 20) {
                // Crisis Mode Simulation
                setCpuLoad(prev => Math.min(100, Math.max(85, prev + (Math.random() * 20 - 5)))); // High load 85-100%
                setNetworkTraffic(prev => Math.min(1000, Math.max(500, prev + (Math.random() * 200 - 50)))); // Spike traffic
            } else {
                // Normal Mode
                setCpuLoad(prev => Math.min(100, Math.max(5, prev + (Math.random() * 10 - 5))));
                setNetworkTraffic(prev => Math.min(100, Math.max(10, prev + (Math.random() * 20 - 10))));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [activeThreats]);

    const handleRegionSelect = (regionName: string, threatLevel: string) => {
        if (threatLevel === 'HIGH') {
            setEnhancedMonitoring({ region: regionName, active: true });
        } else {
            setEnhancedMonitoring({ region: '', active: false });
        }
    };

    const StatusCard = ({ icon, label, value, subtext, metric, color, pulse }: any) => {
        const cardRef = React.useRef<HTMLDivElement>(null);
        const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
        const [shine, setShine] = React.useState({ x: 50, y: 50 });
        const [isHovered, setIsHovered] = React.useState(false);

        const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
            if (!cardRef.current) return;
            setIsHovered(true);
            const rect = cardRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate tilt percentages (-12 to 12 degrees for realism)
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const tiltX = (y - centerY) / centerY * -12;
            const tiltY = (x - centerX) / centerX * 12;

            setTilt({ x: tiltX, y: tiltY });

            // Set dynamic lighting (0-100%)
            setShine({
                x: (x / rect.width) * 100,
                y: (y / rect.height) * 100
            });
        };

        const handleMouseLeave = () => {
            setTilt({ x: 0, y: 0 });
            setIsHovered(false);
        };

        return (
            <div
                ref={cardRef}
                className={`sys-card ${!isHovered ? 'sys-card-idle' : ''}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    borderLeft: pulse ? `2px solid ${color}` : undefined,
                    transform: isHovered ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` : undefined,
                    '--mouse-x': `${shine.x}%`,
                    '--mouse-y': `${shine.y}%`
                } as React.CSSProperties}
            >
                {/* Hyper-Realistic Overlays */}
                <div className="material-grain" />
                <div className="hologram-overlay" />
                <div className="glare-surface" />
                <div className="sys-card-accent-tl" />

                <div className="sys-card-header">
                    <span style={{ color }} className={pulse ? 'neural-active' : ''}>{icon}</span>
                    <span className="sys-card-label">{label}</span>
                </div>
                <div className="sys-card-value" style={{ color }}>{value}</div>
                <div className="sys-progress-bg">
                    <div
                        className="sys-progress-bar"
                        style={{ width: subtext.includes('%') ? subtext : '100%', background: color, color }}
                    />
                </div>
                <div className="sys-card-sub">
                    <span>{subtext}</span>
                    {metric && <span className="sys-card-metric">{metric}</span>}
                </div>
            </div>
        );
    };



    return (
        <div className="dashboard-grid">
            <div className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Globe size={24} className={`spin-slow ${activeThreats > 20 ? 'text-red' : ''}`} style={{ color: activeThreats > 20 ? 'var(--status-danger)' : 'var(--primary)' }} />
                    <h2 style={{ color: activeThreats > 20 ? 'var(--status-danger)' : 'inherit' }}>
                        {activeThreats > 20 ? '⚠️ CRITICAL THREAT LEVEL: BOTNET DETECTED' : 'GLOBAL THREAT SURVEILLANCE'}
                    </h2>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {onSimulateAttack && (
                        <button
                            onClick={onSimulateAttack}
                            className="btn-danger-glow"
                            style={{
                                background: 'rgba(220, 38, 38, 0.2)',
                                border: '1px solid var(--status-danger)',
                                color: 'var(--status-danger)',
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ⚡ SIMULATE ATTACK
                        </button>
                    )}
                    <div className={`live-badge ${activeThreats > 20 ? 'animate-pulse' : ''}`} style={activeThreats > 20 ? { background: 'var(--status-danger)', color: 'white' } : {}}>
                        {activeThreats > 20 ? 'UNDER ATTACK' : 'LIVE FEED'}
                    </div>
                </div>
            </div>

            <div className="vitals-row">
                <StatusCard
                    icon={<Cpu size={18} />}
                    label="NEURAL ENGINE"
                    value={`${activeThreats > 0 ? activeThreats + 12 : cpuLoad.toFixed(0)}%`}
                    subtext={activeThreats > 0 ? `${activeThreats} THREATS ACTIVE` : "Processing Load"}
                    metric={activeThreats > 0 ? "TEMP: 54°C" : "TEMP: 38°C"}
                    color={activeThreats > 0 ? "var(--status-danger)" : "var(--primary)"}
                    pulse={activeThreats > 0}
                />
                <StatusCard
                    icon={<Wifi size={18} />}
                    label="NETWORK"
                    value={`${networkTraffic.toFixed(0)} Mb/s`}
                    subtext="Encrypted Traffic"
                    metric="FILTERED: 1.2k"
                    color="var(--status-info)"
                />
                <StatusCard
                    icon={<Shield size={18} />}
                    label="DEFENSE"
                    value="ACTIVE"
                    subtext="Firewall Integrity"
                    metric="UPTIME: 99.9%"
                    color="var(--status-success)"
                />
            </div>

            {/* Map Section */}
            <div className="map-section">
                <GlobalThreatMap onRegionSelect={handleRegionSelect} activeLocations={locations} />

                {enhancedMonitoring.active && (
                    <div className="enhanced-monitoring-overlay" style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(15, 23, 42, 0.8)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1001 // Higher than map controls
                    }}>
                        <AlertTriangle size={48} className="text-red animate-pulse" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>ENHANCED MONITORING ACTIVE</h3>
                        <div className="monitoring-detail" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '1.5rem', textAlign: 'center' }}>
                            TARGET: <span className="text-red">{enhancedMonitoring.region.toUpperCase()}</span>
                            {locations
                                .filter(loc => {
                                    // Basic include check mapping (could be improved to match map logic but this is decent for UI)
                                    const region = enhancedMonitoring.region;
                                    if (region === 'North America' && (loc.country.includes('USA') || loc.country.includes('US'))) return true;
                                    if (region === 'Asia' && (loc.country.includes('India') || loc.country.includes('China') || loc.city.includes('Delhi') || loc.city.includes('Mumbai'))) return true;
                                    if (region === 'Africa' && (loc.country.includes('Nigeria') || loc.city.includes('Lagos'))) return true;
                                    if (region === 'Europe' && (loc.country.includes('UK') || loc.country.includes('Russia'))) return true;
                                    return false;
                                })
                                .map((loc, i) => (
                                    <div key={i} style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        📍 {loc.city}, {loc.country}
                                    </div>
                                ))
                            }
                        </div>
                        <button
                            onClick={() => setEnhancedMonitoring({ region: '', active: false })}
                            className="btn btn-secondary"
                            style={{
                                borderColor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                background: 'rgba(0,0,0,0.4)'
                            }}
                        >
                            DISABLE MONITORING
                        </button>
                    </div>
                )}
            </div>

            <div className="services-list">
                <div className="service-item">
                    <Server size={14} /> <span>Honeypot Protocols: <span className="text-green">READY</span></span>
                </div>
                <div className="service-item">
                    <Lock size={14} /> <span>Encryption: <span className="text-green">VERIFIED</span></span>
                </div>
                <div className="service-item">
                    <Zap size={14} /> <span>AI Response: <span className="text-blue">12ms</span></span>
                </div>
                {enhancedMonitoring.active && (
                    <div className="service-item" style={{ color: 'var(--status-danger)' }}>
                        <Activity size={14} /> <span>Zone Alert: {enhancedMonitoring.region}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
