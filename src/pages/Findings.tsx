import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { Plus, Edit2, Trash2, Copy, ExternalLink, AlertTriangle, CheckCircle, Bug } from 'lucide-react';

const SEVERITIES = ['informational','low','medium','high','critical'];
const STATUSES = ['idea','testing','potential','validated','ready','submitted','triaged','duplicate','informative','resolved','rewarded'];
const OWASP_CATS = ['A01:Broken Access Control','A02:Cryptographic Failures','A03:Injection','A04:Insecure Design','A05:Security Misconfiguration','A06:Vulnerable Components','A07:Auth Failures','A08:Software Integrity Failures','A09:Logging Failures','A10:SSRF','Other'];

const SEV_COLORS: Record<string, string> = { critical:'sev-critical', high:'sev-high', medium:'sev-medium', low:'sev-low', informational:'sev-info' };
const STATUS_COLORS: Record<string, string> = { idea:'badge-muted', testing:'badge-blue', potential:'badge-amber', validated:'badge-cyan', ready:'badge-green', submitted:'badge-green', resolved:'badge-muted', rewarded:'badge-green', duplicate:'badge-red', informative:'badge-muted', triaged:'badge-cyan' };

const EMPTY_FINDING = { title:'', status:'potential', severity:'medium', cvss_score:'', cvss_vector:'', cwe:'', owasp_category:'', asset:'', affected_parameter:'', auth_required:'0', summary:'', prerequisites:'', steps:'', observed_result:'', expected_result:'', impact:'', business_impact:'', remediation:'', references:'', bounty_platform_id:'', reward:'' };

function qualityScore(f: typeof EMPTY_FINDING): number {
  let score = 0;
  if (f.title.length > 10) score += 15;
  if (f.asset) score += 10;
  if (f.affected_parameter) score += 5;
  if (f.summary.length > 50) score += 15;
  if (f.steps.length > 100) score += 20;
  if (f.observed_result.length > 20) score += 10;
  if (f.expected_result.length > 20) score += 10;
  if (f.impact.length > 20) score += 10;
  if (f.remediation.length > 20) score += 5;
  return Math.min(score, 100);
}

