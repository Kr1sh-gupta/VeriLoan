import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export const FloatingVerificationSlate: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative w-full max-w-[480px] h-[340px] flex items-center justify-center perspective-1200 cursor-pointer select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ambient Radial Blue Backlight */}
      <div className="absolute w-72 h-72 rounded-full bg-blue-600/30 blur-[90px] pointer-events-none -z-10" />
      <div className="absolute w-48 h-48 rounded-full bg-indigo-500/20 blur-[60px] pointer-events-none -z-10" />

      {/* Floating Asteroid / Metallic Debris Shards */}
      <div className="absolute -top-6 -left-8 w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-700/60 shadow-xl rotate-12 animate-debris-1 pointer-events-none" />
      <div className="absolute -top-10 right-6 w-6 h-6 rounded-md bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-700/50 shadow-lg -rotate-45 animate-debris-2 pointer-events-none" />
      <div className="absolute -bottom-6 -left-4 w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-700/60 shadow-md rotate-45 animate-debris-3 pointer-events-none" />
      <div className="absolute bottom-4 -right-10 w-9 h-9 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-700/50 shadow-xl -rotate-12 animate-debris-1 pointer-events-none" />
      <div className="absolute top-1/2 -left-12 w-4 h-4 rounded-sm bg-slate-700 border border-slate-600/40 shadow rotate-12 animate-debris-2 pointer-events-none" />
      <div className="absolute top-1/3 -right-6 w-5 h-5 rounded-md bg-slate-700 border border-slate-600/40 shadow -rotate-12 animate-debris-3 pointer-events-none" />

      {/* Main 3D Floating Slate (Loan Tape Diligence Core) */}
      <div 
        className={`relative w-[340px] sm:w-[380px] h-[215px] sm:h-[240px] rounded-2xl card-3d-slate p-6 flex flex-col justify-between overflow-hidden transition-all duration-700 ${
          isHovered ? 'scale-105 rotate-x-6 rotate-y-6' : 'animate-float-card'
        }`}
      >
        {/* Subtle Brushed Metal Sheen & Texture */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-400/[0.07] rounded-full blur-2xl pointer-events-none" />

        {/* Top Header of Slate: Security Chip + Protocol Seal */}
        <div className="flex items-center justify-between relative z-10">
          {/* Gold Embedded Cryptographic Security Microchip */}
          <div className="w-11 h-9 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 p-[1.5px] shadow-md border border-amber-200/50 flex flex-col justify-between">
            <div className="flex justify-between h-full p-1">
              <div className="w-2.5 h-full border-r border-amber-700/40 flex flex-col justify-between">
                <div className="w-full h-1 border-b border-amber-700/40" />
                <div className="w-full h-1 border-b border-amber-700/40" />
              </div>
              <div className="w-2.5 h-full border-l border-amber-700/40 flex flex-col justify-between">
                <div className="w-full h-1 border-b border-amber-700/40" />
                <div className="w-full h-1 border-b border-amber-700/40" />
              </div>
            </div>
          </div>

          {/* Top Right Live Protocol Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-[10px] font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>SHA-256 SEALED</span>
          </div>
        </div>

        {/* Center Embossed Brand Typography */}
        <div className="relative z-10 text-center my-auto">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight embossed-metallic font-sans">
            veriloan
          </div>
          <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mt-0.5 opacity-80">
            AI Diligence Engine
          </div>
        </div>

        {/* Bottom Slate Info: Canonical Hash + Balance Telemetry */}
        <div className="relative z-10 flex items-end justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500">Record Hash</div>
            <div className="text-slate-300 font-semibold truncate max-w-[170px]">
              0x9e8a...3f4b2c
            </div>
          </div>

          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider text-slate-500">14-Rule Status</div>
            <div className="text-emerald-400 font-bold flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-3 h-3" /> VERIFIED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
