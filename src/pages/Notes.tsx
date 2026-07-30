import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { Plus, StickyNote, Edit2, Trash2, Save } from 'lucide-react';

export default function Notes() {
  const { activeProject } = useApp();
  const [notes, setNotes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const load = async () => {
    if (!activeProject) { setNotes([]); return; }
    const res = await db.all('SELECT * FROM notes WHERE project_id=? ORDER BY updated_at DESC', [activeProject.id]);
    if (res.success) setNotes(res.result);
  };
  useEffect(() => { load(); }, [activeProject]);

  const newNote = async () => {
    if (!activeProject) return;
    const note = { id: newId(), project_id: activeProject.id, title: 'New Note', content: '', tags: '[]', created_at: nowISO(), updated_at: nowISO() };
    await db.run('INSERT INTO notes (id,project_id,title,content,tags,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', [note.id, note.project_id, note.title, '', '[]', note.created_at, note.updated_at]);
    load(); setSelected(note); setTitle(note.title); setContent(''); setEditing(true);
  };

  const saveNote = async () => {
    if (!selected) return;
    await db.run('UPDATE notes SET title=?,content=?,updated_at=? WHERE id=?', [title, content, nowISO(), selected.id]);
    load(); setEditing(false);
  };

  const del = async (id: string) => {
    await db.run('DELETE FROM notes WHERE id=?', [id]);
    if (selected?.id === id) setSelected(null);
    load();
  };

  const QUICK_TEMPLATES = ['Interesting endpoint', 'Needs second account', 'Possible IDOR', 'Needs impact validation', 'False positive', 'Evidence captured', 'Report ready'];

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Notes</div></div>
        <button className="btn btn-primary btn-sm" onClick={newNote} disabled={!activeProject}><Plus size={13}/> New Note</button>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* List */}
        <div style={{ width: 240, borderRight: '1px solid var(--border)', overflow: 'auto', padding: 8 }}>
          {notes.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>No notes yet</div>
          ) : notes.map(n => (
            <div key={n.id} onClick={() => { setSelected(n); setTitle(n.title); setContent(n.content||''); setEditing(false); }}
              style={{ padding: '8px 10px', borderRadius: 'var(--radius)', cursor: 'pointer', background: selected?.id === n.id ? 'var(--bg-active)' : 'transparent', marginBottom: 2 }}>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: selected?.id === n.id ? 'var(--cyan)' : 'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(n.updated_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div className="empty-state"><StickyNote size={36}/><h3>Select a note</h3><p>Click a note to view or edit it, or create a new one.</p></div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <input className="input" style={{ flex: 1, fontWeight: 700, fontSize: '1rem' }} value={title} onChange={e => { setTitle(e.target.value); setEditing(true); }} placeholder="Note title" />
                <button className="btn btn-primary btn-sm" onClick={saveNote}><Save size={13}/> Save</button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => del(selected.id)}><Trash2 size={13}/></button>
              </div>
              {/* Quick templates */}
              <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                {QUICK_TEMPLATES.map(t => (
                  <button key={t} className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    onClick={() => { setContent(c => c + (c ? '\n' : '') + t); setEditing(true); }}>
                    + {t}
                  </button>
                ))}
              </div>
              <textarea style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: '0.88rem', padding: '16px', resize: 'none', lineHeight: 1.7 }}
                value={content} onChange={e => { setContent(e.target.value); setEditing(true); }} placeholder="Write your testing notes here…" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
