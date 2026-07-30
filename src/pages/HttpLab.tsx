import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { httpClient } from '../lib/db';
import { Send, Plus, X, Copy, Download, Upload, ChevronDown, ChevronRight, Save, RefreshCw } from 'lucide-react';

interface Tab { id: string; name: string; method: string; url: string; headers: string; body: string; bodyType: string; }
interface Response { status?: number; statusText?: string; headers?: any; body?: string; time?: number; length?: number; error?: boolean; message?: string; }

const METHODS = ['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD'];
const BODY_TYPES = ['raw','json','form','xml'];
const DEFAULT_HEADERS = 'User-Agent: BountyScope/1.0\nAccept: */*';

function parseRawHttp(raw: string): Partial<Tab> {
  const lines = raw.split('\n');
  const firstLine = lines[0].trim().split(/\s+/);
  const method = firstLine[0] || 'GET';
  const path = firstLine[1] || '/';
  let host = '';
  const headers: string[] = [];
  let i = 1;
  while (i < lines.length && lines[i].trim()) {
    const line = lines[i].trim();
    if (line.toLowerCase().startsWith('host:')) host = line.split(':').slice(1).join(':').trim();
    else headers.push(line);
    i++;
  }
  const body = lines.slice(i + 1).join('\n').trim();
  const url = host ? `https://${host}${path}` : path;
  return { method, url, headers: headers.join('\n'), body };
}

