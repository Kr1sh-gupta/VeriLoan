import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  ShieldCheck, 
  ArrowRight,
  Layers,
  Check,
  FileText
} from 'lucide-react';
import type { LoanRecord } from '../types';
import { fetchLoans, verifyAllCleanLoans } from '../lib/api';

interface OperatorViewProps {
  onRefreshSummary: () => void;
  onNavigateToReviewer: () => void;
  onNavigateToIngest?: () => void;
}

export const OperatorView: React.FC<OperatorViewProps> = ({
  onRefreshSummary,
  onNavigateToReviewer,
  onNavigateToIngest,
}) => {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const loanData = await fetchLoans(statusFilter === 'ALL' ? undefined : statusFilter, searchQuery || undefined);
      setLoans(loanData);
    } catch (err) {
      console.error('Failed to load operator data', err);
      setError('Could not load loan records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleVerifyCleanBatch = async () => {
    try {
      setLoading(true);
      const res = await verifyAllCleanLoans('Elena Rostova (Operator)');
      setUploadStatus(res.message);
      await loadData();
      onRefreshSummary();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cleanCount = loans.filter((l) => l.status === 'VERIFIED').length;
  const flaggedCount = loans.filter((l) => l.status === 'FLAGGED').length;
  const cleanPct = loans.length > 0 ? ((cleanCount / loans.length) * 100).toFixed(1) : '0.0';

  return (
    <div className="w-full bg-[#f8f9fc] text-slate-900 min-h-[calc(100vh-80px)] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-200">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-slate-500 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <span>MODULE A &amp; B • DATA OPERATOR CONSOLE</span>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              Batch Lineage &amp; Operator Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-xl leading-relaxed">
              Track batch import history, verify clean subsets, and monitor raw file lineage.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:space-x-3 space-x-0 shrink-0">
            {onNavigateToIngest && (
              <button
                onClick={onNavigateToIngest}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Open Ingestion Hub</span>
              </button>
            )}
            <button
              onClick={handleVerifyCleanBatch}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify Clean Loans</span>
            </button>
          </div>
        </div>

        {uploadStatus && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-mono flex items-center justify-between animate-fade-in shadow-sm">
            <span>{uploadStatus}</span>
            <button onClick={() => setUploadStatus(null)}>
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center justify-between shadow-sm">
            <span>{error}</span>
            <button onClick={loadData} className="font-bold underline">Retry</button>
          </div>
        )}

        {/* Batch Lineage Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Total Ingested Records</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">{loading ? '—' : loans.length}</div>
            <div className="text-[11px] font-sans text-slate-500">Currently loaded records</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Clean Loans (Passed)</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700">{loading ? '—' : cleanCount}</div>
            <div className="text-[11px] font-sans text-emerald-700 font-bold">{loading ? '' : `${cleanPct}% First-Pass Yield`}</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Exceptions Routed</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600">{loading ? '—' : flaggedCount}</div>
            <div className="text-[11px] font-sans text-amber-700 font-bold">Awaiting Reviewer</div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Sealed Verified Records</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-700">{loading ? '—' : cleanCount}</div>
            <div className="text-[11px] font-sans text-blue-700 font-bold">SHA-256 Hash Immutability</div>
          </div>
        </div>

        {/* Import Batches Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 uppercase tracking-wider font-bold">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Import History &amp; Lineage Batches</span>
            </div>
            <button
              onClick={onNavigateToReviewer}
              className="text-xs font-mono text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Resolve Flagged Items</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="px-6 py-3.5 font-bold">Batch Filename</th>
                  <th className="px-6 py-3.5 font-bold">Type</th>
                  <th className="px-6 py-3.5 font-bold">Total Rows</th>
                  <th className="px-6 py-3.5 font-bold">Clean Records</th>
                  <th className="px-6 py-3.5 font-bold">Exceptions</th>
                  <th className="px-6 py-3.5 font-bold">Status</th>
                  <th className="px-6 py-3.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>All ingested records</span>
                  </td>
                  <td className="px-6 py-4">LOAN_TAPE</td>
                  <td className="px-6 py-4 font-bold">{loading ? '—' : loans.length}</td>
                  <td className="px-6 py-4 text-emerald-700 font-bold">{loading ? '—' : cleanCount}</td>
                  <td className="px-6 py-4 text-amber-600 font-bold">{loading ? '—' : flaggedCount}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      {loading ? 'LOADING' : 'PROCESSED'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={onNavigateToReviewer}
                      className="px-3 py-1 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold"
                    >
                      Inspect Queue →
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Normalized Loans Browser */}
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 uppercase tracking-wider font-bold">
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Normalized Ingested Records ({loans.length} Records)</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:space-x-3 space-x-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadData(); }}
                  placeholder="Filter records..."
                  className="w-full bg-white border border-slate-300 rounded-xl py-1.5 pl-9 pr-4 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm font-bold"
              >
                <option value="ALL">All Statuses</option>
                <option value="FLAGGED">FLAGGED</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="px-6 py-3.5 font-bold">Loan ID</th>
                  <th className="px-6 py-3.5 font-bold">Borrower ID</th>
                  <th className="px-6 py-3.5 font-bold">Principal Amount</th>
                  <th className="px-6 py-3.5 font-bold">Current Balance</th>
                  <th className="px-6 py-3.5 font-bold">Rate / Term</th>
                  <th className="px-6 py-3.5 font-bold">Maturity Date</th>
                  <th className="px-6 py-3.5 font-bold">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-mono text-xs">
                      Loading records…
                    </td>
                  </tr>
                )}

                {!loading && !error && loans.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-mono text-xs">
                      No records found. Try uploading a loan tape from the Ingestion Hub.
                    </td>
                  </tr>
                )}

                {!loading && loans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{l.loan_id}</td>
                    <td className="px-6 py-3.5 text-slate-600">{l.borrower_id}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">${Number(l.original_principal || 0).toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-slate-600">${Number(l.current_balance || 0).toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-slate-600">{l.interest_rate}% / {l.term_months}M</td>
                    <td className="px-6 py-3.5 text-slate-600">{l.maturity_date}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        l.status === 'FLAGGED' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};