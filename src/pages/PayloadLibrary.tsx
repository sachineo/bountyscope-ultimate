import React, { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { useApp } from '../context/AppContext';
import { Package, Copy, Star, StarOff, FlaskConical, Search } from 'lucide-react';

export default function PayloadLibrary() {
  const { setActiveTab } = useApp();
  const [payloads, setPayloads] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    const res = await db.all('SELECT * FROM payloads ORDER BY category,name');
    if (res.success) setPayloads(res.result);
  };
  useEffect(() => { load(); }, []);

  const categories = [...new Set(payloads.map(p => p.category))].filter(Boolean);

  const toggleFav = async (p: any) => {
    await db.run('UPDATE payloads SET is_favorite=? WHERE id=?', [p.is_favorite ? 0 : 1, p.id]);
    load();
  };

  const copyPayload = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const sendToHttpLab = (value: string) => {
    sessionStorage.setItem('httplab_body', value);
    setActiveTab('httplab');
  };

  const filtered = payloads.filter(p => {
    if (category && p.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name?.toLowerCase().includes(q) || p.value?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const catColors: Record<string, string> = {
    'XSS Probes': 'var(--amber)', 'SQL Probes': 'var(--red)', 'Path Traversal': 'var(--cyan)',
    'SSRF Probes': 'var(--blue)', 'SSTI Probes': 'var(--purple)', 'Open Redirect': 'var(--green)',
    'Header Injection': 'var(--amber)', 'JSON Probes': 'var(--cyan)', 'NoSQL Probes': 'var(--red)',
    'Unicode Probes': 'var(--text-muted)', 'File Upload': 'var(--amber)',
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Payload Library</div><div className="page-subtitle">{payloads.length} payloads across {categories.length} categories</div></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 10px' }}>
            <Search size={13} color="var(--text-muted)" />
            <input style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', width: 180, fontSize: '0.84rem' }}
              placeholder="Search payloads…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Category sidebar */}
        <div style={{ width: 180, borderRight: '1px solid var(--border)', overflow: 'auto', padding: '8px 8px' }}>
          <div onClick={() => setCategory('')} className={`nav-item ${!category ? 'active' : ''}`}>All Payloads</div>
          <div onClick={() => setCategory('__favorites__')} className={`nav-item ${category === '__favorites__' ? 'active' : ''}`}>
            <Star size={13} /> Favorites
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
          {categories.map(c => (
            <div key={c} onClick={() => setCategory(c)} className={`nav-item ${category === c ? 'active' : ''}`}
              style={{ color: category === c ? 'var(--cyan)' : undefined }}>
              {c}
            </div>
          ))}
        </div>

        {/* Payload table */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {filtered.length === 0 ? (
            <div className="empty-state"><Package size={36}/><h3>No Payloads</h3><p>No payloads match your filter.</p></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Category</th><th>Name</th><th>Payload</th><th>Description</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.filter(p => category !== '__favorites__' || p.is_favorite).map(p => (
                  <tr key={p.id}>
                    <td>
                      <span className="badge" style={{ background: `${catColors[p.category]||'var(--text-muted)'}20`, color: catColors[p.category]||'var(--text-muted)', border: `1px solid ${catColors[p.category]||'var(--border)'}40`, fontSize: '0.68rem' }}>
                        {p.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, fontSize: '0.84rem' }}>{p.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--cyan)' }} title={p.value}>
                      {p.value}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.description}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title={copied === p.id ? 'Copied!' : 'Copy'} onClick={() => copyPayload(p.id, p.value)}>
                          <Copy size={12} color={copied === p.id ? 'var(--green)' : undefined} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Send to HTTP Lab" onClick={() => sendToHttpLab(p.value)}>
                          <FlaskConical size={12} color="var(--cyan)" />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" title={p.is_favorite ? 'Unfavorite' : 'Favorite'} onClick={() => toggleFav(p)}>
                          {p.is_favorite ? <Star size={12} color="var(--amber)" fill="var(--amber)" /> : <StarOff size={12} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
