import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, tokenStore } from '../lib/api';
import type { User, Workspace } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ hasWorkspace: boolean }>;
  logout: () => Promise<void>;
  switchWorkspace: (ws: Workspace) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setIsLoading(false);
      return;
    }
    try {
      const [me, wsList] = await Promise.all([api.auth.me(), api.workspaces.list()]);
      setUser(me);
      setWorkspaces(wsList);

      const savedId = localStorage.getItem('ta_workspace');
      const active = wsList.find(w => w.id === savedId) ?? wsList[0] ?? null;
      setWorkspace(active);
    } catch {
      tokenStore.clear();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await api.auth.login(email, password);
    tokenStore.set(tokens.access, tokens.refresh);
    setUser(tokens.user);
    const wsList = await api.workspaces.list();
    setWorkspaces(wsList);
    const active = wsList[0] ?? null;
    setWorkspace(active);
    if (active) localStorage.setItem('ta_workspace', active.id);
    return { hasWorkspace: wsList.length > 0 };
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    if (refresh) {
      try { await api.auth.logout(refresh); } catch { /* ignore */ }
    }
    tokenStore.clear();
    setUser(null);
    setWorkspace(null);
    setWorkspaces([]);
  }, []);

  const switchWorkspace = useCallback((ws: Workspace) => {
    setWorkspace(ws);
    localStorage.setItem('ta_workspace', ws.id);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.auth.me();
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, workspace, workspaces, isLoading,
      isAuthenticated: !!user,
      login, logout, switchWorkspace, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
