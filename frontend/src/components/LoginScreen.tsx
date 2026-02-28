import React, { useState, useEffect } from 'react';
import { Shield, Cpu, Lock, Fingerprint, EyeOff, Eye, AlertTriangle, UserPlus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/config';
import '../index.css';

interface LoginScreenProps {
    onLogin?: (username: string) => void;
}

// â”€â”€ WebAuthn base64url helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// Converts challenge/id fields in options from base64url strings â†’ ArrayBuffers
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

// â”€â”€ Enroll biometrics for a newly-registered user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
// â”€â”€ Matrix Digital Rain Background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MatrixRain: React.FC = () => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const CHARS = '01ã‚¢ã‚¤ã‚¦ã‚¨ã‚ªã‚«ã‚­ã‚¯ã‚±ã‚³ã‚µã‚·ã‚¹ã‚»ã‚½ã‚¿ãƒãƒ„ãƒ†ãƒˆãƒŠãƒ‹ãƒŒãƒãƒŽ';
        const FONT_SIZE = 14;
        let cols = Math.floor(canvas.width / FONT_SIZE);
        const drops: number[] = Array(cols).fill(1);

        let animId: number;
        const draw = () => {
            cols = Math.floor(canvas.width / FONT_SIZE);
            // Fade trail
            ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < drops.length; i++) {
                const char = CHARS[Math.floor(Math.random() * CHARS.length)];
                // Brighter head, dimmer trail
                const brightness = Math.random() > 0.02 ? 0.45 : 1;
                ctx.fillStyle = `rgba(16, 185, 129, ${brightness})`;
                ctx.font = `${FONT_SIZE}px monospace`;
                ctx.fillText(char, i * FONT_SIZE, drops[i] * FONT_SIZE);

                if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            animId = requestAnimationFrame(draw);
        };
        animId = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0, left: 0,
                width: '100%', height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
                opacity: 0.7,
            }}
        />
    );
};

