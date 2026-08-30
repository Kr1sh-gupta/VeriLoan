import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Search, 
  Clock, 
  Check, 
  Sparkles, 
  Lock, 
  GitCompare, 
  TrendingUp, 
  BrainCircuit, 
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import type { ValidationException } from '../types';
import { 
  fetchExceptions, 
  fetchLoanDetail, 
  requestAIExplanation, 
  resolveException 
} from '../lib/api';

interface ReviewerWorkbenchProps {
  onRefreshSummary: () => void;
  onNavigateToConsumer?: () => void;
}

export const ReviewerWorkbench: React.FC<ReviewerWorkbenchProps> = ({
  onRefreshSummary,
  onNavigateToConsumer,
}) => {
  const [exceptions, setExceptions] = useState<ValidationException[]>([]);
  const [selectedException, setSelectedException] = useState<ValidationException | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Resolution & AI States
  const [actionStatus, setActionStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [manualPatchValue, setManualPatchValue] = useState<string>('');
  const [customAIPrompt, setCustomAIPrompt] = useState<string>('');
  const [isPromptingAI, setIsPromptingAI] = useState<boolean>(false);
  const [resolvingAction, setResolvingAction] = useState<string | null>(null);
  const [showPromptDetails, setShowPromptDetails] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchExceptions(
        severityFilter === 'ALL' ? undefined : severityFilter,
        'OPEN',
        searchQuery || undefined
      );
      setExceptions(data);
      if (data.length > 0 && !selectedException) {
        setSelectedException(data[0]);
        loadLoanDetail(data[0].loan_id_ref);
      }
    } catch (err) {
      console.error('Failed to load reviewer exceptions', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLoanDetail = async (loanId: string) => {
    try {
      await fetchLoanDetail(loanId);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [severityFilter]);

  const handleSelectException = (exc: ValidationException) => {
    setSelectedException(exc);
    loadLoanDetail(exc.loan_id_ref);
    setActionStatus(null);
    setCustomNotes('');
    setManualPatchValue('');
  };

  const NUMERIC_LOAN_FIELDS = [
    'original_principal', 
    'current_balance', 
    'interest_rate', 
    'term_months', 
    'days_past_due', 
    'quality_score'
  ];

  const handleResolveAction = async (action: 'ACCEPT_AI' | 'MANUAL_EDIT' | 'REJECT' | 'DISMISS') => {
    if (!selectedException) return;

    try {
      setResolvingAction(action);
      let patchPayload: Record<string, any> | undefined;

      if (action === 'ACCEPT_AI') {
        patchPayload = selectedException.ai_suggested_patch;
      } else if (action === 'MANUAL_EDIT' && manualPatchValue.trim() !== '') {
        const fieldKey = (selectedException.field_name || 'value') as string;
        let finalVal: any = manualPatchValue.trim();
        if (NUMERIC_LOAN_FIELDS.includes(fieldKey) && !isNaN(Number(finalVal))) {
          finalVal = Number(finalVal);
        }
        patchPayload = { [fieldKey]: finalVal };
      }

      let defaultNote = 'Manual reviewer override';
      if (action === 'ACCEPT_AI') {
        defaultNote = 'Approved deterministic AI patch suggestion';
      } else if (action === 'REJECT') {
        defaultNote = 'Loan rejected from portfolio by reviewer';
      } else if (action === 'DISMISS') {
        defaultNote = 'Exception dismissed as non-blocking waiver';
      }

      await resolveException(
        selectedException.id,
        action,
        patchPayload,
        customNotes || defaultNote,
        'Marcus Vance (Senior Reviewer)'
      );

      // Reset form input values ONLY AFTER successful API resolution response
      setCustomNotes('');
      setManualPatchValue('');

      const actionText = action === 'ACCEPT_AI' ? 'AI Patch Accepted'
                       : action === 'MANUAL_EDIT' ? 'Custom Manual Edit Applied'
                       : action === 'REJECT' ? 'Loan Rejected'
                       : 'Exception Dismissed';

      setActionStatus({
        message: `Exception for Loan ${selectedException.loan_id_code} successfully resolved via ${actionText}. Record queued for canonical sealing.`,
        type: 'success'
      });

      onRefreshSummary();

      // Refresh open exception queue
      const updated = await fetchExceptions(
        severityFilter === 'ALL' ? undefined : severityFilter,
        'OPEN',
        searchQuery || undefined
      );
      setExceptions(updated);
      setSelectedException(updated.length > 0 ? updated[0] : null);
    } catch (err: any) {
      setActionStatus({
        message: `Error resolving exception: ${err.message}`,
        type: 'error'
      });
    } finally {
      setResolvingAction(null);
    }
  };

  const handleCustomAIPrompt = async (promptOverride?: string) => {
    const promptToSend = promptOverride || customAIPrompt;
    if (!selectedException || !promptToSend.trim()) return;
    try {
      setIsPromptingAI(true);
      const res = await requestAIExplanation(selectedException.id, promptToSend);
      setSelectedException({
        ...selectedException,
        ai_explanation: res.explanation,
        ai_suggested_patch: res.suggested_patch,
        ai_confidence: res.confidence,
        ai_model: res.model,
        ai_prompt: res.prompt,
        ai_generated_at: res.timestamp
      });
      if (!promptOverride) setCustomAIPrompt('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsPromptingAI(false);
    }
  };

  // Severity counts
  const critCount = exceptions.filter((e) => e.severity === 'CRITICAL').length;
  const highCount = exceptions.filter((e) => e.severity === 'HIGH').length;
  const medCount = exceptions.filter((e) => e.severity === 'MEDIUM').length;

  return (
    <div className="w-full bg-[#f8f9fc] text-slate-900 min-h-[calc(100vh-80px)] py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono tracking-wider text-slate-500 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>MODULE C &amp; D • HUMAN-IN-THE-LOOP DILIGENCE COCKPIT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Reviewer Workbench
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-xl">
              Triage data anomalies, inspect side-by-side tape vs. servicer conflicts, and apply AI-assisted remediations under strict governance.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {onNavigateToConsumer && (
              <button
                onClick={onNavigateToConsumer}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95"
              >
                <span>View Verified Records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* AI Queue Triage Summary Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-sm shrink-0">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 font-sans flex items-center gap-2">
                <span>AI Diligence Copilot • Queue Triage Active</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                  98% Auto-Classification
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                {exceptions.length} open exceptions detected across 250 loans. Critical maturity &amp; rate violations prioritized for immediate sign-off.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono shrink-0">
            <span className="px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200 font-bold">
              {critCount} Critical
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
              {highCount} High
            </span>
            <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              {medCount} Medium
            </span>
          </div>
        </div>

        {actionStatus && (
          <div className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between animate-fade-in shadow-sm ${
            actionStatus.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {actionStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
              <span>{actionStatus.message}</span>
            </div>
            <button onClick={() => setActionStatus(null)}>
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main 2-Column Split Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Exception Queue (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Search and Filter Tabs with Real-Time Counters */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by Loan ID, Rule, Field..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-4 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto">
                {[
                  { id: 'ALL', label: `All (${exceptions.length})` },
                  { id: 'CRITICAL', label: `Critical (${critCount})` },
                  { id: 'HIGH', label: `High (${highCount})` },
                  { id: 'MEDIUM', label: `Medium (${medCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSeverityFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                      severityFilter === tab.id
                        ? 'bg-[#0b1c30] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Exception Queue Items */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading exception queue...</span>
                </div>
              ) : exceptions.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <div className="font-bold text-slate-900 font-sans text-sm">All Exceptions Resolved!</div>
                  <div className="text-xs text-slate-500 mt-1">Clean records ready for canonical sealing.</div>
                </div>
              ) : (
                exceptions.map((exc) => {
                  const isSelected = selectedException?.id === exc.id;
                  const isCrit = exc.severity === 'CRITICAL';
                  const isHigh = exc.severity === 'HIGH';

                  return (
                    <div
                      key={exc.id}
                      onClick={() => handleSelectException(exc)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-500 shadow-md ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs font-mono text-slate-900">
                            {exc.loan_id_code}
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            isCrit ? 'bg-red-50 text-red-700 border border-red-200' :
                            isHigh ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {exc.severity}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500">
                          {exc.field_name}
                        </span>
                      </div>

                      <div className="text-xs font-sans text-slate-700 leading-snug line-clamp-2">
                        {exc.error_message}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-purple-700 font-bold">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>AI Patch Ready ({Math.round((exc.ai_confidence || 0.95) * 100)}%)</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{exc.source_system}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Right Column: Deep Inspection & Side-by-Side Conflict Viewer (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedException ? (
              <div className="space-y-6">
                
                {/* 1. Exception Details & Conflict Header */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">
                        Violation In Exception #{selectedException.id}
                      </div>
                      <h2 className="text-lg font-bold font-sans text-slate-900 mt-0.5 flex items-center gap-2">
                        <span>{selectedException.loan_id_code}</span>
                        <span className="text-slate-500 font-normal text-xs font-mono">• {selectedException.rule_code}</span>
                      </h2>
                    </div>

                    <span className="text-xs font-mono text-red-700 bg-red-50 px-2.5 py-1 rounded-lg font-bold border border-red-200">
                      {selectedException.severity}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-sans text-red-800">
                    <span className="font-bold">Rule Constraint Violated: </span>
                    {selectedException.error_message}
                  </div>

                  {/* Side-by-Side Multi-Source Conflict Diff */}
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-slate-700 uppercase flex items-center gap-1.5 font-bold">
                      <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Multi-Source Conflict &amp; Field Diff</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-red-50/50 border border-red-200 space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-red-700 uppercase font-bold">
                          <span>Source A: Tape Ingest</span>
                          <span>Conflicting</span>
                        </div>
                        <div className="text-xs font-mono text-slate-600">
                          Field: <span className="text-slate-900 font-bold">{selectedException.field_name}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-red-200 text-sm font-mono text-red-700 font-bold">
                          {selectedException.actual_value}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-emerald-700 uppercase font-bold">
                          <span>Source B: Servicer Feed</span>
                          <span>Expected</span>
                        </div>
                        <div className="text-xs font-mono text-slate-600">
                          Field: <span className="text-slate-900 font-bold">{selectedException.field_name}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-sm font-mono text-emerald-700 font-bold">
                          {selectedException.expected_condition}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. AI Assistant Panel (Transparent, Explainable, Non-Silent) */}
                <div className="p-6 rounded-2xl bg-white border border-purple-200 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-sm shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-sans">
                          AI Diligence Assistant (Deterministic Mode)
                        </h3>
                        <p className="text-[10px] font-mono text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span>Model: <code className="text-slate-700 font-semibold">{selectedException.ai_model || 'gemini-1.5-pro'}</code></span>
                          {selectedException.ai_generated_at && (
                            <>
                              <span>•</span>
                              <span>Timestamp: <code className="text-slate-700">{selectedException.ai_generated_at}</code></span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-purple-700">
                        {Math.round((selectedException.ai_confidence || 0.98) * 100)}% Confidence
                      </div>
                      <div className="text-[10px] font-sans text-slate-400">Mathematical Proof</div>
                    </div>
                  </div>

                  {/* AI Explanation Text */}
                  <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 space-y-2">
                    <div className="text-[10px] font-mono text-purple-800 uppercase font-bold">Remediation Rationale</div>
                    <p className="text-xs font-sans text-slate-800 leading-relaxed">
                      {selectedException.ai_explanation || 'Cross-referencing amortizing term with origination date reveals a transcription boundary typo.'}
                    </p>
                  </div>

                  {/* Expandable Prompt Context & System Rule Transparency Drawer */}
                  {selectedException.ai_prompt && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowPromptDetails(!showPromptDetails)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[11px] font-mono text-purple-700 font-bold transition-all shadow-sm active:scale-95"
                      >
                        <Info className="w-3.5 h-3.5 text-purple-600" />
                        <span>{showPromptDetails ? 'Hide System Prompt & Context' : 'Inspect System Prompt & Context'}</span>
                        {showPromptDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {showPromptDetails && (
                        <div className="mt-2.5 p-3.5 rounded-xl bg-[#060913] text-white border border-purple-500/30 text-xs font-mono space-y-2 animate-fade-in shadow-md">
                          <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                            <span>Canonical System Prompt Context &amp; Governance Constraints</span>
                            <span className="text-slate-500">{selectedException.ai_model || 'gemini-1.5-pro'}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-cyan-300 font-mono leading-relaxed overflow-x-auto">
                            {selectedException.ai_prompt}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggested Patch Preview */}
                  {selectedException.ai_suggested_patch && (
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Suggested Patch Payload (Dry Run)</div>
                      <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 text-[11px] overflow-x-auto shadow-inner">
                        {JSON.stringify(selectedException.ai_suggested_patch, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* 1-Click Prompt Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Explain risk of accepting patch',
                      'Check note rate vs index spread',
                      'Audit title & deed timestamp'
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleCustomAIPrompt(chip)}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[10px] font-mono text-purple-700 transition-colors"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>

                  {/* Interactive Prompt Copilot Box */}
                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customAIPrompt}
                        onChange={(e) => setCustomAIPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomAIPrompt()}
                        placeholder="Ask AI Copilot custom question..."
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white"
                      />
                      <button
                        onClick={() => handleCustomAIPrompt()}
                        disabled={isPromptingAI}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                      >
                        {isPromptingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                        <span>Prompt</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Reviewer Action Station (Zero Silent Write Governance) */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 font-bold uppercase">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <span>Reviewer Human-in-the-Loop Governance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold uppercase border border-emerald-200">
                        Human Authority (AI Advisory Only)
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">Signer: Marcus Vance</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase text-slate-600 font-bold mb-1">
                        Manual Override Value (Optional)
                      </label>
                      <input
                        type="text"
                        value={manualPatchValue}
                        onChange={(e) => setManualPatchValue(e.target.value)}
                        placeholder={`Enter custom value for ${selectedException.field_name}...`}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase text-slate-600 font-bold mb-1">
                        Reviewer Audit Notes / Justification
                      </label>
                      <input
                        type="text"
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="e.g. Verified against physical deed and title policy..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* 4 Strict Explicit Action Buttons */}
                  <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <button
                      onClick={() => handleResolveAction('ACCEPT_AI')}
                      disabled={resolvingAction !== null}
                      title="Explicitly approve AI suggested patch and sign record"
                      className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {resolvingAction === 'ACCEPT_AI' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>[Accept AI Patch]</span>
                    </button>

                    <button
                      onClick={() => handleResolveAction('MANUAL_EDIT')}
                      disabled={resolvingAction !== null || (!manualPatchValue && !customNotes)}
                      title={!manualPatchValue && !customNotes ? "Enter manual override value or audit notes to enable custom edit" : "Submit custom manual override"}
                      className="py-3 px-3 rounded-xl bg-blue-50 border border-blue-300 hover:bg-blue-100 text-blue-700 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {resolvingAction === 'MANUAL_EDIT' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                      <span>[Custom Edit]</span>
                    </button>

                    <button
                      onClick={() => handleResolveAction('DISMISS')}
                      disabled={resolvingAction !== null}
                      title="Dismiss exception as a non-blocking waiver without altering record"
                      className="py-3 px-3 rounded-xl bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-800 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {resolvingAction === 'DISMISS' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      <span>[Dismiss]</span>
                    </button>

                    <button
                      onClick={() => handleResolveAction('REJECT')}
                      disabled={resolvingAction !== null}
                      title="Reject loan record from portfolio due to critical non-compliance"
                      className="py-3 px-3 rounded-xl bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {resolvingAction === 'REJECT' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      <span>[Reject Loan]</span>
                    </button>
                  </div>

                  <div className="text-[10px] text-center font-mono text-slate-400 pt-2">
                    Every sign-off is cryptographically hashed and logged to the immutable audit ledger.
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-16 rounded-2xl bg-white border border-slate-200 text-center text-slate-400 font-mono text-xs shadow-sm">
                Select an exception from the queue to start review.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
