import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BAYAN_OPEN_TOKEN_KEY } from '@/services/api/bayan-open.service';

const MOCK_CREDENTIALS = {
  email: 'admin@bayanopen.com',
  password: 'Okedeh.12345',
};

const SESSION_KEY = 'bayan_open_client_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

interface BayanOpenAuthContextValue {
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const BayanOpenAuthContext = createContext<BayanOpenAuthContextValue | undefined>(undefined);

function hasValidSession(): boolean {
  const token = localStorage.getItem(BAYAN_OPEN_TOKEN_KEY);
  const sessionRaw = localStorage.getItem(SESSION_KEY);
  if (!token || !sessionRaw) return false;

  try {
    const session = JSON.parse(sessionRaw) as { expiresAt: number };
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(BAYAN_OPEN_TOKEN_KEY);
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function verifyMockCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === MOCK_CREDENTIALS.email &&
    password === MOCK_CREDENTIALS.password
  );
}

export function BayanOpenAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    setIsAuthenticated(hasValidSession());
    setIsCheckingAuth(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulated latency so the UI doesn't flash instantly (feels like a real request)
    await new Promise((r) => setTimeout(r, 500));

    if (!verifyMockCredentials(email, password)) {
      return { success: false, error: 'Invalid email or password' };
    }

    const fakeToken = `mock.${btoa(email)}.${Date.now()}`;
    localStorage.setItem(BAYAN_OPEN_TOKEN_KEY, fakeToken);
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ email, expiresAt: Date.now() + SESSION_DURATION_MS })
    );
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(BAYAN_OPEN_TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  return (
    <BayanOpenAuthContext.Provider value={{ isAuthenticated, isCheckingAuth, login, logout }}>
      {children}
    </BayanOpenAuthContext.Provider>
  );
}

export function useBayanOpenAuth(): BayanOpenAuthContextValue {
  const ctx = useContext(BayanOpenAuthContext);
  if (!ctx) {
    throw new Error('useBayanOpenAuth must be used within BayanOpenAuthProvider');
  }
  return ctx;
}