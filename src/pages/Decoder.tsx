import React, { useState, useEffect } from 'react';
import { Code2, Copy, RefreshCw } from 'lucide-react';
import CryptoJS from 'crypto-js';
import { Base64 } from 'js-base64';

const TRANSFORMS = [
  'URL Encode', 'URL Decode', 'Base64 Encode', 'Base64 Decode',
  'Base64URL Encode', 'Base64URL Decode', 'HTML Entities Encode', 'HTML Entities Decode',
  'Hex Encode', 'Hex Decode', 'ASCII Codes', 'ROT13',
  'JSON Escape', 'JSON Unescape', 'Unicode Escape', 'Unicode Unescape',
  'MD5', 'SHA-1', 'SHA-256', 'SHA-512',
];

const UTILITIES = ['Random UUID', 'Unix Timestamp Now', 'Timestamp → Date', 'Byte Count', 'Line Count', 'JSON Format', 'JSON Minify'];

function transform(input: string, op: string): string {
  try {
    switch (op) {
      case 'URL Encode': return encodeURIComponent(input);
      case 'URL Decode': return decodeURIComponent(input);
      case 'Base64 Encode': return Base64.encode(input);
      case 'Base64 Decode': return Base64.decode(input);
      case 'Base64URL Encode': return Base64.encodeURI(input);
      case 'Base64URL Decode': return Base64.decodeURI(input);
      case 'HTML Entities Encode': return input.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
      case 'HTML Entities Decode': { const div = document.createElement('div'); div.innerHTML = input; return div.textContent || ''; }
      case 'Hex Encode': return Array.from(input).map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
      case 'Hex Decode': return (input.match(/.{1,2}/g)||[]).map(b => String.fromCharCode(parseInt(b,16))).join('');
      case 'ASCII Codes': return Array.from(input).map(c => c.charCodeAt(0)).join(' ');
      case 'ROT13': return input.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
      case 'JSON Escape': return JSON.stringify(input).slice(1,-1);
      case 'JSON Unescape': return JSON.parse(`"${input}"`);
      case 'Unicode Escape': return Array.from(input).map(c => c.charCodeAt(0) > 127 ? `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}` : c).join('');
      case 'Unicode Unescape': return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      case 'MD5': return CryptoJS.MD5(input).toString();
      case 'SHA-1': return CryptoJS.SHA1(input).toString();
      case 'SHA-256': return CryptoJS.SHA256(input).toString();
      case 'SHA-512': return CryptoJS.SHA512(input).toString();
      default: return input;
    }
  } catch (e: any) { return `Error: ${e.message}`; }
}

function runUtility(op: string, input: string): string {
  try {
    switch (op) {
      case 'Random UUID': return crypto.randomUUID();
      case 'Unix Timestamp Now': return Math.floor(Date.now() / 1000).toString();
      case 'Timestamp → Date': {
        const n = parseInt(input);
        return new Date(n > 1e10 ? n : n * 1000).toISOString();
      }
      case 'Byte Count': return `${new TextEncoder().encode(input).byteLength} bytes`;
      case 'Line Count': return `${input.split('\n').length} lines`;
      case 'JSON Format': return JSON.stringify(JSON.parse(input), null, 2);
      case 'JSON Minify': return JSON.stringify(JSON.parse(input));
      default: return '';
    }
  } catch (e: any) { return `Error: ${e.message}`; }
}

export default function Decoder() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [selectedOp, setSelectedOp] = useState('URL Encode');

  useEffect(() => {
    const stored = sessionStorage.getItem('decoder_input');
    if (stored) { setInput(stored); sessionStorage.removeItem('decoder_input'); }
  }, []);

  const apply = () => setOutput(transform(input, selectedOp));
  const swapIO = () => { setInput(output); setOutput(''); };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Encoder / Decoder</div><div className="page-subtitle">All encoding transforms, hashing, and utilities</div></div>
      </div>
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
          {/* Operations panel */}
          <div className="card" style={{ padding: 8 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 8px' }}>Transforms</div>
            {TRANSFORMS.map(op => (
              <div key={op} onClick={() => setSelectedOp(op)}
                style={{ padding: '7px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.82rem',
                  background: selectedOp === op ? 'var(--bg-active)' : 'transparent',
                  color: selectedOp === op ? 'var(--cyan)' : 'var(--text-secondary)',
                  fontWeight: selectedOp === op ? 600 : 400, transition: 'all var(--transition)',
                  borderTop: op === 'MD5' ? '1px solid var(--border)' : 'none', marginTop: op === 'MD5' ? 8 : 0,
                }}>
                {op === 'MD5' && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>HASHING</div>}
                {op}
              </div>
            ))}
          </div>

          {/* Main panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="label" style={{ marginBottom: 0 }}>Input</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.readText().then(t => setInput(t))}>Paste</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setInput('')}>Clear</button>
                </div>
              </div>
              <textarea className="textarea" rows={6} value={input} onChange={e => setInput(e.target.value)} placeholder="Enter text to encode/decode/hash…" />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: 'var(--cyan)', fontSize: '0.88rem' }}>{selectedOp}</div>
              <button className="btn btn-primary" onClick={apply}><Code2 size={13} /> Apply</button>
              <button className="btn btn-secondary" onClick={swapIO}><RefreshCw size={13} /> Swap I/O</button>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="label" style={{ marginBottom: 0 }}>Output</div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(output)}><Copy size={12} /> Copy</button>
              </div>
              <pre className="code-block select-text" style={{ minHeight: 120, fontSize: '0.82rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{output || <span style={{ color: 'var(--text-muted)' }}>Output will appear here…</span>}</pre>
            </div>

            {/* Utilities */}
            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Utilities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {UTILITIES.map(u => (
                  <button key={u} className="btn btn-secondary btn-sm" onClick={() => {
                    const result = runUtility(u, input);
                    setOutput(result);
                  }}>{u}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
