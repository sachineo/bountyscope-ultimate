import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Plus, FlaskConical, Copy, Search, Tag } from 'lucide-react';

const INTERESTING = ['id','uid','user','userId','profileId','accountId','customerId','orderId','cartId','addressId','wishlistId','invoiceId','paymentId','transactionId','couponId','role','admin','redirect','url','uri','callback','file','filename','path','template','search','query','token','key','secret','access','auth','session','csrf'];

function extractParams(req: any): any[] {
  const params: any[] = [];
  // Query params
  try {
    const url = new URL(req.url);
    url.searchParams.forEach((v, k) => {
      params.push({ location: 'query', name: k, value: v, type: guessType(v), interesting: isInteresting(k) });
    });
  } catch {}
  // JSON body
  if (req.body && req.contentType?.includes('json')) {
    try {
      const obj = JSON.parse(req.body);
      flattenObj(obj, '', params, 'body-json');
    } catch {}
  }
  // Form body
  if (req.body && req.contentType?.includes('form')) {
    const parts = req.body.split('&');
    for (const p of parts) {
      const [k, v] = p.split('=');
      if (k) params.push({ location: 'body-form', name: decodeURIComponent(k), value: decodeURIComponent(v||''), type: guessType(v), interesting: isInteresting(k) });
    }
  }
  // Headers
  if (req.headers) {
    for (const [k, v] of Object.entries(req.headers)) {
      if (['cookie','authorization','x-csrf-token','x-api-key'].includes(k.toLowerCase())) {
        params.push({ location: 'header', name: k, value: String(v), type: 'string', interesting: true });
      }
    }
  }
  return params;
}

function flattenObj(obj: any, prefix: string, out: any[], loc: string) {
  for (const [k, v] of Object.entries(obj)) {
    const name = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      flattenObj(v, name, out, loc);
    } else {
      out.push({ location: loc, name, value: String(v), type: guessType(String(v)), interesting: isInteresting(k) });
    }
  }
}

function guessType(v: string): string {
  if (!v) return 'string';
  if (/^\d+$/.test(v)) return 'integer';
  if (/^\d+\.\d+$/.test(v)) return 'float';
  if (/^(true|false)$/i.test(v)) return 'boolean';
  if (/^[0-9a-f-]{36}$/i.test(v)) return 'uuid';
  if (/^[A-Za-z0-9+/=]{20,}$/.test(v)) return 'base64?';
  if (v.startsWith('ey') && v.includes('.')) return 'jwt';
  return 'string';
}

function isInteresting(k: string): boolean {
  const lower = k.toLowerCase().replace(/[_-]/g, '');
  return INTERESTING.some(kw => lower.includes(kw));
}

export default function ParameterLab() {
  const { setActiveTab } = useApp();
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [contentType, setContentType] = useState('application/json');
  const [headers, setHeaders] = useState('');
  const [params, setParams] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [tested, setTested] = useState<Record<number, boolean>>({});

  const extract = () => {
    const headerObj: Record<string, string> = {};
    for (const line of headers.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) headerObj[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    }
    const result = extractParams({ url, body, contentType, headers: headerObj });
    setParams(result);
  };

  const sendToDecoder = (val: string) => {
    sessionStorage.setItem('decoder_input', val);
    setActiveTab('decoder');
  };

  const sendToAuthLab = (p: any) => {
    sessionStorage.setItem('authlab_param', JSON.stringify(p));
    setActiveTab('authlab');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Parameter Lab</div>
          <div className="page-subtitle">Extract and analyze request parameters</div>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Request Input</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div className="label">URL</div>
              <input className="input input-mono" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/api/order?orderId=123&userId=456" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="label">Body</div>
                <textarea className="textarea" rows={5} value={body} onChange={e => setBody(e.target.value)} placeholder={'{"userId":123,"role":"user"}'} />
              </div>
              <div>
                <div className="label">Headers (optional)</div>
                <textarea className="textarea" rows={5} value={headers} onChange={e => setHeaders(e.target.value)} placeholder="Authorization: Bearer …&#10;Cookie: session=abc" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div>
                <div className="label">Content-Type</div>
                <select className="input select" style={{ width: 220 }} value={contentType} onChange={e => setContentType(e.target.value)}>
                  <option value="application/json">application/json</option>
                  <option value="application/x-www-form-urlencoded">form-urlencoded</option>
                  <option value="multipart/form-data">multipart/form-data</option>
                  <option value="application/xml">application/xml</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={extract}><Search size={14} /> Extract Parameters</button>
            </div>
          </div>
        </div>

        {params.length > 0 && (
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Extracted Parameters ({params.length})</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Location</th><th>Name</th><th>Value</th><th>Type</th><th>Interesting</th><th>Tested</th><th>Notes</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {params.map((p, i) => (
                    <tr key={i}>
                      <td><span className="badge badge-muted" style={{ fontSize: '0.68rem' }}>{p.location}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: p.interesting ? 'var(--amber)' : 'var(--text-primary)' }}>
                        {p.name}
                        {p.interesting && <AlertTriangle size={11} color="var(--amber)" style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.value}>{p.value}</td>
                      <td><span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>{p.type}</span></td>
                      <td>{p.interesting ? <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>Yes</span> : '—'}</td>
                      <td>
                        <input type="checkbox" checked={!!tested[i]} onChange={e => setTested(t => ({ ...t, [i]: e.target.checked }))} />
                      </td>
                      <td>
                        <input className="input" style={{ width: 140, padding: '3px 8px' }} value={notes[i]||''} onChange={e => setNotes(n => ({ ...n, [i]: e.target.value }))} placeholder="Notes…" />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Send to Decoder" onClick={() => sendToDecoder(p.value)}><Copy size={11} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Send to Authorization Lab" onClick={() => sendToAuthLab(p)}>
                            <FlaskConical size={11} color="var(--cyan)" />
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Copy value" onClick={() => navigator.clipboard.writeText(p.value)}>
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {params.length === 0 && (
          <div className="empty-state">
            <Search size={36} />
            <h3>No Parameters Extracted</h3>
            <p>Paste a URL, body, and headers above, then click Extract Parameters to identify and analyze all request parameters automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
