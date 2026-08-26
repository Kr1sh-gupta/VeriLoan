import React, { useEffect, useState } from 'react';
import { ShieldCheck, Cpu, Database, Zap, RefreshCw, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

export const HeroAnimation: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 2400);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto my-6 p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/20 shadow-2xl overflow-hidden">
      {/* Background Animated Gradient Mesh */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/20 via-slate-900/40 to-emerald-950/20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      {/* Top Header Pill */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </div>
          <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-semibold">
            Neural Verification Pipeline Active
          </span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/50">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Latency: <strong>8ms</strong>
          </span>
          <span className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/50">
            <Lock className="w-3.5 h-3.5 text-emerald-400" /> Protocol: <strong>SHA-256</strong>
          </span>
        </div>
      </div>

      {/* Main Interactive Flow Diagram */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        
        {/* Stage 1: Raw Messy Tape Ingestion */}
        <div className={`p-5 rounded-2xl transition-all duration-500 ${
          activeStep === 0 ? 'bg-cyan-950/40 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-102' : 'bg-slate-900/60 border border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <Database className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-200">1. Messy Ingestion</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold">14 Anomaly Types</span>
          </div>

          {/* Animated Raw Record Mock */}
          <div className="space-y-1.5 font-mono text-[11px] bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-slate-400">
            <div className="flex justify-between items-center text-red-400 line-through">
              <span>balance: $345,000</span>
              <span className="text-[9px] bg-red-950 px-1 py-0.5 rounded">&gt; principal!</span>
            </div>
            <div className="flex justify-between items-center text-amber-400">
              <span>maturity: 2020-01</span>
              <span className="text-[9px] bg-amber-950 px-1 py-0.5 rounded">sequence err</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>state: &quot;CAL&quot;</span>
              <span className="text-[9px] text-cyan-400 font-bold">&rarr; mapping</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" /> Ingesting 1,200 records...
          </div>
        </div>

        {/* Stage 2: AI Copilot & 14-Rule Engine */}
        <div className={`p-5 rounded-2xl transition-all duration-500 ${
          activeStep === 1 || activeStep === 2 ? 'bg-cyan-950/40 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 scale-102' : 'bg-slate-900/60 border border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <span className="font-semibold text-sm text-slate-200">2. AI Copilot Review</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold">99.4% Match</span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px] bg-slate-950/80 p-3 rounded-xl border border-cyan-500/30 text-slate-300">
            <div className="text-cyan-400 text-[10px] flex items-center gap-1">
              <Zap className="w-3 h-3" /> Reconciled with Servicer Tape:
            </div>
            <div className="text-emerald-400 font-semibold">
              balance: $42,000.00 <span className="text-[9px] text-slate-400">(from ledger)</span>
            </div>
            <div className="text-slate-400 text-[10px] mt-1 border-t border-slate-800 pt-1">
              Human Reviewer: <span className="text-emerald-400 font-bold">1-Click Approved</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-cyan-400" /> Transparent prompts &amp; zero silent writes
          </div>
        </div>

        {/* Stage 3: Cryptographic Canonical Seal */}
        <div className={`p-5 rounded-2xl transition-all duration-500 ${
          activeStep === 3 ? 'bg-emerald-950/40 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-102' : 'bg-slate-900/60 border border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Lock className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm text-slate-200">3. Verified Record</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">Sealed &amp; Auditable</span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px] bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 text-emerald-300">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> SHA-256 Hash Generated:
            </div>
            <div className="text-[10px] text-emerald-400 truncate bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-900">
              e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Lineage: <span className="text-slate-300">Raw &rarr; AI Patch &rarr; Verified</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-emerald-400 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for API &amp; Downstream Diligence
          </div>
        </div>

      </div>

      {/* Flow Connecting Particles Banner */}
      <div className="relative z-10 mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Continuous Automated Exception Reconciliation &amp; Audit Trail</span>
        </div>
        <div className="font-mono text-slate-500 text-[11px]">
          Target: <span className="text-cyan-400">Intain Campus FinTech Challenge 2026</span>
        </div>
      </div>
    </div>
  );
};
