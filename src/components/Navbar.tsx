import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UploadCloud, 
  AlertTriangle, 
  CheckCircle2, 
  Code2, 
  Menu, 
  X, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import type { UserRole } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  dataQualityScore: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  setCurrentRole,
  dataQualityScore,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const roles: { role: UserRole; label: string; name: string; badge: string; color: string }[] = [
    { role: 'OPERATOR', label: 'Data Operator', name: 'Elena Rostova', badge: 'OP', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
    { role: 'REVIEWER', label: 'Reviewer', name: 'Marcus Vance', badge: 'RV', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { role: 'CONSUMER', label: 'Data Consumer', name: 'Sarah Chen', badge: 'DC', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  ];

  const currentRoleInfo = roles.find(r => r.role === currentRole) || roles[0];

  const navItems = [
    { id: 'landing', label: 'Overview', icon: Sparkles },
    { id: 'operator', label: 'Operator Hub', icon: UploadCloud },
    { id: 'reviewer', label: 'Reviewer Workbench', icon: AlertTriangle },
    { id: 'consumer', label: 'Verified Explorer', icon: CheckCircle2 },
    { id: 'api', label: 'API Playground', icon: Code2 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070B14]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Title */}
          <div 
            onClick={() => setCurrentTab('landing')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white font-sans">
                  Intain <span className="text-cyan-400">Copilot</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  FinTech 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Loan Data Verification &amp; Traceability</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Widgets */}
          <div className="hidden sm:flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <span className="text-slate-400">Health:</span>
              <span className="font-mono font-bold text-emerald-400">{dataQualityScore.toFixed(1)}%</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-xs"
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] border ${currentRoleInfo.color}`}>
                  {currentRoleInfo.badge}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-200 leading-tight">{currentRoleInfo.label}</div>
                  <div className="text-[10px] text-slate-400">{currentRoleInfo.name}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel shadow-2xl py-2 z-50 border border-slate-700">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                    Switch Test Persona
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => {
                        setCurrentRole(r.role);
                        setRoleDropdownOpen(false);
                        if (r.role === 'OPERATOR') setCurrentTab('operator');
                        if (r.role === 'REVIEWER') setCurrentTab('reviewer');
                        if (r.role === 'CONSUMER') setCurrentTab('consumer');
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 text-left text-xs hover:bg-slate-800/80 transition-colors ${
                        currentRole === r.role ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] border ${r.color}`}>
                        {r.badge}
                      </div>
                      <div>
                        <div className="font-semibold">{r.label}</div>
                        <div className="text-[10px] text-slate-400">{r.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#070B14] px-4 pt-3 pb-6 space-y-3">
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800">
            <div className="text-[11px] font-mono uppercase text-slate-400 mb-2">Switch Active Persona</div>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => {
                    setCurrentRole(r.role);
                    if (r.role === 'OPERATOR') setCurrentTab('operator');
                    if (r.role === 'REVIEWER') setCurrentTab('reviewer');
                    if (r.role === 'CONSUMER') setCurrentTab('consumer');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2 rounded-xl text-center border text-xs ${
                    currentRole === r.role ? 'bg-cyan-950 border-cyan-400 text-cyan-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-mono text-xs">{r.badge}</div>
                  <div className="text-[10px] mt-0.5">{r.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
