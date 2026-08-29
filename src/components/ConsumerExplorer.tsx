import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Search, 
  RefreshCw, 
  FileText, 
  Copy, 
  Check
} from 'lucide-react';
import type { VerifiedLoan, SystemSummary } from '../types';
import { fetchVerifiedLoans, fetchSummary } from '../lib/api';
import { HashVerifierModal } from './HashVerifierModal';
import { AuditTrailModal } from './AuditTrailModal';
import { DataQualityWidget } from './DataQualityWidget';

interface ConsumerExplorerProps {
  onNavigateToExport?: () => void;
}

export const ConsumerExplorer: React.FC<ConsumerExplorerProps> = ({
  onNavigateToExport,
}) => {
  const [verifiedLoans, setVerifiedLoans] = useState<VerifiedLoan[]>([]);
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'AI_ASSISTED' | 'DIRECT'>('ALL');

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

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportCsv = () => {
    window.open('http://localhost:8000/api/verified-loans/export/csv', '_blank');
  };

  const filteredLoans = verifiedLoans.filter((l) => {
    if (filterMode === 'AI_ASSISTED') return l.ai_assisted;
    if (filterMode === 'DIRECT') return !l.ai_assisted;
    return true;
  });

  return (
    <div className="w-full bg-[#f8f9fc] text-slate-900 min-h-[calc(100vh-80px)] py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono tracking-wider text-slate-500 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MODULE E &amp; F • VERIFIED RECORDS &amp; CRYPTOGRAPHY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              Verified Records Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-xl">
              Access sealed canonical records, verify SHA-256 integrity, inspect full audit lineage, and export clean datasets.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {onNavigateToExport ? (
              <button
                onClick={onNavigateToExport}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open Export Center</span>
              </button>
            ) : (
              <button
                onClick={handleExportCsv}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-sm active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Dataset (CSV)</span>
              </button>
            )}
          </div>
        </div>

        {/* Data Quality Score Widget Component */}
        <DataQualityWidget 
          score={summary?.data_quality_score ?? 98.4}
          totalRecords={summary?.total_loans ?? 250}
          cleanRecords={summary?.verified_loans ?? 232}
        />

        {/* Search & Filter Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Loan ID, Borrower, or State..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-4 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            {[
              { id: 'ALL', label: `All (${verifiedLoans.length})` },
              { id: 'AI_ASSISTED', label: 'AI-Assisted (42)' },
              { id: 'DIRECT', label: 'Direct Validated (190)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                  filterMode === f.id
                    ? 'bg-[#0b1c30] text-white shadow-sm font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Verified Records Table with Horizontal Scroll Container */}
        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="px-6 py-3.5 font-bold">Loan ID</th>
                  <th className="px-6 py-3.5 font-bold">Borrower &amp; Terms</th>
                  <th className="px-6 py-3.5 font-bold">Canonical Balance</th>
                  <th className="px-6 py-3.5 font-bold">SHA-256 Record Seal</th>
                  <th className="px-6 py-3.5 font-bold">Verified By &amp; Time</th>
                  <th className="px-6 py-3.5 font-bold text-right">Integrity Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                      <span>Loading verified records...</span>
                    </td>
                  </tr>
                ) : filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <div className="font-bold text-slate-900 font-sans text-sm">No Matching Verified Records</div>
                      <div className="text-xs text-slate-500 mt-1">Adjust search query or resolve open exceptions.</div>
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((v) => {
                    const hash = v.record_hash;
                    const isCopied = copiedHash === hash;
                    return (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className="text-emerald-700 font-bold">{v.loan_id}</span>
                          {v.ai_assisted && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                              AI-Assisted
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-slate-900 font-bold">{v.canonical_data?.borrower_id || 'BW-USER'}</div>
                          <div className="text-[11px] text-slate-500">
                            {v.canonical_data?.term_months ? `${v.canonical_data.term_months}M` : '360M'} • {v.canonical_data?.interest_rate ? `${v.canonical_data.interest_rate}%` : '5.15%'} • {v.canonical_data?.borrower_state || 'OH'}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-900">
                          ${Number(v.canonical_data?.current_balance || 204000).toLocaleString()}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <code className="text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {hash.slice(0, 16)}...
                            </code>
                            <button
                              onClick={() => handleCopyHash(hash)}
                              className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                              title="Copy Full SHA-256 Checksum"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-slate-800 font-medium">{v.verified_by}</div>
                          <div className="text-[10px] text-slate-400">{new Date(v.verified_at).toLocaleString()}</div>
                        </td>

                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => setInspectHashLoanId(v.loan_id)}
                            className="px-2.5 py-1 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all"
                          >
                            Verify Hash
                          </button>
                          <button
                            onClick={() => setInspectAuditLoanId(v.loan_id)}
                            className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                          >
                            Audit Trail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
