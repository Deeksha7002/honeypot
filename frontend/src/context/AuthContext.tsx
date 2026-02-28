import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/config';

interface User {
    id: string;
    username: string;
}

interface AuthContextType {
    currentUser: User | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    register: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Persist session
    useEffect(() => {
        const savedSession = sessionStorage.getItem('active_session');
        if (savedSession) {
            try {
                setCurrentUser(JSON.parse(savedSession));
            } catch (e) {
                console.error("Failed to parse session", e);
            }
        }
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Rakshak-Token': 'rakshak-core-v1'
                },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const data = await res.json();
                const token = data.token;

                // Keep token for future requests
                localStorage.setItem('token', token);

                // Very crude JWT decode: sub is username
                let payload = { sub: username };
                try {
                    const base64Url = token.split('.')[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    payload = JSON.parse(jsonPayload);
                } catch (e) {
                    console.error("Token parse error", e);
                }

                const sessionUser = { id: payload.sub, username: payload.sub };
                setCurrentUser(sessionUser);
                sessionStorage.setItem('active_session', JSON.stringify(sessionUser));
                return true;
            }
        } catch (e) {
            console.error("Login failed", e);
        }
        return false;
    };

    const register = async (username: string, password: string): Promise<boolean> => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Rakshak-Token': 'rakshak-core-v1'
                },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                await res.json();
                // Auto login after register
                return login(username, password);
            } else {
                const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
                console.error(`Registration failed [${res.status}]:`, errorData);
                // Throw error to be caught by the component
                throw new Error(errorData.detail || 'Registration failed');
            }
        } catch (e: any) {
            console.error("Registration Exception:", e);
            throw e;
        }
    };

    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('active_session');
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            isAuthenticated: !!currentUser,
            login,
            register,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
