import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { Plus, Edit2, Trash2, Copy, Archive, Download, Upload, ExternalLink, CheckCircle } from 'lucide-react';

interface Project {
  id: string; name: string; organization?: string; platform?: string;
  program_url?: string; description?: string; status: string; created_at: string; updated_at: string;
}

const EMPTY_FORM = { name: '', organization: '', platform: '', program_url: '', description: '', testing_restrictions: '', authorization_notes: '' };

export default function Projects() {
  const { activeProject, setActiveProject, projects, refreshProjects, deleteProject, logActivity } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { refreshProjects(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({ name: p.name, organization: p.organization||'', platform: p.platform||'', program_url: p.program_url||'', description: p.description||'', testing_restrictions:'', authorization_notes:'' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      await db.run(`UPDATE projects SET name=?,organization=?,platform=?,program_url=?,description=?,updated_at=? WHERE id=?`,
        [form.name, form.organization, form.platform, form.program_url, form.description, nowISO(), editing.id]);
    } else {
      await db.run(`INSERT INTO projects (id,name,organization,platform,program_url,description,status,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [newId(), form.name, form.organization, form.platform, form.program_url, form.description, 'active', '[]', nowISO(), nowISO()]);
    }
    await refreshProjects();
    setShowModal(false);
  };

  const duplicate = async (p: Project) => {
    await db.run(`INSERT INTO projects (id,name,organization,platform,program_url,description,status,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [newId(), `${p.name} (copy)`, p.organization, p.platform, p.program_url, p.description, 'active', '[]', nowISO(), nowISO()]);
    await refreshProjects();
  };

  const exportProject = async (p: Project) => {
    const targets = await db.all('SELECT * FROM targets WHERE project_id=?', [p.id]);
    const endpoints = await db.all('SELECT * FROM endpoints WHERE project_id=?', [p.id]);
    const findings = await db.all('SELECT * FROM findings WHERE project_id=?', [p.id]);
    const data = JSON.stringify({ project: p, targets: targets.result, endpoints: endpoints.result, findings: findings.result }, null, 2);
    const api = (window as any).electronAPI;
    if (api) {
      await api.fileSave({ defaultPath: `${p.name}-export.json`, content: data, filters: [{ name: 'JSON', extensions: ['json'] }] });
    } else {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${p.name}-export.json`; a.click();
    }
  };

  const importProject = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;
    const res = await api.fileOpen({ filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!res.success || !res.files.length) return;
    try {
      const data = JSON.parse(res.files[0].content);
      if (!data.project) { alert('Invalid project file'); return; }
      const p = data.project;
      const newPid = newId();
      await db.run(`INSERT OR IGNORE INTO projects (id,name,organization,platform,program_url,description,status,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [newPid, `${p.name} (imported)`, p.organization, p.platform, p.program_url, p.description, 'active', p.tags||'[]', nowISO(), nowISO()]);
      await refreshProjects();
    } catch { alert('Failed to parse project file'); }
  };

  const statusColor: Record<string, string> = { active: 'var(--green)', archived: 'var(--amber)', deleted: 'var(--red)' };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Projects</div>
          <div className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={importProject}><Upload size={13} /> Import</button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={13} /> New Project</button>
        </div>
      </div>

      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty-state">
            <Download size={40} />
            <h3>No Projects</h3>
            <p>Create your first pentest project to start tracking targets, findings, and evidence.</p>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Create Project</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {projects.map((p: any) => (
              <div key={p.id} className="card card-hover"
                style={{ borderColor: activeProject?.id === p.id ? 'var(--cyan)' : undefined,
                  boxShadow: activeProject?.id === p.id ? 'var(--glow-cyan)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>{p.name}</div>
                    {p.organization && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.organization}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className="status-dot" style={{ background: statusColor[p.status] || 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.status}</span>
                  </div>
                </div>
                {p.platform && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Platform: {p.platform}</div>}
                {p.description && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description}</div>}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Created {new Date(p.created_at).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setActiveProject(p)}>
                    {activeProject?.id === p.id ? <><CheckCircle size={12} /> Active</> : 'Open'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}><Edit2 size={12} /></button>
                  <button className="btn btn-secondary btn-sm" onClick={() => duplicate(p)}><Copy size={12} /></button>
                  <button className="btn btn-secondary btn-sm" onClick={() => exportProject(p)}><Download size={12} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id); }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Project' : 'New Project'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'name', label: 'Project Name *', placeholder: 'e.g. HackerOne — ExampleCorp' },
                { key: 'organization', label: 'Organization', placeholder: 'Target organization' },
                { key: 'platform', label: 'Platform', placeholder: 'HackerOne, Bugcrowd, Private…' },
                { key: 'program_url', label: 'Program URL', placeholder: 'https://hackerone.com/…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <div className="label">{label}</div>
                  <input className="input" placeholder={placeholder}
                    value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <div className="label">Description</div>
                <textarea className="textarea" rows={3} placeholder="Scope overview, testing goals…"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={!form.name.trim()}>
                  {editing ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
