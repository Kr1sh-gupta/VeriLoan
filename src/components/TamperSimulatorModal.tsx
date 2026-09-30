import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  X, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  Zap,
  ChevronDown
} from 'lucide-react';
import { simulateTamperVerifiedLoan, restoreTamperedVerifiedLoan } from '../lib/api';
import type { VerifiedLoan } from '../types';

interface TamperSimulatorModalProps {
  initialLoan: VerifiedLoan;
  availableLoans?: VerifiedLoan[];
  onClose: () => void;
  onLoanMutated?: (updatedLoan: VerifiedLoan) => void;
}

export const TamperSimulatorModal: React.FC<TamperSimulatorModalProps> = ({
  initialLoan,
  availableLoans = [],
  onClose,
  onLoanMutated,
}) => {
  // Currently selected loan
  const [selectedLoanId, setSelectedLoanId] = useState<string>(initialLoan.loan_id);
  
  const currentLoan = useMemo(() => {
    return availableLoans.find(l => l.loan_id === selectedLoanId) || initialLoan;
  }, [availableLoans, selectedLoanId, initialLoan]);

  // Form field states
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [borrowerId, setBorrowerId] = useState<string>('');
  const [daysPastDue, setDaysPastDue] = useState<number>(0);
  const [borrowerState, setBorrowerState] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('CURRENT');

  // Loading and status feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isReverting, setIsReverting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync form fields when currentLoan changes
  useEffect(() => {
    const canon = currentLoan.canonical_data || {};
    setCurrentBalance(Number(canon.current_balance ?? 0));
    setInterestRate(Number(canon.interest_rate ?? 0));
    setBorrowerId(String(canon.borrower_id ?? ''));
    setDaysPastDue(Number(canon.days_past_due ?? 0));
    setBorrowerState(String(canon.borrower_state ?? ''));
    setPaymentStatus(String(canon.payment_status ?? 'CURRENT'));
    setStatusMessage(null);
  }, [currentLoan]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Check if any fields differ from the current authentic record
  const originalData = currentLoan.canonical_data || {};
  const isBalanceModified = currentBalance !== Number(originalData.current_balance ?? 0);
  const isRateModified = interestRate !== Number(originalData.interest_rate ?? 0);
  const isBorrowerModified = borrowerId !== String(originalData.borrower_id ?? '');
  const isDpdModified = daysPastDue !== Number(originalData.days_past_due ?? 0);
  const isStateModified = borrowerState !== String(originalData.borrower_state ?? '');
  const isStatusModified = paymentStatus !== String(originalData.payment_status ?? 'CURRENT');

  const hasModifications = isBalanceModified || isRateModified || isBorrowerModified || isDpdModified || isStateModified || isStatusModified;

  // Quick 1-click tamper shortcuts
  const applyPreset = (preset: 'balance' | 'rate' | 'dpd' | 'borrower') => {
    setStatusMessage(null);
    if (preset === 'balance') {
      setCurrentBalance(prev => Math.round(prev + 50000));
    } else if (preset === 'rate') {
      setInterestRate(1.99);
    } else if (preset === 'dpd') {
      setDaysPastDue(90);
      setPaymentStatus('DEFAULT');
    } else if (preset === 'borrower') {
      setBorrowerId(prev => (prev.endsWith('-ALTERED') ? prev : `${prev}-ALTERED`));
    }
  };

  // Reset inputs back to this loan's authentic values
  const handleResetInputs = () => {
    const canon = currentLoan.canonical_data || {};
    setCurrentBalance(Number(canon.current_balance ?? 0));
    setInterestRate(Number(canon.interest_rate ?? 0));
    setBorrowerId(String(canon.borrower_id ?? ''));
    setDaysPastDue(Number(canon.days_past_due ?? 0));
    setBorrowerState(String(canon.borrower_state ?? ''));
    setPaymentStatus(String(canon.payment_status ?? 'CURRENT'));
    setStatusMessage(null);
  };

  // Submit Tamper: writes to backend database so Verify Hash detects the mismatch
  const handleApplyTamper = async () => {
    try {
      setIsSubmitting(true);
      setStatusMessage(null);

      const tamperedFields: Record<string, any> = {
        current_balance: currentBalance,
        interest_rate: interestRate,
        borrower_id: borrowerId,
        days_past_due: daysPastDue,
        borrower_state: borrowerState,
        payment_status: paymentStatus,
      };

      const res = await simulateTamperVerifiedLoan(currentLoan.loan_id, tamperedFields);
      
      if (res?.verified_record && onLoanMutated) {
        onLoanMutated(res.verified_record);
      }

      setStatusMessage({
        type: 'success',
        text: `Tamper applied to Loan ${currentLoan.loan_id}! Now click "Verify Hash" on this loan in the table to inspect the cryptographic mismatch.`
      });

      // Automatically close modal after brief delay so user can verify in table
      setTimeout(() => {
        onClose();
      }, 1400);

    } catch (err: any) {
      console.error('Failed to apply tamper:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to apply tamper to record.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Revert back to authentic loan values in database
  const handleRevertAuthentic = async () => {
    try {
      setIsReverting(true);
      setStatusMessage(null);

      const res = await restoreTamperedVerifiedLoan(currentLoan.loan_id);
      
      if (res?.verified_record) {
        if (onLoanMutated) onLoanMutated(res.verified_record);
        const canon = res.verified_record.canonical_data || {};
        setCurrentBalance(Number(canon.current_balance ?? 0));
        setInterestRate(Number(canon.interest_rate ?? 0));
        setBorrowerId(String(canon.borrower_id ?? ''));
        setDaysPastDue(Number(canon.days_past_due ?? 0));
        setBorrowerState(String(canon.borrower_state ?? ''));
        setPaymentStatus(String(canon.payment_status ?? 'CURRENT'));
      }

      setStatusMessage({
        type: 'success',
        text: `Loan ${currentLoan.loan_id} successfully reverted to authentic primary data.`
      });
    } catch (err: any) {
      console.error('Failed to revert loan:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to revert record.'
      });
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl rounded-2xl bg-[#0b1222] border border-slate-800 shadow-2xl text-white overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-[#080d19]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-sans">
                Simulate Data Tampering
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Alter verified values to demonstrate cryptographic tamper detection in Verify Hash.
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message Notification */}
        {statusMessage && (
          <div className={`px-6 py-3 text-xs font-mono flex items-center justify-between border-b ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-200'
              : 'bg-rose-950/80 border-rose-800/60 text-rose-200'
          }`}>
            <span className="flex items-center gap-2">
              {statusMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
              {statusMessage.text}
            </span>
            <button onClick={() => setStatusMessage(null)} className="hover:opacity-75 cursor-pointer ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 space-y-5">
          
          {/* 1. Loan Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-slate-300 font-semibold tracking-wider flex items-center justify-between">
              <span>Select Verified Loan to Tamper:</span>
              <span className="text-slate-500 text-[11px] font-normal">
                {availableLoans.length} records available
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full appearance-none bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-white focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
              >
                {availableLoans.map((l) => {
                  const bal = l.canonical_data?.current_balance;
                  const displayBal = bal !== undefined ? `$${Number(bal).toLocaleString()}` : '';
                  return (
                    <option key={l.id} value={l.loan_id}>
                      {l.loan_id} — {l.canonical_data?.borrower_id || 'Borrower'} • {displayBal} • {l.canonical_data?.borrower_state || 'US'}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* 2. Quick Preset Chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Quick Tamper Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('balance')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-[11px] font-mono text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
              >
                +$50k Balance
              </button>
              <button
                type="button"
                onClick={() => applyPreset('rate')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-[11px] font-mono text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
              >
                Set Rate to 1.99%
              </button>
              <button
                type="button"
                onClick={() => applyPreset('dpd')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-[11px] font-mono text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
              >
                Set DPD to 90
              </button>
              <button
                type="button"
                onClick={() => applyPreset('borrower')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-[11px] font-mono text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
              >
                Mutate Borrower ID
              </button>
            </div>
          </div>

          {/* 3. Form Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            
            {/* Balance */}
            <div className={`p-3 rounded-xl bg-slate-900/80 border transition-colors ${
              isBalanceModified ? 'border-amber-500/70 bg-amber-950/20' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Current Balance ($)
                </label>
                {isBalanceModified && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Modified
                  </span>
                )}
              </div>
              <input
                type="number"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Interest Rate */}
            <div className={`p-3 rounded-xl bg-slate-900/80 border transition-colors ${
              isRateModified ? 'border-amber-500/70 bg-amber-950/20' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Interest Rate (%)
                </label>
                {isRateModified && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Modified
                  </span>
                )}
              </div>
              <input
                type="number"
                value={interestRate}
                step="0.05"
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Borrower ID */}
            <div className={`p-3 rounded-xl bg-slate-900/80 border transition-colors ${
              isBorrowerModified ? 'border-amber-500/70 bg-amber-950/20' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Borrower ID
                </label>
                {isBorrowerModified && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Modified
                  </span>
                )}
              </div>
              <input
                type="text"
                value={borrowerId}
                onChange={(e) => setBorrowerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Days Past Due */}
            <div className={`p-3 rounded-xl bg-slate-900/80 border transition-colors ${
              isDpdModified ? 'border-amber-500/70 bg-amber-950/20' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Days Past Due (DPD)
                </label>
                {isDpdModified && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Modified
                  </span>
                )}
              </div>
              <input
                type="number"
                value={daysPastDue}
                min="0"
                onChange={(e) => setDaysPastDue(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* State */}
            <div className={`p-3 rounded-xl bg-slate-900/80 border transition-colors ${
              isStateModified ? 'border-amber-500/70 bg-amber-950/20' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Property State
                </label>
                {isStateModified && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Modified
                  </span>
                )}
              </div>
              <input
                type="text"
                maxLength={2}
                value={borrowerState}
                onChange={(e) => setBorrowerState(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white uppercase focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Payment Status */}
            <div className={`p-3 rounded-xl bg-slate-900/80 border transition-colors ${
              isStatusModified ? 'border-amber-500/70 bg-amber-950/20' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Payment Status
                </label>
                {isStatusModified && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    Modified
                  </span>
                )}
              </div>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="CURRENT">CURRENT</option>
                <option value="30_DAYS_DELINQUENT">30_DAYS_DELINQUENT</option>
                <option value="60_DAYS_DELINQUENT">60_DAYS_DELINQUENT</option>
                <option value="90_PLUS_DELINQUENT">90_PLUS_DELINQUENT</option>
                <option value="DEFAULT">DEFAULT</option>
              </select>
            </div>

          </div>

          {/* 4. Workflow Guidance Note */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
            <span className="text-amber-400 font-bold mt-0.5 shrink-0">💡</span>
            <p className="leading-relaxed">
              Applying changes updates the stored canonical payload without mutating its immutable SHA-256 seal. Once applied, click <strong className="text-blue-400">Verify Hash</strong> on this loan in the table to observe live cryptographic mismatch detection.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#080d19] border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetInputs}
              disabled={!hasModifications}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset fields to original values"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Inputs</span>
            </button>

            {currentLoan.tamper_detected && (
              <button
                type="button"
                onClick={handleRevertAuthentic}
                disabled={isReverting}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Revert to original untampered primary data"
              >
                <span>{isReverting ? 'Reverting...' : 'Revert to Authentic'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApplyTamper}
              disabled={isSubmitting || !hasModifications}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isSubmitting ? 'Applying...' : 'Apply Tamper'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
