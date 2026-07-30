import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, FolderOpen, Target, Search, Map, FlaskConical,
  Shield, Variable, Lock, KeyRound, Code2, Globe, Network, Wifi,
  Upload, BookOpen, ClipboardList, Package, Wrench, StickyNote,
  Camera, Bug, FileText, Activity, Settings, Info, ChevronLeft, ChevronRight,
  Crosshair
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'WORKSPACE',
    items: [
      { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
      { id: 'projects', label: 'Projects', icon: FolderOpen },
      { id: 'targets', label: 'Targets', icon: Target },
      { id: 'recon', label: 'Recon Workspace', icon: Search },
      { id: 'endpoints', label: 'Endpoint Map', icon: Map },
    ],
  },
  {
    label: 'TESTING LABS',
    items: [
      { id: 'httplab', label: 'HTTP Lab', icon: FlaskConical },
      { id: 'authlab', label: 'Authorization Lab', icon: Shield },
      { id: 'paramlab', label: 'Parameter Lab', icon: Variable },
      { id: 'sessionlab', label: 'Session Lab', icon: Lock },
      { id: 'jwtlab', label: 'JWT Lab', icon: KeyRound },
      { id: 'decoder', label: 'Decoder', icon: Code2 },
      { id: 'apilab', label: 'API Lab', icon: Globe },
      { id: 'graphqllab', label: 'GraphQL Lab', icon: Network },
      { id: 'wslab', label: 'WebSocket Lab', icon: Wifi },
      { id: 'uploadlab', label: 'File Upload Lab', icon: Upload },
    ],
  },
  {
    label: 'METHODOLOGY',
    items: [
      { id: 'owasp', label: 'OWASP Guide', icon: BookOpen },
      { id: 'checklist', label: 'Testing Checklist', icon: ClipboardList },
      { id: 'payloads', label: 'Payload Library', icon: Package },
      { id: 'toolguide', label: 'Tool Guide', icon: Wrench },
    ],
  },
  {
    label: 'RESEARCH',
    items: [
      { id: 'notes', label: 'Notes', icon: StickyNote },
      { id: 'evidence', label: 'Evidence', icon: Camera },
      { id: 'findings', label: 'Findings', icon: Bug },
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'activity', label: 'Activity Log', icon: Activity },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'about', label: 'About', icon: Info },
    ],
  },
];

export default function Sidebar() {
  const {
    activeTab, setActiveTab, sidebarCollapsed, toggleSidebar,
    activeProject, projects, setActiveProject,
  } = useApp();

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="brand-lockup">
        <div className="brand-mark">
          <Crosshair size={19} strokeWidth={2.2} />
          <span />
        </div>
        {!sidebarCollapsed && (
          <div className="brand-copy">
            <strong>BOUNTY<span>SCOPE</span></strong>
            <small>OFFENSIVE OPERATIONS</small>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {!sidebarCollapsed && (
        <div className="project-switcher">
          <div className="project-switcher__top">
            <span>ACTIVE PROJECT</span>
            <i title="Encrypted local storage" />
          </div>
          <select
            value={activeProject?.id || ''}
            onChange={(event) => {
              const project = projects.find(item => item.id === event.target.value) || null;
              setActiveProject(project);
            }}
            aria-label="Select active project"
          >
            <option value="">Select mission…</option>
            {projects.map(project => <option value={project.id} key={project.id}>{project.name}</option>)}
          </select>
          <small>{activeProject?.organization || 'Choose a project workspace'}</small>
        </div>
      )}

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div className="nav-section" key={section.label}>
            {!sidebarCollapsed && (
              <div className="nav-section__label"><span>{section.label}</span></div>
            )}
            {section.items.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon size={16} />
                {!sidebarCollapsed && <span>{label}</span>}
                {!sidebarCollapsed && activeTab === id && <i className="nav-item__rail" />}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {!sidebarCollapsed && (
        <div className="sidebar-footer">
          <div><span className="status-dot green pulse" /> CORE ONLINE</div>
          <a href="https://skoolic.com" target="_blank" rel="noreferrer">
            <strong>SACHIN</strong><span> × SKOOLIC.COM</span>
          </a>
          <small>v1.0.0 // CREATOR BUILD</small>
        </div>
      )}
    </aside>
  );
}
