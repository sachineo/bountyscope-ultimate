import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { db, newId, nowISO } from '../lib/db';
import { Search, Plus, Trash2, Copy, Terminal } from 'lucide-react';

const TOOL_COMMANDS: Record<string, { desc: string; syntax: string; example: string; flags: string[] }> = {
  subfinder: { desc: 'Passive subdomain discovery', syntax: 'subfinder -d TARGET -o output.txt', example: 'subfinder -d example.com -o subs.txt', flags: ['-d (domain)', '-o (output)', '-silent', '-all', '-recursive'] },
  amass: { desc: 'In-depth attack surface mapping', syntax: 'amass enum -d TARGET', example: 'amass enum -passive -d example.com', flags: ['-d', '-passive', '-active', '-o', '-brute'] },
  httpx: { desc: 'HTTP probing and technology detection', syntax: 'httpx -l hosts.txt -o live.txt', example: 'cat subs.txt | httpx -title -tech-detect -status-code', flags: ['-l', '-title', '-tech-detect', '-status-code', '-silent'] },
  katana: { desc: 'Next-gen web crawling', syntax: 'katana -u TARGET -o urls.txt', example: 'katana -u https://example.com -d 3 -o urls.txt', flags: ['-u', '-d (depth)', '-o', '-silent', '-jc (JS crawl)'] },
  gau: { desc: 'Get all URLs from Wayback Machine, Common Crawl, etc.', syntax: 'gau TARGET | tee urls.txt', example: 'gau example.com | grep "api" | tee api-urls.txt', flags: ['--blacklist (ext)', '--threads', '--providers'] },
  ffuf: { desc: 'Fast web fuzzer for content discovery', syntax: 'ffuf -w WORDLIST -u TARGET/FUZZ', example: 'ffuf -w /usr/share/wordlists/dirb/common.txt -u https://example.com/FUZZ -mc 200,301,302', flags: ['-w', '-u', '-mc (match codes)', '-fc (filter codes)', '-t (threads)', '-o'] },
  nmap: { desc: 'Network scanning and port discovery', syntax: 'nmap -sV -p- TARGET', example: 'nmap -sV -sC -p 80,443,8080,8443 example.com', flags: ['-sV (version)', '-sC (scripts)', '-p (ports)', '-oN (output)', '-T4 (timing)'] },
  nuclei: { desc: 'Template-based vulnerability scanner', syntax: 'nuclei -u TARGET -t TEMPLATES', example: 'nuclei -u https://example.com -t exposures/ -severity medium,high,critical', flags: ['-u', '-l', '-t (templates)', '-severity', '-o', '-silent'] },
};

export default function ReconWorkspace() {
  const { activeProject, logActivity } = useApp();
  const [hosts, setHosts] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState('subfinder');
  const [targetDomain, setTargetDomain] = useState('');
  const [customCmd, setCustomCmd] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [showAddHost, setShowAddHost] = useState(false);
  const [newHost, setNewHost] = useState({ host:'', ip:'', technology:'', notes:'' });

  const load = useCallback(async () => {
    if (!activeProject) { setHosts([]); return; }
    const res = await db.all('SELECT * FROM recon_hosts WHERE project_id=? ORDER BY host', [activeProject.id]);
    if (res.success) setHosts(res.result);
  }, [activeProject]);

  useEffect(() => { load(); }, [load]);

  const addHost = async () => {
    if (!activeProject || !newHost.host) return;
    await db.run('INSERT INTO recon_hosts (id,project_id,host,ip,technology,notes,source,created_at) VALUES (?,?,?,?,?,?,?,?)',
      [newId(), activeProject.id, newHost.host, newHost.ip, newHost.technology, newHost.notes, 'manual', nowISO()]);
    await logActivity('host_added', 'Recon', `Added host: ${newHost.host}`);
    setNewHost({ host:'', ip:'', technology:'', notes:'' });
    setShowAddHost(false); load();
  };

  const del = async (id: string) => { await db.run('DELETE FROM recon_hosts WHERE id=?', [id]); load(); };

  const tool = TOOL_COMMANDS[selectedTool];
  const generatedCmd = targetDomain ? tool.syntax.replace('TARGET', targetDomain) : tool.example;

  const copyCmd = () => { navigator.clipboard.writeText(generatedCmd); setCopiedCmd(true); setTimeout(() => setCopiedCmd(false), 1500); };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Recon Workspace</div><div className="page-subtitle">Host inventory and reconnaissance command builder</div></div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddHost(true)} disabled={!activeProject}><Plus size={13}/> Add Host</button>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Host inventory */}
        <div style={{ flex: 1, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Host Inventory ({hosts.length})</div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {hosts.length === 0 ? (
              <div className="empty-state"><Search size={32}/><h3>No Hosts</h3><p>Add discovered hosts or import recon output</p></div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th>Host</th><th>IP</th><th>Technology</th><th>Notes</th><th>Source</th><th></th></tr></thead>
                <tbody>
                  {hosts.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--cyan)' }}>{h.host}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{h.ip||'—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{h.technology||'—'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{h.notes||'—'}</td>
                      <td><span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>{h.source}</span></td>
                      <td><button className="btn btn-ghost btn-icon btn-sm" onClick={() => del(h.id)}><Trash2 size={12} color="var(--red)"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Command builder */}
        <div style={{ width: 380, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Command Builder</div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            <div className="label">Target Domain</div>
            <input className="input input-mono" style={{ marginBottom: 10 }} value={targetDomain} onChange={e => setTargetDomain(e.target.value)} placeholder="example.com" />
            <div className="label">Tool</div>
            <select className="input select" style={{ marginBottom: 12 }} value={selectedTool} onChange={e => setSelectedTool(e.target.value)}>
              {Object.keys(TOOL_COMMANDS).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {tool && (
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{selectedTool}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>{tool.desc}</div>
                <div style={{ marginBottom: 8 }}>
                  <div className="label">Generated Command</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div className="code-block" style={{ flex: 1, fontSize: '0.78rem', wordBreak: 'break-all' }}>{generatedCmd}</div>
                    <button className="btn btn-secondary btn-sm btn-icon" onClick={copyCmd} title="Copy command">
                      <Copy size={12} color={copiedCmd ? 'var(--green)' : undefined} />
                    </button>
                  </div>
                </div>
                <div className="label">Common Flags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {tool.flags.map(f => <span key={f} className="badge badge-muted" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>{f}</span>)}
                </div>
              </div>
            )}
            <div style={{ padding: '8px 10px', background: 'rgba(255,171,0,0.06)', border: '1px solid rgba(255,171,0,0.2)', borderRadius: 'var(--radius)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              ⚠ Verify all reconnaissance is authorized by the program scope before executing. Never run active scanning tools on targets not in scope.
            </div>
          </div>
        </div>
      </div>

      {showAddHost && (
        <div className="modal-overlay" onClick={() => setShowAddHost(false)}>
          <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Add Host</div><button className="btn btn-ghost btn-icon" onClick={() => setShowAddHost(false)}>✕</button></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['host','Host / Domain *','example.com'],['ip','IP Address','93.184.216.34'],['technology','Technology','nginx, React'],['notes','Notes','']].map(([k,l,p]) => (
                <div key={k}><div className="label">{l}</div><input className="input" placeholder={p} value={(newHost as any)[k]} onChange={e => setNewHost(n => ({...n,[k]:e.target.value}))} /></div>
              ))}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowAddHost(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={addHost} disabled={!newHost.host}>Add Host</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
