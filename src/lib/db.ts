// Browser-side database interface via Electron IPC
const api = (window as any).electronAPI;

export const isWebDemo = !api;

const demoProject = {
  id: 'demo-project',
  name: 'Skoolic Labs — Authorized Demo',
  organization: 'Skoolic Security Lab',
  platform: 'Private Lab',
  program_url: 'https://skoolic.com',
  description: 'A safe, sample engagement showcasing the BountyScope workflow.',
  status: 'active',
  tags: '["web","api","authorized"]',
  notes: 'Sample data for the public browser demo.',
  created_at: '2026-07-12T09:30:00.000Z',
  updated_at: '2026-07-30T14:12:00.000Z',
};

const demoEndpoints = [
  { id:'ep-1', project_id:'demo-project', host:'api.lab.skoolic.com', method:'GET', path:'/api/v1/profile', full_url:'https://api.lab.skoolic.com/api/v1/profile', status_code:200, content_type:'application/json', response_length:2840, source:'har', auth_required:1, tested:1, tags:'["api"]', is_favorite:1 },
  { id:'ep-2', project_id:'demo-project', host:'api.lab.skoolic.com', method:'POST', path:'/api/v1/orders', full_url:'https://api.lab.skoolic.com/api/v1/orders', status_code:201, content_type:'application/json', response_length:1320, source:'proxy', auth_required:1, tested:1, tags:'["orders"]', is_favorite:0 },
  { id:'ep-3', project_id:'demo-project', host:'app.lab.skoolic.com', method:'GET', path:'/account/settings', full_url:'https://app.lab.skoolic.com/account/settings', status_code:200, content_type:'text/html', response_length:18420, source:'crawler', auth_required:1, tested:0, tags:'["account"]', is_favorite:0 },
  { id:'ep-4', project_id:'demo-project', host:'api.lab.skoolic.com', method:'PUT', path:'/api/v1/users/{id}', full_url:'https://api.lab.skoolic.com/api/v1/users/1042', status_code:200, content_type:'application/json', response_length:986, source:'openapi', auth_required:1, tested:1, tags:'["users"]', is_favorite:1 },
  { id:'ep-5', project_id:'demo-project', host:'cdn.lab.skoolic.com', method:'GET', path:'/uploads/avatar/demo.png', full_url:'https://cdn.lab.skoolic.com/uploads/avatar/demo.png', status_code:200, content_type:'image/png', response_length:42752, source:'crawler', auth_required:0, tested:0, tags:'["upload"]', is_favorite:0 },
  { id:'ep-6', project_id:'demo-project', host:'api.lab.skoolic.com', method:'DELETE', path:'/api/v1/sessions/{id}', full_url:'https://api.lab.skoolic.com/api/v1/sessions/842', status_code:204, content_type:'application/json', response_length:0, source:'har', auth_required:1, tested:1, tags:'["session"]', is_favorite:0 },
];

const demoFindings = [
  { id:'finding-1', project_id:'demo-project', title:'Object-level authorization gap in order export', status:'validated', severity:'critical', cvss_score:9.1, cwe:'CWE-639', owasp_category:'A01:Broken Access Control', asset:'api.lab.skoolic.com', affected_parameter:'order_id', auth_required:1, summary:'A sample validated authorization finding in the intentionally vulnerable demo environment.', impact:'A low-privileged demo account can access another demo account export.', remediation:'Enforce resource ownership checks on every object lookup.', created_at:'2026-07-30T12:20:00.000Z', updated_at:'2026-07-30T12:45:00.000Z' },
  { id:'finding-2', project_id:'demo-project', title:'Session remains active after password rotation', status:'testing', severity:'high', cvss_score:7.5, cwe:'CWE-613', owasp_category:'A07:Auth Failures', asset:'app.lab.skoolic.com', affected_parameter:'session', auth_required:1, summary:'Previously issued demo sessions are not revoked after a password change.', impact:'A captured session could retain access longer than intended.', remediation:'Invalidate all existing sessions on security-sensitive account changes.', created_at:'2026-07-29T15:10:00.000Z', updated_at:'2026-07-30T08:10:00.000Z' },
  { id:'finding-3', project_id:'demo-project', title:'Verbose API error exposes internal service name', status:'ready', severity:'medium', cvss_score:5.3, cwe:'CWE-209', owasp_category:'A05:Security Misconfiguration', asset:'api.lab.skoolic.com', affected_parameter:'query', auth_required:0, summary:'Malformed demo requests disclose an internal service identifier.', impact:'The disclosure improves attacker understanding of the internal architecture.', remediation:'Return generic client errors and retain details only in server logs.', created_at:'2026-07-28T10:35:00.000Z', updated_at:'2026-07-29T17:20:00.000Z' },
  { id:'finding-4', project_id:'demo-project', title:'Missing rate limit on recovery code verification', status:'potential', severity:'medium', cvss_score:6.5, cwe:'CWE-307', owasp_category:'A07:Auth Failures', asset:'app.lab.skoolic.com', affected_parameter:'code', auth_required:0, summary:'The demo verification flow lacks a visible per-account attempt limit.', impact:'Attackers could automate recovery-code guesses.', remediation:'Apply layered account, IP, and device rate limits.', created_at:'2026-07-27T11:05:00.000Z', updated_at:'2026-07-27T11:05:00.000Z' },
  { id:'finding-5', project_id:'demo-project', title:'Legacy response omits recommended security headers', status:'triaged', severity:'low', cvss_score:3.1, cwe:'CWE-693', owasp_category:'A05:Security Misconfiguration', asset:'cdn.lab.skoolic.com', affected_parameter:'headers', auth_required:0, summary:'A legacy sample route does not return the full hardened header set.', impact:'Defense in depth is reduced.', remediation:'Apply the shared security header policy to all routes.', created_at:'2026-07-25T09:10:00.000Z', updated_at:'2026-07-26T09:10:00.000Z' },
];

