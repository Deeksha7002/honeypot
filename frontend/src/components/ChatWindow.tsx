import React, { useRef, useEffect } from 'react';
import type { Message } from '../lib/types';
import { ShieldAlert, Bot, User } from 'lucide-react';

interface ChatWindowProps {
    messages: Message[];
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="chat-window">
            {messages.length === 0 && (
                <div className="empty-state">
                    <p>No messages yet.</p>
                    <p style={{ fontSize: '0.8em', opacity: 0.7 }}>Start the simulation to receive scam attempts.</p>
                </div>
            )}

            {messages.map((msg) => {
                const isAgent = msg.sender === 'agent';

                return (
                    <div
                        key={msg.id}
                        className={`message-row ${isAgent ? 'agent' : 'scammer'}`}
                    >
                        <div className="message-bubble">
                            <div className="msg-header">
                                {isAgent ? <Bot size={14} /> : <User size={14} />}
                                <span>{msg.sender === 'agent' ? 'Honeypot' : 'Remote User'}</span>
                            </div>

                            <div className="msg-content">
                                {msg.content}
                            </div>

                            {msg.attachments?.map((at, i) => (
                                <div key={i} className="attachment-container" style={{ marginTop: '0.5rem' }}>
                                    {at.isShredded ? (
                                        <div className="shredded-container" style={{
                                            background: 'linear-gradient(45deg, #000, #1a1a1a)',
                                            border: '2px dashed #ef4444',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                            <div className="shred-glitch" style={{ fontSize: '1.5rem', filter: 'grayscale(1) contrast(2)' }}>🧩</div>
                                            <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.7rem', letterSpacing: '1px' }}>
                                                ☢️ MALICIOUS FILE SHREDDED
                                            </span>
                                            <span style={{ color: '#94a3b8', fontSize: '0.6rem', textAlign: 'center' }}>
                                                Forwarded to Cyber Cell. Millions of fragments unrecoverable.
                                            </span>
                                            {/* Shredding animation line */}
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '2px',
                                                background: '#ef4444',
                                                boxShadow: '0 0 10px #ef4444',
                                                animation: 'shred-scan 2s linear infinite'
                                            }} />
                                        </div>
                                    ) : (
                                        <div className="media-preview" style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.8rem' }}>
                                            📎 {at.name} ({at.type})
                                        </div>
                                    )}
                                </div>
                            ))}

                            {msg.isRedacted && (
                                <div className="redacted-badge">
                                    <ShieldAlert size={10} />
                                    <span>Sensitive Data Redacted</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
};
