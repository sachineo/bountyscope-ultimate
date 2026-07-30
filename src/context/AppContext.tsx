import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { db, newId, nowISO } from '../lib/db';

interface Project {
  id: string; name: string; organization?: string; platform?: string;
  program_url?: string; description?: string; status: string;
  tags: string[]; notes?: string; created_at: string; updated_at: string;
}

interface AppState {
  activeProject: Project | null;
  projects: Project[];
  theme: string;
  sidebarCollapsed: boolean;
  activeTab: string;
}

interface AppContextValue extends AppState {
  setActiveProject: (p: Project | null) => void;
  setTheme: (t: string) => void;
  toggleSidebar: () => void;
  setActiveTab: (t: string) => void;
  refreshProjects: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  logActivity: (action: string, module: string, description: string, meta?: any) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [theme, setThemeState] = useState('cyberpunk');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const refreshProjects = useCallback(async () => {
    const res = await db.all("SELECT * FROM projects WHERE status != 'deleted' ORDER BY updated_at DESC");
    if (res.success) {
      const ps = res.result.map((p: any) => ({
        ...p,
        tags: JSON.parse(p.tags || '[]'),
      }));
      setProjects(ps);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await db.all("SELECT key, value FROM settings");
    if (res.success) {
      const map: any = {};
      for (const r of res.result) map[r.key] = r.value;
      if (map.theme) setThemeState(map.theme);
      if (map.activeProjectId) {
        const pr = await db.get("SELECT * FROM projects WHERE id = ?", [map.activeProjectId]);
        if (pr.success && pr.result) {
          setActiveProjectState({ ...pr.result, tags: JSON.parse(pr.result.tags || '[]') });
        }
      }
    }
  }, []);

  useEffect(() => {
    loadSettings();
    refreshProjects();
  }, [loadSettings, refreshProjects]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
  }, [theme]);

  const setActiveProject = useCallback(async (p: Project | null) => {
    setActiveProjectState(p);
    if (p) {
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['activeProjectId', p.id]);
    } else {
      await db.run("DELETE FROM settings WHERE key = ?", ['activeProjectId']);
    }
  }, []);

  const setTheme = useCallback(async (t: string) => {
    setThemeState(t);
    await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['theme', t]);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(v => !v), []);

  const createProject = useCallback(async (data: Partial<Project>): Promise<Project> => {
    const project: Project = {
      id: newId(),
      name: data.name || 'New Project',
      organization: data.organization || '',
      platform: data.platform || '',
      program_url: data.program_url || '',
      description: data.description || '',
      status: 'active',
      tags: data.tags || [],
      notes: data.notes || '',
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    await db.run(
      `INSERT INTO projects (id,name,organization,platform,program_url,description,status,tags,notes,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [project.id, project.name, project.organization, project.platform,
       project.program_url, project.description, project.status,
       JSON.stringify(project.tags), project.notes, project.created_at, project.updated_at]
    );
    await refreshProjects();
    return project;
  }, [refreshProjects]);

  const deleteProject = useCallback(async (id: string) => {
    await db.run("UPDATE projects SET status='deleted' WHERE id=?", [id]);
    if (activeProject?.id === id) setActiveProjectState(null);
    await refreshProjects();
  }, [activeProject, refreshProjects]);

  const logActivity = useCallback(async (action: string, module: string, description: string, meta?: any) => {
    await db.run(
      `INSERT INTO activity (id,project_id,action,module,description,metadata,created_at) VALUES (?,?,?,?,?,?,?)`,
      [newId(), activeProject?.id || '', action, module, description, JSON.stringify(meta || {}), nowISO()]
    );
  }, [activeProject]);

  return (
    <AppContext.Provider value={{
      activeProject, projects, theme, sidebarCollapsed, activeTab,
      setActiveProject, setTheme, toggleSidebar, setActiveTab,
      refreshProjects, createProject, deleteProject, logActivity,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
