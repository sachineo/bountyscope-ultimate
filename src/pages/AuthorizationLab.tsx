import React, { useState } from 'react';
import { Shield, Plus, Send, Eye, EyeOff, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { httpClient } from '../lib/db';

interface Profile { id: string; name: string; cookies: string; authHeader: string; csrfToken: string; customHeaders: string; }
interface ReplayResult { profileId: string; profileName: string; status?: number; body?: string; headers?: any; time?: number; error?: string; }

const DEFAULT_PROFILES: Profile[] = [
  { id: 'unauth', name: 'Unauthenticated', cookies: '', authHeader: '', csrfToken: '', customHeaders: '' },
  { id: 'account-a', name: 'Account A', cookies: '', authHeader: '', csrfToken: '', customHeaders: '' },
  { id: 'account-b', name: 'Account B', cookies: '', authHeader: '', csrfToken: '', customHeaders: '' },
];

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const la = a.length, lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const shorter = Math.min(la, lb), longer = Math.max(la, lb);
  let matches = 0;
  for (let i = 0; i < shorter; i++) if (a[i] === b[i]) matches++;
  return Math.round((matches / longer) * 100);
}

export default function AuthorizationLab() {
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState('account-a');
  const [showSecrets, setShowSecrets] = useState(false);
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>(['unauth','account-a','account-b']);
  const [results, setResults] = useState<ReplayResult[]>([]);
  const [replaying, setReplaying] = useState(false);
  const [matrixView, setMatrixView] = useState(false);

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  const updateProfile = (id: string, changes: Partial<Profile>) => {
    setProfiles(ps => ps.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  const addProfile = () => {
    const p: Profile = { id: `profile-${Date.now()}`, name: `Account ${profiles.length}`, cookies: '', authHeader: '', csrfToken: '', customHeaders: '' };
    setProfiles(ps => [...ps, p]);
  };

  const replay = async () => {
    if (!url.trim()) return;
    setReplaying(true);
    const toReplay = profiles.filter(p => selectedProfiles.includes(p.id));
    const newResults: ReplayResult[] = [];
    for (const profile of toReplay) {
      const headers: Record<string, string> = {};
      if (profile.authHeader) headers['Authorization'] = profile.authHeader;
      if (profile.csrfToken) headers['X-CSRF-Token'] = profile.csrfToken;
      for (const line of profile.customHeaders.split('\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
      if (profile.cookies) headers['Cookie'] = profile.cookies;
      try {
        const res = await httpClient.send({ method, url, headers, body: body || undefined });
        newResults.push({ profileId: profile.id, profileName: profile.name, status: res.status, body: res.body, headers: res.headers, time: res.time, error: res.error ? res.message : undefined });
      } catch (e: any) {
        newResults.push({ profileId: profile.id, profileName: profile.name, error: e.message });
      }
    }
    setResults(newResults);
    setReplaying(false);
  };

  const baseResult = results[0];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Authorization Lab</div>
          <div className="page-subtitle">Multi-profile request replay — IDOR / BOLA / BFLA testing</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowSecrets(s => !s)}>
            {showSecrets ? <EyeOff size={13} /> : <Eye size={13} />} {showSecrets ? 'Hide' : 'Show'} Secrets
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setMatrixView(m => !m)}>
            {matrixView ? 'Results View' : 'Matrix View'}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Profile panel */}
        <div style={{ width: 240, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Profiles</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={addProfile}><Plus size={13} /></button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            {profiles.map(p => (
              <div key={p.id} onClick={() => setActiveProfileId(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius)', cursor: 'pointer', background: activeProfileId === p.id ? 'var(--bg-active)' : 'transparent', marginBottom: 2 }}>
                <input type="checkbox" checked={selectedProfiles.includes(p.id)}
                  onChange={e => setSelectedProfiles(s => e.target.checked ? [...s, p.id] : s.filter(x => x !== p.id))}
                  onClick={e => e.stopPropagation()} />
                <div style={{ flex: 1, fontSize: '0.84rem', color: activeProfileId === p.id ? 'var(--cyan)' : 'var(--text-primary)', fontWeight: activeProfileId === p.id ? 600 : 400 }}>{p.name}</div>
              </div>
            ))}
          </div>
          {/* Profile editor */}
          {activeProfile && (
            <div style={{ padding: 12, borderTop: '1px solid var(--border)', overflow: 'auto', maxHeight: 320 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Editing: {activeProfile.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                  <div className="label">Name</div>
                  <input className="input" style={{ padding: '4px 8px' }} value={activeProfile.name} onChange={e => updateProfile(activeProfile.id, { name: e.target.value })} />
                </div>
                <div>
                  <div className="label">Cookie</div>
                  <input className="input input-mono" style={{ padding: '4px 8px', fontSize: '0.75rem' }} type={showSecrets ? 'text' : 'password'} value={activeProfile.cookies} onChange={e => updateProfile(activeProfile.id, { cookies: e.target.value })} placeholder="session=abc; csrf=xyz" />
                </div>
                <div>
                  <div className="label">Authorization Header</div>
                  <input className="input input-mono" style={{ padding: '4px 8px', fontSize: '0.75rem' }} type={showSecrets ? 'text' : 'password'} value={activeProfile.authHeader} onChange={e => updateProfile(activeProfile.id, { authHeader: e.target.value })} placeholder="Bearer eyJ…" />
                </div>
                <div>
                  <div className="label">CSRF Token</div>
                  <input className="input input-mono" style={{ padding: '4px 8px', fontSize: '0.75rem' }} type={showSecrets ? 'text' : 'password'} value={activeProfile.csrfToken} onChange={e => updateProfile(activeProfile.id, { csrfToken: e.target.value })} placeholder="token value" />
                </div>
                <div>
                  <div className="label">Custom Headers</div>
                  <textarea className="textarea" rows={3} style={{ fontSize: '0.75rem' }} value={activeProfile.customHeaders} onChange={e => updateProfile(activeProfile.id, { customHeaders: e.target.value })} placeholder="X-Custom: value" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Request config */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <select className="input select" style={{ width: 90 }} value={method} onChange={e => setMethod(e.target.value)}>
              {['GET','POST','PUT','PATCH','DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input input-mono" style={{ flex: 1 }} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/api/resource/OBJECT_ID" />
            <button className="btn btn-primary" onClick={replay} disabled={replaying || !url.trim()}>
              {replaying ? 'Replaying…' : <><Send size={13} /> Replay All</>}
            </button>
          </div>
          {method !== 'GET' && (
            <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <textarea className="textarea" rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder='{"param":"value"}' style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
            </div>
          )}

          {/* Guidance banner */}
          <div style={{ padding: '8px 16px', background: 'rgba(0,212,255,0.04)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Info size={14} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--cyan)' }}>Important:</strong> Only test with <strong>researcher-controlled accounts and objects</strong>. Same status alone ≠ vulnerability. Same body length alone ≠ vulnerability. Confirm actual unauthorized access to data you control.
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {results.length === 0 ? (
              <div className="empty-state">
                <Shield size={36} />
                <h3>No Results Yet</h3>
                <p>Configure profiles with their credentials, set the target endpoint, and click Replay All.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.map((r, i) => {
                  const sim = baseResult && !r.error ? similarity(baseResult.body||'', r.body||'') : null;
                  return (
                    <div key={r.profileId} className="card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontWeight: 700, color: i === 0 ? 'var(--cyan)' : 'var(--text-primary)' }}>{r.profileName}</div>
                          {i === 0 && <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>BASELINE</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          {r.status && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: r.status < 300 ? 'var(--green)' : r.status < 400 ? 'var(--amber)' : 'var(--red)' }}>{r.status}</span>}
                          {r.time && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.time}ms</span>}
                          {sim !== null && i > 0 && (
                            <span style={{ fontSize: '0.78rem', color: sim > 90 ? 'var(--green)' : sim > 50 ? 'var(--amber)' : 'var(--red)', fontWeight: 600 }}>
                              {sim}% similar
                            </span>
                          )}
                        </div>
                      </div>
                      {r.error ? (
                        <div style={{ color: 'var(--red)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>{r.error}</div>
                      ) : (
                        <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-secondary)', margin: 0 }}>
                          {r.body?.slice(0, 2000)}{(r.body?.length||0) > 2000 ? '…' : ''}
                        </pre>
                      )}
                    </div>
                  );
                })}

                {/* Interpretation guide */}
                <div className="card" style={{ background: 'rgba(255,171,0,0.04)', borderColor: 'rgba(255,171,0,0.2)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--amber)', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <AlertTriangle size={14} /> Interpretation Guide
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>✓ To confirm IDOR: Account B must receive <strong>Account A's actual data</strong> (not just a same-length response)</div>
                    <div>✓ Confirm object belongs to Account A before testing with Account B</div>
                    <div>✓ HTTP 200 alone is NOT a vulnerability if body shows error/empty response</div>
                    <div>✓ For write/delete: verify the action actually succeeded server-side</div>
                    <div>✓ Document: request, response, and explicit proof of unauthorized access</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
