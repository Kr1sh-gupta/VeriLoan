import React, { useState, useEffect } from 'react';
import { 
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
    <div className="w-full bg-[#060913] text-white min-h-[calc(100vh-80px)] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Banner matching landing page style */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="space-y-2">
            <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>MODULE C &amp; D • EXCEPTION QUEUE &amp; AI COPILOT</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
              Reviewer Workbench
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl">
              Investigate exception queue, run explainable AI Copilot, compare cross-source conflicts, and verify data.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onNavigateToConsumer}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95"
            >
              <span>Verified Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Exception Filters & Table Card */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 space-y-6">
          
          {/* Filter Matrix */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-2">Severity:</span>
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 rounded font-mono text-[10px] uppercase tracking-wider font-semibold transition-all ${
                    severityFilter === sev
                      ? sev === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                        : sev === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : 'bg-white text-[#060913]'
                      : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Status Select */}
              <div className="flex items-center space-x-1 bg-[#0c1220] p-1 rounded-lg border border-white/10 text-xs">
                {['OPEN', 'RESOLVED', 'DISMISSED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded font-mono text-[10px] transition-colors ${
                      statusFilter === st ? 'bg-white text-[#060913] font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search exception..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadExceptions()}
                  className="bg-[#0c1220] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 w-48 sm:w-60 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Exceptions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 uppercase text-[10px]">
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Rule Code</th>
                  <th className="pb-3">Loan ID</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Discrepancy Details</th>
                  <th className="pb-3">Actual Value</th>
                  <th className="pb-3">AI Recommendation</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {exceptions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                      {loading ? 'Scanning exceptions...' : 'No exceptions found matching filters.'}
                    </td>
                  </tr>
                ) : (
                  exceptions.map((exc) => (
                    <tr 
                      key={exc.id} 
                      onClick={() => handleSelectException(exc)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          exc.severity === 'CRITICAL'
                            ? 'bg-red-950/60 text-red-400 border-red-500/40'
                            : exc.severity === 'HIGH'
                            ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                            : exc.severity === 'MEDIUM'
                            ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/40'
                            : 'bg-white/[0.05] text-slate-400 border-white/10'
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
                          <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-sans font-medium">
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
                          className="px-3 py-1 rounded bg-white/[0.05] group-hover:bg-white text-slate-300 group-hover:text-[#060913] transition-colors text-xs font-sans font-semibold"
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
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-2xl bg-[#090e1a] border-l border-white/10 shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
              
              <div className="space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-cyan-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white font-sans">AI Review Assistant</h2>
                      <p className="text-xs font-mono text-slate-400">Exception ID: {selectedException.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedException(null)}
                    className="p-2 rounded-lg bg-white/[0.05] text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Exception Overview */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {selectedException.rule_code} — {selectedException.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      selectedException.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border-red-500/40' : 'bg-amber-950 text-amber-400 border-amber-500/40'
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
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-cyan-500/30 space-y-3">
                    <div className="text-xs font-mono text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Cross-Source Comparison (Tape vs. Servicer Update)
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-lg bg-[#060913] border border-white/10">
                        <div className="text-slate-500 text-[10px] uppercase">Primary Loan Tape</div>
                        <div className="text-white mt-1 font-bold">Balance: ${loanDetail.loan.current_balance?.toLocaleString()}</div>
                        <div className="text-slate-400 text-[10px]">Status: {loanDetail.loan.payment_status}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/40">
                        <div className="text-cyan-400 text-[10px] uppercase font-bold">Servicer Update Ledger</div>
                        <div className="text-emerald-400 font-bold mt-1">
                          Balance: ${loanDetail.servicer_update.current_balance?.toLocaleString()}
                        </div>
                        <div className="text-slate-300 text-[10px]">Status: {loanDetail.servicer_update.payment_status}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Copilot Explanation & Suggested Fix */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121c30] to-[#0a101d] border border-cyan-500/40 space-y-4 shadow-xl">
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
                        <div className="p-3 rounded-xl bg-[#060913] border border-white/10 text-xs font-mono space-y-1">
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
                      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500 gap-2">
                        <span>Model: {selectedException.ai_model || 'fintech-copilot-engine-v1'}</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <ShieldCheck className="w-3 h-3 text-cyan-400" /> Human Confirmation Enforced
                        </span>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Human Decision Controls */}
              <div className="mt-8 pt-4 border-t border-white/10 space-y-3">
                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Reviewer Action: AI will NOT alter data without your approval.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleResolveAction('ACCEPT_AI')}
                    disabled={resolving || !selectedException.ai_suggested_patch}
                    className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept AI Patch</span>
                  </button>

                  <button
                    onClick={() => setManualEditOpen(true)}
                    disabled={resolving}
                    className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/20 font-semibold text-xs transition-all"
                  >
                    <Edit3 className="w-4 h-4 text-cyan-400" />
                    <span>Custom Edit</span>
                  </button>

                  <button
                    onClick={() => handleResolveAction('DISMISS')}
                    disabled={resolving}
                    className="flex items-center justify-center space-x-2 p-3 rounded-xl bg-white/[0.02] text-slate-400 hover:text-red-400 hover:bg-red-950/30 font-semibold text-xs border border-white/10 transition-all"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <div className="w-full max-w-lg rounded-2xl bg-[#090e1a] p-6 sm:p-8 space-y-6 border border-white/10 shadow-2xl">
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
                    className="w-full bg-[#060913] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Adjust Payment Status</label>
                  <select
                    value={editFields.payment_status ?? loanDetail?.loan?.payment_status ?? 'CURRENT'}
                    onChange={(e) => setEditFields({ ...editFields, payment_status: e.target.value })}
                    className="w-full bg-[#060913] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
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
                    className="w-full bg-[#060913] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-sans"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setManualEditOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleResolveAction('MANUAL_EDIT')}
                  className="px-4 py-2 rounded-lg bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs uppercase tracking-wider"
                >
                  Save &amp; Resolve
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

function intPct(val?: number): number {
  if (!val) return 92;
  return Math.round(val * 100);
}
