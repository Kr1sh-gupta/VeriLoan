import React from 'react';
import { 
  Zap, 
  BarChart2, 
  Star, 
  Lock, 
  CheckCircle2, 
  TrendingUp
} from 'lucide-react';
import { FloatingVerificationSlate } from './FloatingVerificationSlate';
import type { SystemSummary, UserRole } from '../types';

interface LandingPageProps {
  summary: SystemSummary | null;
  setCurrentTab: (tab: string) => void;
  setCurrentRole: (role: UserRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  setCurrentTab,
  setCurrentRole,
}) => {
  return (
    <div className="w-full">
      
      {/* ========================================================================= */}
      {/* 1. TOP DARK HERO SECTION (Exact match to reference design image) */}
      {/* ========================================================================= */}
      <section className="relative w-full bg-[#060913] text-white pt-10 sm:pt-16 pb-20 sm:pb-28 overflow-hidden hairline-grid border-b border-white/[0.08]">
        
        {/* Subtle Crosshairs on Grid Intersections */}
        <div className="absolute top-12 left-12 text-white/20 font-mono text-xs select-none pointer-events-none">+</div>
        <div className="absolute top-12 right-12 text-white/20 font-mono text-xs select-none pointer-events-none">+</div>
        <div className="absolute bottom-12 left-1/3 text-white/20 font-mono text-xs select-none pointer-events-none">+</div>
        <div className="absolute bottom-12 right-1/4 text-white/20 font-mono text-xs select-none pointer-events-none">+</div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
            
            {/* Left Column: Pixelated + Clean Bold Display Typography */}
            <div className="lg:col-span-4 z-10 space-y-2">
              <div className="font-pixel text-4xl sm:text-5xl lg:text-6xl text-white font-bold leading-tight tracking-wider">
                LOAN<br />
                DATA
              </div>
              <div className="font-sans text-4xl sm:text-5xl lg:text-6xl text-white font-extrabold tracking-tight uppercase">
                VERIFIED
              </div>

              <div className="pt-4 text-xs font-mono text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>14-Rule Engine • SHA-256 Protocol</span>
              </div>
            </div>

            {/* Center Column: 3D Floating Slate + Subtitle + Dual CTAs */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center text-center z-10 space-y-6">
              
              {/* 3D Floating Diligence Slate Core */}
              <FloatingVerificationSlate />

              {/* Description & Dual Action Buttons matching reference image */}
              <div className="max-w-md space-y-5 px-2">
                <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                  A smarter way to ingest, validate, and verify loan data with real-time AI reconciliation, cryptographic security, and immutable audit logs built in.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setCurrentRole('OPERATOR');
                      setCurrentTab('operator');
                    }}
                    className="px-6 py-2.5 rounded-lg bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs tracking-wider uppercase transition-all shadow-lg active:scale-95"
                  >
                    Get VeriLoan
                  </button>

                  <button
                    onClick={() => {
                      const el = document.getElementById('features-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/20 font-medium text-xs tracking-wider uppercase transition-all"
                  >
                    Explore Features
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: 3 Minimalist Hairline Feature Rows matching reference */}
            <div className="lg:col-span-3 space-y-4 z-10">
              <div className="space-y-4">
                
                {/* Feature 1: Instant Ingestion */}
                <div 
                  onClick={() => {
                    setCurrentRole('OPERATOR');
                    setCurrentTab('operator');
                  }}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-cyan-400/40 cursor-pointer transition-all group"
                >
                  <div className="flex items-start space-x-3">
                    <Zap className="w-4 h-4 text-cyan-400 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">Instant Ingestion</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Stream and validate multi-source tapes in real time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 2: Smart Financial Insights */}
                <div 
                  onClick={() => {
                    setCurrentRole('REVIEWER');
                    setCurrentTab('reviewer');
                  }}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-amber-400/40 cursor-pointer transition-all group"
                >
                  <div className="flex items-start space-x-3">
                    <BarChart2 className="w-4 h-4 text-amber-400 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">Smart Financial Insights</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        14-rule anomaly detection &amp; AI explanations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 3: Cryptographic Trust */}
                <div 
                  onClick={() => {
                    setCurrentRole('CONSUMER');
                    setCurrentTab('consumer');
                  }}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-emerald-400/40 cursor-pointer transition-all group"
                >
                  <div className="flex items-start space-x-3">
                    <Star className="w-4 h-4 text-emerald-400 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">Cryptographic Trust</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        SHA-256 sealed records &amp; audit immutability.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 2. BOTTOM CRISP LIGHT SECTION (Exact match to reference design image) */}
      {/* ========================================================================= */}
      <section id="features-section" className="w-full bg-[#FFFFFF] text-[#0A0E17] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Section Header with Left Subheading & Right Description */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4">
            <div className="space-y-3">
              <div className="text-xs font-mono tracking-widest text-slate-500 uppercase font-bold">
                BUILT FOR FINANCIAL DILIGENCE
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-[#0A0E17] tracking-tight font-sans leading-tight">
                Ingest, validate, and<br />
                stay in control
              </h2>
            </div>

            <div className="max-w-md">
              <p className="text-sm sm:text-base text-slate-600 font-sans leading-relaxed">
                Everything you need to verify loan tapes faster, resolve anomalies with explainable AI, and seal records with mathematical certainty.
              </p>
            </div>
          </div>

          {/* 3 Column Feature Cards matching reference cards exactly */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Instant Ingestion */}
            <div className="bg-[#FAFAFB] border hairline-border-light rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-8 hover:shadow-xl hover:border-slate-300 transition-all group">
              <div>
                {/* Icon Badge */}
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md mb-6">
                  <Zap className="w-5 h-5" />
                </div>

                <h3 className="text-2xl font-bold text-[#0A0E17] font-sans tracking-tight">
                  Instant Ingestion
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 font-sans leading-relaxed">
                  Ingest and normalize multi-source loan tapes in real time with automated schema mapping.
                </p>
              </div>

              {/* Glowing Deep Blue Feature Mockup Screen */}
              <div className="relative rounded-2xl bg-gradient-to-b from-[#0B1528] to-[#060B14] p-5 border border-slate-800 shadow-xl overflow-hidden min-h-[220px] flex flex-col justify-between">
                <div className="absolute inset-0 bg-[radial-gradient(#1e3a8a_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

                {/* Floating Mock Tape Card */}
                <div className="relative z-10 p-3.5 rounded-xl bg-[#13223E] border border-blue-500/30 shadow-md">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                    <span className="text-cyan-400 font-bold">Tape: loan_tape.csv</span>
                    <span>1,200 Records</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-white mt-1">
                    $34,500,000.00
                  </div>
                </div>

                {/* Live Payment Sent Pill */}
                <div className="relative z-10 p-3 rounded-xl bg-white text-[#0A0E17] shadow-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono">Status Verified</div>
                      <div className="text-xs font-bold font-mono">$250,000.00</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Real-time
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Smarter Insights (Doughnut Chart Breakdown) */}
            <div className="bg-[#FAFAFB] border hairline-border-light rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-8 hover:shadow-xl hover:border-slate-300 transition-all group">
              <div>
                {/* Icon Badge */}
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md mb-6">
                  <BarChart2 className="w-5 h-5" />
                </div>

                <h3 className="text-2xl font-bold text-[#0A0E17] font-sans tracking-tight">
                  Smarter Insights
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 font-sans leading-relaxed">
                  Track your data health, spot loan discrepancies, and review AI root-cause explanations.
                </p>
              </div>

              {/* Clean White Financial Chart Mockup Card matching reference */}
              <div className="relative rounded-2xl bg-gradient-to-b from-[#0B1528] to-[#060B14] p-4 border border-slate-800 shadow-xl overflow-hidden min-h-[220px] flex items-center justify-center">
                <div className="w-full bg-white rounded-xl p-3.5 shadow-md space-y-3">
                  
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                    <span>Portfolio Quality</span>
                    <span className="text-[10px] font-mono text-slate-400">This batch ▾</span>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Visual CSS Doughnut Ring */}
                    <div className="relative w-16 h-16 rounded-full border-4 border-blue-600 border-t-indigo-400 border-r-teal-400 flex items-center justify-center">
                      <div className="text-[9px] font-mono font-bold text-center leading-tight">
                        <span className="text-[7px] text-slate-400 uppercase block">Score</span>
                        98%
                      </div>
                    </div>

                    {/* Breakdown legend */}
                    <div className="space-y-1 text-[10px] font-sans text-slate-600">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span>Clean Loans: <strong>85%</strong></span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-teal-400" />
                        <span>Reconciled: <strong>12%</strong></span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Flagged: <strong>3%</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-emerald-600 font-medium">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Reconciled with servicer
                    </span>
                    <span className="font-bold">99.4% match</span>
                  </div>

                </div>
              </div>
            </div>

            {/* Card 3: Cryptographic Trust & Verification */}
            <div className="bg-[#FAFAFB] border hairline-border-light rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-8 hover:shadow-xl hover:border-slate-300 transition-all group">
              <div>
                {/* Icon Badge */}
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md mb-6">
                  <Star className="w-5 h-5" />
                </div>

                <h3 className="text-2xl font-bold text-[#0A0E17] font-sans tracking-tight">
                  Cryptographic Trust
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 font-sans leading-relaxed">
                  Deterministic canonical JSON records sealed with SHA-256 hashes and tamper detection.
                </p>
              </div>

              {/* Clean White Verification Certificate Card matching reference */}
              <div className="relative rounded-2xl bg-gradient-to-b from-[#0B1528] to-[#060B14] p-4 border border-slate-800 shadow-xl overflow-hidden min-h-[220px] flex items-center justify-center">
                <div className="w-full bg-white rounded-xl p-3.5 shadow-md space-y-3">
                  
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-blue-600" /> Sealed Record
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold">
                      VALIDATED
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px] space-y-0.5 text-slate-600">
                    <div className="text-[8px] text-slate-400 uppercase">SHA-256 Record Hash</div>
                    <div className="text-blue-600 font-bold truncate">
                      0x4f8b91a2c53e8704bd62...
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Audit Trail Lineage:</span>
                    <span className="text-slate-800 font-bold">100% Traceable</span>
                  </div>

                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};
