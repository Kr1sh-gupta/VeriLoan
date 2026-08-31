import React from 'react';
import { 
  Layers, 
  FileSpreadsheet, 
  AlertTriangle, 
  ShieldCheck, 
  Download, 
  Activity, 
  Sliders, 
  Code2, 
  ShieldAlert, 
  UserCheck, 
  LogOut, 
  Hexagon, 
  X 
} from 'lucide-react';
import type { UserRole, User } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  isDemoBypass?: boolean;
  onToggleBypass?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  currentRole,
  setCurrentRole,
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
  isDemoBypass = false,
  onToggleBypass,
}) => {
  // Define strict role-specific navigation menu items mapped 1:1 to real functional views
  const roleMenus: Record<UserRole, { id: string; label: string; icon: any; category: string }[]> = {
    OPERATOR: [
      { id: 'ingest', label: 'Ingestion Hub', icon: Layers, category: 'Data Intake' },
      { id: 'operator', label: 'Batch Lineage & History', icon: FileSpreadsheet, category: 'Operations' },
    ],
    REVIEWER: [
      { id: 'reviewer', label: 'Reviewer Workbench & AI', icon: AlertTriangle, category: 'Exception Triage' },
    ],
    CONSUMER: [
      { id: 'consumer', label: 'Verified Records Portal', icon: ShieldCheck, category: 'Data Access' },
      { id: 'export', label: 'Export & Compliance Center', icon: Download, category: 'Data Delivery' },
    ],
    ADMIN: [
      { id: 'admin', label: 'System Telemetry', icon: Activity, category: 'Governance' },
      { id: 'admin_rules', label: 'Validation Rule Builder', icon: Sliders, category: 'Rules Engine' },
      { id: 'admin_audit', label: 'Compliance Audit Trail', icon: ShieldAlert, category: 'Audit' },
      { id: 'api', label: 'REST API Playground', icon: Code2, category: 'Developer Tools' },
    ],
  };

  const activeMenuItems = roleMenus[currentRole] || roleMenus.REVIEWER;

  const roleLabels: Record<UserRole, { title: string; badge: string }> = {
    OPERATOR: { title: 'Data Operator', badge: 'OPERATOR' },
    REVIEWER: { title: 'Senior Reviewer', badge: 'REVIEWER' },
    CONSUMER: { title: 'Data Consumer', badge: 'CONSUMER' },
    ADMIN: { title: 'System Admin', badge: 'ADMIN' },
  };

  const currentRoleConfig = roleLabels[currentRole];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Aside Drawer */}
      <aside
        className={`fixed left-0 top-0 bottom-0 h-full bg-[#060913] text-white z-50 flex flex-col border-r border-slate-800/80 shadow-2xl transition-all duration-300 ${
          isOpen ? 'translate-x-0 w-64 max-w-[85vw]' : '-translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        {/* Brand Header at top of sidebar */}
        <div className="h-16 sm:h-20 flex items-center justify-between px-4 border-b border-slate-800/80">
          <div 
            onClick={() => {
              setCurrentTab('landing');
              if (window.innerWidth < 768) onToggle();
            }}
            className={`flex items-center space-x-3 cursor-pointer group overflow-hidden ${
              !isOpen ? 'w-full justify-center space-x-0' : ''
            }`}
            title="VeriLoan Home"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-700 bg-slate-900/60 text-slate-200 group-hover:border-slate-500 group-hover:text-white transition-colors shrink-0">
              <Hexagon className="w-4 h-4" />
            </div>
            {isOpen && (
              <span className="font-bold text-lg tracking-tight text-white font-sans lowercase">
                veriloan
              </span>
            )}
          </div>

          {/* Close button on mobile */}
          {isOpen && (
            <button
              onClick={onToggle}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Role Indicator */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
          {isOpen ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                  Console
                </div>
                <div className="text-xs font-semibold text-slate-200 font-sans">
                  {currentRoleConfig.title}
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                {currentRoleConfig.badge}
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium" title={currentRoleConfig.title}>
                {currentRole.slice(0, 2)}
              </span>
            </div>
          )}
        </div>

        {/* Role Navigation Items */}
        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${isOpen ? 'px-3' : 'px-2'}`}>
          {isOpen && (
            <div className="px-3 pb-2 text-[10px] font-mono uppercase text-slate-500 tracking-wider font-semibold">
              Operations
            </div>
          )}

          {activeMenuItems.map((item) => {
            const Icon = item.icon;
            const targetTab = item.id;
            const isActive = currentTab === targetTab || (targetTab === 'admin' && currentTab.startsWith('admin_'));

            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(targetTab);
                  if (window.innerWidth < 768) onToggle();
                }}
                className={`w-full flex items-center transition-all ${
                  isOpen 
                    ? `space-x-3 px-3 py-2.5 rounded-xl text-xs ${
                        isActive
                          ? 'bg-slate-800 text-white font-semibold border border-slate-700/80 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`
                    : `justify-center p-2.5 rounded-xl ${
                        isActive
                          ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`
                }`}
                title={!isOpen ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {isOpen && (
                  <span className="truncate font-sans">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Switch Persona / User Controls at bottom */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
          {isOpen ? (
            <>
              {/* Offline Demo Simulation Mode Badge (Above Persona Switcher) */}
              {isDemoBypass && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono space-y-1.5 animate-fade-in shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold tracking-tight text-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span>OFFLINE DEMO MODE</span>
                    </div>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase">
                      Preloaded
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-300/80 leading-relaxed font-sans">
                    DB disconnected • Serving verified preloaded fixtures.
                  </div>
                  {onToggleBypass && (
                    <button
                      onClick={onToggleBypass}
                      className="w-full text-center py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Exit Bypass / Reconnect DB ⟳
                    </button>
                  )}
                </div>
              )}

              {/* Simple Switch Role Dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  <span>Switch Persona:</span>
                </label>
                <select
                  value={currentRole}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    setCurrentRole(r);
                    if (r === 'OPERATOR') setCurrentTab('ingest');
                    else if (r === 'REVIEWER') setCurrentTab('reviewer');
                    else if (r === 'CONSUMER') setCurrentTab('consumer');
                    else if (r === 'ADMIN') setCurrentTab('admin');
                    if (window.innerWidth < 768) onToggle();
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-700 cursor-pointer font-sans"
                >
                  <option value="OPERATOR">Operator (Elena Rostova)</option>
                  <option value="REVIEWER">Reviewer (Marcus Vance)</option>
                  <option value="CONSUMER">Consumer (Sarah Chen)</option>
                  <option value="ADMIN">Admin (Alex Rivera)</option>
                </select>
              </div>

              {currentUser && (
                <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="text-xs font-semibold text-slate-200 truncate">{currentUser.full_name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{currentUser.username}</div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {isDemoBypass && (
                <div 
                  className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 cursor-pointer"
                  title="Offline Demo Mode Active (Preloaded Data)"
                  onClick={onToggleBypass}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
