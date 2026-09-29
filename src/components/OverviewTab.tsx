import React from 'react';
import { EthereumBlock, NodeMetrics } from '../types/ethereum';
import { hexToNumber, weiToGwei, formatAddress, decodeExtraData, timeAgo } from '../services/ethereumRpc';
import {
  Activity,
  Layers,
  Fuel,
  Cpu,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Server,
  Radio,
  Eye,
} from 'lucide-react';

interface OverviewTabProps {
  metrics: NodeMetrics | null;
  recentBlocks: EthereumBlock[];
  onSelectBlock: (block: EthereumBlock) => void;
  isLoading: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  metrics,
  recentBlocks,
  onSelectBlock,
  isLoading,
  autoRefresh,
  setAutoRefresh,
}) => {
  const currentBlock = recentBlocks[0] || null;
  const latestBlockNum = currentBlock ? hexToNumber(currentBlock.number) : (metrics?.blockNumber || 0);

  // Calculate average gas usage across recent blocks
  const avgGasUsage = recentBlocks.length > 0
    ? Math.round(
        recentBlocks.reduce((acc, b) => {
          const limit = hexToNumber(b.gasLimit);
          const used = hexToNumber(b.gasUsed);
          return acc + (limit > 0 ? (used / limit) * 100 : 50);
        }, 0) / recentBlocks.length
      )
    : 52;

  return (
    <div className="space-y-6">
      {/* Top Telemetry Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Head Block Height */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Execution Head</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Slot Live
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-white tabular-nums flex items-baseline gap-2">
            <span>#{latestBlockNum.toLocaleString()}</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Finalized: <span className="font-mono text-slate-300">#{metrics?.finalizedBlockNumber.toLocaleString() || '...'}</span></span>
            <span>Safe: <span className="font-mono text-slate-300">#{metrics?.safeBlockNumber.toLocaleString() || '...'}</span></span>
          </div>
        </div>

        {/* Metric 2: Base Fee & Gas Market */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Base Fee (EIP-1559)</span>
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-amber-300 tabular-nums flex items-baseline gap-1.5">
            <span>{metrics ? metrics.baseFeeGwei.toFixed(2) : '...'}</span>
            <span className="text-xs font-normal text-slate-400">Gwei</span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Priority: <span className="font-mono text-emerald-400">+1.5 Gwei</span></span>
            <span>Blob Fee: <span className="font-mono text-blue-400">1 wei</span></span>
          </div>
        </div>

        {/* Metric 3: Client & Sync Status */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Client Software</span>
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="mt-2 text-sm font-semibold font-mono tracking-tight text-white truncate">
            {metrics?.clientVersion ? metrics.clientVersion.split('/')[0] : 'Detecting...'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
            {metrics?.clientVersion || 'Ethereum JSON-RPC Node'}
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Status:</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Synced (Nominal)
            </span>
          </div>
        </div>

        {/* Metric 4: P2P Network Telemetry */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Node Telemetry</span>
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
              {metrics ? `${metrics.latencyMs}` : '...'}
              <span className="text-xs font-normal text-slate-400 ml-1">ms ping</span>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Peers: <span className="font-mono text-slate-200">{metrics?.peerCount || 'Public Node'}</span></span>
            <span>Chain ID: <span className="font-mono text-slate-200">{metrics?.chainId || 1}</span></span>
          </div>
        </div>
      </div>

      {/* Gas Utilization & EIP-1559 Dynamics Bar */}
      <div className="p-5 bg-slate-900/40 rounded-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              EIP-1559 Elastic Block Gas Target
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ethereum targets 15M gas (50% target). Gas above 50% raises the next block's base fee up to 12.5%; gas below lowers it.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>Avg: {avgGasUsage}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded border border-dashed border-slate-500" />
              <span>Target: 50%</span>
            </div>
          </div>
        </div>

        {/* Visual blocks gas chart */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
          {recentBlocks.slice(0, 12).map((block, idx) => {
            const num = hexToNumber(block.number);
            const gasLim = hexToNumber(block.gasLimit);
            const gasU = hexToNumber(block.gasUsed);
            const ratio = gasLim > 0 ? (gasU / gasLim) * 100 : 50;
            const isAboveTarget = ratio > 50;
            const baseFee = block.baseFeePerGas ? weiToGwei(block.baseFeePerGas).toFixed(1) : '—';

            return (
              <button
                key={block.hash || idx}
                onClick={() => onSelectBlock(block)}
                className="group p-2.5 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/90 hover:border-emerald-500/50 rounded-lg text-left transition-all"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>#{num % 1000}</span>
                  <span className={isAboveTarget ? 'text-amber-400' : 'text-blue-400'}>
                    {ratio.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-14 rounded mt-1.5 p-0.5 flex flex-col justify-end relative overflow-hidden">
                  {/* 50% target guideline */}
                  <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-slate-600/50 z-10" />
                  <div
                    className={`w-full rounded transition-all ${
                      ratio > 80 ? 'bg-amber-500/80' : 'bg-emerald-500/70'
                    } group-hover:bg-emerald-400`}
                    style={{ height: `${Math.min(100, ratio)}%` }}
                  />
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-1">
                  {baseFee} Gwei
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Canonical Recent Blocks Table */}
      <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Canonical Blocks Stream</h3>
            <span className="text-xs text-slate-400">· Real-time from connected node</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Auto-poll (8s)</span>
            </label>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400">
              Showing <span className="font-mono text-white">{recentBlocks.length}</span> blocks
            </span>
          </div>
        </div>

        {/* Blocks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-medium text-[11px]">
                <th className="py-3 px-4">Block Height</th>
                <th className="py-3 px-4">Age</th>
                <th className="py-3 px-4">Builder / Proposer</th>
                <th className="py-3 px-4">Transactions</th>
                <th className="py-3 px-4">Gas Utilization</th>
                <th className="py-3 px-4">Base Fee</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recentBlocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    {isLoading ? 'Polling canonical blocks from Ethereum node...' : 'No blocks available. Click refresh or test RPC endpoint.'}
                  </td>
                </tr>
              ) : (
                recentBlocks.map((block) => {
                  const blockNum = hexToNumber(block.number);
                  const gasLimit = hexToNumber(block.gasLimit);
                  const gasUsed = hexToNumber(block.gasUsed);
                  const gasPercent = gasLimit > 0 ? ((gasUsed / gasLimit) * 100).toFixed(1) : '0';
                  const baseFeeGwei = block.baseFeePerGas ? weiToGwei(block.baseFeePerGas).toFixed(2) : '—';
                  const extraTag = decodeExtraData(block.extraData);
                  const timestamp = hexToNumber(block.timestamp);
                  const txCount = block.transactions ? block.transactions.length : 0;

                  return (
                    <tr
                      key={block.hash}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => onSelectBlock(block)}
                    >
                      <td className="py-3 px-4 font-semibold text-emerald-400">
                        #{blockNum.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-sans">
                        {timestamp ? timeAgo(timestamp) : 'Just now'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-sans font-medium text-slate-200">
                            {extraTag !== 'N/A' && extraTag !== 'Bytes'
                              ? extraTag
                              : formatAddress(block.miner)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatAddress(block.miner)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {txCount} <span className="text-[11px] text-slate-500 font-sans">txs</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                            <span>{gasPercent}%</span>
                            <span className="text-slate-500">{(gasUsed / 1e6).toFixed(1)}M</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                Number(gasPercent) > 75 ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.min(100, Number(gasPercent))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {baseFeeGwei} <span className="text-slate-500 font-sans text-[11px]">Gwei</span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBlock(block);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors font-sans"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
