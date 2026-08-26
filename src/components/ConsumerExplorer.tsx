import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Search, 
  Lock, 
  GitCommit, 
  ShieldCheck, 
  RefreshCw
} from 'lucide-react';
import type { VerifiedLoan, SystemSummary } from '../types';
import { fetchVerifiedLoans, fetchSummary } from '../lib/api';
import { HashVerifierModal } from './HashVerifierModal';
import { AuditTrailModal } from './AuditTrailModal';

export const ConsumerExplorer: React.FC = () => {
  const [verifiedLoans, setVerifiedLoans] = useState<VerifiedLoan[]>([]);
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [inspectHashLoanId, setInspectHashLoanId] = useState<string | null>(null);
  const [inspectAuditLoanId, setInspectAuditLoanId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loansData, summaryData] = await Promise.all([
        fetchVerifiedLoans(searchQuery || undefined),
        fetchSummary()
      ]);
      setVerifiedLoans(loansData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load verified data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = () => {
    window.open('http://localhost:8000/api/verified-loans/export/csv', '_blank');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 mb-1 uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Module E &amp; F: Verified Records &amp; Traceability</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Data Consumer Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Access cryptographically sealed verified records, verify SHA-256 hashes, and inspect full audit lineage.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-950/40"
          >
            <Download className="w-4 h-4" />
            <span>Export Verified Dataset (CSV)</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl glass-panel flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase">Verified Records</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {summary.verified_loans}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Sealed with SHA-256</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Lock className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-panel flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase">Data Quality Score</div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                {summary.data_quality_score.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Clean &amp; Reconciled Rate</div>
            </div>
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl glass-panel flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase">Audit Immutability</div>
              <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                100% Traceable
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Raw-to-Verified Lineage</div>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GitCommit className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Verified Records Data Grid */}
      <div className="p-6 rounded-3xl glass-panel space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white font-sans">Sealed Canonical Records</span>
            <span className="text-xs font-mono text-slate-400">({verifiedLoans.length} records verified)</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Loan ID or Hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-52 sm:w-72 font-mono"
              />
            </div>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="pb-3">Loan ID</th>
                <th className="pb-3">Borrower ID</th>
                <th className="pb-3">Principal</th>
                <th className="pb-3">Current Balance</th>
                <th className="pb-3">Payment Status</th>
                <th className="pb-3">SHA-256 Record Hash</th>
                <th className="pb-3">Verified By</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {verifiedLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 font-sans">
                    No verified records yet. Head to the Operator or Reviewer workbench to verify records.
                  </td>
                </tr>
              ) : (
                verifiedLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-bold text-emerald-400">{loan.loan_id}</td>
                    <td className="py-3 text-slate-400">{loan.canonical_data.borrower_id}</td>
                    <td className="py-3 text-slate-200">
                      ${loan.canonical_data.original_principal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 font-semibold text-slate-200">
                      ${loan.canonical_data.current_balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {loan.canonical_data.payment_status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-emerald-400/90 font-mono text-[10px] bg-slate-950 px-2 py-1 rounded border border-emerald-950 truncate max-w-[140px] block">
                        {loan.record_hash.substring(0, 16)}...
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{loan.verified_by}</td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() => setInspectHashLoanId(loan.loan_id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-[11px] font-sans border border-emerald-800/60 transition-colors inline-flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3 text-emerald-400" /> Verify Hash
                      </button>
                      <button
                        onClick={() => setInspectAuditLoanId(loan.loan_id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans transition-colors inline-flex items-center gap-1"
                      >
                        <GitCommit className="w-3 h-3 text-cyan-400" /> Audit Lineage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modals */}
      {inspectHashLoanId && (
        <HashVerifierModal
          verifiedLoanId={inspectHashLoanId}
          onClose={() => setInspectHashLoanId(null)}
        />
      )}

      {inspectAuditLoanId && (
        <AuditTrailModal
          loanId={inspectAuditLoanId}
          onClose={() => setInspectAuditLoanId(null)}
        />
      )}

    </div>
  );
};
