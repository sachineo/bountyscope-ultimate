import React, { useState } from 'react';
import { Upload, CheckCircle, AlertTriangle, Hash, Info } from 'lucide-react';

const CHECKLIST = [
  { id: 'fu-01', cat: 'Filename', title: 'Path traversal in filename', desc: 'Test: ../../../etc/passwd, ....//....//', risk: 'high' },
  { id: 'fu-02', cat: 'Extension', title: 'Blocked extension bypass', desc: 'Test: file.php.jpg, file.php%00.jpg, file.PHP, file.php5', risk: 'high' },
  { id: 'fu-03', cat: 'MIME Type', title: 'Content-Type bypass', desc: 'Upload PHP file with image/jpeg Content-Type header', risk: 'high' },
  { id: 'fu-04', cat: 'Storage', title: 'Direct URL access to uploaded file', desc: 'Find stored file URL and access directly', risk: 'high' },
  { id: 'fu-05', cat: 'Storage', title: 'Directory listing on upload path', desc: 'Check if upload directory allows file listing', risk: 'medium' },
  { id: 'fu-06', cat: 'Storage', title: 'File served with executable Content-Type', desc: 'Check if server sets text/html or application/x-httpd-php', risk: 'critical' },
  { id: 'fu-07', cat: 'Access Control', title: 'Other users can access uploaded file', desc: 'Upload as Account A, access with Account B or unauthenticated', risk: 'medium' },
  { id: 'fu-08', cat: 'Processing', title: 'Server-side image processing', desc: 'Check for ImageMagick, ffmpeg, or other processing tools in use', risk: 'medium' },
  { id: 'fu-09', cat: 'Metadata', title: 'Metadata extraction on upload', desc: 'Upload EXIF-rich image, check if metadata is stripped', risk: 'low' },
  { id: 'fu-10', cat: 'ZIP', title: 'Zip slip / archive extraction traversal', desc: 'If ZIP upload supported, test entries with ../ paths', risk: 'high' },
];

const RISK_COLORS: Record<string, string> = { critical: 'sev-critical', high: 'sev-high', medium: 'sev-medium', low: 'sev-low' };

export default function FileUploadLab() {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [filename, setFilename] = useState('');
  const [mime, setMime] = useState('');
  const [serverFilename, setServerFilename] = useState('');
  const [retrievalUrl, setRetrievalUrl] = useState('');
  const [hash, setHash] = useState('');

  const hashContent = async (text: string) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  };

  const computeHash = async () => {
    const h = await hashContent(filename + mime + Date.now());
    setHash(h);
  };

  const cats = [...new Set(CHECKLIST.map(c => c.cat))];

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">File Upload Lab</div><div className="page-subtitle">Checklist-driven file upload security testing</div></div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Checklist */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {cats.map(cat => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{cat}</div>
              {CHECKLIST.filter(c => c.cat === cat).map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 12, padding: '8px 10px', borderRadius: 'var(--radius)', background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    {statuses[item.id] === 'passed' ? <CheckCircle size={14} color="var(--green)" /> : statuses[item.id] === 'issue' ? <AlertTriangle size={14} color="var(--red)" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{item.title}</span>
                      <span className={`badge ${RISK_COLORS[item.risk]}`} style={{ fontSize: '0.65rem' }}>{item.risk}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className={`btn btn-sm ${statuses[item.id]==='passed'?'btn-primary':'btn-secondary'}`} onClick={() => setStatuses(s => ({...s,[item.id]:'passed'}))}>Pass</button>
                    <button className={`btn btn-sm ${statuses[item.id]==='issue'?'btn-danger':'btn-secondary'}`} onClick={() => setStatuses(s => ({...s,[item.id]:'issue'}))}>Issue</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setStatuses(s => ({...s,[item.id]:'na'}))}>N/A</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Analysis tools */}
        <div style={{ width: 280, borderLeft: '1px solid var(--border)', padding: '16px 12px', overflow: 'auto' }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>File Analysis</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div className="label">Original Filename</div>
              <input className="input input-mono" style={{ fontSize: '0.8rem' }} value={filename} onChange={e => setFilename(e.target.value)} placeholder="malicious.php" />
            </div>
            <div>
              <div className="label">Content-Type</div>
              <input className="input input-mono" style={{ fontSize: '0.8rem' }} value={mime} onChange={e => setMime(e.target.value)} placeholder="image/jpeg" />
            </div>
            <div>
              <div className="label">Server-returned Filename</div>
              <input className="input input-mono" style={{ fontSize: '0.8rem' }} value={serverFilename} onChange={e => setServerFilename(e.target.value)} placeholder="a3f4d7b9c2.jpg" />
            </div>
            <div>
              <div className="label">Retrieval URL</div>
              <input className="input input-mono" style={{ fontSize: '0.8rem' }} value={retrievalUrl} onChange={e => setRetrievalUrl(e.target.value)} placeholder="https://example.com/uploads/…" />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={computeHash}><Hash size={12}/> Generate Test Hash</button>
            {hash && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--cyan)', wordBreak: 'break-all' }}>{hash}</div>}
          </div>

          <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(255,171,0,0.06)', borderRadius: 'var(--radius)', border: '1px solid rgba(255,171,0,0.2)' }}>
            <div style={{ fontWeight: 700, color: 'var(--amber)', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
              <AlertTriangle size={13}/> Important
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Do not upload actual malware or webshells. Use harmless test files to verify upload behavior. Stop testing once impact is proven on researcher-controlled environment.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
