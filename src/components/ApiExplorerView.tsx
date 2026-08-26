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
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1 uppercase tracking-wider">
          <Code2 className="w-3.5 h-3.5" />
          <span>Module H: Verified Records API Explorer</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          REST API Playground
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Directly execute and inspect live JSON responses from backend diligence endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Endpoint Selector List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-xs font-mono text-slate-400 uppercase">Available Endpoints</div>
          <div className="space-y-2">
            {endpoints.map((ep) => (
              <div
                key={ep.path}
                onClick={() => handleExecute(ep.path)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  selectedEndpoint === ep.path
                    ? 'bg-cyan-950/40 border-cyan-500/50 shadow-lg shadow-cyan-950/50'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    {ep.method}
                  </span>
                  <Play className="w-3.5 h-3.5 text-cyan-400 opacity-60" />
                </div>
                <div className="text-xs font-mono font-bold text-slate-200 truncate">{ep.path}</div>
                <div className="text-[11px] text-slate-400 mt-1 font-sans">{ep.desc}</div>
              </div>
            ))}
          </div>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center space-x-2 w-full p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700 mt-4"
          >
            <span>Open Swagger Interactive Docs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Live Response Viewer */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-panel flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 font-mono text-xs text-cyan-400">
                <span>Endpoint:</span>
                <strong className="text-white">{selectedEndpoint}</strong>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExecute(selectedEndpoint)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Execute</span>
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!responseJson}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-24 text-center text-cyan-400 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Querying API backend...
              </div>
            ) : responseJson ? (
              <pre className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[500px] overflow-y-auto">
                {JSON.stringify(responseJson, null, 2)}
              </pre>
            ) : (
              <div className="py-24 text-center text-slate-500 font-sans text-xs">
                Select an endpoint from the left or click Execute to test live API response.
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/60 flex justify-between">
            <span>FastAPI Backend: <code>http://localhost:8000</code></span>
            <span>CORS Enabled</span>
          </div>
        </div>

      </div>

    </div>
  );
};
