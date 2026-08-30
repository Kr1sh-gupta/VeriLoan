import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  FileText, 
  AlertTriangle, 
  ShieldCheck, 
  Layers, 
  Network, 
  Settings, 
  Download, 
  Code2, 
  X, 
  CornerDownLeft,
  Sparkles
} from 'lucide-react';
import type { UserRole } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  onNavigate: (tab: string, role?: UserRole) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpen,
  onNavigate,
}) => {
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const allItems = [
    // Main Navigation
    { id: 'ingest', category: 'Navigation', title: 'Ingestion Hub (Multi-Modal)', desc: 'Upload CSV, Scan Ledger, Connect Feeds, Manual Entry', icon: Layers, tab: 'ingest', role: 'OPERATOR' as UserRole },
    { id: 'operator', category: 'Navigation', title: 'Data Operator Console', desc: 'Batch lineage, import history, ingestion monitoring', icon: Layers, tab: 'operator', role: 'OPERATOR' as UserRole },
    { id: 'reviewer', category: 'Navigation', title: 'Reviewer Workbench', desc: 'Exception queue, conflict diff viewer, AI Assistant', icon: AlertTriangle, tab: 'reviewer', role: 'REVIEWER' as UserRole },
    { id: 'consumer', category: 'Navigation', title: 'Verified Records Browser', desc: 'Canonical datasets, data quality score, SHA-256 seal', icon: ShieldCheck, tab: 'consumer', role: 'CONSUMER' as UserRole },
    { id: 'export', category: 'Navigation', title: 'Export Center', desc: 'Export verified datasets (CSV/JSON) and paired audit trails', icon: Download, tab: 'export', role: 'CONSUMER' as UserRole },
    { id: 'admin', category: 'Navigation', title: 'Admin Console & System Health', desc: 'Connectors, validation rules builder, user roles', icon: Settings, tab: 'admin', role: 'ADMIN' as UserRole },
    { id: 'api', category: 'Navigation', title: 'REST API Playground', desc: 'Test live backend endpoints & view JSON schemas', icon: Code2, tab: 'api', role: 'ADMIN' as UserRole },

    // Quick Loans
    { id: 'loan-1', category: 'Loan Records', title: 'LN-29384-A • Eleanor Shellstrop', desc: 'Flagged: Maturity date precedes origination date ($450,000)', icon: FileText, tab: 'reviewer', role: 'REVIEWER' as UserRole },
    { id: 'loan-2', category: 'Loan Records', title: 'LN-88210-B • Chidi Anagonye', desc: 'Flagged: Interest rate 42.5% exceeds ceiling ($320,000)', icon: FileText, tab: 'reviewer', role: 'REVIEWER' as UserRole },
    { id: 'loan-3', category: 'Loan Records', title: 'LN-10092-C • Tahani Al-Jamil', desc: 'Flagged: Balance exceeds principal ($580,000)', icon: FileText, tab: 'reviewer', role: 'REVIEWER' as UserRole },
    { id: 'loan-4', category: 'Loan Records', title: 'LN-99123-E • Michael', desc: 'Verified: Sealed with SHA-256 (100% Quality Score)', icon: ShieldCheck, tab: 'consumer', role: 'CONSUMER' as UserRole },

    // Rules & Connectors
    { id: 'rule-1', category: 'Validation Rules', title: 'R01_MATURITY_ORIGINATION', desc: 'Maturity date must be strictly after origination date', icon: Sparkles, tab: 'admin', role: 'ADMIN' as UserRole },
    { id: 'rule-2', category: 'Validation Rules', title: 'R05_DPD_PAYMENT_STATUS', desc: 'DPD > 30 cannot have CURRENT payment status', icon: Sparkles, tab: 'admin', role: 'ADMIN' as UserRole },
    { id: 'conn-1', category: 'Connectors', title: 'Encompass LOS Daily Sync', desc: 'Status: Active • 14,208 records ingested', icon: Network, tab: 'admin', role: 'ADMIN' as UserRole },
    { id: 'conn-2', category: 'Connectors', title: 'Salesforce Financial Cloud Webhook', desc: 'Status: Active • Real-time stream', icon: Network, tab: 'admin', role: 'ADMIN' as UserRole },
  ];

  const filteredItems = query.trim() === ''
    ? allItems
    : allItems.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.desc.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );

  // Reset selectedIndex and scroll position whenever search query changes
  useEffect(() => {
    setSelectedIndex(0);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [query]);

  // Controlled container auto-scrolling using getBoundingClientRect with 8px padding
  useEffect(() => {
    if (!isOpen || !listContainerRef.current) return;
    const container = listContainerRef.current;
    const item = container.children[selectedIndex] as HTMLElement;
    if (!item) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const padding = 8;

    if (itemRect.top < containerRect.top + padding) {
      container.scrollTop -= (containerRect.top + padding - itemRect.top);
    } else if (itemRect.bottom > containerRect.bottom - padding) {
      container.scrollTop += (itemRect.bottom - (containerRect.bottom - padding));
    }
  }, [selectedIndex, isOpen]);

  // Global shortcut listener for Ctrl+K / Cmd+K (toggles open/close)
  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setQuery('');
          onOpen?.();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, [isOpen, onClose, onOpen]);

  // Active modal keyboard navigation listener (Esc, ArrowUp, ArrowDown, Enter)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems.length > 0 && filteredItems[selectedIndex]) {
          const item = filteredItems[selectedIndex];
          onNavigate(item.tab, item.role);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex, onNavigate]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl rounded-2xl bg-[#0c1220] border border-white/15 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="relative border-b border-white/10 p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search loans, exception rules, connectors, or navigation..."
            className="w-full bg-transparent text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button 
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div ref={listContainerRef} className="max-h-96 overflow-y-auto p-2 divide-y divide-white/[0.04]">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No matching records, rules, or screens found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.tab, item.role);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer group transition-all ${
                    isSelected
                      ? 'bg-white/[0.12] border border-cyan-400/30 text-white shadow-sm ring-1 ring-cyan-400/20'
                      : 'hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-cyan-300 group-hover:border-cyan-400/40 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-500 group-hover:text-cyan-400 transition-colors text-xs font-mono">
                    <span className="hidden sm:inline">Jump</span>
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-[#060913] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
          <div className="flex items-center space-x-3">
            <span>Navigation: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">↓</kbd></span>
            <span>Select: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">↵</kbd></span>
          </div>
          <div>
            <span>Close: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300">ESC</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
};
