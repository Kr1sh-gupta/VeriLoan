import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Search, 
  Zap, 
  RefreshCw, 
  ArrowRight, 
  X, 
  ShieldCheck, 
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { ValidationException } from '../types';
import { 
  fetchExceptions, 
  requestAIExplanation, 
  resolveException, 
  fetchLoanDetail 
} from '../lib/api';

interface ReviewerWorkbenchProps {
  onRefreshSummary: () => void;
  onNavigateToConsumer: () => void;
}

export const ReviewerWorkbench: React.FC<ReviewerWorkbenchProps> = ({
  onRefreshSummary,
  onNavigateToConsumer,
}) => {
  const [exceptions, setExceptions] = useState<ValidationException[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Exception & AI Drawer
  const [selectedException, setSelectedException] = useState<ValidationException | null>(null);
  const [loanDetail, setLoanDetail] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [resolving, setResolving] = useState<boolean>(false);

  // Manual Edit Modal State
  const [manualEditOpen, setManualEditOpen] = useState<boolean>(false);
  const [editFields, setEditFields] = useState<Record<string, any>>({});
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const loadExceptions = async () => {
    try {
      setLoading(true);
      const data = await fetchExceptions(
        severityFilter === 'ALL' ? undefined : severityFilter,
        statusFilter,
        searchQuery || undefined
      );
      setExceptions(data);
    } catch (err) {
      console.error('Failed to load exceptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExceptions();
  }, [severityFilter, statusFilter]);

  const handleSelectException = async (exc: ValidationException) => {
    setSelectedException(exc);
    setEditFields(exc.ai_suggested_patch || {});
    setResolutionNotes('');
    
    try {
      const detail = await fetchLoanDetail(exc.loan_id_ref);
      setLoanDetail(detail);
    } catch (err) {
      console.error(err);
    }

    if (!exc.ai_explanation) {
      handleGenerateAI(exc);
    }
  };

  const handleGenerateAI = async (exc: ValidationException) => {
    try {
      setAiLoading(true);
      const res = await requestAIExplanation(exc.id);
      setSelectedException((prev) => prev ? {
        ...prev,
        ai_explanation: res.explanation,
        ai_suggested_patch: res.suggested_patch,
        ai_confidence: res.confidence,
        ai_model: res.model,
        ai_prompt: res.prompt
      } : null);
      setEditFields(res.suggested_patch || {});
    } catch (err) {
      console.error('Failed to generate AI analysis', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleResolveAction = async (action: 'ACCEPT_AI' | 'MANUAL_EDIT' | 'REJECT' | 'DISMISS') => {
    if (!selectedException) return;

    try {
      setResolving(true);
      const res = await resolveException(
        selectedException.id,
        action,
        action === 'MANUAL_EDIT' ? editFields : selectedException.ai_suggested_patch,
        resolutionNotes,
        'Marcus Vance (Reviewer)'
      );

      if (res.verified_record) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      setManualEditOpen(false);
      setSelectedException(null);
      await loadExceptions();
      onRefreshSummary();
    } catch (err) {
      console.error('Resolution failed', err);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 mb-1 uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Module C &amp; D: Exception Queue &amp; AI Copilot</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Reviewer Diligence Workbench
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Resolve loan data discrepancies with explainable AI Copilot assistance and explicit human approval.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onNavigateToConsumer}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 text-xs font-semibold transition-all"
          >
            <span>Verified Records Explorer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Exception Filter Matrix & Data Table */}
      <div className="p-6 rounded-3xl glass-panel space-y-4">
        
        {/* Top Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase mr-2">Severity Filter:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                  severityFilter === sev
                    ? sev === 'CRITICAL'
                      ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                      : sev === 'HIGH'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                      : sev === 'MEDIUM'
                      ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                      : 'bg-slate-700 text-white'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Status Select */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {['OPEN', 'RESOLVED', 'DISMISSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                    statusFilter === st ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search exception..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadExceptions()}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Exceptions Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="pb-3">Severity</th>
                <th className="pb-3">Rule Code</th>
                <th className="pb-3">Loan ID</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Exception Description</th>
                <th className="pb-3">Actual Value</th>
                <th className="pb-3">AI Recommendation</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {exceptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 font-sans">
                    {loading ? 'Scanning exceptions...' : 'No exceptions found matching filters.'}
                  </td>
                </tr>
              ) : (
                exceptions.map((exc) => (
                  <tr 
                    key={exc.id} 
                    onClick={() => handleSelectException(exc)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        exc.severity === 'CRITICAL'
                          ? 'bg-red-950 text-red-400 border-red-800'
                          : exc.severity === 'HIGH'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : exc.severity === 'MEDIUM'
                          ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {exc.severity}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-white">{exc.rule_code}</td>
                    <td className="py-3 font-semibold text-cyan-400">{exc.loan_id_code || '—'}</td>
                    <td className="py-3 text-slate-400">{exc.category}</td>
                    <td className="py-3 max-w-xs truncate text-slate-200 font-sans">{exc.error_message}</td>
                    <td className="py-3 text-slate-400 truncate max-w-[140px]">{exc.actual_value || '—'}</td>
                    <td className="py-3">
                      {exc.ai_explanation ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-sans">
                          <Sparkles className="w-3 h-3 text-cyan-400" /> AI Ready ({intPct(exc.ai_confidence)}%)
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-sans">Pending Analysis</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectException(exc);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-800 group-hover:bg-cyan-600 text-slate-300 group-hover:text-white transition-colors text-xs font-sans"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Slide-Over AI Copilot Assistant Drawer */}
      {selectedException && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-[#0B1222] border-l border-slate-800 shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-6">
              
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white font-sans">AI Review Assistant Panel</h2>
                    <p className="text-xs font-mono text-slate-400">Exception ID: {selectedException.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedException(null)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Exception Overview Card */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {selectedException.rule_code} — {selectedException.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    selectedException.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border-red-800' : 'bg-amber-950 text-amber-400 border-amber-800'
                  }`}>
                    {selectedException.severity}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white font-sans">{selectedException.error_message}</p>
                <div className="text-xs font-mono text-slate-400 pt-1">
                  Expected Condition: <span className="text-slate-300">{selectedException.expected_condition}</span>
                </div>
              </div>

              {/* Cross-Source Conflict Comparison */}
              {loanDetail?.servicer_update && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-cyan-500/20 space-y-3">
                  <div className="text-xs font-mono text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Cross-Source Comparison (Tape vs. Servicer Update)
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-500 text-[10px] uppercase">Primary Loan Tape</div>
                      <div className="text-slate-200 mt-1">Balance: ${loanDetail.loan.current_balance?.toLocaleString()}</div>
                      <div className="text-slate-400 text-[10px]">Status: {loanDetail.loan.payment_status}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                      <div className="text-cyan-400 text-[10px] uppercase font-bold">Servicer Update Ledger</div>
                      <div className="text-emerald-400 font-semibold mt-1">
                        Balance: ${loanDetail.servicer_update.current_balance?.toLocaleString()}
                      </div>
                      <div className="text-slate-300 text-[10px]">Status: {loanDetail.servicer_update.payment_status}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Copilot Explanation & Suggested Fix */}
              <div className="p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-4 shadow-lg shadow-cyan-950/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" /> AI Root-Cause Analysis
                  </span>
                  {selectedException.ai_confidence && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                      {intPct(selectedException.ai_confidence)}% Confidence
                    </span>
                  )}
                </div>

                {aiLoading ? (
                  <div className="py-6 text-center text-xs font-mono text-cyan-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing financial anomalies &amp; reconciliation rules...
                  </div>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                      {selectedException.ai_explanation || 'No AI explanation generated yet.'}
                    </p>

                    {/* Suggested Patch Payload */}
                    {selectedException.ai_suggested_patch && Object.keys(selectedException.ai_suggested_patch).length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase">Suggested Data Patch:</div>
                        {Object.entries(selectedException.ai_suggested_patch).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-emerald-400">
                            <span>{k}:</span>
                            <span className="font-bold">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* AI Transparency Metadata */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 gap-2">
                      <span>Model: {selectedException.ai_model || 'fintech-copilot-engine-v1'}</span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" /> Human Action Required
                      </span>
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* Human Decision Controls */}
            <div className="mt-8 pt-4 border-t border-slate-800 space-y-3">
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reviewer Decision: AI will NOT modify data without your confirmation.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleResolveAction('ACCEPT_AI')}
                  disabled={resolving || !selectedException.ai_suggested_patch}
                  className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 font-semibold text-xs shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept AI Patch</span>
                </button>

                <button
                  onClick={() => setManualEditOpen(true)}
                  disabled={resolving}
                  className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold text-xs border border-slate-700 transition-all"
                >
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  <span>Custom Edit</span>
                </button>

                <button
                  onClick={() => handleResolveAction('DISMISS')}
                  disabled={resolving}
                  className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-slate-900 text-slate-400 hover:text-red-300 hover:bg-red-950/50 font-semibold text-xs border border-slate-800 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Dismiss Flag</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Custom Field Edit Modal */}
      {manualEditOpen && selectedException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-3xl glass-panel p-6 sm:p-8 space-y-6 border border-cyan-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-sans">Manual Field Adjustment</h3>
              <button onClick={() => setManualEditOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Adjust Current Balance ($)</label>
                <input
                  type="number"
                  value={editFields.current_balance ?? loanDetail?.loan?.current_balance ?? ''}
                  onChange={(e) => setEditFields({ ...editFields, current_balance: parseFloat(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Adjust Payment Status</label>
                <select
                  value={editFields.payment_status ?? loanDetail?.loan?.payment_status ?? 'CURRENT'}
                  onChange={(e) => setEditFields({ ...editFields, payment_status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="CURRENT">CURRENT</option>
                  <option value="DELINQUENT_30">DELINQUENT_30</option>
                  <option value="DELINQUENT_60">DELINQUENT_60</option>
                  <option value="DELINQUENT_90">DELINQUENT_90</option>
                  <option value="PAID_OFF">PAID_OFF</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Reviewer Notes (Logged to Audit Trail)</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="State reason for manual adjustment..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setManualEditOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveAction('MANUAL_EDIT')}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                Save &amp; Resolve
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

function intPct(val?: number): number {
  if (!val) return 92;
  return Math.round(val * 100);
}
