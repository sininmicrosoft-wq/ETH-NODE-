import React, { useState, useMemo } from 'react';
import { NodeMetrics } from '../types/ethereum';
import {
  HardDrive,
  Database,
  Clock,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Layers,
  Cpu,
  Zap,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface DataUsageRingCardProps {
  metrics: NodeMetrics | null;
  latestBlockNum: number;
}

export const DataUsageRingCard: React.FC<DataUsageRingCardProps> = ({
  metrics,
  latestBlockNum,
}) => {
  const [uptimeDays, setUptimeDays] = useState<number>(42.5);
  const [diskCapacityGb, setDiskCapacityGb] = useState<number>(2048); // 2TB NVMe standard
  const [isPruned, setIsPruned] = useState<boolean>(false);

  // Growth rate model based on empirical Ethereum mainnet chain data density:
  // ~7,200 blocks/day * ~120KB avg block + receipts + state trie expansion = ~1.28 GB / day
  const dailyGrowthRateGb = 1.28;

  // Calculation of consumed disk space
  const storageMetrics = useMemo(() => {
    // Baseline state size for full node (immutable freezer db + snapshot state + consensus db)
    const baseExecutionStateGb = 1080;
    const baseConsensusBeaconGb = 148;
    const pruneReductionGb = isPruned ? 280 : 0;

    const uptimeAccumulationGb = uptimeDays * dailyGrowthRateGb;
    const totalConsumedGb = Math.max(
      400,
      Math.round(baseExecutionStateGb + baseConsensusBeaconGb + uptimeAccumulationGb - pruneReductionGb)
    );

    const percentUsed = Math.min(100, Number(((totalConsumedGb / diskCapacityGb) * 100).toFixed(1)));
    const remainingGb = Math.max(0, diskCapacityGb - totalConsumedGb);

    // Prune warning threshold is at 85% disk capacity
    const pruneThresholdGb = diskCapacityGb * 0.85;
    const daysUntilPruneThreshold = Math.max(
      0,
      Math.round((pruneThresholdGb - totalConsumedGb) / dailyGrowthRateGb)
    );

    // Component breakdown
    const ancientFreezerGb = Math.round(totalConsumedGb * 0.44); // Block headers, bodies, receipts
    const flatStateDbGb = Math.round(totalConsumedGb * 0.31); // Account states, contract storage slots
    const receiptsLogsGb = Math.round(totalConsumedGb * 0.15); // Bloom filters, transaction receipts
    const consensusDbGb = Math.round(totalConsumedGb * 0.10); // Beacon chain slots, state summaries

    return {
      totalConsumedGb,
      totalConsumedTb: (totalConsumedGb / 1024).toFixed(2),
      percentUsed,
      remainingGb,
      remainingTb: (remainingGb / 1024).toFixed(2),
      daysUntilPruneThreshold,
      ancientFreezerGb,
      flatStateDbGb,
      receiptsLogsGb,
      consensusDbGb,
      monthlyVelocityGb: Number((dailyGrowthRateGb * 30).toFixed(1)),
      annualVelocityGb: Number((dailyGrowthRateGb * 365.25).toFixed(0)),
    };
  }, [uptimeDays, diskCapacityGb, isPruned]);

  // SVG Progress Ring Parameters
  const radius = 68;
  const strokeWidth = 11;
  const circumference = 2 * Math.PI * radius; // ~427.25
  const strokeDashoffset = circumference - (storageMetrics.percentUsed / 100) * circumference;

  // Status Color Logic
  const getRingColor = () => {
    if (storageMetrics.percentUsed >= 85) {
      return {
        stroke: '#f43f5e', // Rose
        text: 'text-rose-400',
        bg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
        label: 'Prune Recommended (≥85%)',
        glow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]',
      };
    }
    if (storageMetrics.percentUsed >= 70) {
      return {
        stroke: '#f59e0b', // Amber
        text: 'text-amber-400',
        bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        label: 'Elevated Capacity (70–85%)',
        glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      };
    }
    return {
      stroke: '#10b981', // Emerald
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      label: 'Nominal Capacity (<70%)',
      glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    };
  };

  const ringStyle = getRingColor();

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Node Disk Space & Data-Usage Progress Ring
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${ringStyle.bg}`}>
                {ringStyle.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Estimates disk consumption modeled from Ethereum chain data density (~1.28 GB/day) and active node uptime.
            </p>
          </div>
        </div>

        {/* Capacity Selector Tabs */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 text-[11px]">Drive Size:</span>
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
            {[1024, 2048, 4096].map((cap) => (
              <button
                key={cap}
                onClick={() => setDiskCapacityGb(cap)}
                className={`px-2 py-1 rounded transition-colors ${
                  diskCapacityGb === cap
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cap === 1024 ? '1.0 TB' : cap === 2048 ? '2.0 TB' : '4.0 TB'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Progress Ring + Uptime Controls + Storage Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Progress Ring Graphic (5 cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-3 bg-slate-950/60 rounded-xl border border-slate-800 relative">
          <div className="relative flex items-center justify-center w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background Track Circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#1e293b"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Active Progress Circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={ringStyle.stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className={`transition-all duration-700 ease-out ${ringStyle.glow}`}
              />
            </svg>

            {/* Center Typography Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Disk Usage
              </span>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {storageMetrics.percentUsed}%
              </div>
              <span className={`text-[11px] font-mono font-semibold ${ringStyle.text}`}>
                {storageMetrics.totalConsumedGb.toLocaleString()} GB
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                of {diskCapacityGb.toLocaleString()} GB Total
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar below ring */}
          <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 px-2">
            <span>Available: <strong className="text-emerald-400 font-semibold">{storageMetrics.remainingGb.toLocaleString()} GB</strong></span>
            <span>Uptime: <strong className="text-white">{uptimeDays.toFixed(1)}d</strong></span>
          </div>
        </div>

        {/* Right: Uptime Slider & Storage Components Breakdown (7 cols) */}
        <div className="md:col-span-7 space-y-4">
          {/* Uptime Adjustment Slider */}
          <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Active Node Uptime
              </span>
              <span className="text-emerald-400 font-bold">
                {uptimeDays.toFixed(1)} Days (~{Math.round(uptimeDays * 24)} Hours)
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="180"
              step="0.5"
              value={uptimeDays}
              onChange={(e) => setUptimeDays(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
              <span>Fresh Sync (1d)</span>
              <span>1 Month (30d)</span>
              <span>6 Months (180d)</span>
            </div>
          </div>

          {/* 4 Database Component Sub-Stores */}
          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
            {/* Ancient Freezer Blocks */}
            <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">Ancient Freezer DB</span>
                <span className="text-blue-400 font-semibold">44%</span>
              </div>
              <div className="text-sm font-bold text-white">
                {storageMetrics.ancientFreezerGb.toLocaleString()} GB
              </div>
              <span className="text-[9px] text-slate-500 block truncate">Immutable block bodies</span>
            </div>

            {/* Flat State & Storage Trie */}
            <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">Flat State & Trie</span>
                <span className="text-emerald-400 font-semibold">31%</span>
              </div>
              <div className="text-sm font-bold text-white">
                {storageMetrics.flatStateDbGb.toLocaleString()} GB
              </div>
              <span className="text-[9px] text-slate-500 block truncate">Account & contract slots</span>
            </div>

            {/* Receipts & Indexes */}
            <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">Receipts & Indexes</span>
                <span className="text-purple-400 font-semibold">15%</span>
              </div>
              <div className="text-sm font-bold text-white">
                {storageMetrics.receiptsLogsGb.toLocaleString()} GB
              </div>
              <span className="text-[9px] text-slate-500 block truncate">Event logs & blooms</span>
            </div>

            {/* Consensus Beacon DB */}
            <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">Consensus Beacon DB</span>
                <span className="text-amber-400 font-semibold">10%</span>
              </div>
              <div className="text-sm font-bold text-white">
                {storageMetrics.consensusDbGb.toLocaleString()} GB
              </div>
              <span className="text-[9px] text-slate-500 block truncate">Lighthouse / Prysm states</span>
            </div>
          </div>

          {/* Prune Simulator & Projection Strip */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-slate-300">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chain Growth Velocity: <strong className="text-cyan-400">~{dailyGrowthRateGb} GB/day</strong></span>
              </div>
              <div className="text-[10px] text-slate-500">
                Projected runway: <strong className="text-white">{storageMetrics.daysUntilPruneThreshold} days</strong> before reaching 85% prune threshold
              </div>
            </div>

            <button
              onClick={() => setIsPruned((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                isPruned
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPruned ? 'text-emerald-400' : ''}`} />
              <span>{isPruned ? 'Pruned (-280 GB)' : 'Simulate Prune'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
