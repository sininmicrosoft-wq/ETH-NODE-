import React, { useState, useMemo } from 'react';
import {
  Coins,
  TrendingUp,
  ShieldCheck,
  Zap,
  Calculator,
  Calendar,
  Layers,
  Sparkles,
  Server,
  DollarSign,
  Clock,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface StakingRewardEstimatorProps {
  currentBaseFeeGwei?: number;
  initialEthBalance?: string | number;
}

type StakingMode = 'solo' | 'liquid' | 'institutional';

export const StakingRewardEstimator: React.FC<StakingRewardEstimatorProps> = ({
  currentBaseFeeGwei = 15.0,
  initialEthBalance = '32',
}) => {
  const [ethBalanceInput, setEthBalanceInput] = useState<string>(
    initialEthBalance ? String(initialEthBalance) : '32'
  );
  const [stakingMode, setStakingMode] = useState<StakingMode>('solo');
  const [enableRestakingBoost, setEnableRestakingBoost] = useState<boolean>(false);
  const [projectionTimeframe, setProjectionTimeframe] = useState<'1y' | '3y' | '5y'>('3y');

  const ethPriceUsd = 2650;
  const balance = Math.max(0, parseFloat(ethBalanceInput) || 0);

  // Yield breakdown parameters grounded in Ethereum consensus
  // Dynamic CL issuance rate (~2.85% for ~33.5M active staked ETH)
  const baseClYield = 2.85;
  // Execution layer tips and MEV rewards (~0.57% APR, influenced by base fee / gas activity)
  const baseElYield = Number((0.45 + Math.min(0.35, currentBaseFeeGwei * 0.008)).toFixed(2));
  const baseGrossYield = Number((baseClYield + baseElYield).toFixed(2)); // ~3.42%

  // Optional AVS Restaking Boost (e.g. EigenLayer / Symbiotic)
  const restakingYield = enableRestakingBoost ? 1.35 : 0.0;

  // Staking mode fee structures
  const feePercent = useMemo(() => {
    switch (stakingMode) {
      case 'liquid':
        return 10.0; // 10% fee on rewards (Lido/RocketPool)
      case 'institutional':
        return 5.0; // 5% managed node fee
      case 'solo':
      default:
        return 0.0; // 0% fee (direct validator ownership)
    }
  }, [stakingMode]);

  // Net APR calculation
  const totalGrossApr = baseGrossYield + restakingYield;
  const netApr = Number((totalGrossApr * (1 - feePercent / 100)).toFixed(2));

  // Full 32 ETH Validators count
  const fullValidatorsCount = Math.floor(balance / 32);
  const fractionalRemainder = balance % 32;

  // Compounded projections calculation
  const projections = useMemo(() => {
    const ratePerYear = netApr / 100;

    // Daily & Monthly (linear approximation for high liquidity)
    const dailyRewardEth = (balance * ratePerYear) / 365;
    const dailyRewardUsd = dailyRewardEth * ethPriceUsd;

    const monthlyRewardEth = (balance * ratePerYear) / 12;
    const monthlyRewardUsd = monthlyRewardEth * ethPriceUsd;

    // 1 Year
    const year1RewardEth = balance * ratePerYear;
    const year1TotalEth = balance + year1RewardEth;
    const year1RewardUsd = year1RewardEth * ethPriceUsd;

    // 3 Years (annual compounding)
    const year3TotalEth = balance * Math.pow(1 + ratePerYear, 3);
    const year3RewardEth = year3TotalEth - balance;
    const year3RewardUsd = year3RewardEth * ethPriceUsd;

    // 5 Years (annual compounding)
    const year5TotalEth = balance * Math.pow(1 + ratePerYear, 5);
    const year5RewardEth = year5TotalEth - balance;
    const year5RewardUsd = year5RewardEth * ethPriceUsd;

    return {
      dailyRewardEth,
      dailyRewardUsd,
      monthlyRewardEth,
      monthlyRewardUsd,
      year1RewardEth,
      year1TotalEth,
      year1RewardUsd,
      year3RewardEth,
      year3TotalEth,
      year3RewardUsd,
      year5RewardEth,
      year5TotalEth,
      year5RewardUsd,
    };
  }, [balance, netApr, ethPriceUsd]);

  // Chart data for compound growth curve
  const chartData = useMemo(() => {
    const data = [];
    const maxYears = projectionTimeframe === '1y' ? 1 : projectionTimeframe === '3y' ? 3 : 5;
    const steps = maxYears * 4; // Quarterly steps
    const ratePerQuarter = netApr / 100 / 4;

    let currentPrincipal = balance;
    let accumulatedRewards = 0;

    for (let step = 0; step <= steps; step++) {
      const yearFraction = step / 4;
      const quarterLabel =
        step === 0 ? 'Start' : `Y${Math.floor(yearFraction)} Q${(step % 4) || 4}`;

      if (step > 0) {
        const rewardThisQuarter = currentPrincipal * ratePerQuarter;
        accumulatedRewards += rewardThisQuarter;
        currentPrincipal += rewardThisQuarter;
      }

      data.push({
        stepLabel: quarterLabel,
        year: yearFraction,
        principalEth: Number(balance.toFixed(3)),
        totalEth: Number(currentPrincipal.toFixed(3)),
        rewardsEth: Number(accumulatedRewards.toFixed(3)),
        rewardsUsd: Math.round(accumulatedRewards * ethPriceUsd),
        totalUsd: Math.round(currentPrincipal * ethPriceUsd),
      });
    }

    return data;
  }, [balance, netApr, projectionTimeframe, ethPriceUsd]);

  // Custom Chart Tooltip
  const CustomStakingTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#0b0f17] border border-emerald-500/40 p-3 rounded-lg shadow-2xl text-xs font-mono space-y-1 min-w-[210px]">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-bold text-white">{d.stepLabel}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">{netApr}% Net APR</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Portfolio:</span>
            <span className="font-bold text-white">{d.totalEth} ETH</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Staking Rewards:</span>
            <span className="font-bold text-emerald-400">+{d.rewardsEth} ETH</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">USD Valuation:</span>
            <span className="font-semibold text-slate-200">${d.totalUsd.toLocaleString()}</span>
          </div>

          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>Staked Principal:</span>
            <span>{d.principalEth} ETH</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Ethereum Staking Reward & Compounding Estimator
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                {netApr}% Net APR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Input any ETH capital balance to model consensus attestation rewards, block proposal priority fees, and compounding horizons.
            </p>
          </div>
        </div>

        {/* Live Network Benchmark Tag */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Consensus Rate:</span>
          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {baseGrossYield}% Gross
          </span>
        </div>
      </div>

      {/* Input Section & Presets */}
      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            Enter Staked ETH Capital:
          </span>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: '1 ETH', val: '1' },
              { label: '16 ETH', val: '16' },
              { label: '32 ETH', val: '32' },
              { label: '64 ETH', val: '64' },
              { label: '100 ETH', val: '100' },
              { label: '320 ETH', val: '320' },
            ].map((p) => (
              <button
                key={p.val}
                onClick={() => setEthBalanceInput(p.val)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  ethBalanceInput === p.val
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              min="0.01"
              step="0.1"
              value={ethBalanceInput}
              onChange={(e) => setEthBalanceInput(e.target.value)}
              placeholder="32.0"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 pl-8"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">Ξ</span>
          </div>

          <div className="text-right font-mono text-xs text-slate-400 shrink-0">
            ≈ <strong className="text-white">${(balance * ethPriceUsd).toLocaleString()}</strong> USD
          </div>
        </div>

        {/* Staking Mode & Options Selector */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => setStakingMode('solo')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              stakingMode === 'solo'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span>Solo Validator</span>
              <span className="text-emerald-400">0% Fee</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Direct validator deposit (32 ETH increments). Maximum rewards and decentralization.
            </p>
          </button>

          <button
            onClick={() => setStakingMode('liquid')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              stakingMode === 'liquid'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span>Liquid Staking</span>
              <span className="text-amber-400">10% Fee</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              e.g. Lido stETH / RocketPool rETH. No minimum balance; liquid transferability.
            </p>
          </button>

          <button
            onClick={() => setStakingMode('institutional')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              stakingMode === 'institutional'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span>Managed Staking</span>
              <span className="text-cyan-400">5% Fee</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Staking-as-a-Service node operators. Custodial infra with minimal operational overhead.
            </p>
          </button>
        </div>

        {/* EigenLayer Restaking Toggle */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
            <input
              type="checkbox"
              checked={enableRestakingBoost}
              onChange={(e) => setEnableRestakingBoost(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Simulate AVS Restaking Yield Boost (+1.35% APR)
            </span>
          </label>

          <span className="text-[11px] text-slate-400">
            {enableRestakingBoost ? 'Active Restaking Yield Model' : 'Standard Ethereum Proof-of-Stake'}
          </span>
        </div>
      </div>

      {/* Projected Returns Multi-Horizon Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Daily */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Daily Return</span>
          <div className="text-base font-bold font-mono text-emerald-400 mt-1 truncate">
            +{projections.dailyRewardEth.toFixed(4)} ETH
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
            ≈ ${projections.dailyRewardUsd.toFixed(2)} USD
          </span>
        </div>

        {/* Monthly */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">Monthly (30d)</span>
          <div className="text-base font-bold font-mono text-emerald-400 mt-1 truncate">
            +{projections.monthlyRewardEth.toFixed(3)} ETH
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
            ≈ ${projections.monthlyRewardUsd.toFixed(2)} USD
          </span>
        </div>

        {/* 1 Year */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-emerald-500/30 bg-emerald-950/10">
          <span className="text-[10px] font-mono text-emerald-300 uppercase block font-semibold">
            Annual Return (1y)
          </span>
          <div className="text-base font-extrabold font-mono text-emerald-300 mt-1 truncate">
            +{projections.year1RewardEth.toFixed(3)} ETH
          </div>
          <span className="text-[10px] font-mono text-slate-300 mt-0.5 block">
            ≈ ${projections.year1RewardUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
          </span>
        </div>

        {/* 3 Years Compounded */}
        <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase block">3-Year Compounded</span>
          <div className="text-base font-bold font-mono text-cyan-400 mt-1 truncate">
            +{projections.year3RewardEth.toFixed(2)} ETH
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
            ≈ ${projections.year3RewardUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
          </span>
        </div>
      </div>

      {/* Compounding Growth Area Chart */}
      <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-white font-mono">
              Projected Capital & Reward Accumulation Curve
            </h4>
          </div>

          {/* Timeframe switcher */}
          <div className="flex items-center p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono">
            {(['1y', '3y', '5y'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setProjectionTimeframe(tf)}
                className={`px-2.5 py-0.5 rounded transition-colors text-[11px] ${
                  projectionTimeframe === tf
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="w-full h-56 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="stakingRewardGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

              <XAxis
                dataKey="stepLabel"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              />

              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                unit="Ξ"
              />

              <Tooltip content={<CustomStakingTooltip />} />

              <Area
                type="monotone"
                dataKey="totalEth"
                name="Total Capital (Principal + Rewards)"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#stakingRewardGradient)"
                activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Technical Breakdown & Validator Metrics */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-slate-400">
          <div>
            <span className="text-slate-500 block text-[10px]">Consensus (CL) Issuance:</span>
            <span className="text-white font-semibold">{baseClYield}% APR</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Attestation voting rewards</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px]">Execution (EL) MEV & Tips:</span>
            <span className="text-amber-400 font-semibold">+{baseElYield}% APR</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Priority gas fees & bundles</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px]">Validator Deployment:</span>
            <span className="text-cyan-400 font-semibold">
              {fullValidatorsCount > 0
                ? `${fullValidatorsCount} Full Validator${fullValidatorsCount > 1 ? 's' : ''}`
                : 'Liquid Staking Pool'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {fractionalRemainder > 0 && fullValidatorsCount > 0
                ? `+ ${fractionalRemainder.toFixed(2)} ETH in liquid pool`
                : 'Continuous compounding'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
