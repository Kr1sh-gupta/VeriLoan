import React from 'react';
import { Hexagon } from 'lucide-react';

interface FooterProps {
  isLanding?: boolean;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="w-full bg-[#060913] border-t border-slate-800/80 text-slate-400 transition-colors duration-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-xs font-sans">
        
        {/* Left: Brand + Tagline */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm">
              <Hexagon className="w-3 h-3" />
            </div>
            <span className="font-extrabold lowercase tracking-tight text-sm text-white">
              veriloan
            </span>
          </div>

          <span className="text-slate-700 hidden sm:inline">•</span>

          <span className="text-[11px] sm:text-xs text-slate-400">
            AI Financial Diligence &amp; Cryptographic Verification Platform
          </span>
        </div>

        {/* Right: Technical Badges & Status */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-2.5 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Engine Online
          </span>

          <span className="px-2.5 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-800 shadow-sm">
            FastAPI + React 19
          </span>

          <span className="px-2.5 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-800 shadow-sm">
            14 Rules Active
          </span>

          <span className="px-2.5 py-0.5 rounded-md bg-slate-900/90 text-slate-300 border border-slate-800 shadow-sm">
            SHA-256 Sealed
          </span>
        </div>

      </div>
    </footer>
  );
};
