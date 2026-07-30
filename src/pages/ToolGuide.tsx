import React, { useState } from 'react';
import { Wrench, Copy, ChevronRight, ExternalLink } from 'lucide-react';

const TOOLS: Record<string, { category: string; purpose: string; install: string; syntax: string; example: string; flags: string[]; output: string; when_not: string; import_note: string }[]> = {
  'Proxy / HTTP': [
    { category: 'Proxy', purpose: 'Intercept, inspect, and modify HTTP/HTTPS traffic between browser and server', install: 'Download from portswigger.net', syntax: 'Launch via GUI', example: 'Configure browser proxy to 127.0.0.1:8080', flags: ['Intercept tab', 'Repeater', 'Scanner (Pro)', 'Intruder'], output: 'HTTP request/response pairs, findings', when_not: 'Mass automated scanning without authorization', import_note: 'Export proxy history as XML/JSON, import into BountyScope Endpoint Map' },
  ],
  'DNS / Subdomains': [
    { category: 'DNS', purpose: 'Fast passive subdomain enumeration using multiple data sources', install: 'go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest', syntax: 'subfinder -d TARGET [-o output.txt] [-silent]', example: 'subfinder -d example.com -o subs.txt', flags: ['-d (domain)', '-o (output file)', '-silent (no banner)', '-all (all sources)', '-recursive'], output: 'List of discovered subdomains', when_not: 'Active DNS brute-force without authorization', import_note: 'Paste output into BountyScope Recon Workspace / import as newline list to Targets' },
    { category: 'DNS', purpose: 'Fast DNS resolution and probing', install: 'go install -v github.com/projectdiscovery/dnsx/cmd/dnsx@latest', syntax: 'cat subs.txt | dnsx -resp', example: 'cat subs.txt | dnsx -resp -a -aaaa -cname', flags: ['-resp', '-a', '-cname', '-mx', '-o'], output: 'Resolved hostnames with record types', when_not: 'Large-scale automated DNS queries', import_note: 'Import resolved hosts to Recon Workspace' },
  ],
  'URL / Endpoint Discovery': [
    { category: 'URL', purpose: 'Fetch known URLs from Wayback Machine, Common Crawl, OTX, URLScan', install: 'go install github.com/lc/gau/v2/cmd/gau@latest', syntax: 'gau TARGET | tee urls.txt', example: 'gau example.com | grep "api" | sort -u', flags: ['--blacklist (ext to ignore)', '--threads', '--providers'], output: 'List of historical URLs', when_not: 'Not suitable for finding new endpoints (only historical)', import_note: 'Import as URL list to Endpoint Map' },
    { category: 'URL', purpose: 'Active web crawling with JavaScript execution support', install: 'go install github.com/projectdiscovery/katana/cmd/katana@latest', syntax: 'katana -u TARGET -o urls.txt', example: 'katana -u https://example.com -d 3 -jc -o crawl.txt', flags: ['-u (URL)', '-d (depth)', '-jc (JS crawl)', '-o', '-silent'], output: 'Crawled URLs and endpoints', when_not: 'Without explicit crawl permission, avoid aggressive crawling', import_note: 'Import crawled URLs to Endpoint Map' },
  ],
  'Content Discovery': [
    { category: 'Fuzzer', purpose: 'Fast HTTP fuzzer for directory/file discovery and parameter fuzzing', install: 'go install github.com/ffuf/ffuf/v2@latest', syntax: 'ffuf -w WORDLIST -u URL/FUZZ', example: 'ffuf -w /opt/wordlists/common.txt -u https://example.com/FUZZ -mc 200,301 -t 40', flags: ['-w (wordlist)', '-u (URL with FUZZ)', '-mc (match codes)', '-fc (filter codes)', '-t (threads)', '-o (output)'], output: 'HTTP responses with discovered paths', when_not: 'Aggressive fuzzing without scope authorization', import_note: 'Import discovered paths as URL list to Endpoint Map' },
  ],
  'Web Analysis': [
    { category: 'Vulnerability Scanner', purpose: 'Template-based automated vulnerability detection', install: 'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest', syntax: 'nuclei -u TARGET -t TEMPLATES/', example: 'nuclei -u https://example.com -t exposures/ -severity medium,high,critical', flags: ['-u', '-l (list)', '-t (templates)', '-severity', '-o', '-silent'], output: 'Matched vulnerabilities with evidence', when_not: 'Never run intrusive templates without explicit authorization', import_note: 'Review findings, create BountyScope findings for confirmed issues' },
  ],
  'Utilities': [
    { category: 'Utility', purpose: 'Browser-based tool for encoding, decoding, and data analysis', install: 'https://gchq.github.io/CyberChef/ (browser, no install)', syntax: 'Drag operations into recipe chain', example: 'URL Decode → From Base64 → JSON Beautify', flags: ['From Base64', 'URL Decode', 'AES Decrypt', 'Parse JSON', 'Gunzip'], output: 'Transformed data', when_not: 'Do not paste sensitive production secrets', import_note: 'Use BountyScope Decoder for quick operations, CyberChef for complex chains' },
  ],
};

