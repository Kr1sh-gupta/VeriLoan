import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  ScanLine, 
  Network, 
  Edit3, 
  ClipboardPaste, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  Check, 
  RotateCcw, 
  Sparkles, 
  X, 
  ShieldCheck, 
  Zap 
} from 'lucide-react';
import type { IngestionPipelineItem, SchemaFieldMapping, OcrExtractedField } from '../types';
import { uploadCsvFile } from '../lib/api';

interface IngestionHubProps {
  onRefreshSummary: () => void;
  onNavigateToReviewer: () => void;
  onNavigateToOperator: () => void;
}

export const IngestionHub: React.FC<IngestionHubProps> = ({
  onRefreshSummary,
  onNavigateToReviewer,
  onNavigateToOperator,
}) => {
  const [activeModal, setActiveModal] = useState<'NONE' | 'CSV_MAPPING' | 'OCR_EXTRACT' | 'CONNECTOR_WIZARD' | 'MANUAL_ENTRY' | 'PASTE_DATA'>('NONE');
  
  // Pipeline Ticker State
  const [pipelineItems] = useState<IngestionPipelineItem[]>([
    {
      id: 'pipe-1',
      name: 'Q3_Mortgage_Batch_v2.csv',
      system: 'Encompass • 250 Records',
      sourceType: 'CSV',
      recordCount: 250,
      status: 'NORMALIZING',
      progress: 68,
      timestamp: '2m ago'
    },
    {
      id: 'pipe-2',
      name: 'scan_ledger_income_0912.pdf',
      system: 'Mobile OCR • 1 Record',
      sourceType: 'OCR',
      recordCount: 1,
      status: 'FLAGGED',
      progress: 100,
      timestamp: '5m ago'
    },
    {
      id: 'pipe-3',
      name: 'API_Sync_Salesforce_Auto',
      system: 'Salesforce API • 1,204 Records',
      sourceType: 'API',
      recordCount: 1204,
      status: 'COMPLETED',
      progress: 100,
      timestamp: '12m ago'
    },
    {
      id: 'pipe-4',
      name: 'Auto_Loan_App_Raw.json',
      system: 'Webhook • 1 Record',
      sourceType: 'CLIPBOARD',
      recordCount: 1,
      status: 'PARSING',
      progress: 25,
      timestamp: 'Just now'
    }
  ]);

  // CSV Upload & Schema Mapping State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [schemaMappings, setSchemaMappings] = useState<SchemaFieldMapping[]>([
    { incomingColumn: 'loan_identifier', targetField: 'loan_id', sampleValue: 'LN-29384-A', confidence: 0.99 },
    { incomingColumn: 'cust_id', targetField: 'borrower_id', sampleValue: 'BW-9012', confidence: 0.95 },
    { incomingColumn: 'orig_date', targetField: 'origination_date', sampleValue: '2022-05-15', confidence: 0.98 },
    { incomingColumn: 'maturity_dt', targetField: 'maturity_date', sampleValue: '2052-05-15', confidence: 0.97 },
    { incomingColumn: 'orig_principal_amt', targetField: 'original_principal', sampleValue: '$450,000', confidence: 0.99 },
    { incomingColumn: 'curr_principal_bal', targetField: 'current_balance', sampleValue: '$432,000', confidence: 0.96 },
    { incomingColumn: 'note_rate', targetField: 'interest_rate', sampleValue: '6.25%', confidence: 0.98 },
    { incomingColumn: 'loan_term_m', targetField: 'term_months', sampleValue: '360', confidence: 0.99 },
    { incomingColumn: 'borrower_state_cd', targetField: 'borrower_state', sampleValue: 'CA', confidence: 0.94 },
    { incomingColumn: 'pay_status', targetField: 'payment_status', sampleValue: 'CURRENT', confidence: 0.99 }
  ]);
  const [templateName] = useState<string>('Encompass Standard Loan Tape Template');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [undoSeconds, setUndoSeconds] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // OCR Extraction State
  const [ocrFields, setOcrFields] = useState<OcrExtractedField[]>([
    { fieldName: 'loan_id', label: 'Loan Reference ID', extractedValue: 'LN-90882-C', confidence: 0.98, isConfirmed: true, pageNumber: 1 },
    { fieldName: 'borrower_name', label: 'Borrower Name', extractedValue: 'Eleanor Vance', confidence: 0.96, isConfirmed: true, pageNumber: 1 },
    { fieldName: 'principal_amount', label: 'Original Principal', extractedValue: '$345,000.00', confidence: 0.99, isConfirmed: true, pageNumber: 1 },
    { fieldName: 'interest_rate', label: 'Annual Note Rate', extractedValue: '5.875%', confidence: 0.94, isConfirmed: true, pageNumber: 1 },
    { fieldName: 'origination_date', label: 'Origination Date', extractedValue: '2023-03-15', confidence: 0.98, isConfirmed: true, pageNumber: 1 },
    { fieldName: 'maturity_date', label: 'Maturity Date', extractedValue: '2053-03-15', confidence: 0.64, isConfirmed: false, pageNumber: 1 },
    { fieldName: 'property_state', label: 'Collateral State', extractedValue: 'TX', confidence: 0.99, isConfirmed: true, pageNumber: 1 }
  ]);
  const [ocrActivePage, setOcrActivePage] = useState<number>(1);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    loan_id: 'LN-50012-M',
    borrower_id: 'BW-7741',
    original_principal: 420000,
    current_balance: 412000,
    interest_rate: 6.5,
    term_months: 360,
    origination_date: '2023-01-15',
    maturity_date: '2053-01-15',
    borrower_state: 'FL',
    payment_status: 'CURRENT',
    days_past_due: 0
  });

  // Paste Data State
  const [pastedText, setPastedText] = useState<string>(
`loan_id\tborrower_id\torigination_date\tmaturity_date\tprincipal\tbalance\trate\tterm\tstate\tstatus
LN-1001\tBW-4412\t2023-01-10\t2053-01-10\t320000\t315000\t6.25\t360\tTX\tCURRENT
LN-1002\tBW-8821\t2021-08-01\t2036-08-01\t580000\t558200\t5.75\t180\tFL\tCURRENT`
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal !== 'NONE') {
        setActiveModal('NONE');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setActiveModal('CSV_MAPPING');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setActiveModal('CSV_MAPPING');
    }
  };

  const handleCommitCsv = async () => {
    setIsCommitting(true);
    try {
      if (selectedFile) {
        await uploadCsvFile(selectedFile, 'LOAN_TAPE', 'Elena Rostova (Operator)');
      }
      setIsCommitting(false);
      setActiveModal('NONE');
      setUndoSeconds(10);
      onRefreshSummary();

      const interval = setInterval(() => {
        setUndoSeconds((prev) => {
          if (prev && prev > 1) return prev - 1;
          clearInterval(interval);
          return null;
        });
      }, 1000);
    } catch {
      setIsCommitting(false);
      setActiveModal('NONE');
    }
  };

  return (
    <div className="w-full bg-[#f8f9fc] text-slate-900 min-h-[calc(100vh-80px)] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">

        {/* Undo Toast Notification */}
        {undoSeconds !== null && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
            <div className="flex items-center space-x-3 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Batch imported successfully! 250 records routed to validation engine.
              </span>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <button 
                onClick={() => setUndoSeconds(null)}
                className="px-3 py-1 rounded bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-mono flex items-center gap-1 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Import ({undoSeconds}s)</span>
              </button>
              <button 
                onClick={onNavigateToReviewer}
                className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-bold font-mono transition-all hover:bg-emerald-700 shadow-sm"
              >
                Open Exceptions →
              </button>
            </div>
          </div>
        )}

        {/* 1. Active Intake Live Pipeline Ticker */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-700 font-bold truncate">
                Active Intake Stream Pipeline
              </span>
            </div>
            <button 
              onClick={onNavigateToOperator}
              className="text-xs font-mono text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 shrink-0"
            >
              <span>View Batch Lineage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pipelineItems.map((item) => {
              const isFlagged = item.status === 'FLAGGED';
              const isCompleted = item.status === 'COMPLETED';
              return (
                <div 
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div className="truncate pr-2">
                      <div className="text-xs font-mono font-bold text-slate-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] font-sans text-slate-500 truncate">
                        {item.system}
                      </div>
                    </div>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : isFlagged ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase">
                      <span>{item.status}...</span>
                      <span className="font-bold text-slate-800">{item.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFlagged ? 'bg-amber-500' : isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Main Ingestion Hub Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-200">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-slate-500 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <span>MULTI-MODAL INGESTION HUB • MODULE A</span>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              Ingestion Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-sans max-w-2xl leading-relaxed">
              One hub, multiple doors, zero dead ends. Choose any ingestion channel below to ingest raw loan data with automated schema mapping, OCR extraction, and deterministic validation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onNavigateToOperator}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-mono text-slate-800 font-bold transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Import History</span>
            </button>
          </div>
        </div>

        {/* 3. 5 Multi-Modal Ingestion Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Method 1: Bulk CSV / Spreadsheet Upload */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="lg:col-span-2 lg:row-span-2 p-8 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 transition-all shadow-sm flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 font-sans">
                      Bulk Spreadsheet &amp; Tape Upload
                    </h3>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase font-bold">
                      Primary Channel
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    CSV, XLSX, XML, or Pipe-Delimited Loan Tapes (Supports up to 500MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Drag & Drop Target */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-h-[220px] border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-500 transition-all p-8 flex flex-col items-center justify-center text-center cursor-pointer group/zone"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileInputChange} 
                accept=".csv,.xlsx,.xls,.json,.txt" 
                className="hidden" 
              />
              <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover/zone:text-blue-600 group-hover/zone:scale-110 transition-all mb-4 shadow-sm">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 font-sans">
                Drag and drop loan tape here, or click to browse
              </h4>
              <p className="text-xs text-slate-500 font-sans mt-1 max-w-sm">
                Automatic column matching with header similarity, live 20-row pre-validation preview, and reusable schema templates.
              </p>
              <div className="mt-4 px-5 py-2 rounded-xl bg-[#0b1c30] text-white text-xs font-bold font-mono uppercase hover:bg-slate-800 transition-all shadow-md">
                Browse Files
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-600 gap-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" /> Auto-Schema Matcher
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" /> Duplicate ID Warning
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" /> 10s Graceful Undo
              </span>
            </div>
          </div>

          {/* Method 2: Document Scan / Photo (OCR) */}
          <div 
            onClick={() => setActiveModal('OCR_EXTRACT')}
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 transition-all shadow-sm flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <ScanLine className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Vision AI
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Document Scan / Photo (OCR)
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Upload scanned physical ledgers, W-2s, promissory notes, or photos from mobile/tablet.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
              <span>Launch OCR Inspector</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Method 3: Connect a System (Live API / Webhook Feed) */}
          <div 
            onClick={() => setActiveModal('CONNECTOR_WIZARD')}
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 transition-all shadow-sm flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Network className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  Live Feed
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Connect Live System / API
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Establish direct automated sync with Encompass, Salesforce, Plaid, or SFTP feeds.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
              <span>Configure Pipeline</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Method 4: Quick Manual Entry */}
          <div 
            onClick={() => setActiveModal('MANUAL_ENTRY')}
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 transition-all shadow-sm flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Edit3 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                  Single Loan
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Quick Manual Entry
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">
                One-off record creation with live 14-rule constraint validation evaluated as you type.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
              <span>Open Form</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Method 5: Paste Raw Data from Clipboard */}
          <div 
            onClick={() => setActiveModal('PASTE_DATA')}
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 transition-all shadow-sm flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <ClipboardPaste className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-bold">
                  Clipboard
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 font-sans">
                Paste Raw Data
              </h3>
              <p className="text-xs text-slate-500 font-sans mt-1">
                Paste directly from Excel or Google Sheets. Delimiter detection automatically formats rows.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
              <span>Paste Clipboard</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

        </div>

        {/* 4. Horizontal Pipeline Visualizer */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-700 font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              Automated Intake &amp; Validation Pipeline Architecture
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Deterministic 14-Rule Engine
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-mono text-blue-600 font-bold uppercase">Stage 01</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Uploaded</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">250 Rows</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-mono text-blue-600 font-bold uppercase">Stage 02</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Parsed &amp; Mapped</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">10 Columns</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-mono text-blue-600 font-bold uppercase">Stage 03</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Normalized</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">Types Casted</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <div className="text-[10px] font-mono text-emerald-700 font-bold uppercase">Stage 04</div>
              <div className="text-xs font-bold text-emerald-900 mt-1">Validated</div>
              <div className="text-[11px] font-mono text-emerald-700 mt-1">232 Clean</div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <div className="text-[10px] font-mono text-amber-700 font-bold uppercase">Stage 05</div>
              <div className="text-xs font-bold text-amber-900 mt-1">Exceptions Routed</div>
              <div className="text-[11px] font-mono text-amber-700 mt-1">14 Flagged</div>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: CSV Schema Mapping */}
      {activeModal === 'CSV_MAPPING' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden">
            
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-sans">
                    Schema Mapping &amp; Pre-Validation: {selectedFile?.name || 'loan_tape.csv'}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Map incoming column headers to VeriLoan standard loan schema.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('NONE')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs font-mono gap-3">
              <div className="flex items-center space-x-4">
                <span className="text-slate-900 font-bold">250 Rows Detected</span>
                <span className="text-emerald-600 font-bold">232 Clean (92.8%)</span>
                <span className="text-amber-600 font-bold">14 Will Need Review</span>
                <span className="text-rose-600 font-bold">4 Critical Anomalies</span>
              </div>
              <div className="text-slate-500 text-[11px]">
                Template: <span className="text-blue-700 font-bold">{templateName}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="pb-2">Incoming File Column</th>
                    <th className="pb-2">Sample Raw Value</th>
                    <th className="pb-2">VeriLoan Standard Field</th>
                    <th className="pb-2">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schemaMappings.map((mapping, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 font-bold text-slate-900">{mapping.incomingColumn}</td>
                      <td className="py-2.5 text-slate-500">{mapping.sampleValue}</td>
                      <td className="py-2.5">
                        <select 
                          value={mapping.targetField}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSchemaMappings(prev => prev.map((m, i) => i === idx ? { ...m, targetField: val } : m));
                          }}
                          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-blue-700 font-bold focus:outline-none focus:border-blue-500"
                        >
                          <option value="loan_id">loan_id</option>
                          <option value="borrower_id">borrower_id</option>
                          <option value="origination_date">origination_date</option>
                          <option value="maturity_date">maturity_date</option>
                          <option value="original_principal">original_principal</option>
                          <option value="current_balance">current_balance</option>
                          <option value="interest_rate">interest_rate</option>
                          <option value="term_months">term_months</option>
                          <option value="borrower_state">borrower_state</option>
                          <option value="payment_status">payment_status</option>
                        </select>
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {Math.round(mapping.confidence * 100)}% Match
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Lineage &amp; Source File Hash Preserved Automatically</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveModal('NONE')}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={isCommitting}
                  onClick={handleCommitCsv}
                  className="px-6 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting Batch...</span>
                    </>
                  ) : (
                    <>
                      <span>Commit &amp; Run Engine</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: OCR Document Extraction */}
      {activeModal === 'OCR_EXTRACT' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden">
            
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <ScanLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-sans">
                    Document OCR &amp; Human-Confirmed Extraction
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Scanned Promissory Note • Model: Gemini 1.5 Pro Vision OCR
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('NONE')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <div className="p-6 overflow-y-auto bg-slate-50 flex flex-col justify-between space-y-4">
                <div className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 font-mono text-xs text-slate-700 shadow-sm">
                  <div className="flex justify-between border-b border-slate-100 pb-2 text-[10px] text-slate-500 uppercase">
                    <span>Document: PROMISSORY_NOTE_VANCE.PDF</span>
                    <span>Page {ocrActivePage} of 3</span>
                  </div>
                  <div className="space-y-2 leading-relaxed text-[11px]">
                    <p className="font-bold text-slate-900">FIXED RATE NOTE — UNIFORM INSTRUMENT</p>
                    <p>BORROWER: <span className="bg-blue-100 px-1 text-blue-900 font-bold">Eleanor Vance</span></p>
                    <p>LOAN IDENTIFIER: <span className="bg-blue-100 px-1 text-blue-900 font-bold">LN-90882-C</span></p>
                    <p>PRINCIPAL AMOUNT: <span className="bg-blue-100 px-1 text-blue-900 font-bold">$345,000.00</span></p>
                    <p>INTEREST RATE: <span className="bg-blue-100 px-1 text-blue-900 font-bold">5.875%</span> per annum</p>
                    <p>ORIGINATION DATE: <span className="bg-blue-100 px-1 text-blue-900 font-bold">March 15, 2023</span></p>
                    <p>MATURITY DATE: <span className="bg-amber-100 px-1 text-amber-900 font-bold">March 15, 2053</span> (Handwritten annotation)</p>
                    <p>PROPERTY STATE: <span className="bg-blue-100 px-1 text-blue-900 font-bold">TX</span></p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                  <span>Multi-Page Document Carousel:</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setOcrActivePage(1)} 
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${ocrActivePage === 1 ? 'bg-[#0b1c30] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'}`}
                    >
                      P1 (Note)
                    </button>
                    <button 
                      onClick={() => setOcrActivePage(2)} 
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${ocrActivePage === 2 ? 'bg-[#0b1c30] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'}`}
                    >
                      P2 (W-2)
                    </button>
                    <button 
                      onClick={() => setOcrActivePage(3)} 
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${ocrActivePage === 3 ? 'bg-[#0b1c30] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'}`}
                    >
                      P3 (Appraisal)
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 bg-white">
                <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2 font-bold">
                  Extracted Fields (Confirm / Edit Inline):
                </div>

                {ocrFields.map((field, idx) => {
                  const isLowConf = field.confidence < 0.8;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-800 font-bold">{field.label}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isLowConf ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {Math.round(field.confidence * 100)}% Confidence
                        </span>
                      </div>
                      <input 
                        type="text" 
                        value={field.extractedValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOcrFields(prev => prev.map((f, i) => i === idx ? { ...f, extractedValue: val, isConfirmed: true } : f));
                        }}
                        className={`w-full bg-slate-50 border rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none ${
                          isLowConf ? 'border-amber-500 ring-1 ring-amber-400 bg-amber-50/50' : 'border-slate-300 focus:border-blue-600 bg-white'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-600 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero Silent Write: Human confirmation required for all OCR extractions</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveModal('NONE')}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setActiveModal('NONE');
                    setUndoSeconds(10);
                    onRefreshSummary();
                  }}
                  className="px-6 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Ingest Record</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Connector Wizard */}
      {activeModal === 'CONNECTOR_WIZARD' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-sans">
                    Setup Live Feed Connector
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Direct automated sync from loan origination or servicing feeds.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('NONE')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Connector Provider</label>
                <select className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900">
                  <option>Encompass (ICE Mortgage Tech REST API)</option>
                  <option>Salesforce Financial Services Cloud Webhook</option>
                  <option>Plaid Income &amp; Asset Verification</option>
                  <option>Black Knight SFTP Daily Batch</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Endpoint URL / Webhook Receiver</label>
                <input 
                  type="text" 
                  defaultValue="https://api.ice.com/encompass/v1/loans/export" 
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">API Key / Secret Token</label>
                <input 
                  type="password" 
                  defaultValue="enc_live_sec_9941a87b6" 
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Sample Live Payload:</span>
                  <span className="text-emerald-700 font-bold">200 OK • 12ms</span>
                </div>
                <pre className="text-[10px] text-slate-800 bg-white p-3 rounded border border-slate-200 overflow-x-auto">
{`{
  "loan_id": "LN-ENCOMPASS-881",
  "borrower": "Marcus Rivera",
  "balance": 412000,
  "rate": 6.25,
  "status": "APPROVED"
}`}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setActiveModal('NONE')}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setActiveModal('NONE');
                  onRefreshSummary();
                }}
                className="px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95"
              >
                Save &amp; Activate Feed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Manual Entry */}
      {activeModal === 'MANUAL_ENTRY' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-sans">
                    Manual Single-Loan Entry
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Live constraint validation evaluates as you type.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('NONE')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Loan Identifier</label>
                <input 
                  type="text" 
                  value={manualForm.loan_id}
                  onChange={(e) => setManualForm({ ...manualForm, loan_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Borrower ID</label>
                <input 
                  type="text" 
                  value={manualForm.borrower_id}
                  onChange={(e) => setManualForm({ ...manualForm, borrower_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Original Principal ($)</label>
                <input 
                  type="number" 
                  value={manualForm.original_principal}
                  onChange={(e) => setManualForm({ ...manualForm, original_principal: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Interest Rate (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={manualForm.interest_rate}
                  onChange={(e) => setManualForm({ ...manualForm, interest_rate: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Origination Date</label>
                <input 
                  type="date" 
                  value={manualForm.origination_date}
                  onChange={(e) => setManualForm({ ...manualForm, origination_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Maturity Date</label>
                <input 
                  type="date" 
                  value={manualForm.maturity_date}
                  onChange={(e) => setManualForm({ ...manualForm, maturity_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setActiveModal('NONE')}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setActiveModal('NONE');
                  onRefreshSummary();
                }}
                className="px-6 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95"
              >
                Validate &amp; Ingest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Paste Raw Data */}
      {activeModal === 'PASTE_DATA' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center">
                  <ClipboardPaste className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-sans">
                    Paste Raw Data from Clipboard
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Paste tab-separated or comma-separated records straight from Excel or Google Sheets.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal('NONE')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <textarea 
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                ✓ Tab-delimiter auto-detected (2 rows)
              </span>

              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setActiveModal('NONE')}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setActiveModal('CSV_MAPPING');
                  }}
                  className="px-6 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95"
                >
                  Parse into Schema Mapper →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