export const LoginScreen: React.FC<LoginScreenProps> = () => {
    const { login, register } = useAuth();

    const lastUser = localStorage.getItem('scam_last_user');
    const hasRegistered = localStorage.getItem('scam_registered');

    type Mode = 'register' | 'biometric' | 'password';
    const getInitialMode = (): Mode => {
        if (!hasRegistered) return 'register';
        if (lastUser) return 'biometric';
        return 'password';
    };

    const [mode, setMode] = useState<Mode>(getInitialMode);
    const [username, setUsername] = useState(lastUser || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    // â”€â”€ Biometric mode: auto-trigger on page load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        if (mode !== 'register' && lastUser && window.PublicKeyCredential) {
            setTimeout(() => triggerBiometric(lastUser), 700);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const triggerBiometric = async (user: string) => {
        setIsLoading(true);
        setError(null);
        setStatusMsg('SCANNING BIOMETRICS...');
        try {
            const startRes = await fetch(
                `${API_BASE_URL}/api/auth/biometric/login/start?username=${encodeURIComponent(user)}`,
                { method: 'POST' }
            );
            if (!startRes.ok) throw new Error('biometric_start_failed');
            const rawOptions = await startRes.json();
            const requestOptions = prepareAuthenticationOptions(rawOptions);

            const assertion = await navigator.credentials.get({ publicKey: requestOptions }) as PublicKeyCredential;
            if (!assertion) throw new Error('no_assertion');

            const assResponse = assertion.response as AuthenticatorAssertionResponse;
            const finishRes = await fetch(
                `${API_BASE_URL}/api/auth/biometric/login/finish?username=${encodeURIComponent(user)}`,
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
                localStorage.setItem('scam_last_user', user);
                window.location.reload();
            } else {
                throw new Error(data.detail || 'verification_failed');
            }
        } catch (e: any) {
            // Silently fall back to password mode â€” don't show an error
            setMode('password');
            setStatusMsg(null);
            setError(null);
        } finally {
            setIsLoading(false);
        }
    };

    // â”€â”€ Registration submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!username.trim() || !password.trim()) { setError('ALL FIELDS REQUIRED'); return; }
        if (password !== confirmPassword) { setError('PASSWORDS DO NOT MATCH'); return; }
        setIsLoading(true);
        try {
            const success = await register(username, password);
            if (!success) {
                setError('OPERATOR ID ALREADY TAKEN - CHOOSE ANOTHER');
            } else {
                // Registration auto-logs in. Now try biometric enrollment.
                localStorage.setItem('scam_registered', 'true');
                localStorage.setItem('scam_last_user', username);
                if (window.PublicKeyCredential) {
                    try {
                        setStatusMsg('SETTING UP BIOMETRICS â€” FOLLOW DEVICE PROMPT...');
                        await enrollBiometrics(username);
                        setStatusMsg('âœ“ BIOMETRICS ENROLLED â€” WELCOME!');
                    } catch {
                        setStatusMsg('âœ“ ACCOUNT CREATED â€” BIOMETRICS SKIPPED');
                    }
                }
                // App will unmount this component since user is now logged in
            }
        } catch {
            setError('REGISTRATION FAILED â€” TRY AGAIN');
        } finally {
            setIsLoading(false);
        }
    };

    // â”€â”€ Password login submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!username.trim() || !password.trim()) { setError('CREDENTIALS REQUIRED'); return; }
        setIsLoading(true);
        try {
            const success = await login(username, password);
            if (!success) {
                setError('ACCESS DENIED: INVALID CREDENTIALS');
            } else {
                localStorage.setItem('scam_last_user', username);
            }
        } catch {
            setError('SYSTEM ERROR â€” TRY AGAIN');
        } finally {
            setIsLoading(false);
        }
    };

    // â”€â”€ Shared card wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const cardStyle: React.CSSProperties = {
        width: '400px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
        padding: '2.5rem',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '16px',
        boxShadow: '0 0 60px rgba(16, 185, 129, 0.08)',
        position: 'relative', zIndex: 10,
        backdropFilter: 'blur(12px)',
    };
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 12px 12px 40px',
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px', color: '#fff', fontFamily: 'Inter, sans-serif',
        outline: 'none', fontSize: '0.9rem',
    };
    const btnPrimary: React.CSSProperties = {
        width: '100%', padding: '13px', background: '#10b981', color: '#000',
        border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.5rem', fontSize: '0.9rem', marginTop: '0.5rem',
    };
    const btnGhost: React.CSSProperties = {
        width: '100%', padding: '10px', background: 'none',
        border: '1px solid rgba(16,185,129,0.35)', color: '#10b981',
        borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
        fontSize: '0.8rem', marginTop: '0.75rem', letterSpacing: '0.5px',
    };

    const Header = ({ subtitle }: { subtitle: string }) => (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                marginBottom: '1rem'
            }}>
                <div style={{ position: 'relative', width: '32px', height: '32px' }}>
                    <Shield size={32} color="#10b981" strokeWidth={1.5} />
                    <Cpu size={14} color="#10b981" style={{ position: 'absolute', top: '10px', left: '9px' }} />
                </div>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>
                RAKSHAK<span style={{ color: '#10b981' }}> AI</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', letterSpacing: '1px' }}>
                {subtitle}
            </p>
        </div>
    );

    const StatusBar = () => (
        <>
            {statusMsg && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <ShieldCheck size={16} /> {statusMsg}
                </div>
            )}
            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <AlertTriangle size={16} /> {error}
                </div>
            )}
        </>
    );

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', color: '#e0e0e0', fontFamily: 'monospace', position: 'relative', overflowY: 'auto', paddingTop: '2rem', paddingBottom: '2rem' }}>
            <MatrixRain />

            {/* â”€â”€ MODE: REGISTER â”€â”€ */}
            {mode === 'register' && (
                <div style={cardStyle}>
                    <Header subtitle="NEW OPERATOR ENROLLMENT" />
                    <form onSubmit={handleRegister}>
                        <div style={{ marginBottom: '1.2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>CREATE OPERATOR ID</label>
                            <div style={{ position: 'relative' }}>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} placeholder="Choose a username..." />
                                <Fingerprint size={18} color="#64748b" style={{ position: 'absolute', left: 12, top: 12 }} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '1.2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>CREATE ACCESS CODE</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 40 }} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
                                <Lock size={18} color="#64748b" style={{ position: 'absolute', left: 12, top: 12 }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>CONFIRM ACCESS CODE</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
                                <ShieldCheck size={18} color="#64748b" style={{ position: 'absolute', left: 12, top: 12 }} />
                            </div>
                        </div>
                        <StatusBar />
                        <button type="submit" disabled={isLoading} style={{ ...btnPrimary, background: isLoading ? '#334155' : '#10b981', color: isLoading ? '#94a3b8' : '#000', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                            {isLoading ? <span>CREATING ACCOUNT...</span> : <><UserPlus size={18} /><span>CREATE ACCOUNT &amp; SETUP BIOMETRICS</span></>}
                        </button>
                    </form>
                </div>
            )}

            {/* ── RETURNING USER: password + biometric on same screen (PhonePe style) ── */}
            {(mode === 'biometric' || mode === 'password') && (
                <div style={cardStyle}>
                    <Header subtitle="AUTHORIZED PERSONNEL ONLY" />

                    {/* Welcome back with username */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(16,185,129,0.06)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.7rem', letterSpacing: '1px', marginBottom: '0.25rem' }}>WELCOME BACK</p>
                        <p style={{ color: '#10b981', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '2px', margin: 0 }}>{username.toUpperCase()}</p>
                    </div>

                    {/* Password form */}
                    <form onSubmit={handlePasswordLogin}>
                        <div style={{ marginBottom: '1.2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>ACCESS CODE</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} style={{ ...inputStyle, paddingRight: 40 }} placeholder="••••••••" autoFocus />
                                <Lock size={18} color="#64748b" style={{ position: 'absolute', left: 12, top: 12 }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <StatusBar />
                        <button type="submit" disabled={isLoading} style={{ ...btnPrimary, background: isLoading ? '#334155' : '#10b981', color: isLoading ? '#94a3b8' : '#000', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                            {isLoading ? <span>VERIFYING...</span> : <><Lock size={18} /><span>AUTHENTICATE</span></>}
                        </button>
                    </form>

                    {/* Switch account */}
                    <button type="button" onClick={() => { localStorage.removeItem('scam_last_user'); localStorage.removeItem('scam_registered'); setMode('register'); }} style={{ ...btnGhost, color: '#475569', border: '1px solid rgba(71,85,105,0.25)', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                        NOT {username.toUpperCase()}? SWITCH ACCOUNT
                    </button>
                </div>
            )}
        </div>
    );
};

