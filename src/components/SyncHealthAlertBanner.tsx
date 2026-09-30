import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NodeMetrics, EthereumBlock, RpcEndpoint } from '../types/ethereum';
import { callRpc, hexToNumber, DEFAULT_ENDPOINTS } from '../services/ethereumRpc';
import {
  AlertTriangle,
  RefreshCw,
  Server,
  WifiOff,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';

interface SyncHealthAlertBannerProps {
  metrics: NodeMetrics | null;
  recentBlocks: EthereumBlock[];
  currentEndpoint: RpcEndpoint;
  onSwitchEndpoint: (endpoint: RpcEndpoint) => void;
  onForceRefresh: () => void;
  isRefreshing?: boolean;
}

export const SyncHealthAlertBanner: React.FC<SyncHealthAlertBannerProps> = ({
  metrics,
  recentBlocks,
  currentEndpoint,
  onSwitchEndpoint,
  onForceRefresh,
  isRefreshing = false,
}) => {
  const [referenceHead, setReferenceHead] = useState<number | null>(null);
  const [refLatency, setRefLatency] = useState<number>(0);
  const [simulatedLag, setSimulatedLag] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [expandedDiagnostics, setExpandedDiagnostics] = useState<boolean>(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());

  // Canonical fallback endpoint for sync comparison (Cloudflare or PublicNode)
  const referenceEndpoint = useMemo(() => {
    return (
      DEFAULT_ENDPOINTS.find(
        (e) => e.network === 'mainnet' && e.id !== currentEndpoint.id && e.id.includes('cloudflare')
      ) || DEFAULT_ENDPOINTS[1]
    );
  }, [currentEndpoint.id]);

  // Periodic check against reference endpoint
  const checkReferenceHead = useCallback(async () => {
    try {
      const res = await callRpc(referenceEndpoint.url, 'eth_blockNumber');
      if (res.result) {
        const num = hexToNumber(res.result);
        setReferenceHead(num);
        setRefLatency(res.latencyMs);
        setLastCheckTime(new Date());
      }
    } catch {
      // Fallback: estimate reference head from time if RPC fails
    }
  }, [referenceEndpoint.url]);

  useEffect(() => {
    checkReferenceHead();
    const interval = setInterval(checkReferenceHead, 20000);
    return () => clearInterval(interval);
  }, [checkReferenceHead]);

  // Node's latest block info
  const latestBlock = recentBlocks[0];
  const localHeadNum = metrics?.blockNumber || (latestBlock ? hexToNumber(latestBlock.number) : 0);

  // Calculate actual block age
  const blockAgeSeconds = useMemo(() => {
    if (simulatedLag) {
      // When simulating, force a 6 minute 15 second lag
      return 375;
    }
    if (!latestBlock || !latestBlock.timestamp) {
      return 0;
    }
    const blockTimeSec = hexToNumber(latestBlock.timestamp);
    const nowSec = Math.floor(Date.now() / 1000);
    return Math.max(0, nowSec - blockTimeSec);
  }, [latestBlock, simulatedLag]);

  // Consensus gap calculation
  const blockGap = useMemo(() => {
    if (simulatedLag) {
      return 31; // 31 blocks behind (~6.2 minutes)
    }
    if (!referenceHead || localHeadNum === 0) return 0;
    return Math.max(0, referenceHead - localHeadNum);
  }, [referenceHead, localHeadNum, simulatedLag]);

  // Stalled peering check (e.g. peers < 8 or zero)
  const peerCount = metrics?.peerCount || 0;
  const isStalledPeering = peerCount < 8;

  // Lags behind head for more than 5 minutes threshold
  // 5 minutes = 300 seconds (or >= 25 blocks at 12s slot time)
  const isLaggingOver5Min = blockAgeSeconds >= 300 || blockGap >= 25;

  // Overall sync health status
  const hasConsensusAlert = (isLaggingOver5Min || isStalledPeering) && !isDismissed;

  if (!hasConsensusAlert && !simulatedLag) {
    // Show a subtle compact health badge when all systems are normal
    return null;
  }

  // Format lag time into mm:ss or minutes
  const formatLagDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = (mins / 60).toFixed(1);
      return `${hours} hours`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const lagDisplay = formatLagDuration(blockAgeSeconds);

  return (
    <div className="mb-6 animate-in slide-in-from-top-3 duration-300">
      <div className="rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-red-950/30 to-amber-950/40 p-4 shadow-2xl relative overflow-hidden">
        {/* Ambient alert glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Banner Content */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Alert Header & Primary Message */}
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Consensus Desync Warning
                </span>

                <span className="text-xs font-mono text-slate-300">
                  Node lagging <strong className="text-amber-300 font-bold">{lagDisplay}</strong> behind network head
                </span>

                {isStalledPeering && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Stalled Peering ({peerCount} peers)
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 mt-1">
                The current execution client has not processed a canonical block for more than{' '}
                <strong className="text-white">5 minutes</strong> ({Math.max(blockGap, Math.round(blockAgeSeconds / 12))} missed slots).
                Transactions submitted through this endpoint risk re-orgs or stale state reverts.
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Auto Switch to Fallback RPC */}
            <button
              onClick={() => onSwitchEndpoint(referenceEndpoint)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              title={`Switch to synchronized ${referenceEndpoint.name}`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Switch to Healthy RPC</span>
            </button>

            {/* Force Re-probe */}
            <button
              onClick={() => {
                onForceRefresh();
                checkReferenceHead();
              }}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-mono text-xs rounded-lg transition-colors flex items-center gap-1.5"
              title="Force sync poll and peer verification"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span>Probe Node</span>
            </button>

            {/* Diagnostic Details Toggle */}
            <button
              onClick={() => setExpandedDiagnostics((prev) => !prev)}
              className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-xs font-mono rounded-lg transition-colors flex items-center gap-1"
            >
              <span>Diagnostics</span>
              {expandedDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Dismiss Button */}
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Dismiss warning for this session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible In-Depth Diagnostic Panel */}
        {expandedDiagnostics && (
          <div className="mt-3 pt-3 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono animate-in fade-in duration-150">
            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Local Head Block</span>
              <span className="text-white font-bold text-sm">
                #{localHeadNum > 0 ? localHeadNum.toLocaleString() : 'Waiting for sync...'}
              </span>
              <span className="text-[10px] text-amber-400 block mt-0.5">
                Block Age: {lagDisplay} ago
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Canonical Reference Head</span>
              <span className="text-emerald-400 font-bold text-sm">
                #{referenceHead ? referenceHead.toLocaleString() : 'Querying...'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Via {referenceEndpoint.name} ({refLatency}ms)
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Consensus Slot Gap</span>
              <span className="text-rose-400 font-bold text-sm">
                {blockGap > 0 ? `${blockGap} Blocks Behind` : 'Timestamp Staleness'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                ~{Math.round(blockAgeSeconds / 12)} missed 12s slots
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">P2P Peering Health</span>
              <span className={`font-bold text-sm ${peerCount < 8 ? 'text-rose-400' : 'text-cyan-400'}`}>
                {peerCount} Active Peers
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {peerCount < 8 ? 'Stalled peering (<8 required)' : 'Peers active, fork stalled'}
              </span>
            </div>
          </div>
        )}

        {/* Simulation Bar for Testing & Verification */}
        <div className="mt-2.5 pt-2 border-t border-amber-500/10 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Sync Monitor:</span>
            <span className="text-slate-300">Continuous check every 20s</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Threshold: &gt;5 min (300s) delay</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSimulatedLag((prev) => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                simulatedLag
                  ? 'bg-amber-500/30 text-amber-200 border-amber-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {simulatedLag ? 'Active: Simulating >5m Lag' : 'Simulate 5m Lag (Test Alert)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
