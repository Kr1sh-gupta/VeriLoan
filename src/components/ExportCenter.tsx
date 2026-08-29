import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  ShieldCheck, 
  Lock, 
  FileSpreadsheet, 
  Code2, 
  Layers, 
  History 
} from 'lucide-react';
import type { ExportRequestRecord } from '../types';

export const ExportCenter: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<'CSV' | 'JSON' | 'PARQUET'>('CSV');
  const [includeAuditTrail, setIncludeAuditTrail] = useState<boolean>(true);
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportHistory, setExportHistory] = useState<ExportRequestRecord[]>([
    {
      id: 'exp-001',
      datasetName: 'Verified_Canonical_Loans_Q3_2026.csv',
      format: 'CSV',
      recordCount: 232,
      includeAuditTrail: true,
      status: 'READY',
      requestedBy: 'Sarah Chen (Data Consumer)',
      requestedAt: '2026-08-29 10:15 UTC',
      fileSize: '1.4 MB',
      downloadUrl: 'http://localhost:8000/api/verified-loans/export/csv'
    },
    {
      id: 'exp-002',
      datasetName: 'Global_Audit_Compliance_Trail_August.json',
      format: 'JSON',
      recordCount: 540,
      includeAuditTrail: true,
      status: 'READY',
      requestedBy: 'Alex Rivera (Admin)',
      requestedAt: '2026-08-28 16:30 UTC',
      fileSize: '3.8 MB',
      downloadUrl: 'http://localhost:8000/api/audit/export/json'
    },
    {
      id: 'exp-003',
      datasetName: 'Fannie_Mae_Delivery_Package.csv',
      format: 'CSV',
      recordCount: 180,
      includeAuditTrail: false,
      status: 'READY',
      requestedBy: 'Sarah Chen (Data Consumer)',
      requestedAt: '2026-08-27 11:20 UTC',
      fileSize: '980 KB',
      downloadUrl: 'http://localhost:8000/api/verified-loans/export/csv'
    }
  ]);

  const handleTriggerExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      const newRecord: ExportRequestRecord = {
        id: `exp-00${exportHistory.length + 1}`,
        datasetName: `Verified_Loans_Export_${new Date().toISOString().slice(0, 10)}.${selectedFormat.toLowerCase()}`,
        format: selectedFormat,
        recordCount: 232,
        includeAuditTrail,
        status: 'READY',
        requestedBy: 'Sarah Chen (Data Consumer)',
        requestedAt: new Date().toLocaleTimeString() + ' UTC',
        fileSize: selectedFormat === 'CSV' ? '1.4 MB' : '2.9 MB',
        downloadUrl: 'http://localhost:8000/api/verified-loans/export/csv'
      };
      setExportHistory([newRecord, ...exportHistory]);
      setIsExporting(false);
      window.open('http://localhost:8000/api/verified-loans/export/csv', '_blank');
    }, 800);
  };

  return (
    <div className="w-full bg-[#f8f9fc] text-slate-900 min-h-[calc(100vh-80px)] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="space-y-2">
            <div className="text-[11px] font-mono tracking-widest text-slate-500 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MODULE G • EXPORT CENTER &amp; COMPLIANCE DELIVERY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              Export Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-xl">
              Generate standardized downstream exports of verified canonical loan records paired with immutable cryptographic audit trails.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verified Data Only Boundary Active</span>
          </div>
        </div>

        {/* Export Configuration Card */}
        <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
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
                  className={`p-3 rounded-xl border text-xs font-mono font-bold transition-all flex flex-col items-center gap-1.5 ${
                    selectedFormat === 'JSON'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  <span>JSON</span>
                </button>

                <button
                  onClick={() => setSelectedFormat('PARQUET')}
                  className={`p-3 rounded-xl border text-xs font-mono font-bold transition-all flex flex-col items-center gap-1.5 ${
                    selectedFormat === 'PARQUET'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>PARQUET</span>
                </button>
              </div>
            </div>

            {/* Scope / Filter */}
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-slate-600 font-bold">
                2. Verification Scope
              </label>
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
              >
                <option value="ALL">All Sealed Verified Loans (232 records)</option>
                <option value="TODAY">Verified Today (14 records)</option>
                <option value="WEEK">Verified This Week (85 records)</option>
                <option value="AI_RESOLVED">AI-Assisted Resolutions Only (42 records)</option>
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

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs font-mono text-slate-600 flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Immutable Export Package • Ready for GSE / Trustee Delivery</span>
            </div>

            <button
              onClick={handleTriggerExport}
              disabled={isExporting}
              className="px-6 py-3 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generating Package...' : 'Download Export Package'}</span>
            </button>
          </div>
        </div>

        {/* Export History Table */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 uppercase tracking-wider font-bold">
            <History className="w-4 h-4 text-blue-600" />
            <span>Export History &amp; Compliance Logs</span>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <th className="px-6 py-3.5 font-bold">Dataset Name</th>
                  <th className="px-6 py-3.5 font-bold">Format</th>
                  <th className="px-6 py-3.5 font-bold">Records</th>
                  <th className="px-6 py-3.5 font-bold">Requested By</th>
                  <th className="px-6 py-3.5 font-bold">Timestamp</th>
                  <th className="px-6 py-3.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exportHistory.map((item) => (
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
                    <td className="px-6 py-4 text-slate-700">{item.recordCount}</td>
                    <td className="px-6 py-4 text-slate-500">{item.requestedBy}</td>
                    <td className="px-6 py-4 text-slate-500">{item.requestedAt}</td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={item.downloadUrl || 'http://localhost:8000/api/verified-loans/export/csv'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
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
