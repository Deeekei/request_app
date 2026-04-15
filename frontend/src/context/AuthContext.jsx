import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';

const STORAGE_KEY = 'asb-auth';
const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => readStoredAuth());
  const [profile, setProfile] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!authState?.accessToken) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const me = await authApi.me(authState.accessToken);
        if (!cancelled) setProfile(me);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        if (!cancelled) {
          setAuthState(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [authState?.accessToken]);

  const refreshProfile = useCallback(() => {
    if (!authState?.accessToken) return Promise.resolve(null);
    return authApi.me(authState.accessToken).then((me) => {
      setProfile(me);
      return me;
    });
  }, [authState?.accessToken]);

  const value = useMemo(() => ({
    token: authState?.accessToken ?? null,
    user: profile ?? authState?.user ?? null,
    isAuthenticated: Boolean(authState?.accessToken),
    isBootstrapping,
    async login(username, password) {
      const payload = await authApi.login(username, password);
      const nextState = {
        accessToken: payload.access_token,
        user: {
          id: payload.user_id,
          username: payload.username,
          role: payload.role,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      setAuthState(nextState);
      const me = await authApi.me(payload.access_token).catch(() => null);
      setProfile(me);
      return payload;
    },
    async register(data) {
      return authApi.register(data);
    },
    logout() {
      localStorage.removeItem(STORAGE_KEY);
      setAuthState(null);
      setProfile(null);
    },
    refreshProfile,
  }), [authState, isBootstrapping, profile, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
