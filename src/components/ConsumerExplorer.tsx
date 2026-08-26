import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Search, 
  Lock, 
  GitCommit, 
  ShieldCheck, 
  RefreshCw,
  TrendingUp
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
    <div className="w-full bg-[#060913] text-white min-h-[calc(100vh-80px)] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Banner matching landing page style */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="space-y-2">
            <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>MODULE E &amp; F • VERIFIED RECORDS &amp; CRYPTOGRAPHY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
              Data Consumer Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl">
              Access sealed canonical records, verify SHA-256 integrity, inspect full audit lineage, and export clean datasets.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Dataset (CSV)</span>
            </button>
          </div>
        </div>

        {/* Minimal Metric Cards matching landing page breakdown cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Card 1: Verified Records */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Verified Records</div>
                <div className="text-3xl font-extrabold font-mono text-white mt-1">
                  {summary.verified_loans}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3" /> Sealed with SHA-256
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-emerald-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Quality Score */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Data Quality Score</div>
                <div className="text-3xl font-extrabold font-mono text-white mt-1">
                  {summary.data_quality_score.toFixed(1)}%
                </div>
                <div className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1 font-sans">
                  <TrendingUp className="w-3 h-3" /> 14-Rule Clean Rate
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-cyan-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Immutability */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Audit Traceability</div>
                <div className="text-3xl font-extrabold font-mono text-white mt-1">
                  100%
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-sans">
                  Raw-to-Verified Lineage
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 text-indigo-400 flex items-center justify-center">
                <GitCommit className="w-5 h-5" />
              </div>
            </div>

          </div>
        )}

        {/* Sealed Records Data Grid */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white font-sans">Sealed Canonical Records</span>
              <span className="text-xs font-mono text-slate-400">({verifiedLoans.length} sealed)</span>
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
                  className="bg-[#0c1220] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 w-52 sm:w-72 font-mono"
                />
              </div>
              <button
                onClick={loadData}
                className="p-1.5 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 uppercase text-[10px]">
                  <th className="pb-3">Loan ID</th>
                  <th className="pb-3">Borrower ID</th>
                  <th className="pb-3">Principal</th>
                  <th className="pb-3">Current Balance</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">SHA-256 Sealed Hash</th>
                  <th className="pb-3">Verified By</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {verifiedLoans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                      No verified records yet. Head to Operator or Reviewer workbench to seal records.
                    </td>
                  </tr>
                ) : (
                  verifiedLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-bold text-emerald-400">{loan.loan_id}</td>
                      <td className="py-3 text-slate-400">{loan.canonical_data.borrower_id}</td>
                      <td className="py-3 text-white">
                        ${loan.canonical_data.original_principal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 font-bold text-white">
                        ${loan.canonical_data.current_balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-300 text-[10px]">
                          {loan.canonical_data.payment_status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-emerald-400 font-mono text-[10px] bg-[#060913] px-2 py-1 rounded border border-white/10 truncate max-w-[140px] block">
                          {loan.record_hash.substring(0, 16)}...
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{loan.verified_by}</td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => setInspectHashLoanId(loan.loan_id)}
                          className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-emerald-950/60 text-emerald-300 text-[11px] font-sans border border-emerald-500/30 transition-colors inline-flex items-center gap-1 font-medium"
                        >
                          <Lock className="w-3 h-3 text-emerald-400" /> Verify Hash
                        </button>
                        <button
                          onClick={() => setInspectAuditLoanId(loan.loan_id)}
                          className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-[11px] font-sans border border-white/10 transition-colors inline-flex items-center gap-1"
                        >
                          <GitCommit className="w-3 h-3 text-cyan-400" /> Lineage
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
    </div>
  );
};
