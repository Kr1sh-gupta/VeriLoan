import React, { useState } from 'react';
import { Code2, Play, Copy, Check, ExternalLink, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import axios from 'axios';

interface ApiEndpointItem {
  path: string;
  method: 'GET' | 'POST';
  desc: string;
  defaultBody?: string;
}

export const ApiExplorerView: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/summary');
  const [selectedMethod, setSelectedMethod] = useState<'GET' | 'POST'>('GET');
  const [requestBodyText, setRequestBodyText] = useState<string>('');
  
  const [responseJson, setResponseJson] = useState<any | null>(null);
  const [responseStatus, setResponseStatus] = useState<{ code: number; text: string } | null>(null);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [contentType, setContentType] = useState<string | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const endpoints: ApiEndpointItem[] = [
    { path: '/api/summary', method: 'GET', desc: 'System summary metrics & batch health' },
    { path: '/api/loans?limit=5', method: 'GET', desc: 'List normalized loan records' },
    { path: '/api/exceptions?severity=CRITICAL', method: 'GET', desc: 'Filter critical validation exceptions' },
    { path: '/api/verified-loans?limit=5', method: 'GET', desc: 'List cryptographically verified loan records' },
    { path: '/api/audit?limit=5', method: 'GET', desc: 'Immutable global audit trail stream' },
    { path: '/api/summary/rules', method: 'GET', desc: 'All 14 configurable validation rules' },
    { 
      path: '/api/ai/explain', 
      method: 'POST', 
      desc: 'Request Gemini AI explanation & patch suggestion',
      defaultBody: JSON.stringify({ exception_id: 'exc-1', custom_instruction: 'Verify maturity chronology' }, null, 2)
    },
  ];

  const handleSelectEndpoint = (ep: ApiEndpointItem) => {
    setSelectedEndpoint(ep.path);
    setSelectedMethod(ep.method);
    const initialBody = ep.defaultBody || '';
    setRequestBodyText(initialBody);
    handleExecute(ep.path, ep.method, initialBody);
  };

  const handleExecute = async (
    path: string, 
    method: 'GET' | 'POST' = selectedMethod,
    bodyJsonText?: string
  ) => {
    setSelectedEndpoint(path);
    setSelectedMethod(method);
    setLoading(true);
    setResponseJson(null);
    setResponseStatus(null);
    setResponseTimeMs(null);
    setContentType(null);

    const startTime = performance.now();
    const effectiveBodyText = bodyJsonText !== undefined ? bodyJsonText : requestBodyText;

    try {
      let res: any;
      if (method === 'POST') {
        let parsedBody = {};
        try {
          if (effectiveBodyText.trim()) parsedBody = JSON.parse(effectiveBodyText);
        } catch {
          setLoading(false);
          setResponseStatus({ code: 400, text: 'Bad Request (Invalid JSON Body)' });
          setResponseJson({ error: 'Request body contains invalid JSON formatting.' });
          return;
        }
        res = await axios.post(`http://localhost:8000${path}`, parsedBody);
      } else {
        res = await axios.get(`http://localhost:8000${path}`);
      }

      const duration = Math.round(performance.now() - startTime);
      setResponseTimeMs(duration);
      setResponseStatus({ code: res.status, text: res.statusText || 'OK' });
      setContentType(res.headers['content-type'] || 'application/json');
      setResponseJson(res.data);
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      setResponseTimeMs(duration);

      if (err.response) {
        // Backend responded with HTTP error status (4xx / 5xx)
        setResponseStatus({ code: err.response.status, text: err.response.statusText || 'Error' });
        setContentType(err.response.headers?.['content-type'] || 'application/json');

        const errData = typeof err.response.data === 'object' && err.response.data !== null
          ? err.response.data
          : { detail: err.response.data || err.message };

        if (err.response.status === 404 && path.includes('/ai/explain')) {
          setResponseJson({
            ...errData,
            guidance: "The supplied exception_id was not found in the active database. Execute 'GET /api/exceptions' first to retrieve and copy a real exception ID."
          });
        } else {
          setResponseJson(errData);
        }
      } else {
        // Backend server offline or network connection error
        setResponseStatus({ code: 0, text: 'OFFLINE' });
        setContentType('application/json');
        setResponseJson({
          error: 'FastAPI backend server appears to be offline at http://localhost:8000.',
          guidance: 'Start the backend server to enable live API requests.'
        });
      }
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
    <div className="w-full bg-[#060913] text-white min-h-[calc(100vh-80px)] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 sm:pb-6 border-b border-white/[0.08]">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="text-[10px] sm:text-[11px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2 font-semibold">
              <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>MODULE H • REST API PLAYGROUND</span>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight font-sans">
              REST API Explorer
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl leading-relaxed">
              Directly execute and inspect live JSON responses from backend diligence endpoints.
            </p>
          </div>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs tracking-wider uppercase transition-all shadow-md shrink-0"
          >
            <span>Swagger Interactive Docs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          
          {/* Endpoint List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Available Endpoints</div>
            <div className="space-y-2">
              {endpoints.map((ep) => {
                const isSelected = selectedEndpoint === ep.path;
                return (
                  <div
                    key={ep.path}
                    onClick={() => {
                      handleSelectEndpoint(ep);
                      handleExecute(ep.path, ep.method);
                    }}
                    className={`p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-white/[0.08] border-cyan-400/50 shadow-md'
                        : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                        ep.method === 'POST'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      }`}>
                        {ep.method}
                      </span>
                      <Play className="w-3 h-3 text-cyan-400 opacity-80" />
                    </div>
                    <div className="text-xs font-mono font-bold text-white truncate">{ep.path}</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-sans">{ep.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Response Card */}
          <div className="lg:col-span-8 p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
            <div>
              {/* Endpoint & Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center space-x-2 font-mono text-xs text-cyan-400 min-w-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                    selectedMethod === 'POST' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {selectedMethod}
                  </span>
                  <strong className="text-white truncate">{selectedEndpoint}</strong>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleExecute(selectedEndpoint, selectedMethod)}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg bg-white text-[#060913] hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Execute</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    disabled={!responseJson}
                    title="Copy response JSON"
                    className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-colors border border-white/10"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* POST Request Body Editor */}
              {selectedMethod === 'POST' && (
                <div className="mt-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                      Request Payload (JSON Body):
                    </label>
                    <span className="text-[10px] font-mono text-cyan-400">
                      Tip: Execute <code>GET /api/exceptions</code> first to copy a real active <code>id</code>
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={requestBodyText}
                    onChange={(e) => setRequestBodyText(e.target.value)}
                    placeholder='{ "exception_id": "exc-1" }'
                    className="w-full bg-[#03060c] border border-white/10 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400/50"
                  />
                </div>
              )}

              {/* Response Status Metadata Bar */}
              {responseStatus && (
                <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      responseStatus.code >= 200 && responseStatus.code < 300
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                        : responseStatus.code === 0
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                    }`}>
                      {responseStatus.code === 0 ? '0 OFFLINE' : `${responseStatus.code} ${responseStatus.text}`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-slate-400 text-[11px]">
                    {responseTimeMs !== null && (
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Zap className="w-3 h-3" />
                        <span>{responseTimeMs} ms</span>
                      </span>
                    )}
                    {contentType && (
                      <span className="text-slate-400">
                        Type: <code className="text-slate-300">{contentType.split(';')[0]}</code>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Response Display Box */}
              {loading ? (
                <div className="py-28 text-center text-cyan-400 font-mono text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Querying API backend...
                </div>
              ) : responseJson ? (
                <pre className="mt-4 p-4 rounded-xl bg-[#03060c] border border-white/10 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre-wrap break-all">
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
              <span className="flex items-center gap-1 text-slate-400">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>CORS &amp; OpenAuth Enabled</span>
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
