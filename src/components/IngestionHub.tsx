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
  Sparkles, 
  X, 
  ShieldCheck, 
  Zap,
  Database,
  CheckCheck
} from 'lucide-react';
import type { IngestionPipelineItem, SchemaFieldMapping, OcrExtractedField } from '../types';
import { uploadCsvFile } from '../lib/api';
import { PRELOADED_DATASETS, type PreloadedTapeMeta } from '../sample/sampleTapes';

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
  const [activeModal, setActiveModal] = useState<'NONE' | 'CSV_MAPPING' | 'OCR_EXTRACT' | 'CONNECTOR_WIZARD' | 'MANUAL_ENTRY' | 'PASTE_DATA' | 'RESULT_MODAL'>('NONE');
  
  // Tab for CSV Ingestion Modal (Preloaded Sample vs Custom Upload)
  const [csvIntakeTab, setCsvIntakeTab] = useState<'PRELOADED' | 'CUSTOM_FILE'>('PRELOADED');
  const [selectedPreloaded, setSelectedPreloaded] = useState<PreloadedTapeMeta>(PRELOADED_DATASETS[0]);

  // Ingestion Pipeline Ticker State
  const [pipelineItems] = useState<IngestionPipelineItem[]>([
    {
      id: 'pipe-1',
      name: 'loan_tape.csv',
      system: 'Fannie/Freddie • 1,200 Records',
      sourceType: 'CSV',
      recordCount: 1200,
      status: 'COMPLETED',
      progress: 100,
      timestamp: 'Active Stream'
    },
    {
      id: 'pipe-2',
      name: 'servicer_update.csv',
      system: 'Beacon / Citadel • 398 Records',
      sourceType: 'API',
      recordCount: 398,
      status: 'COMPLETED',
      progress: 100,
      timestamp: '5m ago'
    },
    {
      id: 'pipe-3',
      name: 'promissory_note_vance.pdf',
      system: 'Mobile Vision OCR • 1 Record',
      sourceType: 'OCR',
      recordCount: 1,
      status: 'FLAGGED',
      progress: 100,
      timestamp: '12m ago'
    },
    {
      id: 'pipe-4',
      name: 'document_manifest.csv',
      system: 'Custodial Vault • 1,194 Records',
      sourceType: 'CSV',
      recordCount: 1194,
      status: 'COMPLETED',
      progress: 100,
      timestamp: '20m ago'
    }
  ]);

  // CSV Upload & Schema Mapping State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string>('LOAN_TAPE');
  const [schemaMappings, setSchemaMappings] = useState<SchemaFieldMapping[]>([
    { incomingColumn: 'loan_id', targetField: 'loan_id', sampleValue: 'LN-10001', confidence: 1.0 },
    { incomingColumn: 'borrower_id', targetField: 'borrower_id', sampleValue: 'BOR-20001', confidence: 0.99 },
    { incomingColumn: 'loan_type', targetField: 'loan_type', sampleValue: 'Conventional_15Y', confidence: 0.98 },
    { incomingColumn: 'origination_date', targetField: 'origination_date', sampleValue: '2023-01-30', confidence: 1.0 },
    { incomingColumn: 'maturity_date', targetField: 'maturity_date', sampleValue: '2037-11-12', confidence: 1.0 },
    { incomingColumn: 'original_principal', targetField: 'original_principal', sampleValue: '$242,520.52', confidence: 1.0 },
    { incomingColumn: 'current_balance', targetField: 'current_balance', sampleValue: '$211,447.88', confidence: 0.99 },
    { incomingColumn: 'interest_rate', targetField: 'interest_rate', sampleValue: '6.985%', confidence: 1.0 },
    { incomingColumn: 'term_months', targetField: 'term_months', sampleValue: '180', confidence: 1.0 },
    { incomingColumn: 'borrower_state', targetField: 'borrower_state', sampleValue: 'MT', confidence: 0.97 },
    { incomingColumn: 'payment_status', targetField: 'payment_status', sampleValue: 'DELINQUENT_60', confidence: 0.99 },
    { incomingColumn: 'days_past_due', targetField: 'days_past_due', sampleValue: '60', confidence: 0.99 }
  ]);

  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [pipelineProgressStage, setPipelineProgressStage] = useState<number>(0);
  const [ingestionResult, setIngestionResult] = useState<{
    batch_id: string;
    filename: string;
    file_type: string;
    total_rows: number;
    valid_rows: number;
    exception_count: number;
    status: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    loan_type: 'Conventional_30Y',
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
`loan_id,borrower_id,loan_type,origination_date,maturity_date,original_principal,current_balance,interest_rate,term_months,borrower_state,payment_status,days_past_due
LN-10001,BOR-20001,Conventional_15Y,2023-01-30,2037-11-12,242520.52,211447.88,6.985,180,MT,DELINQUENT_60,60
LN-10002,BOR-20002,Auto_Loan,2023-01-04,2037-10-17,504919.11,383370.18,4.018,180,ID,CURRENT,0`
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
      setCsvIntakeTab('CUSTOM_FILE');
      setActiveModal('CSV_MAPPING');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setCsvIntakeTab('CUSTOM_FILE');
      setActiveModal('CSV_MAPPING');
    }
  };

  const handleExecuteCsvIngestion = async () => {
    setIsCommitting(true);
    setUploadError(null);
    setPipelineProgressStage(1); // 1: Parsing & Ingesting Stream

    try {
      let fileToUpload: File;
      let targetFileType = selectedFileType;

      if (csvIntakeTab === 'PRELOADED') {
        fileToUpload = new File(
          [selectedPreloaded.csvContent], 
          selectedPreloaded.filename, 
          { type: 'text/csv' }
        );
        targetFileType = selectedPreloaded.fileType;
      } else if (selectedFile) {
        fileToUpload = selectedFile;
      } else {
        fileToUpload = new File(
          [selectedPreloaded.csvContent], 
          selectedPreloaded.filename, 
          { type: 'text/csv' }
        );
        targetFileType = selectedPreloaded.fileType;
      }

      // Progress animation simulation across 3 stages
      setTimeout(() => setPipelineProgressStage(2), 600); // Stage 2: Evaluating 15 Rules
      setTimeout(() => setPipelineProgressStage(3), 1200); // Stage 3: Sealing & Quarantining

      const res = await uploadCsvFile(fileToUpload, targetFileType, 'Elena Rostova (Operator)');
      
      setTimeout(() => {
        setIsCommitting(false);
        setPipelineProgressStage(4);
        setIngestionResult(res);
        setActiveModal('RESULT_MODAL');
        onRefreshSummary();
      }, 1600);

    } catch (err: any) {
      console.error('Ingestion failed:', err);
      setIsCommitting(false);
      setPipelineProgressStage(0);
      setUploadError(err.message || 'CSV ingestion failed. Verify data format.');
    }
  };

  const handleExecutePasteIngestion = async () => {
    setIsCommitting(true);
    setUploadError(null);

    try {
      // Normalize tabs to commas if TSV
      let normalizedCsv = pastedText.trim();
      if (normalizedCsv.includes('\t')) {
        normalizedCsv = normalizedCsv.split('\n').map(line => line.split('\t').join(',')).join('\n');
      }

      const fileToUpload = new File([normalizedCsv], 'pasted_loan_tape.csv', { type: 'text/csv' });
      const res = await uploadCsvFile(fileToUpload, 'LOAN_TAPE', 'Elena Rostova (Operator)');

      setIsCommitting(false);
      setIngestionResult(res);
      setActiveModal('RESULT_MODAL');
      onRefreshSummary();
    } catch (err: any) {
      setIsCommitting(false);
      setUploadError(err.message || 'Pasted data upload failed.');
    }
  };

  const handleExecuteManualIngestion = async () => {
    setIsCommitting(true);
    setUploadError(null);

    try {
      const csvHeader = 'loan_id,borrower_id,loan_type,origination_date,maturity_date,original_principal,current_balance,interest_rate,term_months,borrower_state,payment_status,days_past_due\n';
      const csvRow = `${manualForm.loan_id},${manualForm.borrower_id},${manualForm.loan_type},${manualForm.origination_date},${manualForm.maturity_date},${manualForm.original_principal},${manualForm.current_balance},${manualForm.interest_rate},${manualForm.term_months},${manualForm.borrower_state},${manualForm.payment_status},${manualForm.days_past_due}\n`;
      const fullCsv = csvHeader + csvRow;

      const fileToUpload = new File([fullCsv], `single_${manualForm.loan_id}.csv`, { type: 'text/csv' });
      const res = await uploadCsvFile(fileToUpload, 'LOAN_TAPE', 'Elena Rostova (Operator)');

      setIsCommitting(false);
      setIngestionResult(res);
      setActiveModal('RESULT_MODAL');
      onRefreshSummary();
    } catch (err: any) {
      setIsCommitting(false);
      setUploadError(err.message || 'Manual record ingestion failed.');
    }
  };

  return (
    <div className="w-full bg-[#f8f9fc] text-slate-900 min-h-[calc(100vh-80px)] py-4 sm:py-8 font-sans">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">

        {/* 1. Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 sm:pb-6 border-b border-slate-200">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-slate-500 uppercase flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
              <span>MODULE A • MULTI-MODAL INTAKE &amp; DATA INGESTION</span>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Ingestion Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Ingest messy loan tapes, monthly servicer reconciliations, and document manifests through deterministic schema normalization and real-time rule evaluation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCsvIntakeTab('PRELOADED');
                setActiveModal('CSV_MAPPING');
              }}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload / Ingest Tape</span>
            </button>
            <button
              onClick={onNavigateToOperator}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-mono text-slate-800 font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Batch Lineage</span>
            </button>
          </div>
        </div>

        {/* 2. Active Intake Stream Pipeline Ticker */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-700 font-bold">
                Active Ingestion Pipeline Channels
              </span>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Deterministic 15-Rule Validation Engine
            </span>
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
                      <div className="text-[11px] text-slate-500 truncate">
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
                      <span>{item.status}</span>
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

        {/* 3. 5 Multi-Modal Ingestion Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Method 1: Bulk CSV / Spreadsheet Upload (Primary Functional Hub) */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="lg:col-span-2 lg:row-span-2 p-7 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 transition-all shadow-sm flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">
                      Bulk Loan Tape &amp; Portfolio Ingestion
                    </h3>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase font-bold">
                      Primary Channel
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    1-Click Pre-loaded Financial Datasets or Custom CSV/XLSX Uploads (Up to 500MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Distinct 3 Preloaded Dataset Cards (Fannie Standard, Multi-Source Delta, Document Integrity) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {PRELOADED_DATASETS.map((ds) => {
                const isBlue = ds.badgeColor === 'blue';
                const isAmber = ds.badgeColor === 'amber';
                return (
                  <div 
                    key={ds.id}
                    onClick={() => {
                      setSelectedPreloaded(ds);
                      setSelectedFileType(ds.fileType);
                      setCsvIntakeTab('PRELOADED');
                      setActiveModal('CSV_MAPPING');
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between group/card shadow-xs hover:shadow-md ${
                      isBlue 
                        ? 'bg-gradient-to-br from-blue-50/90 to-indigo-50/60 border-blue-200 hover:border-blue-500 text-slate-900' 
                        : isAmber 
                        ? 'bg-gradient-to-br from-amber-50/90 to-orange-50/60 border-amber-200 hover:border-amber-500 text-slate-900'
                        : 'bg-gradient-to-br from-purple-50/90 to-violet-50/60 border-purple-200 hover:border-purple-500 text-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase shadow-2xs ${
                          isBlue ? 'bg-blue-600 text-white' :
                          isAmber ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'
                        }`}>
                          {ds.badge}
                        </span>
                        <span className={`text-[10px] font-mono font-bold ${
                          isBlue ? 'text-blue-800' : isAmber ? 'text-amber-800' : 'text-purple-800'
                        }`}>
                          {ds.recordCount} rows
                        </span>
                      </div>
                      <div className={`text-xs font-extrabold line-clamp-1 ${
                        isBlue ? 'text-blue-950 group-hover/card:text-blue-700' :
                        isAmber ? 'text-amber-950 group-hover/card:text-amber-700' :
                        'text-purple-950 group-hover/card:text-purple-700'
                      }`}>
                        {ds.name}
                      </div>
                      <div className={`text-[11px] mt-1 line-clamp-2 leading-tight ${
                        isBlue ? 'text-blue-900/70' : isAmber ? 'text-amber-900/70' : 'text-purple-900/70'
                      }`}>
                        {ds.description}
                      </div>
                    </div>
                    <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] font-mono font-bold ${
                      isBlue ? 'border-blue-200 text-blue-700' :
                      isAmber ? 'border-amber-200 text-amber-700' :
                      'border-purple-200 text-purple-700'
                    }`}>
                      <span>1-Click Ingest</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/card:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drag & Drop Target for Custom Files */}
            <div 
              onClick={() => {
                setCsvIntakeTab('CUSTOM_FILE');
                fileInputRef.current?.click();
              }}
              className="flex-1 min-h-[120px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/70 hover:bg-blue-50/40 hover:border-blue-500 transition-all p-4 flex flex-col items-center justify-center text-center cursor-pointer group/zone"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileInputChange} 
                accept=".csv,.xlsx,.xls,.tsv,.txt" 
                className="hidden" 
              />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover/zone:text-blue-600 transition-all shadow-xs">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-slate-900">
                    Or drop a custom loan tape here to inspect &amp; ingest
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Automatic column header matching, 15-rule constraint checking, and cryptographic sealing.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-600 gap-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" /> Auto-Schema Matcher
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" /> Multi-Source Reconciliation
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600" /> Real-Time Rule Engine
              </span>
            </div>
          </div>

          {/* Method 2: Document Scan / Photo (OCR) */}
          <div 
            onClick={() => setActiveModal('OCR_EXTRACT')}
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-purple-500 transition-all shadow-sm flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <ScanLine className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" /> Vision AI Preview
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Document Scan / Photo (OCR)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Inspect scanned promissory notes, deeds, and W-2s with bounding boxes and confidence scores.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-purple-700 font-bold group-hover:translate-x-1 transition-transform">
              <span>Launch OCR Simulator</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Method 3: Connect a System (Live API / Webhook Feed) */}
          <div 
            onClick={() => setActiveModal('CONNECTOR_WIZARD')}
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 transition-all shadow-sm flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Network className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  Live Feed Simulator
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Connect Live System / API
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Direct automated sync simulator for Encompass, Salesforce FSC, Plaid, and Black Knight SFTP.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-emerald-700 font-bold group-hover:translate-x-1 transition-transform">
              <span>Configure Pipeline</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Method 4: Quick Manual Entry */}
          <div 
            onClick={() => setActiveModal('MANUAL_ENTRY')}
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-amber-500 transition-all shadow-sm flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <Edit3 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                  Single Loan Intake
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Quick Manual Entry
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                One-off record creation with live 15-rule constraint validation evaluated and submitted directly to the engine.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-amber-700 font-bold group-hover:translate-x-1 transition-transform">
              <span>Open Form &amp; Submit</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Method 5: Paste Raw Data from Clipboard */}
          <div 
            onClick={() => setActiveModal('PASTE_DATA')}
            className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-cyan-500 transition-all shadow-sm flex flex-col justify-between cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <ClipboardPaste className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-bold">
                  Functional Intake
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Paste Raw Data
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Paste directly from Excel or Google Sheets. Delimiter detection automatically formats rows and triggers validation.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-cyan-700 font-bold group-hover:translate-x-1 transition-transform">
              <span>Paste &amp; Ingest</span>
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
              15 Deterministic Rules + Gemini Copilot
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-mono text-blue-600 font-bold uppercase">Stage 01</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Intake &amp; Ingest</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">Multi-Modal Stream</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-mono text-blue-600 font-bold uppercase">Stage 02</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Parsed &amp; Mapped</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">Schema Normalization</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-mono text-blue-600 font-bold uppercase">Stage 03</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Cross-Reconciled</div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">Tape vs Servicer Delta</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <div className="text-[10px] font-mono text-emerald-700 font-bold uppercase">Stage 04</div>
              <div className="text-xs font-bold text-emerald-900 mt-1">Clean Records Sealed</div>
              <div className="text-[11px] font-mono text-emerald-700 font-bold mt-1">SHA-256 Hashes</div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <div className="text-[10px] font-mono text-amber-700 font-bold uppercase">Stage 05</div>
              <div className="text-xs font-bold text-amber-900 mt-1">Exceptions Quarantined</div>
              <div className="text-[11px] font-mono text-amber-700 font-bold mt-1">Reviewer Triage</div>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: CSV Schema Mapping & Ingestion Dialog */}
      {activeModal === 'CSV_MAPPING' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Tape Ingestion &amp; Schema Validation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select a pre-loaded financial dataset or supply a custom file.
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

            {/* Source Tab Selector */}
            <div className="px-6 pt-4 border-b border-slate-200 bg-slate-50/80 flex items-center gap-3">
              <button
                onClick={() => setCsvIntakeTab('PRELOADED')}
                className={`pb-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
                  csvIntakeTab === 'PRELOADED' 
                    ? 'border-blue-600 text-blue-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>1-Click Preloaded Datasets (3)</span>
              </button>
              <button
                onClick={() => setCsvIntakeTab('CUSTOM_FILE')}
                className={`pb-3 text-xs font-mono font-bold flex items-center gap-2 border-b-2 transition-all ${
                  csvIntakeTab === 'CUSTOM_FILE' 
                    ? 'border-blue-600 text-blue-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Custom File Upload ({selectedFile ? selectedFile.name : 'None'})</span>
              </button>
            </div>

            {/* Preloaded Dataset Selector Cards */}
            {csvIntakeTab === 'PRELOADED' && (
              <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PRELOADED_DATASETS.map((ds) => {
                  const isSelected = selectedPreloaded.id === ds.id;
                  const isBlue = ds.badgeColor === 'blue';
                  const isAmber = ds.badgeColor === 'amber';
                  return (
                    <div
                      key={ds.id}
                      onClick={() => {
                        setSelectedPreloaded(ds);
                        setSelectedFileType(ds.fileType);
                      }}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        isBlue 
                          ? (isSelected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 shadow-xs' : 'border-blue-200 bg-blue-50/40 hover:border-blue-400')
                          : isAmber 
                          ? (isSelected ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/20 shadow-xs' : 'border-amber-200 bg-amber-50/40 hover:border-amber-400')
                          : (isSelected ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-500/20 shadow-xs' : 'border-purple-200 bg-purple-50/40 hover:border-purple-400')
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase shadow-2xs ${
                          isBlue ? 'bg-blue-600 text-white' :
                          isAmber ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'
                        }`}>
                          {ds.badge}
                        </span>
                        {isSelected ? (
                          <CheckCheck className={`w-4 h-4 shrink-0 ${isBlue ? 'text-blue-600' : isAmber ? 'text-amber-600' : 'text-purple-600'}`} />
                        ) : (
                          <span className={`text-[10px] font-mono font-bold ${isBlue ? 'text-blue-700' : isAmber ? 'text-amber-700' : 'text-purple-700'}`}>
                            {ds.recordCount} rows
                          </span>
                        )}
                      </div>
                      <div className={`text-xs font-bold mt-1 line-clamp-1 ${isBlue ? 'text-blue-950' : isAmber ? 'text-amber-950' : 'text-purple-950'}`}>
                        {ds.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-1">
                        {ds.filename} • {ds.recordCount} rows
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary Strip */}
            <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between text-xs font-mono gap-3">
              <div className="flex items-center space-x-3">
                <span className="text-slate-900 font-bold">
                  Target: {csvIntakeTab === 'PRELOADED' ? selectedPreloaded.filename : selectedFile?.name || 'Custom File'}
                </span>
                <span className="text-blue-600 font-bold">
                  {csvIntakeTab === 'PRELOADED' ? `${selectedPreloaded.recordCount} Records` : 'Custom File Stream'}
                </span>
                <span className="text-amber-600 font-bold">
                  {csvIntakeTab === 'PRELOADED' ? `~${selectedPreloaded.expectedAnomalies} Known Anomalies` : 'Auto-Validation'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">File Type:</span>
                <select
                  value={selectedFileType}
                  onChange={(e) => setSelectedFileType(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 font-bold"
                >
                  <option value="LOAN_TAPE">LOAN_TAPE</option>
                  <option value="SERVICER_UPDATE">SERVICER_UPDATE</option>
                  <option value="DOC_MANIFEST">DOC_MANIFEST</option>
                </select>
              </div>
            </div>

            {/* Schema Mapping Table */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">
                Schema Field Mapping (12 Key Attributes):
              </div>
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <th className="pb-2">Incoming File Column</th>
                    <th className="pb-2">Sample Value</th>
                    <th className="pb-2">Target Canonical Field</th>
                    <th className="pb-2">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schemaMappings.map((mapping, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 font-bold text-slate-900">{mapping.incomingColumn}</td>
                      <td className="py-2 text-slate-500">{mapping.sampleValue}</td>
                      <td className="py-2">
                        <select 
                          value={mapping.targetField}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSchemaMappings(prev => prev.map((m, i) => i === idx ? { ...m, targetField: val } : m));
                          }}
                          className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-blue-700 font-bold focus:outline-none focus:border-blue-500"
                        >
                          <option value="loan_id">loan_id</option>
                          <option value="borrower_id">borrower_id</option>
                          <option value="loan_type">loan_type</option>
                          <option value="origination_date">origination_date</option>
                          <option value="maturity_date">maturity_date</option>
                          <option value="original_principal">original_principal</option>
                          <option value="current_balance">current_balance</option>
                          <option value="interest_rate">interest_rate</option>
                          <option value="term_months">term_months</option>
                          <option value="borrower_state">borrower_state</option>
                          <option value="payment_status">payment_status</option>
                          <option value="days_past_due">days_past_due</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {Math.round(mapping.confidence * 100)}% Match
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ingestion Progress Overlay if Committing */}
            {isCommitting && (
              <div className="p-4 bg-blue-50 border-t border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-blue-900 font-bold">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>
                      {pipelineProgressStage === 1 && 'Stage 1/3: Reading CSV stream & normalizing headers...'}
                      {pipelineProgressStage === 2 && 'Stage 2/3: Evaluating 15 deterministic FinTech rules...'}
                      {pipelineProgressStage === 3 && 'Stage 3/3: Auto-sealing clean records & logging audit events...'}
                    </span>
                  </div>
                  <span>{pipelineProgressStage * 33}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500 rounded-full"
                    style={{ width: `${pipelineProgressStage * 33}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Deterministic SHA-256 Batch Sealing</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveModal('NONE')}
                  disabled={isCommitting}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={isCommitting}
                  onClick={handleExecuteCsvIngestion}
                  className="px-6 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Execute Ingestion Pipeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Real Ingestion Result Drawer / Modal */}
      {activeModal === 'RESULT_MODAL' && ingestionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 p-6 sm:p-8 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Ingestion Pipeline Completed Successfully!
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Batch Reference: {ingestionResult.batch_id} • File: {ingestionResult.filename}
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

            {/* Real Server Metrics Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] font-mono uppercase text-slate-500 font-bold">Total Ingested</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                  {ingestionResult.total_rows.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Records Parsed</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-[10px] font-mono uppercase text-emerald-700 font-bold">Clean &amp; Sealed</div>
                <div className="text-2xl font-extrabold text-emerald-700 mt-1 font-mono">
                  {ingestionResult.valid_rows.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5 font-bold">
                  {ingestionResult.total_rows > 0 ? `${((ingestionResult.valid_rows / ingestionResult.total_rows) * 100).toFixed(1)}%` : '0%'} Clean
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <div className="text-[10px] font-mono uppercase text-amber-700 font-bold">Flagged Exceptions</div>
                <div className="text-2xl font-extrabold text-amber-700 mt-1 font-mono">
                  {ingestionResult.exception_count.toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-600 mt-0.5 font-bold">Quarantined</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Pipeline Status:</span>
                <span className="font-bold text-emerald-700">{ingestionResult.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Validation Mode:</span>
                <span className="font-bold text-slate-900">15 Dynamic FinTech Rules + VAL-106</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cryptographic Integrity:</span>
                <span className="font-bold text-slate-900">SHA-256 Record Hashes Verified</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setActiveModal('NONE')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
              >
                Close &amp; Stay on Hub
              </button>
              <button
                onClick={() => {
                  setActiveModal('NONE');
                  onNavigateToOperator();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-mono font-bold"
              >
                View Batch Lineage
              </button>
              {ingestionResult.exception_count > 0 && (
                <button
                  onClick={() => {
                    setActiveModal('NONE');
                    onNavigateToReviewer();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>Triage {ingestionResult.exception_count} Exceptions ➔</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: OCR Document Extraction (Transparent Simulation Preview) */}
      {activeModal === 'OCR_EXTRACT' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 overflow-hidden">
            
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
                  <ScanLine className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Document OCR &amp; Human-Confirmed Extraction
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                      Interactive Simulation Preview
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Scanned Promissory Note • Model: Gemini Vision OCR (98.4% Average Confidence)
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
                  <div className="flex justify-between border-b border-slate-100 pb-2 text-[10px] text-slate-500 uppercase font-bold">
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
                  <span>Document Carousel:</span>
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
                  Close Preview
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: Connector Wizard (Transparent Simulation Preview) */}
      {activeModal === 'CONNECTOR_WIZARD' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Live Feed Connector Pipeline
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      Connector Preview
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Direct automated sync architecture for Encompass, Salesforce, and Plaid.
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
                  <option>Black Knight MSP SFTP Daily Feed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 uppercase font-bold mb-1">Endpoint Receiver URL</label>
                <input 
                  type="text" 
                  defaultValue="https://api.ice.com/encompass/v1/loans/export" 
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Sample Connector Telemetry:</span>
                  <span className="text-emerald-700 font-bold">200 OK • 12ms Latency</span>
                </div>
                <pre className="text-[10px] text-slate-800 bg-white p-3 rounded border border-slate-200 overflow-x-auto">
{`{
  "status": "HEALTHY",
  "synced_batches": 14,
  "last_heartbeat": "2026-08-31T10:30:00Z",
  "active_feed": "ENCOMPASS_PRIMARY_POOL"
}`}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setActiveModal('NONE')}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Quick Manual Entry (Functional Single Loan Submission) */}
      {activeModal === 'MANUAL_ENTRY' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Manual Single-Loan Creation &amp; Ingestion
                  </h3>
                  <p className="text-xs text-slate-500">
                    Submit a loan directly to the 15-rule validation engine.
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
                <label className="block text-slate-700 uppercase font-bold mb-1">Current Balance ($)</label>
                <input 
                  type="number" 
                  value={manualForm.current_balance}
                  onChange={(e) => setManualForm({ ...manualForm, current_balance: Number(e.target.value) })}
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

            {uploadError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
                {uploadError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setActiveModal('NONE')}
                disabled={isCommitting}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button 
                disabled={isCommitting}
                onClick={handleExecuteManualIngestion}
                className="px-6 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isCommitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Validate &amp; Ingest Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Paste Raw Data from Clipboard (Functional Ingestion) */}
      {activeModal === 'PASTE_DATA' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl text-slate-900 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center">
                  <ClipboardPaste className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Paste Raw Data from Clipboard
                  </h3>
                  <p className="text-xs text-slate-500">
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
                placeholder="Paste CSV or TSV contents here..."
              />
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
                {uploadError}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                ✓ Ready for Ingestion ({pastedText.trim().split('\n').length - 1} data rows detected)
              </span>

              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setActiveModal('NONE')}
                  disabled={isCommitting}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-mono text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button 
                  disabled={isCommitting}
                  onClick={handleExecutePasteIngestion}
                  className="px-6 py-2 rounded-xl bg-[#0b1c30] text-white hover:bg-slate-800 font-bold text-xs font-mono uppercase tracking-wider shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isCommitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                  <span>Ingest &amp; Validate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
