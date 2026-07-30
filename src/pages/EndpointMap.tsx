import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { Upload, Plus, Search, FlaskConical, Copy, Tag, Star, StarOff, CheckSquare } from 'lucide-react';

interface Endpoint {
  id: string; host: string; method: string; path: string; full_url: string;
  status_code?: number; content_type?: string; response_length?: number;
  source: string; auth_required: number; tested: number; notes?: string;
  tags: string; is_favorite: number;
}

const METHOD_COLORS: Record<string, string> = {
  GET:'var(--green)', POST:'var(--cyan)', PUT:'var(--amber)', PATCH:'var(--amber)',
  DELETE:'var(--red)', OPTIONS:'var(--purple)', HEAD:'var(--text-muted)',
};

function parseHAR(content: string, projectId: string): any[] {
  const data = JSON.parse(content);
  const entries = data.log?.entries || [];
  const results = [];
  for (const entry of entries) {
    const req = entry.request;
    if (!req) continue;
    try {
      const url = new URL(req.url);
      const headers: Record<string, string> = {};
      for (const h of req.headers || []) headers[h.name.toLowerCase()] = h.value;
      results.push({
        id: newId(), project_id: projectId,
        host: url.hostname, method: req.method,
        path: url.pathname + url.search, full_url: req.url,
        status_code: entry.response?.status,
        content_type: entry.response?.content?.mimeType?.split(';')[0],
        response_length: entry.response?.content?.size,
        source: 'har', auth_required: headers['authorization'] ? 1 : 0,
        tested: 0, first_seen: nowISO(), last_seen: nowISO(),
        tags: '[]', is_favorite: 0,
      });
    } catch {}
  }
  return results;
}

function parseCurl(curl: string, projectId: string): any | null {
  try {
    const urlMatch = curl.match(/curl\s+(?:'([^']+)'|"([^"]+)"|(\S+))/);
    const url = urlMatch?.[1] || urlMatch?.[2] || urlMatch?.[3];
    if (!url) return null;
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const methodMatch = curl.match(/-X\s+'?(\w+)'?/i);
    const method = methodMatch?.[1]?.toUpperCase() || 'GET';
    return {
      id: newId(), project_id: projectId,
      host: parsed.hostname, method, path: parsed.pathname + parsed.search,
      full_url: url, source: 'curl', auth_required: curl.includes('Authorization:') ? 1 : 0,
      tested: 0, first_seen: nowISO(), last_seen: nowISO(), tags: '[]', is_favorite: 0,
    };
  } catch { return null; }
}

