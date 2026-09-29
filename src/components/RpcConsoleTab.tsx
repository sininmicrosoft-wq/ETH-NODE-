import React, { useState } from 'react';
import { RpcEndpoint, RpcRequestPreset } from '../types/ethereum';
import { RPC_PRESETS } from '../data/nodeArchitectures';
import { callRpc } from '../services/ethereumRpc';
import {
  Terminal,
  Play,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Clock,
  Code2,
  FileCode,
  History,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface RpcConsoleTabProps {
  currentEndpoint: RpcEndpoint;
}

interface ExecutionRecord {
  id: string;
  timestamp: string;
  method: string;
  params: any[];
  latencyMs: number;
  success: boolean;
  result: any;
  error?: string;
}

export const RpcConsoleTab: React.FC<RpcConsoleTabProps> = ({ currentEndpoint }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('block-number');
  const [customMethod, setCustomMethod] = useState<string>('eth_blockNumber');
  const [rawParams, setRawParams] = useState<string>('[]');
  const [paramError, setParamError] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<any>(null);
  const [responseMeta, setResponseMeta] = useState<{
    latencyMs: number;
    timestamp: string;
    error?: string;
  } | null>(null);

  const [history, setHistory] = useState<ExecutionRecord[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const categories = ['All', 'Block & Chain', 'Account & State', 'Transactions & Gas', 'Node & Network'];

  const filteredPresets = selectedCategory === 'All'
    ? RPC_PRESETS
    : RPC_PRESETS.filter((p) => p.category === selectedCategory);

  const applyPreset = (preset: RpcRequestPreset) => {
    setSelectedPresetId(preset.id);
    setCustomMethod(preset.method);
    setRawParams(JSON.stringify(preset.params, null, 2));
    setParamError(null);
  };

  const handleExecute = async () => {
    let parsedParams: any[] = [];
    try {
      parsedParams = rawParams.trim() ? JSON.parse(rawParams) : [];
      if (!Array.isArray(parsedParams)) {
        setParamError('Params must be a valid JSON array: e.g. ["latest", false]');
        return;
      }
      setParamError(null);
    } catch (e: any) {
      setParamError(`Invalid JSON in params: ${e.message}`);
      return;
    }

    setLoading(true);
    setResponse(null);

    const res = await callRpc(currentEndpoint.url, customMethod.trim(), parsedParams);

    const now = new Date().toLocaleTimeString();
    setResponse(res.error ? { error: res.error } : res.result);
    setResponseMeta({
      latencyMs: res.latencyMs,
      timestamp: now,
      error: res.error,
    });

    const newRecord: ExecutionRecord = {
      id: `${Date.now()}`,
      timestamp: now,
      method: customMethod.trim(),
      params: parsedParams,
      latencyMs: res.latencyMs,
      success: !res.error,
      result: res.result,
      error: res.error,
    };

    setHistory((prev) => [newRecord, ...prev.slice(0, 9)]);
    setLoading(false);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const generateCurl = () => {
    let parsedParams = [];
    try {
      parsedParams = rawParams.trim() ? JSON.parse(rawParams) : [];
    } catch {
      parsedParams = [];
    }
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: customMethod.trim(),
      params: parsedParams,
    });
    return `curl -X POST ${currentEndpoint.url} \\
  -H "Content-Type: application/json" \\
  --data '${payload}'`;
  };

  return (
    <div className="space-y-6">
      {/* Introduction banner */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Ethereum JSON-RPC Interactive Client
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Query the Ethereum execution engine directly via standard JSON-RPC 2.0 specifications.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Connected RPC:</span>
          <span className="text-emerald-400 font-semibold truncate max-w-xs">{currentEndpoint.url}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Presets and Builder (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Preset Categories */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white">Standard RPC Presets</span>
              <span className="text-[11px] text-slate-500 font-mono">{filteredPresets.length} available</span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500/40 text-white'
                        : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium text-emerald-400">{preset.method}</span>
                      <span className="text-[10px] text-slate-500 font-sans">{preset.category}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Request Payload Editor */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                Request Configuration
              </span>
              <button
                onClick={() => {
                  try {
                    const formatted = JSON.stringify(JSON.parse(rawParams), null, 2);
                    setRawParams(formatted);
                    setParamError(null);
                  } catch (e: any) {
                    setParamError('Invalid JSON');
                  }
                }}
                className="text-[10px] text-slate-400 hover:text-slate-200"
              >
                Format JSON
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Method Name</label>
              <input
                type="text"
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                placeholder="eth_blockNumber"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Parameters (JSON Array)</label>
              <textarea
                value={rawParams}
                onChange={(e) => {
                  setRawParams(e.target.value);
                  setParamError(null);
                }}
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                placeholder='["latest", false]'
              />
              {paramError && (
                <div className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{paramError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => copyToClipboard(generateCurl(), 'curl')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              >
                {copiedKey === 'curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy cURL</span>
              </button>

              <button
                onClick={handleExecute}
                disabled={loading || !customMethod.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${loading ? 'animate-pulse' : ''}`} />
                <span>{loading ? 'Executing...' : 'Send Request'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Response Inspector & History (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Response Console */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex flex-col h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">JSON-RPC Response</span>
                {responseMeta && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span className="text-slate-600">·</span>
                    <span className={responseMeta.error ? 'text-rose-400' : 'text-emerald-400'}>
                      {responseMeta.error ? 'Error' : '200 OK'}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span>{responseMeta.latencyMs}ms</span>
                    <span className="text-slate-600">·</span>
                    <span>{responseMeta.timestamp}</span>
                  </div>
                )}
              </div>

              {response && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(response, null, 2), 'response')}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                >
                  {copiedKey === 'response' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy JSON</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto mt-3 bg-slate-950 rounded-lg p-3 border border-slate-800/80">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>Executing RPC call to {currentEndpoint.name}...</span>
                  </div>
                </div>
              ) : response !== null ? (
                <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap break-all">
                  {JSON.stringify(response, null, 2)}
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                  <Terminal className="w-8 h-8 text-slate-700" />
                  <span>Select a preset or enter a method and click "Send Request".</span>
                </div>
              )}
            </div>
          </div>

          {/* Execution History */}
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Session Request History
              </span>
              <span className="text-[11px] text-slate-500">{history.length} calls</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">
                  No RPC requests sent in this session yet.
                </div>
              ) : (
                history.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/80 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {record.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span className="text-slate-200 truncate">{record.method}</span>
                      <span className="text-slate-500 text-[10px] hidden sm:inline">
                        ({record.params.length} params)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[11px]">
                      <span className="text-slate-400">{record.latencyMs}ms</span>
                      <span className="text-slate-500">{record.timestamp}</span>
                      <button
                        onClick={() => {
                          setCustomMethod(record.method);
                          setRawParams(JSON.stringify(record.params, null, 2));
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-sans text-[11px]"
                      >
                        Re-load
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
