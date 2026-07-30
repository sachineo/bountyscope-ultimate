import { useEffect, useState } from 'react';
import { Code2, Crosshair, Database, ExternalLink, Globe2, Info, ShieldCheck, Sparkles } from 'lucide-react';
import { appAPI, fileAPI } from '../lib/db';

export default function About() {
  const [dbPath, setDbPath] = useState('Local encrypted workspace');
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    appAPI.getPath?.('userData').then((path: string) => setDbPath(`${path}/bountyscope.db`)).catch(() => {});
    appAPI.getVersion?.().then((appVersion: string) => setVersion(appVersion)).catch(() => {});
  }, []);

  const openSkoolic = () => {
    if ((window as { electronAPI?: unknown }).electronAPI) fileAPI.openExternal('https://skoolic.com');
    else window.open('https://skoolic.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="page about-page">
      <div className="page-header">
        <div>
          <div className="eyebrow"><Sparkles size={12} /> CREATOR PROFILE</div>
          <div className="page-title">About BountyScope</div>
          <div className="page-subtitle">Product identity, build information, and mission principles</div>
        </div>
      </div>

      <div className="page-body about-body">
        <section className="about-hero">
          <div className="about-logo"><Crosshair size={38} strokeWidth={1.8} /><i /></div>
          <div className="about-hero__copy">
            <span>OFFENSIVE OPERATIONS CONSOLE</span>
            <h1>BOUNTY<span>SCOPE</span></h1>
            <p>A local-first research environment built for disciplined, authorized security work.</p>
          </div>
          <div className="creator-card">
            <small>DEVELOPED BY</small>
            <strong>SACHIN</strong>
            <span>IN COLLABORATION WITH</span>
            <button onClick={openSkoolic}>SKOOLIC.COM <ExternalLink size={13} /></button>
          </div>
        </section>

        <section className="about-grid">
          <article className="intel-panel about-profile">
            <div className="panel-heading">
              <div><span>PRODUCT IDENTITY</span><strong>Build profile</strong></div>
              <Code2 size={16} />
            </div>
            {[
              ['Product', 'BountyScope Ultimate'],
              ['Creator', 'Sachin'],
              ['Company', 'skoolic.com'],
              ['Version', version],
              ['Runtime', 'Electron + React + TypeScript'],
              ['Data policy', 'Local-first / no cloud sync'],
            ].map(([label, value]) => (
              <div className="about-data-row" key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </article>

          <article className="intel-panel about-principles">
            <div className="panel-heading">
              <div><span>MISSION PRINCIPLES</span><strong>Built for responsible research</strong></div>
              <ShieldCheck size={16} />
            </div>
            <div><ShieldCheck size={17} /><span><strong>Authorized only</strong><small>Use exclusively on systems you own or have explicit permission to test.</small></span></div>
            <div><Database size={17} /><span><strong>Local by design</strong><small>Research artifacts remain inside your desktop workspace.</small></span></div>
            <div><Globe2 size={17} /><span><strong>Community ready</strong><small>Structured as a GitHub-ready project for transparent development.</small></span></div>
          </article>

          <article className="intel-panel about-storage">
            <div className="panel-heading">
              <div><span>LOCAL VAULT</span><strong>Database location</strong></div>
              <Database size={16} />
            </div>
            <code>{dbPath}</code>
          </article>

          <article className="intel-panel about-shortcuts">
            <div className="panel-heading">
              <div><span>OPERATOR CONTROL</span><strong>Keyboard shortcuts</strong></div>
              <span className="panel-index">KEYS</span>
            </div>
            {[['Ctrl+K', 'Global command palette'], ['Ctrl+Enter', 'Send HTTP request'], ['Ctrl+N', 'New request tab'], ['Ctrl+S', 'Save current item'], ['F5', 'Resend current request']].map(([key, label]) => (
              <div key={key}><kbd>{key}</kbd><span>{label}</span></div>
            ))}
          </article>
        </section>

        <div className="authorized-notice">
          <Info size={16} />
          <p><strong>Authorized testing only.</strong> BountyScope is designed for legal bug bounty, pentest, CTF, and controlled lab work. Always obtain explicit written permission before testing a target.</p>
        </div>
      </div>
    </div>
  );
}
