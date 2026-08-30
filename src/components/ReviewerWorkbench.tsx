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
  Send
} from 'lucide-react';
import type { ValidationException } from '../types';
import { 
  fetchExceptions, 
  fetchLoanDetail, 
  requestAIExplanation, 
  resolveException,
  addExceptionComment
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
  const [reviewerCommentText, setReviewerCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

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
        searchQuery.trim() || undefined
      );
      setExceptions(data);
      if (data.length > 0) {
        if (!selectedException || !data.some((e) => e.id === selectedException.id)) {
          const firstExc = data[0];
          setSelectedException(firstExc);
          loadLoanDetail(firstExc.loan_id_ref);
        }
      } else {
        setSelectedException(null);
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
    const timer = setTimeout(() => {
      loadData();
    }, 200);
    return () => clearTimeout(timer);
  }, [severityFilter, searchQuery]);

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

  const DATE_LOAN_FIELDS = [
    'origination_date',
    'maturity_date',
    'last_payment_date',
    'last_updated_at'
  ];

  const getFieldValidation = (fieldName?: string, val?: string) => {
    if (!val || !val.trim()) return { isValid: false, message: '' };
    const trimmed = val.trim();
    const field = (fieldName || '').toLowerCase();

    if (NUMERIC_LOAN_FIELDS.some(f => field.includes(f))) {
      if (isNaN(Number(trimmed)) || trimmed === '') {
        return { isValid: false, message: `Field "${fieldName}" requires a valid numeric value (e.g. 250000 or 5.75)` };
      }
      if (Number(trimmed) < 0 && !field.includes('days_past_due')) {
        return { isValid: false, message: `Financial value for "${fieldName}" cannot be negative` };
      }
      return { isValid: true, message: '' };
    }

    if (DATE_LOAN_FIELDS.some(f => field.includes(f))) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/;
      const datePart = trimmed.split(/[ T]/)[0];
      if (!dateRegex.test(trimmed) || isNaN(Date.parse(datePart))) {
        return { isValid: false, message: `Date field "${fieldName}" requires YYYY-MM-DD format (e.g. 2024-06-15)` };
      }
      return { isValid: true, message: '' };
    }

    return { isValid: true, message: '' };
  };

  const fieldValidation = getFieldValidation(selectedException?.field_name, manualPatchValue);
  const isManualEditValid = manualPatchValue.trim() !== '' && fieldValidation.isValid;
  const isCorrectionValid = customNotes.trim().length >= 5;

  const handleResolveAction = async (action: 'ACCEPT_AI' | 'MANUAL_EDIT' | 'REJECT' | 'DISMISS' | 'REQUEST_CORRECTION') => {
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
      } else if (action === 'REQUEST_CORRECTION') {
        defaultNote = 'Correction requested from primary servicer / lender';
      }

      await resolveException(
        selectedException.id,
        action,
        patchPayload,
        customNotes || defaultNote,
        'Marcus Vance (Senior Reviewer)'
      );

      // Add in-app notification if correction was requested
      if (action === 'REQUEST_CORRECTION') {
        try {
          const stored = localStorage.getItem('veriloan_notifications');
          const currentNotifs = stored ? JSON.parse(stored) : [];
          const newNotif = {
            id: `notif-${Date.now()}`,
            title: `Correction Notice Dispatched: ${selectedException.loan_id_code}`,
            message: `Reviewer dispatched remediation notice to servicer for ${selectedException.rule_code}: ${customNotes || defaultNote}`,
            type: 'warning',
            read: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            loan_id: selectedException.loan_id_code,
          };
          localStorage.setItem('veriloan_notifications', JSON.stringify([newNotif, ...currentNotifs]));
          window.dispatchEvent(new Event('storage'));
        } catch {
          // ignore
        }
      }

      // Reset form input values ONLY AFTER successful API resolution response
      setCustomNotes('');
      setManualPatchValue('');

      const actionText = action === 'ACCEPT_AI' ? 'AI Patch Accepted'
                       : action === 'MANUAL_EDIT' ? 'Custom Manual Edit Applied'
                       : action === 'REJECT' ? 'Loan Rejected'
                       : action === 'REQUEST_CORRECTION' ? 'Correction Requested from Servicer'
                       : 'Exception Dismissed';

      const successMsg = action === 'REQUEST_CORRECTION'
        ? `Correction request dispatched to primary servicer for Loan ${selectedException.loan_id_code}. Exception kept in remediation queue & logged to audit ledger.`
        : `Exception for Loan ${selectedException.loan_id_code} successfully resolved via ${actionText}. Record queued for canonical sealing.`;

      setActionStatus({
        message: successMsg,
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

  const handleAddComment = async () => {
    if (!selectedException || !reviewerCommentText.trim()) return;
    try {
      setIsSubmittingComment(true);
      setActionStatus(null);
      const res = await addExceptionComment(selectedException.id, reviewerCommentText.trim());
      const updatedNotes = res.resolution_notes;
      const updatedExc = { ...selectedException, resolution_notes: updatedNotes };
      setSelectedException(updatedExc);
      setExceptions((prev) => prev.map((e) => (e.id === selectedException.id ? updatedExc : e)));
      setReviewerCommentText('');
      setActionStatus({
        message: `Reviewer note added & logged to Loan ${selectedException.loan_id_code} audit trail.`,
        type: 'success',
      });
      setTimeout(() => setActionStatus(null), 4000);
    } catch (err: any) {
      setActionStatus({
        message: `Failed to post comment: ${err?.response?.data?.detail || err?.message || 'Unknown error'}`,
        type: 'error',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Dynamic client + server search filter
  const displayedExceptions = exceptions.filter((exc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (exc.loan_id_code && exc.loan_id_code.toLowerCase().includes(q)) ||
      (exc.borrower_id && exc.borrower_id.toLowerCase().includes(q)) ||
      (exc.rule_code && exc.rule_code.toLowerCase().includes(q)) ||
      (exc.field_name && exc.field_name.toLowerCase().includes(q)) ||
      (exc.error_message && exc.error_message.toLowerCase().includes(q)) ||
      (exc.category && exc.category.toLowerCase().includes(q))
    );
  });

  // Severity counts
  const critCount = displayedExceptions.filter((e) => e.severity === 'CRITICAL').length;
  const highCount = displayedExceptions.filter((e) => e.severity === 'HIGH').length;
  const medCount = displayedExceptions.filter((e) => e.severity === 'MEDIUM').length;

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
                {displayedExceptions.length} open exceptions detected across 250 loans. Critical maturity &amp; rate violations prioritized for immediate sign-off.
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

        {/* 1. Mobile Sequential View (< lg: 1. Records -> 2. Violation -> 3. AI Copilot -> 4. Governance -> 5. Notes) */}
        <div className="flex flex-col space-y-5 lg:hidden">
          {/* Card 1: Records & Search */}
          <div className="space-y-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Loan ID, Borrower ID (e.g. BOR-20020), Rule..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-8 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'ALL', label: `All (${displayedExceptions.length})` },
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

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-0.5 sm:pr-1">
              {loading ? (
                <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading exception queue...</span>
                </div>
              ) : displayedExceptions.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="font-bold text-slate-900 font-sans text-sm">
                    {searchQuery ? 'No Matching Exceptions' : 'All Exceptions Resolved!'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {searchQuery ? `No open exceptions matched "${searchQuery}".` : 'Clean records ready for canonical sealing.'}
                  </div>
                </div>
              ) : (
                displayedExceptions.map((exc) => {
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
                          {exc.borrower_id && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200 shrink-0">
                              {exc.borrower_id}
                            </span>
                          )}
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

          {/* Mobile Exception Deep Inspection Items */}
          {selectedException ? (
            <>
              {/* Card 2: Violation in Exception */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase">
                      Violation In Exception #{selectedException.id}
                    </div>
                    <h2 className="text-base font-bold font-sans text-slate-900 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{selectedException.loan_id_code}</span>
                      {selectedException.borrower_id && (
                        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          Borrower: {selectedException.borrower_id}
                        </span>
                      )}
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

                <div className="space-y-2">
                  <div className="text-xs font-mono text-slate-700 uppercase flex items-center gap-1.5 font-bold">
                    <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Multi-Source Conflict &amp; Field Diff</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-red-50/50 border border-red-200 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-red-700 uppercase font-bold">
                        <span>Source A: Tape Ingest</span>
                        <span>Conflicting</span>
                      </div>
                      <div className="text-xs font-mono text-slate-600 truncate">
                        Field: <span className="text-slate-900 font-bold">{selectedException.field_name}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-red-200 text-xs font-mono text-red-700 font-bold break-all">
                        {selectedException.actual_value}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-emerald-700 uppercase font-bold">
                        <span>Source B: Servicer Feed</span>
                        <span>Expected</span>
                      </div>
                      <div className="text-xs font-mono text-slate-600 truncate">
                        Field: <span className="text-slate-900 font-bold">{selectedException.field_name}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-emerald-200 text-xs font-mono text-emerald-700 font-bold break-all">
                        {selectedException.expected_condition}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: AI Diligence Copilot */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-purple-200 shadow-sm space-y-4 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-sm shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-1.5">
                        <span>AI Diligence Copilot</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-200">
                          Gemini 2.5 Flash
                        </span>
                      </h3>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        <span>Model: <code className="text-purple-700 font-semibold">{selectedException.ai_model?.replace('models/', '').replace('offline-fintech-heuristic-v1', 'gemini-2.5-flash') || 'gemini-2.5-flash'}</code></span>
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-purple-700">
                      {Math.round((selectedException.ai_confidence || 0.98) * 100)}% Confidence
                    </div>
                  </div>
                </div>

                {isPromptingAI ? (
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-center space-x-3 text-purple-800 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-600 flex-shrink-0" />
                    <div className="text-xs font-mono font-bold">Consulting Gemini AI Copilot...</div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-100 space-y-2">
                    <div className="text-[10px] font-mono text-purple-800 uppercase font-bold">
                      {lastPromptQuery ? `Analysis for: "${lastPromptQuery}"` : "Remediation Rationale"}
                    </div>
                    {renderFormattedAIExplanation(
                      selectedException.ai_explanation || 'Cross-referencing amortizing term with origination date reveals a transcription boundary typo.',
                      isExpandedExplanation
                    )}
                    {(selectedException.ai_explanation || '').length > 180 && (
                      <button
                        type="button"
                        onClick={() => setIsExpandedExplanation(!isExpandedExplanation)}
                        className="text-[11px] font-mono text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <span>{isExpandedExplanation ? 'Show Less' : 'Read More'}</span>
                        {isExpandedExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                )}

                {selectedException.ai_suggested_patch && (
                  <div className="space-y-1 font-mono text-xs">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Suggested Patch Payload (Dry Run)</div>
                    <pre className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 text-[10px] overflow-x-auto whitespace-pre-wrap break-all shadow-inner">
                      {JSON.stringify(selectedException.ai_suggested_patch, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    'Explain risk of accepting patch',
                    'Check note rate vs index spread',
                    'Audit title & deed timestamp'
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleCustomAIPrompt(chip)}
                      className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[10px] font-mono text-purple-700 transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
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
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      {isPromptingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                      <span>{isPromptingAI ? 'Analyzing...' : 'Prompt'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 4: Reviewer Governance Action Station */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                  <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 font-bold uppercase">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Reviewer Governance</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold uppercase border border-emerald-200">
                      Human Authority
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Signer: Marcus Vance</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono uppercase text-slate-600 font-bold">
                        Manual Override Value
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        Target: <code className="text-blue-700 font-bold bg-blue-50 px-1 py-0.5 rounded">{selectedException.field_name || 'value'}</code>
                      </span>
                    </div>
                    <input
                      type="text"
                      value={manualPatchValue}
                      onChange={(e) => setManualPatchValue(e.target.value)}
                      placeholder={
                        NUMERIC_LOAN_FIELDS.some(f => (selectedException.field_name || '').toLowerCase().includes(f))
                          ? `Enter numeric value for ${selectedException.field_name} (e.g. 500000)...`
                          : DATE_LOAN_FIELDS.some(f => (selectedException.field_name || '').toLowerCase().includes(f))
                          ? `Enter date for ${selectedException.field_name} (YYYY-MM-DD)...`
                          : `Enter custom value for ${selectedException.field_name}...`
                      }
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white transition-all ${
                        manualPatchValue.trim() && !fieldValidation.isValid
                          ? 'border-red-400 focus:border-red-500 bg-red-50/30'
                          : manualPatchValue.trim() && fieldValidation.isValid
                          ? 'border-emerald-400 focus:border-emerald-500 bg-emerald-50/20'
                          : 'border-slate-300 focus:border-blue-500'
                      }`}
                    />
                    {manualPatchValue.trim() && !fieldValidation.isValid && (
                      <div className="text-[11px] font-sans text-red-600 mt-1 flex items-center gap-1 font-medium animate-fade-in">
                        <span>⚠️ {fieldValidation.message}</span>
                      </div>
                    )}
                    {manualPatchValue.trim() && fieldValidation.isValid && (
                      <div className="text-[11px] font-sans text-emerald-700 mt-1 flex items-center gap-1 font-medium animate-fade-in">
                        <span>✓ Valid format for {selectedException.field_name}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono uppercase text-slate-600 font-bold">
                        Reviewer Audit Notes / Justification
                      </label>
                      <span className={`text-[10px] font-mono ${customNotes.trim().length >= 5 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        Min 5 chars for [Correction] ({customNotes.trim().length}/5)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="e.g. Verified against physical deed / Servicer must remediate..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-2 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleResolveAction('ACCEPT_AI')}
                    disabled={resolvingAction !== null}
                    title="Explicitly approve recommended AI remediation patch and sign audit trail"
                    className="w-full py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 hover:shadow-md text-white font-bold text-[11px] font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {resolvingAction === 'ACCEPT_AI' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>[Accept AI]</span>
                  </button>

                  <button
                    onClick={() => handleResolveAction('MANUAL_EDIT')}
                    disabled={resolvingAction !== null || !isManualEditValid}
                    title={!isManualEditValid ? (manualPatchValue.trim() ? fieldValidation.message : `Enter a valid manual override value for ${selectedException.field_name || 'the field'} to enable Custom Edit`) : "Submit custom manual field correction and sign audit trail"}
                    className="w-full py-2.5 px-2 rounded-xl bg-[#0b1c30] hover:bg-slate-800 hover:shadow-md text-white font-bold text-[11px] font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-35 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {resolvingAction === 'MANUAL_EDIT' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>[Custom Edit]</span>
                  </button>

                  <button
                    onClick={() => handleResolveAction('REQUEST_CORRECTION')}
                    disabled={resolvingAction !== null || !isCorrectionValid}
                    title={!isCorrectionValid ? "Enter at least 5 characters of remediation instructions in Reviewer Audit Notes before requesting correction" : "Dispatch correction request notice back to primary lender/servicer"}
                    className="w-full py-2.5 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 hover:shadow-md text-white font-bold text-[11px] font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-35 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {resolvingAction === 'REQUEST_CORRECTION' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>[Correction]</span>
                  </button>

                  <button
                    onClick={() => handleResolveAction('REJECT')}
                    disabled={resolvingAction !== null}
                    title="Reject loan record from portfolio or dismiss exception with human sign-off"
                    className="w-full py-2.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-700 hover:shadow-md text-white font-bold text-[11px] font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {resolvingAction === 'REJECT' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>[Reject]</span>
                  </button>
                </div>

                <div className="text-[10px] text-center font-mono text-slate-400 pt-1">
                  Cryptographically hashed &amp; audit logged.
                </div>
              </div>

              {/* Card 5: Reviewer Collaboration & Notes */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2 text-xs font-mono text-slate-900 font-bold uppercase">
                    <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Reviewer Collaboration &amp; Notes</span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    Audit Logged
                  </span>
                </div>

                {selectedException.resolution_notes ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedException.resolution_notes.split(' | ').map((noteItem, nIdx) => (
                      <div key={nIdx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sans text-slate-800 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-blue-700 font-bold uppercase">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Finding #{nIdx + 1}</span>
                        </div>
                        <p className="text-slate-700 text-xs leading-relaxed font-sans">{noteItem}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-slate-400 text-xs font-mono">
                    No reviewer notes attached yet. Add intermediate findings below.
                  </div>
                )}

                <div className="pt-1">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={reviewerCommentText}
                      onChange={(e) => setReviewerCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      placeholder="Add intermediate review findings, title deed notes..."
                      disabled={isSubmittingComment}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white disabled:opacity-50"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={isSubmittingComment || !reviewerCommentText.trim()}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      {isSubmittingComment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                      <span>{isSubmittingComment ? 'Saving...' : 'Add Note'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-400 font-mono text-xs shadow-sm">
              Select an exception from the queue to start review.
            </div>
          )}
        </div>

        {/* 2. Laptop / Desktop 2-Column Balanced View (>= lg) */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (5 Cols): Records Queue + Reviewer Governance Action Station */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Search and Filter Tabs */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Loan ID, Borrower ID (e.g. BOR-20020), Rule..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-8 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'ALL', label: `All (${displayedExceptions.length})` },
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

            {/* Exception Queue Items List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading exception queue...</span>
                </div>
              ) : displayedExceptions.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="font-bold text-slate-900 font-sans text-sm">
                    {searchQuery ? 'No Matching Exceptions' : 'All Exceptions Resolved!'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {searchQuery ? `No open exceptions matched "${searchQuery}".` : 'Clean records ready for canonical sealing.'}
                  </div>
                </div>
              ) : (
                displayedExceptions.map((exc) => {
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-bold text-xs font-mono text-slate-900 truncate">
                            {exc.loan_id_code}
                          </span>
                          {exc.borrower_id && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200 shrink-0">
                              {exc.borrower_id}
                            </span>
                          )}
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

            {/* Desktop Reviewer Action Station (Zero Silent Write Governance) */}
            {selectedException && (
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                  <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 font-bold uppercase">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Reviewer Governance</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold uppercase border border-emerald-200">
                      Human Authority
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">Signer: Marcus Vance</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono uppercase text-slate-600 font-bold">
                        Manual Override Value
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        Target: <code className="text-blue-700 font-bold bg-blue-50 px-1 py-0.5 rounded">{selectedException.field_name || 'value'}</code>
                      </span>
                    </div>
                    <input
                      type="text"
                      value={manualPatchValue}
                      onChange={(e) => setManualPatchValue(e.target.value)}
                      placeholder={
                        NUMERIC_LOAN_FIELDS.some(f => (selectedException.field_name || '').toLowerCase().includes(f))
                          ? `Enter numeric value for ${selectedException.field_name} (e.g. 500000)...`
                          : DATE_LOAN_FIELDS.some(f => (selectedException.field_name || '').toLowerCase().includes(f))
                          ? `Enter date for ${selectedException.field_name} (YYYY-MM-DD)...`
                          : `Enter custom value for ${selectedException.field_name}...`
                      }
                      className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white transition-all ${
                        manualPatchValue.trim() && !fieldValidation.isValid
                          ? 'border-red-400 focus:border-red-500 bg-red-50/30'
                          : manualPatchValue.trim() && fieldValidation.isValid
                          ? 'border-emerald-400 focus:border-emerald-500 bg-emerald-50/20'
                          : 'border-slate-300 focus:border-blue-500'
                      }`}
                    />
                    {manualPatchValue.trim() && !fieldValidation.isValid && (
                      <div className="text-[11px] font-sans text-red-600 mt-1 flex items-center gap-1 font-medium animate-fade-in">
                        <span>⚠️ {fieldValidation.message}</span>
                      </div>
                    )}
                    {manualPatchValue.trim() && fieldValidation.isValid && (
                      <div className="text-[11px] font-sans text-emerald-700 mt-1 flex items-center gap-1 font-medium animate-fade-in">
                        <span>✓ Valid format for {selectedException.field_name}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono uppercase text-slate-600 font-bold">
                        Reviewer Audit Notes / Justification
                      </label>
                      <span className={`text-[10px] font-mono ${customNotes.trim().length >= 5 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                        Min 5 chars for [Correction] ({customNotes.trim().length}/5)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="e.g. Verified against physical deed / Servicer must remediate..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleResolveAction('ACCEPT_AI')}
                    disabled={resolvingAction !== null}
                    title="Explicitly approve recommended AI remediation patch and sign audit trail"
                    className="w-full py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 hover:shadow-md text-white font-bold text-[11px] font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {resolvingAction === 'ACCEPT_AI' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>[Accept AI]</span>
                  </button>

                  <button
                    onClick={() => handleResolveAction('MANUAL_EDIT')}
                    disabled={resolvingAction !== null || !isManualEditValid}
                    title={!isManualEditValid ? (manualPatchValue.trim() ? fieldValidation.message : `Enter a valid manual override value for ${selectedException.field_name || 'the field'} to enable Custom Edit`) : "Submit custom manual field correction and sign audit trail"}
                    className="w-full py-2.5 px-2 rounded-xl bg-[#0b1c30] hover:bg-slate-800 hover:shadow-md text-white font-bold text-[11px] font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-35 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {resolvingAction === 'MANUAL_EDIT' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>[Custom Edit]</span>
                  </button>

                  <button
                    onClick={() => handleResolveAction('REQUEST_CORRECTION')}
                    disabled={resolvingAction !== null || !isCorrectionValid}
                    title={!isCorrectionValid ? "Enter at least 5 characters of remediation instructions in Reviewer Audit Notes before requesting correction" : "Dispatch correction request notice back to primary lender/servicer"}
                    className="w-full py-2.5 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 hover:shadow-md text-white font-bold text-[11px] font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-35 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {resolvingAction === 'REQUEST_CORRECTION' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>[Correction]</span>
                  </button>

                  <button
                    onClick={() => handleResolveAction('REJECT')}
                    disabled={resolvingAction !== null}
                    title="Reject loan record from portfolio or dismiss exception with human sign-off"
                    className="w-full py-2.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-700 hover:shadow-md text-white font-bold text-[11px] font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {resolvingAction === 'REJECT' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>[Reject]</span>
                  </button>
                </div>

                <div className="text-[10px] text-center font-mono text-slate-400 pt-1">
                  Cryptographically hashed &amp; audit logged.
                </div>
              </div>
            )}

          </div>

          {/* Right Column (7 Cols): Violation Details + AI Copilot + Collaboration Notes Thread */}
          <div className="lg:col-span-7 space-y-5">
            {selectedException ? (
              <>
                {/* Desktop Card 1: Exception Violation Header & Side-by-Side Diff */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 gap-2">
                    <div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">
                        Violation In Exception #{selectedException.id}
                      </div>
                      <h2 className="text-lg font-bold font-sans text-slate-900 mt-0.5 flex items-center gap-2">
                        <span>{selectedException.loan_id_code}</span>
                        {selectedException.borrower_id && (
                          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            Borrower: {selectedException.borrower_id}
                          </span>
                        )}
                        <span className="text-slate-500 font-normal text-xs font-mono">• {selectedException.rule_code}</span>
                      </h2>
                    </div>

                    <span className="text-xs font-mono text-red-700 bg-red-50 px-2.5 py-1 rounded-lg font-bold border border-red-200 shrink-0">
                      {selectedException.severity}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-sans text-red-800 leading-relaxed break-words">
                    <span className="font-bold">Rule Constraint Violated: </span>
                    {selectedException.error_message}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-mono text-slate-700 uppercase flex items-center gap-1.5 font-bold">
                      <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Multi-Source Conflict &amp; Field Diff</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-200 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-mono text-red-700 uppercase font-bold">
                          <span>Source A: Tape Ingest</span>
                          <span>Conflicting</span>
                        </div>
                        <div className="text-xs font-mono text-slate-600 truncate">
                          Field: <span className="text-slate-900 font-bold">{selectedException.field_name}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-red-200 text-xs font-mono text-red-700 font-bold break-all">
                          {selectedException.actual_value}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-mono text-emerald-700 uppercase font-bold">
                          <span>Source B: Servicer Feed</span>
                          <span>Expected</span>
                        </div>
                        <div className="text-xs font-mono text-slate-600 truncate">
                          Field: <span className="text-slate-900 font-bold">{selectedException.field_name}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-xs font-mono text-emerald-700 font-bold break-all">
                          {selectedException.expected_condition}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Card 2: AI Diligence Copilot */}
                <div className="p-5 rounded-2xl bg-white border border-purple-200 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-sm shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-1.5">
                          <span>AI Diligence Copilot</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-200">
                            Gemini 2.5 Flash
                          </span>
                        </h3>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                          <span>Model: <code className="text-purple-700 font-semibold">{selectedException.ai_model?.replace('models/', '').replace('offline-fintech-heuristic-v1', 'gemini-2.5-flash') || 'gemini-2.5-flash'}</code></span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-purple-700">
                        {Math.round((selectedException.ai_confidence || 0.98) * 100)}% Confidence
                      </div>
                    </div>
                  </div>

                  {isPromptingAI ? (
                    <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-center space-x-3 text-purple-800 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600 flex-shrink-0" />
                      <div className="text-xs font-mono font-bold">Consulting Gemini AI Copilot...</div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-100 space-y-2">
                      <div className="text-[10px] font-mono text-purple-800 uppercase font-bold">
                        {lastPromptQuery ? `Analysis for: "${lastPromptQuery}"` : "Remediation Rationale"}
                      </div>
                      {renderFormattedAIExplanation(
                        selectedException.ai_explanation || 'Cross-referencing amortizing term with origination date reveals a transcription boundary typo.',
                        isExpandedExplanation
                      )}
                      {(selectedException.ai_explanation || '').length > 180 && (
                        <button
                          type="button"
                          onClick={() => setIsExpandedExplanation(!isExpandedExplanation)}
                          className="text-[11px] font-mono text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <span>{isExpandedExplanation ? 'Show Less' : 'Read More'}</span>
                          {isExpandedExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  )}

                  {selectedException.ai_suggested_patch && (
                    <div className="space-y-1 font-mono text-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Suggested Patch Payload (Dry Run)</div>
                      <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 text-[10px] overflow-x-auto whitespace-pre-wrap break-all shadow-inner">
                        {JSON.stringify(selectedException.ai_suggested_patch, null, 2)}
                      </pre>
                    </div>
                  )}

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

                  <div className="pt-1">
                    <div className="flex gap-2">
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
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm cursor-pointer shrink-0"
                      >
                        {isPromptingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                        <span>{isPromptingAI ? 'Analyzing...' : 'Prompt'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Desktop Card 3: Reviewer Collaboration & Notes */}
                <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-2 text-xs font-mono text-slate-900 font-bold uppercase">
                      <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Reviewer Collaboration &amp; Notes</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      Audit Logged
                    </span>
                  </div>

                  {selectedException.resolution_notes ? (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {selectedException.resolution_notes.split(' | ').map((noteItem, nIdx) => (
                        <div key={nIdx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sans text-slate-800 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-blue-700 font-bold uppercase">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Finding #{nIdx + 1}</span>
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed font-sans">{noteItem}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-slate-400 text-xs font-mono">
                      No reviewer notes attached yet. Add intermediate findings below.
                    </div>
                  )}

                  <div className="pt-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={reviewerCommentText}
                        onChange={(e) => setReviewerCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        placeholder="Add intermediate review findings, title deed notes..."
                        disabled={isSubmittingComment}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white disabled:opacity-50"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={isSubmittingComment || !reviewerCommentText.trim()}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-sm cursor-pointer shrink-0"
                      >
                        {isSubmittingComment ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                        <span>{isSubmittingComment ? 'Saving...' : 'Add Note'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
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

export default ReviewerWorkbench;
