import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, ChevronRight, FlaskConical, Bug, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const API_TESTS = [
  { id: 'API1', title: 'Broken Object Level Authorization', severity: 'critical', desc: 'API endpoints expose object identifiers and fail to validate whether the requesting user has permission to access the specific object.', where: 'All endpoints returning/modifying objects identified by user-controlled IDs', steps: ['Identify object IDs in API responses','Create two researcher-controlled accounts','Access Account A objects using Account B token','Test all CRUD operations across accounts','Document actual unauthorized data access'], tools: ['Authorization Lab','HTTP Lab','Postman'], evidence: 'Request with Account B token accessing Account A object, full response showing Account A\'s data', remediation: 'Implement object-level authorization checks server-side for every request' },
  { id: 'API2', title: 'Broken Authentication', severity: 'high', desc: 'Authentication mechanisms are implemented incorrectly, allowing attackers to compromise authentication tokens or to exploit implementation flaws.', where: 'Login endpoints, token refresh, authentication flow', steps: ['Test token expiration enforcement','Test token reuse after logout','Verify refresh token behavior','Check for token leakage in logs/headers'], tools: ['JWT Lab','HTTP Lab','Session Lab'], evidence: 'Expired/revoked token accepted by server', remediation: 'Implement proper token validation, enforce expiration, revoke tokens on logout' },
  { id: 'API3', title: 'Broken Object Property Level Authorization', severity: 'high', desc: 'API returns more data properties than needed, or allows modification of more properties than intended.', where: 'API responses, update endpoints (PATCH/PUT)', steps: ['Inspect all object properties returned','Compare properties visible to different roles','Test adding extra properties to update requests','Check if admin/internal properties can be read or set'], tools: ['HTTP Lab','Parameter Lab'], evidence: 'Sensitive property returned in response or accepted in write', remediation: 'Filter returned properties by role, whitelist accepted properties' },
  { id: 'API4', title: 'Unrestricted Resource Consumption', severity: 'medium', desc: 'API does not restrict the size or frequency of requests, leading to potential service degradation.', where: 'File upload endpoints, search endpoints, batch operations', steps: ['Review rate limiting headers','Test pagination on large datasets','Check file size limits on uploads','Review batch operation limits'], tools: ['HTTP Lab'], evidence: 'Rate limit headers, response times under load', remediation: 'Implement rate limiting, resource quotas, request size limits' },
  { id: 'API5', title: 'Broken Function Level Authorization', severity: 'high', desc: 'API fails to properly restrict access to functions based on user roles or permissions.', where: 'Admin endpoints, privileged operations, hidden functionality', steps: ['Identify admin/privileged endpoints from JS source','Test admin endpoints with regular user token','Test regular endpoints with admin-only parameters','Compare responses with different roles'], tools: ['HTTP Lab','Authorization Lab'], evidence: 'Admin function accessible with regular user token', remediation: 'Enforce function-level authorization on every endpoint server-side' },
  { id: 'API6', title: 'Unrestricted Access to Sensitive Business Flows', severity: 'medium', desc: 'API exposes sensitive business workflows without adequate protection against automated or excessive use.', where: 'Voting, coupon, checkout, referral, rate-sensitive workflows', steps: ['Map high-value business flows','Identify anti-automation controls','Test if controls can be bypassed','Review business logic constraints'], tools: ['HTTP Lab'], evidence: 'Business flow executable repeatedly without restriction', remediation: 'Implement CAPTCHA, rate limiting, business-logic state checks' },
  { id: 'API7', title: 'Server Side Request Forgery', severity: 'high', desc: 'API fetches remote resources based on user-supplied input without validating the URL.', where: 'Webhook URLs, import URLs, profile image URLs, document fetch, callback fields', steps: ['Identify URL-fetching parameters','Test with internal IPs (127.0.0.1, 169.254.169.254)','Use researcher-controlled callback server','Observe server-initiated connections'], tools: ['HTTP Lab','Burp Collaborator alternative'], evidence: 'DNS/HTTP callback from server to researcher-controlled infrastructure', remediation: 'Whitelist allowed URL schemes/domains, block private IP ranges, validate URLs server-side' },
  { id: 'API8', title: 'Security Misconfiguration', severity: 'medium', desc: 'Missing security hardening, verbose errors, unnecessary HTTP methods, or overly permissive CORS.', where: 'All endpoints, response headers, error handling, CORS configuration', steps: ['Review CORS headers for overly permissive origins','Test all HTTP methods on endpoints','Trigger errors and review verbosity','Check for exposed debug/documentation endpoints'], tools: ['HTTP Lab','Burp Suite'], evidence: 'Verbose error showing stack trace, CORS allowing * with credentials', remediation: 'Harden CORS, implement generic error messages, disable unused HTTP methods' },
  { id: 'API9', title: 'Improper Inventory Management', severity: 'low', desc: 'Outdated or undocumented API versions remain accessible and lack security updates.', where: '/api/v1/, /api/v2/, /api/legacy/, staging endpoints', steps: ['Test for older API versions','Look for version indicators in JS files','Check Wayback Machine for old API paths','Test deprecated endpoints'], tools: ['gau','waybackurls','HTTP Lab'], evidence: 'Old API version accepting requests, missing security controls from new version', remediation: 'Maintain API inventory, decommission old versions, enforce authentication on all versions' },
  { id: 'API10', title: 'Unsafe Consumption of APIs', severity: 'medium', desc: 'Application blindly trusts data from third-party APIs without validation.', where: 'Integration points with external APIs, webhook receivers, third-party data consumers', steps: ['Identify third-party API integrations','Analyze trust boundaries','Test if third-party data is validated before use','Check redirect/URL handling from third-party responses'], tools: ['HTTP Lab'], evidence: 'Unvalidated third-party data causing injection or unexpected behavior', remediation: 'Validate and sanitize all external data, implement strict input validation' },
];

