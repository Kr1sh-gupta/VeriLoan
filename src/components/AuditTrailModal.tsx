import React, { useEffect, useState } from 'react';
import { GitCommit, Clock, X, RefreshCw, AlertTriangle } from 'lucide-react';
import type { AuditEvent } from '../types';
import { fetchAuditTrail } from '../lib/api';

interface AuditTrailModalProps {
  loanId: string;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({
  loanId,
  onClose,
}) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchAuditTrail(loanId);
        setEvents(res);
      } catch (err) {
        console.error(err);
        setError('Could not load the audit trail. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [loanId]);

  const formatTimestamp = (ts: string | undefined | null) => {
    if (!ts) return 'Unknown time';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 'Unknown time' : d.toLocaleString();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-2xl bg-[#090e1a] p-6 sm:p-8 space-y-6 border border-slate-800 shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Immutable Audit Trail &amp; Lineage</h3>
              <p className="text-xs font-mono text-slate-400">Loan ID: {loanId}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> Loading event history...
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-400 font-mono text-xs flex flex-col items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-sans">
            No audit events found for Loan {loanId}.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800 max-h-96 overflow-y-auto pr-2">
            {events.map((ev, idx) => (
              <div key={ev.id || idx} className="relative group">
                {/* Dot */}
                <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-400 ring-4 ring-[#090e1a]" />
                
                <div className="p-4 rounded-xl bg-[#060913] border border-slate-800/80 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400">
                      {ev.event_type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTimestamp(ev.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-sans leading-relaxed">
                    {ev.summary}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/50">
                    <span>Actor: <strong className="text-slate-200">{ev.actor_id}</strong> ({ev.actor_role})</span>
                    {ev.metadata_json?.record_hash && (
                      <span className="text-emerald-400 truncate max-w-[180px]">
                        Hash: {ev.metadata_json.record_hash.substring(0, 16)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-white text-[#060913] hover:bg-slate-100 text-xs font-bold uppercase tracking-wider"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};