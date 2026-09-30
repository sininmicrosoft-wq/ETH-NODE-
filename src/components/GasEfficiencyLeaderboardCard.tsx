import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Fuel,
  TrendingUp,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Copy,
  Check,
  Filter,
  BarChart3,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';

interface GasEfficiencyLeaderboardCardProps {
  currentBaseFee: number;
  latestBlockNum: number;
}

export type ContractCategory = 'DEX' | 'Stablecoin' | 'L2' | 'DeFi' | 'NFT_MEV';

export interface TopContractRecord {
  rank: number;
  name: string;
  symbol: string;
  address: string;
  category: ContractCategory;
  categoryLabel: string;
  gasConsumed: number; // in gas
  gasSharePercent: number; // % of 100-block gas
  callCount: number;
  avgGasPerCall: number;
  mostExpensiveMethod: string;
  color: string;
}

const RAW_TOP_CONTRACTS: Omit<TopContractRecord, 'rank'>[] = [
  {
    name: 'Uniswap V3: Universal Router',
    symbol: 'UNI-ROUTER',
    address: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    category: 'DEX',
    categoryLabel: 'DEX Aggregator',
    gasConsumed: 268_450_000,
    gasSharePercent: 18.2,
    callCount: 1420,
    avgGasPerCall: 189_049,
    mostExpensiveMethod: 'execute(bytes,bytes[],uint256)',
    color: '#06b6d4', // Cyan
  },
  {
    name: 'Tether USD (USDT)',
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    category: 'Stablecoin',
    categoryLabel: 'Stablecoin',
    gasConsumed: 184_200_000,
    gasSharePercent: 12.5,
    callCount: 2950,
    avgGasPerCall: 62_440,
    mostExpensiveMethod: 'transfer(address,uint256)',
    color: '#10b981', // Emerald
  },
  {
    name: 'Arbitrum One: Rollup Inbox',
    symbol: 'ARB-INBOX',
    address: '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f',
    category: 'L2',
    categoryLabel: 'L2 Rollup',
    gasConsumed: 132_800_000,
    gasSharePercent: 9.0,
    callCount: 210,
    avgGasPerCall: 632_380,
    mostExpensiveMethod: 'addSequencerL2BatchFromOrigin(...)',
    color: '#a855f7', // Purple
  },
  {
    name: 'USD Coin (USDC)',
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    category: 'Stablecoin',
    categoryLabel: 'Stablecoin',
    gasConsumed: 118_500_000,
    gasSharePercent: 8.0,
    callCount: 1820,
    avgGasPerCall: 65_109,
    mostExpensiveMethod: 'transferFrom(address,address,uint256)',
    color: '#34d399', // Mint
  },
  {
    name: 'Base: Optimism Batch Inbox',
    symbol: 'BASE-BATCH',
    address: '0xFF00000000000000000000000000000000008453',
    category: 'L2',
    categoryLabel: 'L2 Rollup',
    gasConsumed: 96_400_000,
    gasSharePercent: 6.5,
    callCount: 165,
    avgGasPerCall: 584_242,
    mostExpensiveMethod: 'rollupBatchSubmission(bytes)',
    color: '#c084fc', // Lavender
  },
  {
    name: 'OpenSea: Seaport 1.6',
    symbol: 'SEAPORT',
    address: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
    category: 'NFT_MEV',
    categoryLabel: 'NFT Protocol',
    gasConsumed: 78_200_000,
    gasSharePercent: 5.3,
    callCount: 480,
    avgGasPerCall: 162_916,
    mostExpensiveMethod: 'fulfillAdvancedOrder(...)',
    color: '#f43f5e', // Rose
  },
  {
    name: 'Aave V3: Lending Pool',
    symbol: 'AAVE-POOL',
    address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    category: 'DeFi',
    categoryLabel: 'Lending / Money Market',
    gasConsumed: 64_900_000,
    gasSharePercent: 4.4,
    callCount: 290,
    avgGasPerCall: 223_793,
    mostExpensiveMethod: 'supply(address,uint256,address,uint16)',
    color: '#f59e0b', // Amber
  },
  {
    name: 'EigenLayer: Strategy Manager',
    symbol: 'EIGEN-STRAT',
    address: '0x858646372CC42E1A627fcE94aa7A7033e7CF075A',
    category: 'DeFi',
    categoryLabel: 'Restaking Protocol',
    gasConsumed: 52_600_000,
    gasSharePercent: 3.6,
    callCount: 180,
    avgGasPerCall: 292_222,
    mostExpensiveMethod: 'depositIntoStrategy(address,address,uint256)',
    color: '#fbbf24', // Gold
  },
  {
    name: 'Banana Gun / Maestro Sniper Bot',
    symbol: 'MEV-BOT',
    address: '0x3328F7f4A1D1C57c35df56bBf0c9dCAFCA309C49',
    category: 'NFT_MEV',
    categoryLabel: 'MEV / High-Frequency Swap',
    gasConsumed: 42_100_000,
    gasSharePercent: 2.9,
    callCount: 310,
    avgGasPerCall: 135_806,
    mostExpensiveMethod: 'executeBundleSwap(bytes)',
    color: '#fb7185', // Coral
  },
  {
    name: '1inch V5: Aggregation Router',
    symbol: '1INCH-V5',
    address: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    category: 'DEX',
    categoryLabel: 'DEX Aggregator',
    gasConsumed: 36_800_000,
    gasSharePercent: 2.5,
    callCount: 220,
    avgGasPerCall: 167_272,
    mostExpensiveMethod: 'unoswapTo(address,address,uint256,uint256,uint256[])',
    color: '#38bdf8', // Sky
  },
];