export default function ToolGuide() {
  const [selectedCat, setSelectedCat] = useState('DNS / Subdomains');
  const [selectedTool, setSelectedTool] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const cats = Object.keys(TOOLS);
  const toolList = TOOLS[selectedCat] || [];
  const tool = toolList[selectedTool];

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Tool Guide</div><div className="page-subtitle">Security tool documentation and command reference</div></div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Category */}
        <div style={{ width: 180, borderRight: '1px solid var(--border)', padding: '8px 8px', overflow: 'auto' }}>
          {cats.map(c => (
            <div key={c} onClick={() => { setSelectedCat(c); setSelectedTool(0); }} className={`nav-item ${selectedCat === c ? 'active' : ''}`}>{c}</div>
          ))}
        </div>

        {/* Tool list */}
        <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: '8px 8px', overflow: 'auto' }}>
          {toolList.map((t, i) => (
            <div key={i} onClick={() => setSelectedTool(i)} className={`nav-item ${selectedTool === i ? 'active' : ''}`}>
              <Wrench size={13} /> {t.install.split(' ').pop()?.replace('@latest','') || t.category}
            </div>
          ))}
        </div>

        {/* Detail */}
        {tool && (
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            <div style={{ maxWidth: 680 }}>
              <div style={{ marginBottom: 20 }}>
                <span className="badge badge-muted" style={{ marginBottom: 8, display: 'inline-block' }}>{tool.category}</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>{tool.install.split(' ').pop()?.replace('@latest','') || 'Tool'}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{tool.purpose}</div>
              </div>

              {[
                { label: '📦 Install', content: tool.install },
                { label: '⌨ Syntax', content: tool.syntax },
                { label: '💡 Example (authorized target only)', content: tool.example },
                { label: '📤 Expected Output', content: tool.output },
                { label: '🔗 Import to BountyScope', content: tool.import_note },
                { label: '🚫 When NOT to Use', content: tool.when_not },
              ].map(({ label, content }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--cyan)', marginBottom: 6 }}>{label}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div className="code-block" style={{ flex: 1, fontSize: '0.82rem', whiteSpace: 'pre-wrap', fontFamily: label.includes('Import') || label.includes('When') ? 'var(--font-ui)' : 'var(--font-mono)' }}>{content}</div>
                    {!label.includes('When') && !label.includes('Import') && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => copy(content, label)}><Copy size={12} color={copied === label ? 'var(--green)' : undefined} /></button>}
                  </div>
                </div>
              ))}

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--cyan)', marginBottom: 6 }}>🏴 Common Flags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tool.flags.map(f => <span key={f} className="badge badge-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{f}</span>)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
