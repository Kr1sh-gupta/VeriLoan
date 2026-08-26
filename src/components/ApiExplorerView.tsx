import React, { useState } from 'react';
import { Code2, Play, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import axios from 'axios';

export const ApiExplorerView: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/summary');
  const [responseJson, setResponseJson] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const endpoints = [
    { path: '/api/summary', method: 'GET', desc: 'System summary metrics & batch health' },
    { path: '/api/loans?limit=5', method: 'GET', desc: 'List normalized loan records' },
    { path: '/api/exceptions?severity=CRITICAL', method: 'GET', desc: 'Filter critical validation exceptions' },
    { path: '/api/verified-loans?limit=5', method: 'GET', desc: 'List cryptographically verified loan records' },
    { path: '/api/audit?limit=5', method: 'GET', desc: 'Immutable global audit trail stream' },
    { path: '/api/summary/rules', method: 'GET', desc: 'All 14 configurable validation rules' },
  ];

  const handleExecute = async (path: string) => {
    setSelectedEndpoint(path);
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:8000${path}`);
      setResponseJson(res.data);
    } catch (err: any) {
      setResponseJson({ error: err?.response?.data || err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (responseJson) {
      navigator.clipboard.writeText(JSON.stringify(responseJson, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full bg-[#060913] text-white min-h-[calc(100vh-80px)] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="space-y-2">
            <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2 font-semibold">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span>MODULE H • REST API PLAYGROUND</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
              REST API Explorer
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl">
              Directly execute and inspect live JSON responses from backend diligence endpoints.
            </p>
          </div>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs tracking-wider uppercase transition-all shadow-md"
          >
            <span>Swagger Interactive Docs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Endpoint List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Available Endpoints</div>
            <div className="space-y-2">
              {endpoints.map((ep) => (
                <div
                  key={ep.path}
                  onClick={() => handleExecute(ep.path)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    selectedEndpoint === ep.path
                      ? 'bg-white/[0.08] border-cyan-400/50 shadow-md'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      {ep.method}
                    </span>
                    <Play className="w-3 h-3 text-cyan-400 opacity-80" />
                  </div>
                  <div className="text-xs font-mono font-bold text-white truncate">{ep.path}</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-sans">{ep.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Response Card */}
          <div className="lg:col-span-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center space-x-2 font-mono text-xs text-cyan-400">
                  <span className="text-slate-400">Endpoint:</span>
                  <strong className="text-white">{selectedEndpoint}</strong>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExecute(selectedEndpoint)}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Execute</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    disabled={!responseJson}
                    className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-colors border border-white/10"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-28 text-center text-cyan-400 font-mono text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Querying API backend...
                </div>
              ) : responseJson ? (
                <pre className="mt-4 p-4 rounded-xl bg-[#03060c] border border-white/10 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[500px] overflow-y-auto">
                  {JSON.stringify(responseJson, null, 2)}
                </pre>
              ) : (
                <div className="py-28 text-center text-slate-500 font-sans text-xs">
                  Select an endpoint from the left or click Execute to test live API responses.
                </div>
              )}
            </div>

            <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-white/[0.06] flex justify-between">
              <span>FastAPI Backend: <code>http://localhost:8000</code></span>
              <span>CORS Enabled</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
