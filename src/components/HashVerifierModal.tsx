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
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchVerifiedLoanDetail(verifiedLoanId);
        setData(res);
      } catch (err) {
        console.error(err);
        setError('Could not load hash verification data. Please try again.');
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

  const isValid = data?.hash_verification?.is_valid === true;
  const hasVerificationData = !!data?.hash_verification;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-2xl bg-[#090e1a] p-6 sm:p-8 space-y-6 border border-slate-800 shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Cryptographic Hash Verification</h3>
              <p className="text-xs font-mono text-slate-400">Loan ID: {verifiedLoanId}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> Verifying SHA-256 canonical hash integrity...
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-400 font-mono text-xs">{error}</div>
        ) : data && hasVerificationData ? (
          <div className="space-y-4">
            
            {/* Status Badge */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isValid
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/40 border-red-500/50 text-red-300'
            }`}>
              <div className="flex items-center space-x-3">
                {isValid ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <div className="font-bold text-sm font-sans">
                    {isValid ? 'Cryptographic Integrity Verified' : 'Integrity Violation Detected!'}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5 font-sans">
                    {isValid
                      ? 'Live recalculated SHA-256 match confirms zero data tampering.'
                      : 'Calculated hash differs from sealed record! This record may have been altered after verification.'}
                  </div>
                </div>
              </div>
              <span className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded border ${
                isValid
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/30'
              }`}>
                {isValid ? 'Valid' : 'Mismatch'}
              </span>
            </div>

            {/* Hash Display */}
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#060913] border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between mb-1">
                  <span>Stored Sealed Record Hash (SHA-256)</span>
                  <button
                    onClick={() => handleCopy(data.hash_verification.stored_hash)}
                    className="flex items-center gap-1 text-slate-300 hover:text-white text-[10px]"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-emerald-400 break-all select-all font-bold">
                  {data.hash_verification.stored_hash}
                </div>
              </div>

              <div className={`p-3 rounded-xl bg-[#060913] border ${isValid ? 'border-slate-800' : 'border-red-500/40'}`}>
                <div className="text-[10px] text-slate-400 uppercase mb-1">
                  Live Recalculated Hash: <code>SHA256(canonical_json(record))</code>
                </div>
                <div className={`break-all select-all ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.hash_verification.recalculated_hash}
                </div>
              </div>
            </div>

            {/* Canonical JSON Payload View */}
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase mb-2">Canonical Serialized Payload</div>
              <pre className="p-4 rounded-xl bg-[#03060c] border border-slate-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto">
                {JSON.stringify(data.verified_record?.canonical_data, null, 2)}
              </pre>
            </div>

          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">Record not found</div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-white text-[#060913] hover:bg-slate-100 text-xs font-bold uppercase tracking-wider"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};