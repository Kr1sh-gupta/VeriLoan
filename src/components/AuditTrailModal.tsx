import React, { useEffect, useState } from 'react';
import { GitCommit, Clock, X, RefreshCw } from 'lucide-react';
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

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const res = await fetchAuditTrail(loanId);
        setEvents(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [loanId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl rounded-3xl glass-panel p-6 sm:p-8 space-y-6 border border-cyan-500/30 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Immutable Audit Trail &amp; Lineage</h3>
              <p className="text-xs font-mono text-slate-400">Loan ID: {loanId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-cyan-400 font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading event history...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs font-sans">
            No audit events found for Loan {loanId}.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800 max-h-96 overflow-y-auto pr-2">
            {events.map((ev, idx) => (
              <div key={ev.id || idx} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-cyan-500 ring-4 ring-[#070B14] group-hover:scale-125 transition-transform" />
                
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {ev.event_type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(ev.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-sans leading-relaxed">
                    {ev.summary}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Actor: <strong className="text-slate-300">{ev.actor_id}</strong> ({ev.actor_role})</span>
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
            className="px-5 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
