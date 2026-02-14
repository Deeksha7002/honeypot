import React, { createContext, useContext, useState, useEffect } from 'react';

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
        const users = JSON.parse(localStorage.getItem('registered_users') || '[]');
        const user = users.find((u: any) => u.username === username && u.password === password);

        if (user) {
            const sessionUser = { id: user.id, username: user.username };
            setCurrentUser(sessionUser);
            sessionStorage.setItem('active_session', JSON.stringify(sessionUser));
            return true;
        }
        return false;
    };

    const register = async (username: string, password: string): Promise<boolean> => {
        const users = JSON.parse(localStorage.getItem('registered_users') || '[]');

        if (users.find((u: any) => u.username === username)) {
            return false; // User already exists
        }

        const newUser = {
            id: Math.random().toString(36).substring(2, 11),
            username,
            password // In a real app, this would be hashed
        };

        const updatedUsers = [...users, newUser];
        localStorage.setItem('registered_users', JSON.stringify(updatedUsers));

        // Auto-login after register
        return login(username, password);
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
