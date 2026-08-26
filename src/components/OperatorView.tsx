import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  ArrowRight,
  Layers
} from 'lucide-react';
import type { LoanRecord, IngestionBatch } from '../types';
import { fetchLoans, uploadCsvFile, verifyAllCleanLoans, fetchSummary } from '../lib/api';

interface OperatorViewProps {
  onRefreshSummary: () => void;
  onNavigateToReviewer: () => void;
}

export const OperatorView: React.FC<OperatorViewProps> = ({
  onRefreshSummary,
  onNavigateToReviewer,
}) => {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileType, setFileType] = useState<string>('LOAN_TAPE');
  const [batches, setBatches] = useState<IngestionBatch[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const loanData = await fetchLoans(statusFilter === 'ALL' ? undefined : statusFilter, searchQuery || undefined);
      setLoans(loanData);
      const summaryData = await fetchSummary();
      setBatches(summaryData.recent_batches || []);
    } catch (err) {
      console.error('Failed to load operator data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadStatus(`Parsing ${file.name}...`);
      const res = await uploadCsvFile(file, fileType);
      setUploadStatus(`Processed ${res.filename}: Ingested ${res.total_rows} rows (${res.exception_count} anomalies flagged).`);
      await loadData();
      onRefreshSummary();
    } catch (err: any) {
      setUploadStatus(`Upload failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setUploading(false);
    }
  };

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

  return (
    <div className="w-full bg-[#060913] text-white min-h-[calc(100vh-80px)] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Header Banner matching landing page style */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="space-y-2">
            <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>MODULE A &amp; B • INGESTION &amp; VALIDATION</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
              Data Operator Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl">
              Ingest multi-source loan tapes, track batch lineage, and trigger the 14-rule validation engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleVerifyCleanBatch}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-emerald-400 border border-emerald-500/30 text-xs font-semibold tracking-wider uppercase transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Batch Seal Clean Loans</span>
            </button>

            <button
              onClick={onNavigateToReviewer}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95"
            >
              <span>Review Exceptions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Upload Dropzone & Ingestion Lineage Batches */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Dropzone Card */}
          <div className="lg:col-span-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-white font-sans uppercase tracking-wider flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-cyan-400" /> Ingest Dataset
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300">CSV Only</span>
              </div>

              {/* Schema Selection */}
              <div className="mb-4">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Target Schema
                </label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="w-full bg-[#0c1220] border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                >
                  <option value="LOAN_TAPE">Primary Loan Tape (loan_tape.csv)</option>
                  <option value="SERVICER_UPDATE">Servicer Update Tape (servicer_update.csv)</option>
                  <option value="DOC_MANIFEST">Document Manifest (document_manifest.csv)</option>
                </select>
              </div>

              {/* Drop Container */}
              <label className="relative flex flex-col items-center justify-center p-6 border border-dashed border-white/20 hover:border-cyan-400 rounded-xl cursor-pointer bg-[#0c1220]/60 transition-all group text-center">
                <FileSpreadsheet className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform mb-2" />
                <span className="text-xs font-semibold text-white">Click to upload or drag &amp; drop</span>
                <span className="text-[10px] text-slate-400 mt-1 font-mono">Accepts .csv up to 10,000 rows</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {uploadStatus && (
              <div className="p-3 rounded-lg bg-[#0c1220] border border-white/10 text-xs text-cyan-300 font-mono flex items-center gap-2">
                {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                <span>{uploadStatus}</span>
              </div>
            )}
          </div>

          {/* Ingestion Lineage Batches Card */}
          <div className="lg:col-span-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-sans uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" /> Ingestion &amp; Lineage Batches
              </span>
              <button
                onClick={loadData}
                className="p-1.5 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400 uppercase text-[10px]">
                    <th className="pb-3">Batch ID</th>
                    <th className="pb-3">Filename</th>
                    <th className="pb-3">Schema</th>
                    <th className="pb-3">Rows</th>
                    <th className="pb-3">Anomalies</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-slate-300">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                        No ingestion batches recorded yet. Upload a CSV above.
                      </td>
                    </tr>
                  ) : (
                    batches.map((b) => (
                      <tr key={b.batch_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 font-bold text-cyan-400">{b.batch_id}</td>
                        <td className="py-3 text-white">{b.filename}</td>
                        <td className="py-3">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-slate-300">
                            {b.file_type}
                          </span>
                        </td>
                        <td className="py-3">{b.total_rows.toLocaleString()}</td>
                        <td className="py-3 text-amber-400 font-semibold">{b.exception_count}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Raw Ingested Records Explorer Table */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 space-y-4">
          
          {/* Controls: Search & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white font-sans">Ingested Records</span>
              <span className="text-xs font-mono text-slate-400">({loans.length} records)</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Loan or Borrower ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadData()}
                  className="bg-[#0c1220] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 w-52 sm:w-64 font-mono"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-1 bg-[#0c1220] p-1 rounded-lg border border-white/10 text-xs">
                {['ALL', 'FLAGGED', 'VERIFIED', 'PENDING'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1 rounded font-mono text-[10px] transition-colors ${
                      statusFilter === s ? 'bg-white text-[#060913] font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 uppercase text-[10px]">
                  <th className="pb-3">Loan ID</th>
                  <th className="pb-3">Borrower ID</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Original Principal</th>
                  <th className="pb-3">Current Balance</th>
                  <th className="pb-3">Rate</th>
                  <th className="pb-3">Payment Status</th>
                  <th className="pb-3">DPD</th>
                  <th className="pb-3">State</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-500 font-sans">
                      No loan records matching filter.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-bold text-cyan-400">{loan.loan_id || '— MISSING —'}</td>
                      <td className="py-3 text-slate-400">{loan.borrower_id || '—'}</td>
                      <td className="py-3 text-slate-300">{loan.loan_type}</td>
                      <td className="py-3 text-white font-semibold">
                        {loan.original_principal != null ? `$${loan.original_principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className={`py-3 font-semibold ${
                        loan.current_balance != null && loan.original_principal != null && loan.current_balance > loan.original_principal
                          ? 'text-red-400'
                          : 'text-white'
                      }`}>
                        {loan.current_balance != null ? `$${loan.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-3 text-slate-300">
                        {loan.interest_rate != null ? `${loan.interest_rate.toFixed(2)}%` : '—'}
                      </td>
                      <td className="py-3 text-slate-300">{loan.payment_status}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (loan.days_past_due || 0) > 0 ? 'bg-amber-400/20 text-amber-300' : 'bg-white/[0.05] text-slate-400'
                        }`}>
                          {loan.days_past_due || 0}d
                        </span>
                      </td>
                      <td className="py-3">{loan.borrower_state || '—'}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 border ${
                          loan.status === 'VERIFIED'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                            : loan.status === 'FLAGGED'
                            ? 'bg-red-950/60 text-red-400 border-red-500/40'
                            : 'bg-white/[0.05] text-slate-400 border-white/10'
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
};
