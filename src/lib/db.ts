// Browser-side database interface via Electron IPC
const api = (window as any).electronAPI;

export const db = {
  run: (sql: string, params?: any[]) => api?.dbRun(sql, params) ?? Promise.resolve({ success: false }),
  get: (sql: string, params?: any[]) => api?.dbGet(sql, params) ?? Promise.resolve({ success: false }),
  all: (sql: string, params?: any[]) => api?.dbAll(sql, params) ?? Promise.resolve({ success: false }),
  path: () => api?.dbPath() ?? Promise.resolve(''),
  backup: () => api?.dbBackup() ?? Promise.resolve({ success: false }),
};

export const httpClient = {
  send: (options: any) => api?.sendRequest(options) ?? Promise.resolve({ error: true, message: 'Not in Electron context' }),
};

export const fileAPI = {
  save: (options: any) => api?.fileSave(options),
  open: (options: any) => api?.fileOpen(options),
  read: (path: string) => api?.fileRead(path),
  saveEvidence: (options: any) => api?.fileSaveEvidence(options),
  openExternal: (url: string) => api?.openExternal(url),
};

export const appAPI = {
  getPath: (name: string) => api?.getPath(name),
  getVersion: () => api?.getVersion() ?? Promise.resolve('1.0.0'),
};

// Helper: generate UUID (falls back to crypto.randomUUID)
export const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

// Helper: now ISO string
export const nowISO = () => new Date().toISOString();
