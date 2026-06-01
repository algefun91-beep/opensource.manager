import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ marginTop: 12, marginBottom: 12, maxWidth: '100%', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          borderRadius: '8px 8px 0 0',
          background: 'rgba(12,24,48,0.98)',
          border: '1px solid rgba(60,90,160,0.35)',
          borderBottom: 'none',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(100,180,255,0.9)',
            textTransform: 'lowercase',
            letterSpacing: '0.5px',
            fontFamily: 'monospace',
          }}
        >
          {language}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            padding: '5px 10px',
            borderRadius: 5,
            border: '1px solid rgba(80,120,200,0.3)',
            background: copied ? 'rgba(60,180,120,0.85)' : 'rgba(40,80,160,0.3)',
            color: copied ? '#fff' : 'rgba(140,200,255,0.9)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '14px',
          borderRadius: '0 0 8px 8px',
          background: 'rgba(6,12,28,0.95)',
          border: '1px solid rgba(60,90,160,0.35)',
          borderTop: 'none',
          color: 'rgba(180,220,255,0.95)',
          overflowX: 'auto',
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: '1.5',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        {code}
      </pre>
    </div>
  );
}
