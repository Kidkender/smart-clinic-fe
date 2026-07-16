import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { parseJwtPayload } from '../utils/jwt';

const AuthContext = createContext(null);

const AUTH_KEY = 'smartclinic_auth';
const TOKEN_KEY = 'smartclinic_token';

function expiryFromToken(token) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return Date.now() + 24 * 60 * 60 * 1000;
  return payload.exp * 1000;
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.isLoggedIn || Date.now() >= parsed.expiresAt) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const savedAuth = loadAuth();

  const [userId, setUserId] = useState(savedAuth?.userId ?? null);
  const [role, setRole] = useState(savedAuth?.role ?? null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!savedAuth);
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const logout = () => {
    clearTimer();
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUserId(null);
    setRole(null);
    setIsLoggedIn(false);
  };

  const scheduleAutoLogout = expiresAt => {
    clearTimer();
    timerRef.current = setTimeout(logout, Math.max(expiresAt - Date.now(), 0));
  };

  const login = token => {
    const payload = parseJwtPayload(token);
    const expiresAt = expiryFromToken(token);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      userId: payload?.user_id ?? null,
      role: payload?.role ?? null,
      isLoggedIn: true,
      expiresAt,
    }));
    setUserId(payload?.user_id ?? null);
    setRole(payload?.role ?? null);
    setIsLoggedIn(true);
    scheduleAutoLogout(expiresAt);
  };

  useEffect(() => {
    if (savedAuth?.expiresAt) {
      scheduleAutoLogout(savedAuth.expiresAt);
    }
    const handleForcedLogout = () => {
      clearTimer();
      setUserId(null);
      setRole(null);
      setIsLoggedIn(false);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => {
      clearTimer();
      window.removeEventListener('auth:logout', handleForcedLogout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ userId, role, isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
