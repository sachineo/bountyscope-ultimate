import React, { useState } from 'react';
import { Wifi, Info, Plus, CheckCircle, AlertTriangle } from 'lucide-react';

const WS_TESTS = [
  { id: 'ws-01', title: 'Authentication on connection', desc: 'Verify WebSocket upgrade requires valid authentication' },
  { id: 'ws-02', title: 'Authorization after connection', desc: 'Verify messages are authorized server-side after connection' },
  { id: 'ws-03', title: 'Cross-user object access', desc: 'Test if you can subscribe to or read another user\'s data' },
  { id: 'ws-04', title: 'Session expiry', desc: 'Verify WS connection closes when session expires' },
  { id: 'ws-05', title: 'Logout behavior', desc: 'Test if WS connection is closed on logout' },
  { id: 'ws-06', title: 'Origin validation', desc: 'Check if WS handshake validates Origin header' },
  { id: 'ws-07', title: 'Input validation', desc: 'Test message content for injection vulnerabilities' },
  { id: 'ws-08', title: 'Sensitive data exposure', desc: 'Review all WS messages for sensitive data broadcast' },
];

export default function WebsocketLab() {
  const [endpoint, setEndpoint] = useState('');
  const [headers, setHeaders] = useState('');
  const [messages, setMessages] = useState<{ dir: string; content: string; time: string }[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [msgInput, setMsgInput] = useState('');

  const addMockMessage = (dir: 'sent' | 'recv') => {
    setMessages(m => [...m, { dir, content: msgInput || (dir === 'recv' ? '{"type":"response","data":{}}' : '{"type":"request","action":"subscribe"}'), time: new Date().toLocaleTimeString() }]);
    if (dir === 'sent') setMsgInput('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">WebSocket Lab</div><div className="page-subtitle">WebSocket endpoint testing and message analysis</div></div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Config */}
        <div style={{ width: 280, borderRight: '1px solid var(--border)', padding: '16px 12px', overflow: 'auto' }}>
          <div className="label">WebSocket URL</div>
          <input className="input input-mono" style={{ fontSize: '0.8rem', marginBottom: 10 }} value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="wss://api.example.com/ws" />
          <div className="label">Headers / Auth</div>
          <textarea className="textarea" rows={3} style={{ fontSize: '0.78rem', marginBottom: 16 }} value={headers} onChange={e => setHeaders(e.target.value)} placeholder="Authorization: Bearer …&#10;Cookie: session=…" />

          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Testing Checklist</div>
          {WS_TESTS.map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(30,45,66,0.3)' }}>
              <select style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer' }}
                value={statuses[t.id]||'—'} onChange={e => setStatuses(s => ({...s,[t.id]:e.target.value}))}>
                {['—','testing','passed','issue','na'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)' }} title={t.desc}>{t.title}</div>
            </div>
          ))}
        </div>

        {/* Message log */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'rgba(0,212,255,0.04)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.8rem' }}>
              <Info size={13} color="var(--cyan)" />
              <span style={{ color: 'var(--text-secondary)' }}>Import WebSocket messages from Burp Suite or browser DevTools → Network → WS. Manually record messages for analysis.</span>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {messages.length === 0 ? (
              <div className="empty-state"><Wifi size={36}/><h3>No Messages</h3><p>Add captured WebSocket messages for analysis</p></div>
            ) : messages.map((m, i) => (
              <div key={i} style={{ padding: '8px 12px', borderRadius: 'var(--radius)', background: m.dir === 'sent' ? 'rgba(0,212,255,0.06)' : 'rgba(0,230,118,0.06)', border: `1px solid ${m.dir === 'sent' ? 'rgba(0,212,255,0.2)' : 'rgba(0,230,118,0.2)'}` }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <span className={`badge ${m.dir === 'sent' ? 'badge-cyan' : 'badge-green'}`} style={{ fontSize: '0.65rem' }}>→ {m.dir.toUpperCase()}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.time}</span>
                </div>
                <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{m.content}</pre>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
            <textarea style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '8px 10px', resize: 'none', outline: 'none', rows: 2 } as any} rows={2}
              value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder='{"type":"event","data":{}}' />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => addMockMessage('sent')}>Add Sent</button>
              <button className="btn btn-secondary btn-sm" onClick={() => addMockMessage('recv')}>Add Recv</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
