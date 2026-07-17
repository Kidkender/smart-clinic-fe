import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { parseJwtPayload } from '../utils/jwt';
import { PATIENT_TOKEN_KEY, PATIENT_AUTH_KEY } from '../api/portalClient';

interface PatientAuthContextValue {
  patientId: string | null;
  isLoggedIn: boolean;
  login: (token: string) => void;
  logout: () => void;
}

interface StoredPatientAuth {
  patientId: string | null;
  isLoggedIn: boolean;
  expiresAt: number;
}

const PatientAuthContext = createContext<PatientAuthContextValue | null>(null);

function expiryFromToken(token: string): number {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return Date.now() + 24 * 60 * 60 * 1000;
  return payload.exp * 1000;
}

function loadAuth(): StoredPatientAuth | null {
  try {
    const raw = localStorage.getItem(PATIENT_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.isLoggedIn || Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(PATIENT_AUTH_KEY);
      localStorage.removeItem(PATIENT_TOKEN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function PatientAuthProvider({ children }: { children: ReactNode }) {
  const savedAuth = loadAuth();

  const [patientId, setPatientId] = useState<string | null>(savedAuth?.patientId ?? null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!savedAuth);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const logout = () => {
    clearTimer();
    localStorage.removeItem(PATIENT_AUTH_KEY);
    localStorage.removeItem(PATIENT_TOKEN_KEY);
    setPatientId(null);
    setIsLoggedIn(false);
  };

  const scheduleAutoLogout = (expiresAt: number) => {
    clearTimer();
    timerRef.current = setTimeout(logout, Math.max(expiresAt - Date.now(), 0));
  };

  const login = (token: string) => {
    const payload = parseJwtPayload(token);
    const expiresAt = expiryFromToken(token);
    localStorage.setItem(PATIENT_TOKEN_KEY, token);
    localStorage.setItem(PATIENT_AUTH_KEY, JSON.stringify({
      patientId: payload?.user_id ?? null,
      isLoggedIn: true,
      expiresAt,
    }));
    setPatientId(payload?.user_id ?? null);
    setIsLoggedIn(true);
    scheduleAutoLogout(expiresAt);
  };

  useEffect(() => {
    if (savedAuth?.expiresAt) {
      scheduleAutoLogout(savedAuth.expiresAt);
    }
    const handleForcedLogout = () => {
      clearTimer();
      setPatientId(null);
      setIsLoggedIn(false);
    };
    window.addEventListener('patient-auth:logout', handleForcedLogout);
    return () => {
      clearTimer();
      window.removeEventListener('patient-auth:logout', handleForcedLogout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PatientAuthContext.Provider value={{ patientId, isLoggedIn, login, logout }}>
      {children}
    </PatientAuthContext.Provider>
  );
}

export function usePatientAuth() {
  const ctx = useContext(PatientAuthContext);
  if (!ctx) throw new Error('usePatientAuth must be used within PatientAuthProvider');
  return ctx;
}
