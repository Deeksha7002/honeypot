import React, { useState } from 'react';
import { ShieldCheck, Lock, Fingerprint, EyeOff, Eye, AlertTriangle, ScanFace, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/config';
import '../index.css';

interface LoginScreenProps {
    onLogin?: (username: string) => void;
}

// ── WebAuthn base64url helpers ──────────────────────────────────────────────
function base64urlToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const binary = atob(padded);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    return buffer.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Converts challenge/id fields in options from base64url strings → ArrayBuffers
function prepareRegistrationOptions(options: any): PublicKeyCredentialCreationOptions {
    return {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        user: {
            ...options.user,
            id: base64urlToBuffer(options.user.id),
        },
        excludeCredentials: (options.excludeCredentials || []).map((c: any) => ({
            ...c,
            id: base64urlToBuffer(c.id),
        })),
    };
}

function prepareAuthenticationOptions(options: any): PublicKeyCredentialRequestOptions {
    return {
        ...options,
        challenge: base64urlToBuffer(options.challenge),
        allowCredentials: (options.allowCredentials || []).map((c: any) => ({
            ...c,
            id: base64urlToBuffer(c.id),
        })),
    };
}

// ── Enroll biometrics for a newly-registered user ──────────────────────────
async function enrollBiometrics(username: string): Promise<void> {
    // 1. Get registration options from backend
    const startRes = await fetch(
        `${API_BASE_URL}/api/auth/biometric/register/start?username=${encodeURIComponent(username)}`,
        { method: 'POST' }
    );
    if (!startRes.ok) throw new Error(await startRes.text());
    const rawOptions = await startRes.json();
    const creationOptions = prepareRegistrationOptions(rawOptions);

    // 2. Trigger real OS biometric prompt (Windows Hello / Touch ID)
    const credential = await navigator.credentials.create({ publicKey: creationOptions }) as PublicKeyCredential;
    if (!credential) throw new Error('No credential returned by browser');

    const attResponse = credential.response as AuthenticatorAttestationResponse;

    // 3. Send real credential to backend for verification + storage
    const finishRes = await fetch(
        `${API_BASE_URL}/api/auth/biometric/register/finish?username=${encodeURIComponent(username)}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: credential.id,
                rawId: bufferToBase64url(credential.rawId),
                type: credential.type,
                response: {
                    clientDataJSON: bufferToBase64url(attResponse.clientDataJSON),
                    attestationObject: bufferToBase64url(attResponse.attestationObject),
                },
            }),
        }
    );
    if (!finishRes.ok) throw new Error(await finishRes.text());
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
    const { login, register } = useAuth();
    // Show registration on first visit, login on return visits
    const [isRegistering, setIsRegistering] = useState(!localStorage.getItem('scam_registered'));
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    // ── Removed Auto-trigger biometric on page load to prevent unwanted dialogs ──

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setStatusMsg(null);

        if (!username.trim() || !password.trim()) {
            setError('CREDENTIALS REQUIRED');
            return;
        }

        if (isRegistering && password !== confirmPassword) {
            setError('PASSWORDS DO NOT MATCH');
            return;
        }

        setIsLoading(true);

        try {
            if (isRegistering) {
                const success = await register(username, password);
                if (!success) {
                    setError('OPERATOR ID ALREADY TAKEN');
                } else {
                    // Auto-enroll biometrics right after password registration
                    if (window.PublicKeyCredential) {
                        try {
                            setStatusMsg('ENROLLING BIOMETRICS — FOLLOW THE PROMPT...');
                            await enrollBiometrics(username);
                            setStatusMsg('BIOMETRICS ENROLLED ✓ — PLEASE LOG IN');
                        } catch (bioErr: any) {
                            // Don't block them — biometric enrollment is optional
                            console.warn('Biometric enrollment skipped:', bioErr.message);
                            setStatusMsg('ACCOUNT CREATED — BIOMETRICS SKIPPED');
                        }
                    } else {
                        setStatusMsg('ACCOUNT CREATED — BROWSER DOES NOT SUPPORT BIOMETRICS');
                    }
                    localStorage.setItem('scam_registered', 'true');
                    setIsRegistering(false);
                    setPassword('');
                }
            } else {
                const success = await login(username, password);
                if (!success) {
                    setError('ACCESS DENIED: INVALID CREDENTIALS');
                }
            }
        } catch (err) {
            setError('SYSTEM ERROR: AUTHENTICATION FAILED');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        if (!username.trim()) {
            setError('ENTER OPERATOR ID FOR BIOMETRICS');
            return;
        }

        if (!window.PublicKeyCredential) {
            setError('BIOMETRICS NOT SUPPORTED ON THIS BROWSER');
            return;
        }

        setIsLoading(true);
        setError(null);
        setStatusMsg('PROMPTING BIOMETRIC SCANNER...');

        try {
            // 1. Get authentication challenge from backend
            const startRes = await fetch(
                `${API_BASE_URL}/api/auth/biometric/login/start?username=${encodeURIComponent(username)}`,
                { method: 'POST' }
            );
            if (!startRes.ok) {
                const errData = await startRes.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to start biometric login');
            }
            const rawOptions = await startRes.json();
            const requestOptions = prepareAuthenticationOptions(rawOptions);

            // 2. Trigger real OS biometric prompt
            const assertion = await navigator.credentials.get({ publicKey: requestOptions }) as PublicKeyCredential;
            if (!assertion) throw new Error('No assertion returned');

            const assResponse = assertion.response as AuthenticatorAssertionResponse;

            // 3. Send to backend for signature verification
            const finishRes = await fetch(
                `${API_BASE_URL}/api/auth/biometric/login/finish?username=${encodeURIComponent(username)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: assertion.id,
                        rawId: bufferToBase64url(assertion.rawId),
                        type: assertion.type,
                        response: {
                            clientDataJSON: bufferToBase64url(assResponse.clientDataJSON),
                            authenticatorData: bufferToBase64url(assResponse.authenticatorData),
                            signature: bufferToBase64url(assResponse.signature),
                            userHandle: assResponse.userHandle ? bufferToBase64url(assResponse.userHandle) : null,
                        },
                    }),
                }
            );

            const data = await finishRes.json();
            if (finishRes.ok && data.token) {
                localStorage.setItem('token', data.token);
                window.location.reload();
            } else {
                throw new Error(data.detail || 'Biometric verification failed');
            }
        } catch (e: any) {
            console.error(e);
            if (e.name === 'NotAllowedError') {
                setError('BIOMETRIC SCAN CANCELLED OR TIMED OUT');
            } else if (e.name === 'InvalidStateError') {
                setError('NO BIOMETRIC REGISTERED — USE PASSWORD LOGIN');
            } else {
                setError(e.message?.toUpperCase() || 'BIOMETRICS UNAVAILABLE');
            }
            setStatusMsg(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnrollBiometrics = async () => {
        if (!username.trim() || !password.trim()) {
            setError('ENTER OPERATOR ID AND ACCESS CODE TO ENROLL BIOMETRICS');
            return;
        }
        if (!window.PublicKeyCredential) {
            setError('BIOMETRICS NOT SUPPORTED ON THIS BROWSER');
            return;
        }

        setIsLoading(true);
        setError(null);
        setStatusMsg('VERIFYING CREDENTIALS...');

        try {
            // 1. Verify password — only account owner can enroll biometrics
            const verifyRes = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            if (!verifyRes.ok) {
                throw new Error('INVALID CREDENTIALS — CANNOT ENROLL BIOMETRICS');
            }

            // 2. Trigger Windows Hello enrollment
            setStatusMsg('FOLLOW THE WINDOWS HELLO PROMPT TO ENROLL...');
            await enrollBiometrics(username);
            setStatusMsg('BIOMETRICS ENROLLED ✓ — USE FACE ID / TOUCH ID TO LOGIN');
        } catch (e: any) {
            if (e.name === 'NotAllowedError') {
                setError('BIOMETRIC SCAN CANCELLED');
            } else {
                setError(e.message?.toUpperCase() || 'ENROLLMENT FAILED');
            }
            setStatusMsg(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container" style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            minHeight: '100vh',
            background: '#0f172a',
            color: '#e0e0e0',
            fontFamily: 'monospace',
            position: 'relative',
            overflowY: 'auto',
            paddingTop: '2rem',
            paddingBottom: '2rem',
        }}>
            {/* Background Grid */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.05) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                pointerEvents: 'none'
            }}></div>

            <div className="login-card" style={{
                width: '400px',
                maxWidth: '95vw',
                padding: '2.5rem',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '16px',
                boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                zIndex: 10,
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.1)',
                        marginBottom: '1rem',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                        <ShieldCheck size={32} color="#10b981" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0', letterSpacing: '-0.5px', color: '#fff' }}>
                        SCAM<span style={{ color: '#10b981' }}>DEFENDER</span>
                    </h1>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', letterSpacing: '1px' }}>
                        {isRegistering ? 'NEW OPERATOR ENROLLMENT' : 'AUTHORIZED PERSONNEL ONLY'}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                            {isRegistering ? 'CREATE OPERATOR ID' : 'OPERATOR ID'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 40px',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontFamily: 'Inter, sans-serif',
                                    outline: 'none',
                                    fontSize: '0.9rem'
                                }}
                                placeholder="Enter ID..."
                            />
                            <Fingerprint size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                            {isRegistering ? 'CREATE ACCESS CODE' : 'ACCESS CODE'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 40px 12px 40px',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontFamily: 'Inter, sans-serif',
                                    outline: 'none',
                                    fontSize: '0.9rem'
                                }}
                                placeholder="••••••••"
                            />
                            <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '12px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    padding: 0
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {isRegistering && (
                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                                CONFIRM ACCESS CODE
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 12px 12px 40px',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontFamily: 'Inter, sans-serif',
                                        outline: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                    placeholder="••••••••"
                                />
                                <ShieldCheck size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                            </div>
                        </div>
                    )}

                    {statusMsg && (
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#6ee7b7',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginBottom: '1rem',
                            letterSpacing: '0.5px'
                        }}>
                            <ShieldCheck size={16} /> {statusMsg}
                        </div>
                    )}

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#fca5a5',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: isLoading ? '#334155' : '#10b981',
                            color: isLoading ? '#94a3b8' : '#000',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s',
                            fontSize: '0.9rem'
                        }}
                    >
                        {isLoading ? (
                            <span>VERIFYING...</span>
                        ) : (
                            <>
                                {isRegistering ? <UserPlus size={18} /> : <Lock size={18} />}
                                <span>{isRegistering ? 'ENROLL OPERATOR' : 'AUTHENTICATE'}</span>
                            </>
                        )}
                    </button>

                    {/* Register / Login toggle — placed prominently right after main button */}
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                            style={{
                                background: 'none',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '8px',
                                color: '#10b981',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: '8px 16px',
                                width: '100%',
                                letterSpacing: '0.5px'
                            }}
                        >
                            {isRegistering ? '← ALREADY HAVE AN ACCOUNT? LOGIN' : 'NEW USER? CREATE YOUR ACCOUNT →'}
                        </button>
                    </div>

                    {!isRegistering && (
                        <button
                            type="button"
                            onClick={handleBiometricLogin}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'transparent',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#10b981',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                                fontSize: '0.9rem',
                                marginTop: '1rem'
                            }}
                        >
                            <ScanFace size={18} />
                            <span>FACE ID / TOUCH ID</span>
                        </button>
                    )}

                    {!isRegistering && (
                        <button
                            type="button"
                            onClick={handleEnrollBiometrics}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'transparent',
                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                color: '#a5b4fc',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                                fontSize: '0.8rem',
                                marginTop: '0.5rem',
                                letterSpacing: '0.5px'
                            }}
                        >
                            <Fingerprint size={16} />
                            <span>ENROLL BIOMETRICS FOR THIS ACCOUNT</span>
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};
