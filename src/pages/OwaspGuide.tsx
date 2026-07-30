import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { BookOpen, CheckCircle, XCircle, AlertTriangle, FlaskConical, Bug, ChevronRight, ChevronDown } from 'lucide-react';

const OWASP_TESTS = [
  {
    category: 'Information Gathering',
    tests: [
      {
        id: 'OTG-INFO-001', name: 'Conduct Search Engine Discovery',
        objective: 'Identify information about the target leaked via search engines.',
        where: 'Google dorks, Shodan, Censys, Github searches',
        steps: ['Search for "site:target.com"','Search for "filetype:pdf site:target.com"','Search GitHub for target org code','Check Shodan for exposed services'],
        tools: ['Google','Shodan','Censys','theHarvester','GitHub dorking'],
        fp: 'Cached/indexed data may not reflect current state',
        impact: 'Credential exposure, API key leaks, internal path disclosure',
        remediation: 'Remove sensitive files from public repos, use robots.txt, purge search caches',
      },
      {
        id: 'OTG-INFO-004', name: 'Enumerate Application Entry Points',
        objective: 'Map all user-visible and hidden application entry points.',
        where: 'All form inputs, API endpoints, file uploads, WebSocket connections, GraphQL endpoints',
        steps: ['Spider the application','Capture all form actions','Map all API endpoints from JS files','Search for hidden directories'],
        tools: ['Burp Suite','katana','gau','waybackurls','hakrawler'],
        fp: 'Third-party widgets may appear as entry points',
        impact: 'Missed attack surface',
        remediation: 'Maintain accurate API documentation and deprecate unused endpoints',
      },
    ],
  },
  {
    category: 'Authentication',
    tests: [
      {
        id: 'OTG-AUTHN-001', name: 'Testing for Credentials Transported over Encrypted Channel',
        objective: 'Verify authentication credentials are only transmitted over HTTPS.',
        where: 'Login forms, API authentication endpoints, mobile API calls',
        steps: ['Intercept login request','Check protocol used','Verify HSTS header','Test HTTP → HTTPS redirect on login'],
        tools: ['Burp Suite','curl','Wireshark'],
        fp: 'Localhost/dev environments may legitimately use HTTP',
        impact: 'Credential interception via MitM',
        remediation: 'Enforce HTTPS for all authentication endpoints, enable HSTS',
      },
      {
        id: 'OTG-AUTHN-003', name: 'Testing for Weak Lock Out Mechanism',
        objective: 'Determine if account lockout is implemented and effective.',
        where: 'Login endpoint, password reset, OTP verification',
        steps: ['Submit incorrect credentials multiple times','Observe response changes after N attempts','Test if lockout can be bypassed via IP rotation','Check if lockout applies to username or IP'],
        tools: ['Burp Intruder (researcher-owned accounts only)','curl'],
        fp: 'Rate limiting is not the same as lockout',
        impact: 'Brute force attacks against weak passwords',
        remediation: 'Implement progressive delays, CAPTCHA, and account lockout with notification',
      },
    ],
  },
  {
    category: 'Authorization',
    tests: [
      {
        id: 'OTG-AUTHZ-001', name: 'Testing Directory Traversal / File Include',
        objective: 'Identify path traversal vulnerabilities allowing unauthorized file access.',
        where: 'File download endpoints, document viewers, image loaders, include parameters',
        steps: ['Identify file path parameters','Inject ../../../etc/passwd','Try URL-encoded variants','Test platform-specific separators'],
        tools: ['Burp Suite','ffuf','manual testing'],
        fp: 'Controlled directory traversal restricted by chroot may return errors without true vulnerability',
        impact: 'Server file disclosure, configuration exposure, source code access',
        remediation: 'Whitelist allowed files, use canonicalized paths, chroot application',
      },
      {
        id: 'OTG-AUTHZ-004', name: 'Testing for Insecure Direct Object Reference (IDOR)',
        objective: 'Verify object-level authorization for all resource access.',
        where: 'Any endpoint containing object IDs in URL, body, query, or cookies',
        steps: ['Identify object ID parameters','Create two researcher-controlled accounts','Access Account A resource using Account B credentials','Compare responses — look for actual unauthorized data return'],
        tools: ['Burp Suite','Authorization Lab','HTTP Lab'],
        fp: 'Same HTTP 200 without actual resource data is not a vulnerability',
        impact: 'Unauthorized data access, privacy violation, account takeover',
        remediation: 'Implement server-side object-level authorization checks for every request',
      },
    ],
  },
  {
    category: 'Session Management',
    tests: [
      {
        id: 'OTG-SESS-001', name: 'Testing for Bypassing Session Management Schema',
        objective: 'Analyze session token generation and identify predictability.',
        where: 'Session cookies, auth tokens, remember-me tokens',
        steps: ['Collect multiple session tokens','Analyze entropy and pattern','Check for predictable sequences','Verify token length'],
        tools: ['Burp Sequencer','manual analysis'],
        fp: 'Short tokens may be strong if generated by CSPRNG',
        impact: 'Session hijacking',
        remediation: 'Use cryptographically secure random token generation with sufficient entropy',
      },
      {
        id: 'OTG-SESS-003', name: 'Testing for Session Fixation',
        objective: 'Verify session tokens are rotated upon authentication.',
        where: 'Login flow, privilege escalation transitions',
        steps: ['Capture pre-login session ID','Authenticate successfully','Compare session ID before and after login','Verify old session ID is invalidated'],
        tools: ['Burp Suite','Session Lab','HTTP Lab'],
        fp: 'Cookie value change alone is sufficient even if format is same',
        impact: 'Session fixation allows attacker to control victim session',
        remediation: 'Issue new session token upon successful authentication',
      },
    ],
  },
  {
    category: 'Input Validation',
    tests: [
      {
        id: 'OTG-INPVAL-002', name: 'Testing for Reflected Cross Site Scripting (XSS)',
        objective: 'Identify parameters that reflect user input without proper encoding.',
        where: 'Search fields, error messages, URL parameters, headers reflected in response',
        steps: ['Identify input points','Inject test string: <script>alert(1)</script>','Observe if reflected without encoding','Try context-specific bypasses'],
        tools: ['Burp Suite','Dalfox','manual testing'],
        fp: 'CSP may block execution even if payload reflects — document CSP restrictions',
        impact: 'Session hijacking, credential theft, DOM manipulation, phishing',
        remediation: 'Context-aware output encoding, Content-Security-Policy, X-XSS-Protection',
      },
      {
        id: 'OTG-INPVAL-005', name: 'Testing for SQL Injection',
        objective: 'Determine if input is interpolated into SQL queries without parameterization.',
        where: 'Login forms, search parameters, filters, IDs, sorting parameters',
        steps: ["Inject single quote: '","Observe error vs normal response","Try: ' OR '1'='1","Test time-based: ' AND SLEEP(5)--"],
        tools: ['sqlmap (researcher-owned targets only)','manual testing','Burp Suite'],
        fp: 'Error messages alone without data exfil may not constitute exploitable SQLi',
        impact: 'Data exfiltration, authentication bypass, data manipulation, RCE via stacked queries',
        remediation: 'Parameterized queries / prepared statements, input validation, WAF',
      },
    ],
  },
  {
    category: 'Business Logic',
    tests: [
      {
        id: 'BL-001', name: 'Testing for Workflow Bypass',
        objective: 'Determine if multi-step workflows can be bypassed by skipping steps.',
        where: 'Checkout flows, order flows, password reset, account verification',
        steps: ['Map complete workflow','Attempt to access later steps directly','Skip required verification steps','Observe if state is properly validated server-side'],
        tools: ['Burp Suite','HTTP Lab','manual testing'],
        fp: 'Stateless endpoints may legitimately accept requests out of order',
        impact: 'Checkout bypass, payment skip, verification bypass',
        remediation: 'Enforce server-side workflow state, validate prerequisites for each step',
      },
    ],
  },
  {
    category: 'API Security',
    tests: [
      {
        id: 'API1-001', name: 'Testing for Broken Object Level Authorization',
        objective: 'Verify that API endpoints enforce object-level authorization for all operations.',
        where: 'All API endpoints returning or modifying objects identified by IDs',
        steps: ['Identify object IDs in API requests','Create two researcher-controlled accounts','Test cross-account object access','Test all CRUD operations'],
        tools: ['Authorization Lab','HTTP Lab','Postman'],
        fp: 'Shared/public objects may legitimately be accessible by multiple users',
        impact: 'Unauthorized data access, account takeover, data manipulation',
        remediation: 'Validate object ownership server-side for every API request',
      },
    ],
  },
];

