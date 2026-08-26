import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Layers,
  ArrowRight,
  Database
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
      setUploadStatus(`Uploading & Parsing ${file.name}...`);
      const res = await uploadCsvFile(file, fileType);
      setUploadStatus(`Successfully processed ${res.filename}: Ingested ${res.total_rows} rows (${res.exception_count} exceptions raised).`);
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
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1 uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            <span>Module A &amp; B: Data Ingestion &amp; Validation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Data Operator Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ingest loan tapes, secondary servicer updates, and trigger the 14-rule validation engine.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleVerifyCleanBatch}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 text-xs font-semibold transition-all shadow-lg shadow-emerald-950/40"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Batch Seal Clean Loans</span>
          </button>

          <button
            onClick={onNavigateToReviewer}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 text-xs font-semibold transition-all shadow-lg shadow-cyan-900/50"
          >
            <span>Review Exceptions</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Upload Zone & Ingestion Batch History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dropzone Card */}
        <div className="lg:col-span-1 p-6 rounded-3xl glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-white font-sans flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-cyan-400" /> Ingest New Dataset
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">CSV Only</span>
            </div>

            {/* File Type Select */}
            <div className="mb-4">
              <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1">Select File Schema</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="LOAN_TAPE">Primary Loan Tape (loan_tape.csv)</option>
                <option value="SERVICER_UPDATE">Servicer Update Tape (servicer_update.csv)</option>
                <option value="DOC_MANIFEST">Document Manifest (document_manifest.csv)</option>
              </select>
            </div>

            {/* Drag and Drop Container */}
            <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-2xl cursor-pointer bg-slate-950/60 transition-all group text-center">
              <FileSpreadsheet className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform mb-2" />
              <span className="text-xs font-semibold text-slate-200">Click to upload or drag &amp; drop</span>
              <span className="text-[11px] text-slate-400 mt-1">Supports up to 5,000 records</span>
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
            <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-cyan-300 font-mono">
              {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-2 text-cyan-400" />}
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Recent Ingestion Batches Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-panel">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-white font-sans flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Ingestion &amp; Lineage Batches
            </span>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2">Batch ID</th>
                  <th className="pb-2">Filename</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Total Rows</th>
                  <th className="pb-2">Exceptions</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                      No ingestion batches recorded yet. Upload a CSV above.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.batch_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-bold text-cyan-400">{b.batch_id}</td>
                      <td className="py-2.5 text-slate-200">{b.filename}</td>
                      <td className="py-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {b.file_type}
                        </span>
                      </td>
                      <td className="py-2.5">{b.total_rows.toLocaleString()}</td>
                      <td className="py-2.5 text-amber-400 font-semibold">{b.exception_count}</td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
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

      {/* Raw Loans Explorer Grid */}
      <div className="p-6 rounded-3xl glass-panel space-y-4">
        
        {/* Table Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-white font-sans">Ingested Records Table</span>
            <span className="text-xs font-mono text-slate-400">({loans.length} records shown)</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Loan or Borrower ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-52 sm:w-64"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {['ALL', 'FLAGGED', 'VERIFIED', 'PENDING'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                    statusFilter === s ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="pb-3">Loan ID</th>
                <th className="pb-3">Borrower ID</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Original Principal</th>
                <th className="pb-3">Current Balance</th>
                <th className="pb-3">Rate</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">DPD</th>
                <th className="pb-3">State</th>
                <th className="pb-3">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 font-sans">
                    No loan records found matching filter.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-bold text-cyan-400">{loan.loan_id || '— MISSING —'}</td>
                    <td className="py-2.5 text-slate-400">{loan.borrower_id || '—'}</td>
                    <td className="py-2.5 text-slate-300">{loan.loan_type}</td>
                    <td className="py-2.5 font-semibold text-slate-200">
                      {loan.original_principal != null ? `$${loan.original_principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className={`py-2.5 font-semibold ${
                      loan.current_balance != null && loan.original_principal != null && loan.current_balance > loan.original_principal
                        ? 'text-red-400'
                        : 'text-slate-200'
                    }`}>
                      {loan.current_balance != null ? `$${loan.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-2.5 text-slate-300">
                      {loan.interest_rate != null ? `${loan.interest_rate.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-2.5 text-slate-300">{loan.payment_status}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (loan.days_past_due || 0) > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {loan.days_past_due || 0}d
                      </span>
                    </td>
                    <td className="py-2.5">{loan.borrower_state || '—'}</td>
                    <td className="py-2.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                        loan.status === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : loan.status === 'FLAGGED'
                          ? 'bg-red-950 text-red-400 border-red-800'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
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
  );
};