function parseCurlToTab(curl: string): Partial<Tab> {
  const urlMatch = curl.match(/curl\s+(?:-[A-Za-z]+\s+)*['"]?([^'">\s]+)['"]?/);
  const url = urlMatch?.[1] || '';
  const methodMatch = curl.match(/-X\s+['"]?(\w+)['"]?/i);
  const method = methodMatch?.[1]?.toUpperCase() || (curl.includes('-d ') || curl.includes('--data') ? 'POST' : 'GET');
  const headerMatches = [...curl.matchAll(/-H\s+['"]([^'"]+)['"]/g)];
  const headers = headerMatches.map(m => m[1]).join('\n');
  const bodyMatch = curl.match(/(?:-d|--data|--data-raw)\s+['"]([^'"]+)['"]/);
  const body = bodyMatch?.[1] || '';
  return { method, url, headers, body };
}

function buildCurl(tab: Tab): string {
  const headers = tab.headers.split('\n').filter(Boolean).map(h => `-H '${h.trim()}'`).join(' \\\n  ');
  const bodyPart = tab.body && !['GET','HEAD'].includes(tab.method) ? `\\\n  -d '${tab.body.replace(/'/g, "\\'")}'` : '';
  return `curl -X ${tab.method} '${tab.url}' \\\n  ${headers} ${bodyPart}`.trim();
}

export default function HttpLab() {
  const { activeProject, logActivity } = useApp();
  const [tabs, setTabs] = useState<Tab[]>([{
    id: newId(), name: 'Request 1', method: 'GET', url: '',
    headers: DEFAULT_HEADERS, body: '', bodyType: 'raw',
  }]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [sending, setSending] = useState(false);
  const [responseTab, setResponseTab] = useState('pretty');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importType, setImportType] = useState<'curl'|'raw'>('curl');
  const [savedResponse, setSavedResponse] = useState<Response | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const response = responses[activeTabId];

  // Pick up from endpoint map
  useEffect(() => {
    const stored = sessionStorage.getItem('httplab_import');
    if (stored) {
      const data = JSON.parse(stored);
      sessionStorage.removeItem('httplab_import');
      updateTab({ method: data.method, url: data.url });
    }
  }, []);

  const updateTab = useCallback((changes: Partial<Tab>) => {
    setTabs(ts => ts.map(t => t.id === activeTabId ? { ...t, ...changes } : t));
  }, [activeTabId]);

  const newTab = () => {
    const tab: Tab = { id: newId(), name: `Request ${tabs.length + 1}`, method: 'GET', url: '', headers: DEFAULT_HEADERS, body: '', bodyType: 'raw' };
    setTabs(ts => [...ts, tab]);
    setActiveTabId(tab.id);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) return;
    const idx = tabs.findIndex(t => t.id === id);
    setTabs(ts => ts.filter(t => t.id !== id));
    if (activeTabId === id) setActiveTabId(tabs[idx === 0 ? 1 : idx - 1].id);
  };

  const duplicate = () => {
    const tab: Tab = { ...activeTab, id: newId(), name: `${activeTab.name} (copy)` };
    setTabs(ts => [...ts, tab]);
    setActiveTabId(tab.id);
  };

  const send = async () => {
    if (!activeTab.url) return;
    setSending(true);
    try {
      const headerObj: Record<string, string> = {};
      for (const line of activeTab.headers.split('\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) headerObj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
      const res = await httpClient.send({
        method: activeTab.method, url: activeTab.url,
        headers: headerObj,
        body: ['GET','HEAD'].includes(activeTab.method) ? undefined : activeTab.body,
      });
      setResponses(r => ({ ...r, [activeTabId]: res }));
      if (activeProject) {
        await db.run(
          `INSERT INTO saved_requests (id,project_id,tab_id,method,url,headers,body,response_status,response_headers,response_body,response_time,response_length,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [newId(), activeProject.id, activeTabId, activeTab.method, activeTab.url, activeTab.headers, activeTab.body, res.status, JSON.stringify(res.headers||{}), res.body||'', res.time, res.length, nowISO()]
        );
        await logActivity('request_sent', 'HTTP Lab', `${activeTab.method} ${activeTab.url} → ${res.status}`);
      }
    } finally { setSending(false); }
  };

  const doImport = () => {
    const parsed = importType === 'curl' ? parseCurlToTab(importText) : parseRawHttp(importText);
    updateTab(parsed);
    setShowImport(false); setImportText('');
  };

  const formatBody = (body: string, ct: string) => {
    if (!body) return '';
    if (ct?.includes('json') || body.trimStart().startsWith('{') || body.trimStart().startsWith('[')) {
      try { return JSON.stringify(JSON.parse(body), null, 2); } catch {}
    }
    return body;
  };

  const statusColor = (s?: number) => !s ? 'var(--text-muted)' : s < 300 ? 'var(--green)' : s < 400 ? 'var(--amber)' : 'var(--red)';

  const diff = (a: string, b: string) => {
    if (!a || !b) return <div style={{ color: 'var(--text-muted)', padding: 12 }}>No saved response to compare</div>;
    const aLines = a.split('\n'); const bLines = b.split('\n');
    const maxLen = Math.max(aLines.length, bLines.length);
    return (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', lineHeight: 1.6 }}>
        {Array.from({ length: maxLen }, (_, i) => {
          const al = aLines[i] ?? ''; const bl = bLines[i] ?? '';
          const changed = al !== bl;
          return (
            <div key={i} style={{ display: 'flex', background: changed ? 'rgba(255,171,0,0.08)' : 'transparent' }}>
              <span style={{ color: 'var(--red)', width: '50%', padding: '0 8px', borderRight: '1px solid var(--border)' }}>{al}</span>
              <span style={{ color: 'var(--green)', width: '50%', padding: '0 8px' }}>{bl}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page">
      {/* Tab bar */}
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', overflow: 'auto', flexShrink: 0 }}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setActiveTabId(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              cursor: 'pointer', borderBottom: `2px solid ${t.id === activeTabId ? 'var(--cyan)' : 'transparent'}`,
              color: t.id === activeTabId ? 'var(--cyan)' : 'var(--text-muted)',
              whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: 500,
              transition: 'all var(--transition)',
            }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: METHOD_COLORS[t.method]||'var(--text-muted)' }}>{t.method}</span>
            <span>{t.name}</span>
            <button onClick={e => { e.stopPropagation(); closeTab(t.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1, marginLeft: 2 }}>×</button>
          </div>
        ))}
        <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 4, flexShrink: 0 }} onClick={newTab} title="New tab (Ctrl+N)"><Plus size={14} /></button>
      </div>

      {/* Main panels */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Request panel */}
        <div style={{ width: '45%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Method + URL + Send */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <select className="input select" style={{ width: 90 }} value={activeTab.method} onChange={e => updateTab({ method: e.target.value })}>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input input-mono" style={{ flex: 1 }} placeholder="https://example.com/api/…"
              value={activeTab.url} onChange={e => updateTab({ url: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && send()} />
            <button className="btn btn-primary btn-sm" onClick={send} disabled={sending || !activeTab.url}>
              {sending ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, padding: '6px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(true)}><Upload size={12} /> Import</button>
            <button className="btn btn-ghost btn-sm" onClick={duplicate}><Copy size={12} /> Duplicate</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(buildCurl(activeTab))}><Copy size={12} /> cURL</button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const raw = `${activeTab.method} / HTTP/1.1\n${activeTab.headers}\n\n${activeTab.body}`;
              navigator.clipboard.writeText(raw);
            }}><Copy size={12} /> Raw</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSavedResponse(response || null)}>
              <Save size={12} /> Save Response
            </button>
          </div>

          {/* Headers */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Headers</div>
            <textarea className="textarea" style={{ flex: 1, margin: '0 12px', borderRadius: 'var(--radius)', resize: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', border: '1px solid var(--border)' }}
              value={activeTab.headers} onChange={e => updateTab({ headers: e.target.value })} placeholder="Header-Name: value" />

            <div style={{ padding: '6px 12px 4px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>Body</div>
            <div style={{ display: 'flex', gap: 6, padding: '0 12px 6px' }}>
              {BODY_TYPES.map(bt => (
                <button key={bt} className={`btn btn-sm ${activeTab.bodyType === bt ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => updateTab({ bodyType: bt })}>{bt}</button>
              ))}
            </div>
            <textarea className="textarea" style={{ flex: 2, margin: '0 12px 12px', borderRadius: 'var(--radius)', resize: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', border: '1px solid var(--border)' }}
              value={activeTab.body} onChange={e => updateTab({ body: e.target.value })} placeholder={activeTab.bodyType === 'json' ? '{"key": "value"}' : 'Request body…'} />
          </div>
        </div>

        {/* Response panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Status bar */}
          {response && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {response.error ? (
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>Error: {response.message}</span>
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: statusColor(response.status) }}>{response.status}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{response.statusText}</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{response.time}ms</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{response.length ? `${(response.length/1024).toFixed(1)}KB` : ''}</span>
                </>
              )}
            </div>
          )}

          {/* Response tabs */}
          <div className="tab-list" style={{ flexShrink: 0 }}>
            {['pretty','raw','headers','diff'].map(rt => (
              <button key={rt} className={`tab-trigger ${responseTab === rt ? 'active' : ''}`} onClick={() => setResponseTab(rt)}>
                {rt.charAt(0).toUpperCase() + rt.slice(1)}
              </button>
            ))}
            {response && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', marginRight: 8 }} onClick={() => navigator.clipboard.writeText(response.body||'')}><Copy size={12} /> Copy</button>}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {!response ? (
              <div className="empty-state" style={{ paddingTop: 60 }}>
                <Send size={32} />
                <h3>Send a Request</h3>
                <p>Configure your request and click Send to see the response</p>
              </div>
            ) : responseTab === 'headers' ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                {Object.entries(response.headers || {}).map(([k, v]) => (
                  <div key={k} style={{ padding: '4px 0', borderBottom: '1px solid rgba(30,45,66,0.3)' }}>
                    <span style={{ color: 'var(--cyan)' }}>{k}</span>
                    <span style={{ color: 'var(--text-muted)' }}>: </span>
                    <span>{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : responseTab === 'diff' ? (
              diff(savedResponse?.body||'', response.body||'')
            ) : (
              <pre className="select-text" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                {responseTab === 'pretty' ? formatBody(response.body||'', response.headers?.['content-type']||'') : response.body}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Import Request</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowImport(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn btn-sm ${importType==='curl'?'btn-primary':'btn-secondary'}`} onClick={() => setImportType('curl')}>cURL</button>
                <button className={`btn btn-sm ${importType==='raw'?'btn-primary':'btn-secondary'}`} onClick={() => setImportType('raw')}>Raw HTTP</button>
              </div>
              <textarea className="textarea" rows={10} value={importText} onChange={e => setImportText(e.target.value)}
                placeholder={importType === 'curl' ? "curl 'https://example.com/api' -H 'Authorization: Bearer …' -d '{...}'" : "GET /api/users HTTP/1.1\nHost: example.com\nAuthorization: Bearer …"} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={doImport} disabled={!importText.trim()}>Import</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const METHOD_COLORS: Record<string, string> = {
  GET:'var(--green)', POST:'var(--cyan)', PUT:'var(--amber)', PATCH:'var(--amber)',
  DELETE:'var(--red)', OPTIONS:'var(--purple)', HEAD:'var(--text-muted)',
};
