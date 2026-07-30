import React, { useState } from 'react';
import { Network, Plus, Send, Copy, History, Info } from 'lucide-react';
import { httpClient } from '../lib/db';

interface GqlEndpoint { url: string; headers: string; }

export default function GraphqlLab() {
  const [endpoint, setEndpoint] = useState<GqlEndpoint>({ url: '', headers: '' });
  const [query, setQuery] = useState('{\n  __schema {\n    types {\n      name\n    }\n  }\n}');
  const [variables, setVariables] = useState('{}');
  const [response, setResponse] = useState('');
  const [history, setHistory] = useState<{ query: string; response: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('query');

  const send = async () => {
    if (!endpoint.url) return;
    setSending(true);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    for (const line of endpoint.headers.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    let vars = {};
    try { vars = JSON.parse(variables); } catch {}
    const body = JSON.stringify({ query, variables: vars });
    const res = await httpClient.send({ method: 'POST', url: endpoint.url, headers, body });
    const responseText = res.error ? `Error: ${res.message}` : res.body || '';
    try {
      const formatted = JSON.stringify(JSON.parse(responseText), null, 2);
      setResponse(formatted);
      setHistory(h => [{ query, response: formatted }, ...h.slice(0, 9)]);
    } catch {
      setResponse(responseText);
    }
    setSending(false);
  };

  const GUIDE_ITEMS = [
    { title: 'Introspection', desc: 'Query __schema to enumerate all types, fields, and operations. Often enabled in dev/staging environments.', query: '{\n  __schema {\n    types {\n      name\n      fields {\n        name\n      }\n    }\n  }\n}' },
    { title: 'Object Authorization', desc: 'Test if you can query another user\'s data by varying object IDs in queries.', query: '{\n  user(id: "ANOTHER_USER_ID") {\n    email\n    profile\n  }\n}' },
    { title: 'Field Level Auth', desc: 'Check if sensitive fields return data regardless of user role.', query: '{\n  currentUser {\n    email\n    adminNotes\n    internalScore\n  }\n}' },
    { title: 'Batch Query Attack', desc: 'Send multiple operations in one request. Do not abuse this — just test if batching is enabled.', query: '[{"query":"{ user(id: 1) { email } }"},{"query":"{ user(id: 2) { email } }"}]' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">GraphQL Lab</div><div className="page-subtitle">GraphQL endpoint testing and exploration</div></div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ width: 260, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
            <div className="label">Endpoint URL</div>
            <input className="input input-mono" style={{ fontSize: '0.8rem' }} value={endpoint.url} onChange={e => setEndpoint(ep => ({...ep, url: e.target.value}))} placeholder="https://api.example.com/graphql" />
            <div className="label" style={{ marginTop: 8 }}>Headers</div>
            <textarea className="textarea" rows={3} style={{ fontSize: '0.78rem' }} value={endpoint.headers} onChange={e => setEndpoint(ep => ({...ep, headers: e.target.value}))} placeholder="Authorization: Bearer …&#10;Cookie: session=…" />
          </div>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Test Templates</div>
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            {GUIDE_ITEMS.map(g => (
              <div key={g.title} style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 6, cursor: 'pointer' }}
                onClick={() => setQuery(g.query)}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 3 }}>{g.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{g.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div className="tab-list" style={{ flex: 1 }}>
              {['query','variables','history'].map(t => (
                <button key={t} className={`tab-trigger ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={send} disabled={sending || !endpoint.url}>
              {sending ? 'Sending…' : <><Send size={13}/> Execute</>}
            </button>
          </div>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
              {activeTab === 'query' && (
                <textarea style={{ flex: 1, background: 'var(--bg-base)', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', padding: 16, resize: 'none', lineHeight: 1.6 }}
                  value={query} onChange={e => setQuery(e.target.value)} />
              )}
              {activeTab === 'variables' && (
                <textarea style={{ flex: 1, background: 'var(--bg-base)', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', padding: 16, resize: 'none', lineHeight: 1.6 }}
                  value={variables} onChange={e => setVariables(e.target.value)} />
              )}
              {activeTab === 'history' && (
                <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                  {history.length === 0 ? <div style={{ color: 'var(--text-muted)', padding: 16 }}>No history yet</div> : history.map((h, i) => (
                    <div key={i} onClick={() => setQuery(h.query)} style={{ padding: '8px 10px', borderRadius: 'var(--radius)', cursor: 'pointer', marginBottom: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {h.query.slice(0, 80)}…
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ overflow: 'auto', padding: 16 }}>
              {!response ? (
                <div className="empty-state" style={{ paddingTop: 40 }}><Network size={28}/><p>Execute a query to see the response</p></div>
              ) : (
                <pre className="select-text" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-primary)', margin: 0 }}>{response}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
