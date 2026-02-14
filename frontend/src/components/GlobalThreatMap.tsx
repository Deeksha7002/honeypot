import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
import type { GeoLocation } from '../lib/types';

// Fix for default marker icon issues in React Leaflet
// We will use custom DivIcons anyway, but this is good practice
import iconMarker2x from 'leaflet/dist/images/marker-icon-2x.png';
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconMarker2x,
    iconUrl: iconMarker,
    shadowUrl: iconShadow,
});

interface GlobalThreatMapProps {
    onRegionSelect: (regionName: string, threatLevel: string) => void;
    activeLocations?: GeoLocation[];
}

// Coordinate mapping for regions
const REGION_COORDS: Record<string, [number, number]> = {
    "North America": [40, -100],
    "South America": [-15, -60],
    "Europe": [50, 15],
    "Africa": [0, 20],
    "Asia": [35, 100],
    "Oceania": [-25, 135]
};

const REGIONS = [
    { name: "North America", color: "#3b82f6" },
    { name: "South America", color: "#10b981" },
    { name: "Europe", color: "#8b5cf6" },
    { name: "Africa", color: "#f59e0b" },
    { name: "Asia", color: "#fcd34d" },
    { name: "Oceania", color: "#06b6d4" },
];

export const GlobalThreatMap: React.FC<GlobalThreatMapProps> = ({ onRegionSelect, activeLocations = [] }) => {

    // Map bounds control component
    const MapController = ({ locations }: { locations: GeoLocation[] }) => {
        const map = useMap();

        useEffect(() => {
            if (locations.length > 0) {
                // Optionally fit bounds, but for now we stick to global view
            }
        }, [locations, map]);
        return null;
    };

    // Determine active status/threat level for a region
    const getRegionThreatLevel = (regionName: string) => {
        const isActive = activeLocations.some(loc => {
            // Check country or city names to map to regions
            const regionKeywords: Record<string, string[]> = {
                "North America": ["USA", "Canada", "Mexico", "US", "CA"],
                "Europe": ["UK", "Germany", "France", "Russia", "Netherlands", "Europe", "London", "Paris", "Berlin", "Moscow"],
                "Asia": ["China", "India", "Japan", "Korea", "Thailand", "Beijing", "Mumbai", "Tokyo", "Delhi", "Asia"],
                "Africa": ["Nigeria", "Lagos", "Egypt", "South Africa", "Africa", "Kenya"],
                "South America": ["Brazil", "Argentina", "Colombia", "Peru", "South America"],
                "Oceania": ["Australia", "New Zealand", "Oceania"]
            };

            const keywords = regionKeywords[regionName] || [];
            return keywords.some(k =>
                (loc.country && loc.country.includes(k)) ||
                (loc.city && loc.city.includes(k))
            );
        });
        return isActive ? 'HIGH' : 'LOW';
    };

    return (
        <div className="threat-map-container" style={{
            position: 'relative',
            width: '100%',
            height: '400px', // Fixed height for the widget
            background: '#0a101d',
            borderRadius: '12px',
            border: '1px solid #2a3a5a',
            overflow: 'hidden',
            zIndex: 0 // Ensure it doesn't overlap incorrectly
        }}>
            <div style={{ position: 'absolute', top: 10, left: 10, fontSize: '10px', color: '#64748b', zIndex: 1000, pointerEvents: 'none' }}>
                SYSTEM: INTERACTIVE_SAT_LINK_V5 {activeLocations.length > 0 ? `[${activeLocations.length} TARGETS]` : ''}
            </div>

            <MapContainer
                center={[20, 10]}
                zoom={2}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%", background: '#0a101d' }}
                attributionControl={false}
                minZoom={1.5}
                maxZoom={6}
            >
                <MapController locations={activeLocations} />

                {/* Dark Matter Tiles for Cyber Look (No Labels to avoid misspelled base texture) */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                />

                {/* Render Region Markers (Pulsing Orbs) */}
                {REGIONS.map(region => {
                    const position = REGION_COORDS[region.name];
                    const threatLevel = getRegionThreatLevel(region.name);
                    const isHigh = threatLevel === 'HIGH';

                    // Create Custom Pulse Icon using L.divIcon
                    const customIcon = L.divIcon({
                        className: 'custom-region-icon',
                        html: `
                            <div class="region-marker ${isHigh ? 'active-threat' : ''}" style="--region-color: ${region.color}">
                                <div class="core"></div>
                                ${isHigh ? '<div class="pulse-ring"></div><div class="pulse-ring delay"></div>' : ''}
                                <div class="label" style="color: ${isHigh ? region.color : '#94a3b8'}">${region.name}</div>
                            </div>
                        `,
                        iconSize: [40, 40],
                        iconAnchor: [20, 20]
                    });

                    return (
                        <Marker
                            key={region.name}
                            position={position}
                            icon={customIcon}
                            eventHandlers={{
                                click: () => onRegionSelect(region.name, threatLevel)
                            }}
                        >
                        </Marker>
                    );
                })}

                {/* Render Exact Scam Locations */}
                {activeLocations.map((loc, idx) => (
                    <Marker
                        key={`loc-${idx}`}
                        position={[loc.lat, loc.lng]}
                        icon={L.divIcon({
                            className: 'scam-point',
                            html: `<div style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 8px #ef4444;"></div>`,
                            iconSize: [8, 8],
                            iconAnchor: [4, 4]
                        })}
                    >
                        <Popup className="cyber-popup">
                            <div style={{ color: '#ef4444', fontWeight: 'bold' }}>ACTIVE THREAT</div>
                            <div>{loc.city}, {loc.country}</div>
                            <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>IP: {loc.ip}</div>
                        </Popup>
                    </Marker>
                ))}

            </MapContainer>

            {/* Inject CSS specific to this map component here or in index.css */}
            <style>{`
                /* Hide Leaflet defaults that clash with cyber aesthetic */
                .leaflet-container {
                    background: #0a101d !important;
                    font-family: var(--font-mono);
                }
                
                /* Custom Marker Styles */
                .region-marker {
                    position: relative;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .region-marker .core {
                    width: 10px;
                    height: 10px;
                    background: var(--region-color);
                    border-radius: 50%;
                    box-shadow: 0 0 10px var(--region-color);
                    z-index: 2;
                    transition: all 0.3s ease;
                }
                
                .region-marker:hover .core {
                    transform: scale(1.2);
                    box-shadow: 0 0 15px var(--region-color);
                }

                .region-marker .pulse-ring {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border: 2px solid var(--region-color);
                    border-radius: 50%;
                    opacity: 0;
                    animation: map-pulse 2s infinite;
                }
                
                .region-marker .pulse-ring.delay {
                    animation-delay: 0.5s;
                }
                
                .region-marker .label {
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    margin-top: 5px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    white-space: nowrap;
                    text-shadow: 0 0 4px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,0.8);
                    pointer-events: none;
                }

                @keyframes map-pulse {
                    0% { transform: scale(0.2); opacity: 0.8; }
                    100% { transform: scale(1.5); opacity: 0; }
                }

                /* Dark Popup Overrides */
                .cyber-popup .leaflet-popup-content-wrapper, 
                .cyber-popup .leaflet-popup-tip {
                    background: rgba(15, 23, 42, 0.95);
                    border: 1px solid var(--status-danger);
                    color: white;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};