const demoActivity = [
  { id:'act-1', project_id:'demo-project', action:'finding_validated', module:'Findings', description:'Validated order export authorization finding', created_at:'2026-07-30T12:45:00.000Z' },
  { id:'act-2', project_id:'demo-project', action:'evidence_added', module:'Evidence', description:'Preserved redacted request and response pair', created_at:'2026-07-30T12:31:00.000Z' },
  { id:'act-3', project_id:'demo-project', action:'request_sent', module:'HTTP Lab', description:'Compared owner and alternate-user responses', created_at:'2026-07-30T12:20:00.000Z' },
  { id:'act-4', project_id:'demo-project', action:'target_added', module:'Targets', description:'Added authorized API lab target', created_at:'2026-07-29T15:05:00.000Z' },
  { id:'act-5', project_id:'demo-project', action:'endpoints_imported', module:'EndpointMap', description:'Imported 18 endpoints from redacted HAR', created_at:'2026-07-29T14:52:00.000Z' },
  { id:'act-6', project_id:'demo-project', action:'project_created', module:'Projects', description:'Initialized authorized Skoolic Labs demo', created_at:'2026-07-28T09:30:00.000Z' },
];

const demoTargets = [
  { id:'target-1', project_id:'demo-project', asset:'API Lab', hostname:'api.lab.skoolic.com', protocol:'https', port:443, asset_type:'api', bounty_eligible:1, max_severity:'critical', bounty_tier:'Tier 1', scope_status:'in-scope', notes:'Intentionally vulnerable sample API', tags:'api, demo', enabled:1 },
  { id:'target-2', project_id:'demo-project', asset:'Web Lab', hostname:'app.lab.skoolic.com', protocol:'https', port:443, asset_type:'web-application', bounty_eligible:1, max_severity:'high', bounty_tier:'Tier 2', scope_status:'in-scope', notes:'Authorized browser testing surface', tags:'web, demo', enabled:1 },
  { id:'target-3', project_id:'demo-project', asset:'Static CDN', hostname:'cdn.lab.skoolic.com', protocol:'https', port:443, asset_type:'cdn', bounty_eligible:0, max_severity:'medium', bounty_tier:'', scope_status:'unknown', notes:'Validate scope before testing', tags:'cdn', enabled:1 },
];

const demoEvidence = [
  { id:'ev-1', project_id:'demo-project', filename:'idor-owner-vs-alt-user.md', file_type:'text/markdown', file_size:4820, sha256:'f7c35a9e2b5142a6e96f50a39fe91fc104ff166b2a229f293ec90f95ae61bb12', description:'Redacted request comparison', tags:'["authorization"]', created_at:'2026-07-30T12:31:00.000Z' },
  { id:'ev-2', project_id:'demo-project', filename:'session-rotation-timeline.json', file_type:'application/json', file_size:2960, sha256:'2e648abef28669962982417fe2a9fe7ab33c7708624c61e5be88e453609035d4', description:'Sanitized session event timeline', tags:'["session"]', created_at:'2026-07-29T16:08:00.000Z' },
];