const STATUS_OPTIONS = ['not-started','testing','passed','potential-issue','confirmed-finding','not-applicable'];
const STATUS_COLORS: Record<string, string> = {
  'not-started': 'badge-muted', 'testing': 'badge-blue', 'passed': 'badge-green',
  'potential-issue': 'badge-amber', 'confirmed-finding': 'sev-high', 'not-applicable': 'badge-muted',
};

export default function OwaspGuide() {
  const { activeProject, setActiveTab } = useApp();
  const [selected, setSelected] = useState<any>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'Information Gathering': true });

  useEffect(() => {
    if (!activeProject) return;
    (async () => {
      const res = await db.all('SELECT * FROM test_results WHERE project_id=?', [activeProject.id]);
      if (res.success) {
        const s: Record<string, string> = {};
        const n: Record<string, string> = {};
        for (const r of res.result) { s[r.owasp_id] = r.status; n[r.owasp_id] = r.notes||''; }
        setStatuses(s); setNotes(n);
      }
    })();
  }, [activeProject]);

  const setStatus = async (testId: string, status: string) => {
    setStatuses(s => ({ ...s, [testId]: status }));
    if (!activeProject) return;
    const existing = await db.get('SELECT id FROM test_results WHERE project_id=? AND owasp_id=?', [activeProject.id, testId]);
    if (existing.success && existing.result) {
      await db.run('UPDATE test_results SET status=?,updated_at=? WHERE id=?', [status, nowISO(), existing.result.id]);
    } else {
      await db.run('INSERT INTO test_results (id,project_id,owasp_id,status,updated_at) VALUES (?,?,?,?,?)', [newId(), activeProject.id, testId, status, nowISO()]);
    }
  };

  const saveNote = async (testId: string, note: string) => {
    setNotes(n => ({ ...n, [testId]: note }));
    if (!activeProject) return;
    const existing = await db.get('SELECT id FROM test_results WHERE project_id=? AND owasp_id=?', [activeProject.id, testId]);
    if (existing.success && existing.result) {
      await db.run('UPDATE test_results SET notes=?,updated_at=? WHERE id=?', [note, nowISO(), existing.result.id]);
    } else {
      await db.run('INSERT INTO test_results (id,project_id,owasp_id,notes,status,updated_at) VALUES (?,?,?,?,?,?)', [newId(), activeProject.id, testId, note, 'not-started', nowISO()]);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">OWASP Testing Guide</div><div className="page-subtitle">Interactive security testing methodology</div></div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Category / test list */}
        <div style={{ width: 280, borderRight: '1px solid var(--border)', overflow: 'auto', padding: '8px 8px' }}>
          {OWASP_TESTS.map(cat => (
            <div key={cat.category} style={{ marginBottom: 4 }}>
              <div onClick={() => setExpanded(e => ({ ...e, [cat.category]: !e[cat.category] }))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {expanded[cat.category] ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                {cat.category}
              </div>
              {expanded[cat.category] && cat.tests.map(test => {
                const status = statuses[test.id] || 'not-started';
                return (
                  <div key={test.id} onClick={() => setSelected(test)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 'var(--radius)', cursor: 'pointer', background: selected?.id === test.id ? 'var(--bg-active)' : 'transparent', marginBottom: 1 }}>
                    <div className={`status-dot ${status === 'passed' ? 'green' : status === 'confirmed-finding' ? '' : status === 'testing' ? 'blue' : status === 'potential-issue' ? 'amber' : 'muted'}`}
                      style={{ background: status === 'confirmed-finding' ? 'var(--red)' : undefined }} />
                    <div style={{ flex: 1, fontSize: '0.82rem', color: selected?.id === test.id ? 'var(--cyan)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {test.name}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Test detail */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {!selected ? (
            <div className="empty-state"><BookOpen size={40}/><h3>Select a Test</h3><p>Choose a test from the left panel to see detailed guidance, steps, and track status.</p></div>
          ) : (
            <div style={{ maxWidth: 720 }}>
              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                  <span className="badge badge-cyan">{selected.id}</span>
                  <span className={`badge ${STATUS_COLORS[statuses[selected.id]||'not-started']}`}>{statuses[selected.id]||'not-started'}</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{selected.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{selected.objective}</div>
              </div>

              {/* Status buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                {STATUS_OPTIONS.map(s => (
                  <button key={s} className={`btn btn-sm ${(statuses[selected.id]||'not-started') === s ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStatus(selected.id, s)}>
                    {s.replace(/-/g,' ')}
                  </button>
                ))}
                <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setActiveTab('httplab')}>
                  <FlaskConical size={12}/> Open HTTP Lab
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('findings')}>
                  <Bug size={12}/> Create Finding
                </button>
              </div>

              {/* Sections */}
              {[
                { title: '📍 Where to Look', content: selected.where },
                { title: '🔧 Steps', content: selected.steps?.map((s: string, i: number) => `${i+1}. ${s}`).join('\n') },
                { title: '🛠 Recommended Tools', content: selected.tools?.join(', ') },
                { title: '⚠ Avoid False Positives', content: selected.fp },
                { title: '💥 Impact', content: selected.impact },
                { title: '🔧 Remediation', content: selected.remediation },
              ].map(({ title, content }) => (
                <div key={title} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--cyan)', marginBottom: 6 }}>{title}</div>
                  <div className="code-block" style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'var(--font-ui)' }}>{content}</div>
                </div>
              ))}

              {/* Notes */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Research Notes</div>
                <textarea className="textarea" rows={4} placeholder="Notes about this test for this project…"
                  value={notes[selected.id]||''} onChange={e => saveNote(selected.id, e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
