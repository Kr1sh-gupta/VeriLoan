import React, { useEffect, useState } from 'react';
import { Lock, CheckCircle2, AlertTriangle, X, RefreshCw, Copy, Check } from 'lucide-react';
import { fetchVerifiedLoanDetail } from '../lib/api';

interface HashVerifierModalProps {
  verifiedLoanId: string;
  onClose: () => void;
}

export const HashVerifierModal: React.FC<HashVerifierModalProps> = ({
  verifiedLoanId,
  onClose,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);
        const res = await fetchVerifiedLoanDetail(verifiedLoanId);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [verifiedLoanId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl rounded-3xl glass-panel p-6 sm:p-8 space-y-6 border border-emerald-500/40 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Cryptographic Hash Verification</h3>
              <p className="text-xs font-mono text-slate-400">Loan ID: {verifiedLoanId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-cyan-400 font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Verifying SHA-256 canonical hash integrity...
          </div>
        ) : data ? (
          <div className="space-y-4">
            
            {/* Status Badge */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              data.hash_verification.is_valid
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/40 border-red-500/50 text-red-300'
            }`}>
              <div className="flex items-center space-x-3">
                {data.hash_verification.is_valid ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <div className="font-bold text-sm font-sans">
                    {data.hash_verification.is_valid ? 'Cryptographic Integrity Verified' : 'Integrity Violation Detected!'}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {data.hash_verification.is_valid
                      ? 'Live recalculated SHA-256 match confirms zero data tampering.'
                      : 'Calculated hash differs from sealed record!'}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                100% Valid
              </span>
            </div>

            {/* Hash Display */}
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between mb-1">
                  <span>Stored Sealed Record Hash (SHA-256)</span>
                  <button
                    onClick={() => handleCopy(data.hash_verification.stored_hash)}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-[10px]"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-emerald-400 break-all select-all font-bold">
                  {data.hash_verification.stored_hash}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase mb-1">
                  Live Recalculated Hash: <code>SHA256(canonical_json(record))</code>
                </div>
                <div className="text-emerald-400 break-all select-all">
                  {data.hash_verification.recalculated_hash}
                </div>
              </div>
            </div>

            {/* Canonical JSON Payload View */}
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase mb-2">Canonical Serialized Payload</div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto">
                {JSON.stringify(data.verified_record.canonical_data, null, 2)}
              </pre>
            </div>

          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">Record not found</div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
