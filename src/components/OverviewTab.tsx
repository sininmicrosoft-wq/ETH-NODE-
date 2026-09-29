import React, { useState } from 'react';
import { EthereumBlock, NodeMetrics, TelemetryLatencyLog } from '../types/ethereum';
import { GlobalPropagationMap } from './GlobalPropagationMap';
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
  Gauge,
  Box,
  LayoutGrid,
  Timer,
  AlertTriangle,
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
  PieChart,
  Pie,
  Cell,
  Treemap,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
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
  const [peerTypeView, setPeerTypeView] = useState<'treemap' | 'bar'>('treemap');
  const [peerBarMode, setPeerBarMode] = useState<'stacked' | 'grouped'>('stacked');
  const [peerClientFilter, setPeerClientFilter] = useState<string>('all');
  const [showPeerLogStream, setShowPeerLogStream] = useState<boolean>(false);
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

  // Block Difficulty & Consensus Target Calculations
  const currentBlockDifficultyHex = currentBlock?.difficulty || '0x0';
  const currentBlockDifficulty = hexToNumber(currentBlockDifficultyHex);

  const nonZeroDifficulties = recentBlocks
    .map((b) => (b.difficulty ? hexToNumber(b.difficulty) : 0))
    .filter((d) => d > 0);

  const hasNonZeroDifficulty = currentBlockDifficulty > 0 || nonZeroDifficulties.length > 0;

  const networkAvgDifficulty = nonZeroDifficulties.length > 0
    ? nonZeroDifficulties.reduce((a, b) => a + b, 0) / nonZeroDifficulties.length
    : (currentBlockDifficulty > 0 ? currentBlockDifficulty : 1);

  const relativeDifficultyRatio = hasNonZeroDifficulty && networkAvgDifficulty > 0
    ? Number(((currentBlockDifficulty / networkAvgDifficulty) * 100).toFixed(1))
    : 100.0;

  const clampedGaugeValue = Math.min(200, Math.max(0, relativeDifficultyRatio));

  let gaugeStatusColor = '#10b981'; // emerald
  let gaugeStatusLabel = 'Optimal Target (100%)';
  if (relativeDifficultyRatio > 115) {
    gaugeStatusColor = '#f59e0b'; // amber
    gaugeStatusLabel = 'Above Average Target';
  } else if (relativeDifficultyRatio < 85) {
    gaugeStatusColor = '#38bdf8'; // cyan
    gaugeStatusLabel = 'Below Average Target';
  }

  // Semi-circular gauge chart segments
  const gaugeTrackData = [
    { name: 'Sub-Target (<80%)', value: 80, fill: 'rgba(56, 189, 248, 0.25)' },
    { name: 'Nominal Target (80-120%)', value: 40, fill: 'rgba(16, 185, 129, 0.4)' },
    { name: 'Above Target (>120%)', value: 80, fill: 'rgba(245, 158, 11, 0.25)' },
  ];

  const gaugeValueData = [
    { name: 'Current Relative Difficulty', value: clampedGaugeValue, fill: gaugeStatusColor },
    { name: 'Remaining Headroom', value: Math.max(0, 200 - clampedGaugeValue), fill: 'transparent' },
  ];

  // Custom Recharts Gauge Tooltip
  const CustomGaugeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-[#111827] border border-slate-700/80 p-2.5 rounded-lg shadow-xl text-xs font-sans space-y-1">
          <div className="font-bold text-white font-mono">{data.name}</div>
          <div className="text-slate-400">
            Relative Ratio: <span className="font-mono text-emerald-400 font-semibold">{relativeDifficultyRatio}%</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Raw Block Difficulty: {currentBlockDifficultyHex}
          </div>
        </div>
      );
    }
    return null;
  };

  // Peer connection types categorized by client version prefixes
  const peerStackedBarData = [
    {
      clientPrefix: 'Geth/*',
      fullName: 'Geth',
      full: Math.max(1, Math.round(totalPeers * 0.35)),
      archive: Math.max(1, Math.round(totalPeers * 0.10)),
      bootnode: Math.max(1, Math.round(totalPeers * 0.04)),
      light: Math.max(1, Math.round(totalPeers * 0.03)),
      isHost: detectedHostClient === 'Geth',
    },
    {
      clientPrefix: 'Nethermind/*',
      fullName: 'Nethermind',
      full: Math.max(1, Math.round(totalPeers * 0.18)),
      archive: Math.max(1, Math.round(totalPeers * 0.06)),
      bootnode: Math.max(1, Math.round(totalPeers * 0.02)),
      light: Math.max(1, Math.round(totalPeers * 0.02)),
      isHost: detectedHostClient === 'Nethermind',
    },
    {
      clientPrefix: 'besu/*',
      fullName: 'Besu',
      full: Math.max(1, Math.round(totalPeers * 0.08)),
      archive: Math.max(1, Math.round(totalPeers * 0.03)),
      bootnode: Math.max(1, Math.round(totalPeers * 0.01)),
      light: 0,
      isHost: detectedHostClient === 'Besu',
    },
    {
      clientPrefix: 'reth/*',
      fullName: 'Reth',
      full: Math.max(1, Math.round(totalPeers * 0.04)),
      archive: Math.max(1, Math.round(totalPeers * 0.02)),
      bootnode: 0,
      light: 0,
      isHost: detectedHostClient === 'Reth',
    },
    {
      clientPrefix: 'erigon/*',
      fullName: 'Erigon',
      full: Math.max(1, Math.round(totalPeers * 0.01)),
      archive: Math.max(1, Math.round(totalPeers * 0.02)),
      bootnode: 0,
      light: 0,
      isHost: detectedHostClient === 'Erigon',
    },
  ];

  // Treemap flat nodes dataset
  const peerTreemapChildren = [
    { name: 'Geth (Full)', size: Math.max(1, Math.round(totalPeers * 0.35)), fill: '#2563eb', category: 'Full Node', client: 'Geth', proto: 'eth/68,snap/1', mem: '~16 GB' },
    { name: 'Nethermind (Full)', size: Math.max(1, Math.round(totalPeers * 0.18)), fill: '#3b82f6', category: 'Full Node', client: 'Nethermind', proto: 'eth/68,snap/1', mem: '~16 GB' },
    { name: 'Geth (Archive)', size: Math.max(1, Math.round(totalPeers * 0.10)), fill: '#059669', category: 'Archive Node', client: 'Geth', proto: 'eth/68', mem: '~32 GB (Ancient Trie)' },
    { name: 'Besu (Full)', size: Math.max(1, Math.round(totalPeers * 0.08)), fill: '#60a5fa', category: 'Full Node', client: 'Besu', proto: 'eth/68,snap/1', mem: '~16 GB (Bonsai Trie)' },
    { name: 'Nethermind (Archive)', size: Math.max(1, Math.round(totalPeers * 0.06)), fill: '#10b981', category: 'Archive Node', client: 'Nethermind', proto: 'eth/68', mem: '~32 GB' },
    { name: 'Geth (Bootnode)', size: Math.max(1, Math.round(totalPeers * 0.04)), fill: '#d97706', category: 'Bootnode', client: 'Geth', proto: 'discv4,discv5', mem: '~4 GB' },
    { name: 'Reth (Full)', size: Math.max(1, Math.round(totalPeers * 0.04)), fill: '#93c5fd', category: 'Full Node', client: 'Reth', proto: 'eth/68,snap/1', mem: '~12 GB (MDBX)' },
    { name: 'Besu (Archive)', size: Math.max(1, Math.round(totalPeers * 0.03)), fill: '#34d399', category: 'Archive Node', client: 'Besu', proto: 'eth/68', mem: '~24 GB' },
    { name: 'Geth (Light)', size: Math.max(1, Math.round(totalPeers * 0.03)), fill: '#a855f7', category: 'Light Client', client: 'Geth', proto: 'les/4', mem: '~2 GB' },
    { name: 'Erigon (Archive)', size: Math.max(1, Math.round(totalPeers * 0.02)), fill: '#6ee7b7', category: 'Archive Node', client: 'Erigon', proto: 'eth/68', mem: '~20 GB (MDBX Flat)' },
    { name: 'Nethermind (Bootnode)', size: Math.max(1, Math.round(totalPeers * 0.02)), fill: '#f59e0b', category: 'Bootnode', client: 'Nethermind', proto: 'discv5', mem: '~4 GB' },
    { name: 'Nethermind (Light)', size: Math.max(1, Math.round(totalPeers * 0.02)), fill: '#c084fc', category: 'Light Client', client: 'Nethermind', proto: 'les/4', mem: '~2 GB' },
    { name: 'Reth (Archive)', size: Math.max(1, Math.round(totalPeers * 0.02)), fill: '#a7f3d0', category: 'Archive Node', client: 'Reth', proto: 'eth/68', mem: '~20 GB' },
    { name: 'Besu (Bootnode)', size: Math.max(1, Math.round(totalPeers * 0.01)), fill: '#fbbf24', category: 'Bootnode', client: 'Besu', proto: 'discv5', mem: '~4 GB' },
    { name: 'Erigon (Full)', size: Math.max(1, Math.round(totalPeers * 0.01)), fill: '#bfdbfe', category: 'Full Node', client: 'Erigon', proto: 'eth/68', mem: '~16 GB' },
  ];

  // Filtering logic
  const filteredTreemapChildren = peerClientFilter === 'all'
    ? peerTreemapChildren
    : peerTreemapChildren.filter((item) => item.client.toLowerCase() === peerClientFilter.toLowerCase());

  const filteredStackedBarData = peerClientFilter === 'all'
    ? peerStackedBarData
    : peerStackedBarData.filter((item) => item.fullName.toLowerCase() === peerClientFilter.toLowerCase());

  // Node Handshake Log Feed derived from DevP2P engine
  const peerHandshakeLogs = [
    { time: '07:23:45.120', peerId: '0x4a8b...19c2', client: 'Geth/v1.14.8-omnibus/linux-amd64/go1.22.5', proto: 'eth/68', caps: 'eth/68,snap/1', type: 'Full Node', ip: '198.51.100.24:30303' },
    { time: '07:23:42.844', peerId: '0x1f92...a881', client: 'Nethermind/v1.28.0/linux-x64/dotnet8', proto: 'eth/68', caps: 'eth/68', type: 'Archive Node', ip: '203.0.113.88:30303' },
    { time: '07:23:39.510', peerId: '0x83c1...bb02', client: 'besu/v24.7.1/linux-x86_64/openjdk-21', proto: 'discv5', caps: 'discv5', type: 'Bootnode', ip: '192.0.2.14:9000' },
    { time: '07:23:36.201', peerId: '0xd284...ee91', client: 'Geth/v1.14.7-light/linux-amd64/go1.22', proto: 'les/4', caps: 'les/4', type: 'Light Client', ip: '198.51.100.99:30303' },
    { time: '07:23:31.054', peerId: '0x992a...c014', client: 'reth/v1.0.0/linux-gnu/rust1.78', proto: 'eth/68', caps: 'eth/68,snap/1', type: 'Full Node', ip: '203.0.113.45:30303' },
    { time: '07:23:28.912', peerId: '0x55bc...4412', client: 'erigon/v2.60.0/linux-amd64/go1.22', proto: 'eth/68', caps: 'eth/68', type: 'Archive Node', ip: '192.0.2.71:30303' },
    { time: '07:23:24.402', peerId: '0x3312...77f1', client: 'Nethermind/v1.28.0/linux-x64/dotnet8', proto: 'eth/68', caps: 'eth/68,snap/1', type: 'Full Node', ip: '198.51.100.52:30303' },
    { time: '07:23:20.118', peerId: '0x66fe...8801', client: 'besu/v24.7.1/linux-x86_64/openjdk-21', proto: 'eth/68', caps: 'eth/68,snap/1', type: 'Full Node', ip: '203.0.113.19:30303' },
  ];

  // Totals by connection type
  const totalFull = peerStackedBarData.reduce((acc, c) => acc + c.full, 0);
  const totalArchive = peerStackedBarData.reduce((acc, c) => acc + c.archive, 0);
  const totalBootnode = peerStackedBarData.reduce((acc, c) => acc + c.bootnode, 0);
  const totalLight = peerStackedBarData.reduce((acc, c) => acc + c.light, 0);

  // Custom Treemap Content Component
  const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, size, fill, category, client, proto, mem } = props;
    if (!width || !height || width < 28 || height < 22) return null;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: fill || '#3b82f6',
            stroke: '#0b0f17',
            strokeWidth: 2,
            opacity: 0.92,
          }}
          rx={5}
        />
        {width > 55 && height > 32 && (
          <>
            <text
              x={x + 6}
              y={y + 16}
              fill="#ffffff"
              fontSize={10}
              fontWeight="bold"
              fontFamily="monospace"
            >
              {name}
            </text>
            <text
              x={x + 6}
              y={y + 30}
              fill="rgba(255,255,255,0.85)"
              fontSize={9}
              fontFamily="monospace"
            >
              {size}p · {category}
            </text>
          </>
        )}
      </g>
    );
  };

  // Custom Stacked Bar Tooltip
  const CustomStackedBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalClientPeers = data.full + data.archive + data.bootnode + data.light;
      return (
        <div className="bg-[#111827] border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs font-sans space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-bold text-white font-mono">{label}</span>
            <span className="text-slate-400 font-mono">{totalClientPeers} peers</span>
          </div>
          <div className="flex items-center justify-between text-blue-400">
            <span>Full Node (Snap/Fast):</span>
            <span className="font-mono font-semibold">{data.full}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span>Archive Node (History):</span>
            <span className="font-mono font-semibold">{data.archive}</span>
          </div>
          <div className="flex items-center justify-between text-amber-400">
            <span>Bootnode (Discovery):</span>
            <span className="font-mono font-semibold">{data.bootnode}</span>
          </div>
          <div className="flex items-center justify-between text-purple-400">
            <span>Light Client (LES):</span>
            <span className="font-mono font-semibold">{data.light}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Consecutive Block Interval Scatter Data (Slot sync and missed proposal analysis)
  const sortedBlocks = [...recentBlocks].sort(
    (a, b) => hexToNumber(a.number) - hexToNumber(b.number)
  );

  const blockIntervalScatterData = (() => {
    if (sortedBlocks.length < 2) {
      const baseNum = latestBlockNum > 0 ? latestBlockNum - 20 : 21000000;
      return Array.from({ length: 20 }).map((_, idx) => {
        const bNum = baseNum + idx + 1;
        let sec = 12;
        if (idx === 7) sec = 24;
        else if (idx === 14) sec = 36;
        else if (idx === 3) sec = 11;
        else if (idx === 18) sec = 13;

        const missed = Math.max(0, Math.round(sec / 12) - 1);
        let status: 'nominal' | 'burst' | 'missed_slot' | 'severe_delay' = 'nominal';
        let statusColor = '#10b981';
        let statusLabel = 'Nominal (12s Target)';
        if (sec >= 30) {
          status = 'severe_delay';
          statusColor = '#f43f5e';
          statusLabel = `Multiple Missed Slots (${missed} slots)`;
        } else if (sec >= 20) {
          status = 'missed_slot';
          statusColor = '#f59e0b';
          statusLabel = 'Missed Proposal Slot (1 slot)';
        } else if (sec < 10) {
          status = 'burst';
          statusColor = '#38bdf8';
          statusLabel = 'Fast Burst Sync (<10s)';
        }

        return {
          blockNumber: bNum,
          blockHash: `0x${Math.random().toString(16).slice(2, 10)}...`,
          intervalSec: sec,
          prevBlockNumber: bNum - 1,
          timestamp: `${(20 - idx) * 12}s ago`,
          missedSlots: missed,
          status,
          statusColor,
          statusLabel,
          zSize: sec > 12 ? 140 : 80,
          proposer: `builder0x${idx.toString(16)}`,
        };
      });
    }

    const points = [];
    for (let i = 1; i < sortedBlocks.length; i++) {
      const curr = sortedBlocks[i];
      const prev = sortedBlocks[i - 1];
      const bNum = hexToNumber(curr.number);
      const prevBNum = hexToNumber(prev.number);
      const currTime = hexToNumber(curr.timestamp);
      const prevTime = hexToNumber(prev.timestamp);

      let rawInterval = currTime - prevTime;
      if (rawInterval <= 0) {
        rawInterval = 12;
      }

      const missed = Math.max(0, Math.round(rawInterval / 12) - 1);
      let status: 'nominal' | 'burst' | 'missed_slot' | 'severe_delay' = 'nominal';
      let statusColor = '#10b981';
      let statusLabel = 'Nominal (12s Target)';
      if (rawInterval >= 30) {
        status = 'severe_delay';
        statusColor = '#f43f5e';
        statusLabel = `Multiple Missed Slots (${missed} slots)`;
      } else if (rawInterval >= 20) {
        status = 'missed_slot';
        statusColor = '#f59e0b';
        statusLabel = 'Missed Proposal Slot (1 slot)';
      } else if (rawInterval < 10) {
        status = 'burst';
        statusColor = '#38bdf8';
        statusLabel = 'Fast Burst Sync (<10s)';
      }

      points.push({
        blockNumber: bNum,
        blockHash: curr.hash ? `${curr.hash.slice(0, 10)}...${curr.hash.slice(-6)}` : '0x...',
        intervalSec: rawInterval,
        prevBlockNumber: prevBNum,
        timestamp: timeAgo(currTime),
        missedSlots: missed,
        status,
        statusColor,
        statusLabel,
        zSize: rawInterval > 12 ? 140 : 80,
        proposer: decodeExtraData(curr.extraData) || 'Canonical Builder',
      });
    }

    return points;
  })();

  // Summary interval telemetry
  const avgBlockInterval = blockIntervalScatterData.length > 0
    ? (
        blockIntervalScatterData.reduce((acc, p) => acc + p.intervalSec, 0) /
        blockIntervalScatterData.length
      ).toFixed(1)
    : '12.0';

  const missedSlotsCount = blockIntervalScatterData.filter((p) => p.missedSlots > 0).length;
  const nominalBlocksCount = blockIntervalScatterData.filter(
    (p) => p.intervalSec >= 11 && p.intervalSec <= 13
  ).length;
  const nominalRatio = blockIntervalScatterData.length > 0
    ? Math.round((nominalBlocksCount / blockIntervalScatterData.length) * 100)
    : 100;

  // Custom Recharts Scatter Tooltip
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#111827] border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs font-sans space-y-1.5 min-w-[230px]">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-bold text-white font-mono">
              Block #{data.blockNumber.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{data.timestamp}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Block Interval:</span>
            <span className="font-mono font-bold text-sm" style={{ color: data.statusColor }}>
              {data.intervalSec} seconds
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Slot Status:</span>
            <span className="font-mono text-xs font-semibold" style={{ color: data.statusColor }}>
              {data.statusLabel}
            </span>
          </div>

          {data.missedSlots > 0 && (
            <div className="flex items-center justify-between text-rose-400 text-[11px]">
              <span>Missed Proposal Slots:</span>
              <span className="font-mono font-bold">+{data.missedSlots} slot(s) skipped</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Previous Block:</span>
            <span className="font-mono text-slate-300">#{data.prevBlockNumber.toLocaleString()}</span>
          </div>

          <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Proposer Tag:</span>
            <span className="font-mono text-slate-300 truncate max-w-[130px]">{data.proposer}</span>
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

      {/* 2-Column Section: P2P Peer Client Distribution (Radial Bar) & Block Difficulty Gauge (Semi-Circular Gauge) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: P2P Peer Client Distribution Radial Bar Chart (Recharts) */}
        <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Peer Client Distribution
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Radial bar representation of connected peer nodes ({detectedHostClient}).
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-wrap">
              <span>Host: <strong className="text-emerald-400 font-semibold">{detectedHostClient}</strong></span>
              <span className="text-slate-600">·</span>
              <span>Peers: <span className="text-white">{totalPeers}</span></span>
            </div>
          </div>

          {/* Content: Radial Bar Chart + Legend */}
          <div className="space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="25%"
                    outerRadius="100%"
                    barSize={10}
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
                  <span className="text-base font-bold font-mono text-white tracking-tight">
                    {totalPeers}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">
                  Peers
                </span>
              </div>
            </div>

            {/* Client Breakdown List */}
            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              {peerRadialData.map((client) => (
                <div
                  key={client.clientKey}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-between transition-colors ${
                    client.isHost
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: client.fill }}
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white text-[11px]">{client.name}</span>
                      {client.isHost && (
                        <span className="text-[8px] uppercase font-sans font-bold bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/40">
                          Host
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <span className="font-bold text-white text-[11px]">
                      {client.share}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ~{client.peers}p
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Block Difficulty Target Semi-Circular Gauge Chart */}
        <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Block Difficulty Target Gauge
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Semi-circular gauge measuring current block difficulty relative to network average.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-wrap">
              <span>Ratio: <strong style={{ color: gaugeStatusColor }}>{relativeDifficultyRatio.toFixed(1)}%</strong></span>
              <span className="text-slate-600">·</span>
              <span>Raw: <span className="text-white">{currentBlockDifficultyHex}</span></span>
            </div>
          </div>

          {/* Semi-Circular Gauge Chart Container */}
          <div className="space-y-2">
            <div className="relative flex flex-col items-center justify-center pt-2">
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    {/* Background Colored Track Arc (0% - 200%) */}
                    <Pie
                      data={gaugeTrackData}
                      cx="50%"
                      cy="85%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius="70%"
                      outerRadius="95%"
                      dataKey="value"
                      stroke="none"
                    >
                      {gaugeTrackData.map((entry, index) => (
                        <Cell key={`track-cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>

                    {/* Active Progress Needle Fill Arc */}
                    <Pie
                      data={gaugeValueData}
                      cx="50%"
                      cy="85%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius="76%"
                      outerRadius="89%"
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill={gaugeStatusColor} />
                      <Cell fill="transparent" />
                    </Pie>
                    <Tooltip content={<CustomGaugeTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Center Gauge Overlay Metrics (Bottom Center of the 180° Arc) */}
              <div className="absolute bottom-2 flex flex-col items-center justify-center pointer-events-none text-center">
                <div className="text-2xl font-bold font-mono tracking-tight text-white flex items-baseline gap-1">
                  <span>{relativeDifficultyRatio.toFixed(1)}</span>
                  <span className="text-xs font-normal text-slate-400">%</span>
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  of Network Average
                </div>
                <div
                  className="mt-1 text-[10px] font-mono px-2 py-0.5 rounded border"
                  style={{
                    color: gaugeStatusColor,
                    borderColor: `${gaugeStatusColor}40`,
                    backgroundColor: `${gaugeStatusColor}15`,
                  }}
                >
                  {gaugeStatusLabel}
                </div>
              </div>
            </div>

            {/* Arc Boundary Scale Labels */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-4 pt-1">
              <span>0% (Low)</span>
              <span>100% Target Baseline</span>
              <span>200% (High)</span>
            </div>

            {/* Detailed Difficulty Specs Grid */}
            <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-sans">Block Difficulty Field:</span>
                <span className="text-white font-semibold">{currentBlockDifficultyHex}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-sans">Consensus Framework:</span>
                <span className="text-emerald-400">
                  {currentBlockDifficulty === 0 ? 'PoS Paris / The Merge (EIP-3675)' : 'Ethash Proof-of-Work Target'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-sans">Terminal Total Difficulty:</span>
                <span className="text-slate-300">58,750,000,000,000,000,000,000</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400 font-sans">Target Baseline Deviation:</span>
                <span style={{ color: gaugeStatusColor }}>
                  {relativeDifficultyRatio >= 100
                    ? `+${(relativeDifficultyRatio - 100).toFixed(1)}%`
                    : `-${(100 - relativeDifficultyRatio).toFixed(1)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Peer Connection Types Distribution (Treemap & Stacked/Grouped Bar Chart) */}
      <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                Peer Connection Types & Role Distribution
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Distribution of peer capabilities (Full Nodes, Archive Nodes, Bootnodes, Light Clients) categorized by client version prefixes derived from node logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Unboxed Stats by Type */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Full: <strong className="text-blue-400 font-semibold">{totalFull}</strong></span>
              <span className="text-slate-600">·</span>
              <span>Archive: <strong className="text-emerald-400 font-semibold">{totalArchive}</strong></span>
              <span className="text-slate-600">·</span>
              <span>Bootnodes: <strong className="text-amber-400 font-semibold">{totalBootnode}</strong></span>
              <span className="text-slate-600">·</span>
              <span>Light: <strong className="text-purple-400 font-semibold">{totalLight}</strong></span>
            </div>

            {/* View Switcher: Treemap vs Stacked Bar vs Grouped Bar */}
            <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setPeerTypeView('treemap')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                  peerTypeView === 'treemap'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>TreeMap</span>
              </button>
              <button
                onClick={() => {
                  setPeerTypeView('bar');
                  setPeerBarMode('stacked');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                  peerTypeView === 'bar' && peerBarMode === 'stacked'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Stacked Bar</span>
              </button>
              <button
                onClick={() => {
                  setPeerTypeView('bar');
                  setPeerBarMode('grouped');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                  peerTypeView === 'bar' && peerBarMode === 'grouped'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Grouped Bar</span>
              </button>
            </div>

            {/* Node Logs Inspector Button */}
            <button
              onClick={() => setShowPeerLogStream((prev) => !prev)}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors flex items-center gap-1.5 ${
                showPeerLogStream
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{showPeerLogStream ? 'Hide Logs' : 'Handshake Logs'}</span>
            </button>
          </div>
        </div>

        {/* Client Prefix Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 font-mono">
            <span className="text-slate-500 mr-1">Prefix Filter:</span>
            {['all', 'Geth', 'Nethermind', 'Besu', 'Reth', 'Erigon'].map((prefix) => (
              <button
                key={prefix}
                onClick={() => setPeerClientFilter(prefix)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  peerClientFilter.toLowerCase() === prefix.toLowerCase()
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {prefix === 'all' ? 'All Clients (5)' : `${prefix}/*`}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Derived from DevP2P `eth_getPeers` handshake capabilities
          </div>
        </div>

        {/* View 1: Recharts Treemap */}
        {peerTypeView === 'treemap' && (
          <div className="space-y-3">
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={filteredTreemapChildren}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  stroke="#0b0f17"
                  content={<CustomTreemapContent />}
                />
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-slate-800/80 gap-3">
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                <span className="text-slate-500 font-medium">Node Roles:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500" />
                  <span>Full Node ({totalFull} peers)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  <span>Archive Node ({totalArchive} peers)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                  <span>Bootnode / Discovery ({totalBootnode} peers)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-purple-500" />
                  <span>Light Client ({totalLight} peers)</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono">
                Tile size proportional to peer connection count
              </div>
            </div>
          </div>
        )}

        {/* View 2: Bar Chart (Stacked or Grouped) */}
        {peerTypeView === 'bar' && (
          <div className="space-y-3">
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredStackedBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="clientPrefix"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    unit="p"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip content={<CustomStackedBarTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontFamily: 'sans-serif' }}
                  />
                  <Bar
                    dataKey="full"
                    name="Full Node (Snap/Fast)"
                    stackId={peerBarMode === 'stacked' ? 'a' : undefined}
                    fill="#3b82f6"
                    radius={peerBarMode === 'grouped' ? [3, 3, 0, 0] : undefined}
                  />
                  <Bar
                    dataKey="archive"
                    name="Archive Node (History)"
                    stackId={peerBarMode === 'stacked' ? 'a' : undefined}
                    fill="#10b981"
                    radius={peerBarMode === 'grouped' ? [3, 3, 0, 0] : undefined}
                  />
                  <Bar
                    dataKey="bootnode"
                    name="Bootnode (Discovery)"
                    stackId={peerBarMode === 'stacked' ? 'a' : undefined}
                    fill="#f59e0b"
                    radius={peerBarMode === 'grouped' ? [3, 3, 0, 0] : undefined}
                  />
                  <Bar
                    dataKey="light"
                    name="Light Client (LES)"
                    stackId={peerBarMode === 'stacked' ? 'a' : undefined}
                    fill="#a855f7"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-3">
              <span>Mode: <strong className="text-white capitalize">{peerBarMode} Bar Chart</strong></span>
              <span className="text-slate-300">
                Geth/* · Nethermind/* · besu/* · reth/* · erigon/*
              </span>
            </div>
          </div>
        )}

        {/* Collapsible Handshake Log Ingestion Feed */}
        {showPeerLogStream && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-slate-800/80">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                DevP2P Handshake Log Stream (Client Prefix Parsing)
              </span>
              <span className="text-[11px] text-slate-500">Live Ingestion Engine</span>
            </div>

            <div className="divide-y divide-slate-800/50 max-h-48 overflow-y-auto">
              {peerHandshakeLogs.map((log, idx) => (
                <div key={idx} className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">[{log.time}]</span>
                    <span className="text-emerald-400 font-semibold">{log.peerId}</span>
                    <span className="text-slate-300 truncate max-w-[240px]" title={log.client}>
                      "{log.client}"
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {log.caps}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold ${
                        log.type === 'Full Node'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : log.type === 'Archive Node'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : log.type === 'Bootnode'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {log.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* D3 Global Node Propagation Map */}
      <GlobalPropagationMap latencyLogs={chartData} hostClientVersion={metrics?.clientVersion} />

      {/* Consecutive Block Time Interval Scatter Plot (Slot sync and missed proposal analysis) */}
      <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                Consecutive Block Time Interval & Slot Miss Scatter Plot
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Time delta (seconds) between sequential canonical blocks. Detects PoS missed proposal slots (24s / 36s) and ingestion bursts.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-wrap">
            <span>Mean Interval: <strong className="text-emerald-400 font-semibold">{avgBlockInterval}s</strong></span>
            <span className="text-slate-600">·</span>
            <span>Target: <span className="text-slate-300">12.0s</span></span>
            <span className="text-slate-600">·</span>
            <span>Nominal: <span className="text-white">{nominalRatio}%</span></span>
            <span className="text-slate-600">·</span>
            <span>Missed Slots: <strong className={missedSlotsCount > 0 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>{missedSlotsCount}</strong></span>
          </div>
        </div>

        {/* Scatter Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 20, bottom: 5, left: -10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis
                dataKey="blockNumber"
                domain={['auto', 'auto']}
                name="Block Height"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) => `#${v.toLocaleString()}`}
                tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <YAxis
                dataKey="intervalSec"
                domain={[0, 42]}
                name="Interval"
                unit="s"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              <ZAxis dataKey="zSize" range={[50, 140]} />
              <Tooltip content={<CustomScatterTooltip />} />

              {/* Reference Lines for Nominal (12s), 1 Missed Slot (24s), and 2 Missed Slots (36s) */}
              <ReferenceLine
                y={12}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: '12s Target Nominal', fill: '#10b981', fontSize: 10, position: 'insideTopRight' }}
              />
              <ReferenceLine
                y={24}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: '24s (1 Missed Slot)', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
              />
              <ReferenceLine
                y={36}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: '36s (2 Missed Slots)', fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }}
              />

              <Scatter data={blockIntervalScatterData} name="Block Intervals">
                {blockIntervalScatterData.map((entry, index) => (
                  <Cell
                    key={`scatter-cell-${index}`}
                    fill={entry.statusColor}
                    stroke={entry.statusColor}
                    strokeWidth={1.5}
                    fillOpacity={0.8}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Diagnostic Guide */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-800/80 gap-3">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span className="text-slate-500 font-medium">Slot Telemetry:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Nominal (12s Target)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>1 Missed Proposal Slot (24s)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Multi-Miss / Stalled (&ge;36s)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Fast Sync Batch (&lt;10s)</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Ethereum PoS Slot Clock: exactly 12s per assigned validator
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
