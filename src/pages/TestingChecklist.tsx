import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { ClipboardList, Plus, CheckCircle, XCircle, AlertTriangle, Minus } from 'lucide-react';

const TEMPLATES: Record<string, { category: string; title: string; description: string }[]> = {
  'OWASP Web': [
    { category: 'Authentication', title: 'Credentials over HTTPS', description: 'Verify login uses HTTPS only' },
    { category: 'Authentication', title: 'Account lockout', description: 'Test brute-force protection' },
    { category: 'Session', title: 'Session token rotation', description: 'Verify new session on login' },
    { category: 'Session', title: 'Logout invalidates session', description: 'Confirm session destroyed on logout' },
    { category: 'Authorization', title: 'IDOR check - GET', description: 'Cross-account read access test' },
    { category: 'Authorization', title: 'IDOR check - POST', description: 'Cross-account write access test' },
    { category: 'Authorization', title: 'IDOR check - DELETE', description: 'Cross-account delete access test' },
    { category: 'Input Validation', title: 'Reflected XSS', description: 'Test input reflection in response' },
    { category: 'Input Validation', title: 'Stored XSS', description: 'Test persistent input in response' },
    { category: 'Input Validation', title: 'SQL injection probe', description: 'Test SQL syntax in parameters' },
    { category: 'Input Validation', title: 'SSRF probe', description: 'Test URL-fetching parameters' },
    { category: 'Input Validation', title: 'Open redirect', description: 'Test redirect URL parameters' },
    { category: 'Business Logic', title: 'Workflow step skip', description: 'Test skipping required workflow steps' },
    { category: 'Business Logic', title: 'Negative quantity', description: 'Test negative values in amount fields' },
  ],
  'Authorization / IDOR': [
    { category: 'Horizontal', title: 'Account A object → Account B', description: 'Account B reads Account A resource' },
    { category: 'Horizontal', title: 'Account B object → Account A', description: 'Account A reads Account B resource' },
    { category: 'Vertical', title: 'User reaching admin endpoint', description: 'Normal user accesses admin functionality' },
    { category: 'Vertical', title: 'Read authorization', description: 'Unauthorized read of resource' },
    { category: 'Vertical', title: 'Write authorization', description: 'Unauthorized write/update of resource' },
    { category: 'Vertical', title: 'Delete authorization', description: 'Unauthorized delete of resource' },
    { category: 'Unauthenticated', title: 'Unauthenticated access', description: 'Resource accessible without auth' },
  ],
  'File Upload': [
    { category: 'Filename', title: 'Path traversal in filename', description: 'Test ../../../etc/passwd as filename' },
    { category: 'Extension', title: 'Blocked extension bypass', description: 'Test double extension, null byte' },
    { category: 'MIME', title: 'MIME type mismatch', description: 'Upload PHP with image Content-Type' },
    { category: 'Storage', title: 'Direct URL access', description: 'Access uploaded file via direct URL' },
    { category: 'Storage', title: 'Listing prevention', description: 'Check if upload directory is listed' },
  ],
};

const STATUS_OPTIONS = ['not-started','testing','passed','needs-review','potential-issue','confirmed-finding','not-applicable'];
const STATUS_ICONS: Record<string, React.ReactNode> = {
  'not-started': <Minus size={13} color="var(--text-muted)" />,
  'testing': <AlertTriangle size={13} color="var(--blue)" />,
  'passed': <CheckCircle size={13} color="var(--green)" />,
  'needs-review': <AlertTriangle size={13} color="var(--amber)" />,
  'potential-issue': <AlertTriangle size={13} color="var(--amber)" />,
  'confirmed-finding': <XCircle size={13} color="var(--red)" />,
  'not-applicable': <Minus size={13} color="var(--text-muted)" />,
};

export default function TestingChecklist() {
  const { activeProject } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [template, setTemplate] = useState('OWASP Web');

  const load = async () => {
    if (!activeProject) { setItems([]); return; }
    const res = await db.all('SELECT * FROM checklist_items WHERE project_id=? AND template=? ORDER BY category,title', [activeProject.id, template]);
    if (res.success) setItems(res.result);
  };

  useEffect(() => { load(); }, [activeProject, template]);

  const initTemplate = async () => {
    if (!activeProject) return;
    const tmpl = TEMPLATES[template] || [];
    for (const item of tmpl) {
      const existing = await db.get('SELECT id FROM checklist_items WHERE project_id=? AND template=? AND title=?', [activeProject.id, template, item.title]);
      if (!existing.success || !existing.result) {
        await db.run('INSERT INTO checklist_items (id,project_id,template,category,title,description,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
          [newId(), activeProject.id, template, item.category, item.title, item.description, 'not-started', nowISO(), nowISO()]);
      }
    }
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await db.run('UPDATE checklist_items SET status=?,updated_at=? WHERE id=?', [status, nowISO(), id]);
    load();
  };

  const updateNote = async (id: string, notes: string) => {
    await db.run('UPDATE checklist_items SET notes=?,updated_at=? WHERE id=?', [notes, nowISO(), id]);
  };

  const categories = [...new Set(items.map(i => i.category))];
  const done = items.filter(i => ['passed','confirmed-finding','not-applicable'].includes(i.status)).length;
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Testing Checklist</div>
          <div className="page-subtitle">{done}/{items.length} complete · {progress}% · {activeProject?.name||'No project'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input select" style={{ width: 200 }} value={template} onChange={e => setTemplate(e.target.value)}>
            {Object.keys(TEMPLATES).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={initTemplate} disabled={!activeProject}>
            <Plus size={13}/> Load Template
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--cyan)', borderRadius: 3, transition: 'width var(--transition-slow)' }} />
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 700, minWidth: 40 }}>{progress}%</span>
          </div>
        </div>
      )}

      <div className="page-body" style={{ padding: items.length ? 16 : undefined }}>
        {items.length === 0 ? (
          <div className="empty-state"><ClipboardList size={40}/><h3>No Checklist</h3><p>Select a template and click Load Template to populate the checklist for your active project.</p></div>
        ) : (
          categories.map(cat => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                {cat}
              </div>
              {items.filter(i => i.category === cat).map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 12, padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>{STATUS_ICONS[item.status] || STATUS_ICONS['not-started']}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>{item.title}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>{item.description}</div>
                    <input className="input" style={{ fontSize: '0.78rem', padding: '3px 8px' }} placeholder="Notes…"
                      defaultValue={item.notes||''}
                      onBlur={e => updateNote(item.id, e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <select className="input select" style={{ fontSize: '0.75rem', padding: '2px 6px' }} value={item.status} onChange={e => updateStatus(item.id, e.target.value)}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/-/g,' ')}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