const SEV_COLORS: Record<string, string> = { critical: 'sev-critical', high: 'sev-high', medium: 'sev-medium', low: 'sev-low' };

export default function ApiLab() {
  const { setActiveTab } = useApp();
  const [selected, setSelected] = useState<typeof API_TESTS[0] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">API Testing Lab</div><div className="page-subtitle">OWASP API Security Top 10 — Interactive Testing Guide</div></div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* List */}
        <div style={{ width: 280, borderRight: '1px solid var(--border)', overflow: 'auto', padding: 8 }}>
          {API_TESTS.map(t => (
            <div key={t.id} onClick={() => setSelected(t)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius)', cursor: 'pointer', background: selected?.id === t.id ? 'var(--bg-active)' : 'transparent', marginBottom: 3, border: `1px solid ${selected?.id === t.id ? 'var(--cyan)' : 'transparent'}` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                <span className="badge badge-muted" style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>{t.id}</span>
                <span className={`badge ${SEV_COLORS[t.severity]}`} style={{ fontSize: '0.65rem' }}>{t.severity}</span>
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: selected?.id === t.id ? 'var(--cyan)' : 'var(--text-primary)', lineHeight: 1.3 }}>{t.title}</div>
              {statuses[t.id] && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{statuses[t.id]}</div>}
            </div>
          ))}
        </div>

        {/* Detail */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {!selected ? (
            <div className="empty-state"><Globe size={40}/><h3>Select an API Test</h3><p>Choose from OWASP API Security Top 10 to view detailed testing guidance.</p></div>
          ) : (
            <div style={{ maxWidth: 720 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <span className="badge badge-muted" style={{ fontFamily: 'var(--font-mono)' }}>{selected.id}</span>
                <span className={`badge ${SEV_COLORS[selected.severity]}`}>{selected.severity}</span>
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>{selected.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16, lineHeight: 1.6 }}>{selected.desc}</div>

              <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {['not-started','testing','passed','potential-issue','confirmed'].map(s => (
                  <button key={s} className={`btn btn-sm ${statuses[selected.id]===s?'btn-primary':'btn-secondary'}`} onClick={() => setStatuses(st => ({...st,[selected.id]:s}))}>
                    {s.replace(/-/g,' ')}
                  </button>
                ))}
                <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setActiveTab('httplab')}><FlaskConical size={12}/> HTTP Lab</button>
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('findings')}><Bug size={12}/> Create Finding</button>
              </div>

              {[
                { title: '📍 Where to Look', content: selected.where },
                { title: '🔧 Test Steps', content: selected.steps.map((s, i) => `${i+1}. ${s}`).join('\n') },
                { title: '🛠 Tools', content: selected.tools.join(', ') },
                { title: '📋 Evidence Required', content: selected.evidence },
                { title: '🔧 Remediation', content: selected.remediation },
              ].map(({ title, content }) => (
                <div key={title} style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--cyan)', marginBottom: 6 }}>{title}</div>
                  <div className="code-block" style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'var(--font-ui)' }}>{content}</div>
                </div>
              ))}

              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Notes</div>
                <textarea className="textarea" rows={3} value={notes[selected.id]||''} onChange={e => setNotes(n => ({...n,[selected.id]:e.target.value}))} placeholder="Testing notes for this category…" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