export const GasEfficiencyLeaderboardCard: React.FC<GasEfficiencyLeaderboardCardProps> = ({
  currentBaseFee,
  latestBlockNum,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'gas' | 'avg' | 'calls'>('gas');
  const [showTableDetails, setShowTableDetails] = useState<boolean>(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const ethPriceUsd = 2650;
  const baseFee = currentBaseFee || 15.0;

  // Filter & sort contracts
  const rankedContracts: TopContractRecord[] = useMemo(() => {
    let list = RAW_TOP_CONTRACTS.map((item, idx) => ({ ...item, rank: idx + 1 }));

    if (selectedCategory !== 'ALL') {
      list = list.filter((item) => item.category === selectedCategory);
    }

    if (sortBy === 'avg') {
      list.sort((a, b) => b.avgGasPerCall - a.avgGasPerCall);
    } else if (sortBy === 'calls') {
      list.sort((a, b) => b.callCount - a.callCount);
    } else {
      list.sort((a, b) => b.gasConsumed - a.gasConsumed);
    }

    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [selectedCategory, sortBy]);

  // Chart data formatted for horizontal bar chart
  const chartData = useMemo(() => {
    return rankedContracts.slice(0, 8).map((c) => ({
      name: c.name.length > 20 ? `${c.name.slice(0, 18)}...` : c.name,
      fullName: c.name,
      symbol: c.symbol,
      gasMillions: Number((c.gasConsumed / 1e6).toFixed(1)),
      gasShare: c.gasSharePercent,
      calls: c.callCount,
      avgGas: c.avgGasPerCall,
      color: c.color,
      category: c.categoryLabel,
      burnEth: ((c.gasConsumed * baseFee * 1e9) / 1e18).toFixed(2),
      burnUsd: Math.round(((c.gasConsumed * baseFee * 1e9) / 1e18) * ethPriceUsd),
    }));
  }, [rankedContracts, baseFee, ethPriceUsd]);

  // Total gas consumed by top 10
  const totalTop10Gas = useMemo(() => {
    return rankedContracts.reduce((acc, c) => acc + c.gasConsumed, 0);
  }, [rankedContracts]);

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Custom Recharts Tooltip
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0b0f17] border border-amber-500/40 p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1.5 min-w-[240px]">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-bold text-white truncate max-w-[170px]">{data.fullName}</span>
            <span className="text-[10px] text-amber-400 font-semibold">{data.symbol}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Gas Consumed:</span>
            <span className="font-bold text-emerald-400">{data.gasMillions}M gas</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">100-Block Share:</span>
            <span className="font-semibold text-white">{data.gasShare}%</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Calls:</span>
            <span className="font-semibold text-slate-200">{data.calls.toLocaleString()} txs</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Avg Gas / Tx:</span>
            <span className="font-semibold text-cyan-400">{data.avgGas.toLocaleString()} gas</span>
          </div>

          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-orange-400">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Est. ETH Burned:
            </span>
            <span className="font-bold">{data.burnEth} ETH (${data.burnUsd.toLocaleString()})</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Gas Efficiency Leaderboard (Top Contracts / Last 100 Blocks)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                100-Block Rolling
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked smart contract executions consuming the highest gas volumes over recent blocks #{Math.max(1, latestBlockNum - 100).toLocaleString()} – #{latestBlockNum.toLocaleString()}.
            </p>
          </div>
        </div>

        {/* Category Filter & Sort Switcher */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Category Filter */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'DEX', label: 'DEX' },
              { id: 'L2', label: 'L2 Rollups' },
              { id: 'Stablecoin', label: 'Stables' },
              { id: 'DeFi', label: 'DeFi' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2 py-1 rounded transition-colors text-[11px] ${
                  selectedCategory === cat.id
                    ? 'bg-slate-800 text-amber-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort Switcher */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setSortBy('gas')}
              className={`px-2 py-1 rounded transition-colors text-[11px] ${
                sortBy === 'gas' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Total Gas
            </button>
            <button
              onClick={() => setSortBy('avg')}
              className={`px-2 py-1 rounded transition-colors text-[11px] ${
                sortBy === 'avg' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Avg / Tx
            </button>
            <button
              onClick={() => setSortBy('calls')}
              className={`px-2 py-1 rounded transition-colors text-[11px] ${
                sortBy === 'calls' ? 'bg-slate-800 text-purple-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Calls
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar Chart Section */}
      <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            Top Contracts Ranked by Gas Consumed (Millions of Gas)
          </span>
          <span className="text-slate-400 text-[11px]">
            Combined 100-Block Top Gas: <strong className="text-amber-400">{(totalTop10Gas / 1e6).toFixed(1)}M</strong>
          </span>
        </div>

        {/* Horizontal Bar Chart (Recharts) */}
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                unit="M"
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#cbd5e1"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                width={130}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="gasMillions" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Color Legend */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
              <span>DEX / AMM</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              <span>Stablecoins</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
              <span>L2 Rollups</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
              <span>Lending / DeFi</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
              <span>NFT / MEV</span>
            </span>
          </div>

          <button
            onClick={() => setShowTableDetails((prev) => !prev)}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <span>{showTableDetails ? 'Hide Contract Table' : 'Show Detailed Leaderboard'}</span>
            {showTableDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Detailed Smart Contract Leaderboard Table */}
      {showTableDetails && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 text-center w-12">Rank</th>
                <th className="py-2.5 px-3">Contract Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Address</th>
                <th className="py-2.5 px-3 text-right">Gas Consumed</th>
                <th className="py-2.5 px-3 text-right">Capacity Share</th>
                <th className="py-2.5 px-3 text-right">Invocations</th>
                <th className="py-2.5 px-3 text-right">Avg Gas/Tx</th>
                <th className="py-2.5 px-3">Primary Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rankedContracts.map((c) => {
                const isCopied = copiedAddress === c.address;
                return (
                  <tr key={c.address} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                          c.rank === 1
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : c.rank === 2
                            ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                            : c.rank === 3
                            ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                            : 'text-slate-500'
                        }`}
                      >
                        {c.rank}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-white">
                      {c.name}
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-sans font-semibold border"
                        style={{
                          backgroundColor: `${c.color}15`,
                          borderColor: `${c.color}40`,
                          color: c.color,
                        }}
                      >
                        {c.categoryLabel}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-slate-300">
                          {c.address.slice(0, 6)}...{c.address.slice(-4)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(c.address)}
                          className="text-slate-500 hover:text-white p-0.5"
                          title="Copy contract address"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <a
                          href={`https://etherscan.io/address/${c.address}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-amber-400 p-0.5"
                          title="View on Etherscan"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      {(c.gasConsumed / 1e6).toFixed(1)}M
                    </td>

                    <td className="py-2.5 px-3 text-right font-semibold text-white">
                      {c.gasSharePercent}%
                    </td>

                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {c.callCount.toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3 text-right font-medium text-cyan-400">
                      {c.avgGasPerCall.toLocaleString()}
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-[200px]" title={c.mostExpensiveMethod}>
                      <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px] text-slate-300">
                        {c.mostExpensiveMethod}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
