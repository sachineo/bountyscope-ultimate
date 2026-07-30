// SessionLab, ApiLab, GraphqlLab, WebsocketLab, FileUploadLab, ReconWorkspace, ToolGuide
// These pages follow the same pattern — interactive guidance + status tracking

import React, { useState } from 'react';
import { Lock, CheckCircle, AlertTriangle, Info, FlaskConical } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SESSION_TESTS = [
  { id: 'sess-01', title: 'Login behavior', desc: 'Verify login returns new session token, old token invalidated', steps: '1. Capture session before login\n2. Login with valid credentials\n3. Compare session token\n4. Verify old token no longer works' },
  { id: 'sess-02', title: 'Logout behavior', desc: 'Verify logout properly invalidates the server-side session', steps: '1. Login and capture session token\n2. Logout\n3. Replay request with old token\n4. Verify server rejects old session' },
  { id: 'sess-03', title: 'Session rotation after privilege change', desc: 'Verify session is rotated when privileges change', steps: '1. Login as regular user\n2. Escalate role (if applicable)\n3. Verify new session issued' },
  { id: 'sess-04', title: 'Session cookie flags', desc: 'Verify HttpOnly, Secure, SameSite flags are set correctly', steps: '1. Inspect Set-Cookie headers after login\n2. Confirm HttpOnly=true\n3. Confirm Secure=true\n4. Check SameSite value' },
  { id: 'sess-05', title: 'Concurrent sessions', desc: 'Test behavior when logging in from multiple locations', steps: '1. Login from two different browsers/sessions\n2. Observe if previous session is invalidated\n3. Test if both sessions remain valid\n4. Document behavior' },
  { id: 'sess-06', title: 'Session timeout', desc: 'Verify idle sessions are invalidated after timeout period', steps: '1. Login and wait for inactivity period\n2. Attempt to use stored session token\n3. Verify server rejects expired session' },
  { id: 'sess-07', title: 'CSRF session binding', desc: 'Verify CSRF tokens are tied to the current session', steps: '1. Capture CSRF token from form\n2. Use CSRF token from another session\n3. Verify server rejects cross-session CSRF' },
  { id: 'sess-08', title: 'Remember-me token analysis', desc: 'Inspect remember-me token entropy and expiration', steps: '1. Login with remember-me option\n2. Capture persistent cookie value\n3. Analyze token entropy\n4. Verify expiration is reasonable' },
];

export default function SessionLab() {
  const { setActiveTab } = useApp();
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [beforeCookies, setBeforeCookies] = useState('');
  const [afterCookies, setAfterCookies] = useState('');
  const [selected, setSelected] = useState<typeof SESSION_TESTS[0] | null>(null);

  const cookieDiff = () => {
    const before = beforeCookies.split(';').map(c => c.trim()).filter(Boolean);
    const after = afterCookies.split(';').map(c => c.trim()).filter(Boolean);
    const added = after.filter(c => !before.some(b => b.split('=')[0] === c.split('=')[0]));
    const removed = before.filter(c => !after.some(a => a.split('=')[0] === c.split('=')[0]));
    const changed = after.filter(c => before.some(b => b.split('=')[0] === c.split('=')[0] && b !== c));
    return { added, removed, changed };
  };

  const diff = cookieDiff();

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Session & Authentication Lab</div><div className="page-subtitle">Systematic session management testing</div></div>
        <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('httplab')}><FlaskConical size={13}/> Open HTTP Lab</button>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Test list */}
        <div style={{ width: 260, borderRight: '1px solid var(--border)', overflow: 'auto', padding: 8 }}>
          {SESSION_TESTS.map(t => (
            <div key={t.id} onClick={() => setSelected(t)}
              style={{ padding: '8px 10px', borderRadius: 'var(--radius)', cursor: 'pointer', background: selected?.id === t.id ? 'var(--bg-active)' : 'transparent', marginBottom: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className={`status-dot ${statuses[t.id] === 'passed' ? 'green' : statuses[t.id] === 'issue' ? 'red' : statuses[t.id] === 'testing' ? '' : 'muted'}`}
                style={{ background: statuses[t.id] === 'testing' ? 'var(--blue)' : undefined }} />
              <div style={{ flex: 1, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected?.id === t.id ? 'var(--cyan)' : 'var(--text-secondary)' }}>{t.title}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {selected ? (
            <div style={{ padding: 24, maxWidth: 700 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>{selected.title}</div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{selected.desc}</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {['not-started','testing','passed','issue','na'].map(s => (
                  <button key={s} className={`btn btn-sm ${statuses[selected.id]===s?'btn-primary':'btn-secondary'}`} onClick={() => setStatuses(st => ({...st,[selected.id]:s}))}>
                    {s.replace(/-/g,' ')}
                  </button>
                ))}
              </div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Steps</div>
                <pre style={{ fontFamily: 'var(--font-ui)', fontSize: '0.84rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{selected.steps}</pre>
              </div>
            </div>
          ) : (
            <div style={{ padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>Cookie Comparison Tool</div>
            </div>
          )}

          {/* Cookie diff tool */}
          <div style={{ padding: '0 24px 24px' }}>
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Before / After Cookie Comparison</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div className="label">Before (e.g. pre-login cookies)</div>
                  <textarea className="textarea" rows={3} value={beforeCookies} onChange={e => setBeforeCookies(e.target.value)} placeholder="session=abc; csrf=123" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
                </div>
                <div>
                  <div className="label">After (e.g. post-login cookies)</div>
                  <textarea className="textarea" rows={3} value={afterCookies} onChange={e => setAfterCookies(e.target.value)} placeholder="session=xyz; csrf=456; auth=true" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} />
                </div>
              </div>
              {(diff.added.length > 0 || diff.removed.length > 0 || diff.changed.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.82rem' }}>
                  {diff.added.map((c, i) => <div key={i} style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>+ {c}</div>)}
                  {diff.removed.map((c, i) => <div key={i} style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>- {c}</div>)}
                  {diff.changed.map((c, i) => <div key={i} style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>~ {c}</div>)}
                </div>
              )}
              {!beforeCookies && !afterCookies && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Paste cookie values above to compare before and after authentication</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
