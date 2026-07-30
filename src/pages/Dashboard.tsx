import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../lib/db';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, AlertTriangle, ArrowRight, Bug, Camera, CheckCircle2,
  ClipboardList, Crosshair, FileText, FlaskConical, FolderOpen, Map, Plus,
  Radar, ScanLine, Shield, Zap,
} from 'lucide-react';

const SEV_COLORS: Record<string, string> = {
  critical: '#ff2d66', high: '#ff6b2c', medium: '#ffd166',
  low: '#5cc8ff', informational: '#64748b',
};

interface Stats {
  endpoints: number;
  requests: number;
  findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  evidence: number;
  tests_done: number;
  tests_total: number;
}

const defaultStats: Stats = {
  endpoints: 0, requests: 0, findings: 0, critical: 0, high: 0,
  medium: 0, low: 0, evidence: 0, tests_done: 0, tests_total: 0,
};

export default function Dashboard() {
  const { activeProject, setActiveTab, createProject, logActivity } = useApp();
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [severityData, setSeverityData] = useState<Array<{ name: string; value: number }>>([]);
  const [methodData, setMethodData] = useState<Array<{ method: string; count: number }>>([]);
  const [recentActivity, setRecentActivity] = useState<Array<Record<string, string>>>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjOrg, setNewProjOrg] = useState('');

  const loadStats = useCallback(async () => {
    if (!activeProject) {
      setStats(defaultStats);
      setSeverityData([]);
      setMethodData([]);
      setRecentActivity([]);
      return;
    }

    const pid = activeProject.id;
    const [ep, rq, fi, ev, ci, findingsBySev, methodDist, act] = await Promise.all([
      db.get('SELECT COUNT(*) as c FROM endpoints WHERE project_id=?', [pid]),
      db.get('SELECT COUNT(*) as c FROM saved_requests WHERE project_id=?', [pid]),
      db.get('SELECT COUNT(*) as c FROM findings WHERE project_id=?', [pid]),
      db.get('SELECT COUNT(*) as c FROM evidence WHERE project_id=?', [pid]),
      db.all('SELECT status FROM checklist_items WHERE project_id=?', [pid]),
      db.all('SELECT severity, COUNT(*) as c FROM findings WHERE project_id=? GROUP BY severity', [pid]),
      db.all('SELECT method, COUNT(*) as c FROM endpoints WHERE project_id=? GROUP BY method', [pid]),
      db.all('SELECT * FROM activity WHERE project_id=? ORDER BY created_at DESC LIMIT 6', [pid]),
    ]);

    const severityMap: Record<string, number> = {};
    if (findingsBySev.success) {
      for (const row of findingsBySev.result) severityMap[row.severity] = row.c;
    }
    const completed = ci.success
      ? ci.result.filter((row: { status: string }) => ['passed', 'confirmed-finding'].includes(row.status)).length
      : 0;
    const total = ci.success ? ci.result.length : 0;

    setStats({
      endpoints: ep.success ? ep.result.c : 0,
      requests: rq.success ? rq.result.c : 0,
      findings: fi.success ? fi.result.c : 0,
      critical: severityMap.critical || 0,
      high: severityMap.high || 0,
      medium: severityMap.medium || 0,
      low: severityMap.low || 0,
      evidence: ev.success ? ev.result.c : 0,
      tests_done: completed,
      tests_total: total,
    });
    setSeverityData(findingsBySev.success
      ? findingsBySev.result.map((row: { severity: string; c: number }) => ({ name: row.severity, value: row.c }))
      : []);
    setMethodData(methodDist.success
      ? methodDist.result.map((row: { method: string; c: number }) => ({ method: row.method, count: row.c }))
      : []);
    setRecentActivity(act.success ? act.result : []);
  }, [activeProject]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const readiness = stats.tests_total ? Math.round((stats.tests_done / stats.tests_total) * 100) : 0;
  const nextMove = useMemo(() => {
    if (!activeProject) return { title: 'Initialize your first mission', text: 'Create a project and define the authorized scope before testing.', tab: 'projects', action: 'Create project' };
    if (!stats.endpoints) return { title: 'Map the attack surface', text: 'Import or record endpoints to build a testable target graph.', tab: 'endpoints', action: 'Open endpoint map' };
    if (!stats.tests_total) return { title: 'Generate a test plan', text: 'Load the methodology checklist and establish test coverage.', tab: 'checklist', action: 'Build checklist' };
    if (stats.critical || stats.high) return { title: 'Triage high-impact findings', text: `${stats.critical + stats.high} priority finding${stats.critical + stats.high === 1 ? '' : 's'} require validation and evidence.`, tab: 'findings', action: 'Review findings' };
    return { title: 'Continue coverage expansion', text: `${readiness}% of the current checklist is complete. Focus on uncovered attack paths.`, tab: 'checklist', action: 'Resume testing' };
  }, [activeProject, readiness, stats.critical, stats.endpoints, stats.high, stats.tests_total]);

  const handleCreateProject = async () => {
    if (!newProjName.trim()) return;
    const project = await createProject({ name: newProjName.trim(), organization: newProjOrg.trim() });
    await logActivity('project_created', 'Projects', `Created project: ${project.name}`);
    setNewProjName('');
    setNewProjOrg('');
    setShowNewProject(false);
  };

  const metrics = [
    { label: 'Mapped endpoints', value: stats.endpoints, icon: Map, tab: 'endpoints', tone: 'cyan' },
    { label: 'Requests captured', value: stats.requests, icon: FlaskConical, tab: 'httplab', tone: 'violet' },
    { label: 'Active findings', value: stats.findings, icon: Bug, tab: 'findings', tone: 'amber' },
    { label: 'Evidence objects', value: stats.evidence, icon: Camera, tab: 'evidence', tone: 'green' },
  ];

  const quickActions = [
    { label: 'Run recon', sub: 'Map new assets', icon: Radar, tab: 'recon' },
    { label: 'Send request', sub: 'Open HTTP lab', icon: Zap, tab: 'httplab' },
    { label: 'Test access', sub: 'Authorization matrix', icon: Shield, tab: 'authlab' },
    { label: 'Log finding', sub: 'Capture impact', icon: Bug, tab: 'findings' },
    { label: 'Add evidence', sub: 'Preserve proof', icon: Camera, tab: 'evidence' },
    { label: 'Build report', sub: 'Prepare disclosure', icon: FileText, tab: 'reports' },
  ];

  return (
    <div className="page dashboard">
      <div className="page-header dashboard-header">
        <div>
          <div className="eyebrow"><ScanLine size={12} /> OPERATOR OVERVIEW</div>
          <div className="page-title">Command Center</div>
          <div className="page-subtitle">
            {activeProject ? `Live intelligence for ${activeProject.name}` : 'Create or select a mission to begin'}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowNewProject(true)}>
            <Plus size={14} /> New mission
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab('findings')}>
            <Crosshair size={14} /> Log finding
          </button>
        </div>
      </div>

      <div className="page-body dashboard-body">
        <section className="mission-hero">
          <div className="mission-hero__noise" />
          <div className="signal-graph" aria-hidden="true">
            {Array.from({ length: 34 }, (_, index) => (
              <i
                key={index}
                style={{
                  '--signal-height': `${18 + ((index * 37) % 76)}%`,
                  '--signal-delay': `${index * -0.07}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="scanner-beam" aria-hidden="true" />
          <div className="mission-hero__copy">
            <span className="system-chip"><i /> OPERATIONAL STATUS: READY</span>
            <a className="creator-signature" href="https://skoolic.com" target="_blank" rel="noreferrer">
              DEVELOPED BY <strong>SACHIN</strong><span>×</span><strong>SKOOLIC.COM</strong>
            </a>
            <h1>{activeProject?.name || 'NO ACTIVE MISSION'}</h1>
            <p>{activeProject
              ? `${activeProject.organization || 'Private program'} · authorized testing workspace`
              : 'Select a project from the left rail or initialize a new authorized research workspace.'}</p>
            <div className="mission-hero__actions">
              <button className="btn btn-primary" onClick={() => activeProject ? setActiveTab('recon') : setShowNewProject(true)}>
                {activeProject ? <><Radar size={15} /> Launch recon</> : <><Plus size={15} /> Initialize mission</>}
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveTab('checklist')}>
                <ClipboardList size={15} /> View test plan
              </button>
            </div>
          </div>
          <div className="readiness-module">
            <div className="readiness-ring" style={{ '--progress': `${readiness * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{readiness}%</strong><span>COVERAGE</span></div>
            </div>
            <div className="readiness-copy">
              <small>MISSION READINESS</small>
              <strong>{stats.tests_done} / {stats.tests_total || 0} tests complete</strong>
              <span>{stats.critical ? `${stats.critical} critical signal${stats.critical === 1 ? '' : 's'} detected` : 'No critical signals recorded'}</span>
            </div>
            <div className="telemetry-pulse" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

        <section className="metric-grid">
          {metrics.map(({ label, value, icon: Icon, tab, tone }) => (
            <button className={`metric-card metric-card--${tone}`} onClick={() => setActiveTab(tab)} key={label}>
              <div className="metric-card__icon"><Icon size={18} /></div>
              <div><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span></div>
              <ArrowRight size={14} className="metric-card__arrow" />
            </button>
          ))}
        </section>

        <section className="dashboard-grid">
          <div className="intel-panel intel-panel--wide">
            <div className="panel-heading">
              <div><span>ATTACK SURFACE</span><strong>Request distribution</strong></div>
              <span className="panel-index">01</span>
            </div>
            {methodData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={methodData} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 6" stroke="rgba(130, 165, 190, .12)" vertical={false} />
                  <XAxis dataKey="method" tick={{ fill: '#7890a4', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#5b7083', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0, 245, 212, .04)' }} contentStyle={{ background: '#08131a', border: '1px solid #173545', borderRadius: 2, fontSize: 11 }} />
                  <Bar dataKey="count" fill="var(--cyan)" radius={[2, 2, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart icon={Map} label="No endpoint telemetry yet" action={() => setActiveTab('endpoints')} />}
          </div>

          <div className="intel-panel">
            <div className="panel-heading">
              <div><span>RISK SIGNALS</span><strong>Severity profile</strong></div>
              <span className="panel-index">02</span>
            </div>
            {severityData.length ? (
              <div className="severity-layout">
                <ResponsiveContainer width="56%" height={190}>
                  <PieChart>
                    <Pie data={severityData} cx="50%" cy="50%" innerRadius={54} outerRadius={76} paddingAngle={4} dataKey="value" stroke="none">
                      {severityData.map(item => <Cell key={item.name} fill={SEV_COLORS[item.name] || '#64748b'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#08131a', border: '1px solid #173545', borderRadius: 2, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="severity-legend">
                  {['critical', 'high', 'medium', 'low'].map(level => (
                    <div key={level}><i style={{ background: SEV_COLORS[level] }} /><span>{level}</span><strong>{stats[level as keyof Stats]}</strong></div>
                  ))}
                </div>
              </div>
            ) : <EmptyChart icon={Shield} label="No risk signals recorded" action={() => setActiveTab('findings')} />}
          </div>

          <div className="intel-panel next-move">
            <div className="panel-heading">
              <div><span>TACTICAL ADVISOR</span><strong>Recommended next move</strong></div>
              <span className="panel-index">03</span>
            </div>
            <div className="next-move__signal"><AlertTriangle size={18} /></div>
            <h3>{nextMove.title}</h3>
            <p>{nextMove.text}</p>
            <button className="text-action" onClick={() => nextMove.tab === 'projects' ? setShowNewProject(true) : setActiveTab(nextMove.tab)}>
              {nextMove.action} <ArrowRight size={13} />
            </button>
          </div>

          <div className="intel-panel intel-panel--actions">
            <div className="panel-heading">
              <div><span>QUICK DEPLOY</span><strong>Operator actions</strong></div>
              <span className="panel-index">04</span>
            </div>
            <div className="action-grid">
              {quickActions.map(({ label, sub, icon: Icon, tab }) => (
                <button onClick={() => setActiveTab(tab)} key={label}>
                  <Icon size={16} /><span><strong>{label}</strong><small>{sub}</small></span><ArrowRight size={12} />
                </button>
              ))}
            </div>
          </div>

          <div className="intel-panel activity-feed">
            <div className="panel-heading">
              <div><span>EVENT STREAM</span><strong>Recent activity</strong></div>
              <button onClick={() => setActiveTab('activity')}>VIEW ALL</button>
            </div>
            {recentActivity.length ? recentActivity.map((item, index) => (
              <div className="activity-row" key={`${item.created_at}-${index}`}>
                <span className="activity-row__marker"><CheckCircle2 size={13} /></span>
                <div><strong>{item.description}</strong><small>{item.module}</small></div>
                <time>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
              </div>
            )) : (
              <div className="activity-empty"><Activity size={18} /> Event stream is quiet. Launch an operator action to begin.</div>
            )}
          </div>
        </section>
      </div>

      {showNewProject && (
        <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="modal cyber-modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div><span className="eyebrow">NEW WORKSPACE</span><div className="modal-title">Initialize Mission</div></div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNewProject(false)} aria-label="Close">✕</button>
            </div>
            <div className="form-stack">
              <label><span>MISSION NAME *</span><input className="input" value={newProjName} onChange={event => setNewProjName(event.target.value)} placeholder="ExampleCorp Web Program" autoFocus onKeyDown={event => event.key === 'Enter' && handleCreateProject()} /></label>
              <label><span>PLATFORM / ORGANIZATION</span><input className="input" value={newProjOrg} onChange={event => setNewProjOrg(event.target.value)} placeholder="HackerOne, Bugcrowd, private…" /></label>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowNewProject(false)}>Abort</button>
                <button className="btn btn-primary" onClick={handleCreateProject} disabled={!newProjName.trim()}><FolderOpen size={14} /> Create mission</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyChart({ icon: Icon, label, action }: { icon: typeof Map; label: string; action: () => void }) {
  return (
    <button className="chart-empty" onClick={action}>
      <Icon size={24} /><span>{label}</span><small>Click to add intelligence</small>
    </button>
  );
}
