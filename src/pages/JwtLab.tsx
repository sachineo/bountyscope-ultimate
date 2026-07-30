import React, { useState } from 'react';
import { KeyRound, Copy, AlertTriangle, CheckCircle, Info } from 'lucide-react';

function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Not a valid JWT (expected 3 parts)');
    const decode = (s: string) => {
      const pad = s.replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(pad + '=='.slice((2 - pad.length * 3) & 3));
      return JSON.parse(json);
    };
    return { header: decode(parts[0]), payload: decode(parts[1]), signature: parts[2], raw: parts };
  } catch (e: any) {
    return { error: e.message };
  }
}

function checkJwt(header: any, payload: any): string[] {
  const issues: string[] = [];
  if (header.alg === 'none') issues.push('⚠ Algorithm is "none" — no signature verification');
  if (header.alg?.startsWith('HS') && !header.kid) issues.push('ℹ HMAC algorithm without key ID — shared secret in use');
  if (payload.exp) {
    const exp = new Date(payload.exp * 1000);
    if (exp < new Date()) issues.push(`⚠ Token is EXPIRED (${exp.toISOString()})`);
    const lifeHours = ((payload.exp - (payload.iat || 0)) / 3600).toFixed(0);
    if (parseInt(lifeHours) > 24 * 7) issues.push(`ℹ Long-lived token: ${lifeHours}h validity`);
  } else {
    issues.push('⚠ No expiration (exp claim) — token never expires');
  }
  if (!payload.aud) issues.push('ℹ No audience (aud) claim — may be accepted by unintended services');
  if (payload.role || payload.roles || payload.admin || payload.isAdmin) issues.push('ℹ Privilege claim found — verify server validates this server-side');
  if (payload.scope) issues.push('ℹ Scope claim found — verify scope is enforced server-side');
  if (!issues.length) issues.push('✓ No obvious issues detected. Verify server-side key validation.');
  return issues;
}

function fmtDate(ts: number | undefined) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

export default function JwtLab() {
  const [input, setInput] = useState('');
  const [decoded, setDecoded] = useState<any>(null);
  const [editPayload, setEditPayload] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [compareToken, setCompareToken] = useState('');
  const [compareDecoded, setCompareDecoded] = useState<any>(null);

  const decode = () => {
    const result = decodeJwt(input.trim());
    setDecoded(result);
    if (!result.error) setEditPayload(JSON.stringify(result.payload, null, 2));
  };

  const copySection = (section: 'header' | 'payload') => {
    if (!decoded) return;
    navigator.clipboard.writeText(JSON.stringify(decoded[section], null, 2));
  };

  const checks = decoded && !decoded.error ? checkJwt(decoded.header, decoded.payload) : [];

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">JWT Lab</div><div className="page-subtitle">Decode, inspect, and analyze JSON Web Tokens</div></div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="label">JWT Token</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input input-mono" value={input} onChange={e => setInput(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0…" style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={decode} disabled={!input.trim()}><KeyRound size={14} /> Decode</button>
          </div>
        </div>

        {decoded?.error && (
          <div className="card" style={{ borderColor: 'var(--red)', background: 'rgba(255,61,61,0.05)' }}>
            <AlertTriangle size={16} color="var(--red)" />
            <span style={{ color: 'var(--red)', marginLeft: 8 }}>{decoded.error}</span>
          </div>
        )}

        {decoded && !decoded.error && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Header */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>Header</div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copySection('header')}><Copy size={12} /></button>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span className="badge badge-cyan">alg: {decoded.header.alg}</span>
                  <span className="badge badge-muted">typ: {decoded.header.typ}</span>
                  {decoded.header.kid && <span className="badge badge-muted">kid: {decoded.header.kid}</span>}
                </div>
              </div>
              <pre className="code-block select-text" style={{ fontSize: '0.78rem' }}>{JSON.stringify(decoded.header, null, 2)}</pre>
            </div>

            {/* Payload */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 600 }}>Payload</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm btn-sm" onClick={() => setShowEdit(s => !s)}>{showEdit ? 'View' : 'Edit'}</button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copySection('payload')}><Copy size={12} /></button>
                </div>
              </div>
              {/* Standard claims */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10, fontSize: '0.78rem' }}>
                {[
                  { k: 'sub', label: 'Subject', v: decoded.payload.sub },
                  { k: 'iss', label: 'Issuer', v: decoded.payload.iss },
                  { k: 'aud', label: 'Audience', v: decoded.payload.aud },
                  { k: 'exp', label: 'Expires', v: fmtDate(decoded.payload.exp) },
                  { k: 'iat', label: 'Issued', v: fmtDate(decoded.payload.iat) },
                  { k: 'nbf', label: 'Not Before', v: fmtDate(decoded.payload.nbf) },
                  { k: 'jti', label: 'JTI', v: decoded.payload.jti },
                ].map(({ k, label, v }) => v && (
                  <div key={k} style={{ padding: '4px 8px', background: 'var(--bg-base)', borderRadius: 'var(--radius)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(v)}>{String(v)}</div>
                  </div>
                ))}
              </div>
              {showEdit
                ? <textarea className="textarea" rows={8} value={editPayload} onChange={e => setEditPayload(e.target.value)} />
                : <pre className="code-block select-text" style={{ fontSize: '0.78rem' }}>{JSON.stringify(decoded.payload, null, 2)}</pre>
              }
            </div>

            {/* Signature */}
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Signature (Base64URL)</div>
              <div className="code-block select-text" style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>{decoded.signature}</div>
              <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <Info size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Signature validity can only be confirmed by the server. Do not claim a token is valid based on local decoding.
              </div>
            </div>

            {/* Security checks */}
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Security Observations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {checks.map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 8px', background: 'var(--bg-base)', borderRadius: 'var(--radius)', fontSize: '0.82rem' }}>
                    {c.startsWith('⚠') ? <AlertTriangle size={13} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} /> :
                     c.startsWith('✓') ? <CheckCircle size={13} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} /> :
                     <Info size={13} color="var(--blue)" style={{ flexShrink: 0, marginTop: 1 }} />}
                    <span>{c.replace(/^[⚠✓ℹ]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compare */}
            <div className="card" style={{ gridColumn: '1/-1' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Compare with Second Token</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input className="input input-mono" style={{ flex: 1 }} value={compareToken} onChange={e => setCompareToken(e.target.value)} placeholder="Paste second JWT to compare…" />
                <button className="btn btn-secondary" onClick={() => { const d = decodeJwt(compareToken.trim()); setCompareDecoded(d.error ? null : d); }}>Compare</button>
              </div>
              {compareDecoded && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Token 1</div>
                    <pre className="code-block" style={{ fontSize: '0.75rem' }}>{JSON.stringify(decoded.payload, null, 2)}</pre>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Token 2</div>
                    <pre className="code-block" style={{ fontSize: '0.75rem' }}>{JSON.stringify(compareDecoded.payload, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