export default function Findings() {
  const { activeProject, logActivity } = useApp();
  const [findings, setFindings] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FINDING);
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    if (!activeProject) { setFindings([]); return; }
    const res = await db.all('SELECT * FROM findings WHERE project_id=? ORDER BY created_at DESC', [activeProject.id]);
    if (res.success) setFindings(res.result);
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FINDING); setShowModal(true); };
  const openEdit = (f: any) => {
    setEditing(f);
    setForm({ ...EMPTY_FINDING, ...f, cvss_score: f.cvss_score?.toString()||'', reward: f.reward?.toString()||'' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.title.trim() || !activeProject) return;
    const vals = [form.title, form.status, form.severity, parseFloat(form.cvss_score)||null, form.cvss_vector, form.cwe, form.owasp_category, form.asset, form.affected_parameter, parseInt(form.auth_required)||0, form.summary, form.prerequisites, form.steps, form.observed_result, form.expected_result, form.impact, form.business_impact, form.remediation, form.references, form.bounty_platform_id, parseFloat(form.reward)||null, nowISO()];
    if (editing) {
      await db.run(`UPDATE findings SET title=?,status=?,severity=?,cvss_score=?,cvss_vector=?,cwe=?,owasp_category=?,asset=?,affected_parameter=?,auth_required=?,summary=?,prerequisites=?,steps=?,observed_result=?,expected_result=?,impact=?,business_impact=?,remediation=?,references=?,bounty_platform_id=?,reward=?,updated_at=? WHERE id=?`, [...vals, editing.id]);
    } else {
      const id = newId();
      await db.run(`INSERT INTO findings (id,project_id,title,status,severity,cvss_score,cvss_vector,cwe,owasp_category,asset,affected_parameter,auth_required,summary,prerequisites,steps,observed_result,expected_result,impact,business_impact,remediation,references,bounty_platform_id,reward,created_at,updated_at) VALUES (?,?,${vals.map(()=>'?').join(',')})`,
        [id, activeProject.id, ...vals]);
      await logActivity('finding_created', 'Findings', `Created finding: ${form.title}`);
    }
    load(); setShowModal(false);
  };

  const del = async (id: string) => {
    if (!confirm('Delete this finding?')) return;
    await db.run('DELETE FROM findings WHERE id=?', [id]);
    load();
  };

  const filtered = findings.filter(f => {
    if (sevFilter && f.severity !== sevFilter) return false;
    if (statusFilter && f.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return f.title.toLowerCase().includes(q) || (f.summary||'').toLowerCase().includes(q);
    }
    return true;
  });

  const quality = qualityScore(form);
  const qualityLabel = quality >= 80 ? 'Excellent' : quality >= 60 ? 'Good' : quality >= 40 ? 'Needs Work' : 'Poor';
  const qualityColor = quality >= 80 ? 'var(--green)' : quality >= 60 ? 'var(--cyan)' : quality >= 40 ? 'var(--amber)' : 'var(--red)';

  const F = ({ k, label, full, type, options }: any) => (
    <div style={{ gridColumn: full ? '1/-1' : undefined }}>
      <div className="label">{label}</div>
      {type === 'textarea'
        ? <textarea className="textarea" rows={4} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} />
        : type === 'select'
        ? <select className="input select" value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}>
            {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input className="input" type={type||'text'} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} />
      }
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Findings</div>
          <div className="page-subtitle">{findings.length} finding{findings.length!==1?'s':''} · {activeProject?.name||'No project'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="input" style={{ width: 200 }} placeholder="Search findings…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="input select" style={{ width: 120 }} value={sevFilter} onChange={e => setSevFilter(e.target.value)}>
            <option value="">All Severity</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input select" style={{ width: 130 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={openCreate} disabled={!activeProject}><Plus size={13} /> New Finding</button>
        </div>
      </div>

      <div className="page-body" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><Bug size={40} /><h3>No Findings</h3><p>Start testing and create a finding when you discover a vulnerability.</p><button className="btn btn-primary" onClick={openCreate}><Plus size={14}/> New Finding</button></div>
        ) : (
          <div className="table-wrap" style={{ padding: 16 }}>
            <table>
              <thead><tr><th>Severity</th><th>Title</th><th>Status</th><th>Asset</th><th>CVSS</th><th>CWE</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id}>
                    <td><span className={`badge ${SEV_COLORS[f.severity]||'badge-muted'}`}>{f.severity}</span></td>
                    <td style={{ fontWeight: 600, maxWidth: 300 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</div>
                      {f.summary && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.summary}</div>}
                    </td>
                    <td><span className={`badge ${STATUS_COLORS[f.status]||'badge-muted'}`}>{f.status}</span></td>
                    <td style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>{f.asset||'—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{f.cvss_score||'—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{f.cwe||'—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(f)}><Edit2 size={12}/></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => del(f.id)}><Trash2 size={12} color="var(--red)"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ width: 760, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Finding' : 'New Finding'}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Quality: </span>
                  <span style={{ color: qualityColor, fontWeight: 700 }}>{qualityLabel} ({quality}%)</span>
                </div>
                <div style={{ width: 100, height: 4, background: 'var(--bg-base)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${quality}%`, height: '100%', background: qualityColor, transition: 'all var(--transition)' }} />
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, overflow: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
              <F k="title" label="Title *" full type="text" />
              <F k="status" label="Status" type="select" options={STATUSES} />
              <F k="severity" label="Severity" type="select" options={SEVERITIES} />
              <F k="cvss_score" label="CVSS Score" type="number" />
              <F k="cwe" label="CWE" />
              <F k="owasp_category" label="OWASP Category" type="select" options={OWASP_CATS} />
              <F k="asset" label="Asset / Host" />
              <F k="affected_parameter" label="Affected Parameter" />
              <F k="summary" label="Summary" full type="textarea" />
              <F k="prerequisites" label="Prerequisites" full type="textarea" />
              <F k="steps" label="Steps to Reproduce" full type="textarea" />
              <F k="observed_result" label="Observed Result" full type="textarea" />
              <F k="expected_result" label="Expected Result" full type="textarea" />
              <F k="impact" label="Impact" full type="textarea" />
              <F k="business_impact" label="Business Impact" full type="textarea" />
              <F k="remediation" label="Remediation" full type="textarea" />
              <F k="bounty_platform_id" label="Bounty Platform ID" />
              <F k="reward" label="Reward ($)" type="number" />
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={!form.title.trim()}>{editing ? 'Save' : 'Create Finding'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
