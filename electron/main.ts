import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';

// ── Database ──────────────────────────────────────────────────────────────────
let db: any = null;

function initDb() {
  const Database = require('better-sqlite3');
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'bountyscope.db');
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // Schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      organization TEXT,
      platform TEXT,
      program_url TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      testing_start TEXT,
      tags TEXT DEFAULT '[]',
      notes TEXT,
      reward_table TEXT DEFAULT '{}',
      scope_rules TEXT DEFAULT '[]',
      testing_restrictions TEXT,
      out_of_scope TEXT DEFAULT '[]',
      authorization_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS targets (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      asset TEXT,
      hostname TEXT,
      protocol TEXT DEFAULT 'https',
      port INTEGER,
      path_rules TEXT DEFAULT '[]',
      excluded_paths TEXT DEFAULT '[]',
      asset_type TEXT,
      bounty_eligible INTEGER DEFAULT 1,
      max_severity TEXT DEFAULT 'critical',
      bounty_tier TEXT,
      scope_status TEXT DEFAULT 'in-scope',
      notes TEXT,
      tags TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS endpoints (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      target_id TEXT,
      host TEXT,
      method TEXT,
      path TEXT,
      full_url TEXT,
      status_code INTEGER,
      content_type TEXT,
      response_length INTEGER,
      source TEXT DEFAULT 'manual',
      auth_required INTEGER DEFAULT 0,
      parameters TEXT DEFAULT '[]',
      body_keys TEXT DEFAULT '[]',
      object_ids TEXT DEFAULT '[]',
      first_seen TEXT DEFAULT (datetime('now')),
      last_seen TEXT DEFAULT (datetime('now')),
      tested INTEGER DEFAULT 0,
      notes TEXT,
      tags TEXT DEFAULT '[]',
      is_favorite INTEGER DEFAULT 0,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS request_tabs (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT DEFAULT 'New Request',
      method TEXT DEFAULT 'GET',
      url TEXT DEFAULT '',
      query_params TEXT DEFAULT '[]',
      headers TEXT DEFAULT '[]',
      cookies TEXT DEFAULT '[]',
      body TEXT DEFAULT '',
      body_type TEXT DEFAULT 'raw',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS saved_requests (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      tab_id TEXT,
      method TEXT,
      url TEXT,
      headers TEXT DEFAULT '{}',
      body TEXT,
      response_status INTEGER,
      response_headers TEXT DEFAULT '{}',
      response_body TEXT,
      response_time INTEGER,
      response_length INTEGER,
      sent_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS auth_profiles (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'account',
      cookies TEXT DEFAULT '{}',
      auth_header TEXT,
      csrf_token TEXT,
      custom_headers TEXT DEFAULT '{}',
      notes TEXT,
      storage_mode TEXT DEFAULT 'local',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'idea',
      severity TEXT DEFAULT 'medium',
      cvss_score REAL,
      cvss_vector TEXT,
      cwe TEXT,
      owasp_category TEXT,
      asset TEXT,
      endpoint_id TEXT,
      affected_parameter TEXT,
      auth_required INTEGER DEFAULT 0,
      summary TEXT,
      prerequisites TEXT,
      steps TEXT,
      observed_result TEXT,
      expected_result TEXT,
      impact TEXT,
      business_impact TEXT,
      evidence_ids TEXT DEFAULT '[]',
      remediation TEXT,
      "references" TEXT DEFAULT '[]',
      bounty_platform_id TEXT,
      reward REAL,
      submitted_date TEXT,
      resolved_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      finding_id TEXT,
      endpoint_id TEXT,
      filename TEXT,
      file_path TEXT,
      file_type TEXT,
      file_size INTEGER,
      sha256 TEXT,
      description TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      title TEXT,
      content TEXT,
      tags TEXT DEFAULT '[]',
      linked_finding_id TEXT,
      linked_endpoint_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      action TEXT,
      module TEXT,
      target TEXT,
      description TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payloads (
      id TEXT PRIMARY KEY,
      category TEXT,
      subcategory TEXT,
      name TEXT,
      value TEXT,
      description TEXT,
      tags TEXT DEFAULT '[]',
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      template TEXT,
      category TEXT,
      title TEXT,
      description TEXT,
      status TEXT DEFAULT 'not-started',
      notes TEXT,
      evidence_ids TEXT DEFAULT '[]',
      linked_finding_id TEXT,
      linked_endpoint_id TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS jwt_history (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      raw_token TEXT,
      header TEXT,
      payload TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recon_hosts (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      host TEXT,
      ip TEXT,
      asn TEXT,
      cdn TEXT,
      technology TEXT DEFAULT '[]',
      status TEXT,
      http_title TEXT,
      notes TEXT,
      tags TEXT DEFAULT '[]',
      source TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      finding_id TEXT,
      type TEXT DEFAULT 'hackerone',
      content TEXT,
      generated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      owasp_id TEXT,
      category TEXT,
      test_name TEXT,
      status TEXT DEFAULT 'not-started',
      notes TEXT,
      evidence_ids TEXT DEFAULT '[]',
      linked_finding_id TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );
  `);

  // Seed default payloads if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM payloads').get();
  if (count.c === 0) {
    seedPayloads(db);
  }

  return dbPath;
}

function seedPayloads(db: any) {
  const insert = db.prepare(`INSERT OR IGNORE INTO payloads (id, category, subcategory, name, value, description, tags) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const payloads = [
    ['p1','XSS Probes','Basic','Script Alert','<script>alert(1)</script>','Basic XSS test string','[]'],
    ['p2','XSS Probes','Basic','Image onerror','<img src=x onerror=alert(1)>','Image-based XSS','[]'],
    ['p3','XSS Probes','Basic','SVG','<svg onload=alert(1)>','SVG-based XSS','[]'],
    ['p4','XSS Probes','Encoded','HTML Entity','&lt;script&gt;alert(1)&lt;/script&gt;','HTML-encoded XSS probe','[]'],
    ['p5','SQL Probes','Basic','Single Quote','\'','SQL injection probe','[]'],
    ['p6','SQL Probes','Basic','Comment','\'--','SQL comment probe','[]'],
    ['p7','SQL Probes','Basic','OR True','1 OR 1=1','SQL OR condition probe','[]'],
    ['p8','SQL Probes','Boolean','Sleep (MySQL)','1 AND SLEEP(5)','Time-based SQL probe','[]'],
    ['p9','Path Traversal','Basic','Dot-Dot','../../../etc/passwd','Path traversal probe','[]'],
    ['p10','Path Traversal','Encoded','URL Encoded','..%2F..%2F..%2Fetc%2Fpasswd','URL-encoded traversal','[]'],
    ['p11','SSRF Probes','Localhost','IPv4 Localhost','http://127.0.0.1/','SSRF localhost probe','[]'],
    ['p12','SSRF Probes','Localhost','IPv6 Localhost','http://[::1]/','IPv6 SSRF probe','[]'],
    ['p13','SSTI Probes','Generic','Math Expression','{{7*7}}','Generic SSTI probe','[]'],
    ['p14','SSTI Probes','Jinja2','Jinja2 Config','{{config}}','Jinja2 SSTI probe','[]'],
    ['p15','Open Redirect','Basic','Absolute URL','https://evil.example.com','Open redirect probe','[]'],
    ['p16','Open Redirect','Protocol','Protocol-relative','//evil.example.com','Protocol-relative redirect','[]'],
    ['p17','Header Injection','CRLF','CRLF Injection','%0d%0aHeader: injected','CRLF header injection','[]'],
    ['p18','Host Header','Basic','Arbitrary Host','evil.example.com','Host header injection probe','[]'],
    ['p19','JSON Probes','Type Juggling','Boolean True','"true"','JSON boolean type probe','[]'],
    ['p20','JSON Probes','Type Juggling','Array Wrap','["value"]','JSON array wrapping probe','[]'],
    ['p21','NoSQL Probes','MongoDB','Always True','{"$gt":""}','MongoDB NoSQL injection','[]'],
    ['p22','NoSQL Probes','MongoDB','Where Clause','{"$where":"sleep(1000)"}','MongoDB where injection','[]'],
    ['p23','Unicode Probes','Normalization','Overlong Slash','%c0%af','Unicode normalization probe','[]'],
    ['p24','File Upload','Extension','PHP Extension','.php','PHP extension test','[]'],
    ['p25','File Upload','Extension','JSP Extension','.jsp','JSP extension test','[]'],
  ];
  for (const p of payloads) {
    insert.run(...p);
  }
}

// ── HTTP Request Handler ──────────────────────────────────────────────────────
async function sendHttpRequest(options: any) {
  const axios = require('axios');
  const https = require('https');
  
  const { method, url, headers, body, timeout, followRedirects, proxy } = options;
  
  const startTime = Date.now();
  
  const axiosConfig: any = {
    method: method || 'GET',
    url,
    headers: headers || {},
    timeout: timeout || 30000,
    maxRedirects: followRedirects === false ? 0 : 10,
    validateStatus: () => true,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    decompress: true,
  };
  
  if (body && !['GET', 'HEAD', 'OPTIONS'].includes(method?.toUpperCase())) {
    axiosConfig.data = body;
  }
  
  if (proxy?.host) {
    const HttpsProxyAgent = require('https-proxy-agent');
    axiosConfig.httpsAgent = new HttpsProxyAgent(`${proxy.protocol || 'http'}://${proxy.host}:${proxy.port}`);
    axiosConfig.httpAgent = axiosConfig.httpsAgent;
  }
  
  try {
    const response = await axios(axiosConfig);
    const elapsed = Date.now() - startTime;
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : String(response.data || ''),
      time: elapsed,
      length: Buffer.byteLength(typeof response.data === 'string' ? response.data : JSON.stringify(response.data || '')),
    };
  } catch (err: any) {
    return {
      error: true,
      message: err.message || 'Request failed',
      code: err.code,
    };
  }
}

// ── Window ────────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1200,
    minHeight: 720,
    backgroundColor: '#0a0d14',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0d14',
      symbolColor: '#00d4ff',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../assets/icon.png').replace(/\.png$/, process.platform === 'win32' ? '.ico' : '.png'),
    show: false,
  });

  Menu.setApplicationMenu(null);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App Events ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  const dbPath = initDb();
  
  // IPC: DB operations
  ipcMain.handle('db:run', (_e, sql: string, params: any[]) => {
    try {
      const stmt = db.prepare(sql);
      return { success: true, result: stmt.run(...(params || [])) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:get', (_e, sql: string, params: any[]) => {
    try {
      const stmt = db.prepare(sql);
      return { success: true, result: stmt.get(...(params || [])) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:all', (_e, sql: string, params: any[]) => {
    try {
      const stmt = db.prepare(sql);
      return { success: true, result: stmt.all(...(params || [])) };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db:path', () => dbPath);

  // IPC: HTTP requests
  ipcMain.handle('http:send', async (_e, options: any) => {
    return sendHttpRequest(options);
  });

  // IPC: File operations
  ipcMain.handle('file:save', async (_e, options: any) => {
    const { defaultPath, content, filters } = options;
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath,
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });

  ipcMain.handle('file:open', async (_e, options: any) => {
    const { filters, multiple } = options;
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: [multiple ? 'multiSelections' : 'openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const files = result.filePaths.map((fp) => ({
        path: fp,
        name: path.basename(fp),
        content: fs.readFileSync(fp, 'utf-8'),
      }));
      return { success: true, files };
    }
    return { success: false, files: [] };
  });

  ipcMain.handle('file:read', (_e, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:saveEvidence', async (_e, options: any) => {
    const { sourcePath, destDir, filename } = options;
    const userDataPath = app.getPath('userData');
    const evidencePath = path.join(userDataPath, 'evidence', destDir || '');
    if (!fs.existsSync(evidencePath)) fs.mkdirSync(evidencePath, { recursive: true });
    const destPath = path.join(evidencePath, filename);
    fs.copyFileSync(sourcePath, destPath);
    return { success: true, path: destPath };
  });

  ipcMain.handle('file:openExternal', (_e, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle('app:getPath', (_e, name: string) => {
    return app.getPath(name as any);
  });

  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('db:backup', async () => {
    const userDataPath = app.getPath('userData');
    const backupDir = path.join(userDataPath, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `bountyscope-backup-${Date.now()}.db`);
    await db.backup(backupPath);
    return { success: true, path: backupPath };
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
