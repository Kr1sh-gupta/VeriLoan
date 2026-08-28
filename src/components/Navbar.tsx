import React, { useState } from 'react';
import { 
  ArrowRight,
  Menu, 
  X, 
  ChevronDown,
  Hexagon
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
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const roles: { role: UserRole; label: string; name: string; badge: string }[] = [
    { role: 'OPERATOR', label: 'Data Operator', name: 'Elena Rostova', badge: 'OP' },
    { role: 'REVIEWER', label: 'Reviewer', name: 'Marcus Vance', badge: 'RV' },
    { role: 'CONSUMER', label: 'Data Consumer', name: 'Sarah Chen', badge: 'DC' },
  ];

  const currentRoleInfo = roles.find(r => r.role === currentRole) || roles[0];

  const navLinks = [
    { id: 'landing', label: 'Overview' },
    { id: 'operator', label: 'Operator Hub' },
    { id: 'reviewer', label: 'Reviewer Workbench' },
    { id: 'consumer', label: 'Verified Records' },
    { id: 'api', label: 'API Playground' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#060913]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo matching reference image (clean minimal lowercase logo) */}
          <div 
            onClick={() => setCurrentTab('landing')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/20 bg-white/[0.04] text-white group-hover:border-cyan-400/50 transition-colors">
              <Hexagon className="w-4 h-4 text-white group-hover:text-cyan-400 transition-colors" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white font-sans lowercase">
              veriloan
            </span>
          </div>

          {/* Minimal Nav Links in Center */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
                    isActive
                      ? 'text-white bg-white/[0.08] border border-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Area */}
          <div className="hidden sm:flex items-center space-x-4">
            {/* Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/20 text-xs text-slate-300 transition-all font-mono"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{currentRoleInfo.label}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#0d1322] border border-white/10 shadow-2xl py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] uppercase font-mono text-slate-400">
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
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-white/[0.06] transition-colors ${
                        currentRole === r.role ? 'text-cyan-400 font-semibold bg-white/[0.04]' : 'text-slate-300'
                      }`}
                    >
                      <span>{r.label}</span>
                      <span className="text-[10px] font-mono text-slate-500">{r.badge}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* High-Contrast Action Button matching reference image (Open Workbench ->) */}
            <button
              onClick={() => setCurrentTab('reviewer')}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95"
            >
              <span>OPEN WORKBENCH</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white/[0.05] text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/[0.08] bg-[#060913] px-4 py-4 space-y-3">
          <div className="grid grid-cols-1 gap-1">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                  currentTab === item.id ? 'bg-white/[0.08] text-white font-semibold' : 'text-slate-300 hover:bg-white/[0.03]'
                }`}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center">
            <button
              onClick={() => {
                setCurrentTab('reviewer');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-white text-[#060913] font-bold text-xs uppercase"
            >
              <span>OPEN WORKBENCH</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
