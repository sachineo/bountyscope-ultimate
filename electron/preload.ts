import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Database
  dbRun: (sql: string, params?: any[]) => ipcRenderer.invoke('db:run', sql, params || []),
  dbGet: (sql: string, params?: any[]) => ipcRenderer.invoke('db:get', sql, params || []),
  dbAll: (sql: string, params?: any[]) => ipcRenderer.invoke('db:all', sql, params || []),
  dbPath: () => ipcRenderer.invoke('db:path'),
  dbBackup: () => ipcRenderer.invoke('db:backup'),

  // HTTP
  sendRequest: (options: any) => ipcRenderer.invoke('http:send', options),

  // File
  fileSave: (options: any) => ipcRenderer.invoke('file:save', options),
  fileOpen: (options: any) => ipcRenderer.invoke('file:open', options),
  fileRead: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  fileSaveEvidence: (options: any) => ipcRenderer.invoke('file:saveEvidence', options),
  openExternal: (url: string) => ipcRenderer.invoke('file:openExternal', url),

  // App
  getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
  getVersion: () => ipcRenderer.invoke('app:version'),
});
