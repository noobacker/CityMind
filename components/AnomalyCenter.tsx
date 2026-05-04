'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Anomaly {
  id: string;
  msg: string;
  timestamp?: string;
}

interface AnomalyCenterProps {
  anomalies: Anomaly[];
  onClear: () => void;
}

export function AnomalyCenter({ anomalies, onClear }: AnomalyCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasNew = anomalies.length > 0;

  return (
    <div className="anomaly-center-root" ref={containerRef}>
      <button 
        className={`anomaly-trigger ${hasNew ? 'has-alerts' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Neural Alerts"
      >
        <div className="trigger-icon">
          <span className="icon-pulse" />
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        {hasNew && <span className="alert-badge">{anomalies.length}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="anomaly-popup"
          >
            <div className="popup-header">
              <span className="header-title">NEURAL_ALERTS</span>
              <button className="clear-btn" onClick={onClear}>CLEAR_ALL</button>
            </div>
            
            <div className="popup-body">
              {anomalies.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">✓</span>
                  <span className="empty-text">System status: OPTIMAL</span>
                </div>
              ) : (
                <div className="anomaly-list">
                  {anomalies.map((a) => (
                    <div key={a.id} className="anomaly-item">
                      <div className="item-marker" />
                      <div className="item-content">
                        <div className="item-label">PRIORITY_ALERT</div>
                        <div className="item-msg">{a.msg}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .anomaly-center-root {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2000;
        }
        .anomaly-trigger {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(10, 15, 24, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .anomaly-trigger:hover {
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          color: #fff;
        }
        .anomaly-trigger.has-alerts {
          border-color: rgba(255, 0, 76, 0.4);
          color: #ff004c;
        }
        .anomaly-trigger.has-alerts .icon-pulse {
          position: absolute;
          inset: -1px;
          border-radius: 50%;
          border: 1px solid #ff004c;
          animation: badgePulse 2s infinite;
        }
        @keyframes badgePulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .alert-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ff004c;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(255, 0, 76, 0.5);
          font-family: var(--font-mono, monospace);
        }
        .anomaly-popup {
          position: absolute;
          bottom: 72px;
          right: 0;
          width: 320px;
          background: rgba(13, 17, 23, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(24px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .popup-header {
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-title {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: rgba(255, 255, 255, 0.4);
        }
        .clear-btn {
          background: transparent;
          border: none;
          color: #ff004c;
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .clear-btn:hover { opacity: 1; }
        .popup-body {
          max-height: 400px;
          overflow-y: auto;
          padding: 8px;
        }
        .empty-state {
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .empty-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(204, 255, 0, 0.1);
          color: #ccff00;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .empty-text {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .anomaly-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .anomaly-item {
          padding: 12px 14px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          display: flex;
          gap: 12px;
          transition: background 0.2s;
        }
        .anomaly-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .item-marker {
          width: 2px;
          height: 100%;
          background: #ff004c;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .item-label {
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          font-weight: 800;
          color: #ff004c;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }
        .item-msg {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
