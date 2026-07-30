import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { Plus, Edit2, Trash2, Copy, Download, Upload, ExternalLink, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Target {
  id: string; project_id: string; asset: string; hostname: string;
  protocol: string; port?: number; asset_type: string;
  bounty_eligible: number; max_severity: string; bounty_tier: string;
  scope_status: string; notes?: string; tags: string; enabled: number;
}

const SCOPE_COLORS: Record<string, string> = {
  'in-scope': 'var(--green)', 'unknown': 'var(--amber)', 'out-of-scope': 'var(--red)',
};

const EMPTY = { asset:'', hostname:'', protocol:'https', port:'', asset_type:'web-application',
  bounty_eligible:'1', max_severity:'critical', bounty_tier:'', scope_status:'in-scope', notes:'', tags:'' };

export default function Targets() {
  const { activeProject, logActivity } = useApp();
  const [targets, setTargets] = useState<Target[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Target | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!activeProject) { setTargets([]); return; }
    const res = await db.all('SELECT * FROM targets WHERE project_id=? ORDER BY hostname', [activeProject.id]);
    if (res.success) setTargets(res.result);
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (t: Target) => {
    setEditing(t);
    setForm({ asset: t.asset, hostname: t.hostname, protocol: t.protocol, port: t.port?.toString()||'',
      asset_type: t.asset_type, bounty_eligible: t.bounty_eligible.toString(),
      max_severity: t.max_severity, bounty_tier: t.bounty_tier||'', scope_status: t.scope_status,
      notes: t.notes||'', tags: t.tags||'' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.hostname.trim() || !activeProject) return;
    const vals = [form.asset, form.hostname, form.protocol, form.port ? parseInt(form.port) : null,
      form.asset_type, parseInt(form.bounty_eligible), form.max_severity, form.bounty_tier,
      form.scope_status, form.notes, form.tags, nowISO()];
    if (editing) {
      await db.run(`UPDATE targets SET asset=?,hostname=?,protocol=?,port=?,asset_type=?,bounty_eligible=?,max_severity=?,bounty_tier=?,scope_status=?,notes=?,tags=?,updated_at=? WHERE id=?`,
        [...vals, editing.id]);
    } else {
      await db.run(`INSERT INTO targets (id,project_id,asset,hostname,protocol,port,asset_type,bounty_eligible,max_severity,bounty_tier,scope_status,notes,tags,enabled,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [newId(), activeProject.id, ...vals.slice(0,-1), 1, nowISO(), nowISO()]);
      await logActivity('target_added', 'Targets', `Added target: ${form.hostname}`);
    }
    load(); setShowModal(false);
  };

  const del = async (t: Target) => {
    if (!confirm(`Remove target "${t.hostname}"?`)) return;
    await db.run('DELETE FROM targets WHERE id=?', [t.id]);
    load();
  };

  const toggleScope = async (t: Target) => {
    const next = t.scope_status === 'in-scope' ? 'out-of-scope' : t.scope_status === 'out-of-scope' ? 'unknown' : 'in-scope';
    await db.run('UPDATE targets SET scope_status=?,updated_at=? WHERE id=?', [next, nowISO(), t.id]);
    load();
  };

  const toggleEnabled = async (t: Target) => {
    await db.run('UPDATE targets SET enabled=?,updated_at=? WHERE id=?', [t.enabled ? 0 : 1, nowISO(), t.id]);
    load();
  };

  const importTargets = async () => {
    if (!activeProject) return;
    const api = (window as any).electronAPI;
    if (!api) return;
    const res = await api.fileOpen({ filters: [{ name: 'Text/CSV/JSON', extensions: ['txt','csv','json'] }] });
    if (!res.success || !res.files.length) return;
    const content = res.files[0].content;
    const lines = content.split('\n').map((l: string) => l.trim()).filter(Boolean);
    let imported = 0;
    for (const line of lines) {
      try {
        let hostname = line;
        let protocol = 'https';
        if (line.startsWith('http://')) { protocol = 'http'; hostname = line.replace('http://', '').split('/')[0]; }
        else if (line.startsWith('https://')) { protocol = 'https'; hostname = line.replace('https://', '').split('/')[0]; }
        if (!hostname) continue;
        await db.run(`INSERT OR IGNORE INTO targets (id,project_id,asset,hostname,protocol,asset_type,bounty_eligible,max_severity,scope_status,enabled,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [newId(), activeProject.id, hostname, hostname, protocol, 'web-application', 1, 'critical', 'in-scope', 1, nowISO(), nowISO()]);
        imported++;
      } catch {}
    }
    alert(`Imported ${imported} targets`);
    load();
  };

  const filtered = targets.filter(t =>
    !search || t.hostname.toLowerCase().includes(search.toLowerCase()) || t.asset.toLowerCase().includes(search.toLowerCase())
  );

  const ScopeIcon = ({ status }: { status: string }) =>
    status === 'in-scope' ? <CheckCircle size={14} color="var(--green)" /> :
    status === 'out-of-scope' ? <XCircle size={14} color="var(--red)" /> :
    <AlertTriangle size={14} color="var(--amber)" />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Target Manager</div>
          <div className="page-subtitle">{targets.length} target{targets.length !== 1?'s':''} · {activeProject?.name || 'No project'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input" style={{ width: 220 }} placeholder="Search targets…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-secondary btn-sm" onClick={importTargets}><Upload size={13} /> Import</button>
          <button className="btn btn-primary btn-sm" onClick={openCreate} disabled={!activeProject}><Plus size={13} /> Add Target</button>
        </div>
      </div>

      <div className="page-body" style={{ padding: 0 }}>
        {!activeProject ? (
          <div className="empty-state"><AlertTriangle size={32} /><h3>No Active Project</h3><p>Select a project first</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><Plus size={32} /><h3>No Targets</h3><p>Add targets to define your scope</p><button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Target</button></div>
        ) : (
          <div className="table-wrap" style={{ padding: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Scope</th><th>Asset / Host</th><th>Protocol</th><th>Port</th>
                  <th>Type</th><th>Max Severity</th><th>Bounty Tier</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} style={{ opacity: t.enabled ? 1 : 0.4 }}>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleScope(t)} title="Toggle scope status">
                        <ScopeIcon status={t.scope_status} />
                      </button>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>{t.hostname}</div>
                      {t.asset && t.asset !== t.hostname && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.asset}</div>}
                    </td>
                    <td><span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>{t.protocol}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{t.port || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.asset_type}</td>
                    <td>
                      <span className={`badge ${t.max_severity === 'critical' ? 'sev-critical' : t.max_severity === 'high' ? 'sev-high' : 'sev-medium'}`}>
                        {t.max_severity}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.bounty_tier || '—'}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: SCOPE_COLORS[t.scope_status] || 'var(--text-muted)', fontWeight: 600 }}>
                        {t.scope_status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(t)} title="Edit"><Edit2 size={12} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleEnabled(t)} title={t.enabled ? 'Disable' : 'Enable'}>
                          {t.enabled ? <CheckCircle size={12} color="var(--green)" /> : <XCircle size={12} color="var(--text-muted)" />}
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => (window as any).electronAPI?.openExternal(`${t.protocol}://${t.hostname}`)} title="Open in browser">
                          <ExternalLink size={12} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => del(t)} title="Delete"><Trash2 size={12} /></button>
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
          <div className="modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Target' : 'Add Target'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <div className="label">Hostname *</div>
                <input className="input input-mono" placeholder="example.com" value={form.hostname} onChange={e => setForm(f => ({...f, hostname:e.target.value}))} />
              </div>
              <div>
                <div className="label">Asset Name</div>
                <input className="input" placeholder="Main App" value={form.asset} onChange={e => setForm(f => ({...f, asset:e.target.value}))} />
              </div>
              <div>
                <div className="label">Protocol</div>
                <select className="input select" value={form.protocol} onChange={e => setForm(f => ({...f, protocol:e.target.value}))}>
                  <option value="https">HTTPS</option><option value="http">HTTP</option><option value="wss">WSS</option><option value="ws">WS</option>
                </select>
              </div>
              <div>
                <div className="label">Port</div>
                <input className="input input-mono" placeholder="443" value={form.port} onChange={e => setForm(f => ({...f, port:e.target.value}))} />
              </div>
              <div>
                <div className="label">Asset Type</div>
                <select className="input select" value={form.asset_type} onChange={e => setForm(f => ({...f, asset_type:e.target.value}))}>
                  {['web-application','api','mobile-app','iot','network','cloud','source-code','other'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <div className="label">Max Severity</div>
                <select className="input select" value={form.max_severity} onChange={e => setForm(f => ({...f, max_severity:e.target.value}))}>
                  {['critical','high','medium','low','informational'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <div className="label">Bounty Tier</div>
                <input className="input" placeholder="e.g. Tier 1" value={form.bounty_tier} onChange={e => setForm(f => ({...f, bounty_tier:e.target.value}))} />
              </div>
              <div>
                <div className="label">Scope Status</div>
                <select className="input select" value={form.scope_status} onChange={e => setForm(f => ({...f, scope_status:e.target.value}))}>
                  <option value="in-scope">In Scope</option><option value="unknown">Unknown</option><option value="out-of-scope">Out of Scope</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <div className="label">Notes</div>
                <textarea className="textarea" rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} placeholder="Path rules, restrictions, notes…" />
              </div>
              <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={!form.hostname.trim()}>{editing ? 'Save' : 'Add Target'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
