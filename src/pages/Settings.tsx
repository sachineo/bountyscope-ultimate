import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { db, nowISO } from '../lib/db';
import { Settings as SettingsIcon, Save, Moon, Sun, Database, Shield, Wifi } from 'lucide-react';

const SECTIONS = ['Appearance','Network','Storage','Security','Reporting'];

export default function Settings() {
  const { theme, setTheme } = useApp();
  const [section, setSection] = useState('Appearance');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await db.all('SELECT key, value FROM settings');
      if (res.success) {
        const map: Record<string, string> = {};
        for (const r of res.result) map[r.key] = r.value;
        setSettings(map);
      }
    })();
  }, []);

  const setSetting = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }));

  const saveAll = async () => {
    for (const [key, value] of Object.entries(settings)) {
      await db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [key, value, nowISO()]);
    }
    if (settings.theme) setTheme(settings.theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Settings</div><div className="page-subtitle">Application configuration</div></div>
        <button className="btn btn-primary btn-sm" onClick={saveAll}>
          <Save size={13}/> {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Section nav */}
        <div style={{ width: 180, borderRight: '1px solid var(--border)', padding: '12px 8px' }}>
          {SECTIONS.map(s => (
            <div key={s} onClick={() => setSection(s)}
              className={`nav-item ${section === s ? 'active' : ''}`}>{s}</div>
          ))}
        </div>

        {/* Section content */}
        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {section === 'Appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Appearance</div>
              <div>
                <div className="label">Theme</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['cyberpunk','Cyberpunk Dark'],['dark','Dark'],['light','Light']].map(([val, label]) => (
                    <button key={val} className={`btn btn-sm ${(settings.theme||'cyberpunk')===val?'btn-primary':'btn-secondary'}`}
                      onClick={() => setSetting('theme', val)}>
                      {val === 'light' ? <Sun size={13}/> : <Moon size={13}/>} {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label">Font Size</div>
                <select className="input select" style={{ width: 180 }} value={settings.font_size||'14'} onChange={e => setSetting('font_size', e.target.value)}>
                  {['12','13','14','15','16'].map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="animations" checked={(settings.animations||'true')==='true'} onChange={e => setSetting('animations', e.target.checked ? 'true' : 'false')} />
                <label htmlFor="animations" style={{ cursor: 'pointer' }}>Enable animations and glow effects</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="compact" checked={(settings.compact||'false')==='true'} onChange={e => setSetting('compact', e.target.checked ? 'true' : 'false')} />
                <label htmlFor="compact" style={{ cursor: 'pointer' }}>Compact mode</label>
              </div>
            </div>
          )}

          {section === 'Network' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Network</div>
              <div>
                <div className="label">Proxy Host</div>
                <input className="input input-mono" placeholder="127.0.0.1" value={settings.proxy_host||''} onChange={e => setSetting('proxy_host', e.target.value)} />
              </div>
              <div>
                <div className="label">Proxy Port</div>
                <input className="input input-mono" placeholder="8080" value={settings.proxy_port||''} onChange={e => setSetting('proxy_port', e.target.value)} />
              </div>
              <div>
                <div className="label">Request Timeout (ms)</div>
                <input className="input" type="number" placeholder="30000" value={settings.timeout||'30000'} onChange={e => setSetting('timeout', e.target.value)} />
              </div>
              <div>
                <div className="label">Default User-Agent</div>
                <input className="input input-mono" placeholder="BountyScope/1.0" value={settings.user_agent||'BountyScope/1.0'} onChange={e => setSetting('user_agent', e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="follow_redirects" checked={(settings.follow_redirects||'true')==='true'} onChange={e => setSetting('follow_redirects', e.target.checked ? 'true' : 'false')} />
                <label htmlFor="follow_redirects" style={{ cursor: 'pointer' }}>Follow redirects</label>
              </div>
            </div>
          )}

          {section === 'Storage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Storage</div>
              <div>
                <div className="label">Database Location</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  {settings.db_path || '%AppData%/bountyscope-ultimate/bountyscope.db'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="autosave" checked={(settings.autosave||'true')==='true'} onChange={e => setSetting('autosave', e.target.checked ? 'true' : 'false')} />
                <label htmlFor="autosave" style={{ cursor: 'pointer' }}>Autosave project state</label>
              </div>
              <button className="btn btn-secondary" onClick={async () => { const res = await db.backup(); if (res.success) alert(`Backup saved to: ${res.path}`); }}>
                <Database size={13}/> Create Backup Now
              </button>
            </div>
          )}

          {section === 'Security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Security</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="hide_secrets" checked={(settings.hide_secrets||'true')==='true'} onChange={e => setSetting('hide_secrets', e.target.checked ? 'true' : 'false')} />
                <label htmlFor="hide_secrets" style={{ cursor: 'pointer' }}>Mask secrets in UI (tokens, cookies, passwords)</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="redact_logs" checked={(settings.redact_logs||'true')==='true'} onChange={e => setSetting('redact_logs', e.target.checked ? 'true' : 'false')} />
                <label htmlFor="redact_logs" style={{ cursor: 'pointer' }}>Redact tokens in exported logs</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="telemetry" checked={(settings.telemetry||'false')==='true'} onChange={e => setSetting('telemetry', e.target.checked ? 'true' : 'false')} />
                <label htmlFor="telemetry" style={{ cursor: 'pointer' }}>Enable telemetry (disabled by default)</label>
              </div>
              <div className="card" style={{ background: 'rgba(0,212,255,0.04)', borderColor: 'rgba(0,212,255,0.2)' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <Shield size={14} color="var(--cyan)" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  BountyScope runs entirely locally. No data is sent to external servers. No cloud sync.
                </div>
              </div>
            </div>
          )}

          {section === 'Reporting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Reporting</div>
              <div>
                <div className="label">Default Researcher Name</div>
                <input className="input" placeholder="Sachin" value={settings.researcher_name||'Sachin'} onChange={e => setSetting('researcher_name', e.target.value)} />
              </div>
              <div>
                <div className="label">Default Report Format</div>
                <select className="input select" value={settings.default_report||'hackerone'} onChange={e => setSetting('default_report', e.target.value)}>
                  <option value="hackerone">HackerOne Markdown</option>
                  <option value="bugcrowd">Bugcrowd Markdown</option>
                  <option value="pentest">Pentest Report</option>
                  <option value="generic">Generic Disclosure</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
