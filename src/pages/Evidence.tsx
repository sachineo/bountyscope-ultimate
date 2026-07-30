import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { Plus, Upload, Camera, Trash2, Copy, Hash, Link } from 'lucide-react';

export default function Evidence() {
  const { activeProject, logActivity } = useApp();
  const [evidence, setEvidence] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ filename:'', description:'', tags:'' });
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!activeProject) { setEvidence([]); return; }
    const res = await db.all('SELECT * FROM evidence WHERE project_id=? ORDER BY created_at DESC', [activeProject.id]);
    if (res.success) setEvidence(res.result);
  };

  useEffect(() => { load(); }, [activeProject]);

  const hashFile = async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
  };

  const dropHandler = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    for (const file of Array.from(e.dataTransfer.files)) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const content = ev.target?.result as string || '';
        const sha = await hashFile(content);
        const id = newId();
        await db.run(`INSERT INTO evidence (id,project_id,filename,file_type,file_size,sha256,description,tags,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
          [id, activeProject.id, file.name, file.type, file.size, sha, '', '[]', nowISO()]);
        await logActivity('evidence_added', 'Evidence', `Added evidence: ${file.name}`);
        load();
      };
      reader.readAsText(file);
    }
  };

  const del = async (id: string) => {
    await db.run('DELETE FROM evidence WHERE id=?', [id]);
    load();
  };

  const filtered = evidence.filter(e => !search || e.filename.toLowerCase().includes(search.toLowerCase()) || (e.description||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Evidence Manager</div><div className="page-subtitle">{evidence.length} file{evidence.length!==1?'s':''} · {activeProject?.name||'No project'}</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" style={{ width: 200 }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="page-body">
        {/* Drop zone */}
        <div onDragOver={e => e.preventDefault()} onDrop={dropHandler}
          style={{ border: '2px dashed var(--border-bright)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center', marginBottom: 20, background: 'rgba(0,212,255,0.02)', cursor: 'pointer', transition: 'all var(--transition)' }}>
          <Camera size={28} color="var(--text-muted)" style={{ marginBottom: 8 }} />
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Drag & drop files here</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>PNG, JPG, TXT, JSON, HAR, XML, CSV, Markdown</div>
          <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--amber)' }}>⚠ Redact Authorization headers, cookies, tokens, and passwords before saving</div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><Camera size={36}/><h3>No Evidence</h3><p>Drag and drop screenshots, request captures, or text files to add evidence.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Filename</th><th>Type</th><th>Size</th><th>SHA-256</th><th>Description</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600 }}>{ev.filename}</td>
                    <td><span className="badge badge-muted" style={{ fontSize: '0.68rem' }}>{ev.file_type || 'unknown'}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ev.file_size ? `${(ev.file_size/1024).toFixed(1)}KB` : '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={ev.sha256}>{ev.sha256?.slice(0,16)+'…'||'—'}</td>
                    <td style={{ fontSize: '0.8rem', maxWidth: 200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.description || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(ev.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Copy SHA-256" onClick={() => navigator.clipboard.writeText(ev.sha256||'')}><Hash size={12}/></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => del(ev.id)}><Trash2 size={12} color="var(--red)"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
