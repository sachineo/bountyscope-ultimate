import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { Activity, Download } from 'lucide-react';

export default function ActivityLog() {
  const { activeProject } = useApp();
  const [logs, setLogs] = useState<any[]>([]);
  const [moduleFilter, setModuleFilter] = useState('');

  const load = useCallback(async () => {
    if (!activeProject) { setLogs([]); return; }
    const res = await db.all('SELECT * FROM activity WHERE project_id=? ORDER BY created_at DESC LIMIT 200', [activeProject.id]);
    if (res.success) setLogs(res.result);
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const modules = [...new Set(logs.map(l => l.module))].filter(Boolean);
  const filtered = logs.filter(l => !moduleFilter || l.module === moduleFilter);

  const exportLogs = () => {
    const content = JSON.stringify(filtered, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'activity-log.json'; a.click();
  };

  const actionColor = (action: string) => {
    if (action.includes('finding')) return 'var(--amber)';
    if (action.includes('evidence')) return 'var(--blue)';
    if (action.includes('request')) return 'var(--cyan)';
    if (action.includes('project') || action.includes('target')) return 'var(--green)';
    return 'var(--text-muted)';
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Activity Log</div><div className="page-subtitle">{filtered.length} entries</div></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input select" style={{ width: 160 }} value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
            <option value="">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={exportLogs}><Download size={13}/> Export</button>
        </div>
      </div>
      <div className="page-body" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><Activity size={36}/><h3>No Activity</h3><p>Activity is recorded as you use the application.</p></div>
        ) : (
          <div style={{ padding: 16 }}>
            {filtered.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < filtered.length - 1 ? '1px solid rgba(30,45,66,0.4)' : 'none' }}>
                <div className="status-dot" style={{ background: actionColor(log.action || ''), marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{log.description}</span>
                    <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>{log.module}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
