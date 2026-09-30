import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import type { UserRole, User } from '../types';

export interface JwtToastData {
  previousRole?: UserRole;
  newRole: UserRole;
  previousUser?: User | null;
  newUser: User;
  token: string;
  timestamp: string;
  reason?: string;
  permissions?: string[];
}

interface JwtRotationToastProps {
  toastData: JwtToastData | null;
  onClose: () => void;
  durationMs?: number;
}

export const ROLE_PERMISSIONS_MAP: Record<UserRole, { title: string; clearance: string; scopes: string[] }> = {
  OPERATOR: {
    title: 'Data Operator',
    clearance: 'Clearance L1 (Intake & Pipeline Execution)',
    scopes: ['tape:ingest', 'batch:create', 'pipeline:trigger', 'lineage:read'],
  },
  REVIEWER: {
    title: 'Senior Reviewer',
    clearance: 'Clearance L2 (Diligence & Exception Remediation)',
    scopes: ['exceptions:read', 'exceptions:resolve', 'copilot:explain', 'loan:override', 'record:seal'],
  },
  CONSUMER: {
    title: 'Data Consumer',
    clearance: 'Clearance L3 (Verified Records & Cryptographic Audit)',
    scopes: ['verified:read', 'tamper:verify', 'export:csv', 'audit:inspect'],
  },
  ADMIN: {
    title: 'System Admin',
    clearance: 'Clearance L4 (Full Governance & Security Infrastructure)',
    scopes: ['system:telemetry', 'rules:configure', 'users:manage', 'audit:full', 'api:developer'],
  },
};

export const JwtRotationToast: React.FC<JwtRotationToastProps> = ({
  toastData,
  onClose,
  durationMs = 1200,
}) => {
  const [progress, setProgress] = useState(100);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!toastData) return;

    setProgress(100);
    const intervalTime = 30;
    const step = (intervalTime / durationMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onCloseRef.current();
          return 0;
        }
        return Math.max(0, prev - step);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [toastData, durationMs]);

  if (!toastData) return null;

  return (
    <div 
      className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-[92vw] sm:max-w-sm w-full animate-slide-in-right pointer-events-auto"
      role="status"
      aria-live="polite"
    >
      <div className="relative rounded-xl bg-[#0f1713]/95 border border-emerald-800/50 shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-xl text-slate-200 overflow-hidden font-sans">
        
        {/* Compact Content */}
        <div className="flex items-center justify-between px-3.5 py-2.5 gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* Muted Sage Green Shield Badge */}
            <div className="w-6 h-6 rounded-md bg-emerald-950/70 border border-emerald-800/50 flex items-center justify-center text-emerald-500/80 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                <span>JWT Rotated:</span>
                <span className="text-emerald-400/80 font-mono font-medium">{toastData.newRole}</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate font-mono">
                Token updated for {toastData.newUser.full_name}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Muted Quick Progress Line */}
        <div className="h-0.5 w-full bg-slate-800/40 overflow-hidden">
          <div 
            className="h-full bg-emerald-700/50 transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

      </div>
    </div>
  );
};
