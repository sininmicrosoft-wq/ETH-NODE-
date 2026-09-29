import React, { useState } from 'react';
import { RpcEndpoint } from '../types/ethereum';
import { DEFAULT_ENDPOINTS, callRpc, hexToNumber } from '../services/ethereumRpc';
import { X, Check, Globe, Laptop, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface NetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEndpoint: RpcEndpoint;
  onSelectEndpoint: (endpoint: RpcEndpoint) => void;
}

export const NetworkModal: React.FC<NetworkModalProps> = ({
  isOpen,
  onClose,
  currentEndpoint,
  onSelectEndpoint,
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [customName, setCustomName] = useState('Custom Ethereum Node');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    chainId?: number;
    clientVersion?: string;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestAndConnectCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    setTesting(true);
    setTestResult(null);

    const [chainRes, versionRes] = await Promise.all([
      callRpc(customUrl.trim(), 'eth_chainId'),
      callRpc(customUrl.trim(), 'web3_clientVersion'),
    ]);

    setTesting(false);

    if (chainRes.error && versionRes.error) {
      setTestResult({
        success: false,
        error: chainRes.error || 'Failed to connect to RPC node',
      });
      return;
    }

    const chainId = chainRes.result ? hexToNumber(chainRes.result) : 1;
    const clientVersion = versionRes.result || 'Unknown Client';

    setTestResult({
      success: true,
      latencyMs: chainRes.latencyMs,
      chainId,
      clientVersion,
    });

    const newEndpoint: RpcEndpoint = {
      id: `custom-${Date.now()}`,
      name: customName || 'Custom Node',
      network: 'custom',
      url: customUrl.trim(),
      chainId,
      isCustom: true,
    };

    onSelectEndpoint(newEndpoint);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#111827] border border-slate-700/80 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-white">Select Ethereum Node Endpoint</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect to public infrastructure, testnets, or your own local Geth/Reth node.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Preset Endpoints */}
          <div>
            <div className="text-xs font-medium text-slate-400 mb-2.5">Production Networks & Testnets</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_ENDPOINTS.map((endpoint) => {
                const isSelected = currentEndpoint.id === endpoint.id;
                return (
                  <button
                    key={endpoint.id}
                    onClick={() => {
                      onSelectEndpoint(endpoint);
                      onClose();
                    }}
                    className={`flex items-start justify-between p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        {endpoint.network === 'local' ? (
                          <Laptop className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                        <span className="truncate">{endpoint.name}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate mt-1">
                        {endpoint.url}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Chain ID: <span className="font-mono text-slate-300">{endpoint.chainId}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Node Connection Form */}
          <div className="border-t border-slate-800 pt-5">
            <div className="text-xs font-medium text-slate-400 mb-2">Connect to Custom RPC Node</div>
            <form onSubmit={handleTestAndConnectCustom} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] text-slate-400 mb-1">Label</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="My Geth Node"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">RPC URL (HTTP / HTTPS)</label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8545 or https://..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-emerald-300">Successfully connected!</div>
                        <div className="text-[11px] text-slate-300 mt-1 space-x-2">
                          <span>Chain ID: {testResult.chainId}</span>
                          <span>·</span>
                          <span>Ping: {testResult.latencyMs}ms</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                          {testResult.clientVersion}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-rose-300">Connection Failed</div>
                        <div className="text-[11px] text-rose-200 mt-0.5">{testResult.error}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={testing || !customUrl.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing RPC...</span>
                    </>
                  ) : (
                    <>
                      <span>Test & Connect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
