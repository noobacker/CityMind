'use client';

import { useEffect, useState } from 'react';

interface BootSequenceProps {
  onComplete: (data: any) => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [lines, setLines] = useState<string[]>(['INITIALIZING CITYMIND KERNEL v1.0.4']);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    async function boot() {
      const addLine = (text: string) => setLines(prev => [...prev, text]);
      
      await new Promise(r => setTimeout(r, 600));
      addLine('CONNECTING TO NEURAL MESH...');
      
      try {
        const start = Date.now();
        const res = await fetch('/api/pulse');
        const data = await res.json();
        const elapsed = Date.now() - start;

        await new Promise(r => setTimeout(r, 400));
        addLine(`[OK] 311_NODE CONNECTED (${data.neighborhoods.length} NEIGHBORHOODS SYNCED)`);
        
        await new Promise(r => setTimeout(r, 300));
        addLine(`[OK] MTA_FEED ACTIVE: ${data.mta.affectedLines.length} LINE DISRUPTIONS DETECTED`);
        
        await new Promise(r => setTimeout(r, 300));
        addLine(`[OK] SENSORY GRID SYNCED IN ${elapsed}ms`);
        
        await new Promise(r => setTimeout(r, 400));
        addLine('SYNCING CITY PERSONALITY MATRIX (1624-2026)... DONE');
        
        await new Promise(r => setTimeout(r, 600));
        addLine('NEW YORK CITY IS ONLINE.');
        
        await new Promise(r => setTimeout(r, 800));
        setFinished(true);
        setTimeout(() => onComplete(data), 500);
      } catch (err) {
        addLine('[ERROR] NEURAL LINK FAILURE. FALLING BACK TO CACHED STATE.');
        await new Promise(r => setTimeout(r, 1000));
        setFinished(true);
        onComplete(null);
      }
    }

    boot();
  }, [onComplete]);

  return (
    <div className={`bootOverlay ${finished ? 'fadeOut' : ''}`} aria-hidden="true">
      <div className="bootPanel">
        <div className="bootHeader">
          <span className="bootTitle">SYSTEM_HANDSHAKE</span>
          <span className="bootVersion">BUILD_2026.04.26</span>
        </div>
        <div className="bootContent">
          {lines.map((line, i) => (
            <div key={i} className="bootLine">
              <span className="bootPrompt">{">"}</span> {line}
            </div>
          ))}
          {!finished && <span className="bootCursor">_</span>}
        </div>
      </div>

      <style jsx>{`
        .bootOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #05070a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          padding: 20px;
        }
        .fadeOut {
          opacity: 0;
          transition: opacity 0.8s ease-out;
          pointer-events: none;
        }
        .bootPanel {
          width: 100%;
          max-width: 700px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(0, 255, 157, 0.2);
          box-shadow: 0 0 40px rgba(0, 255, 157, 0.05);
          padding: 30px;
        }
        .bootHeader {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid rgba(0, 255, 157, 0.1);
          padding-bottom: 15px;
          margin-bottom: 20px;
          font-size: 0.7rem;
          color: rgba(0, 255, 157, 0.6);
          letter-spacing: 0.2em;
        }
        .bootContent {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .bootLine {
          font-size: 0.9rem;
          color: #00ff9d;
          text-shadow: 0 0 8px rgba(0, 255, 157, 0.3);
        }
        .bootPrompt {
          color: rgba(0, 255, 157, 0.4);
        }
        .bootCursor {
          display: inline-block;
          width: 8px;
          height: 15px;
          background: #00ff9d;
          animation: blink 1s infinite;
          vertical-align: middle;
          margin-left: 5px;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}