export default function EndpointMap() {
  const { activeProject, setActiveTab, logActivity } = useApp();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importType, setImportType] = useState<'har'|'curl'|'url'>('url');
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!activeProject) { setEndpoints([]); return; }
    const res = await db.all('SELECT * FROM endpoints WHERE project_id=? ORDER BY host,method,path', [activeProject.id]);
    if (res.success) setEndpoints(res.result);
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const importFile = async () => {
    const api = (window as any).electronAPI;
    if (!api || !activeProject) return;
    const filters = importType === 'har'
      ? [{ name: 'HAR', extensions: ['har','json'] }]
      : [{ name: 'Text', extensions: ['txt'] }];
    const res = await api.fileOpen({ filters });
    if (!res.success || !res.files.length) return;
    const content = res.files[0].content;
    let rows: any[] = [];
    if (importType === 'har') {
      try { rows = parseHAR(content, activeProject.id); } catch { alert('Invalid HAR file'); return; }
    } else {
      const lines = content.split('\n').map((l: string) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const ep = parseCurl(line.startsWith('curl') ? line : `curl '${line}'`, activeProject.id);
        if (ep) rows.push(ep);
      }
    }
    let imported = 0;
    for (const r of rows) {
      const res2 = await db.run(
        `INSERT OR IGNORE INTO endpoints (id,project_id,host,method,path,full_url,status_code,content_type,response_length,source,auth_required,tested,first_seen,last_seen,tags,is_favorite) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [r.id,r.project_id,r.host,r.method,r.path,r.full_url,r.status_code,r.content_type,r.response_length,r.source,r.auth_required,r.tested,r.first_seen,r.last_seen,r.tags,r.is_favorite]
      );
      if (res2.success) imported++;
    }
    await logActivity('endpoints_imported', 'EndpointMap', `Imported ${imported} endpoints from ${importType.toUpperCase()}`);
    alert(`Imported ${imported} endpoint${imported !== 1 ? 's' : ''}`);
    load(); setShowImport(false); setImportText('');
  };

  const importPasted = async () => {
    if (!activeProject || !importText.trim()) return;
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    let rows: any[] = [];
    for (const line of lines) {
      if (importType === 'curl') {
        const ep = parseCurl(line, activeProject.id);
        if (ep) rows.push(ep);
      } else {
        try {
          const url = line.startsWith('http') ? line : `https://${line}`;
          const parsed = new URL(url);
          rows.push({ id: newId(), project_id: activeProject.id, host: parsed.hostname, method: 'GET', path: parsed.pathname + parsed.search, full_url: url, source: 'manual', auth_required: 0, tested: 0, first_seen: nowISO(), last_seen: nowISO(), tags: '[]', is_favorite: 0 });
        } catch {}
      }
    }
    let imported = 0;
    for (const r of rows) {
      const res2 = await db.run(`INSERT OR IGNORE INTO endpoints (id,project_id,host,method,path,full_url,source,auth_required,tested,first_seen,last_seen,tags,is_favorite) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [r.id,r.project_id,r.host,r.method,r.path,r.full_url,r.source,r.auth_required,r.tested,r.first_seen,r.last_seen,r.tags,r.is_favorite]);
      if (res2.success) imported++;
    }
    alert(`Added ${imported} endpoint${imported !== 1?'s':''}`);
    load(); setShowImport(false); setImportText('');
  };

  const toggleFav = async (ep: Endpoint) => {
    await db.run('UPDATE endpoints SET is_favorite=? WHERE id=?', [ep.is_favorite ? 0 : 1, ep.id]);
    load();
  };

  const markTested = async (ids: string[]) => {
    for (const id of ids) await db.run('UPDATE endpoints SET tested=1 WHERE id=?', [id]);
    setSelected([]); load();
  };

  const sendToHttpLab = (ep: Endpoint) => {
    // Store in sessionStorage for HTTP lab to pick up
    sessionStorage.setItem('httplab_import', JSON.stringify({ method: ep.method, url: ep.full_url }));
    setActiveTab('httplab');
  };

  const filtered = endpoints.filter(ep => {
    if (methodFilter && ep.method !== methodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return ep.full_url.toLowerCase().includes(q) || ep.host.toLowerCase().includes(q) || ep.path.toLowerCase().includes(q);
    }
    return true;
  });

  const methods = [...new Set(endpoints.map(e => e.method))].sort();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Endpoint Map</div>
          <div className="page-subtitle">{endpoints.length} endpoints · {activeProject?.name || 'No project'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 10px' }}>
            <Search size={13} color="var(--text-muted)" />
            <input style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: 200, fontSize: '0.84rem' }}
              placeholder="Search endpoints…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input select" style={{ width: 100 }} value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
            <option value="">All Methods</option>
            {methods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {selected.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => markTested(selected)}>
              <CheckSquare size={13} /> Mark Tested ({selected.length})
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowImport(true)}>
            <Upload size={13} /> Import
          </button>
        </div>
      </div>

      <div className="page-body" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Upload size={40} />
            <h3>No Endpoints</h3>
            <p>Import a HAR file, paste URLs, or capture requests from HTTP Lab</p>
            <button className="btn btn-primary" onClick={() => setShowImport(true)}><Upload size={14} /> Import Endpoints</button>
          </div>
        ) : (
          <div className="table-wrap" style={{ padding: 16 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }}><input type="checkbox" onChange={e => setSelected(e.target.checked ? filtered.map(f=>f.id) : [])} /></th>
                  <th>Method</th><th>Host</th><th>Path</th><th>Status</th>
                  <th>Length</th><th>Source</th><th>Auth</th><th>Tested</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ep => (
                  <tr key={ep.id}>
                    <td><input type="checkbox" checked={selected.includes(ep.id)} onChange={e => setSelected(s => e.target.checked ? [...s, ep.id] : s.filter(x => x !== ep.id))} /></td>
                    <td>
                      <span className="badge" style={{ background: `${METHOD_COLORS[ep.method]}20`, color: METHOD_COLORS[ep.method]||'var(--text-primary)', border: `1px solid ${METHOD_COLORS[ep.method]}40`, fontSize: '0.7rem' }}>
                        {ep.method}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--cyan)' }}>{ep.host}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ep.path}>{ep.path}</td>
                    <td>
                      {ep.status_code && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: ep.status_code < 300 ? 'var(--green)' : ep.status_code < 400 ? 'var(--amber)' : 'var(--red)' }}>
                          {ep.status_code}
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {ep.response_length ? `${(ep.response_length/1024).toFixed(1)}KB` : '—'}
                    </td>
                    <td><span className="badge badge-muted" style={{ fontSize: '0.68rem' }}>{ep.source}</span></td>
                    <td>{ep.auth_required ? <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>Auth</span> : '—'}</td>
                    <td>
                      {ep.tested
                        ? <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>Done</span>
                        : <span className="badge badge-muted" style={{ fontSize: '0.68rem' }}>Not yet</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Send to HTTP Lab" onClick={() => sendToHttpLab(ep)}><FlaskConical size={12} color="var(--cyan)" /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Copy URL" onClick={() => navigator.clipboard.writeText(ep.full_url)}><Copy size={12} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title={ep.is_favorite ? 'Unfavorite' : 'Favorite'} onClick={() => toggleFav(ep)}>
                          {ep.is_favorite ? <Star size={12} color="var(--amber)" fill="var(--amber)" /> : <StarOff size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Import Endpoints</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowImport(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div className="label">Import Type</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['har','curl','url'] as const).map(t => (
                    <button key={t} className={`btn ${importType===t?'btn-primary':'btn-secondary'} btn-sm`} onClick={() => setImportType(t)}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label">Paste {importType === 'har' ? 'HAR JSON' : importType === 'curl' ? 'cURL commands (one per line)' : 'URLs (one per line)'}</div>
                <textarea className="textarea" rows={8} value={importText} onChange={e => setImportText(e.target.value)}
                  placeholder={importType === 'har' ? 'Paste HAR JSON here…' : importType === 'curl' ? "curl 'https://example.com/api/users' -H 'Authorization: Bearer …'" : 'https://example.com/api/v1/users\nhttps://example.com/api/v1/products'} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={importFile}><Upload size={13} /> From File</button>
                <button className="btn btn-primary" onClick={importPasted} disabled={!importText.trim()}>Import Pasted</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
