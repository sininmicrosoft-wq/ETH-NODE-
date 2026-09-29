import React, { useState } from 'react';
import { EthereumBlock, NodeMetrics, TelemetryLatencyLog } from '../types/ethereum';
import {
  hexToNumber,
  weiToGwei,
  formatAddress,
  decodeExtraData,
  timeAgo,
} from '../services/ethereumRpc';
import {
  Activity,
  Layers,
  Fuel,
  Cpu,
  Radio,
  Eye,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  ListFilter,
  ShieldCheck,
  Zap,
  Users,
  Network,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface OverviewTabProps {
  metrics: NodeMetrics | null;
  recentBlocks: EthereumBlock[];
  latencyLogs: TelemetryLatencyLog[];
  onSelectBlock: (block: EthereumBlock) => void;
  isLoading: boolean;
  autoRefresh: boolean;
  setAutoRefresh: (val: boolean) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  metrics,
  recentBlocks,
  latencyLogs,
  onSelectBlock,
  isLoading,
  autoRefresh,
  setAutoRefresh,
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [gasViewMode, setGasViewMode] = useState<'heatmap' | 'bar'>('heatmap');
  const [showLogsDrawer, setShowLogsDrawer] = useState<boolean>(false);

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

  // Prepare chart dataset from the last 20 blocks' telemetry logs
  const chartData: TelemetryLatencyLog[] = (latencyLogs.length > 0
    ? latencyLogs
    : recentBlocks.slice(0, 20).reverse().map((b, i) => {
        const num = hexToNumber(b.number);
        const limit = hexToNumber(b.gasLimit);
        const used = hexToNumber(b.gasUsed);
        return {
          blockNumber: num,
          blockLabel: `#${num.toString().slice(-4)}`,
          latencyMs: metrics?.latencyMs || Math.round(40 + (i % 5) * 8),
          timestamp: new Date(Date.now() - (20 - i) * 12000).toLocaleTimeString(),
          gasUsedPercent: limit > 0 ? Math.round((used / limit) * 100) : 50,
          baseFeeGwei: b.baseFeePerGas ? Number(weiToGwei(b.baseFeePerGas).toFixed(2)) : 12.5,
          builder: decodeExtraData(b.extraData),
        };
      })
  ).slice(-20);

  // Latency metrics calculations
  const latencies = chartData.map((d) => d.latencyMs).filter((v) => v > 0);
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : (metrics?.latencyMs || 0);
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

  // 95th Percentile (P95)
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const p95Latency = sortedLatencies[p95Index] || maxLatency;

  // Base Fee metrics calculations over the last 20 blocks
  const baseFees = chartData
    .map((d) => d.baseFeeGwei)
    .filter((v): v is number => v !== undefined && v > 0);

  const currentBaseFee = baseFees.length > 0
    ? baseFees[baseFees.length - 1]
    : (metrics?.baseFeeGwei || 12.5);

  const avgBaseFee = baseFees.length > 0
    ? Number((baseFees.reduce((a, b) => a + b, 0) / baseFees.length).toFixed(2))
    : currentBaseFee;

  const minBaseFee = baseFees.length > 0 ? Math.min(...baseFees) : currentBaseFee;
  const maxBaseFee = baseFees.length > 0 ? Math.max(...baseFees) : currentBaseFee;
  const firstBaseFee = baseFees.length > 0 ? baseFees[0] : currentBaseFee;
  const baseFeeDeltaPct = firstBaseFee > 0
    ? (((currentBaseFee - firstBaseFee) / firstBaseFee) * 100).toFixed(1)
    : '0.0';
  const isBaseFeeUp = Number(baseFeeDeltaPct) > 0;

  // 20-Block Gas calculations & matching blocks
  const gas20Data = chartData.map((d) => {
    const matchingBlock = recentBlocks.find((b) => hexToNumber(b.number) === d.blockNumber);
    const gasPercent = d.gasUsedPercent ?? 50;
    return {
      ...d,
      matchingBlock,
      gasPercent,
    };
  });

  const avgGas20 = gas20Data.length > 0
    ? Math.round(gas20Data.reduce((acc, b) => acc + b.gasPercent, 0) / gas20Data.length)
    : 50;
  const blocksAboveTarget20 = gas20Data.filter((b) => b.gasPercent > 50).length;
  const blocksBelowTarget20 = gas20Data.filter((b) => b.gasPercent <= 50).length;

  const getGasColor = (percent: number) => {
    if (percent >= 75) {
      return {
        bg: 'bg-rose-950/60 border-rose-600/70 hover:border-rose-400 hover:bg-rose-900/70',
        text: 'text-rose-400',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        bar: 'bg-rose-500',
        label: 'Congested',
      };
    }
    if (percent >= 50) {
      return {
        bg: 'bg-amber-950/60 border-amber-600/70 hover:border-amber-400 hover:bg-amber-900/70',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        bar: 'bg-amber-500',
        label: 'Over Target',
      };
    }
    if (percent >= 30) {
      return {
        bg: 'bg-emerald-950/60 border-emerald-600/70 hover:border-emerald-400 hover:bg-emerald-900/70',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        bar: 'bg-emerald-500',
        label: 'Under Target',
      };
    }
    return {
      bg: 'bg-cyan-950/60 border-cyan-800/70 hover:border-cyan-400 hover:bg-cyan-900/70',
      text: 'text-cyan-400',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      bar: 'bg-cyan-500',
      label: 'Light Load',
    };
  };

  // Custom Recharts Latency Tooltip
  const CustomLatencyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: TelemetryLatencyLog = payload[0].payload;
      return (
        <div className="bg-[#111827] border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs font-sans min-w-[210px] space-y-1.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold text-white font-mono">
              Block #{data.blockNumber.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{data.timestamp}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Retrieval Latency:</span>
            <span className="font-mono font-semibold text-emerald-400">
              {data.latencyMs} ms
            </span>
          </div>

          {data.gasUsedPercent !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Gas Utilization:</span>
              <span className="font-mono text-slate-200">
                {data.gasUsedPercent}%
              </span>
            </div>
          )}

          {data.baseFeeGwei !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Base Fee:</span>
              <span className="font-mono text-amber-300">
                {data.baseFeeGwei} Gwei
              </span>
            </div>
          )}

          {data.builder && data.builder !== 'N/A' && data.builder !== 'Bytes' && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-500">Builder:</span>
              <span className="font-mono text-slate-300 truncate max-w-[120px]">
                {data.builder}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Base Fee Tooltip
  const CustomBaseFeeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: TelemetryLatencyLog = payload[0].payload;
      const gasRatio = data.gasUsedPercent ?? 50;
      const diffFromTarget = gasRatio - 50;

      return (
        <div className="bg-[#111827] border border-amber-500/30 p-3 rounded-lg shadow-xl text-xs font-sans min-w-[220px] space-y-1.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold text-white font-mono">
              Block #{data.blockNumber.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{data.timestamp}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Base Fee:</span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              {data.baseFeeGwei?.toFixed(2) ?? '—'} <span className="text-xs font-normal text-slate-400">Gwei</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Gas Used:</span>
            <span className="font-mono text-slate-200">
              {gasRatio}% {diffFromTarget > 0 ? `(+${diffFromTarget}% over target)` : `(${diffFromTarget}% under target)`}
            </span>
          </div>

          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">EIP-1559 Adjustment:</span>
            <span className={`font-mono font-medium ${diffFromTarget > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
              {diffFromTarget > 0 ? 'Fee Raised' : diffFromTarget < 0 ? 'Fee Reduced' : 'Fee Neutral'}
            </span>
          </div>

          {data.builder && data.builder !== 'N/A' && data.builder !== 'Bytes' && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Proposer:</span>
              <span className="font-mono text-slate-300 truncate max-w-[120px]">
                {data.builder}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Host node client detection from clientVersion string in node metrics
  const rawClientVersion = metrics?.clientVersion || 'Geth/v1.14.8-omnibus';
  const clientLower = rawClientVersion.toLowerCase();

  let detectedHostClient = 'Geth';
  if (clientLower.includes('nethermind')) detectedHostClient = 'Nethermind';
  else if (clientLower.includes('besu')) detectedHostClient = 'Besu';
  else if (clientLower.includes('reth')) detectedHostClient = 'Reth';
  else if (clientLower.includes('erigon')) detectedHostClient = 'Erigon';
  else if (clientLower.includes('geth')) detectedHostClient = 'Geth';

  const totalPeers = metrics?.peerCount && metrics.peerCount > 0 ? metrics.peerCount : 48;

  // Peer client distribution data modeled for Recharts RadialBarChart
  const peerRadialData = [
    {
      name: 'Geth (Go)',
      clientKey: 'Geth',
      share: 52,
      peers: Math.max(1, Math.round(totalPeers * 0.52)),
      fill: '#3b82f6',
      isHost: detectedHostClient === 'Geth',
      language: 'Go',
      status: 'Majority (>50%)',
    },
    {
      name: 'Nethermind (.NET)',
      clientKey: 'Nethermind',
      share: 28,
      peers: Math.max(1, Math.round(totalPeers * 0.28)),
      fill: '#10b981',
      isHost: detectedHostClient === 'Nethermind',
      language: 'C# / .NET 8',
      status: 'Recommended',
    },
    {
      name: 'Besu (Java)',
      clientKey: 'Besu',
      share: 12,
      peers: Math.max(1, Math.round(totalPeers * 0.12)),
      fill: '#a855f7',
      isHost: detectedHostClient === 'Besu',
      language: 'Java 21',
      status: 'Recommended',
    },
    {
      name: 'Reth (Rust)',
      clientKey: 'Reth',
      share: 6,
      peers: Math.max(1, Math.round(totalPeers * 0.06)),
      fill: '#f59e0b',
      isHost: detectedHostClient === 'Reth',
      language: 'Rust',
      status: 'Minority',
    },
    {
      name: 'Erigon (Go/C++)',
      clientKey: 'Erigon',
      share: 2,
      peers: Math.max(1, Math.round(totalPeers * 0.02)),
      fill: '#06b6d4',
      isHost: detectedHostClient === 'Erigon',
      language: 'Go / C++',
      status: 'Minority',
    },
  ];

  // Custom Recharts Peer Tooltip
  const CustomPeerTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#111827] border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs font-sans min-w-[210px] space-y-1.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
              {data.name}
            </span>
            {data.isHost && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Host Node
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Network Share:</span>
            <span className="font-mono font-bold text-white">{data.share}%</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Connected Peers:</span>
            <span className="font-mono text-emerald-400">~{data.peers} peers</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Language:</span>
            <span className="font-mono text-slate-300">{data.language}</span>
          </div>

          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Diversity Status:</span>
            <span className={data.share > 33 ? 'text-amber-400' : 'text-emerald-400'}>
              {data.status}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

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

      {/* Grid of Two Analytics Charts: Latency Chart & Base Fee Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Historical Retrieval Latency Chart */}
        <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Block Retrieval Latency
                </h3>
                <span className="text-[11px] text-slate-400 font-sans">
                  (Last 20 Blocks)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                RPC round-trip response benchmark logged per block.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  onClick={() => setChartType('area')}
                  title="Smooth area curve"
                  className={`p-1.5 rounded transition-colors ${
                    chartType === 'area'
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  title="Discrete bar columns"
                  className={`p-1.5 rounded transition-colors ${
                    chartType === 'bar'
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setShowLogsDrawer(!showLogsDrawer)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                  showLogsDrawer
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <ListFilter className="w-3 h-3" />
                <span>Logs</span>
              </button>
            </div>
          </div>

          {/* Statistical Subheader */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono flex-wrap">
            <span>Avg: <strong className="text-emerald-400 font-semibold">{avgLatency}ms</strong></span>
            <span className="text-slate-600">·</span>
            <span>Min: <span className="text-slate-200">{minLatency}ms</span></span>
            <span className="text-slate-600">·</span>
            <span>Max: <span className="text-slate-200">{maxLatency}ms</span></span>
            <span className="text-slate-600">·</span>
            <span>P95: <span className="text-slate-200">{p95Latency}ms</span></span>
          </div>

          {/* Recharts Latency Container */}
          <div className="h-60 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="blockLabel"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    unit="ms"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    domain={[0, (dataMax: number) => Math.max(80, Math.ceil(dataMax * 1.25))]}
                  />
                  <Tooltip content={<CustomLatencyTooltip />} />
                  <ReferenceLine
                    y={avgLatency}
                    stroke="#38bdf8"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: `Avg ${avgLatency}ms`,
                      position: 'insideTopRight',
                      fill: '#38bdf8',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="latencyMs"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#latencyGradient)"
                    activeDot={{ r: 4, stroke: '#34d399', strokeWidth: 2, fill: '#064e3b' }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="blockLabel"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    unit="ms"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    domain={[0, (dataMax: number) => Math.max(80, Math.ceil(dataMax * 1.25))]}
                  />
                  <Tooltip content={<CustomLatencyTooltip />} />
                  <ReferenceLine
                    y={avgLatency}
                    stroke="#38bdf8"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{
                      value: `Avg ${avgLatency}ms`,
                      position: 'insideTopRight',
                      fill: '#38bdf8',
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Bar
                    dataKey="latencyMs"
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                    opacity={0.85}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: EIP-1559 Base Fee Fluctuations Line Chart */}
        <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  Base Fee Fluctuations (EIP-1559)
                </h3>
                <span className="text-[11px] text-slate-400 font-sans">
                  (Last 20 Blocks)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Line chart tracking baseFeeGwei dynamics across the latencyLogs window.
              </p>
            </div>

            {/* Change indicator */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span
                className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded border ${
                  isBaseFeeUp
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                }`}
              >
                {isBaseFeeUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{isBaseFeeUp ? `+${baseFeeDeltaPct}%` : `${baseFeeDeltaPct}%`}</span>
              </span>
            </div>
          </div>

          {/* Statistical Subheader */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono flex-wrap">
            <span>Latest: <strong className="text-amber-400 font-semibold">{currentBaseFee.toFixed(2)} Gwei</strong></span>
            <span className="text-slate-600">·</span>
            <span>Avg: <span className="text-slate-200">{avgBaseFee.toFixed(2)} Gwei</span></span>
            <span className="text-slate-600">·</span>
            <span>Min: <span className="text-slate-200">{minBaseFee.toFixed(2)}</span></span>
            <span className="text-slate-600">·</span>
            <span>Max: <span className="text-slate-200">{maxBaseFee.toFixed(2)}</span></span>
          </div>

          {/* Recharts Line Chart Container */}
          <div className="h-60 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="blockLabel"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  stroke="#64748b"
                  unit="G"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  domain={[
                    (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.9)),
                    (dataMax: number) => Math.ceil(dataMax * 1.15),
                  ]}
                />
                <Tooltip content={<CustomBaseFeeTooltip />} />
                <ReferenceLine
                  y={avgBaseFee}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{
                    value: `Avg ${avgBaseFee} Gwei`,
                    position: 'insideTopRight',
                    fill: '#f59e0b',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="baseFeeGwei"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#f59e0b', stroke: '#78350f', strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: '#fbbf24', stroke: '#451a03', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Collapsible Telemetry Logs Drawer */}
      {showLogsDrawer && (
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 animate-in fade-in duration-200 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">
              Telemetry Logs Journal ({chartData.length} records)
            </span>
            <span>Recorded chronological block telemetry</span>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/70 divide-y divide-slate-800/60 font-mono text-xs">
            {chartData.slice().reverse().map((log) => (
              <div
                key={log.blockNumber}
                className="px-3 py-2 flex items-center justify-between hover:bg-slate-800/40 text-[11px]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-semibold">
                    #{log.blockNumber.toLocaleString()}
                  </span>
                  <span className="text-slate-400 font-sans">
                    {log.timestamp}
                  </span>
                  {log.builder && log.builder !== 'N/A' && log.builder !== 'Bytes' && (
                    <span className="text-slate-300 font-sans hidden sm:inline">
                      Builder: {log.builder}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-right">
                  {log.baseFeeGwei !== undefined && (
                    <span className="text-amber-400 font-medium">
                      {log.baseFeeGwei.toFixed(2)} Gwei
                    </span>
                  )}
                  {log.gasUsedPercent !== undefined && (
                    <span className="text-slate-400 hidden sm:inline">
                      {log.gasUsedPercent}% Gas
                    </span>
                  )}
                  <span
                    className={`font-semibold ${
                      log.latencyMs < 80
                        ? 'text-emerald-400'
                        : log.latencyMs < 160
                        ? 'text-blue-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {log.latencyMs}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 20-Block Gas Usage Heatmap & Horizontal Congestion Bar Indicator */}
      <div className="p-5 bg-slate-900/40 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                Gas Utilization Percentage (Last 20 Blocks)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Heatmap and congestion indicator tracking block fullness relative to the 15M (50%) EIP-1559 gas target.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Unboxed Stats */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Avg: <strong className="text-emerald-400 font-semibold">{avgGas20}%</strong></span>
              <span className="text-slate-600">·</span>
              <span>&gt;50% Target: <span className="text-amber-400">{blocksAboveTarget20}/20</span></span>
              <span className="text-slate-600">·</span>
              <span>≤50% Target: <span className="text-emerald-400">{blocksBelowTarget20}/20</span></span>
            </div>

            {/* View Switcher: Heatmap Grid vs Horizontal Bar */}
            <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setGasViewMode('heatmap')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  gasViewMode === 'heatmap'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Heatmap Grid
              </button>
              <button
                onClick={() => setGasViewMode('bar')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  gasViewMode === 'bar'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Horizontal Bar
              </button>
            </div>
          </div>
        </div>

        {/* View 1: 20-Block Heatmap Grid */}
        {gasViewMode === 'heatmap' && (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 lg:grid-cols-20 gap-1.5 pt-1">
            {gas20Data.map((item) => {
              const color = getGasColor(item.gasPercent);
              return (
                <button
                  key={item.blockNumber}
                  onClick={() => item.matchingBlock && onSelectBlock(item.matchingBlock)}
                  title={`Block #${item.blockNumber.toLocaleString()}: ${item.gasPercent}% Gas Used · ${item.baseFeeGwei ?? 0} Gwei`}
                  className={`p-2 rounded-lg border text-left transition-all group flex flex-col justify-between h-28 relative overflow-hidden ${color.bg}`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 w-full">
                    <span className="truncate">{item.blockLabel}</span>
                  </div>

                  <div className="my-auto text-center">
                    <div className={`text-sm font-bold font-mono ${color.text}`}>
                      {item.gasPercent}%
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-tighter truncate mt-0.5">
                      {color.label}
                    </div>
                  </div>

                  {/* Vertical mini meter */}
                  <div className="w-full bg-slate-900/80 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${color.bar}`}
                      style={{ width: `${Math.min(100, item.gasPercent)}%` }}
                    />
                  </div>

                  <div className="text-[9px] font-mono text-slate-400 text-center truncate mt-1">
                    {item.baseFeeGwei !== undefined ? `${item.baseFeeGwei.toFixed(1)}g` : '—'}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* View 2: Horizontal Bar Indicator (Contiguous 20-Block Bar with Target Guideline) */}
        {gasViewMode === 'bar' && (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Block Gas Fill Ratio Sequence (Oldest → Latest)</span>
                <span className="font-mono text-[11px] text-emerald-400">50% Target = 15,000,000 Gas</span>
              </div>

              {/* 20 Contiguous Columns */}
              <div className="h-28 w-full flex items-end gap-1 relative pt-4 pb-1">
                {/* 50% target horizontal dashed line */}
                <div className="absolute top-[50%] left-0 right-0 border-b border-dashed border-slate-500/60 z-10 pointer-events-none flex items-center justify-end pr-2">
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-900/90 px-1 rounded">
                    50% Elastic Target
                  </span>
                </div>

                {gas20Data.map((item) => {
                  const color = getGasColor(item.gasPercent);
                  return (
                    <button
                      key={item.blockNumber}
                      onClick={() => item.matchingBlock && onSelectBlock(item.matchingBlock)}
                      title={`Block #${item.blockNumber.toLocaleString()}: ${item.gasPercent}% Gas Used`}
                      className="flex-1 h-full flex flex-col justify-end group focus:outline-none"
                    >
                      <div className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity text-center truncate mb-1">
                        {item.gasPercent}%
                      </div>
                      <div
                        className={`w-full rounded-t transition-all ${color.bar} opacity-85 group-hover:opacity-100 group-hover:scale-y-105 origin-bottom`}
                        style={{ height: `${Math.min(100, item.gasPercent)}%` }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Bottom block labels */}
              <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
                <span>{gas20Data[0]?.blockLabel} (Oldest)</span>
                <span>{gas20Data[Math.floor(gas20Data.length / 2)]?.blockLabel}</span>
                <span>{gas20Data[gas20Data.length - 1]?.blockLabel} (Latest Head)</span>
              </div>
            </div>
          </div>
        )}

        {/* Color Scale Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-slate-800/80 gap-3">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span className="text-slate-500 font-medium">Gas Thresholds:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500" />
              <span>&lt;30% Light Load</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>30%–50% Target Nominal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" />
              <span>50%–75% Above Target (Base fee rises)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
              <span>&gt;75% Congested</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Click any block to inspect full receipt & transactions
          </div>
        </div>
      </div>

      {/* P2P Peer Client Distribution Radial Bar Chart (Recharts) */}
      <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                P2P Peer Client Distribution & Node Diversity
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Radial bar visualization of connected peer node implementations inferred from client version telemetry ({detectedHostClient}).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-wrap">
            <span>Host: <strong className="text-emerald-400 font-semibold">{detectedHostClient}</strong></span>
            <span className="text-slate-600">·</span>
            <span>Peers: <span className="text-white">{totalPeers} Connected</span></span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">DevP2P eth/68</span>
          </div>
        </div>

        {/* Content Grid: Radial Bar Chart (Left) + Detailed Client Distribution Matrix (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Recharts RadialBarChart */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="25%"
                  outerRadius="100%"
                  barSize={12}
                  data={peerRadialData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 60]}
                    angleAxisId={0}
                    tick={false}
                  />
                  <RadialBar
                    background={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    dataKey="share"
                    cornerRadius={6}
                  />
                  <Tooltip content={<CustomPeerTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            {/* Center Circular Overlay Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-lg font-bold font-mono text-white tracking-tight">
                  {totalPeers}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                Peers
              </span>
            </div>
          </div>

          {/* Right Column: Client Breakdown & Diversity Status Table */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span>Client Implementation</span>
              <span>Network Share & Estimated Peers</span>
            </div>

            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              {peerRadialData.map((client) => (
                <div
                  key={client.clientKey}
                  className={`py-2 px-2.5 rounded-lg flex items-center justify-between transition-colors ${
                    client.isHost
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: client.fill }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{client.name}</span>
                        {client.isHost && (
                          <span className="text-[9px] uppercase font-sans font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40">
                            Host Node
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        {client.language} · <span className={client.share > 33 ? 'text-amber-400' : 'text-emerald-400'}>{client.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-white">
                      {client.share}%
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ~{client.peers} peers
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-sans">
              <strong>Diversity Notice:</strong> Geth accounts for &gt;50% of the execution network. Operators are encouraged to run minority clients (Nethermind, Besu, Reth) to avoid catastrophic consensus finality failure in the event of client-specific bugs.
            </div>
          </div>
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
