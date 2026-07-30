import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Activity, Command, ExternalLink, Radio, Search, ShieldCheck } from 'lucide-react';
import { isWebDemo } from '../lib/db';
import Sidebar from './Sidebar';
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import Targets from '../pages/Targets';
import EndpointMap from '../pages/EndpointMap';
import HttpLab from '../pages/HttpLab';
import ParameterLab from '../pages/ParameterLab';
import AuthorizationLab from '../pages/AuthorizationLab';
import SessionLab from '../pages/SessionLab';
import JwtLab from '../pages/JwtLab';
import Decoder from '../pages/Decoder';
import ApiLab from '../pages/ApiLab';
import GraphqlLab from '../pages/GraphqlLab';
import WebsocketLab from '../pages/WebsocketLab';
import FileUploadLab from '../pages/FileUploadLab';
import ReconWorkspace from '../pages/ReconWorkspace';
import OwaspGuide from '../pages/OwaspGuide';
import TestingChecklist from '../pages/TestingChecklist';
import PayloadLibrary from '../pages/PayloadLibrary';
import ToolGuide from '../pages/ToolGuide';
import Notes from '../pages/Notes';
import Evidence from '../pages/Evidence';
import Findings from '../pages/Findings';
import Reports from '../pages/Reports';
import ActivityLog from '../pages/ActivityLog';
import Settings from '../pages/Settings';
import About from '../pages/About';
import GlobalSearch from './GlobalSearch';

const PAGE_MAP: Record<string, React.ReactNode> = {
  dashboard: <Dashboard />,
  projects: <Projects />,
  targets: <Targets />,
  recon: <ReconWorkspace />,
  endpoints: <EndpointMap />,
  httplab: <HttpLab />,
  authlab: <AuthorizationLab />,
  paramlab: <ParameterLab />,
  sessionlab: <SessionLab />,
  jwtlab: <JwtLab />,
  decoder: <Decoder />,
  apilab: <ApiLab />,
  graphqllab: <GraphqlLab />,
  wslab: <WebsocketLab />,
  uploadlab: <FileUploadLab />,
  owasp: <OwaspGuide />,
  checklist: <TestingChecklist />,
  payloads: <PayloadLibrary />,
  toolguide: <ToolGuide />,
  notes: <Notes />,
  evidence: <Evidence />,
  findings: <Findings />,
  reports: <Reports />,
  activity: <ActivityLog />,
  settings: <Settings />,
  about: <About />,
};

export default function AppShell() {
  const { activeTab, activeProject } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  const pageName = useMemo(() => ({
    dashboard: 'Command Center', projects: 'Projects', targets: 'Target Matrix',
    recon: 'Recon Workspace', endpoints: 'Endpoint Map', httplab: 'HTTP Lab',
    authlab: 'Authorization Lab', paramlab: 'Parameter Lab', sessionlab: 'Session Lab',
    jwtlab: 'JWT Lab', decoder: 'Decoder', apilab: 'API Lab', graphqllab: 'GraphQL Lab',
    wslab: 'WebSocket Lab', uploadlab: 'Upload Lab', owasp: 'OWASP Guide',
    checklist: 'Testing Checklist', payloads: 'Payload Library', toolguide: 'Tool Guide',
    notes: 'Research Notes', evidence: 'Evidence Vault', findings: 'Findings',
    reports: 'Reports', activity: 'Activity Log', settings: 'Settings', about: 'About',
  } as Record<string, string>)[activeTab] || 'Command Center', [activeTab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="app-shell">
      <div className="scanlines" />
      <div className="grid-bg app-grid" />
      <Sidebar />

      <section className="app-stage">
        <header className="command-bar">
          <div className="command-bar__location">
            <Command size={14} />
            <span>BOUNTYSCOPE</span>
            <span className="command-bar__slash">/</span>
            <strong>{pageName}</strong>
          </div>

          <button className="command-search" onClick={() => setSearchOpen(true)} aria-label="Open command search">
            <Search size={14} />
            <span>Search tools, endpoints, findings…</span>
            <kbd>CTRL K</kbd>
          </button>

          <div className="command-bar__telemetry">
            <span className="telemetry-item"><Radio size={12} /> {isWebDemo ? 'WEB DEMO' : 'LOCAL'}</span>
            <span className="telemetry-item telemetry-item--safe"><ShieldCheck size={12} /> {isWebDemo ? 'SAMPLE DATA' : 'VAULTED'}</span>
            <span className="telemetry-clock">{now.toLocaleTimeString([], { hour12: false })}</span>
          </div>
        </header>

        <div className="mission-strip">
          <span className="mission-strip__label"><Activity size={12} /> ACTIVE MISSION</span>
          <span className="mission-strip__name">{activeProject?.name || 'No project selected'}</span>
          <span className="mission-strip__status"><i /> SYSTEM READY</span>
        </div>

        {isWebDemo && (
          <div className="web-demo-banner">
            <span><strong>INTERACTIVE WEB DEMO</strong> — explore safely with sample data. Local database, evidence files, and live HTTP tools require the desktop edition.</span>
            <a href="https://github.com/sachineo/bountyscope-ultimate#installation" target="_blank" rel="noreferrer">
              GET DESKTOP <ExternalLink size={11} />
            </a>
          </div>
        )}

        <main className="app-content">
          {PAGE_MAP[activeTab] || <Dashboard />}
        </main>
      </section>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
