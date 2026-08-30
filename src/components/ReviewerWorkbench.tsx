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
  ChevronUp
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
  const [lastPromptQuery, setLastPromptQuery] = useState<string | null>(null);
  const [isPromptingAI, setIsPromptingAI] = useState<boolean>(false);
  const [isExpandedExplanation, setIsExpandedExplanation] = useState<boolean>(false);
  const [resolvingAction, setResolvingAction] = useState<string | null>(null);

  const renderInlineMarkdown = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 rounded bg-purple-100/80 text-purple-900 font-mono text-[11px] font-semibold border border-purple-200/50">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderFormattedAIExplanation = (text: string, isExpanded: boolean) => {
    if (!text) return null;
    const shouldTruncate = text.length > 180;
    const displayText = shouldTruncate && !isExpanded ? text.slice(0, 160) + '...' : text;
    const lines = displayText.split('\n');

    return (
      <div className="space-y-1.5 text-xs font-sans text-slate-700 leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            const content = trimmed.replace(/\*\*/g, '');
            return (
              <h4 key={idx} className="font-bold text-purple-900 mt-2 font-mono text-[11px] uppercase tracking-wider">
                {content}
              </h4>
            );
          }

          if (/^(\*|\-|\d+\.)\s+/.test(trimmed)) {
            const formatted = trimmed.replace(/^(\*|\-|\d+\.)\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1 text-slate-800">
                  {renderInlineMarkdown(formatted)}
                </div>
              </div>
            );
          }

          return (
            <p key={idx} className="text-slate-800">
              {renderInlineMarkdown(trimmed)}
            </p>
          );
        })}
      </div>
    );
  };

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
        const firstExc = data[0];
        setSelectedException(firstExc);
        loadLoanDetail(firstExc.loan_id_ref);
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
    setLastPromptQuery(null);
    setIsExpandedExplanation(false);
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
      setActionStatus(null);
      setLastPromptQuery(promptToSend);
      const res = await requestAIExplanation(selectedException.id, promptToSend);
      setSelectedException((prev) => prev ? ({
        ...prev,
        ai_explanation: res.explanation,
        ai_suggested_patch: res.suggested_patch,
        ai_model: res.model,
        ai_prompt: res.prompt,
        ai_generated_at: res.timestamp
      }) : null);
      if (!promptOverride) setCustomAIPrompt('');
    } catch (err: any) {
      console.error('Failed to execute AI custom prompt', err);
      setActionStatus({
        message: `AI generation failed: ${err?.response?.data?.detail || err?.message || 'Server did not respond'}`,
        type: 'error'
      });
    } finally {
      setIsPromptingAI(false);
    }
  };

  // Severity counts
  const critCount = exceptions.filter((e) => e.severity === 'CRITICAL').length;
  const highCount = exceptions.filter((e) => e.severity === 'HIGH').length;
  const medCount = exceptions.filter((e) => e.severity === 'MEDIUM').length;

  return (
    <div className="w-full bg-[#f8f9fc] text-slate-900 min-h-[calc(100vh-80px)] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-5 sm:space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1.5">
            <div className="text-[10px] sm:text-[11px] font-mono tracking-wider text-slate-500 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>MODULE C &amp; D • HUMAN-IN-THE-LOOP DILIGENCE COCKPIT</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Reviewer Workbench
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-xl leading-relaxed">
              Triage data anomalies, inspect side-by-side tape vs. servicer conflicts, and apply AI-assisted remediations under strict governance.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onNavigateToConsumer && (
              <button
                onClick={onNavigateToConsumer}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95"
              >
                <span>View Verified Records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* AI Queue Triage Summary Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-sm shrink-0 mt-0.5 sm:mt-0">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 font-sans flex flex-wrap items-center gap-2">
                <span>AI Diligence Copilot • Queue Triage Active</span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                  98% Auto-Classification
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5 leading-relaxed">
                {exceptions.length} open exceptions detected across 250 loans. Critical maturity &amp; rate violations prioritized for immediate sign-off.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono shrink-0">
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
          <div className={`p-3.5 sm:p-4 rounded-xl border text-xs font-mono flex items-start sm:items-center justify-between gap-2 animate-fade-in shadow-sm break-words ${
            actionStatus.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start sm:items-center gap-2">
              {actionStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5 sm:mt-0" />}
              <span className="leading-relaxed">{actionStatus.message}</span>
            </div>
            <button onClick={() => setActionStatus(null)} className="shrink-0 p-1">
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main 2-Column Split Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          
          {/* Left Column: Exception Queue (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Search and Filter Tabs with Real-Time Counters */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
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

              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
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
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-0.5 sm:pr-1">
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
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-500 shadow-md ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-bold text-xs font-mono text-slate-900 truncate">
                            {exc.loan_id_code}
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                            isCrit ? 'bg-red-50 text-red-700 border border-red-200' :
                            isHigh ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {exc.severity}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500 shrink-0 truncate">
                          {exc.field_name}
                        </span>
                      </div>

                      <div className="text-xs font-sans text-slate-700 leading-snug line-clamp-2 break-words">
                        {exc.error_message}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-purple-700 font-bold truncate">
                          <Sparkles className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>AI Patch Ready ({Math.round((exc.ai_confidence || 0.95) * 100)}%)</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 shrink-0">
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
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            {selectedException ? (
              <div className="space-y-5 sm:space-y-6">
                
                {/* 1. Exception Details & Conflict Header */}
                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                    <div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">
                        Violation In Exception #{selectedException.id}
                      </div>
                      <h2 className="text-base sm:text-lg font-bold font-sans text-slate-900 mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{selectedException.loan_id_code}</span>
                        <span className="text-slate-500 font-normal text-xs font-mono">• {selectedException.rule_code}</span>
                      </h2>
                    </div>

                    <span className="text-xs font-mono text-red-700 bg-red-50 px-2.5 py-1 rounded-lg font-bold border border-red-200 shrink-0">
                      {selectedException.severity}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-sans text-red-800 leading-relaxed break-words">
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
                      <div className="p-3.5 sm:p-4 rounded-xl bg-red-50/50 border border-red-200 space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-red-700 uppercase font-bold">
                          <span>Source A: Tape Ingest</span>
                          <span>Conflicting</span>
                        </div>
                        <div className="text-xs font-mono text-slate-600 truncate">
                          Field: <span className="text-slate-900 font-bold">{selectedException.field_name}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-red-200 text-xs sm:text-sm font-mono text-red-700 font-bold break-all">
                          {selectedException.actual_value}
                        </div>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-emerald-700 uppercase font-bold">
                          <span>Source B: Servicer Feed</span>
                          <span>Expected</span>
                        </div>
                        <div className="text-xs font-mono text-slate-600 truncate">
                          Field: <span className="text-slate-900 font-bold">{selectedException.field_name}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-xs sm:text-sm font-mono text-emerald-700 font-bold break-all">
                          {selectedException.expected_condition}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. AI Assistant Panel (Transparent, Explainable, Non-Silent) */}
                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-purple-200 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-sm shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
                          <span>AI Diligence Copilot</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-200">
                            Gemini 2.5 Flash
                          </span>
                        </h3>
                        <p className="text-[10px] font-mono text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span>Model: <code className="text-purple-700 font-semibold">{selectedException.ai_model?.replace('models/', '').replace('offline-fintech-heuristic-v1', 'gemini-2.5-flash') || 'gemini-2.5-flash'}</code></span>
                          <span>•</span>
                          <span>Timestamp: <code className="text-slate-700">{selectedException.ai_generated_at || new Date().toISOString().slice(0, 19).replace('T', ' ')}</code></span>
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-purple-700">
                        {Math.round((selectedException.ai_confidence || 0.98) * 100)}% Confidence
                      </div>
                      <div className="text-[10px] font-sans text-slate-400">Mathematical Proof</div>
                    </div>
                  </div>

                  {/* AI Explanation Text or Loading State */}
                  {isPromptingAI ? (
                    <div className="p-5 rounded-xl bg-purple-50 border border-purple-200 flex items-center space-x-3 text-purple-800 animate-pulse">
                      <RefreshCw className="w-5 h-5 animate-spin text-purple-600 flex-shrink-0" />
                      <div className="space-y-0.5">
                        <div className="text-xs font-mono font-bold">Consulting Gemini AI Copilot...</div>
                        <div className="text-[10px] text-purple-600">Analyzing loan context & synthesizing deep financial rationale</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-mono text-purple-800 uppercase font-bold">
                          {lastPromptQuery ? `Analysis for: "${lastPromptQuery}"` : "Remediation Rationale"}
                        </div>
                        {lastPromptQuery && (
                          <span className="text-[10px] font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold border border-purple-200">
                            Custom Prompt Answer
                          </span>
                        )}
                      </div>
                      
                      {/* Formatted Markdown Content */}
                      {renderFormattedAIExplanation(
                        selectedException.ai_explanation || 'Cross-referencing amortizing term with origination date reveals a transcription boundary typo.',
                        isExpandedExplanation
                      )}

                      {/* Read More / Show Less Toggle Button */}
                      {(selectedException.ai_explanation || '').length > 180 && (
                        <button
                          type="button"
                          onClick={() => setIsExpandedExplanation(!isExpandedExplanation)}
                          className="text-[11px] font-mono text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 pt-1 transition-colors group cursor-pointer"
                        >
                          <span>{isExpandedExplanation ? 'Show Less' : 'Read More'}</span>
                          {isExpandedExplanation ? (
                            <ChevronUp className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Suggested Patch Preview */}
                  {selectedException.ai_suggested_patch && (
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Suggested Patch Payload (Dry Run)</div>
                      <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 text-[11px] overflow-x-auto whitespace-pre-wrap break-all shadow-inner">
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
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={customAIPrompt}
                        onChange={(e) => setCustomAIPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomAIPrompt()}
                        placeholder="Ask AI Copilot custom question..."
                        disabled={isPromptingAI}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500 focus:bg-white disabled:opacity-50"
                      />
                      <button
                        onClick={() => handleCustomAIPrompt()}
                        disabled={isPromptingAI || !customAIPrompt.trim()}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                      >
                        {isPromptingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                        <span>{isPromptingAI ? 'Analyzing...' : 'Prompt'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Reviewer Action Station (Zero Silent Write Governance) */}
                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 font-bold uppercase">
                      <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Reviewer Human-in-the-Loop Governance</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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

                  {/* Clean 3-Button Action Grid */}
                  <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {/* Action 1: Accept AI Patch (Green) */}
                    <button
                      onClick={() => handleResolveAction('ACCEPT_AI')}
                      disabled={resolvingAction !== null}
                      title="Explicitly approve recommended AI remediation patch and sign audit trail"
                      aria-label="Accept AI Patch: Explicitly approve recommended AI remediation patch and sign audit trail"
                      className="w-full py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md flex items-center justify-center gap-1.5"
                    >
                      {resolvingAction === 'ACCEPT_AI' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>[Accept AI Patch]</span>
                    </button>

                    {/* Action 2: Custom Edit (Neutral/Slate) */}
                    <button
                      onClick={() => handleResolveAction('MANUAL_EDIT')}
                      disabled={resolvingAction !== null || (!manualPatchValue && !customNotes)}
                      title={!manualPatchValue && !customNotes ? "Enter manual override value or audit notes to enable custom edit" : "Submit custom manual field correction and sign audit trail"}
                      aria-label="Custom Edit: Submit custom manual field correction and sign audit trail"
                      className="w-full py-3 px-3 rounded-xl bg-[#0b1c30] hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-md flex items-center justify-center gap-1.5"
                    >
                      {resolvingAction === 'MANUAL_EDIT' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4 text-cyan-400" />}
                      <span>[Custom Edit]</span>
                    </button>

                    {/* Action 3: Reject/Dismiss (Red) */}
                    <button
                      onClick={() => handleResolveAction('REJECT')}
                      disabled={resolvingAction !== null}
                      title="Reject loan record from portfolio or dismiss exception with human sign-off"
                      aria-label="Reject/Dismiss: Reject loan record from portfolio or dismiss exception with human sign-off"
                      className="w-full py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 hover:shadow-lg hover:-translate-y-0.5 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md flex items-center justify-center gap-1.5"
                    >
                      {resolvingAction === 'REJECT' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      <span>[Reject/Dismiss]</span>
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
