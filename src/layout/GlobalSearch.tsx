import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Search, ArrowRight, FolderOpen, Target, Bug, FileText, BookOpen, FlaskConical, Package, Wrench } from 'lucide-react';
import { db } from '../lib/db';

interface Result { type: string; label: string; sub?: string; action: string; icon: React.ReactNode; }

const COMMANDS: Result[] = [
  { type: 'cmd', label: 'New Project', sub: 'Create a new pentest project', action: 'projects', icon: <FolderOpen size={14} /> },
  { type: 'cmd', label: 'Add Target', sub: 'Add scope target', action: 'targets', icon: <Target size={14} /> },
  { type: 'cmd', label: 'Open HTTP Lab', sub: 'Repeater-style request editor', action: 'httplab', icon: <FlaskConical size={14} /> },
  { type: 'cmd', label: 'New Finding', sub: 'Create a vulnerability finding', action: 'findings', icon: <Bug size={14} /> },
  { type: 'cmd', label: 'OWASP Guide', sub: 'Interactive testing methodology', action: 'owasp', icon: <BookOpen size={14} /> },
  { type: 'cmd', label: 'Generate Report', sub: 'Export HackerOne / pentest report', action: 'reports', icon: <FileText size={14} /> },
  { type: 'cmd', label: 'Payload Library', sub: 'Test strings and probes', action: 'payloads', icon: <Package size={14} /> },
  { type: 'cmd', label: 'Tool Guide', sub: 'Security tool documentation', action: 'toolguide', icon: <Wrench size={14} /> },
];

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { setActiveTab } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>(COMMANDS);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults(COMMANDS); return; }

    const filtered = COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) || (c.sub || '').toLowerCase().includes(q)
    );

    // Also search DB
    (async () => {
      const dbResults: Result[] = [];
      const ep = await db.all(`SELECT method, path, full_url FROM endpoints WHERE full_url LIKE ? LIMIT 5`, [`%${q}%`]);
      if (ep.success) {
        for (const e of ep.result) {
          dbResults.push({ type: 'endpoint', label: `${e.method} ${e.path}`, sub: e.full_url, action: 'endpoints', icon: <FlaskConical size={14} /> });
        }
      }
      const fi = await db.all(`SELECT title, severity FROM findings WHERE title LIKE ? LIMIT 5`, [`%${q}%`]);
      if (fi.success) {
        for (const f of fi.result) {
          dbResults.push({ type: 'finding', label: f.title, sub: f.severity, action: 'findings', icon: <Bug size={14} /> });
        }
      }
      setResults([...filtered, ...dbResults]);
    })();
  }, [query]);

  const select = (r: Result) => {
    setActiveTab(r.action);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) select(results[selected]);
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--cyan)',
        borderRadius: 'var(--radius-xl)', width: 580, maxWidth: '90vw',
        boxShadow: 'var(--glow-cyan)', overflow: 'hidden',
      }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} color="var(--cyan)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKey}
            placeholder="Search endpoints, findings, commands…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: '0.95rem',
            }}
          />
          <kbd style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflow: 'auto', padding: 8 }}>
          {results.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              No results found
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => select(r)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--radius)',
                cursor: 'pointer',
                background: i === selected ? 'var(--bg-active)' : 'transparent',
                color: i === selected ? 'var(--cyan)' : 'var(--text-primary)',
                transition: 'all var(--transition)',
              }}
              onMouseEnter={() => setSelected(i)}
            >
              <div style={{ color: i === selected ? 'var(--cyan)' : 'var(--text-muted)', flexShrink: 0 }}>{r.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{r.label}</div>
                {r.sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>}
              </div>
              {i === selected && <ArrowRight size={14} />}
            </div>
          ))}
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span>↑↓ Navigate</span><span>↵ Open</span><span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
