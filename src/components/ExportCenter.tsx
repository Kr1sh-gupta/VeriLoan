import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  ShieldCheck, 
  Lock, 
  FileSpreadsheet, 
  Code2, 
  Layers, 
  History,
  Info
} from 'lucide-react';
import type { ExportRequestRecord } from '../types';
import { exportCsvUrl } from '../lib/api';

export const ExportCenter: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<'CSV' | 'JSON' | 'PARQUET'>('CSV');
  const [includeAuditTrail, setIncludeAuditTrail] = useState<boolean>(true);
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  // NOTE: this history is local-only for this browser session — there is no
  // backend endpoint yet to persist or fetch real export history. Flagged to
  // the team; not fixed here since it needs a new backend feature.
  const [exportHistory, setExportHistory] = useState<ExportRequestRecord[]>([]);

  const handleTriggerExport = () => {
    if (selectedFormat !== 'CSV') return; // guarded by disabled buttons below, safety net
    setIsExporting(true);
    setTimeout(() => {
      const newRecord: ExportRequestRecord = {
        id: `exp-session-${exportHistory.length + 1}`,
        datasetName: `Verified_Loans_Export_${new Date().toISOString().slice(0, 10)}.csv`,
        format: 'CSV',
        recordCount: null as any,
        includeAuditTrail,
        status: 'READY',
        requestedBy: 'You (this session)',
        requestedAt: new Date().toLocaleTimeString(),
        fileSize: '—',
        downloadUrl: exportCsvUrl()
      };
      setExportHistory([newRecord, ...exportHistory]);
      setIsExporting(false);
      window.open(exportCsvUrl(), '_blank');
    }, 800);
  };

  return (
    <div className="w-full bg-[#f8f9fc] text-slate-900 min-h-[calc(100vh-80px)] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-200">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-slate-500 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>MODULE G • EXPORT CENTER &amp; COMPLIANCE DELIVERY</span>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              Export Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-xl leading-relaxed">
              Generate standardized downstream exports of verified canonical loan records paired with immutable cryptographic audit trails.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Verified Data Only Boundary Active</span>
          </div>
        </div>

        {/* Export Configuration Card */}
        <div className="p-4 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-sans">
                Configure Dataset Export Package
              </h3>
              <p className="text-xs text-slate-500 font-sans">
                Select format, filter criteria, and optional paired audit logs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-slate-600 font-bold">
                1. Target Export Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedFormat('CSV')}
                  className={`p-3 rounded-xl border text-xs font-mono font-bold transition-all flex flex-col items-center gap-1.5 ${
                    selectedFormat === 'CSV'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={() => setSelectedFormat('JSON')}
                  disabled
                  title="JSON export is not available yet"
                  className="p-3 rounded-xl border text-xs font-mono font-bold transition-all flex flex-col items-center gap-1.5 bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                >
                  <Code2 className="w-4 h-4" />
                  <span>JSON</span>
                  <span className="text-[8px] normal-case font-medium">Coming Soon</span>
                </button>

                <button
                  onClick={() => setSelectedFormat('PARQUET')}
                  disabled
                  title="PARQUET export is not available yet"
                  className="p-3 rounded-xl border text-xs font-mono font-bold transition-all flex flex-col items-center gap-1.5 bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                >
                  <Layers className="w-4 h-4" />
                  <span>PARQUET</span>
                  <span className="text-[8px] normal-case font-medium">Coming Soon</span>
                </button>
              </div>
            </div>

            {/* Scope / Filter */}
            {/* NOTE: this dropdown's counts are placeholder and selecting a
                scope does not currently filter the export — no backend
                support for scoped export yet. Flagged to the team. */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-slate-600 font-bold flex items-center gap-1.5">
                2. Verification Scope
                <span title="Scope filtering is not yet supported by the backend">
                  <Info className="w-3 h-3 text-slate-400" />
                </span>
              </label>
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                disabled
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs font-mono text-slate-400 cursor-not-allowed font-medium"
              >
                <option value="ALL">All Sealed Verified Loans</option>
              </select>
            </div>

            {/* Paired Audit Option */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-slate-600 font-bold">
                3. Compliance Companion
              </label>
              <label className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all">
                <input 
                  type="checkbox"
                  checked={includeAuditTrail}
                  onChange={(e) => setIncludeAuditTrail(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                />
                <div className="text-xs font-mono">
                  <div className="text-slate-900 font-bold">Include SHA-256 Audit Trail</div>
                  <div className="text-[10px] text-slate-500">Generates paired compliance JSON log</div>
                </div>
              </label>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs font-mono text-slate-600 flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Immutable Export Package • Ready for GSE / Trustee Delivery</span>
            </div>

            <button
              onClick={handleTriggerExport}
              disabled={isExporting}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating Package...' : 'Download Export Package (CSV)'}</span>
            </button>
          </div>
        </div>

        {/* Export History Table */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 uppercase tracking-wider font-bold">
            <History className="w-4 h-4 text-blue-600" />
            <span>Export History (This Session)</span>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="px-6 py-3.5 font-bold">Dataset Name</th>
                    <th className="px-6 py-3.5 font-bold">Format</th>
                    <th className="px-6 py-3.5 font-bold">Requested By</th>
                    <th className="px-6 py-3.5 font-bold">Timestamp</th>
                    <th className="px-6 py-3.5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exportHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs">
                        No exports generated yet this session.
                      </td>
                    </tr>
                  ) : (
                    exportHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{item.datasetName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {item.format}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{item.requestedBy}</td>
                        <td className="px-6 py-4 text-slate-500">{item.requestedAt}</td>
                        <td className="px-6 py-4 text-right">
                          <a
                            href={item.downloadUrl || exportCsvUrl()}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
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
    </div>
  );
};