const demoPayloads = [
  { id:'pl-1', category:'XSS Probes', name:'HTML context marker', value:'<b>BOUNTYSCOPE_TEST</b>', description:'Benign rendering marker for an authorized lab.', is_favorite:1 },
  { id:'pl-2', category:'Path Traversal', name:'Encoded traversal marker', value:'..%2f..%2fexample.txt', description:'Non-sensitive traversal probe for a controlled target.', is_favorite:0 },
  { id:'pl-3', category:'JSON Probes', name:'Type boundary', value:'{"id":["demo"]}', description:'Checks handling of an unexpected array value.', is_favorite:1 },
  { id:'pl-4', category:'Open Redirect', name:'External origin marker', value:'https://example.com/', description:'Safe redirect destination for validation.', is_favorite:0 },
];

const success = (result: any) => Promise.resolve({ success: true, result });
const normalized = (sql: string) => sql.toLowerCase().replace(/\s+/g, ' ');

function demoAll(sql: string, params: any[] = []) {
  const query = normalized(sql);
  if (query.includes(' from settings')) return success([{ key:'theme', value:'cyberpunk' }, { key:'activeProjectId', value:'demo-project' }]);
  if (query.includes(' from projects')) return success([demoProject]);
  if (query.includes(' from endpoints')) {
    if (query.includes('group by method')) return success([{method:'GET',c:18},{method:'POST',c:9},{method:'PUT',c:4},{method:'DELETE',c:2}]);
    if (query.includes(' like ')) {
      const term = String(params[0] || '').replaceAll('%', '').toLowerCase();
      return success(demoEndpoints.filter(e => e.full_url.toLowerCase().includes(term)).slice(0, 5));
    }
    return success(demoEndpoints);
  }
  if (query.includes(' from findings')) {
    if (query.includes('group by severity')) return success([{severity:'critical',c:1},{severity:'high',c:1},{severity:'medium',c:2},{severity:'low',c:1}]);
    if (query.includes(' like ')) {
      const term = String(params[0] || '').replaceAll('%', '').toLowerCase();
      return success(demoFindings.filter(f => f.title.toLowerCase().includes(term)).slice(0, 5));
    }
    return success(demoFindings);
  }
  if (query.includes(' from checklist_items')) return success(Array.from({ length: 24 }, (_, i) => ({ id:`check-${i}`, status:i < 16 ? 'passed' : 'not-tested' })));
  if (query.includes(' from activity')) return success(query.includes('limit 6') ? demoActivity.slice(0, 6) : demoActivity);
  if (query.includes(' from targets')) return success(demoTargets);
  if (query.includes(' from evidence')) return success(demoEvidence);
  if (query.includes(' from recon_hosts')) return success([
    { id:'host-1', project_id:'demo-project', host:'api.lab.skoolic.com', ip:'203.0.113.24', technology:'nginx · Node.js', notes:'Authorized API lab', source:'subfinder' },
    { id:'host-2', project_id:'demo-project', host:'app.lab.skoolic.com', ip:'203.0.113.42', technology:'React · Vite', notes:'Demo web surface', source:'httpx' },
  ]);
  if (query.includes(' from payloads')) return success(demoPayloads);
  return success([]);
}

function demoGet(sql: string) {
  const query = normalized(sql);
  if (query.includes(' from projects')) return success(demoProject);
  if (query.includes('count(*)') && query.includes(' from endpoints')) return success({ c:33 });
  if (query.includes('count(*)') && query.includes(' from saved_requests')) return success({ c:41 });
  if (query.includes('count(*)') && query.includes(' from findings')) return success({ c:5 });
  if (query.includes('count(*)') && query.includes(' from evidence')) return success({ c:12 });
  return success(undefined);
}

export const db = {
  run: (sql: string, params?: any[]) => api?.dbRun(sql, params) ?? success({ changes: 0, demo: true }),
  get: (sql: string, params?: any[]) => api?.dbGet(sql, params) ?? demoGet(sql),
  all: (sql: string, params?: any[]) => api?.dbAll(sql, params) ?? demoAll(sql, params),
  path: () => api?.dbPath() ?? Promise.resolve(''),
  backup: () => api?.dbBackup() ?? Promise.resolve({ success: false }),
};

export const httpClient = {
  send: (options: any) => api?.sendRequest(options) ?? Promise.resolve({ error: true, message: 'Not in Electron context' }),
};

export const fileAPI = {
  save: (options: any) => api?.fileSave(options),
  open: (options: any) => api?.fileOpen(options),
  read: (path: string) => api?.fileRead(path),
  saveEvidence: (options: any) => api?.fileSaveEvidence(options),
  openExternal: (url: string) => api?.openExternal(url),
};

export const appAPI = {
  getPath: (name: string) => api?.getPath(name),
  getVersion: () => api?.getVersion() ?? Promise.resolve('1.0.0'),
};

// Helper: generate UUID (falls back to crypto.randomUUID)
export const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

// Helper: now ISO string
export const nowISO = () => new Date().toISOString();
