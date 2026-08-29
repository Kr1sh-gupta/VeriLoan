import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User as UserIcon, 
  Key, 
  ArrowRight, 
  X, 
  Sparkles, 
  AlertCircle,
  ShieldCheck,
  Check
} from 'lucide-react';
import type { User, UserRole } from '../types';
import { loginUser, STATIC_USERS } from '../lib/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, token: string) => void;
  initialRole?: UserRole;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialRole = 'REVIEWER',
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [username, setUsername] = useState<string>(() => {
    const found = STATIC_USERS.find(u => u.role === initialRole);
    return found?.username || 'reviewer';
  });
  const [password, setPassword] = useState<string>(() => {
    const found = STATIC_USERS.find(u => u.role === initialRole);
    return found?.password || 'reviewer123';
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRoleSelection = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    const matched = STATIC_USERS.find((u) => u.role === role);
    if (matched) {
      setUsername(matched.username);
      setPassword(matched.password);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await loginUser(username, password);
      onLoginSuccess(res.user, res.token);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const roleChips: { role: UserRole; name: string; title: string; badge: string }[] = [
    { role: 'OPERATOR', name: 'Elena', title: 'Data Operator', badge: 'OP' },
    { role: 'REVIEWER', name: 'Marcus', title: 'Senior Reviewer', badge: 'RV' },
    { role: 'CONSUMER', name: 'Sarah', title: 'Data Consumer', badge: 'DC' },
    { role: 'ADMIN', name: 'Alex', title: 'System Admin', badge: 'AD' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-2xl bg-[#0c1220] border border-slate-800 p-6 sm:p-8 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center shadow-sm">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-sans text-white tracking-tight">
              Sign in to VeriLoan
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Precision Financial Verification &amp; Governance Cockpit
            </p>
          </div>
        </div>

        {/* Quick 1-Click Persona Chips */}
        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span className="flex items-center gap-1 text-slate-300 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Select Persona (1-Click Fill):</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {roleChips.map((chip) => {
              const isSelected = selectedRole === chip.role;
              return (
                <button
                  key={chip.role}
                  type="button"
                  onClick={() => handleRoleSelection(chip.role)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800 border-slate-600 text-white shadow-sm ring-1 ring-slate-600'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="truncate">
                    <div className="text-xs font-bold text-slate-200 truncate">{chip.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{chip.title}</div>
                  </div>
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {chip.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 font-medium">
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator, reviewer, consumer, admin"
                className="w-full bg-[#060913] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white focus:outline-none focus:border-slate-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5 font-medium">
              Password
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#060913] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white focus:outline-none focus:border-slate-600 transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs tracking-wider uppercase transition-all shadow-lg active:scale-95 disabled:opacity-50 font-mono"
            >
              {loading ? (
                <span>AUTHENTICATING...</span>
              ) : (
                <>
                  <span>Sign In as {selectedRole}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-5 text-center text-[11px] text-slate-500 font-sans flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Deterministic RBAC • FastAPI Backend Auth with Offline Fallback</span>
        </div>
      </div>
    </div>
  );
};
